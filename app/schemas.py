"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class GameEventRequest(BaseModel):
    """Request for a structured game event"""
    session_id: str = Field(..., description="Unique session identifier")
    event_type: str = Field(..., description="Event type (game_start, turn_action, encounter_end, shop_intro, chat)")
    message: Optional[str] = Field(None, description="Event summary or player message")
    data: Optional[Dict[str, Any]] = Field(None, description="Structured event data")
    character_name: Optional[str] = Field(None, description="Player character name")
    use_memory: bool = Field(True, description="Whether to use RAG memory retrieval")
    scenario_type: Optional[str] = Field(None, description="Scenario type for system prompt")

    # Generation parameters (optional overrides)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=50, le=4096)


class GameEventResponse(BaseModel):
    """Response from a structured game event"""
    response: str = Field(..., description="AI's narrative response")
    session_id: str = Field(..., description="Session identifier")
    event_type: str = Field(..., description="Event type")
    location: Optional[str] = Field(None, description="Scene location key (e.g. warehouse, sewer, city_square)")
    attribute: Optional[str] = Field(None, description="Attribute for decision making (e.g. politician, banker, navigator)")
    start_combat: bool = Field(False, description="Whether combat should start after this response")
    options: Optional[List[str]] = Field(None, description="Array of option strings for player choice buttons")
    tokens_generated: Optional[int] = Field(None, description="Number of tokens generated")
    memories_used: int = Field(0, description="Number of memories retrieved")
    processing_time: float = Field(..., description="Processing time in seconds")


class MemoryItem(BaseModel):
    """Single memory item"""
    content: str = Field(..., description="Memory content")
    memory_type: str = Field(..., description="Type: npc, location, plot_point, etc.")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class AddMemoryRequest(BaseModel):
    """Request to add a memory"""
    session_id: str = Field(..., description="Session identifier")
    content: str = Field(..., description="Memory content")
    memory_type: str = Field(..., description="Memory type")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class AddMemoryResponse(BaseModel):
    """Response from adding a memory"""
    memory_id: str = Field(..., description="Unique memory identifier")
    success: bool = Field(..., description="Whether memory was added successfully")


class RetrieveMemoriesRequest(BaseModel):
    """Request to retrieve memories"""
    session_id: str = Field(..., description="Session identifier")
    query: str = Field(..., description="Search query")
    memory_types: Optional[List[str]] = Field(None, description="Filter by types")
    top_k: int = Field(5, ge=1, le=20, description="Number of results")


class RetrieveMemoriesResponse(BaseModel):
    """Response from memory retrieval"""
    memories: List[Dict[str, Any]] = Field(..., description="Retrieved memories")
    count: int = Field(..., description="Number of memories returned")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    gpu_available: bool = Field(..., description="Whether GPU is available")
    vram_stats: Optional[Dict[str, float]] = Field(None, description="VRAM statistics")
    memory_stats: Optional[Dict[str, Any]] = Field(None, description="Memory database stats")


class SessionInfo(BaseModel):
    """Information about a game session"""
    session_id: str
    created_at: Optional[datetime] = None
    total_messages: int = 0
    total_memories: int = 0


class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional details")
