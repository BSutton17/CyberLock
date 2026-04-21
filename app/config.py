"""
Configuration management for the AI DM API
"""

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
import yaml


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    # Model
    MODEL_NAME: str = "mistralai/Mistral-7B-Instruct-v0.3"
    MODEL_PATH: str = "./models/mistral-7b-instruct-v0.3"
    QUANTIZATION: str = "4bit"  # 4-bit quantization
    MAX_CONTEXT_LENGTH: int = 32000
    TEMPERATURE: float = 0.8
    TOP_P: float = 0.9
    MAX_NEW_TOKENS: int = 2048
    
    # Memory & RAG
    CHROMA_DB_PATH: str = "./data/chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    MEMORY_CONTEXT_SIZE: int = 30
    RAG_TOP_K: int = 5
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Security
    API_KEY: Optional[str] = None
    ENABLE_API_KEY: bool = True  # Enable by default for security
    RATE_LIMIT_REQUESTS: int = 60  # Requests per minute per IP
    RATE_LIMIT_WINDOW: int = 60  # Time window in seconds
    
    # Production settings
    MAX_CONTENT_LENGTH: int = 1024 * 1024  # 1MB max request size
    TRUSTED_HOSTS: str = "localhost,127.0.0.1"  # Comma-separated trusted hosts
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = str(Path(__file__).parent.parent / ".env")
        case_sensitive = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# Global settings instance
settings = Settings()

# Load YAML configuration
CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    GAME_CONFIG = yaml.safe_load(f)
