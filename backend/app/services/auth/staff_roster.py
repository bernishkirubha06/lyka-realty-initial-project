"""
Centralized Staff Roster & Authorization Rules for Lyka Realty.
Strict Security Rule:
- ONLY official corporate email addresses are allowed.
- Mock emails (agent@, agent2@, manager@, admin@) are STRICTLY RESTRICTED AND DISALLOWED.
- Exactly 12 Authorized Sales Persons.
- Exactly 1 Authorized Sales Manager.
- Exactly 1 Authorized System Administrator.
"""

from typing import Dict, List, Optional

# Mock emails that must be actively blocked and rejected
DISALLOWED_MOCK_EMAILS = {
    "agent@lykarealty.ae",
    "agent2@lykarealty.ae",
    "manager@lykarealty.ae",
    "admin@lykarealty.ae",
    "customer@lykarealty.ae"
}

# Exactly 12 authorized Sales Person profiles (ONLY official corporate emails)
APPROVED_SALES_PERSONS: List[Dict[str, str]] = [
    {
        "email": "rajesh.sharma@lykarealty.ae",
        "name": "Rajesh Sharma",
        "title": "Senior Sales Consultant",
        "specialty": "Downtown Dubai & Business Bay",
        "phone": "+971 50 234 5671"
    },
    {
        "email": "sarah.jenkins@lykarealty.ae",
        "name": "Sarah Jenkins",
        "title": "Luxury Property Specialist",
        "specialty": "Palm Jumeirah & Waterfront Residences",
        "phone": "+971 50 345 6782"
    },
    {
        "email": "tariq.mansoor@lykarealty.ae",
        "name": "Tariq Mansoor",
        "title": "Prime Residential Consultant",
        "specialty": "Dubai Marina & JBR Beachfront",
        "phone": "+971 50 456 7893"
    },
    {
        "email": "ananya.subramanian@lykarealty.ae",
        "name": "Ananya Subramanian",
        "title": "Off-Plan & Investment Advisor",
        "specialty": "Dubai Hills Estate & Emaar South",
        "phone": "+971 50 567 8904"
    },
    {
        "email": "omar.farooq@lykarealty.ae",
        "name": "Omar Farooq",
        "title": "Commercial & Luxury Villa Specialist",
        "specialty": "Emirates Hills & Jumeirah Islands",
        "phone": "+971 50 678 9015"
    },
    {
        "email": "priya.nair@lykarealty.ae",
        "name": "Priya Nair",
        "title": "High-Net-Worth Portfolio Advisor",
        "specialty": "Dubai Creek Harbour & MBR City",
        "phone": "+971 50 789 0126"
    },
    {
        "email": "elena.rostova@lykarealty.ae",
        "name": "Elena Rostova",
        "title": "European Investor Relations Desk",
        "specialty": "Ultra-Luxury Penthouses & Jumeirah Bay",
        "phone": "+971 50 890 1237"
    },
    {
        "email": "hassan.alzaabi@lykarealty.ae",
        "name": "Hassan Al-Zaabi",
        "title": "VIP Client Relations Director",
        "specialty": "Private Mansions & Palm Jumeirah Signature Villas",
        "phone": "+971 50 901 2348"
    },
    {
        "email": "david.miller@lykarealty.ae",
        "name": "David Miller",
        "title": "Penthouse & Prime Architecture Consultant",
        "specialty": "DIFC & Downtown High-Rise Residences",
        "phone": "+971 50 012 3459"
    },
    {
        "email": "zainab.rashid@lykarealty.ae",
        "name": "Zainab Rashid",
        "title": "Waterfront & Island Residences Expert",
        "specialty": "Bluewaters Island & Pearl Jumeira",
        "phone": "+971 50 123 4560"
    },
    {
        "email": "marcus.vance@lykarealty.ae",
        "name": "Marcus Vance",
        "title": "Senior Investment Strategist",
        "specialty": "Arabian Ranches & Tilal Al Ghaf Family Communities",
        "phone": "+971 50 234 5670"
    },
    {
        "email": "chloe.dubois@lykarealty.ae",
        "name": "Chloe Dubois",
        "title": "French & Mediterranean Investor Relations",
        "specialty": "City Walk, La Mer & Nikki Beach Residences",
        "phone": "+971 50 345 6781"
    }
]

# Exactly 1 authorized Sales Manager profile
APPROVED_SALES_MANAGER: Dict[str, str] = {
    "email": "fatima.alzaabi@lykarealty.ae",
    "name": "Fatima Al-Zaabi",
    "title": "Head of Sales & Sales Manager",
    "specialty": "All UAE Sales Operations & Team Leadership",
    "phone": "+971 50 112 3456"
}

# Exactly 1 authorized System Administrator profile
APPROVED_ADMIN: Dict[str, str] = {
    "email": "alexander.vance@lykarealty.ae",
    "name": "Alexander Vance",
    "title": "Managing Director & Principal Administrator",
    "specialty": "Executive Management, IT Infrastructure & System Audit",
    "phone": "+971 50 998 7766"
}

# Sets of official allowed emails
ALLOWED_SALES_EMAILS = {sp["email"].lower() for sp in APPROVED_SALES_PERSONS}
ALLOWED_MANAGER_EMAILS = {APPROVED_SALES_MANAGER["email"].lower()}
ALLOWED_ADMIN_EMAILS = {APPROVED_ADMIN["email"].lower()}

def is_email_authorized_for_role(email: str, role: str) -> bool:
    """
    Check if a given email is strictly authorized for the requested staff role.
    Mock emails are explicitly rejected.
    """
    if not email:
        return False
    clean = email.strip().lower()
    
    # Reject mock emails
    if clean in DISALLOWED_MOCK_EMAILS:
        return False

    role_clean = (role or "").strip().lower()

    if role_clean == "agent":
        return clean in ALLOWED_SALES_EMAILS
    elif role_clean == "manager":
        return clean in ALLOWED_MANAGER_EMAILS
    elif role_clean == "admin":
        return clean in ALLOWED_ADMIN_EMAILS
    elif role_clean == "customer":
        # Customers can have any email EXCEPT staff emails or mock emails
        if clean in ALLOWED_SALES_EMAILS or clean in ALLOWED_MANAGER_EMAILS or clean in ALLOWED_ADMIN_EMAILS:
            return False
        return clean not in DISALLOWED_MOCK_EMAILS
    return False

def get_authorized_staff_info(email: str) -> Optional[Dict[str, str]]:
    """
    Look up staff member details by official email.
    """
    if not email:
        return None
    clean = email.strip().lower()
    
    if clean in DISALLOWED_MOCK_EMAILS:
        return None

    # Check Admin
    if clean in ALLOWED_ADMIN_EMAILS:
        return {**APPROVED_ADMIN, "role": "admin"}
        
    # Check Manager
    if clean in ALLOWED_MANAGER_EMAILS:
        return {**APPROVED_SALES_MANAGER, "role": "manager"}
        
    # Check 12 Sales Persons
    for sp in APPROVED_SALES_PERSONS:
        if clean == sp["email"].lower():
            return {**sp, "role": "agent"}
            
    return None
