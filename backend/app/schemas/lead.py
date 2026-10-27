from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.schemas.property import PropertyResponse

class LeadRequirements(BaseModel):
    customer_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    lead_type: Optional[str] = "Buyer" # Buyer, Renter, Investor, Seller
    purpose: Optional[str] = None # Personal use, Investment (High ROI)
    city: Optional[str] = "Dubai"
    locality: Optional[str] = None
    property_type: Optional[str] = "Apartment"
    bhk: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: Optional[str] = "AED"
    preferred_features: Optional[List[str]] = []
    purchase_timeline: Optional[str] = None

class LeadScoreBreakdown(BaseModel):
    total_score: int
    category: str # HOT, WARM, COLD
    badge: str # 🔥 HOT LEAD, ⚡ WARM LEAD, ❄️ COLD LEAD
    explanation: str
    factors: Dict[str, int] # e.g. {"budget_clarity": 20, "timeline": 15, ...}

class LeadCreate(BaseModel):
    customer_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    secondary_contact: Optional[str] = None
    lead_type: Optional[str] = "Buyer"
    purpose: Optional[str] = "Personal use"
    city: Optional[str] = "Dubai"
    locality: Optional[str] = None
    property_type: Optional[str] = "Apartment"
    bhk: Optional[int] = None
    bathrooms: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: Optional[str] = "AED"
    purchase_timeline: Optional[str] = None
    preferred_features: Optional[List[str]] = []
    notes: Optional[str] = None
    requirements: Optional[LeadRequirements] = None

class LeadUpdate(BaseModel):
    pipeline_status: Optional[str] = None
    customer_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    lead_type: Optional[str] = None
    purpose: Optional[str] = None
    locality: Optional[str] = None
    bhk: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    purchase_timeline: Optional[str] = None
    lead_score: Optional[int] = None
    lead_category: Optional[str] = None

class RecommendationItem(BaseModel):
    property: PropertyResponse
    match_score: int
    reasons: List[str]

class FollowUpCreate(BaseModel):
    note: str
    due_date: Optional[datetime] = None

class FollowUpResponse(BaseModel):
    id: int
    lead_id: int
    agent_id: Optional[int] = None
    agent_name: Optional[str] = None
    note: str
    due_date: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class LeadAssignRequest(BaseModel):
    agent_id: int

class LeadResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    client_id: Optional[int] = None
    assigned_agent_name: Optional[str] = None
    customer_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    lead_type: Optional[str] = "Buyer"
    purpose: Optional[str] = None
    city: str
    locality: Optional[str] = None
    property_type: str
    bhk: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    currency: str
    purchase_timeline: Optional[str] = None
    preferred_features: List[str] = []
    lead_score: int
    lead_category: str
    lead_explanation: Optional[str] = None
    ai_summary: Optional[str] = None
    pipeline_status: str
    last_interaction: datetime
    created_at: datetime
    recommended_properties: Optional[List[RecommendationItem]] = []
    follow_ups: Optional[List[FollowUpResponse]] = []

    class Config:
        from_attributes = True
