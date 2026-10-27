import json
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import Optional, List

from backend.app.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.property import Property
from backend.app.models.recommendation import Recommendation
from backend.app.models.user import User
from backend.app.models.follow_up import FollowUpNote
from backend.app.schemas.lead import (
    LeadResponse,
    LeadCreate,
    LeadUpdate,
    LeadRequirements,
    RecommendationItem,
    FollowUpCreate,
    FollowUpResponse,
    LeadAssignRequest
)
from backend.app.schemas.property import PropertyResponse
from backend.app.services.auth.auth_service import (
    get_current_user,
    get_current_agent,
    get_current_manager,
    get_current_admin,
    get_current_user_optional
)
from backend.app.services.ai.lead_scoring_service import calculate_lead_score, generate_ai_lead_summary
from backend.app.services.recommendation.recommendation_engine import get_recommendations_for_requirements
from backend.app.utils.timezone import to_dubai_time, get_dubai_now

router = APIRouter(prefix="/leads", tags=["Leads"])

def _format_lead_response(lead: Lead, db: Session) -> LeadResponse:
    # Look up assigned agent
    assigned_name = "Unassigned"
    if lead.user_id:
        agent_user = db.query(User).filter(User.id == lead.user_id).first()
        if agent_user:
            assigned_name = agent_user.full_name

    # Fetch follow ups
    follow_up_records = db.query(FollowUpNote).filter(FollowUpNote.lead_id == lead.id).order_by(desc(FollowUpNote.created_at)).all()
    formatted_follow_ups = [
        FollowUpResponse(
            id=f.id,
            lead_id=f.lead_id,
            agent_id=f.agent_id,
            agent_name=f.agent_name,
            note=f.note,
            due_date=f.due_date,
            status=f.status or "pending",
            created_at=f.created_at
        )
        for f in follow_up_records
    ]

    # Fetch recommended properties for this lead
    recs = db.query(Recommendation, Property).join(Property, Recommendation.property_id == Property.id).filter(Recommendation.lead_id == lead.id).all()
    
    rec_items = []
    for r, p in recs:
        parsed_amenities = []
        try:
            parsed_amenities = json.loads(p.amenities or "[]")
        except Exception:
            pass
            
        prop_res = PropertyResponse(
            id=p.id,
            title=p.title,
            description=p.description,
            city=p.city,
            locality=p.locality,
            property_type=p.property_type,
            bhk=p.bhk,
            bathrooms=p.bathrooms,
            super_area_sqft=p.super_area_sqft,
            carpet_area_sqft=p.carpet_area_sqft,
            price=p.price,
            currency=p.currency,
            price_per_sqft=p.price_per_sqft,
            floor_number=p.floor_number,
            total_floors=p.total_floors,
            property_age=p.property_age,
            furnishing_status=p.furnishing_status,
            parking=p.parking,
            lift_available=p.lift_available,
            gated_community=p.gated_community,
            distance_to_metro_km=p.distance_to_metro_km,
            distance_to_city_center_km=p.distance_to_city_center_km,
            amenities=p.amenities,
            parsed_amenities=parsed_amenities,
            latitude=p.latitude,
            longitude=p.longitude,
            image_url=p.image_url,
            availability=p.availability,
            quality=p.quality,
            view_type=p.view_type,
            is_dataset_record=p.is_dataset_record,
            created_at=p.created_at
        )
        
        reasons_list = []
        try:
            reasons_list = json.loads(r.reasons or "[]")
        except Exception:
            pass
            
        rec_items.append(RecommendationItem(
            property=prop_res,
            match_score=int(r.match_score),
            reasons=reasons_list
        ))

    pref_feats = []
    try:
        pref_feats = json.loads(lead.preferred_features or "[]")
    except Exception:
        pass

    return LeadResponse(
        id=lead.id,
        user_id=lead.user_id,
        client_id=getattr(lead, "client_id", None),
        assigned_agent_name=assigned_name,
        customer_name=lead.customer_name,
        email=lead.email,
        phone=lead.phone,
        lead_type=getattr(lead, "lead_type", None) or "Buyer",
        purpose=getattr(lead, "purpose", None),
        city=lead.city,
        locality=lead.locality,
        property_type=lead.property_type,
        bhk=lead.bhk,
        budget_min=lead.budget_min,
        budget_max=lead.budget_max,
        currency=lead.currency,
        purchase_timeline=lead.purchase_timeline,
        preferred_features=pref_feats,
        lead_score=lead.lead_score,
        lead_category=lead.lead_category,
        lead_explanation=lead.lead_explanation,
        ai_summary=lead.ai_summary,
        pipeline_status=lead.pipeline_status,
        last_interaction=to_dubai_time(lead.last_interaction),
        created_at=to_dubai_time(lead.created_at),
        recommended_properties=rec_items,
        follow_ups=formatted_follow_ups
    )

