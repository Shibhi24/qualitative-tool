"""
Pydantic Schemas for Sentiment Analysis.
Defines the data structures used for classifying text sentiment, managing lexicons, and returning analysis results.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SentimentLexiconEntryBase(BaseModel):
    """Base schema for sentiment lexicon entries."""
    word_or_phrase: str
    sentiment_label: str
    sentiment_score: float

class SentimentLexiconEntryCreate(SentimentLexiconEntryBase):
    pass

class SentimentLexiconEntry(SentimentLexiconEntryBase):
    id: int
    lexicon_id: int

    class Config:
        from_attributes = True

class SentimentLexiconBase(BaseModel):
    """Base schema for sentiment lexicons."""
    name: str

class SentimentLexiconCreate(SentimentLexiconBase):
    project_id: int

class SentimentLexicon(SentimentLexiconBase):
    id: int
    project_id: int
    created_at: datetime
    entries: List[SentimentLexiconEntry] = []

    class Config:
        from_attributes = True

class DocumentSentenceBase(BaseModel):
    """Base schema for document sentences with sentiment data."""
    text: str
    start_index: int
    end_index: int
    auto_sentiment_score: float
    auto_sentiment_label: str
    manual_override: bool = False

class DocumentSentence(DocumentSentenceBase):
    id: int
    document_id: int

    class Config:
        from_attributes = True

class SentimentAnalysisResult(BaseModel):
    sentence_id: Optional[int] = None
    text: str
    polarity: float
    label: str
    start: int
    end: int
