from pydantic_settings import BaseSettings
from typing import Literal
import os

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./gradeops.db")
    
    # API
    api_title: str = "GRADEOPS API"
    api_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # CORS
    cors_origins: list[str] = ["*"]
    
    # File Storage
    upload_dir: str = "uploads"
    artifacts_dir: str = "artifacts"
    max_upload_size: int = 100 * 1024 * 1024  # 100MB
    
    # AI Models
    vlm_model: str = "nvidia/llama-32-vision"
    llm_model: str = "nvidia/llama-3.1-70b-instruct"

    # NVIDIA NIM Configuration
    nvidia_nim_api_key: str = os.getenv("NVIDIA_NIM_API_KEY", "")
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    
    # Processing
    num_workers: int = 4
    request_timeout: int = 300
    
    # Plagiarism Detection Threshold
    similarity_threshold: float = 0.85
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
