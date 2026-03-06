from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.code import Code
from app.models.project import Project
from app.schemas.code import CodeCreate, CodeResponse, CodeUpdate
from app.schemas.code import CodeTreeResponse

router = APIRouter(
    prefix="/codes",
    tags=["Codes"]
)

# GET CODES
@router.get("/", response_model=List[CodeResponse])
def get_codes(project_id: int = None, db: Session = Depends(get_db)):
    query = db.query(Code)

    if project_id is not None:
        query = query.filter(Code.project_id == project_id)

    return query.all()

# GET CODES AS TREE
@router.get("/tree", response_model=List[CodeTreeResponse])
def get_code_tree(project_id: int, db: Session = Depends(get_db)):

    codes = db.query(Code).filter(Code.project_id == project_id).all()

    code_dict = {}
    tree = []

    # Convert to dictionary
    for code in codes:
        code_dict[code.id] = {
            "id": code.id,
            "name": code.name,
            "color": code.color,
            "project_id": code.project_id,
            "parent_id": code.parent_id,
            "children": []
        }

    # Build tree
    for code in code_dict.values():
        if code["parent_id"] is None:
            tree.append(code)
        else:
            parent = code_dict.get(code["parent_id"])
            if parent:
                parent["children"].append(code)

    return tree


# CREATE CODE
@router.post("/", response_model=CodeResponse)
def create_code(code: CodeCreate, db: Session = Depends(get_db)):

    # Check project exists
    project = db.query(Project).filter(Project.id == code.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # If parent_id provided, validate it
    if code.parent_id:
        parent = db.query(Code).filter(Code.id == code.parent_id).first()

        if not parent:
            raise HTTPException(status_code=404, detail="Parent code not found")

        # Ensure parent belongs to same project
        if parent.project_id != code.project_id:
            raise HTTPException(
                status_code=400,
                detail="Parent code must belong to same project"
            )

    # Create code with parent_id included
    db_code = Code(
        name=code.name,
        color=code.color,
        project_id=code.project_id,
        parent_id=code.parent_id
    )

    db.add(db_code)
    db.commit()
    db.refresh(db_code)

    return db_code


# UPDATE CODE
@router.put("/{code_id}", response_model=CodeResponse)
def update_code(code_id: int, data: CodeUpdate, db: Session = Depends(get_db)):

    code = db.query(Code).filter(Code.id == code_id).first()

    if not code:
        raise HTTPException(status_code=404, detail="Code not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(code, key, value)

    db.commit()
    db.refresh(code)

    return code


# DELETE CODE
@router.delete("/{code_id}")
def delete_code(code_id: int, db: Session = Depends(get_db)):

    code = db.query(Code).filter(Code.id == code_id).first()

    if not code:
        raise HTTPException(status_code=404, detail="Code not found")

    db.delete(code)
    db.commit()

    return {"message": "Code deleted successfully"}