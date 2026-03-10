from sqlalchemy import Column, Integer, ForeignKey, String, Float, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Segment(Base):
    """
    SQLAlchemy model representing a specific portion of text from a document.
    Segments can be associated with multiple codes and can store sentiment data.
    """
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    start_index = Column(Integer)
    end_index = Column(Integer)
    selected_text = Column(String(2000))
    sentiment_label = Column(String(50), nullable=True) # e.g. "Positive"
    sentiment_score = Column(Float, nullable=True) # -1.0 to 1.0 scale
    memo = Column(String(1000), nullable=True) # v2: Segment memo
    manual_sentiment_override = Column(Boolean, default=False) # True if manually set

    document = relationship("Document", back_populates="segments")

    # NEW RELATIONSHIPS (prepare for many-to-many)
    segment_codes = relationship(
        "SegmentCode",
        back_populates="segment",
        cascade="all, delete"
    )

    codes = relationship(
        "Code",
        secondary="segment_codes",
        viewonly=True
    )