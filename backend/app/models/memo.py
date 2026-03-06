from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Memo(Base):
    """
    SQLAlchemy model representing a general project memo.
    Analytical notes recorded by researchers that aren't tied to specific segments.
    """
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Many Memos -> One Project
    project = relationship("Project", backref="memos")
