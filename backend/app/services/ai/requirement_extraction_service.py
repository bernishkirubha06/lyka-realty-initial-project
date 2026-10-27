import re
import json
from typing import Dict, Any, Optional, Tuple, List
from backend.app.schemas.lead import LeadRequirements

# Known localities in Dubai & Chennai
KNOWN_LOCALITIES = [
    # Dubai Prime Communities (from dataset & Lyka Realty portfolio)
    "Downtown Dubai", "Downtown", "Dubai Marina", "Marina", "Palm Jumeirah", "The Palm",
    "Business Bay", "Jumeirah Lake Towers", "JLT", "Jumeirah Beach Residence", "JBR",
    "Dubai Hills Estate", "Dubai Hills", "Jumeirah Village Circle", "JVC",
    "Culture Village", "The Views", "Jumeirah", "DIFC", "City Walk", "Damac Hills",
    "Meydan", "MBR City", "Creek Harbour", "Bluewaters Island"
]

PROPERTY_TYPES = [
    ("penthouse", "Penthouse"),
    ("villa", "Villa"),
    ("townhouse", "Townhouse"),
    ("studio", "Studio"),
    ("apartment", "Apartment"),
    ("flat", "Apartment"),
    ("condo", "Apartment")
]

TIMELINES = [
    (r"immediate(ly)?|ready|urgent|asap|now", "Immediately (Within 30 days)"),
    (r"(within\s*)?1\s*month", "Within 1 month"),
    (r"(within\s*)?2\s*months?", "Within 2 months"),
    (r"(within\s*)?3\s*months?", "Within 3 months"),
    (r"(within\s*)?4\s*months?", "Within 4 months"),
    (r"(within\s*)?5\s*months?", "Within 5 months"),
    (r"(within\s*)?6\s*months?", "Within 6 months"),
    (r"(within\s*)?1\s*year|12\s*months?", "Within 1 year"),
    (r"next\s*year|investing\s*later", "More than 6 months")
]

FEATURE_KEYWORDS = [
    ("metro", "near metro"),
    ("subway", "near metro"),
    ("train", "near metro"),
    ("it park", "near IT park"),
    ("tech park", "near IT park"),
    ("sea view", "sea/water view"),
    ("water view", "sea/water view"),
    ("marina view", "marina view"),
    ("burj", "view of landmark"),
    ("landmark", "view of landmark"),
    ("pool", "swimming pool"),
    ("private pool", "private pool"),
    ("gym", "gym/fitness center"),
    ("balcony", "balcony"),
    ("maid", "maid room"),
    ("parking", "covered parking"),
    ("garage", "covered parking"),
    ("pet", "pets allowed"),
    ("gated", "gated community"),
    ("furnished", "furnished"),
    ("unfurnished", "unfurnished"),
    ("garden", "private garden"),
    ("jacuzzi", "jacuzzi"),
    ("vastu", "vastu compliant")
]

