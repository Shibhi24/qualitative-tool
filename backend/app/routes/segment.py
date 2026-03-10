"""
API routes for segment management.
Handles creating, retrieving, and deleting segments (coded text portions).
"""

from app.models import segment
from app.schemas.memo import Memo
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
    
from app.database import get_db
from app.models.segment import Segment
from app.models.segment_code import SegmentCode
from app.models.document import Document
from app.models.code import Code
from app.schemas.segment import SegmentCreate, SegmentResponse, SegmentUpdate

router = APIRouter(
    prefix="/segments",
    tags=["Segments"]
)


#  CREATE SEGMENT WITH VALIDATION (Many-to-Many Version)
@router.post("/", response_model=SegmentResponse)
def create_segment(segment: SegmentCreate, db: Session = Depends(get_db)):

    document = db.query(Document).filter(Document.id == segment.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if segment.selected_text not in document.content:
        raise HTTPException(
            status_code=400,
            detail="Selected text not found in document"
        )

    new_segment = Segment(
        document_id=segment.document_id,
        start_index=segment.start_index,
        end_index=segment.end_index,
        selected_text=segment.selected_text
    )

    db.add(new_segment)
    db.commit()
    db.refresh(new_segment)

    # 🔹 Create many-to-many mappings + auto memo
    for code_id in segment.code_ids:

        code = db.query(Code).filter(Code.id == code_id).first()
        if not code:
            raise HTTPException(status_code=404, detail=f"Code {code_id} not found")

        mapping = SegmentCode(
            segment_id=new_segment.id,
            code_id=code_id
        )

        db.add(mapping)

        # 🔹 AUTO CREATE MEMO FROM CODE DESCRIPTION
        if code.description:
            memo = Memo(
                title=code.name,
                content=code.description,
                project_id=document.project_id,
                segment_id=new_segment.id
            )
            db.add(memo)

    db.commit()

    return new_segment


# 🔹 GET ALL SEGMENTS (With Filtering)
@router.get("/", response_model=List[SegmentResponse])
def get_segments(
    document_id: int | None = None,
    project_id: int | None = None,
    code_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Segment)

    if document_id is not None:
        query = query.filter(Segment.document_id == document_id)

    if project_id is not None:
        query = query.join(Document).filter(Document.project_id == project_id)

    if code_id is not None:
        query = query.join(SegmentCode).filter(SegmentCode.code_id == code_id)

    return query.all()


# 🔹 UPDATE SEGMENT
@router.put("/{segment_id}", response_model=SegmentResponse)
def update_segment(segment_id: int, data: SegmentUpdate, db: Session = Depends(get_db)):

    segment = db.query(Segment).filter(Segment.id == segment_id).first()

    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(segment, key, value)

    db.commit()
    db.refresh(segment)

    return segment


# 🔹 DELETE SEGMENT
@router.delete("/{segment_id}")
def delete_segment(segment_id: int, db: Session = Depends(get_db)):

    segment = db.query(Segment).filter(Segment.id == segment_id).first()

    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    db.delete(segment)
    db.commit()

    return {"message": "Segment deleted successfully"}