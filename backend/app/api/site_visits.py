import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional

from app.database import get_db
from app.models.site_visit import SiteVisit
from app.models.property import Property
from app.models.lead import Lead
from app.models.user import User
from app.schemas.site_visit import SiteVisitCreate, SiteVisitResponse, SiteVisitUpdate
from app.schemas.property import PropertyResponse
from app.services.auth.auth_service import get_current_user_optional, get_current_agent
from app.utils.timezone import to_dubai_time, get_dubai_now

router = APIRouter(prefix="/site-visits", tags=["Site Visits"])

def _format_visit_response(v: SiteVisit, p: Property) -> SiteVisitResponse:
    prop_res = None
    if p:
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

    return SiteVisitResponse(
        id=v.id,
        user_id=v.user_id,
        lead_id=v.lead_id,
        property_id=v.property_id,
        customer_name=v.customer_name,
        contact_phone=v.contact_phone,
        contact_email=v.contact_email,
        preferred_date=v.preferred_date,
        preferred_time=v.preferred_time,
        notes=v.notes,
        status=v.status,
        created_at=to_dubai_time(v.created_at),
        property=prop_res
    )

@router.post("", response_model=SiteVisitResponse)
def request_site_visit(
    visit_in: SiteVisitCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    prop = db.query(Property).filter(Property.id == visit_in.property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Check or link to a Lead so it appears in CRM
    target_lead = None
    if visit_in.lead_id:
        target_lead = db.query(Lead).filter(Lead.id == visit_in.lead_id).first()
    
    if not target_lead and visit_in.contact_phone:
        target_lead = db.query(Lead).filter(Lead.phone == visit_in.contact_phone).first()

    if target_lead:
        target_lead.pipeline_status = "site_visit"
        assigned_agent_id = target_lead.user_id
        db.commit()
    else:
        # Auto-create lead for the VIP visit so it's captured in agent CRM
        fallback_agent = db.query(User).filter(User.role == "agent").first()
        if not fallback_agent:
            fallback_agent = db.query(User).filter(User.role.in_(["agent", "manager", "admin"])).first()
        assigned_agent_id = fallback_agent.id if fallback_agent else None
        
        target_lead = Lead(
            user_id=assigned_agent_id,
            customer_name=visit_in.customer_name or "VIP Client",
            email=visit_in.contact_email,
            phone=visit_in.contact_phone,
            city=prop.city or "Dubai",
            locality=prop.locality,
            property_type=prop.property_type or "Apartment",
            bhk=prop.bhk,
            budget_max=prop.price,
            currency=prop.currency or "AED",
            lead_score=85,
            lead_category="HOT",
            lead_explanation=f"Scheduled VIP site visit for {prop.title}",
            ai_summary=f"Client requested a private property tour for {prop.title} on {visit_in.preferred_date} at {visit_in.preferred_time}.",
            pipeline_status="site_visit"
        )
        db.add(target_lead)
        db.commit()
        db.refresh(target_lead)

    visit_user_id = assigned_agent_id
    if current_user and current_user.role == "client":
        visit_user_id = current_user.id

    new_visit = SiteVisit(
        user_id=visit_user_id,
        lead_id=target_lead.id if target_lead else None,
        property_id=visit_in.property_id,
        customer_name=visit_in.customer_name or (current_user.full_name if current_user else "VIP Client"),
        contact_phone=visit_in.contact_phone or (current_user.phone if current_user else ""),
        contact_email=visit_in.contact_email or (current_user.email if current_user else None),
        preferred_date=visit_in.preferred_date,
        preferred_time=visit_in.preferred_time,
        notes=visit_in.notes,
        status="pending",
        created_at=get_dubai_now()
    )
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)

    return _format_visit_response(new_visit, prop)

@router.get("", response_model=List[SiteVisitResponse])
def get_all_site_visits(
    db: Session = Depends(get_db),
    agent: User = Depends(get_current_agent)
):
    q = db.query(SiteVisit, Property).join(Property, SiteVisit.property_id == Property.id)
    if agent.role == "agent":
        # Agent sees visits assigned to them or their leads, or unassigned pending visits
        q = q.outerjoin(Lead, SiteVisit.lead_id == Lead.id).filter(
            (SiteVisit.user_id == agent.id) | (Lead.user_id == agent.id) | (SiteVisit.user_id == None)
        )
    visits = q.order_by(desc(SiteVisit.created_at)).all()
    return [_format_visit_response(v, p) for v, p in visits]

@router.get("/my-visits", response_model=List[SiteVisitResponse])
def get_user_site_visits(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    if not current_user:
        return []

    conditions = [
        SiteVisit.user_id == current_user.id
    ]
    if current_user.email:
        conditions.append(SiteVisit.contact_email == current_user.email)
    if current_user.phone:
        conditions.append(SiteVisit.contact_phone == current_user.phone)

    visits = (
        db.query(SiteVisit, Property)
        .join(Property, SiteVisit.property_id == Property.id)
        .filter(or_(*conditions))
        .order_by(desc(SiteVisit.created_at))
        .all()
    )
    return [_format_visit_response(v, p) for v, p in visits]

@router.put("/{id}", response_model=SiteVisitResponse)
def update_site_visit(
    id: int,
    visit_update: SiteVisitUpdate,
    db: Session = Depends(get_db),
    agent: User = Depends(get_current_agent)
):
    visit = db.query(SiteVisit).filter(SiteVisit.id == id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
        
    prop = db.query(Property).filter(Property.id == visit.property_id).first()

    data = visit_update.dict(exclude_unset=True)
    for k, v in data.items():
        setattr(visit, k, v)
        
    db.commit()
    db.refresh(visit)
    return _format_visit_response(visit, prop)

@router.post("/{id}/cancel", response_model=SiteVisitResponse)
@router.patch("/{id}/cancel", response_model=SiteVisitResponse)
def cancel_site_visit(
    id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    visit = db.query(SiteVisit).filter(SiteVisit.id == id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")

    prop = db.query(Property).filter(Property.id == visit.property_id).first()

    # Authorization: User who booked or staff
    if user:
        is_owner = (
            visit.user_id == user.id or
            (user.email and visit.contact_email == user.email) or
            (user.phone and visit.contact_phone == user.phone)
        )
        is_staff = user.role in ["agent", "manager", "admin"]
        if not (is_owner or is_staff):
            raise HTTPException(status_code=403, detail="You do not have permission to cancel this visit.")
    
    visit.status = "cancelled"
    db.commit()
    db.refresh(visit)
    return _format_visit_response(visit, prop)
