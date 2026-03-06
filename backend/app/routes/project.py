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