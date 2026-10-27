from typing import Dict, Any, List
from app.schemas.lead import LeadRequirements, LeadScoreBreakdown

def calculate_lead_score(req: LeadRequirements, interaction_count: int = 1) -> LeadScoreBreakdown:
    """
    Transparent Rule-Based Scoring according to FR-04:
    - Budget provided: 20 pts
    - Preferred location provided: 20 pts
    - Property type or bedroom requirement provided: 15 pts
    - Buying/renting intent confirmed: 15 pts
    - Timeline within 30 days: 20 pts (31-90 days: 15 pts, >90 days: 5 pts, unknown: 0 pts)
    - Essential preferences specified: 10 pts
    Total: 100 pts
    High Priority: 70-100, Medium Priority: 40-69, Low Priority: 0-39
    """
    factors: Dict[str, int] = {}
    
    # 1. Budget provided (20 pts)
    if req.budget_min is not None or req.budget_max is not None:
        factors["budget_provided"] = 20
    else:
        factors["budget_provided"] = 0

    # 2. Preferred location provided (20 pts)
    if req.locality:
        factors["location_provided"] = 20
    elif req.city and req.city.lower() != "dubai":
        factors["location_provided"] = 10
    else:
        factors["location_provided"] = 0

    # 3. Property type or bedroom requirement provided (15 pts)
    if req.bhk is not None or (req.property_type and req.property_type.lower() != "apartment"):
        factors["property_or_bedroom"] = 15
    elif req.property_type:
        factors["property_or_bedroom"] = 15
    else:
        factors["property_or_bedroom"] = 0

    # 4. Buying/renting intent confirmed (15 pts)
    if req.lead_type in ["Buyer", "Renter", "Investor", "Seller"]:
        factors["intent_confirmed"] = 15
    else:
        factors["intent_confirmed"] = 0

    # 5. Purchase timeline (max 20 pts)
    timeline_str = (req.purchase_timeline or "").lower()
    if any(k in timeline_str for k in ["30 days", "immediately", "asap", "urgent", "1 month", "ready"]):
        factors["timeline"] = 20
    elif any(k in timeline_str for k in ["2 month", "3 month", "90 days", "within 3 months"]):
        factors["timeline"] = 15
    elif req.purchase_timeline:
        factors["timeline"] = 5
    else:
        factors["timeline"] = 0

    # 6. Essential preferences specified (10 pts)
    if req.preferred_features and len(req.preferred_features) > 0:
        factors["essential_preferences"] = 10
    else:
        factors["essential_preferences"] = 0

    total = sum(factors.values())
    total = max(0, min(100, total))

    # Classification according to FR-04:
    # High Priority: 70–100, Medium Priority: 40–69, Low Priority: 0–39
    if total >= 70:
        category = "HIGH"
        badge = "🔥 HIGH PRIORITY"
        budget_disp = f" ({req.currency} {req.budget_max:,.0f})" if req.budget_max else ""
        explanation = f"High priority client ready for immediate consultation. Stated budget{budget_disp}, target location ({req.locality or 'Dubai'}), and high intent readiness."
    elif total >= 40:
        category = "MEDIUM"
        badge = "⚡ MEDIUM PRIORITY"
        explanation = f"Medium priority client with active engagement. Further clarification on pending requirements will advance their pipeline readiness."
    else:
        category = "LOW"
        badge = "❄️ LOW PRIORITY"
        explanation = "Early exploratory stage. Essential parameters such as target budget, specific community, or move-in timeline remain unconfirmed."

    return LeadScoreBreakdown(
        total_score=total,
        category=category,
        badge=badge,
        explanation=explanation,
        factors=factors
    )

def generate_ai_lead_summary(req: LeadRequirements, score: LeadScoreBreakdown) -> str:
    """
    Generates a concise CRM summary card for real estate agents.
    """
    loc = req.locality or req.city or "Dubai"
    bhk_str = f"{req.bhk} BHK " if req.bhk is not None else ""
    ptype = req.property_type or "property"
    timeline_str = f"within {req.purchase_timeline}" if req.purchase_timeline else "exploring options"
    
    budget_str = "unspecified budget"
    if req.budget_min and req.budget_max:
        budget_str = f"a budget of {req.currency} {req.budget_min:,.0f} – {req.budget_max:,.0f}"
    elif req.budget_max:
        budget_str = f"a budget up to {req.currency} {req.budget_max:,.0f}"
        
    features_str = ""
    if req.preferred_features:
        features_str = f" They prefer {', '.join(req.preferred_features)}."

    intent_str = "Customer has demonstrated strong, qualified buying intent." if score.category == "HOT" else "Customer is currently evaluating inventory."

    return f"Customer is looking for a {bhk_str}{ptype} in {loc} with {budget_str}. Target timeline is {timeline_str}.{features_str} {intent_str}"
