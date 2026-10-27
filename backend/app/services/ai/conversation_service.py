import os
import json
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.schemas.lead import LeadRequirements, LeadScoreBreakdown, RecommendationItem
from app.schemas.ai import ChatMessage, ChatResponse
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.models.recommendation import Recommendation
from app.services.ai.requirement_extraction_service import extract_requirements_from_text
from app.services.ai.lead_scoring_service import calculate_lead_score, generate_ai_lead_summary
from app.services.recommendation.recommendation_engine import get_recommendations_for_requirements
from app.services.ai.local_llama_service import generate_local_llama_reply

SYSTEM_PROMPT = """You are Lyka AI, the luxury real estate advisor for Lyka Realty (Dubai, UAE).
Your goal is to assist clients efficiently and keep replies brief and helpful.
Rules:
1. KEEP ALL REPLIES SHORT AND DIRECT (maximum 2 to 3 concise sentences). Never write long paragraphs or unnecessary fluff.
2. If the user only greets you (e.g., "hi", "hello") or has not asked about properties yet, greet them warmly and ask what location, layout, or budget they prefer in Dubai. DO NOT recommend or mention property listings until they express search criteria.
3. Matching properties from our real database are only displayed on the right side once the user asks about properties or shares criteria.
4. Never invent missing parameters or fictional properties.
5. If details are missing, answer their question first, then ask at most ONE brief question, or remind them they can tap the "Fill Requirements Form" button to submit their exact details.
6. Do NOT use markdown bolding, bullet points, or asterisks (never use ** or *). Speak in clean, natural, brief sentences.
"""

def user_has_requested_property_criteria(req: LeadRequirements, message: str) -> bool:
    """
    Checks if the user has actively specified property search criteria
    (location, budget, BHK, property type) or asked about properties in their message.
    """
    if req.locality is not None and req.locality.strip() != "":
        return True
    if req.budget_max is not None or req.budget_min is not None:
        return True
    if req.bhk is not None:
        return True
    if req.preferred_features and len(req.preferred_features) > 0:
        return True
    if req.property_type and req.property_type.lower() not in ["apartment", ""]:
        return True

    msg_lower = message.lower().strip()
    common_greetings = [
        "hi", "hello", "hey", "hola", "greetings", "good morning", "good evening", 
        "good afternoon", "how are you", "who are you", "what can you do", "test", 
        "ok", "okay", "yes", "no", "thanks", "thank you", "bye", "goodbye"
    ]
    if msg_lower in common_greetings:
        return False
        
    property_keywords = [
        "property", "properties", "apartment", "villa", "townhouse", "penthouse", 
        "studio", "flat", "duplex", "bhk", "bedroom", "bedrooms", "bed", 
        "budget", "million", "lakh", "price", "cost", "aed", "inr",
        "downtown", "marina", "palm", "business bay", "jlt", "jbr", "jvc", "hills", "creek",
        "show me", "recommend", "suggest", "looking for", "search", "options", "listings",
        "buy", "rent", "invest", "investment", "roi"
    ]
    return any(kw in msg_lower for kw in property_keywords)

def identify_missing_fields(req: LeadRequirements) -> List[str]:
    missing = []
    if not req.customer_name or req.customer_name.lower() in ["prospective client", "investor lead", "prospective investor"]:
        missing.append("customer_name")
    if not req.phone and not req.email:
        missing.append("contact_details")
    if req.budget_min is None and req.budget_max is None:
        missing.append("budget")
    if req.locality is None:
        missing.append("locality")
    if req.bhk is None and (not req.property_type or req.property_type.lower() not in ["studio", "commercial", "land"]):
        missing.append("bhk")
    if req.purchase_timeline is None:
        missing.append("purchase_timeline")
    if not req.lead_type:
        missing.append("lead_type")
    if not req.purpose:
        missing.append("purpose")
    return missing

