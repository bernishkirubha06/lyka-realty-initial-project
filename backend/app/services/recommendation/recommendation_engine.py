import json
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.property import Property
from app.schemas.lead import LeadRequirements, RecommendationItem
from app.schemas.property import PropertyResponse

def calculate_property_match(prop: Property, req: LeadRequirements) -> Tuple[int, List[str], Dict[str, float]]:
    """
    Computes a weighted match score between 0 and 100 with clear explainability reasons.
    Weights:
    - Budget: 30%
    - Location: 20%
    - Property type: 15%
    - BHK: 10%
    - Area/Quality: 10%
    - Amenities: 5%
    - Metro/Landmark: 5%
    - Availability/Timeline: 5%
    """
    score = 0.0
    reasons: List[str] = []
    breakdown = {}

    # 1. Budget Compatibility (30 points)
    budget_pts = 0.0
    if req.budget_min and req.budget_max:
        mid_budget = (req.budget_min + req.budget_max) / 2
        if req.budget_min <= prop.price <= req.budget_max:
            budget_pts = 30.0
            reasons.append(f"Within requested budget of {prop.currency} {prop.price:,.0f}")
        elif prop.price < req.budget_min and prop.price >= req.budget_min * 0.8:
            budget_pts = 26.0
            reasons.append(f"Priced lower than minimum budget ({prop.currency} {prop.price:,.0f})")
        elif prop.price > req.budget_max and prop.price <= req.budget_max * 1.2:
            budget_pts = 18.0
            reasons.append(f"Slightly above preferred maximum but high value ({prop.currency} {prop.price:,.0f})")
        else:
            diff = abs(prop.price - mid_budget) / mid_budget
            budget_pts = max(5.0, 30.0 * max(0.0, 1.0 - diff))
    elif req.budget_max:
        if prop.price <= req.budget_max:
            budget_pts = 30.0
            reasons.append(f"Within budget ceiling of {prop.currency} {req.budget_max:,.0f}")
        elif prop.price <= req.budget_max * 1.15:
            budget_pts = 20.0
        else:
            budget_pts = 8.0
    else:
        # No budget specified, grant baseline compatibility
        budget_pts = 25.0

    score += budget_pts
    breakdown["budget"] = budget_pts

    # 2. Location Compatibility (20 points)
    loc_pts = 0.0
    if req.locality:
        if req.locality.lower() in prop.locality.lower() or prop.locality.lower() in req.locality.lower():
            loc_pts = 20.0
            reasons.append(f"Located directly in {prop.locality}")
        else:
            loc_pts = 5.0
    elif req.city:
        if req.city.lower() in prop.city.lower():
            loc_pts = 18.0
            reasons.append(f"Prime location in {prop.city}")
        else:
            loc_pts = 5.0
    else:
        loc_pts = 16.0
    score += loc_pts
    breakdown["location"] = loc_pts

    # 3. Property Type (15 points)
    type_pts = 0.0
    if req.property_type:
        if req.property_type.lower() == prop.property_type.lower():
            type_pts = 15.0
            reasons.append(f"Matches preferred property type ({prop.property_type})")
        else:
            type_pts = 6.0
    else:
        type_pts = 12.0
    score += type_pts
    breakdown["property_type"] = type_pts

    # 4. BHK / Bedrooms (10 points)
    bhk_pts = 0.0
    if req.bhk is not None:
        if prop.bhk == req.bhk:
            bhk_pts = 10.0
            reasons.append(f"Exact {prop.bhk} BHK layout match")
        elif abs(prop.bhk - req.bhk) == 1:
            bhk_pts = 5.0
            reasons.append(f"{prop.bhk} BHK close alternative")
        else:
            bhk_pts = 2.0
    else:
        bhk_pts = 8.0
    score += bhk_pts
    breakdown["bhk"] = bhk_pts

    # 5. Area / Quality (10 points)
    area_pts = 8.0
    if prop.super_area_sqft >= 1200:
        area_pts = 10.0
        reasons.append(f"Spacious layout ({int(prop.super_area_sqft):,} sqft)")
    score += area_pts
    breakdown["area"] = area_pts

    # 6. Preferred Amenities & Features (5 points)
    amenity_pts = 0.0
    try:
        prop_amenities = [a.lower() for a in json.loads(prop.amenities or "[]")]
    except Exception:
        prop_amenities = []

    matched_features = []
    for feat in (req.preferred_features or []):
        feat_l = feat.lower()
        if "pool" in feat_l and any("pool" in a for a in prop_amenities):
            matched_features.append("swimming pool")
        elif "gym" in feat_l and any("gym" in a for a in prop_amenities):
            matched_features.append("fitness gym")
        elif "sea" in feat_l or "water" in feat_l:
            if "water" in (prop.view_type or "").lower() or any("water" in a or "sea" in a for a in prop_amenities):
                matched_features.append("water/sea view")
        elif "balcony" in feat_l and any("balcony" in a for a in prop_amenities):
            matched_features.append("private balcony")
        elif "parking" in feat_l and prop.parking:
            matched_features.append("dedicated parking")

    if matched_features:
        amenity_pts = 5.0
        reasons.append(f"Features: {', '.join(matched_features[:2])}")
    elif req.preferred_features:
        amenity_pts = 2.5
    else:
        amenity_pts = 4.0
    score += amenity_pts
    breakdown["amenities"] = amenity_pts

    # 7. Metro / Accessibility (5 points)
    metro_pts = 0.0
    if any("metro" in (f or "").lower() for f in (req.preferred_features or [])):
        if prop.distance_to_metro_km <= 1.5:
            metro_pts = 5.0
            reasons.append(f"Close to metro station ({prop.distance_to_metro_km} km)")
        else:
            metro_pts = 2.0
    else:
        metro_pts = 4.0
    score += metro_pts
    breakdown["metro"] = metro_pts

    # 8. Availability & Timeline (5 points)
    avail_pts = 5.0
    if req.purchase_timeline and "immediate" in req.purchase_timeline.lower():
        if "ready" in (prop.availability or "").lower():
            reasons.append("Ready for immediate handover")
            avail_pts = 5.0
        else:
            avail_pts = 2.0
    score += avail_pts
    breakdown["timeline"] = avail_pts

    final_score = int(round(min(100.0, max(10.0, score))))
    
    # Ensure at least 2 distinct reasons
    if len(reasons) < 2:
        if prop.parking:
            reasons.append("Dedicated covered parking included")
        if prop.quality == "High":
            reasons.append("Luxury tier finishing and high quality standards")

    return final_score, reasons, breakdown

