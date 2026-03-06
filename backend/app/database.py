"""
Database configuration and session management.
Defines the SQLAlchemy engine, session factory, and base class for models.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database connection URL (MySQL)
DATABASE_URL = "mysql+pymysql://root:Bala2004@localhost:3306/qualitative_tool"

# Initialize SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Session factory for generating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for declarative models
Base = declarative_base()

def get_db():
    """
    Dependency to provide a database session for each request.
    Ensures the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()