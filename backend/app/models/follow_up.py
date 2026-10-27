from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class FollowUpNote(Base):
    __tablename__ = "follow_up_notes"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    agent_name = Column(String(255), nullable=True)
    note = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending")  # 'pending', 'completed'
    created_at = Column(DateTime, default=datetime.utcnow)
