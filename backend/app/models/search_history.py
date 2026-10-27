from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from app.database import Base
from app.utils.timezone import get_dubai_now

class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    property_id = Column(Integer, nullable=True)
    property_title = Column(String(255), nullable=True)
    search_query = Column(String(255), nullable=True)
    locality = Column(String(150), nullable=True)
    bhk = Column(Integer, nullable=True)
    price = Column(Float, nullable=True)
    visit_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=get_dubai_now)
