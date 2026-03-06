# ==============================================
# IMPORTS
# ==============================================

from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# ==============================================
# MODEL DEFINITION
# ==============================================

class Document(Base):
    """
    SQLAlchemy model representing a document within a project.
    Contains the raw text content to be analyzed and coded.
    """
    __tablename__ = "documents"

    # -----------------------------
    # Columns
    # -----------------------------
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # -----------------------------
    # Relationships
    # -----------------------------

    # Many Documents → One Project
    project = relationship(
        "Project",
        back_populates="documents"
    )

    # One Document → Many Segments
    segments = relationship(
        "Segment",
        back_populates="document",
        cascade="all, delete-orphan"
    )