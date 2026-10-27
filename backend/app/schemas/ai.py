from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.schemas.lead import LeadRequirements, LeadScoreBreakdown, RecommendationItem

class ChatMessage(BaseModel):
    role: str # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    lead_id: Optional[int] = None
    existing_requirements: Optional[LeadRequirements] = None
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    conversation_id: int
    lead_id: int
    extracted_requirements: LeadRequirements
    lead_score: LeadScoreBreakdown
    recommendations: List[RecommendationItem]
    missing_fields: List[str]
    has_exact_match: bool = True

class RequirementExtractionRequest(BaseModel):
    text: str
    existing_requirements: Optional[LeadRequirements] = None

class RequirementExtractionResponse(BaseModel):
    requirements: LeadRequirements
    confidence: float
    extracted_entities: Dict[str, Any]

class VoiceTranscriptionResponse(BaseModel):
    transcription: str
    confidence: float
    duration_seconds: Optional[float] = None
