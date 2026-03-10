from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Segment preview for memo display
class SegmentPreview(BaseModel):
    id: int
    selected_text: str

    class Config:
        from_attributes = True


class MemoBase(BaseModel):
    title: str
    content: str
    project_id: int
    segment_id: Optional[int] = None


class MemoCreate(MemoBase):
    pass


class Memo(MemoBase):
    id: int
    created_at: datetime
    segment: Optional[SegmentPreview] = None

    class Config:
        from_attributes = True