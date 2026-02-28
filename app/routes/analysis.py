from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List


from app.database import get_db
from app.models.segment import Segment
from app.models.code import Code
from app.models.document import Document


router = APIRouter(prefix="/analysis", tags=["Analysis"])




@router.get("/code-frequency/{project_id}")
def code_frequency(project_id: int, db: Session = Depends(get_db)):


    results = (
        db.query(Code.name, func.count(Segment.id).label("count"))
        .join(Segment, Segment.code_id == Code.id)
        .join(Document, Segment.document_id == Document.id)
        .filter(Document.project_id == project_id)
        .group_by(Code.name)
        .all()
    )


    return [{"code": r[0], "count": r[1]} for r in results]

