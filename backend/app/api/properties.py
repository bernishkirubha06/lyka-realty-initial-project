import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional, List

from backend.app.database import get_db
from backend.app.models.property import Property
from backend.app.models.user import User
from backend.app.schemas.property import (
    PropertyResponse,
    PropertyListResponse,
    PropertyCreate,
    PropertyUpdate
)
from backend.app.services.auth.auth_service import get_current_agent

router = APIRouter(prefix="/properties", tags=["Properties"])

def _format_property_response(p: Property) -> PropertyResponse:
    parsed_amenities = []
    try:
        parsed_amenities = json.loads(p.amenities or "[]")
    except Exception:
        parsed_amenities = []

    return PropertyResponse(
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

@router.get("", response_model=PropertyListResponse)
def list_properties(
    city: Optional[str] = Query(None),
    locality: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    bhk: Optional[int] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_area: Optional[float] = Query(None),
    max_area: Optional[float] = Query(None),
    furnishing: Optional[str] = Query(None),
    parking: Optional[bool] = Query(None),
    is_dataset_record: Optional[bool] = Query(None),
    sort: Optional[str] = Query("newest"), # newest, price_asc, price_desc, area_desc
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(Property)

    if city:
        q = q.filter(Property.city.ilike(f"%{city}%"))
    if locality:
        q = q.filter(Property.locality.ilike(f"%{locality}%"))
    if property_type:
        q = q.filter(Property.property_type.ilike(f"%{property_type}%"))
    if bhk is not None:
        q = q.filter(Property.bhk == bhk)
    if min_price is not None:
        q = q.filter(Property.price >= min_price)
    if max_price is not None:
        q = q.filter(Property.price <= max_price)
    if min_area is not None:
        q = q.filter(Property.super_area_sqft >= min_area)
    if max_area is not None:
        q = q.filter(Property.super_area_sqft <= max_area)
    if furnishing:
        q = q.filter(Property.furnishing_status.ilike(f"%{furnishing}%"))
    if parking is not None:
        q = q.filter(Property.parking == parking)
    if is_dataset_record is not None:
        q = q.filter(Property.is_dataset_record == is_dataset_record)

    # Sorting
    if sort == "price_asc":
        q = q.order_by(asc(Property.price))
    elif sort == "price_desc":
        q = q.order_by(desc(Property.price))
    elif sort == "area_desc":
        q = q.order_by(desc(Property.super_area_sqft))
    else: # newest or default
        q = q.order_by(desc(Property.id))

    total = q.count()
    offset = (page - 1) * page_size
    items = q.offset(offset).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size

    return PropertyListResponse(
        items=[_format_property_response(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{id}", response_model=PropertyResponse)
def get_property(id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return _format_property_response(prop)

from backend.app.services.auth.auth_service import get_current_admin

@router.post("", response_model=PropertyResponse)
def create_property(
    prop_in: PropertyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    new_prop = Property(**prop_in.dict())
    if not new_prop.price_per_sqft and new_prop.super_area_sqft > 0:
        new_prop.price_per_sqft = round(new_prop.price / new_prop.super_area_sqft, 2)
    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)
    return _format_property_response(new_prop)

@router.put("/{id}", response_model=PropertyResponse)
def update_property(
    id: int,
    prop_in: PropertyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = prop_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prop, field, val)
        
    if prop.super_area_sqft > 0:
        prop.price_per_sqft = round(prop.price / prop.super_area_sqft, 2)
        
    db.commit()
    db.refresh(prop)
    return _format_property_response(prop)

@router.delete("/{id}")
def delete_property(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    prop = db.query(Property).filter(Property.id == id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    db.delete(prop)
    db.commit()
    return {"message": "Property deleted successfully", "id": id}
