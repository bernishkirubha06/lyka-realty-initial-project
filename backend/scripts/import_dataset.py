import os
import sys
import re
import json
import random
from typing import Any
import pandas as pd
from sqlalchemy.orm import Session

# Ensure backend package can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.database import engine, SessionLocal, Base
from backend.app.models.user import User
from backend.app.models.property import Property
from backend.app.models.lead import Lead
from backend.app.models.conversation import Conversation, Message
from backend.app.models.recommendation import Recommendation
from backend.app.models.site_visit import SiteVisit
from backend.app.models.saved_property import SavedProperty
from backend.app.services.auth.auth_service import hash_password

# Curated high-resolution architecture images for Dubai & Chennai properties
DUBAI_IMAGES = [
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80", # Luxury villa
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", # Modern residence
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", # Luxury pool villa
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80", # High-rise tower
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80", # Estate
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80", # Luxury interior
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80", # Modern penthouse
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80", # Waterfront balcony
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80", # Stylish flat
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80", # Luxury mansion
]

CHENNAI_IMAGES = [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80",
]

def clean_price(val: Any) -> float:
    if pd.isna(val):
        return 2000000.0
    val_str = str(val).replace("AED", "").replace(",", "").strip()
    try:
        return float(val_str)
    except Exception:
        return 2000000.0

def import_csv_dataset(db: Session, csv_path: str):
    print(f"Reading dataset from {csv_path}...")
    if not os.path.exists(csv_path):
        print(f"Warning: {csv_path} does not exist!")
        return 0

    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} records from CSV.")

    amenity_cols = [
        ("balcony", "Balcony"),
        ("barbecue_area", "Barbecue Area"),
        ("built_in_wardrobes", "Built-in Wardrobes"),
        ("central_ac", "Central A/C"),
        ("childrens_play_area", "Children's Play Area"),
        ("childrens_pool", "Children's Pool"),
        ("concierge", "Concierge Service"),
        ("covered_parking", "Covered Parking"),
        ("kitchen_appliances", "Kitchen Appliances"),
        ("lobby_in_building", "Lobby in Building"),
        ("maid_room", "Maid's Room"),
        ("pets_allowed", "Pets Allowed"),
        ("private_garden", "Private Garden"),
        ("private_gym", "Private Gym"),
        ("private_jacuzzi", "Private Jacuzzi"),
        ("private_pool", "Private Pool"),
        ("security", "24/7 Security"),
        ("shared_gym", "Shared Gym"),
        ("shared_pool", "Shared Swimming Pool"),
        ("shared_spa", "Shared Spa"),
        ("study", "Study Room"),
        ("vastu_compliant", "Vastu Compliant"),
        ("view_of_landmark", "Landmark View"),
        ("view_of_water", "Water View"),
        ("walk_in_closet", "Walk-in Closet"),
    ]

    count = 0
    # Import all records
    for idx, row in df.iterrows():
        price_num = clean_price(row.get("price"))
        sqft = float(row.get("size_in_sqft", 1200)) if not pd.isna(row.get("size_in_sqft")) else 1200.0
        pp_sqft = float(row.get("price_per_sqft", 0)) if not pd.isna(row.get("price_per_sqft")) else round(price_num / max(sqft, 1), 2)
        bhk = int(row.get("no_of_bedrooms", 2)) if not pd.isna(row.get("no_of_bedrooms")) else 2
        baths = int(row.get("no_of_bathrooms", 2)) if not pd.isna(row.get("no_of_bathrooms")) else 2
        neigh = str(row.get("neighborhood", "Downtown Dubai")).strip()
        quality_str = str(row.get("quality", "High")).strip()

        # Extract active amenities
        active_amenities = []
        for col_name, label in amenity_cols:
            if col_name in row and str(row[col_name]).strip().lower() in ["true", "1"]:
                active_amenities.append(label)

        # Property type logic
        if bhk == 0:
            prop_type = "Studio"
            title_prefix = "Executive Studio Suite"
        elif bool(str(row.get("private_garden", "")).lower() == "true") or (sqft > 3500 and bhk >= 4):
            prop_type = "Villa"
            title_prefix = f"Luxury {bhk} Bedroom Signature Villa"
        elif sqft > 3000 and bhk >= 3 and bool(str(row.get("view_of_water", "")).lower() == "true"):
            prop_type = "Penthouse"
            title_prefix = f"Panoramic {bhk} Bedroom Penthouse"
        elif sqft > 2200 and bhk >= 3:
            prop_type = "Townhouse"
            title_prefix = f"Contemporary {bhk} Bedroom Townhouse"
        else:
            prop_type = "Apartment"
            title_prefix = f"Premium {bhk} BHK Luxury Residence"

        view_type = "Water View" if str(row.get("view_of_water", "")).lower() == "true" else (
            "Landmark View" if str(row.get("view_of_landmark", "")).lower() == "true" else "Skyline View"
        )

        furnishing = "Unfurnished" if str(row.get("unfurnished", "")).lower() == "true" else "Furnished"
        has_parking = bool(str(row.get("covered_parking", "true")).lower() == "true")

        lat = float(row.get("latitude")) if not pd.isna(row.get("latitude")) else 25.1972
        lng = float(row.get("longitude")) if not pd.isna(row.get("longitude")) else 55.2744
        img = DUBAI_IMAGES[idx % len(DUBAI_IMAGES)]

        title = f"{title_prefix} at {neigh}"
        desc = (
            f"Exclusively presented by Lyka Realty. An exceptional {bhk} bedroom {prop_type.lower()} "
            f"situated in prime {neigh}, Dubai. Offering {int(sqft):,} sqft of refined living space, "
            f"panoramic {view_type.lower()}, and world-class luxury building amenities."
        )

        p = Property(
            title=title,
            description=desc,
            city="Dubai",
            locality=neigh,
            property_type=prop_type,
            bhk=bhk,
            bathrooms=baths,
            super_area_sqft=sqft,
            carpet_area_sqft=round(sqft * 0.88, 1),
            price=price_num,
            currency="AED",
            price_per_sqft=pp_sqft,
            floor_number=random.randint(2, 38),
            total_floors=random.randint(15, 60),
            property_age=random.randint(0, 6),
            furnishing_status=furnishing,
            parking=has_parking,
            lift_available=True,
            gated_community=True,
            distance_to_metro_km=round(random.uniform(0.4, 2.5), 2),
            distance_to_city_center_km=round(random.uniform(1.0, 8.0), 2),
            amenities=json.dumps(active_amenities),
            latitude=lat,
            longitude=lng,
            image_url=img,
            availability="Ready to Move" if random.random() > 0.25 else "Off-Plan (Handover Soon)",
            quality=quality_str if quality_str in ["High", "Medium", "Ultra-Luxury"] else "High",
            view_type=view_type,
            is_dataset_record=True # Actual CSV record
        )
        db.add(p)
        count += 1
        if count % 200 == 0:
            db.commit()
            print(f"Imported {count} properties...")

    db.commit()
    print(f"Total dataset properties imported: {count}")
    return count

