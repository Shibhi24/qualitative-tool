from sqlalchemy import Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database import Base


class Segment(Base):
    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    start_index = Column(Integer)
    end_index = Column(Integer)
    selected_text = Column(String(500))

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