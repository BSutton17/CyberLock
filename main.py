"""
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --access-log --log-level info
Main FastAPI application with security and rate limiting
"""

from fastapi import FastAPI, HTTPException, Depends, Header, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Optional
import time
import json
import re
import torch
import hashlib
import secrets
from collections import defaultdict
from datetime import datetime, timedelta
from loguru import logger

from app.config import settings, GAME_CONFIG
from app.model import ModelLoader, ConversationManager
from app.memory import MemoryStore, ContextBuilder
from app.prompts import build_system_prompt, build_event_instructions
from app.schemas import (
    GameEventRequest, GameEventResponse,
    AddMemoryRequest, AddMemoryResponse,
    RetrieveMemoriesRequest, RetrieveMemoriesResponse,
    HealthResponse, ErrorResponse
)


# Global instances
model_loader: Optional[ModelLoader] = None
memory_store: Optional[MemoryStore] = None
context_builder: Optional[ContextBuilder] = None
conversation_manager: Optional[ConversationManager] = None

# Session storage (in production we will use a database)
sessions = {}

# Rate limiting storage (in production use Redis)
rate_limit_data = defaultdict(list)


VALID_DECISION_ATTRIBUTES = {
    "politician",
    "intimidation",
    "scholar",
    "spy",
    "detective",
    "medic",
    "banker",
    "crook",
    "electrician",
    "navigator",
}

VALID_LOCATIONS = {
    "city_square",
    "warehouse",
    "club",
    "hospital",
    "office",
    "sewer",
    "shop",
    "boss",
    "street",
}

ATTRIBUTE_ALIASES = {
    "politics": "politician",
    "political": "politician",
    "persuasion": "politician",
    "diplomat": "politician",
    "diplomacy": "politician",
    "research": "scholar",
    "investigation": "detective",
    "investigate": "detective",
    "medicine": "medic",
    "medical": "medic",
    "criminal": "crook",
    "underworld": "crook",
    "electrical": "electrician",
    "electric": "electrician",
    "navigation": "navigator",
    "travel": "navigator",
    "finance": "banker",
    "financial": "banker",
    "money": "banker",
}


def _build_event_summary(event_type: str, message: Optional[str], data: Optional[dict]) -> str:
    """Build a compact event summary for prompting and memory."""

    if event_type == "chat_message":
        return message or "Player asked a rules question."

    summary = message or f"Event type: {event_type}."
    if data:
        summary += f" Data: {data}"
    return summary


def _sanitize_message_history(messages: list[dict]) -> list[dict]:
    """Ensure message history alternates user/assistant and starts with user."""

    sanitized = []
    expected_role = "user"

    for message in messages:
        role = message.get("role")
        content = message.get("content")
        if role not in {"user", "assistant"} or not content:
            continue
        if role != expected_role:
            continue

        sanitized.append({"role": role, "content": content})
        expected_role = "assistant" if expected_role == "user" else "user"

    return sanitized


