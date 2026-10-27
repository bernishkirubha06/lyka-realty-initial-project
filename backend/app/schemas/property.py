from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    city: str = "Dubai"
    locality: str
    property_type: str = "Apartment"
    bhk: int = 2
    bathrooms: int = 2
    super_area_sqft: float
    carpet_area_sqft: Optional[float] = None
    price: float
    currency: str = "AED"
    price_per_sqft: Optional[float] = None
    floor_number: Optional[int] = 5
    total_floors: Optional[int] = 25
    property_age: Optional[int] = 2
    furnishing_status: Optional[str] = "Furnished"
    parking: Optional[bool] = True
    lift_available: Optional[bool] = True
    gated_community: Optional[bool] = True
    distance_to_metro_km: Optional[float] = 1.0
    distance_to_city_center_km: Optional[float] = 3.5
    amenities: Optional[str] = "[]"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    availability: Optional[str] = "Ready to Move"
    quality: Optional[str] = "High"
    view_type: Optional[str] = "City View"
    is_dataset_record: Optional[bool] = True

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    property_type: Optional[str] = None
    bhk: Optional[int] = None
    bathrooms: Optional[int] = None
    super_area_sqft: Optional[float] = None
    price: Optional[float] = None
    furnishing_status: Optional[str] = None
    parking: Optional[bool] = None
    amenities: Optional[str] = None
    image_url: Optional[str] = None
    availability: Optional[str] = None

class PropertyResponse(PropertyBase):
    id: int
    created_at: datetime
    parsed_amenities: Optional[List[str]] = None

    class Config:
        from_attributes = True

class PropertyListResponse(BaseModel):
    items: List[PropertyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