def get_recommendations_for_requirements(
    db: Session,
    req: LeadRequirements,
    limit: int = 5
) -> Tuple[List[RecommendationItem], bool]:
    # Only produce recommendations if the user has provided at least one meaningful search criteria
    has_criteria = bool(
        (req.locality and req.locality.strip()) 
        or req.budget_max is not None 
        or req.budget_min is not None 
        or req.bhk is not None 
        or (req.preferred_features and len(req.preferred_features) > 0)
        or (req.property_type and req.property_type.lower() not in ["apartment", ""])
    )
    if not has_criteria:
        return [], False

    query = db.query(Property)
    
    # City filter
    if req.city:
        query = query.filter(Property.city.ilike(f"%{req.city}%"))

    # Initial candidate set
    candidates = query.all()
    if not candidates:
        # Fallback to all properties regardless of city filter
        candidates = db.query(Property).limit(100).all()

    scored_items: List[Tuple[int, Property, List[str]]] = []
    for prop in candidates:
        score, reasons, _ = calculate_property_match(prop, req)
        scored_items.append((score, prop, reasons))

    # Sort descending by match score
    scored_items.sort(key=lambda x: x[0], reverse=True)
    top_candidates = scored_items[:limit]

    # Check if we have strong matches
    has_exact = any(item[0] >= 75 for item in top_candidates) if top_candidates else False

    results: List[RecommendationItem] = []
    for score, prop, reasons in top_candidates:
        parsed_amenities = []
        try:
            parsed_amenities = json.loads(prop.amenities or "[]")
        except Exception:
            pass
            
        prop_res = PropertyResponse(
            id=prop.id,
            title=prop.title,
            description=prop.description,
            city=prop.city,
            locality=prop.locality,
            property_type=prop.property_type,
            bhk=prop.bhk,
            bathrooms=prop.bathrooms,
            super_area_sqft=prop.super_area_sqft,
            carpet_area_sqft=prop.carpet_area_sqft,
            price=prop.price,
            currency=prop.currency,
            price_per_sqft=prop.price_per_sqft,
            floor_number=prop.floor_number,
            total_floors=prop.total_floors,
            property_age=prop.property_age,
            furnishing_status=prop.furnishing_status,
            parking=prop.parking,
            lift_available=prop.lift_available,
            gated_community=prop.gated_community,
            distance_to_metro_km=prop.distance_to_metro_km,
            distance_to_city_center_km=prop.distance_to_city_center_km,
            amenities=prop.amenities,
            parsed_amenities=parsed_amenities,
            latitude=prop.latitude,
            longitude=prop.longitude,
            image_url=prop.image_url,
            availability=prop.availability,
            quality=prop.quality,
            view_type=prop.view_type,
            is_dataset_record=prop.is_dataset_record,
            created_at=prop.created_at
        )
        results.append(RecommendationItem(
            property=prop_res,
            match_score=score,
            reasons=reasons
        ))

    return results, has_exact
