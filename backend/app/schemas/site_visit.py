from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.app.schemas.property import PropertyResponse

class SiteVisitCreate(BaseModel):
    property_id: int
    preferred_date: str
    preferred_time: str
    customer_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    lead_id: Optional[int] = None

class SiteVisitUpdate(BaseModel):
    status: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    notes: Optional[str] = None

class SiteVisitResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    lead_id: Optional[int] = None
    property_id: int
    customer_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    preferred_date: str
    preferred_time: str
    notes: Optional[str] = None
    status: str
    created_at: datetime
    property: Optional[PropertyResponse] = None

    class Config:
        from_attributes = True
