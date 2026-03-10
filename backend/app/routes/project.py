"""
API routes for project management.
Handles creating, retrieving, updating, and deleting projects.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.project import Project
from app.models.code import Code
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)

# ================= GET ALL PROJECTS =================
@router.get("/", response_model=list[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    """Retrieves all projects from the database."""
    return db.query(Project).all()

# ================= CREATE SAMPLE PROJECT =================
@router.post("/sample", response_model=ProjectResponse)
def create_sample_project(db: Session = Depends(get_db)):
    """Creates a pre-populated sample project."""
    from app.models.document import Document
    from app.models.segment import Segment
    from app.models.segment_code import SegmentCode
    from app.models.sentiment import DocumentSentence
    
    try:
        # 1. Create Project
        new_project = Project(
            name="Sample Project: Customer Feedback", 
            description="A sample project analyzing customer reviews for a new software product."
        )
        db.add(new_project)
        db.flush()
        
        # 2. Create Codes
        code_ui = Code(name="User Interface", color="#3b82f6", project_id=new_project.id)
        code_perf = Code(name="Performance", color="#ef4444", project_id=new_project.id)
        code_support = Code(name="Customer Support", color="#10b981", project_id=new_project.id)
        db.add_all([code_ui, code_perf, code_support])
        db.flush()
        
        # 3. Create Document
        sample_text = (
            "The new dashboard update is fantastic! It looks very modern and clean. "
            "However, the application feels very slow when loading large datasets. "
            "I reached out to the support team and they were incredibly helpful and resolved my billing issue in minutes."
        )
        doc = Document(title="Q3 User Reviews", content=sample_text, project_id=new_project.id)
        db.add(doc)
        db.flush()
        
        # 4. Create Segments
        seg_1 = Segment(document_id=doc.id, start_index=0, end_index=72, selected_text="The new dashboard update is fantastic! It looks very modern and clean. ")
        seg_2 = Segment(document_id=doc.id, start_index=72, end_index=143, selected_text="However, the application feels very slow when loading large datasets. ")
        seg_3 = Segment(document_id=doc.id, start_index=143, end_index=252, selected_text="I reached out to the support team and they were incredibly helpful and resolved my billing issue in minutes.")
        db.add_all([seg_1, seg_2, seg_3])
        db.flush()
        
        # Link Segments to Codes
        db.add_all([
            SegmentCode(segment_id=seg_1.id, code_id=code_ui.id),
            SegmentCode(segment_id=seg_2.id, code_id=code_perf.id),
            SegmentCode(segment_id=seg_3.id, code_id=code_support.id)
        ])
        
        # 5. Add Sentiment
        sent_1 = DocumentSentence(document_id=doc.id, text="The new dashboard update is fantastic!", start_index=0, end_index=38, auto_sentiment_label="Positive", auto_sentiment_score=0.9)
        sent_2 = DocumentSentence(document_id=doc.id, text="It looks very modern and clean.", start_index=39, end_index=70, auto_sentiment_label="Positive", auto_sentiment_score=0.8)
        sent_3 = DocumentSentence(document_id=doc.id, text="However, the application feels very slow when loading large datasets.", start_index=72, end_index=141, auto_sentiment_label="Negative", auto_sentiment_score=-0.7)
        sent_4 = DocumentSentence(document_id=doc.id, text="I reached out to the support team and they were incredibly helpful and resolved my billing issue in minutes.", start_index=143, end_index=251, auto_sentiment_label="Very Positive", auto_sentiment_score=0.95)
        db.add_all([sent_1, sent_2, sent_3, sent_4])
        
        db.commit()
        db.refresh(new_project)
        return new_project
    except Exception as e:
        db.rollback()
        print(f"Sample Project Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create sample project")

# ================= CREATE PROJECT =================
@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """
    Creates a new project and initializes it with default codes.
    
    1. Creates the Project entry.
    2. Creates a 'Main Code' and a 'Sub Code' for the project.
    """
    try:
        # 1️⃣ Create Project
        new_project = Project(**project.dict())
        db.add(new_project)
        db.flush()  # Get ID without committing

        # 2️⃣ Create Default Main Code
        main_code = Code(
            name="Main Code",
            project_id=new_project.id,
            parent_id=None
        )
        db.add(main_code)
        db.flush()  # Get main_code.id

        # 3️⃣ Create Default Sub Code under Main Code
        sub_code = Code(
            name="Sub Code ",
            project_id=new_project.id,
            parent_id=main_code.id
        )
        db.add(sub_code)

        # Final Commit (single transaction)
        db.commit()
        db.refresh(new_project)

        return new_project

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Project creation failed")


# ================= UPDATE PROJECT =================
@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):

    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    return project


# ================= DELETE PROJECT =================
@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):

    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}