def parse_price_value(text: str) -> Tuple[Optional[float], Optional[float], str]:
    """
    Parses currency amounts from text.
    Handles:
    - AED: "AED 1.2 million", "1.2M AED", "1.2 million", "2.5M", "AED 1,200,000", "800k AED", "1.2 to 1.5 million"
    - INR: "60 lakhs", "1.2 crores", "80L", "70-90 lakhs"
    Returns (budget_min, budget_max, currency)
    """
    cleaned = text.lower()
    currency = "AED" # default for Lyka Realty & Dubai dataset
    
    if "inr" in cleaned or "rupee" in cleaned or "₹" in cleaned:
        currency = "INR"
    elif "aed" in cleaned or "dirham" in cleaned:
        currency = "AED"
    
    # 1. Range like "70 to 90 lakhs", "1.2 to 1.5 million", "1.2m - 1.5m"
    range_match = re.search(r'(?:budget\s*(?:of|is)?\s*)?(?:aed|inr|rs\.?|₹|\$)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|m|million|k)?\s*(?:to|-)\s*(?:aed|inr|rs\.?|₹|\$)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|m|million|k)?', cleaned)
    if range_match:
        v1 = float(range_match.group(1))
        unit1 = (range_match.group(2) or "").lower()
        v2 = float(range_match.group(3))
        unit2 = (range_match.group(4) or unit1 or "").lower()
        
        def to_mult(unit: str) -> float:
            if unit in ["lakh", "lac"]: return 100000.0
            if unit in ["crore", "cr"]: return 10000000.0
            if unit in ["m", "million"]: return 1000000.0
            if unit == "k": return 1000.0
            if "million" in cleaned or "m" in cleaned: return 1000000.0
            if "crore" in cleaned: return 10000000.0
            if "lakh" in cleaned or "lac" in cleaned: return 100000.0
            return 1.0

        min_val = min(v1 * to_mult(unit1 or unit2), v2 * to_mult(unit2 or unit1))
        max_val = max(v1 * to_mult(unit1 or unit2), v2 * to_mult(unit2 or unit1))
        return min_val, max_val, currency

    # 2. Single target with units like "AED 1.2 million", "1.2M", "budget is 1.2 million", "under 2.5m"
    single_match = re.search(r'(?:around|approx|under|about|budget\s*(?:of|is)?|near|maximum|max)?\s*(?:aed|inr|rs\.?|₹|\$)?\s*(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|m|million|k)\b', cleaned)
    if single_match:
        val = float(single_match.group(1))
        unit = single_match.group(2).lower()
        
        mult = 1.0
        if unit.startswith("l"):
            mult = 100000.0
            if "aed" not in cleaned and "dirham" not in cleaned:
                currency = "INR"
        elif unit.startswith("cr"):
            mult = 10000000.0
            if "aed" not in cleaned and "dirham" not in cleaned:
                currency = "INR"
        elif unit in ["m", "million"]:
            mult = 1000000.0
        elif unit == "k":
            mult = 1000.0
            
        exact = val * mult
        return exact * 0.85, exact * 1.15, currency

    # 3. Numeric with commas like "1,200,000" or "2,500,000"
    comma_match = re.search(r'(?:budget\s*(?:of|is)?\s*)?(?:aed|inr|rs\.?|₹|\$)?\s*(\d{1,3}(?:,\d{3})+)\b', cleaned)
    if comma_match:
        clean_num = comma_match.group(1).replace(",", "")
        exact = float(clean_num)
        return exact * 0.85, exact * 1.15, currency

    # 4. Direct plain numeric values like "2500000" or "1200000"
    num_match = re.search(r'\b(\d{6,8})\b', cleaned)
    if num_match:
        exact = float(num_match.group(1))
        return exact * 0.85, exact * 1.15, currency

    return None, None, currency

