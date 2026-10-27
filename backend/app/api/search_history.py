import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.database import get_db
from app.models.search_history import SearchHistory
from app.models.property import Property
from app.models.user import User
from app.schemas.search_history import SearchHistoryCreate, SearchHistoryResponse
from app.schemas.property import PropertyResponse
from app.services.auth.auth_service import get_current_user_optional
from app.utils.timezone import get_dubai_now, to_dubai_time

router = APIRouter(prefix="/search-history", tags=["Search History"])

def _format_property_response(p: Property) -> PropertyResponse:
    parsed_amenities = []
    try:
        parsed_amenities = json.loads(p.amenities or "[]")
    except Exception:
        pass

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

@router.post("", response_model=SearchHistoryResponse)
def record_search(
    item_in: SearchHistoryCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    entry = None
    if user:
        if item_in.property_id:
            entry = db.query(SearchHistory).filter(
                SearchHistory.user_id == user.id,
                SearchHistory.property_id == item_in.property_id
            ).first()
        elif item_in.search_query:
            entry = db.query(SearchHistory).filter(
                SearchHistory.user_id == user.id,
                SearchHistory.search_query == item_in.search_query
            ).first()

    now = get_dubai_now()
    if entry:
        entry.visit_count = (entry.visit_count or 1) + 1
        entry.created_at = now
        if item_in.property_title:
            entry.property_title = item_in.property_title
        if item_in.locality:
            entry.locality = item_in.locality
        if item_in.bhk is not None:
            entry.bhk = item_in.bhk
        if item_in.price is not None:
            entry.price = item_in.price
        db.commit()
        db.refresh(entry)
    else:
        entry = SearchHistory(
            user_id=user.id if user else None,
            property_id=item_in.property_id,
            property_title=item_in.property_title,
            search_query=item_in.search_query,
            locality=item_in.locality,
            bhk=item_in.bhk,
            price=item_in.price,
            visit_count=1,
            created_at=now
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

    prop_res = None
    if entry.property_id:
        prop = db.query(Property).filter(Property.id == entry.property_id).first()
        if prop:
            prop_res = _format_property_response(prop)
    elif entry.locality or entry.search_query:
        query_term = entry.locality or entry.search_query
        matching_prop = db.query(Property).filter(Property.locality.ilike(f"%{query_term}%")).first()
        if matching_prop:
            prop_res = _format_property_response(matching_prop)

    return SearchHistoryResponse(
        id=entry.id,
        user_id=entry.user_id,
        property_id=entry.property_id,
        property_title=entry.property_title,
        search_query=entry.search_query,
        locality=entry.locality,
        bhk=entry.bhk,
        price=entry.price,
        visit_count=entry.visit_count or 1,
        created_at=to_dubai_time(entry.created_at),
        property=prop_res,
        ai_recommendations=[]
    )

@router.get("", response_model=List[SearchHistoryResponse])
def get_search_history(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    if not user:
        return []

    entries = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user.id)
        .order_by(desc(SearchHistory.created_at))
        .all()
    )

    # De-duplicate and aggregate visit_count
    deduped = {}
    for e in entries:
        key = f"prop_{e.property_id}" if e.property_id else f"query_{e.search_query or e.locality or e.id}"
        if key not in deduped:
            deduped[key] = {
                "entry": e,
                "visit_count": e.visit_count or 1,
                "created_at": e.created_at
            }
        else:
            deduped[key]["visit_count"] += (e.visit_count or 1)
            if e.created_at > deduped[key]["created_at"]:
                deduped[key]["created_at"] = e.created_at

    results = []
    for item in deduped.values():
        e = item["entry"]
        v_count = item["visit_count"]
        c_time = to_dubai_time(item["created_at"])

        prop_res = None
        if e.property_id:
            prop = db.query(Property).filter(Property.id == e.property_id).first()
            if prop:
                prop_res = _format_property_response(prop)
        elif e.locality or e.search_query:
            query_term = e.locality or e.search_query
            matching_prop = db.query(Property).filter(Property.locality.ilike(f"%{query_term}%")).first()
            if matching_prop:
                prop_res = _format_property_response(matching_prop)

        results.append(
            SearchHistoryResponse(
                id=e.id,
                user_id=e.user_id,
                property_id=e.property_id,
                property_title=e.property_title,
                search_query=e.search_query,
                locality=e.locality,
                bhk=e.bhk,
                price=e.price,
                visit_count=v_count,
                created_at=c_time,
                property=prop_res,
                ai_recommendations=[]
            )
        )

    results.sort(key=lambda x: x.created_at, reverse=True)
    return results[:15]