def build_natural_followup(req: LeadRequirements, missing: List[str]) -> str:
    """
    Constructs an intelligent follow-up question asking for missing parameters naturally.
    """
    if "budget" in missing and "locality" in missing:
        return "To tailor the best options for you, what is your approximate budget, and do you have a preferred community in mind (such as Downtown Dubai, Palm Jumeirah, or Dubai Marina)?"
    elif "budget" in missing:
        return "What is your target budget range for this property?"
    elif "locality" in missing:
        return "Which community or neighborhood in Dubai do you prefer, or would you like me to recommend high-ROI areas?"
    elif "bhk" in missing:
        return "How many bedrooms or BHK layout would best suit your lifestyle?"
    elif "purchase_timeline" in missing:
        return "What is your anticipated purchase or move-in timeline (such as within 30 days, within 3 months, or off-plan investment)?"
    elif "customer_name" in missing:
        return "May I also ask your name so I can properly address you and prepare your advisory profile?"
    elif "contact_details" in missing:
        return "Could you also provide your phone number or email so our advisory team can share official brochure packages and viewing slots?"
    elif "purpose" in missing:
        return "Are you considering this property primarily for personal living or as an investment with rental returns?"
    else:
        return "Are there any specific lifestyle amenities you'd love, such as a private pool, waterfront view, or dedicated parking?"

def generate_local_advisor_reply(
    user_msg: str,
    req: LeadRequirements,
    missing: List[str],
    recommendations: List[RecommendationItem],
    has_exact: bool,
    should_recommend: bool = False
) -> str:
    """
    Deterministic luxury advisor reply generation when no external LLM is reachable.
    """
    cleaned = user_msg.lower().strip()
    is_greeting = cleaned in ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "hi there", "hello there", "greetings"]

    if not should_recommend or (is_greeting and not req.locality and not req.bhk and not req.budget_max):
        return "Hello and welcome to Lyka Realty! Tell me what property you are looking for in Dubai (such as preferred location, budget, or layout), or click 'Fill Requirements Form' to specify detailed criteria."

    loc_display = req.locality or req.city or "Dubai"
    bhk_display = f"{req.bhk} BHK " if req.bhk is not None else ""
    ptype_display = req.property_type or "property"
    
    parts = []
    
    # Acknowledge requirements briefly
    if req.bhk is not None or req.budget_max is not None or req.locality is not None:
        parts.append(f"Noted: looking for a {bhk_display}{ptype_display} in {loc_display}. I have updated matching properties on the right.")

    # Follow-up question if fields remain missing
    if missing:
        follow_up = build_natural_followup(req, missing)
        parts.append(follow_up)
    else:
        parts.append("Your requirements are complete. Feel free to review the matched properties on the right or schedule a viewing.")

    return " ".join(parts)

def call_huggingface_if_available(system_prompt: str, user_content: str) -> Optional[str]:
    token = settings.HUGGINGFACE_API_KEY or settings.HF_TOKEN
    if not token:
        return None
    try:
        from huggingface_hub import InferenceClient
        client = InferenceClient(token=token)
        model = getattr(settings, "HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            max_tokens=500,
            temperature=0.7
        )
        if response and response.choices and len(response.choices) > 0:
            return response.choices[0].message.content
    except Exception as e:
        print(f"Hugging Face Inference Notice: {e}")
        return None
    return None

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None and settings.GEMINI_API_KEY:
        try:
            from google import genai
            _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            print(f"Error initializing GenAI Client: {e}")
    return _genai_client

def call_gemini_if_available(system_prompt: str, user_content: str) -> Optional[str]:
    client = get_genai_client()
    if not client:
        return None
    try:
        models = [
            getattr(settings, "AI_MODEL", "gemini-flash-lite-latest"),
            "gemini-flash-latest"
        ]
        # Keep unique in order
        seen = set()
        models = [m for m in models if not (m in seen or seen.add(m))]
        prompt_text = f"{system_prompt}\n\nClient Input & Context:\n{user_content}"
        for model in models:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt_text
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                err_str = str(e)
                if "404" in err_str or "503" in err_str:
                    continue
                print(f"Gemini API Notice ({model}): {err_str[:120]}")
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None
    return None

