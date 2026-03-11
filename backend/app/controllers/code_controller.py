"""
Controller for Code management operations.
Handles the business logic for creating, retrieving, updating, and deleting
hierarchical codes within a project.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.code import Code
from app.schemas.code import CodeCreate, CodeUpdate


# ✅ CREATE CODE (Supports Parent-Child)
def create_code(db: Session, code: CodeCreate):
    """
    Creates a new thematic code in the database.
    Validates parent-child relationships if a parent_id is provided.
    """

    # 🔎 If creating a child code
    if code.parent_id is not None:

        parent = db.query(Code).filter(Code.id == code.parent_id).first()

        # Parent must exist
        if not parent:
            raise HTTPException(
                status_code=404,
                detail="Parent code not found"
            )

        # Parent must belong to same project
        if parent.project_id != code.project_id:
            raise HTTPException(
                status_code=400,
                detail="Parent code belongs to different project"
            )

    new_code = Code(
        name=code.name,
        color=code.color,
        project_id=code.project_id,
        parent_id=code.parent_id
    )

    db.add(new_code)
    db.commit()
    db.refresh(new_code)

    return new_code


# ✅ GET SINGLE CODE
def get_code(db: Session, code_id: int):

    code = db.query(Code).filter(Code.id == code_id).first()

    if not code:
        raise HTTPException(
            status_code=404,
            detail="Code not found"
        )

    return code


# ✅ GET ALL CODES (By Project)
def get_codes_by_project(db: Session, project_id: int):

    return db.query(Code).filter(
        Code.project_id == project_id
    ).all()


# ✅ UPDATE CODE
def update_code(db: Session, code_id: int, code_update: CodeUpdate):

    code = db.query(Code).filter(Code.id == code_id).first()

    if not code:
        raise HTTPException(
            status_code=404,
            detail="Code not found"
        )

    update_data = code_update.model_dump(exclude_unset=True)

    # 🔎 If parent_id is being updated
    if "parent_id" in update_data:

        parent_id = update_data["parent_id"]

        if parent_id == code.id:
            raise HTTPException(
                status_code=400,
                detail="A code cannot be its own parent"
            )

        if parent_id is not None:
            parent = db.query(Code).filter(Code.id == parent_id).first()

            if not parent:
                raise HTTPException(
                    status_code=404,
                    detail="Parent code not found"
                )

            if parent.project_id != code.project_id:
                raise HTTPException(
                    status_code=400,
                    detail="Parent code belongs to different project"
                )

    for key, value in update_data.items():
        setattr(code, key, value)

    db.commit()
    db.refresh(code)

    return code


# ✅ DELETE CODE
def delete_code(db: Session, code_id: int):

    code = db.query(Code).filter(Code.id == code_id).first()

    if not code:
        raise HTTPException(
            status_code=404,
            detail="Code not found"
        )

    db.delete(code)
    db.commit()

    return {"message": "Code deleted successfully"}