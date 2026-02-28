from pydantic import BaseModel
from typing import Optional, List


# ==============================================
# CREATE SEGMENT (Many-to-Many)
# ==============================================

class SegmentCreate(BaseModel):
    document_id: int
    start_index: int
    end_index: int
    selected_text: str
    code_ids: List[int]   # 🔥 multiple codes


# ==============================================
# UPDATE SEGMENT
# ==============================================

class SegmentUpdate(BaseModel):
    document_id: Optional[int] = None
    start_index: Optional[int] = None
    end_index: Optional[int] = None
    selected_text: Optional[str] = None
    code_ids: Optional[List[int]] = None   # 🔥 allow updating codes


# ==============================================
# RESPONSE SCHEMA
# ==============================================

class SegmentResponse(BaseModel):
    id: int
    document_id: int
    start_index: int
    end_index: int
    selected_text: str

    class Config:
        from_attributes = True  