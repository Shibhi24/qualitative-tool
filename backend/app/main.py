"""
Main entry point for the Qualitative Tool Backend.
Initializes the FastAPI application, sets up CORS, creates database tables, 
and includes all modular routers.
"""

from fastapi import FastAPI
from app.database import engine, Base
from typing import List
from fastapi.middleware.cors import CORSMiddleware

# Database model imports required for table creation
from app.models.project import Project
from app.models.document import Document
from app.models.code import Code
from app.models.segment import Segment
from app.models.segment_code import SegmentCode
from app.models.sentiment import SentimentLexicon, SentimentLexiconEntry, DocumentSentence
from app.models.memo import Memo

# API router imports
from app.routes.project import router as project_router
from app.routes.document import router as document_router
from app.routes.code import router as code_router
from app.routes.segment import router as segment_router
from app.routes.analysis import router as analysis_router
from app.routes.memo import router as memo_router
from app.routes.export import router as export_router

app = FastAPI(title="Qualitative Tool Backend")

# Configure CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted origins should be used in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

# Include sub-routers for different functional modules
app.include_router(project_router)
app.include_router(document_router)
app.include_router(code_router)
app.include_router(segment_router)
app.include_router(analysis_router)
app.include_router(memo_router)
app.include_router(export_router)

@app.get("/")
def root():
    """Basic health check endpoint."""
    return {"message": "Backend running successfully"}

