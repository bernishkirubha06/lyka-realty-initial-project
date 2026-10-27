from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from backend.app.services.auth.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from backend.app.services.auth.staff_roster import (
    is_email_authorized_for_role,
    ALLOWED_SALES_EMAILS,
    ALLOWED_MANAGER_EMAILS,
    ALLOWED_ADMIN_EMAILS,
    DISALLOWED_MOCK_EMAILS
)
from backend.app.utils.timezone import to_dubai_time, get_dubai_now

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _format_user_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        phone=u.phone,
        role=u.role,
        address=u.address,
        country=u.country,
        gender=u.gender,
        dob=u.dob,
        created_at=to_dubai_time(u.created_at)
    )

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    clean_email = (user_in.email or "").strip().lower()
    if clean_email in DISALLOWED_MOCK_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration with mock or alias corporate emails is strictly prohibited."
        )

    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    assigned_role = "customer"
    if user_in.role and user_in.role.lower() in ["agent", "manager", "admin"]:
        role_req = user_in.role.lower()
        if not is_email_authorized_for_role(clean_email, role_req):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Email '{user_in.email}' is not authorized for the {role_req.upper()} role. Only approved staff emails are permitted."
            )
        assigned_role = role_req
    elif user_in.role and user_in.role.lower() == "customer":
        assigned_role = "customer"

    new_user = User(
        email=clean_email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=assigned_role,
        address=user_in.address,
        country=user_in.country,
        gender=user_in.gender,
        dob=user_in.dob,
        created_at=get_dubai_now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically store new customer account details in the Agent/Manager/Admin CRM Lead database
    if assigned_role == "customer":
        from backend.app.models.lead import Lead
        existing_lead = db.query(Lead).filter(
            (Lead.email == new_user.email) | ((Lead.phone != None) & (Lead.phone == new_user.phone))
        ).first()

        # Fair round-robin assignment among all 12 sales agents (assign to least loaded agent)
        agents = db.query(User).filter(User.role == "agent").all()
        if agents:
            agent_counts = {a.id: db.query(Lead).filter(Lead.user_id == a.id).count() for a in agents}
            agent_id = min(agent_counts, key=agent_counts.get)
        else:
            fallback_agent = db.query(User).filter(User.role.in_(["agent", "manager", "admin"])).first()
            agent_id = fallback_agent.id if fallback_agent else None

        if existing_lead:
            existing_lead.customer_name = new_user.full_name or existing_lead.customer_name
            existing_lead.phone = new_user.phone or existing_lead.phone
            existing_lead.address = new_user.address or existing_lead.address
            existing_lead.country = new_user.country or existing_lead.country
            existing_lead.gender = new_user.gender or existing_lead.gender
            existing_lead.dob = new_user.dob or existing_lead.dob
            if not existing_lead.locality:
                existing_lead.locality = "Downtown Dubai"
            if not existing_lead.property_type:
                existing_lead.property_type = "Apartment"
            if not existing_lead.bhk:
                existing_lead.bhk = 2
            if not existing_lead.budget_max:
                existing_lead.budget_max = 3000000
            if not existing_lead.budget_min:
                existing_lead.budget_min = 1000000
            if not existing_lead.user_id and agent_id:
                existing_lead.user_id = agent_id
            db.commit()
        else:
            new_lead = Lead(
                user_id=agent_id,
                client_id=new_user.id,
                customer_name=new_user.full_name,
                email=new_user.email,
                phone=new_user.phone,
                lead_type="Buyer",
                city="Dubai",
                locality="Downtown Dubai",
                address=new_user.address,
                country=new_user.country,
                gender=new_user.gender,
                dob=new_user.dob,
                property_type="Apartment",
                bhk=2,
                budget_min=1000000,
                budget_max=3000000,
                currency="AED",
                purchase_timeline="Within 3 months",
                pipeline_status="new",
                lead_score=50,
                lead_category="WARM",
                lead_explanation="Registered customer account on Lyka Realty website portal.",
                ai_summary=f"New customer account enrolled by {new_user.full_name} ({new_user.country or 'International'}). Registered with email {new_user.email} and phone {new_user.phone or 'not provided'}."
            )
            db.add(new_lead)
            db.commit()

    token = create_access_token({"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    return Token(
        access_token=token,
        token_type="bearer",
        user=_format_user_response(new_user)
    )

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    clean_email = (login_in.email or "").strip().lower()
    clean_password = (login_in.password or "").strip()

    # Explicitly reject and block mock emails
    if clean_email in DISALLOWED_MOCK_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Mock and alias emails (e.g. agent@lykarealty.ae, manager@lykarealty.ae, admin@lykarealty.ae, customer@lykarealty.ae) are restricted and deactivated. Only official corporate staff emails or registered customer accounts are permitted."
        )
    
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    
    # Official credentials for authorized staff accounts
    DEMO_PASSWORDS = {
        "fatima.alzaabi@lykarealty.ae": ["manager123", "password123"],
        "alexander.vance@lykarealty.ae": ["admin123", "password123", "admin"],
    }
    # Allow password123 and agent123 for all 12 official sales persons
    for sp_email in ALLOWED_SALES_EMAILS:
        if sp_email not in DEMO_PASSWORDS:
            DEMO_PASSWORDS[sp_email] = ["agent123", "password123"]
    
    is_valid = False
    if user:
        is_valid = verify_password(clean_password, user.hashed_password)
        if not is_valid:
            # Check if current stored password is still one of the initial default hashes
            is_initial_default = False
            for def_pw in ["password123", "agent123", "manager123", "admin123", "admin"]:
                if verify_password(def_pw, user.hashed_password):
                    is_initial_default = True
                    break

            # Only fallback to initial defaults if the password hasn't been personalized by admin
            if (is_initial_default or not user.hashed_password) and clean_email in DEMO_PASSWORDS and clean_password in DEMO_PASSWORDS[clean_email]:
                is_valid = True
                user.hashed_password = hash_password(clean_password)
                db.commit()

    if not user or not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Strict Staff Authorization: verify staff accounts are in authorized roster
    if user.role in ["agent", "manager", "admin"]:
        if not is_email_authorized_for_role(user.email, user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Email '{user.email}' is not permitted for the {user.role.upper()} portal."
            )

    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return Token(
        access_token=token,
        token_type="bearer",
        user=_format_user_response(user)
    )

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return _format_user_response(current_user)
