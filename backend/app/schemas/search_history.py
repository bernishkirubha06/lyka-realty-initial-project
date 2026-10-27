from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from backend.app.schemas.property import PropertyResponse

class SearchHistoryCreate(BaseModel):
    property_id: Optional[int] = None
    property_title: Optional[str] = None
    search_query: Optional[str] = None
    locality: Optional[str] = None
    bhk: Optional[int] = None
    price: Optional[float] = None

class SearchHistoryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    property_id: Optional[int] = None
    property_title: Optional[str] = None
    search_query: Optional[str] = None
    locality: Optional[str] = None
    bhk: Optional[int] = None
    price: Optional[float] = None
    visit_count: int = 1
    created_at: datetime
    property: Optional[PropertyResponse] = None
    ai_recommendations: Optional[List[PropertyResponse]] = []

    class Config:
        from_attributes = True
