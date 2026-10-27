import os
import sqlite3
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.lead import Lead
from app.models.property import Property
from app.models.follow_up import FollowUpNote
from app.schemas.auth import UserResponse
from app.services.auth.auth_service import get_current_admin, hash_password
from app.services.auth.staff_roster import is_email_authorized_for_role

router = APIRouter(prefix="/admin", tags=["Administrator Controls"])

class StaffCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str # "agent", "manager", "admin"

class RoleUpdate(BaseModel):
    role: str # "agent", "manager", "admin"

class SystemLogEntry(BaseModel):
    timestamp: str
    level: str
    module: str
    message: str

class SystemAuditResponse(BaseModel):
    db_size_kb: float
    total_staff: int
    total_leads: int
    total_properties: int
    ai_status: str
    system_version: str
    recent_logs: List[SystemLogEntry]
    total_converted: Optional[int] = 0
    conversion_rate: Optional[float] = 0.0

class PasswordUpdate(BaseModel):
    password: str

@router.get("/users", response_model=List[UserResponse])
def get_staff_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Strictly return only authorized staff roles (agent, manager, admin); customers are completely excluded
    users = db.query(User).filter(User.role.in_(["agent", "manager", "admin"])).order_by(User.role.asc(), User.id.asc()).all()
    return [UserResponse.from_orm(u) for u in users]

@router.post("/users", response_model=UserResponse)
def create_staff_user(
    staff_in: StaffCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    existing = db.query(User).filter(User.email == staff_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    if staff_in.role not in ["agent", "manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'agent', 'manager', or 'admin'"
        )

    if not is_email_authorized_for_role(staff_in.email, staff_in.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Email '{staff_in.email}' is not on the approved roster for role '{staff_in.role}'. (Allowed: 12 Sales Persons, 1 Sales Manager, 1 Admin)."
        )

    new_user = User(
        email=staff_in.email,
        hashed_password=hash_password(staff_in.password),
        full_name=staff_in.full_name,
        phone=staff_in.phone,
        role=staff_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.from_orm(new_user)

@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if role_in.role not in ["agent", "manager", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    if not is_email_authorized_for_role(target_user.email, role_in.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Email '{target_user.email}' is not authorized for staff role '{role_in.role}'."
        )

    target_user.role = role_in.role
    db.commit()
    db.refresh(target_user)
    return UserResponse.from_orm(target_user)

@router.put("/users/{user_id}/password")
def update_staff_password(
    user_id: int,
    pw_in: PasswordUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    new_pw = (pw_in.password or "").strip()
    if len(new_pw) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Staff user not found")

    target_user.hashed_password = hash_password(new_pw)
    db.commit()
    db.refresh(target_user)
    return {
        "message": f"Password updated successfully for {target_user.full_name} ({target_user.email})",
        "id": user_id
    }

@router.delete("/users/{user_id}")
def delete_staff_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(target_user)
    db.commit()
    return {"message": "Staff member removed successfully", "id": user_id}

@router.get("/logs", response_model=SystemAuditResponse)
def get_system_audit_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    total_staff = db.query(User).filter(User.role.in_(["agent", "manager", "admin"])).count()
    total_leads = db.query(Lead).count()
    total_converted = db.query(Lead).filter(Lead.pipeline_status.ilike("%convert%")).count()
    conversion_rate = round((total_converted / total_leads * 100), 1) if total_leads > 0 else 0.0
    total_properties = db.query(Property).count()

    db_path = "lyka_realty.db"
    size_kb = 0.0
    if os.path.exists(db_path):
        size_kb = round(os.path.getsize(db_path) / 1024, 1)

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    sample_logs = [
        SystemLogEntry(timestamp=now_str, level="INFO", module="AUTH_RBAC", message=f"Admin session active: {admin.email} (Alexander Vance)"),
        SystemLogEntry(timestamp=now_str, level="INFO", module="LEAD_ENGINE", message=f"Total active pipeline leads loaded: {total_leads} ({total_converted} converted - {conversion_rate}%)"),
        SystemLogEntry(timestamp=now_str, level="INFO", module="INVENTORY", message=f"Live property listings indexed: {total_properties}"),
        SystemLogEntry(timestamp=now_str, level="SUCCESS", module="AI_MODELS", message="Gemini & local heuristic scoring engine connected"),
        SystemLogEntry(timestamp=now_str, level="INFO", module="SECURITY", message="Role enforcement active: Agent (Isolated), Manager (Team), Admin (Full)")
    ]

    return SystemAuditResponse(
        db_size_kb=size_kb,
        total_staff=total_staff,
        total_leads=total_leads,
        total_properties=total_properties,
        ai_status="Operational (Active)",
        system_version="Lyka Realty CRM v2.4 (Enterprise RBAC)",
        recent_logs=sample_logs,
        total_converted=total_converted,
        conversion_rate=conversion_rate
    )

@router.post("/seed-demo")
def seed_demo_data(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Ensure standard staff exist
    staff_specs = [
        ("rajesh.sharma@lykarealty.ae", "Rajesh Sharma", "agent", "+971 50 234 5671"),
        ("sarah.jenkins@lykarealty.ae", "Sarah Jenkins", "agent", "+971 52 987 6543"),
        ("fatima.alzaabi@lykarealty.ae", "Fatima Al-Zaabi", "manager", "+971 50 112 3456"),
        ("alexander.vance@lykarealty.ae", "Alexander Vance", "admin", "+971 50 998 7766"),
    ]
    created = []
    for email, name, role, phone in staff_specs:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                full_name=name,
                role=role,
                phone=phone,
                hashed_password=hash_password("password123")
            )
            db.add(u)
            db.commit()
            db.refresh(u)
            created.append(email)

    # Distribute leads evenly between agents
    agents = db.query(User).filter(User.role == "agent").all()
    if agents:
        all_leads = db.query(Lead).all()
        for idx, lead in enumerate(all_leads):
            lead.user_id = agents[idx % len(agents)].id
        db.commit()

    return {
        "status": "success",
        "message": f"Demo staff validated/created: {len(created)} new. Leads balanced across {len(agents)} agents."
    }
