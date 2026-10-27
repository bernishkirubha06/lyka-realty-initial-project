from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadRequirements, RecommendationItem
from app.services.recommendation.recommendation_engine import get_recommendations_for_requirements

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("", response_model=List[RecommendationItem])
def compute_recommendations(
    req: LeadRequirements,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    recs, _ = get_recommendations_for_requirements(db, req, limit=limit)
    return recs

@router.get("/{lead_id}", response_model=List[RecommendationItem])
def get_lead_recommendations(
    lead_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    req = LeadRequirements(
        city=lead.city,
        locality=lead.locality,
        property_type=lead.property_type,
        bhk=lead.bhk,
        budget_min=lead.budget_min,
        budget_max=lead.budget_max,
        currency=lead.currency,
        purchase_timeline=lead.purchase_timeline
    )
    recs, _ = get_recommendations_for_requirements(db, req, limit=limit)
    return recs
