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
    DEFAULT_CLAUDE_MODEL: str = "claude-3-5-haiku"
    
    # Embeddings config
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local") # local (TF-IDF), gemini, openai

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
