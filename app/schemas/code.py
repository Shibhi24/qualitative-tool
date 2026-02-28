from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from typing import List


class CodeCreate(BaseModel):
    name: str
    color: Optional[str] = None
    project_id: int
    parent_id: Optional[int] = None   # 🔥 Added


class CodeUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    project_id: Optional[int] = None
    parent_id: Optional[int] = None   # 🔥 Added


class CodeResponse(BaseModel):
    id: int
    name: str
    color: Optional[str]
    project_id: int
    parent_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class CodeTreeResponse(BaseModel):
    id: int
    name: str
    color: Optional[str]
    project_id: int
    parent_id: Optional[int]
    children: List["CodeTreeResponse"] = Field(default_factory=list)    

    class Config:
        from_attributes = True


CodeTreeResponse.model_rebuild()