from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from datetime import datetime
from app.database import Base

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    city = Column(String(100), index=True, default="Dubai")
    locality = Column(String(150), index=True, nullable=False) # e.g. Downtown Dubai, Palm Jumeirah, Marina
    property_type = Column(String(50), index=True, default="Apartment") # Apartment, Villa, Penthouse, Townhouse
    bhk = Column(Integer, index=True, default=2) # 0 for Studio, 1, 2, 3, 4, 5
    bathrooms = Column(Integer, default=2)
    super_area_sqft = Column(Float, nullable=False)
    carpet_area_sqft = Column(Float, nullable=True)
    price = Column(Float, index=True, nullable=False) # In AED (or local currency base)
    currency = Column(String(10), default="AED")
    price_per_sqft = Column(Float, nullable=True)
    floor_number = Column(Integer, default=5)
    total_floors = Column(Integer, default=25)
    property_age = Column(Integer, default=2) # in years
    furnishing_status = Column(String(50), default="Furnished") # Furnished, Unfurnished, Semi-Furnished
    parking = Column(Boolean, default=True)
    lift_available = Column(Boolean, default=True)
    gated_community = Column(Boolean, default=True)
    distance_to_metro_km = Column(Float, default=1.2)
    distance_to_city_center_km = Column(Float, default=4.5)
    amenities = Column(Text, default="[]") # JSON list string of amenities
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    availability = Column(String(50), default="Ready to Move") # Ready to Move, Off-Plan, Under Construction
    quality = Column(String(50), default="High") # High, Medium, Ultra-Luxury
    view_type = Column(String(100), default="City View") # Water View, Landmark View, Marina View, Skyline View
    is_dataset_record = Column(Boolean, default=True, index=True) # Distinguishes real dataset records vs synthetic
    created_at = Column(DateTime, default=datetime.utcnow)
