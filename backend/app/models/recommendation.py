from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey
from datetime import datetime
from backend.app.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, nullable=False)
    reasons = Column(Text, default="[]") # JSON list of reasons
    created_at = Column(DateTime, default=datetime.utcnow)
