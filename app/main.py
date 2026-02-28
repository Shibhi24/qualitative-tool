
#import necessary libraries and modules
# FastAPI framework
# Database engine and Base metadata

from fastapi import FastAPI
from app.database import engine, Base
from typing import List
from fastapi.middleware.cors import CORSMiddleware

# These imports are required so that SQLAlchemy
# recognizes the models before creating tables.
# If you remove these imports, tables may not be created

from app.models.project import Project
from app.models.document import Document
from app.models.code import Code
from app.models.segment import Segment
from app.models.segment_code import SegmentCode

# Routers contain the API endpoints for each module.

from app.routes.project import router as project_router
from app.routes.document import router as document_router
from app.routes.code import router as code_router
from app.routes.segment import router as segment_router
from app.routes.analysis import router as analysis_router

app = FastAPI(title="Qualitative Tool Backend") # FASTAPI APPLICATION INITIALIZATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)                           # CREATE DATABASE TABLES BASED ON MODELS 

app.include_router(project_router)                              # Each router handles a specific module.
app.include_router(document_router)                             # This keeps the application modular and clean.
app.include_router(code_router)                                 
app.include_router(segment_router)
app.include_router(analysis_router)


@app.get("/")                                                         # Basic health check endpoint
def root():
    return {"message": "Backend running successfully"}               # Used to verify backend is running.

