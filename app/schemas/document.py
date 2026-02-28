from pydantic import BaseModel 
from datetime import datetime 
from typing import Optional 
 
 
class DocumentCreate(BaseModel): 
    title: str 
    content: str 
    project_id: int 
 
 
class DocumentUpdate(BaseModel): 
    title: Optional[str] = None 
    content: Optional[str] = None 
    project_id: Optional[int] = None 
 
 
class DocumentResponse(BaseModel): 
    id: int 
    title: str 
    content: str 
    project_id: int 
    created_at: datetime 
 
    class Config: 
        from_attributes = True