@router.post("", response_model=LeadResponse)
def create_lead(
    lead_in: LeadCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    # Formulate requirements object
    req = lead_in.requirements if lead_in.requirements else LeadRequirements(
        customer_name=lead_in.customer_name,
        email=lead_in.email,
        phone=lead_in.phone,
        lead_type=lead_in.lead_type or "Buyer",
        purpose=lead_in.purpose or "Personal use",
        city=lead_in.city or "Dubai",
        locality=lead_in.locality,
        property_type=lead_in.property_type or "Apartment",
        bhk=lead_in.bhk,
        budget_min=lead_in.budget_min,
        budget_max=lead_in.budget_max,
        currency=lead_in.currency or "AED",
        preferred_features=lead_in.preferred_features or [],
        purchase_timeline=lead_in.purchase_timeline
    )

    score = calculate_lead_score(req)
    ai_summary = generate_ai_lead_summary(req, score)

    # Assign lead to creator if they are an agent, otherwise assign to an agent in database
    assigned_agent_id = current_user.id if (current_user and current_user.role == "agent") else None
    if not assigned_agent_id:
        fallback_agent = db.query(User).filter(User.role == "agent").first()
        if fallback_agent:
            assigned_agent_id = fallback_agent.id
        else:
            staff_user = db.query(User).filter(User.role.in_(["agent", "manager", "admin"])).first()
            if staff_user:
                assigned_agent_id = staff_user.id

    submitting_client_id = current_user.id if current_user else None
    client_name = lead_in.customer_name or (current_user.full_name if current_user else "Client")
    client_email = lead_in.email or (current_user.email if current_user else None)
    client_phone = lead_in.phone or (current_user.phone if current_user else None)

    lead = Lead(
        user_id=assigned_agent_id,
        client_id=submitting_client_id,
        customer_name=client_name,
        email=client_email,
        phone=client_phone,
        lead_type=lead_in.lead_type or "Buyer",
        purpose=lead_in.purpose or "Personal use",
        city=lead_in.city or "Dubai",
        locality=lead_in.locality,
        property_type=lead_in.property_type or "Apartment",
        bhk=lead_in.bhk,
        budget_min=lead_in.budget_min,
        budget_max=lead_in.budget_max,
        currency=lead_in.currency or "AED",
        purchase_timeline=lead_in.purchase_timeline,
        preferred_features=json.dumps(lead_in.preferred_features or []),
        lead_score=score.total_score,
        lead_category=score.category,
        lead_explanation=score.explanation,
        ai_summary=ai_summary,
        pipeline_status="ai_qualified" if score.total_score >= 40 else "new",
        last_interaction=get_dubai_now(),
        created_at=get_dubai_now()
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Automatically query and link matching properties from sample database
    recommendations, _ = get_recommendations_for_requirements(db, req, limit=5)
    for rec in recommendations:
        db_rec = Recommendation(
            lead_id=lead.id,
            property_id=rec.property.id,
            match_score=rec.match_score,
            reasons=json.dumps(rec.reasons)
        )
        db.add(db_rec)
    if recommendations:
        lead.pipeline_status = "properties_recommended"
    db.commit()
    db.refresh(lead)

    return _format_lead_response(lead, db)

@router.get("", response_model=List[LeadResponse])
def get_leads(
    scope: Optional[str] = Query(None), # "mine", "team"
    agent_id: Optional[int] = Query(None), # filter by specific agent
    category: Optional[str] = Query(None), # HOT, WARM, COLD
    status_filter: Optional[str] = Query(None), # pipeline status
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent)
):
    q = db.query(Lead)

    # Security Rule: Agent can only view their own assigned leads
    if current_user.role == "agent":
        q = q.filter(Lead.user_id == current_user.id)
    elif current_user.role in ["manager", "admin"]:
        # Sales Manager & Admin can toggle between 'mine' or view specific/all agents
        if scope == "mine":
            q = q.filter(Lead.user_id == current_user.id)
        elif agent_id is not None:
            q = q.filter(Lead.user_id == agent_id)

    if category:
        q = q.filter(Lead.lead_category == category.upper())
    if status_filter:
        q = q.filter(Lead.pipeline_status == status_filter)
    if search:
        q = q.filter(
            (Lead.customer_name.ilike(f"%{search}%")) |
            (Lead.locality.ilike(f"%{search}%")) |
            (Lead.email.ilike(f"%{search}%"))
        )

    leads = q.order_by(desc(Lead.lead_score), desc(Lead.last_interaction)).all()
    return [_format_lead_response(l, db) for l in leads]

def _get_user_leads_query(db: Session, user: User):
    conditions = []
    if hasattr(Lead, "client_id") and user.id:
        conditions.append(Lead.client_id == user.id)
    if user.email:
        conditions.append(Lead.email == user.email)
    if user.phone:
        conditions.append(Lead.phone == user.phone)
    
    if not conditions:
        return db.query(Lead).filter(Lead.id == -1)
    return db.query(Lead).filter(or_(*conditions))

@router.get("/my-leads", response_model=List[LeadResponse])
def get_my_all_leads(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    if not user:
        return []
    # Only return actual property requirement submissions (not raw account-only registration logs)
    q = _get_user_leads_query(db, user).filter(
        or_(
            Lead.locality.isnot(None),
            Lead.bhk.isnot(None),
            Lead.budget_max.isnot(None),
            Lead.budget_min.isnot(None)
        )
    )
    leads = q.order_by(desc(Lead.created_at)).all()
    return [_format_lead_response(l, db) for l in leads]

@router.get("/my-lead", response_model=Optional[LeadResponse])
def get_my_current_lead(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    if not user:
        return None
    lead = _get_user_leads_query(db, user).filter(
        or_(
            Lead.locality.isnot(None),
            Lead.bhk.isnot(None),
            Lead.budget_max.isnot(None),
            Lead.budget_min.isnot(None)
        )
    ).order_by(desc(Lead.created_at)).first()
    if not lead:
        return None
    return _format_lead_response(lead, db)

@router.get("/follow-ups/due-today", response_model=List[FollowUpResponse])
def get_follow_ups_due_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent)
):
    q = db.query(FollowUpNote).filter(FollowUpNote.status == "pending")
    # If agent, only their follow-ups
    if current_user.role == "agent":
        q = q.filter(FollowUpNote.agent_id == current_user.id)
    
    notes = q.order_by(FollowUpNote.due_date.asc(), desc(FollowUpNote.created_at)).all()
    return [
        FollowUpResponse(
            id=f.id,
            lead_id=f.lead_id,
            agent_id=f.agent_id,
            agent_name=f.agent_name,
            note=f.note,
            due_date=f.due_date,
            status=f.status or "pending",
            created_at=f.created_at
        )
        for f in notes
    ]

@router.patch("/follow-ups/{note_id}/complete")
def complete_follow_up(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent)
):
    note = db.query(FollowUpNote).filter(FollowUpNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Follow up note not found")
    note.status = "completed"
    db.commit()
    return {"message": "Follow up marked as completed", "id": note_id}

@router.get("/{id}", response_model=LeadResponse)
def get_lead_by_id(
    id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent)
):
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # If agent, verify ownership
    if current_user.role == "agent" and lead.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access leads assigned to your agent account")
    return _format_lead_response(lead, db)