def seed_demo_chennai_properties(db: Session):
    """
    Seeds realistic demo properties across key Chennai localities as requested in Section 24,
    clearly labeled as is_dataset_record=False (Demo Data).
    """
    chennai_localities = [
        ("Anna Nagar", 18000000, 3, "Penthouse", 2400),
        ("Adyar", 22000000, 3, "Apartment", 2100),
        ("Velachery", 8500000, 2, "Apartment", 1250),
        ("OMR", 6800000, 2, "Apartment", 1180),
        ("Sholinganallur", 7500000, 3, "Apartment", 1450),
        ("Tambaram", 4800000, 2, "Apartment", 980),
        ("Porur", 6200000, 2, "Apartment", 1100),
        ("Guindy", 14500000, 3, "Apartment", 1750),
        ("Perungudi", 8900000, 3, "Apartment", 1520),
        ("Medavakkam", 5400000, 2, "Apartment", 1020),
        ("Pallavaram", 5100000, 2, "Apartment", 960),
        ("Mylapore", 26000000, 4, "Villa", 3200),
        ("T Nagar", 19500000, 3, "Apartment", 1900),
        ("Thoraipakkam", 7200000, 2, "Apartment", 1150),
        ("Ambattur", 4500000, 2, "Apartment", 920),
    ]

    for idx, (loc, price, bhk, ptype, sqft) in enumerate(chennai_localities):
        img = CHENNAI_IMAGES[idx % len(CHENNAI_IMAGES)]
        p = Property(
            title=f"Signature {bhk} BHK {ptype} in {loc}",
            description=f"Curated premium residential offering in {loc}, Chennai. Excellent proximity to IT corridors, metro connectivity, and gated community amenities.",
            city="Chennai",
            locality=loc,
            property_type=ptype,
            bhk=bhk,
            bathrooms=bhk,
            super_area_sqft=float(sqft),
            carpet_area_sqft=float(sqft * 0.85),
            price=float(price),
            currency="INR",
            price_per_sqft=round(price / sqft, 2),
            floor_number=random.randint(2, 14),
            total_floors=random.randint(10, 20),
            property_age=random.randint(1, 4),
            furnishing_status="Semi-Furnished",
            parking=True,
            lift_available=True,
            gated_community=True,
            distance_to_metro_km=round(random.uniform(0.5, 3.0), 2),
            distance_to_city_center_km=round(random.uniform(2.0, 12.0), 2),
            amenities=json.dumps(["24/7 Security", "Covered Parking", "Children's Play Area", "Power Backup", "Gym"]),
            latitude=13.0827 + (random.random() - 0.5) * 0.1,
            longitude=80.2707 + (random.random() - 0.5) * 0.1,
            image_url=img,
            availability="Ready to Move",
            quality="High",
            view_type="City View",
            is_dataset_record=False # Clearly marked demo record
        )
        db.add(p)
    db.commit()
    print("Seeded Chennai demo properties.")