def _normalize_attribute(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized = re.sub(r"[^a-z0-9]+", "_", str(value).strip().lower()).strip("_")
    if not normalized:
        return None

    canonical = ATTRIBUTE_ALIASES.get(normalized, normalized)
    return canonical if canonical in VALID_DECISION_ATTRIBUTES else None


def _strip_markdown_code_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _try_parse_json_dict(text: str) -> Optional[dict]:
    if not text:
        return None

    candidate = _strip_markdown_code_fence(text)

    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed
        if isinstance(parsed, str):
            inner = parsed.strip()
            try:
                nested = json.loads(inner)
                if isinstance(nested, dict):
                    return nested
            except (json.JSONDecodeError, ValueError, TypeError):
                return None
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    first_brace = candidate.find("{")
    last_brace = candidate.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        snippet = candidate[first_brace:last_brace + 1]
        try:
            parsed = json.loads(snippet)
            if isinstance(parsed, dict):
                return parsed
        except (json.JSONDecodeError, ValueError, TypeError):
            return None

    return None


def _extract_response_text_from_jsonish(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None

    candidate = str(text).strip()
    if not candidate:
        return None

    parsed = _try_parse_json_dict(candidate)
    if parsed:
        for key in ("response", "narration", "text"):
            value = parsed.get(key)
            if value is None:
                continue
            if isinstance(value, (dict, list)):
                continue
            normalized = str(value).strip()
            if normalized:
                return normalized

    response_match = re.search(r'"response"\s*:\s*"((?:\\.|[^"\\])*)"', candidate, re.DOTALL)
    if response_match:
        escaped_value = response_match.group(1)
        try:
            decoded_value = json.loads(f'"{escaped_value}"')
        except (json.JSONDecodeError, ValueError):
            decoded_value = escaped_value

        decoded_value = str(decoded_value).strip()
        if decoded_value:
            return decoded_value

    return None


def _sanitize_narration_text(response_value: Optional[str], raw_text: Optional[str]) -> str:
    for candidate in (response_value, raw_text):
        extracted = _extract_response_text_from_jsonish(candidate)
        if extracted:
            return extracted

    fallback = str(response_value if response_value is not None else (raw_text or "")).strip()
    return _strip_markdown_code_fence(fallback)


def _infer_decision_attribute(
    event_type: str,
    options: list[str],
    current_attribute: Optional[str]
) -> str:
    if event_type in {"encounter_end", "shop_intro", "shop_continue"}:
        return "banker"
    if event_type == "game_start":
        return "politician"

    if current_attribute in VALID_DECISION_ATTRIBUTES:
        return current_attribute

    option_text = " ".join(option.lower() for option in options)

    if re.search(r"shop|vendor|buy|sell|browse|market|store|price|barter", option_text):
        return "banker"
    if re.search(r"leave|journey|travel|route|where|next encounter|move|head|go", option_text):
        return "navigator"
    if re.search(r"help|ally|support|convince|negotiate|diplomacy|corporate|fighters", option_text):
        return "politician"
    if re.search(r"threat|pressure|coerce|intimidat", option_text):
        return "intimidation"
    if re.search(r"clue|investigat|evidence|pattern", option_text):
        return "detective"
    if re.search(r"stealth|infiltrat|surveil|sneak", option_text):
        return "spy"
    if re.search(r"study|research|lore|decipher|ancient", option_text):
        return "scholar"
    if re.search(r"heal|treat|diagnos|stabilize", option_text):
        return "medic"
    if re.search(r"theft|forge|scam|criminal|underworld", option_text):
        return "crook"
    if re.search(r"circuit|power|electric|grid|reroute", option_text):
        return "electrician"

    return "politician"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global model_loader, memory_store, context_builder, conversation_manager
    
    logger.info("Starting DM AI API...")
    
    try:
        # Initialize model
        logger.info("Loading AI model...")
        model_loader = ModelLoader(
            model_name=settings.MODEL_NAME,
            quantization=settings.QUANTIZATION,
            max_context_length=settings.MAX_CONTEXT_LENGTH
        )
        model_loader.load_model()
        
        # Initialize conversation manager
        conversation_manager = ConversationManager(model_loader.tokenizer)
        
        # Initialize memory system
        logger.info("Initializing memory system...")
        memory_store = MemoryStore(
            db_path=settings.CHROMA_DB_PATH,
            embedding_model=settings.EMBEDDING_MODEL
        )
        context_builder = ContextBuilder(memory_store)
        
        logger.success("All systems ready!")
        
        yield
        
    finally:
        # Cleanup
        logger.info("Shutting down...")
        if model_loader:
            model_loader.unload_model()


# Create FastAPI app
app = FastAPI(
    title="Capstone DM AI API",
    description="AI powered Dungeon Master using Mistral and PyTorch",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,  # Disable docs in production
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,  # Disable redoc in production
)

# Rate limiting functions
def get_client_ip(request: Request) -> str:
    """Get the real client IP address"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP") 
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"

def is_rate_limited(client_ip: str) -> bool:
    """Check if client is rate limited"""
    now = datetime.now()
    cutoff = now - timedelta(seconds=settings.RATE_LIMIT_WINDOW)
    
    # Clean old entries
    rate_limit_data[client_ip] = [
        timestamp for timestamp in rate_limit_data[client_ip] 
        if timestamp > cutoff
    ]
    
    # Check if over limit
    if len(rate_limit_data[client_ip]) >= settings.RATE_LIMIT_REQUESTS:
        return True
    
    # Add current request
    rate_limit_data[client_ip].append(now)
    return False

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    client_ip = get_client_ip(request)
    
    if is_rate_limited(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please try again later."}
        )
    
    return await call_next(request)

# Trusted host middleware
if settings.ENVIRONMENT == "production":
    trusted_hosts = [host.strip() for host in settings.TRUSTED_HOSTS.split(",")]
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enhanced security dependency 
async def verify_api_key(request: Request, x_api_key: Optional[str] = Header(None)):
    """Enhanced API key verification with logging"""
    client_ip = get_client_ip(request)
    
    if settings.ENABLE_API_KEY:
        if not x_api_key:
            logger.warning(f"Missing API key from IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="API key required"
            )
        
        if not settings.API_KEY:
            logger.error("API_KEY not configured in environment")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error"
            )
            
        # Use constant-time comparison to prevent timing attacks
        if not secrets.compare_digest(x_api_key, settings.API_KEY):
            logger.warning(f"Invalid API key from IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid API key"
            )
        
        logger.info(f"Authenticated request from IP: {client_ip}")
    
    return True


@app.get("/", tags=["General"])
async def root():
    """Root endpoint"""
    return {
        "service": "Capstone DM AI API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Health check endpoint"""
    
    vram_stats = None
    if model_loader and torch.cuda.is_available():
        vram_stats = model_loader.get_memory_stats()
    
    memory_stats = None
    if memory_store:
        memory_stats = memory_store.get_stats()
    
    return HealthResponse(
        status="healthy" if model_loader and model_loader.model else "degraded",
        model_loaded=model_loader is not None and model_loader.model is not None,
        gpu_available=torch.cuda.is_available(),
        vram_stats=vram_stats,
        memory_stats=memory_stats
    )


@app.get("/game/event", response_model=ErrorResponse, tags=["AI"])
async def game_event_get():
    """
    GET requests to /game/event are not allowed - returns JSON error instead of HTML
    """
    raise HTTPException(
        status_code=405, 
        detail="Method not allowed. Use POST to submit game events. This endpoint only accepts POST requests with a JSON payload."
    )


@app.post("/game/event", response_model=GameEventResponse, tags=["AI"])
async def game_event(
    request: GameEventRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Structured game event endpoint - narrate game events and choices
    """

    if not model_loader or not model_loader.model:
        raise HTTPException(status_code=503, detail="Model not loaded")

    start_time = time.time()

    try:
        # Get or create session
        if request.session_id not in sessions:
            sessions[request.session_id] = {
                "messages": [],
                "chat_messages": [],
                "created_at": time.time(),
                "used_locations": set()
            }
        
        session = sessions[request.session_id]
        if "used_locations" not in session:
            session["used_locations"] = set()
        if "chat_messages" not in session:
            session["chat_messages"] = []

        # Build event summary for the user message
        event_summary = _build_event_summary(request.event_type, request.message, request.data)

        # Event-specific performance tuning
        is_turn_action = request.event_type == "turn_action"
        is_chat_message = request.event_type == "chat_message"
        context_limit = 6 if is_turn_action else (8 if is_chat_message else settings.MEMORY_CONTEXT_SIZE)
        use_memory = False if (is_turn_action or is_chat_message) else request.use_memory
        temperature = request.temperature or (0.6 if is_turn_action else settings.TEMPERATURE)
        max_tokens = request.max_tokens or (192 if is_chat_message else (160 if is_turn_action else settings.MAX_NEW_TOKENS))
        include_lore = False if (is_turn_action or is_chat_message) else True
        minimal_prompt = True if (is_turn_action or is_chat_message) else False

        # Compute available locations (exclude already-used ones)
        all_locations = ["city_square", "warehouse", "club", "hospital", "office", "sewer", "street"]
        available_locations = [loc for loc in all_locations if loc not in session["used_locations"]]

        # Build event instructions and system prompt
        event_instructions = build_event_instructions(
            event_type=request.event_type,
            data=request.data,
            message=request.message,
            available_locations=available_locations if request.event_type in ("game_start", "choice_made", "next_encounter") else None
        )
        system_prompt = build_system_prompt(
            scenario_type=request.scenario_type,
            custom_instructions=event_instructions,
            include_lore=include_lore,
            minimal=minimal_prompt,
            assistant_mode="rules_helper" if is_chat_message else "dm"
        )

        # Prepare message history without mutating session state before generation succeeds.
        if is_chat_message:
            history_key = "chat_messages"
        else:
            history_key = "messages"

        session[history_key] = _sanitize_message_history(session.get(history_key, []))
        recent_messages = session[history_key][-context_limit:]
        user_message = {"role": "user", "content": event_summary}
        messages_for_prompt = recent_messages + [user_message]

        # Use RAG to enhance context (disabled for turn_action)
        context = None
        if use_memory and memory_store:
            context = context_builder.build_context(
                system_prompt=system_prompt,
                recent_messages=messages_for_prompt[:-1],
                current_query=event_summary,
                session_id=request.session_id,
                max_rag_results=settings.RAG_TOP_K
            )
            system_prompt = context["system_prompt"]

        # Format conversation
        formatted_prompt = conversation_manager.format_conversation(
            system_prompt=system_prompt,
            messages=messages_for_prompt
        )

        # Generate response
        response_text = model_loader.generate(
            prompt=formatted_prompt,
            temperature=temperature,
            top_p=settings.TOP_P,
            max_new_tokens=max_tokens,
            repetition_penalty=GAME_CONFIG["model"]["generation"]["repetition_penalty"]
        )

        # Parse structured JSON from model output
        parsed = _parse_structured_response(response_text)
        narration = _sanitize_narration_text(parsed.get("response"), response_text)
        location = parsed.get("location") or None
        attribute = _normalize_attribute(parsed.get("attribute"))
        start_combat = bool(parsed.get("start_combat", False))
        options = parsed.get("options") or None

        # Hard override for turn_action: never change location, start combat, or show options
        if is_turn_action:
            location = None
            start_combat = False
            options = None

        # Hard override for chat_message: keep chatbot outputs informational only
        if is_chat_message:
            location = None
            attribute = None
            start_combat = False
            options = None

        # Validate location against known scenes
        if location and location not in VALID_LOCATIONS:
            location = None

        # Enforce no location reuse (shop/boss exempt) and track used locations
        if location and location not in ("shop", "boss"):
            if location in session["used_locations"]:
                # AI picked an already-used location — override with first available one
                remaining = [loc for loc in all_locations if loc not in session["used_locations"]]
                location = remaining[0] if remaining else None
            if location:
                session["used_locations"].add(location)

        # Validate attribute against known attributes
        if attribute and attribute not in VALID_DECISION_ATTRIBUTES:
            attribute = None

        # Ensure options is a list of strings if present
        if options is not None:
            if not isinstance(options, list):
                options = None
            else:
                options = [str(o).strip() for o in options if str(o).strip()]
                if len(options) == 0:
                    options = None

        # Any actionable options must include a valid decision attribute for frontend ownership logic.
        if options and not is_chat_message:
            attribute = _infer_decision_attribute(request.event_type, options, attribute)

        # Add successful exchanges to history (skip turn_action to reduce growth)
        if not is_turn_action:
            assistant_message = {"role": "assistant", "content": narration}
            session[history_key].extend([user_message, assistant_message])

        # Auto-save important information to memory (skip for turn_action/chat_message)
        if memory_store and use_memory:
            await _auto_save_memories(
                event_summary,
                narration,
                request.session_id,
                request.character_name
            )

        processing_time = time.time() - start_time

        return GameEventResponse(
            response=narration,
            session_id=request.session_id,
            event_type=request.event_type,
            location=location,
            attribute=attribute,
            start_combat=start_combat,
            options=options,
            memories_used=len(context["retrieved_memories"]) if context else 0,
            processing_time=processing_time
        )

    except Exception as e:
        logger.error(f"Game event error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _parse_structured_response(raw_text: str) -> dict:
    """
    Parse structured JSON from the model's response text.
    Handles cases where the model wraps JSON in markdown code blocks or
    includes extra text around the JSON.
    """
    if not raw_text or not raw_text.strip():
        return {"response": raw_text}

    text = raw_text.strip()

    # Try direct JSON parse first
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "response" in parsed:
            return parsed
    except (json.JSONDecodeError, ValueError):
        pass

    # Try extracting JSON from markdown code blocks
    code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if code_block_match:
        try:
            parsed = json.loads(code_block_match.group(1))
            if isinstance(parsed, dict) and "response" in parsed:
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass

    # Try finding a JSON object anywhere in the text
    brace_match = re.search(r'\{[^{}]*"response"[^{}]*\}', text, re.DOTALL)
    if not brace_match:
        # Try nested braces
        brace_match = re.search(r'\{.*"response".*\}', text, re.DOTALL)

    if brace_match:
        try:
            parsed = json.loads(brace_match.group(0))
            if isinstance(parsed, dict) and "response" in parsed:
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass

    # Fallback: return raw text as the response
    logger.warning(f"Could not parse structured JSON from AI response, using raw text")
    return {"response": text}


async def _auto_save_memories(
    user_message: str,
    ai_response: str,
    session_id: str,
    character_name: Optional[str]
):
    """Automatically save important game events to memory"""
    
    # Save user action
    memory_store.add_memory(
        content=f"Player action: {user_message}",
        memory_type="player_action",
        session_id=session_id,
        metadata={"character": character_name} if character_name else None
    )
    
    # Save AI response as plot point
    memory_store.add_memory(
        content=f"DM response: {ai_response}",
        memory_type="plot_point",
        session_id=session_id,
        metadata={}
    )


@app.post("/memory/add", response_model=AddMemoryResponse, tags=["Memory"])
async def add_memory(
    request: AddMemoryRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """Manually add a memory to the database"""
    
    if not memory_store:
        raise HTTPException(status_code=503, detail="Memory system not initialized")
    
    try:
        memory_id = memory_store.add_memory(
            content=request.content,
            memory_type=request.memory_type,
            session_id=request.session_id,
            metadata=request.metadata
        )
        
        return AddMemoryResponse(
            memory_id=memory_id,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Add memory error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/retrieve", response_model=RetrieveMemoriesResponse, tags=["Memory"])
async def retrieve_memories(
    request: RetrieveMemoriesRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """Retrieve relevant memories"""
    
    if not memory_store:
        raise HTTPException(status_code=503, detail="Memory system not initialized")
    
    try:
        memories = memory_store.retrieve_memories(
            query=request.query,
            session_id=request.session_id,
            memory_types=request.memory_types,
            top_k=request.top_k
        )
        
        return RetrieveMemoriesResponse(
            memories=memories,
            count=len(memories)
        )
        
    except Exception as e:
        logger.error(f"Retrieve memories error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/session/{session_id}", tags=["Session"])
async def delete_session(
    session_id: str,
    authenticated: bool = Depends(verify_api_key)
):
    """Delete a session and all its memories"""
    
    # Delete from memory store
    if memory_store:
        count = memory_store.delete_session_memories(session_id)
    else:
        count = 0
    
    # Delete from session storage
    if session_id in sessions:
        del sessions[session_id]
    
    return {
        "success": True,
        "session_id": session_id,
        "memories_deleted": count
    }


@app.get("/session/{session_id}", tags=["Session"])
async def get_session(
    session_id: str,
    authenticated: bool = Depends(verify_api_key)
):
    """Get session information"""
    
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    return {
        "session_id": session_id,
        "message_count": len(session["messages"]),
        "created_at": session["created_at"],
        "messages": session["messages"]
    }


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
