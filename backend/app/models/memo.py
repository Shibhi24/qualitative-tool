from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Memo(Base):
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # Nullable so memo can exist without segment (project memo)
    segment_id = Column(Integer, ForeignKey("segments.id", ondelete="CASCADE"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", backref="memos")
    segment = relationship("Segment", backref="memos")