def seed_users_and_crm(db: Session):
    print("Seeding users and CRM leads...")
    
    # 1. Admin / Real Estate Agent User
    agent = db.query(User).filter(User.email == "rajesh.sharma@lykarealty.ae").first()
    if not agent:
        agent = User(
            email="rajesh.sharma@lykarealty.ae",
            hashed_password=hash_password("agent123"),
            full_name="Rajesh Sharma",
            phone="+971 50 234 5671",
            role="agent"
        )
        db.add(agent)

    # 2. Customer User
    customer = db.query(User).filter(User.email == "karthik.venkatesh@gmail.com").first()
    if not customer:
        customer = User(
            email="karthik.venkatesh@gmail.com",
            hashed_password=hash_password("customer123"),
            full_name="Karthik Venkatesh (NRI Investor)",
            phone="+971 52 987 6543",
            role="customer"
        )
        db.add(customer)
    db.commit()

    # 3. Seed Realistic CRM Leads
    seed_leads = [
        {
            "name": "Dr. Ananya Subramanian",
            "email": "ananya.sub@gmail.com",
            "phone": "+971 55 234 5678",
            "city": "Dubai",
            "locality": "Palm Jumeirah",
            "ptype": "Apartment",
            "bhk": 2,
            "bmin": 2500000.0,
            "bmax": 3200000.0,
            "timeline": "Within 2 months",
            "features": ["sea view", "private pool", "balcony"],
            "score": 94,
            "cat": "HOT",
            "status": "site_visit",
            "explanation": "High-intent NRI investor with pre-approved financing, looking for 2 BHK in Palm Jumeirah within 2 months with luxury sea view.",
            "summary": "Customer is seeking a luxury 2 BHK apartment in Palm Jumeirah with a budget of AED 2.5M - 3.2M. Requires direct sea view. Immediate buyer profile."
        },
        {
            "name": "Vikramaditya Rao",
            "email": "v.rao@techventures.io",
            "phone": "+971 50 876 5432",
            "city": "Dubai",
            "locality": "Downtown Dubai",
            "ptype": "Penthouse",
            "bhk": 3,
            "bmin": 3500000.0,
            "bmax": 5000000.0,
            "timeline": "Immediately (Within 30 days)",
            "features": ["view of landmark", "covered parking", "gym/fitness center"],
            "score": 96,
            "cat": "HOT",
            "status": "negotiation",
            "explanation": "Corporate executive moving to Dubai with immediate family. High purchasing capacity with immediate handover required.",
            "summary": "Looking for 3 BHK luxury penthouse in Downtown Dubai with Burj Khalifa / landmark view. High intent buyer, transaction ready."
        },
        {
            "name": "Pooja & Rohan Mehra",
            "email": "rohan.mehra@consulting.com",
            "phone": "+971 58 456 7890",
            "city": "Dubai",
            "locality": "Dubai Marina",
            "ptype": "Apartment",
            "bhk": 2,
            "bmin": 1800000.0,
            "bmax": 2400000.0,
            "timeline": "Within 4 months",
            "features": ["marina view", "swimming pool"],
            "score": 85,
            "cat": "HOT",
            "status": "properties_recommended",
            "explanation": "Clear 2 BHK requirement in Dubai Marina under 2.4M AED. Active engagement with AI recommendations.",
            "summary": "Investor couple seeking high-yield rental property in Dubai Marina. 2 BHK layout preferred within 4 months."
        },
        {
            "name": "Siddharth Nair",
            "email": "sid.nair@chennaicapital.in",
            "phone": "+91 98401 23456",
            "city": "Dubai",
            "locality": "Business Bay",
            "ptype": "Apartment",
            "bhk": 1,
            "bmin": 900000.0,
            "bmax": 1400000.0,
            "timeline": "Within 6 months",
            "features": ["near metro", "central ac"],
            "score": 72,
            "cat": "WARM",
            "status": "ai_qualified",
            "explanation": "Mid-tier investor evaluating 1 BHK entry units in Business Bay for capital appreciation.",
            "summary": "Evaluating 1 BHK in Business Bay or Downtown. Exploring Golden Visa investment threshold."
        },
        {
            "name": "Gautam Chandrasekhar",
            "email": "gautam.c@outlook.com",
            "phone": "+91 94440 98765",
            "city": "Chennai",
            "locality": "OMR",
            "ptype": "Apartment",
            "bhk": 3,
            "bmin": 7000000.0,
            "bmax": 9000000.0,
            "timeline": "Within 6 months",
            "features": ["near IT park", "near metro"],
            "score": 68,
            "cat": "WARM",
            "status": "new",
            "explanation": "IT architect looking for 3 BHK near Sholinganallur/OMR. Comparing Chennai vs Dubai off-plan returns.",
            "summary": "Interested in 3 BHK in Chennai OMR tech corridor or considering Dubai entry apartment."
        },
        {
            "name": "Farhan Al Mansoori",
            "email": "farhan@uaeholding.ae",
            "phone": "+971 50 999 1122",
            "city": "Dubai",
            "locality": "Dubai Hills Estate",
            "ptype": "Villa",
            "bhk": 4,
            "bmin": 6000000.0,
            "bmax": 9500000.0,
            "timeline": "Within 3 months",
            "features": ["private garden", "private pool", "maid room"],
            "score": 91,
            "cat": "HOT",
            "status": "site_visit",
            "explanation": "High-net-worth client seeking 4-5 BHK luxury villa in Dubai Hills Estate with private pool and garden.",
            "summary": "Looking for 4 BHK villa in Dubai Hills Estate with budget up to 9.5M AED. Site visit scheduled."
        },
        {
            "name": "Sunil Verma",
            "email": "sunil.v@gmail.com",
            "phone": "+971 56 321 0987",
            "city": "Dubai",
            "locality": "Jumeirah Village Circle",
            "ptype": "Apartment",
            "bhk": 1,
            "bmin": None,
            "bmax": 950000.0,
            "timeline": "More than 6 months",
            "features": ["pets allowed"],
            "score": 42,
            "cat": "COLD",
            "status": "new",
            "explanation": "Early exploratory stage. Undefined exact budget and flexible timeline.",
            "summary": "Exploratory lead reviewing 1 BHK entry prices in JVC."
        }
    ]

    for lead_data in seed_leads:
        existing = db.query(Lead).filter(Lead.email == lead_data["email"]).first()
        if not existing:
            ld = Lead(
                user_id=customer.id if "Karthik" in lead_data["name"] else None,
                customer_name=lead_data["name"],
                email=lead_data["email"],
                phone=lead_data["phone"],
                city=lead_data["city"],
                locality=lead_data["locality"],
                property_type=lead_data["ptype"],
                bhk=lead_data["bhk"],
                budget_min=lead_data["bmin"],
                budget_max=lead_data["bmax"],
                currency="INR" if lead_data["city"] == "Chennai" else "AED",
                purchase_timeline=lead_data["timeline"],
                preferred_features=json.dumps(lead_data["features"]),
                lead_score=lead_data["score"],
                lead_category=lead_data["cat"],
                lead_explanation=lead_data["explanation"],
                ai_summary=lead_data["summary"],
                pipeline_status=lead_data["status"]
            )
            db.add(ld)
    db.commit()

    # 4. Seed Site Visits for top leads
    props = db.query(Property).limit(5).all()
    leads = db.query(Lead).filter(Lead.lead_category == "HOT").all()
    if props and leads:
        v1 = SiteVisit(
            user_id=customer.id,
            lead_id=leads[0].id,
            property_id=props[0].id,
            customer_name=leads[0].customer_name,
            contact_phone=leads[0].phone or "+971 50 123 4567",
            contact_email=leads[0].email,
            preferred_date="Tomorrow, 4:00 PM",
            preferred_time="16:00",
            notes="Client prefers private viewing with property tour of amenities.",
            status="confirmed"
        )
        db.add(v1)
        if len(props) > 1 and len(leads) > 1:
            v2 = SiteVisit(
                user_id=customer.id,
                lead_id=leads[1].id,
                property_id=props[1].id,
                customer_name=leads[1].customer_name,
                contact_phone=leads[1].phone or "+971 50 876 5432",
                contact_email=leads[1].email,
                preferred_date="Saturday, 11:30 AM",
                preferred_time="11:30",
                notes="Family site visit. Focus on high floor and landmark views.",
                status="pending"
            )
            db.add(v2)
    db.commit()

    # 5. Seed Saved Properties for customer
    if props and customer:
        for p in props[:3]:
            fav = SavedProperty(user_id=customer.id, property_id=p.id)
            db.add(fav)
        try:
            db.commit()
        except Exception:
            db.rollback()

    print("Users, CRM leads, site visits, and saved properties successfully seeded.")

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../properties_data_AED.csv"))
        import_csv_dataset(db, csv_path)
        seed_demo_chennai_properties(db)
        seed_users_and_crm(db)
        print("Database population completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
