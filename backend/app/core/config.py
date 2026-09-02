import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Lao Sacred Language Translator"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lslt_database.db")
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")
    
    # Model defaults
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "gemini") # gemini, openai, claude
    DEFAULT_GEMINI_MODEL: str = "gemini-2.5-flash"
    DEFAULT_OPENAI_MODEL: str = "gpt-4o-mini"
    DEFAULT_CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    
    # Embeddings config
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local") # local (TF-IDF), gemini, openai

    # Google OAuth (Gemini 구독 연동) — backend/.env 에서 로드
    GEMINI_OAUTH_CLIENT_ID: str = os.getenv("GEMINI_OAUTH_CLIENT_ID", "")
    GEMINI_OAUTH_CLIENT_SECRET: str = os.getenv("GEMINI_OAUTH_CLIENT_SECRET", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
