from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from datetime import datetime
from backend.app.database import Base
from backend.app.utils.timezone import get_dubai_now

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # assigned staff/agent
    client_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # submitting client/customer
    customer_name = Column(String(255), nullable=False, default="Prospective Investor")
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    city = Column(String(100), default="Dubai")
    locality = Column(String(150), nullable=True)
    property_type = Column(String(50), default="Apartment")
    bhk = Column(Integer, nullable=True)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    currency = Column(String(10), default="AED")
    purchase_timeline = Column(String(100), nullable=True) # e.g. "Within 3 months"
    preferred_features = Column(Text, default="[]") # JSON string
    lead_score = Column(Integer, default=50) # 0-100
    lead_category = Column(String(50), default="WARM") # HOT, WARM, COLD
    lead_explanation = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    lead_type = Column(String(50), default="Buyer") # Buyer, Renter, Investor, Seller
    purpose = Column(String(100), nullable=True) # Personal use, Investment
    pipeline_status = Column(String(50), default="new") # new, ai_qualified, properties_recommended, interested, site_visit, negotiation, converted
    address = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    gender = Column(String(50), nullable=True)
    dob = Column(String(50), nullable=True)
    last_interaction = Column(DateTime, default=get_dubai_now)
    created_at = Column(DateTime, default=get_dubai_now)
