"""
Pydantic Schemas for Analytical Memos.
These schemas define the data structures used for API requests and responses related to Memos.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SegmentPreview(BaseModel):
    """
    Schema for a minimal preview of a coded text segment.
    Used when a memo is attached to a specific segment of text.
    """
    id: int
    selected_text: str

    class Config:
        from_attributes = True


class MemoBase(BaseModel):
    """
    Base schema containing common attributes for Memos.
    """
    title: str
    content: str
    project_id: int
    segment_id: Optional[int] = None


class MemoCreate(MemoBase):
    """
    Schema for creating a new Memo via API.
    Inherits all fields from MemoBase.
    """
    pass


class Memo(MemoBase):
    """
    Schema representing a complete Memo as returned from the database.
    Includes the auto-generated ID, timestamp, and an optional segment preview.
    """
    id: int
    created_at: datetime
    segment: Optional[SegmentPreview] = None

    class Config:
        from_attributes = True