@router.put("/{id}", response_model=LeadResponse)
def update_lead(
    id: int,
    lead_update: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent)
):
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role == "agent" and lead.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update leads assigned to you")

    data = lead_update.dict(exclude_unset=True)
    for field, val in data.items():
        setattr(lead, field, val)
        
    db.commit()
    db.refresh(lead)
    return _format_lead_response(lead, db)

@router.patch("/{id}/assign", response_model=LeadResponse)
def assign_lead(
    id: int,
    assign_in: LeadAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager)
):
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    agent = db.query(User).filter(User.id == assign_in.agent_id).first()
    if not agent:
        raise HTTPException(status_code=400, detail="Target agent not found")
        
    lead.user_id = agent.id
    lead.last_interaction = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return _format_lead_response(lead, db)

@router.post("/{id}/follow-ups", response_model=FollowUpResponse)
def add_follow_up(
    id: int,
    follow_up_in: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent)
):
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role == "agent" and lead.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add notes to your assigned leads")
    
    # If due_date not provided, default to tomorrow
    due = follow_up_in.due_date or datetime.utcnow()

    note = FollowUpNote(
        lead_id=lead.id,
        agent_id=current_user.id,
        agent_name=current_user.full_name,
        note=follow_up_in.note,
        due_date=due,
        status="pending"
    )
    db.add(note)
    lead.last_interaction = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return FollowUpResponse(
        id=note.id,
        lead_id=note.lead_id,
        agent_id=note.agent_id,
        agent_name=note.agent_name,
        note=note.note,
        due_date=note.due_date,
        status=note.status or "pending",
        created_at=note.created_at
    )
