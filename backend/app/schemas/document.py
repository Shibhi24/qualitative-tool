from pydantic import BaseModel 
from datetime import datetime 
from typing import Optional 
 
 
class DocumentCreate(BaseModel): 
    """Schema for creating a new document."""
    title: str 
    content: str 
    project_id: int 
 
 
class DocumentUpdate(BaseModel): 
    """Schema for updating an existing document."""
    title: Optional[str] = None 
    content: Optional[str] = None 
    project_id: Optional[int] = None 
 
 
class DocumentResponse(BaseModel): 
    """Schema for document data returned in API responses."""
    id: int 
    title: str 
    content: str 
    project_id: int 
    created_at: datetime 
 
    class Config: 
        from_attributes = True