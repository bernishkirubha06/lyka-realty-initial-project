import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from backend.app.database import get_db
from backend.app.models.saved_property import SavedProperty
from backend.app.models.property import Property
from backend.app.models.user import User
from backend.app.schemas.property import PropertyResponse
from backend.app.services.auth.auth_service import get_current_user_optional

router = APIRouter(prefix="/saved-properties", tags=["Saved Properties"])

@router.get("", response_model=List[PropertyResponse])
def get_saved_properties(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else 1 # fallback demo user
    saved = db.query(Property).join(SavedProperty, SavedProperty.property_id == Property.id).filter(SavedProperty.user_id == user_id).order_by(desc(SavedProperty.created_at)).all()
    
    results = []
    for p in saved:
        parsed_amenities = []
        try:
            parsed_amenities = json.loads(p.amenities or "[]")
        except Exception:
            pass
            
        results.append(PropertyResponse(
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
        ))
    return results

@router.post("/{property_id}")
def toggle_saved_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else 1 # fallback demo user
    existing = db.query(SavedProperty).filter(
        SavedProperty.user_id == user_id,
        SavedProperty.property_id == property_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"saved": False, "property_id": property_id}
    else:
        new_fav = SavedProperty(user_id=user_id, property_id=property_id)
        db.add(new_fav)
        db.commit()
        return {"saved": True, "property_id": property_id}
