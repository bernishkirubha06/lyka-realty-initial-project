from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base
from app.utils.timezone import get_dubai_now

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), default="customer") # 'customer', 'agent', 'admin'
    address = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    gender = Column(String(50), nullable=True)
    dob = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=get_dubai_now)
