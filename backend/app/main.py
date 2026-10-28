import os
import sys

# Ensure the backend directory is in sys.path and PYTHONPATH so 'from app...' works universally
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
if _backend_dir not in os.environ.get("PYTHONPATH", ""):
    os.environ["PYTHONPATH"] = (_backend_dir + os.pathsep + os.environ.get("PYTHONPATH", "")).rstrip(os.pathsep)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import app.models # ensures all models are registered

# Import routers
from app.api.auth import router as auth_router
from app.api.ai import router as ai_router
from app.api.properties import router as properties_router
from app.api.leads import router as leads_router
from app.api.recommendations import router as recommendations_router
from app.api.site_visits import router as site_visits_router
from app.api.saved_properties import router as saved_properties_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router
from app.api.search_history import router as search_history_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack AI Real Estate Lead Qualification & Property Recommendation Engine for Lyka Realty (Dubai, UAE & India)",
    version="1.0.0"
)

# CORS & Private Network Access Middleware
@app.middleware("http")
async def add_private_network_header(request, call_next):
    response = await call_next(request)
    if "access-control-request-private-network" in request.headers:
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)

# Include Routers
app.include_router(auth_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(properties_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")
app.include_router(site_visits_router, prefix="/api")
app.include_router(saved_properties_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(search_history_router, prefix="/api")

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "company": settings.COMPANY_NAME,
        "website": settings.COMPANY_WEBSITE,
        "status": "operational",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "PropAI Lyka Realty Backend"}
