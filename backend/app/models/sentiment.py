from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class SentimentLexicon(Base):
    """
    SQLAlchemy model representing a sentiment lexicon (dictionary of words).
    Used for semi-automated lexicon-based sentiment analysis.
    """
    __tablename__ = "sentiment_lexicons"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    entries = relationship("SentimentLexiconEntry", back_populates="lexicon", cascade="all, delete-orphan")

class SentimentLexiconEntry(Base):
    """
    SQLAlchemy model representing an individual word or phrase in a lexicon.
    Stores the associated sentiment label (e.g., Positive) and numerical score.
    """
    __tablename__ = "sentiment_lexicon_entries"
    id = Column(Integer, primary_key=True, index=True)
    lexicon_id = Column(Integer, ForeignKey("sentiment_lexicons.id"), nullable=False)
    word_or_phrase = Column(String(255), nullable=False)
    sentiment_label = Column(String(50)) # Very Negative to Very Positive
    sentiment_score = Column(Float) # -1.0 to 1.0
    intensity = Column(Float, default=1.0) # 0.0 to 1.0 (v2 feature)

    lexicon = relationship("SentimentLexicon", back_populates="entries")

class DocumentSentence(Base):
    """
    SQLAlchemy model representing a sentence extracted from a document.
    Stores auto-calculated sentiment results and manual override status.
    """
    __tablename__ = "document_sentences"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    text = Column(String(2000), nullable=False)
    start_index = Column(Integer)
    end_index = Column(Integer)
    auto_sentiment_score = Column(Float)
    auto_sentiment_label = Column(String(50))
    auto_sentiment_intensity = Column(Float, default=1.0) # v2 feature
    manual_override = Column(Boolean, default=False)
    
    document = relationship("Document", backref="sentences")
