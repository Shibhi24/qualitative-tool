from pydantic import BaseModel
from typing import Optional, List


# ==============================================
# CREATE SEGMENT (Many-to-Many)
# ==============================================

class SegmentCreate(BaseModel):
    """Schema for creating a new text segment associated with one or more codes."""
    document_id: int
    start_index: int
    end_index: int
    selected_text: str
    code_ids: List[int]


class SegmentUpdate(BaseModel):
    """Schema for updating an existing text segment's metadata or code associations."""
    document_id: Optional[int] = None
    start_index: Optional[int] = None
    end_index: Optional[int] = None
    selected_text: Optional[str] = None
    code_ids: Optional[List[int]] = None


class SegmentResponse(BaseModel):
    """Schema for segment data returned in API responses."""
    id: int
    document_id: int
    start_index: int
    end_index: int
    selected_text: str

    class Config:
        from_attributes = True  