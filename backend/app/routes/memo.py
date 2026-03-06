from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.memo import Memo as MemoModel
from app.schemas import memo as memo_schemas

router = APIRouter(prefix="/memos", tags=["Memos"])

@router.post("/", response_model=memo_schemas.Memo)
def create_memo(memo: memo_schemas.MemoCreate, db: Session = Depends(get_db)):
    db_memo = MemoModel(**memo.model_dump())
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)
    return db_memo

@router.get("/{project_id}", response_model=List[memo_schemas.Memo])
def get_memos(project_id: int, db: Session = Depends(get_db)):
    return db.query(MemoModel).filter(MemoModel.project_id == project_id).all()

@router.delete("/{memo_id}")
def delete_memo(memo_id: int, db: Session = Depends(get_db)):
    db_memo = db.query(MemoModel).filter(MemoModel.id == memo_id).first()
    if not db_memo:
        raise HTTPException(status_code=404, detail="Memo not found")
    db.delete(db_memo)
    db.commit()
    return {"message": "Memo deleted"}
