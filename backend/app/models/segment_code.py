from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SegmentCode(Base):
    """
    SQLAlchemy model representing the association between Segments and Codes.
    Implements a many-to-many relationship.
    """
    __tablename__ = "segment_codes"

    id = Column(Integer, primary_key=True)
    segment_id = Column(Integer, ForeignKey("segments.id"))
    code_id = Column(Integer, ForeignKey("codes.id"))

    segment = relationship("Segment", back_populates="segment_codes")
    code = relationship("Code", back_populates="segment_codes")