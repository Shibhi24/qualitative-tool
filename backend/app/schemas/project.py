from pydantic import BaseModel 
from datetime import datetime 
from typing import Optional 
 
 
class ProjectCreate(BaseModel): 
    """Schema for creating a new project."""
    name: str 
    description: str 
 
 
class ProjectUpdate(BaseModel): 
    """Schema for updating an existing project."""
    name: Optional[str] = None 
    description: Optional[str] = None 
 
 
class ProjectResponse(BaseModel): 
    """Schema for project data returned in API responses."""
    id: int 
    name: str 
    description: str 
    created_at: datetime 
 
    class Config: 
        from_attributes = True