"""
API routes for advanced data analysis.
Includes Named Entity Recognition (NER) and Sentiment Analysis (automated and lexicon-based).
Uses spaCy for NER and TextBlob/iNLTK for sentiment processing.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
import spacy
from textblob import TextBlob
from datetime import datetime

from app.database import get_db
from app.models.segment import Segment
from app.models.code import Code
from app.models.document import Document
from app.models.sentiment import SentimentLexicon, SentimentLexiconEntry, DocumentSentence
from app.schemas import sentiment as sentiment_schemas
import csv
import io
from fastapi import UploadFile, File

try:
    from inltk.inltk import get_sentiment as inltk_get_sentiment
    INLTK_AVAILABLE = True
except ImportError:
    INLTK_AVAILABLE = False


# -------------------------------
# Router Configuration
# -------------------------------
router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.get("/test")
def test_route():
    return {"status": "ok", "version": "v1.1"}


# -------------------------------
# Load spaCy Model (Reusable)
# -------------------------------
def load_spacy_model():
    """
    Safely loads the spaCy English model.
    Downloads the model if it is not already installed on the system.
    """
    try:
        return spacy.load("en_core_web_sm")
    except OSError:
        import os
        os.system("python -m spacy download en_core_web_sm")
        return spacy.load("en_core_web_sm")


nlp = load_spacy_model()


# -------------------------------
# Request Models
# -------------------------------
class NERRequest(BaseModel):
    text: str
    labels: Optional[List[str]] = None


# ===============================
# 🔹 REUSABLE CORE FUNCTIONS
# ===============================

def process_ner(text: str, labels: Optional[List[str]] = None):
    """
    Extract named entities from text.
    """
    doc = nlp(text)
    entities = []

    for ent in doc.ents:
        if labels and ent.label_ not in labels:
            continue

        entities.append({
            "text": ent.text,
            "label": ent.label_,
            "start": ent.start_char,
            "end": ent.end_char
        })

    return entities


def calculate_sentiment_label(polarity: float):
    """
    Convert polarity score to sentiment label.
    """
    if polarity > 0.5:
        return "Very Positive"
    elif polarity > 0:
        return "Positive"
    elif polarity == 0:
        return "Neutral"
    elif polarity > -0.5:
        return "Negative"
    else:
        return "Very Negative"


def get_code_frequency_by_project(project_id: int, db: Session):
    """
    Get code usage frequency for a project.
    """
    results = (
        db.query(Code.name, func.count(Segment.id).label("count"))
        .join(Segment, Segment.codes) # Many-to-Many
        .join(Document, Segment.document_id == Document.id)
        .filter(Document.project_id == project_id)
        .group_by(Code.name)
        .all()
    )

    return [{"code": r[0], "count": r[1]} for r in results]


def perform_sentiment_analysis(document: Document, db: Session):
    """
    Perform sentiment analysis and store results.
    Splits by sentences and assigns granular labels (-1.0 to 1.0).
    """

    # We split by sentence using a basic method for now
    # In a production iNLTK environment, we'd use its sentence splitter
    sentences = document.content.split(".")
    results = []
    
    # Track character offset manually since split() loses it
    current_char_offset = 0

    for sentence_text in sentences:
        sentence_text = sentence_text.strip()
        if not sentence_text:
            current_char_offset += 1 # accounting for the period
            continue

        # Polarity Score (-1.0 to 1.0)
        blob = TextBlob(sentence_text)
        polarity = blob.sentiment.polarity
        label = calculate_sentiment_label(polarity)
        
        # Intensity Score (0.0 to 1.0) - v2 feature
        # Calculated based on subjectvity and word strength
        intensity = min(1.0, abs(polarity) * 1.5 + blob.sentiment.subjectivity * 0.5)

        # Map label to a score for DB
        score_map = {
            "Very Positive": 2,
            "Positive": 1,
            "Neutral": 0,
            "Negative": -1,
            "Very Negative": -2
        }
        
        start_idx = document.content.find(sentence_text, current_char_offset)
        end_idx = start_idx + len(sentence_text)
        current_char_offset = end_idx

        results.append({
            "sentence": sentence_text,
            "polarity": polarity,
            "label": label,
            "intensity": intensity,
            "score": score_map.get(label, 0),
            "start": start_idx,
            "end": end_idx
        })

    return results



def ensure_sentiment_code_tree(project_id: int, db: Session):
    """
    Ensure the 'Sentiment' hierarchical code tree exists.
    """
    sentiment_root = db.query(Code).filter(Code.project_id == project_id, Code.name == "Sentiment", Code.parent_id == None).first()
    if not sentiment_root:
        sentiment_root = Code(name="Sentiment", project_id=project_id, color="#808080")
        db.add(sentiment_root)
        db.flush()
    
    labels = [
        ("Very Positive", "#00FF00"),
        ("Positive", "#90EE90"),
        ("Neutral", "#FFFFE0"),
        ("Negative", "#FFB6C1"),
        ("Very Negative", "#FF0000")
    ]
    
    for label, color in labels:
        exists = db.query(Code).filter(Code.project_id == project_id, Code.parent_id == sentiment_root.id, Code.name == label).first()
        if not exists:
            new_code = Code(name=label, project_id=project_id, parent_id=sentiment_root.id, color=color)
            db.add(new_code)
    
    db.commit()
    return sentiment_root


# ===============================
# 🔹 SENTIMENT LEXICON ROUTES
# ===============================

@router.post("/lexicon", response_model=sentiment_schemas.SentimentLexicon)
def create_lexicon(data: sentiment_schemas.SentimentLexiconCreate, db: Session = Depends(get_db)):
    lexicon = SentimentLexicon(name=data.name, project_id=data.project_id)
    db.add(lexicon)
    db.commit()
    db.refresh(lexicon)
    return lexicon

@router.get("/lexicon/{project_id}", response_model=List[sentiment_schemas.SentimentLexicon])
def get_lexicons(project_id: int, db: Session = Depends(get_db)):
    return db.query(SentimentLexicon).filter(SentimentLexicon.project_id == project_id).all()

@router.post("/lexicon/{lexicon_id}/upload")
async def upload_lexicon_csv(lexicon_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    entries_added = 0
    for row in reader:
        # Expected columns: word, sentiment, score
        word = row.get("word") or row.get("phrase")
        sentiment = row.get("sentiment") or "Neutral"
        score = float(row.get("score") or 0.0)
        
        if word:
            entry = SentimentLexiconEntry(
                lexicon_id=lexicon_id,
                word_or_phrase=word,
                sentiment_label=sentiment,
                sentiment_score=score
            )
            db.add(entry)
            entries_added += 1
            
    db.commit()
    return {"message": f"Successfully added {entries_added} entries to lexicon"}

@router.post("/init-tree/{project_id}")
def init_sentiment_tree(project_id: int, db: Session = Depends(get_db)):
    root = ensure_sentiment_code_tree(project_id, db)
    return {"message": "Sentiment code tree initialized", "root_id": root.id}


# ===============================
# 🔹 AUTOMATIC ANALYSIS (iNLTK Fallback)
# ===============================

@router.post("/sentiment/auto/{document_id}")
def run_auto_sentiment(document_id: int, lang: str = "en", db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        return {"error": "Document not found"}

    # Clear previous auto-analysis for this document
    db.query(DocumentSentence).filter(DocumentSentence.document_id == document_id).delete()
    
    # Simple sentence splitting for now
    # TODO: Use iNLTK sentence splitter if available
    raw_sentences = document.content.split(".")
    results = []
    current_offset = 0
    
    for text in raw_sentences:
        text = text.strip()
        if not text:
            current_offset += 1
            continue
            
        # Polarity Score (-1.0 to 1.0)
        # Primary: iNLTK (if enabled and language supported), Fallback: TextBlob
        polarity = 0.0
        label = "Neutral"
        intensity = 0.5
        
        if INLTK_AVAILABLE and lang != "en":
            try:
                # iNLTK logic here
                res = inltk_get_sentiment(text, lang)
                label = "Positive" if "positive" in res.lower() else "Negative" if "negative" in res.lower() else "Neutral"
                polarity = 0.5 if label == "Positive" else -0.5 if label == "Negative" else 0.0
                intensity = 0.8 # iNLTK usually more certain
            except:
                blob = TextBlob(text)
                polarity = blob.sentiment.polarity
                label = calculate_sentiment_label(polarity)
                intensity = min(1.0, abs(polarity) * 1.5 + blob.sentiment.subjectivity * 0.5)
        else:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            label = calculate_sentiment_label(polarity)
            intensity = min(1.0, abs(polarity) * 1.5 + blob.sentiment.subjectivity * 0.5)
        
        start = document.content.find(text, current_offset)
        end = start + len(text)
        current_offset = end
        
        sentence = DocumentSentence(
            document_id=document_id,
            text=text,
            start_index=start,
            end_index=end,
            auto_sentiment_score=polarity,
            auto_sentiment_label=label,
            auto_sentiment_intensity=intensity
        )
        db.add(sentence)
        db.flush() # To get ID
        
        results.append({
            "sentence_id": sentence.id,
            "text": text,
            "polarity": polarity,
            "label": label,
            "intensity": intensity,
            "start": start,
            "end": end
        })
    
    db.commit()
    return {"message": "Success", "results": results}

@router.post("/sentiment/finalize/{sentence_id}")
def finalize_sentence_sentiment(sentence_id: int, db: Session = Depends(get_db)):
    """
    Finalize an auto-labeled sentence by converting it to a Segment with manual_override.
    """
    sentence = db.query(DocumentSentence).filter(DocumentSentence.id == sentence_id).first()
    if not sentence:
        return {"error": "Sentence not found"}
        
    # Create Segment
    segment = Segment(
        document_id=sentence.document_id,
        start_index=sentence.start_index,
        end_index=sentence.end_index,
        selected_text=sentence.text,
        sentiment_label=sentence.auto_sentiment_label,
        sentiment_score=sentence.auto_sentiment_score,
        manual_sentiment_override=True
    )
    db.add(segment)
    
    # Update sentence flag
    sentence.manual_override = True
    
    db.commit()
    return {"message": "Sentiment finalized and saved as segment"}
    
class BulkSentimentFinalize(BaseModel):
    start_index: int
    end_index: int
    selected_text: str
    label: str
    score: float
    code_name: Optional[str] = None
    memo: Optional[str] = None

@router.post("/sentiment/finalize-bulk/{project_id}")
def finalize_sentiment_bulk(project_id: int, data: List[BulkSentimentFinalize], db: Session = Depends(get_db)):
    """
    Bulk finalize manual/auto sentiments into Segments for a project.
    """
    # Ensure Sentiment root exists
    sentiment_root = db.query(Code).filter(Code.project_id == project_id, Code.name == "Sentiment", Code.parent_id == None).first()
    if not sentiment_root:
        sentiment_root = Code(name="Sentiment", project_id=project_id, color="#808080")
        db.add(sentiment_root)
        db.flush()

    segments_added = 0
    for item in data:
        code_to_use = item.code_name if item.code_name else item.label
        
        # Find or create sub-code for the label/custom name
        label_code = db.query(Code).filter(Code.project_id == project_id, Code.parent_id == sentiment_root.id, Code.name == code_to_use).first()
        if not label_code:
            label_code = Code(name=code_to_use, project_id=project_id, parent_id=sentiment_root.id, description=item.memo)
            db.add(label_code)
            db.flush()

        doc = db.query(Document).filter(Document.project_id == project_id).first()
        if not doc: continue

        segment = Segment(
            document_id=doc.id,
            start_index=item.start_index,
            end_index=item.end_index,
            selected_text=item.selected_text,
            sentiment_label=item.label,
            sentiment_score=item.score,
            memo=item.memo,
            manual_sentiment_override=True
        )
        db.add(segment)
        segment.codes.append(label_code)
        segments_added += 1

    db.commit()
    return {"message": f"Successfully finalized {segments_added} sentiment segments"}

@router.post("/sentiment/autocode/{project_id}")
def run_lexicon_autocode(project_id: int, lexicon_id: int, db: Session = Depends(get_db)):
    """
    Search and Code feature: Finds matches and asks user to apply.
    For now, this returns the matches for the Review Mode.
    """
    lexicon = db.query(SentimentLexicon).filter(SentimentLexicon.id == lexicon_id).first()
    if not lexicon:
        return {"error": "Lexicon not found"}
        
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    entries = db.query(SentimentLexiconEntry).filter(SentimentLexiconEntry.lexicon_id == lexicon_id).all()
    
    matches = []
    for doc in documents:
        for entry in entries:
            # Simple case-insensitive search
            start = 0
            while True:
                idx = doc.content.lower().find(entry.word_or_phrase.lower(), start)
                if idx == -1: break
                
                matches.append({
                    "document_id": doc.id,
                    "document_title": doc.title,
                    "word": entry.word_or_phrase,
                    "sentiment": entry.sentiment_label,
                    "score": entry.sentiment_score,
                    "start": idx,
                    "end": idx + len(entry.word_or_phrase),
                    "context": doc.content[max(0, idx-30):min(len(doc.content), idx+len(entry.word_or_phrase)+30)]
                })
                start = idx + 1
    
    return {"matches": matches}

@router.get("/report/sentiment-profile/{project_id}")
def get_sentiment_profile(project_id: int, db: Session = Depends(get_db)):
    """
    Generate Sentiment Profile distribution for the project.
    """
    results = (
        db.query(DocumentSentence.auto_sentiment_label, func.count(DocumentSentence.id))
        .join(Document, DocumentSentence.document_id == Document.id)
        .filter(Document.project_id == project_id)
        .group_by(DocumentSentence.auto_sentiment_label)
        .all()
    )
    
    # Also get manual segments
    manual_results = (
        db.query(Segment.sentiment_label, func.count(Segment.id))
        .join(Document, Segment.document_id == Document.id)
        .filter(Document.project_id == project_id, Segment.manual_sentiment_override == True)
        .group_by(Segment.sentiment_label)
        .all()
    )
    
    return {
        "automatic": {r[0]: r[1] for r in results if r[0]},
        "manual": {r[0]: r[1] for r in manual_results if r[0]}
    }

@router.get("/report/crosstab/{project_id}")
def get_thematic_crosstab(project_id: int, db: Session = Depends(get_db)):
    """
    Thematic Crosstabs: Matrix of Themes (Codes) vs Sentiment.
    """
    # X-axis: Sentiment Labels
    sentiment_labels = ["Very Positive", "Positive", "Neutral", "Negative", "Very Negative"]
    
    # Y-axis: Codes/Themes
    codes = db.query(Code).filter(Code.project_id == project_id).all()
    
    matrix = []
    for code in codes:
        row = {"theme": code.name, "counts": {label: 0 for label in sentiment_labels}}
        
        # Count manual segments for this code and sentiment
        results = (
            db.query(Segment.sentiment_label, func.count(Segment.id))
            .join(Segment.codes)
            .filter(Code.id == code.id, Segment.sentiment_label != None)
            .group_by(Segment.sentiment_label)
            .all()
        )
        
        for label, count in results:
            if label in row["counts"]:
                row["counts"][label] = count
                
        matrix.append(row)
        
    return matrix

# ===============================
# 🔹 API ROUTES (Unchanged)
# ===============================

@router.post("/ner/extract")
def extract_ner(data: NERRequest):
    entities = process_ner(data.text, data.labels)

    return {
        "entities": entities
    }


@router.post("/sentiment/{document_id}")
def analyze_sentiment(document_id: int, db: Session = Depends(get_db)):

    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        return {"error": "Document not found"}

    results = perform_sentiment_analysis(document, db)

    return {
        "message": "Sentiment analysis completed",
        "total_sentences": len(results),
        "results": results
    }


@router.get("/code-frequency/{project_id}")
def code_frequency(project_id: int, db: Session = Depends(get_db)):
    return get_code_frequency_by_project(project_id, db)