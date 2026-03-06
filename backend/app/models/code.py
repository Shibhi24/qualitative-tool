from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Code(Base):
    """
    SQLAlchemy model representing a thematic code or category.
    Supports a hierarchical structure (parent-child) for organized coding.
    """
    __tablename__ = "codes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    color = Column(String(50))
    description = Column(String(1000), nullable=True) # v2: Code memo
    created_at = Column(DateTime, default=datetime.utcnow)

    # -----------------------------
    # Foreign Keys
    # -----------------------------
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("codes.id"), nullable=True)

    # -----------------------------
    # Relationships
    # -----------------------------

    # Many Codes → One Project
    project = relationship(
        "Project",
        back_populates="codes"
    )

    # Self-referencing Parent
    parent = relationship(
        "Code",
        remote_side=[id],
        back_populates="children"
    )

    # Self-referencing Children
    children = relationship(
        "Code",
        back_populates="parent",
        cascade="all, delete-orphan"
    )

    # Many-to-Many with Segment (through SegmentCode)
    segment_codes = relationship(
        "SegmentCode",
        back_populates="code",
        cascade="all, delete-orphan"
    )

    segments = relationship(
        "Segment",
        secondary="segment_codes",
        viewonly=True
    )