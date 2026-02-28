from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    # One Project → Many Documents
    documents = relationship(
        "Document",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    # One Project → Many Codes
    codes = relationship(
        "Code",
        back_populates="project",
        cascade="all, delete-orphan"
    )