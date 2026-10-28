import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "PropAI - Lyka Realty AI Real Estate Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "lyka_realty_ultra_secure_jwt_secret_key_2026_dubai")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: SQLite default for reliable plug-and-play, supports PostgreSQL seamlessly
    _root_dir: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    _default_db: str = os.path.join(_root_dir, "lyka_realty.db").replace("\\", "/")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{_default_db}")
    
    # AI configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    HUGGINGFACE_API_KEY: Optional[str] = os.getenv("HUGGINGFACE_API_KEY", os.getenv("HF_TOKEN", None))
    HF_TOKEN: Optional[str] = os.getenv("HF_TOKEN", os.getenv("HUGGINGFACE_API_KEY", None))
    HF_MODEL: str = os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-flash-lite-latest")
    USE_LOCAL_LLAMA: bool = os.getenv("USE_LOCAL_LLAMA", "false").lower() in ("true", "1", "yes")
    LOCAL_LLAMA_MODEL: str = os.getenv("LOCAL_LLAMA_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
    
    # Lyka Realty company info
    COMPANY_NAME: str = "Lyka Realty"
    COMPANY_WEBSITE: str = "https://lykarealty.ae"
    COMPANY_PHONE: str = "+971 4 456 7890"
    COMPANY_WHATSAPP: str = "+971 50 123 4567"
    COMPANY_EMAIL: str = "concierge@lykarealty.ae"
    COMPANY_ADDRESS: str = "Office 1002, DAMAC Executive Heights, Barsha Heights, Dubai, UAE"
    DEFAULT_CURRENCY: str = "AED"

settings = Settings()