def process_chat_message(
    db: Session,
    message: str,
    conversation_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    existing_requirements: Optional[LeadRequirements] = None,
    user_id: Optional[int] = None
) -> ChatResponse:
    # 1. Retrieve or create Conversation and Lead
    conv = None
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    
    lead = None
    if lead_id:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
    elif conv and conv.lead_id:
        lead = db.query(Lead).filter(Lead.id == conv.lead_id).first()

    # Hydrate requirements from database lead if existing_requirements was not passed
    if not existing_requirements and lead:
        feats = []
        try:
            feats = json.loads(lead.preferred_features or "[]")
        except Exception:
            pass
        existing_requirements = LeadRequirements(
            customer_name=lead.customer_name if lead.customer_name not in ["Prospective Client", "Investor Lead", "Prospective Investor"] else None,
            email=lead.email,
            phone=lead.phone,
            lead_type=getattr(lead, "lead_type", None) or "Buyer",
            purpose=getattr(lead, "purpose", None),
            city=lead.city,
            locality=lead.locality,
            property_type=lead.property_type,
            bhk=lead.bhk,
            budget_min=lead.budget_min,
            budget_max=lead.budget_max,
            currency=lead.currency or "AED",
            preferred_features=feats,
            purchase_timeline=lead.purchase_timeline
        )

    # 2. Extract structured requirements
    updated_req = extract_requirements_from_text(message, existing_requirements)
    
    # 3. Lead score calculation
    interaction_count = 1
    if conv:
        prev_msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        interaction_count = max(1, prev_msg_count // 2 + 1)
        
    lead_score = calculate_lead_score(updated_req, interaction_count=interaction_count)
    ai_summary = generate_ai_lead_summary(updated_req, lead_score)

    # 4. Save or update Lead in database
    if not lead:
        lead = Lead(
            user_id=user_id,
            customer_name=updated_req.customer_name or "Prospective Client",
            email=updated_req.email,
            phone=updated_req.phone,
            lead_type=updated_req.lead_type or "Buyer",
            purpose=updated_req.purpose,
            city=updated_req.city or "Dubai",
            locality=updated_req.locality,
            property_type=updated_req.property_type or "Apartment",
            bhk=updated_req.bhk,
            budget_min=updated_req.budget_min,
            budget_max=updated_req.budget_max,
            currency=updated_req.currency or "AED",
            purchase_timeline=updated_req.purchase_timeline,
            preferred_features=json.dumps(updated_req.preferred_features or []),
            lead_score=lead_score.total_score,
            lead_category=lead_score.category,
            lead_explanation=lead_score.explanation,
            ai_summary=ai_summary,
            pipeline_status="ai_qualified" if lead_score.total_score >= 40 else "new"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
    else:
        # Update existing lead with newly extracted parameters
        if updated_req.customer_name and updated_req.customer_name.lower() not in ["prospective client", "investor lead", "prospective investor"]:
            lead.customer_name = updated_req.customer_name
        if updated_req.email:
            lead.email = updated_req.email
        if updated_req.phone:
            lead.phone = updated_req.phone
        if updated_req.lead_type:
            lead.lead_type = updated_req.lead_type
        if updated_req.purpose:
            lead.purpose = updated_req.purpose
        lead.city = updated_req.city or lead.city
        lead.locality = updated_req.locality or lead.locality
        lead.property_type = updated_req.property_type or lead.property_type
        if updated_req.bhk is not None:
            lead.bhk = updated_req.bhk
        if updated_req.budget_min is not None:
            lead.budget_min = updated_req.budget_min
        if updated_req.budget_max is not None:
            lead.budget_max = updated_req.budget_max
        if updated_req.purchase_timeline:
            lead.purchase_timeline = updated_req.purchase_timeline
        lead.preferred_features = json.dumps(updated_req.preferred_features or [])
        lead.lead_score = lead_score.total_score
        lead.lead_category = lead_score.category
        lead.lead_explanation = lead_score.explanation
        lead.ai_summary = ai_summary
        if lead.pipeline_status == "new" and lead_score.total_score >= 40:
            lead.pipeline_status = "ai_qualified"
        db.commit()
        db.refresh(lead)

    # 5. Save or create Conversation
    if not conv:
        conv = Conversation(
            lead_id=lead.id,
            user_id=user_id,
            title=f"Advisory: {updated_req.locality or updated_req.city} {updated_req.bhk or ''} BHK"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Store user message
    user_msg_record = Message(
        conversation_id=conv.id,
        sender="user",
        content=message,
        extracted_data=json.dumps(updated_req.dict())
    )
    db.add(user_msg_record)
    db.commit()

    # 6. Fetch Recommendations ONLY if user has asked about properties or specified search criteria
    should_recommend = user_has_requested_property_criteria(updated_req, message)
    recommendations: List[RecommendationItem] = []
    has_exact = False

    if should_recommend:
        recommendations, has_exact = get_recommendations_for_requirements(db, updated_req, limit=5)
        # Record recommendations in DB for this lead
        db.query(Recommendation).filter(Recommendation.lead_id == lead.id).delete()
        for rec in recommendations:
            db_rec = Recommendation(
                lead_id=lead.id,
                property_id=rec.property.id,
                match_score=rec.match_score,
                reasons=json.dumps(rec.reasons)
            )
            db.add(db_rec)
        if recommendations and lead.pipeline_status in ["new", "ai_qualified"]:
            lead.pipeline_status = "properties_recommended"
        db.commit()
    else:
        # Clear out any stale recommendations when user hasn't asked for properties yet
        db.query(Recommendation).filter(Recommendation.lead_id == lead.id).delete()
        db.commit()
        recommendations = []
        has_exact = False

    # 7. Check missing fields and build reply
    missing_fields = identify_missing_fields(updated_req)
    
    # Check LLM or generate local response
    ai_reply = None
    prev_messages = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
    prior_messages = [m for m in prev_messages if m.id != user_msg_record.id]
    history_text = "\n".join([f"{m.sender.capitalize()}: {m.content}" for m in prior_messages[-10:]])
    chat_history = [
        {"role": "user" if m.sender == "user" else "assistant", "content": m.content}
        for m in prior_messages[-10:]
    ]
    
    req_json = updated_req.model_dump_json() if hasattr(updated_req, "model_dump_json") else updated_req.json()
    if should_recommend and recommendations:
        top_props_desc = [r.property.title + ' in ' + r.property.locality + f' ({r.match_score}%)' for r in recommendations]
        context_prompt = f"Conversation History:\n{history_text}\n\nUser message: {message}\nCurrent Extracted Requirements: {req_json}\nLead Score: {lead_score.total_score}/100 ({lead_score.category})\nTop Properties: {top_props_desc}\nMissing Fields: {missing_fields}"
        user_context = f"{message}\n\n[Context: Inquiring about {updated_req.bhk or ''} BHK in {updated_req.locality or 'Dubai'}. Budget: {updated_req.budget_max or 'flexible'}. Top matches: {', '.join([r.property.title for r in recommendations[:2]])}]"
    else:
        context_prompt = f"Conversation History:\n{history_text}\n\nUser message: {message}\nNote: The user has greeted or not yet specified property search criteria. Do NOT recommend or list any properties. Greet the user warmly and ask what type of property, preferred community (e.g. Downtown Dubai, Palm Jumeirah, Dubai Marina), or budget they are looking for."
        user_context = f"{message}\n\n[Context: User greeting or general inquiry. No property criteria specified yet. Ask what location, budget, or layout they seek.]"

    # 1. Primary engine: Google Gemini (high speed 1-2s, natural conversation)
    if settings.GEMINI_API_KEY:
        ai_reply = call_gemini_if_available(SYSTEM_PROMPT, context_prompt)

    # 2. Local LLaMA 3.2 3B pipeline (if enabled and Gemini not available)
    if not ai_reply and getattr(settings, "USE_LOCAL_LLAMA", False):
        ai_reply = generate_local_llama_reply(
            system_prompt=SYSTEM_PROMPT,
            user_content=user_context,
            conversation_history=chat_history
        )

    # 3. Hugging Face Cloud Inference (if configured)
    if not ai_reply and (settings.HUGGINGFACE_API_KEY or settings.HF_TOKEN):
        ai_reply = call_huggingface_if_available(SYSTEM_PROMPT, context_prompt)
        
    # 4. Deterministic luxury advisor fallback
    if not ai_reply:
        ai_reply = generate_local_advisor_reply(message, updated_req, missing_fields, recommendations, has_exact, should_recommend)

    # Clean any markdown asterisks for natural chatbot appearance
    if ai_reply:
        ai_reply = ai_reply.replace("**", "").replace("*", "").strip()

    # Store assistant message
    asst_msg_record = Message(
        conversation_id=conv.id,
        sender="assistant",
        content=ai_reply,
        extracted_data=json.dumps(updated_req.dict())
    )
    db.add(asst_msg_record)
    db.commit()

    return ChatResponse(
        reply=ai_reply,
        conversation_id=conv.id,
        lead_id=lead.id,
        extracted_requirements=updated_req,
        lead_score=lead_score,
        recommendations=recommendations,
        missing_fields=missing_fields,
        has_exact_match=has_exact
    )
