from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from backend.app.database import Base

class SavedProperty(Base):
    __tablename__ = "saved_properties"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('user_id', 'property_id', name='_user_property_uc'),)
