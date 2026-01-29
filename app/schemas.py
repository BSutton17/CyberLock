"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class Message(BaseModel):
    """Single message in a conversation"""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request for chat completion"""
    session_id: str = Field(..., description="Unique session identifier")
    message: str = Field(..., description="User's message/action")
    character_name: Optional[str] = Field(None, description="Player character name")
    use_memory: bool = Field(True, description="Whether to use RAG memory retrieval")
    scenario_type: Optional[str] = Field(None, description="Scenario type for system prompt")
    
    # Generation parameters (optional overrides)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=50, le=4096)


class ChatResponse(BaseModel):
    """Response from chat completion"""
    response: str = Field(..., description="AI's response")
    session_id: str = Field(..., description="Session identifier")
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