def extract_requirements_from_text(text: str, current: Optional[LeadRequirements] = None) -> LeadRequirements:
    """
    Extracts structured real estate requirements without fabricating missing parameters.
    Merges with existing requirements if provided.
    """
    res = current.dict() if current else LeadRequirements().dict()
    lowered = text.lower()
    
    # 1. Customer Name (e.g., "My name is John Doe", "I am Sarah", "Call me Alex")
    name_match = re.search(r'(?:my name is|call me|myself)\s+([a-zA-Z]{2,}(?:\s+[a-zA-Z]{2,})?)', text, re.IGNORECASE)
    if not name_match:
        # Require capitalized name for "I am / this is" to avoid matching "this is for personal"
        name_match = re.search(r'\b(?:i am|i\'m|this is)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b', text)

    if name_match:
        cand_name = (name_match.group(1) or "").strip()
        stopwords = [
            "looking", "interested", "a buyer", "an investor", "searching", "planning", 
            "a tenant", "writing", "here", "ready", "new", "for", "personal", "living", 
            "investment", "buying", "renting", "just", "calling", "asking", "good", "all"
        ]
        first_word = cand_name.split()[0].lower() if cand_name else ""
        if cand_name and first_word not in stopwords and not any(sw in cand_name.lower() for sw in stopwords[:6]):
            res["customer_name"] = cand_name.title()

    # 2. Email Address
    email_match = re.search(r'\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b', text)
    if email_match:
        res["email"] = email_match.group(1).strip()

    # 3. Phone Number
    phone_match = re.search(r'(?:(?:\+|00)\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b', text)
    if phone_match:
        raw_ph = phone_match.group(0).strip()
        digits = re.sub(r'\D', '', raw_ph)
        if 7 <= len(digits) <= 15:
            res["phone"] = raw_ph

    # 4. Lead Type (Buyer / Renter / Seller / Investor)
    if re.search(r'\b(rent|rental|lease|renting|tenant|to rent)\b', lowered):
        res["lead_type"] = "Renter"
    elif re.search(r'\b(buy|purchase|buying|investor|investing|buyer|to buy)\b', lowered):
        res["lead_type"] = "Buyer"
    elif re.search(r'\b(sell|seller|selling|list my property)\b', lowered):
        res["lead_type"] = "Seller"

    # 5. Purpose (Personal use / Investment)
    if re.search(r'\b(roi|rental yield|investment|invest|capital appreciation|rental return|returns|yield)\b', lowered):
        res["purpose"] = "Investment"
    elif re.search(r'\b(personal|living|family|self|end use|relocating|residence|own stay)\b', lowered):
        res["purpose"] = "Personal use"

    # 6. City & Locality
    if "chennai" in lowered:
        res["city"] = "Chennai"
    elif "dubai" in lowered:
        res["city"] = "Dubai"

    for loc in KNOWN_LOCALITIES:
        pattern = r'\b' + re.escape(loc.lower()) + r'\b'
        if re.search(pattern, lowered):
            # Canonicalize standard locality
            if loc.lower() in ["downtown", "downtown dubai"]:
                res["locality"] = "Downtown Dubai"
                res["city"] = "Dubai"
            elif loc.lower() in ["marina", "dubai marina"]:
                res["locality"] = "Dubai Marina"
                res["city"] = "Dubai"
            elif loc.lower() in ["palm", "palm jumeirah", "the palm"]:
                res["locality"] = "Palm Jumeirah"
                res["city"] = "Dubai"
            elif loc.lower() in ["jlt", "jumeirah lake towers"]:
                res["locality"] = "Jumeirah Lake Towers"
                res["city"] = "Dubai"
            elif loc.lower() in ["jbr", "jumeirah beach residence"]:
                res["locality"] = "Jumeirah Beach Residence"
                res["city"] = "Dubai"
            elif loc.lower() in ["business bay"]:
                res["locality"] = "Business Bay"
                res["city"] = "Dubai"
            elif loc.lower() in ["dubai hills", "dubai hills estate"]:
                res["locality"] = "Dubai Hills Estate"
                res["city"] = "Dubai"
            elif loc.lower() in ["jvc", "jumeirah village circle"]:
                res["locality"] = "Jumeirah Village Circle"
                res["city"] = "Dubai"
            else:
                res["locality"] = loc
            break

    # 7. BHK / Bedrooms
    bhk_match = re.search(r'\b([0-5])[\s-]*(?:bhk|bed(?:room)?s?|br)\b', lowered)
    if bhk_match:
        res["bhk"] = int(bhk_match.group(1))
    elif "studio" in lowered:
        res["bhk"] = 0
        res["property_type"] = "Studio"

    # 8. Property Type
    for keyword, canonical in PROPERTY_TYPES:
        if keyword in lowered:
            res["property_type"] = canonical
            break

    # 9. Budget
    b_min, b_max, curr = parse_price_value(text)
    if b_min is not None and b_max is not None:
        res["budget_min"] = b_min
        res["budget_max"] = b_max
        res["currency"] = curr

    # 10. Purchase Timeline
    for pattern, val in TIMELINES:
        if re.search(pattern, lowered):
            res["purchase_timeline"] = val
            break

    # 11. Preferred Features / Amenities
    existing_feats = set(res.get("preferred_features") or [])
    for keyword, feature in FEATURE_KEYWORDS:
        if keyword in lowered:
            existing_feats.add(feature)
    res["preferred_features"] = list(existing_feats)

    return LeadRequirements(**res)
