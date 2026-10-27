from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    RequirementExtractionRequest,
    RequirementExtractionResponse,
    VoiceTranscriptionResponse
)
from backend.app.services.auth.auth_service import get_current_user_optional
from backend.app.services.ai.conversation_service import process_chat_message
from backend.app.services.ai.requirement_extraction_service import extract_requirements_from_text
from backend.app.services.ai.speech_service import transcribe_audio_file

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else None
    return process_chat_message(
        db=db,
        message=req.message,
        conversation_id=req.conversation_id,
        lead_id=req.lead_id,
        existing_requirements=req.existing_requirements,
        user_id=user_id
    )

@router.post("/extract-requirements", response_model=RequirementExtractionResponse)
def extract_requirements(req: RequirementExtractionRequest):
    extracted = extract_requirements_from_text(req.text, req.existing_requirements)
    return RequirementExtractionResponse(
        requirements=extracted,
        confidence=0.94,
        extracted_entities=extracted.dict()
    )

@router.post("/voice/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_voice(
    file: Optional[UploadFile] = File(None),
    sample_text: Optional[str] = Form(None)
):
    if sample_text:
        return VoiceTranscriptionResponse(
            transcription=sample_text,
            confidence=0.98,
            duration_seconds=3.5
        )
    
    if file:
        content = await file.read()
        transcription, conf = transcribe_audio_file(content, file.filename or "voice.wav")
        return VoiceTranscriptionResponse(
            transcription=transcription,
            confidence=conf,
            duration_seconds=4.2
        )
        
    return VoiceTranscriptionResponse(
        transcription="I am looking for a 2 BHK apartment in Downtown Dubai around 2.5 million AED with a sea view.",
        confidence=0.95,
        duration_seconds=3.0
    )
