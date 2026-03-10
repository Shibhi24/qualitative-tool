from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import spacy
from spacy import displacy
import os
import tempfile
from typing import List, Dict, Any, cast, Optional
import sqlalchemy
from sqlalchemy import func

from app.database import get_db
from app.models.project import Project
from app.models.document import Document
from app.models.segment import Segment
from app.models.code import Code
from app.models.sentiment import DocumentSentence
from app.models.memo import Memo as MemoModel

router = APIRouter(prefix="/export", tags=["Export"])

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

import re

def strip_html(text: str) -> str:
    """
    Remove HTML tags from a string to prevent NER from processing tags as text.
    """
    if not text:
        return ""
    # Simple regex to remove HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Also handle some common entities if necessary, but for NER this is usually enough
    return clean

@router.get("/excel/{project_id}")
def export_excel_report(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 1. Segments Data
    segments = db.query(Segment).join(Document).filter(Document.project_id == project_id).all()
    seg_data = []
    for s in segments:
        codes_list = ", ".join([c.name for c in s.codes])
        seg_data.append({
            "Document": s.document.title,
            "Text": s.selected_text,
            "Codes": codes_list,
            "Sentiment": s.sentiment_label,
            "Score": s.sentiment_score,
            "Memo": s.memo
        })
    df_segments = pd.DataFrame(seg_data)

    # 2. Codes Data
    codes = db.query(Code).filter(Code.project_id == project_id).all()
    code_data = [{"Name": c.name, "Color": c.color, "Description": c.description} for c in codes]
    df_codes = pd.DataFrame(code_data)

    # 3. Memos Data
    memos = db.query(MemoModel).filter(MemoModel.project_id == project_id).all()
    memo_data = [{"Title": m.title, "Content": m.content, "Created At": m.created_at} for m in memos]
    df_memos = pd.DataFrame(memo_data)

    # 4. Entities Data (spaCy powered)
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    entity_data = []
    for doc in documents:
        clean_text = strip_html(doc.content)
        spacy_doc = nlp(str(clean_text)[:100000]) # Limit length for safety
        for ent in spacy_doc.ents:
            entity_data.append({
                "Document": doc.title,
                "Entity": ent.text,
                "Label": ent.label_,
                "Start": ent.start_char,
                "End": ent.end_char
            })
    df_entities = pd.DataFrame(entity_data)

    # 5. Sentiment Distribution Data
    
    sent_dist = (
        db.query(DocumentSentence.auto_sentiment_label, func.count(DocumentSentence.id))
        .join(Document, DocumentSentence.document_id == Document.id)
        .filter(Document.project_id == project_id)
        .group_by(DocumentSentence.auto_sentiment_label)
        .all()
    )
    df_sent_dist = pd.DataFrame([{"Label": r[0] or "Neutral", "Count": r[1]} for r in sent_dist])

    # 6. Code Frequency Data
    code_freq = (
        db.query(Code.name, func.count(Segment.id).label("count"))
        .join(Code.segments)
        .join(Document, Segment.document_id == Document.id)
        .filter(Document.project_id == project_id)
        .group_by(Code.name)
        .all()
    )
    df_code_freq = pd.DataFrame([{"Code": r[0], "Frequency": r[1]} for r in code_freq])

    # 7. Thematic Crosstab Data (Codes)
    sentiment_labels = ["Very Positive", "Positive", "Neutral", "Negative", "Very Negative"]
    codes = db.query(Code).filter(Code.project_id == project_id).all()
    crosstab_data = []
    for code in codes:
        row = {"Theme/Code": code.name}
        results = (
            db.query(Segment.sentiment_label, func.count(Segment.id))
            .join(Segment.codes)
            .filter(Code.id == code.id, Segment.sentiment_label != None)
            .group_by(Segment.sentiment_label)
            .all()
        )
        counts = {r[0]: r[1] for r in results}
        for label in sentiment_labels:
            row[label] = counts.get(label, 0)
        crosstab_data.append(row)
    df_crosstab = pd.DataFrame(crosstab_data)

    # 8. Entity Sentiment Crosstab (Entities)
    
    # Add explicit type hint for query result
    sentences = db.query(DocumentSentence).join(Document).filter(Document.project_id == project_id).all()
    sentences_list: List[DocumentSentence] = cast(List[DocumentSentence], sentences)
    
    # We'll use a dictionary where key is Entity Name and value is yet another dict of counts
    ent_sentiment_counts: Dict[str, Dict[str, Any]] = {}

    for sentence in sentences_list:
        if not sentence.auto_sentiment_label:
            continue
        
        # Casting the loop variable explicitly for Pyre
        s_obj = cast(DocumentSentence, sentence)
        
        # Extract entities from this specific sentence
        # cast sentence.text to string to be safe
        sent_text_str: str = str(s_obj.text)
        doc_span = nlp(sent_text_str)
        
        for ent in doc_span.ents:
            # Filter out noisy entities
            if ent.label_ not in ["CARDINAL", "ORDINAL", "DATE", "TIME", "PERCENT", "MONEY", "QUANTITY"]:
                ent_name: str = str(ent.text).strip()
                if not ent_name: continue
                
                if ent_name not in ent_sentiment_counts:
                    ent_sentiment_counts[ent_name] = {
                        "Entity Name": ent_name,
                        "Entity Type": str(ent.label_),
                        "Very Positive": 0, "Positive": 0, "Neutral": 0, "Negative": 0, "Very Negative": 0
                    }
                
                label: str = str(s_obj.auto_sentiment_label)
                current_counts: Dict[str, Any] = ent_sentiment_counts[ent_name]
                if label in ["Very Positive", "Positive", "Neutral", "Negative", "Very Negative"]:
                    current_val = current_counts.get(label, 0)
                    current_counts[label] = int(current_val) + 1
                else:
                    current_val = current_counts.get("Neutral", 0)
                    current_counts["Neutral"] = int(current_val) + 1

    df_entity_crosstab = pd.DataFrame(list(ent_sentiment_counts.values()))

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
    temp_path = temp_file.name
    temp_file.close() # Close immediately to prevent Windows file locking issues

    with pd.ExcelWriter(temp_path, engine="xlsxwriter") as writer:
        df_segments.to_excel(writer, sheet_name="Segments", index=False)
        df_codes.to_excel(writer, sheet_name="Codes", index=False)
        df_memos.to_excel(writer, sheet_name="Memos", index=False)
        df_entities.to_excel(writer, sheet_name="Entities", index=False)
        df_sent_dist.to_excel(writer, sheet_name="Sentiment_Stats", index=False)
        df_code_freq.to_excel(writer, sheet_name="Code_Frequency", index=False)
        df_crosstab.to_excel(writer, sheet_name="Code_Crosstab", index=False)
        if not df_entity_crosstab.empty:
            df_entity_crosstab.to_excel(writer, sheet_name="Entity_Crosstab", index=False)

    return FileResponse(temp_path, filename=f"Project_{project.name}_Report.xlsx")

@router.get("/html/{project_id}")
def export_html_report(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    documents: List[Document] = db.query(Document).filter(Document.project_id == project_id).all()

    # Calculate overall project sentiment distribution
    sent_dist_raw = (
        db.query(DocumentSentence.auto_sentiment_label, func.count(DocumentSentence.id))
        .join(Document, DocumentSentence.document_id == Document.id)
        .filter(Document.project_id == project_id)
        .group_by(DocumentSentence.auto_sentiment_label)
        .all()
    )
    sent_dist: List[Any] = cast(List[Any], sent_dist_raw)
    
    total_sentences = sum([r[1] for r in sent_dist])
    sent_counts = {r[0] or "Neutral": r[1] for r in sent_dist}
    
    # Sentiment colors mapping
    sentiment_colors: Dict[str, str] = {
        "Very Positive": "#10b981", # Green
        "Positive": "#34d399",     # Light green
        "Neutral": "#9ca3af",      # Gray
        "Negative": "#f87171",     # Light red
        "Very Negative": "#ef4444" # Red
    }

    # Generate a beautiful HTML report
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{project.name} - Qualitative Analysis Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --primary: #1e3a8a;
                --primary-light: #eff6ff;
                --text-main: #1f2937;
                --text-muted: #4b5563;
                --bg-main: #f3f4f6;
                --card-bg: #ffffff;
                --border: #e5e7eb;
            }}
            body {{
                font-family: 'Inter', sans-serif;
                background-color: var(--bg-main);
                color: var(--text-main);
                line-height: 1.6;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                padding: 40px 20px;
            }}
            .report-header {{
                background-color: var(--primary);
                color: white;
                padding: 60px 40px;
                border-radius: 12px;
                margin-bottom: 40px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }}
            .report-header h1 {{
                margin: 0 0 15px 0;
                font-size: 2.5rem;
                font-weight: 700;
            }}
            .report-header p {{
                margin: 0;
                font-size: 1.1rem;
                opacity: 0.9;
                max-width: 800px;
            }}
            .summary-card {{
                background-color: var(--card-bg);
                border-radius: 12px;
                padding: 30px;
                margin-bottom: 40px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                border: 1px solid var(--border);
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
            }}
            .stat-box {{
                flex: 1;
                min-width: 150px;
                text-align: center;
                padding: 20px;
                background-color: var(--bg-main);
                border-radius: 8px;
            }}
            .stat-value {{
                font-size: 2rem;
                font-weight: 700;
                color: var(--primary);
            }}
            .stat-label {{
                font-size: 0.9rem;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-top: 5px;
            }}
            .doc-block {{
                background-color: var(--card-bg);
                border-radius: 12px;
                padding: 40px;
                margin-bottom: 40px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                border: 1px solid var(--border);
            }}
            .doc-header {{
                border-bottom: 2px solid var(--primary-light);
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .doc-header h2 {{
                margin: 0;
                color: var(--primary);
                font-size: 1.8rem;
            }}
            .section-title {{
                font-size: 1.2rem;
                font-weight: 600;
                margin: 25px 0 15px 0;
                color: var(--text-main);
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            .entities-container, .sentiment-container {{
                background-color: #fafafa;
                padding: 30px;
                border-radius: 8px;
                border: 1px solid var(--border);
                overflow-x: auto;
                line-height: 2.5;
            }}
            .sentiment-sentence {{
                display: flex;
                margin-bottom: 12px;
                padding: 12px;
                background: white;
                border-radius: 6px;
                border-left: 4px solid #ddd;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }}
            .sentiment-badge {{
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                color: white;
                font-size: 0.75rem;
                font-weight: 600;
                margin-right: 15px;
                white-space: nowrap;
                height: fit-content;
            }}
            .sentiment-text {{
                line-height: 1.5;
                font-size: 0.95rem;
            }}
            /* Overwrite spaCy displacy styles slightly to fit the theme */
            .entities-container mark {{
                border-radius: 6px !important;
                padding: 4px 8px !important;
                margin: 0 4px !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <header class="report-header">
                <h1>Qualitative Analysis Report: {project.name}</h1>
                <p>{project.description or "No description provided."}</p>
            </header>
            
            <div class="summary-card">
                <div class="stat-box" style="flex: 100%; text-align: left; background: transparent; padding: 0;">
                    <h3 style="margin-top:0; color:var(--primary);">Sentiment Overview</h3>
                </div>
    """
    
    # Add sentiment stats boxes
    for label, count in sent_counts.items():
        color = sentiment_colors.get(label, "#9ca3af")
        percentage = round((count / total_sentences * 100), 1) if total_sentences > 0 else 0
        html_content += f"""
                <div class="stat-box" style="border-bottom: 4px solid {color}">
                    <div class="stat-value" style="color: {color}">{percentage}%</div>
                    <div class="stat-label">{label} ({count})</div>
                </div>
        """

    html_content += """
            </div>
            
            <div class="documents-section">
    """

    for doc in documents:
        html_content += f"""
                <article class="doc-block">
                    <div class="doc-header">
                        <h2>{doc.title}</h2>
                    </div>
                    
                    <h3 class="section-title">Named Entities Found</h3>
                    <div class="entities-container">
        """
        clean_text = str(strip_html(doc.content))
        spacy_doc = nlp(clean_text[:10000]) # Sample for visualization
        
        # Use displacy to generate colored entity tags
        # page=False returns just the HTML snippet without <html><body> wrappers
        html_snippet = displacy.render(spacy_doc, style="ent", page=False)
        
        html_content += html_snippet
        html_content += """
                    </div>
                    
                    <h3 class="section-title" style="margin-top: 40px;">Sentiment Timeline</h3>
                    <div class="sentiment-container">
        """
        
        # Get sentences with sentiment for this document
        sentences = db.query(DocumentSentence).filter(
            DocumentSentence.document_id == doc.id,
            DocumentSentence.auto_sentiment_label != None
        ).all()
        
        if not sentences:
            html_content += "<p style='color: var(--text-muted); font-style: italic;'>No sentiment analysis data available for this document.</p>"
        else:
            s: DocumentSentence
            for s in sentences:
                label: str = str(s.auto_sentiment_label or "Neutral")
                color = sentiment_colors.get(label, "#9ca3af")
                html_content += f"""
                        <div class="sentiment-sentence" style="border-left-color: {color}">
                            <div class="sentiment-badge" style="background-color: {color}">{label}</div>
                            <div class="sentiment-text">{s.text}</div>
                        </div>
                """
        
        html_content += """
                    </div>
                </article>
        """

    html_content += """
            </div>
        </div>
    </body>
    </html>
    """
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".html", mode='w', encoding='utf-8')
    temp_path = temp_file.name
    temp_file.write(html_content)
    temp_file.close()

    return FileResponse(temp_path, filename=f"Project_{project.name}_Summary.html")

@router.get("/text/{project_id}")
def export_text_summary(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    documents = db.query(Document).filter(Document.project_id == project_id).all()
    text_content = f"PROJECT SUMMARY: {project.name}\n"
    text_content += "="*40 + "\n\n"
    
    for doc in documents:
        text_content += f"DOCUMENT: {doc.title}\n"
        text_content += "-"*20 + "\n"
        text_content += doc.content + "\n\n"

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt", mode='w', encoding='utf-8')
    temp_path = temp_file.name
    temp_file.write(text_content)
    temp_file.close()

    return FileResponse(temp_path, filename=f"Project_{project.name}_FullText.txt")
