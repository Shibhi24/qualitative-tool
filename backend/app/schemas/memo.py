from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MemoBase(BaseModel):
    title: str
    content: str
    project_id: int

class MemoCreate(MemoBase):
    pass

class Memo(MemoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
