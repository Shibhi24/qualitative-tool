from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from typing import List


class CodeCreate(BaseModel):
    """Schema for creating a new thematic code."""
    name: str
    color: Optional[str] = None
    description: Optional[str] = None
    project_id: int
    parent_id: Optional[int] = None


class CodeUpdate(BaseModel):
    """Schema for updating an existing thematic code."""
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[int] = None
    parent_id: Optional[int] = None


class CodeResponse(BaseModel):
    """Basic schema for code data returned in API responses."""
    id: int
    name: str
    color: Optional[str]
    description: Optional[str] = None
    project_id: int
    parent_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class CodeTreeResponse(BaseModel):
    """Schema for returning a hierarchical tree of codes and their children."""
    id: int
    name: str
    color: Optional[str]
    description: Optional[str] = None
    project_id: int
    parent_id: Optional[int]
    children: List["CodeTreeResponse"] = Field(default_factory=list)    

    class Config:
        from_attributes = True


CodeTreeResponse.model_rebuild()