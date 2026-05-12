try:
    from pydantic_settings import BaseSettings
except Exception:
    try:
        from pydantic import BaseSettings  # fallback for older pydantic
    except Exception:
        raise ImportError("pydantic-settings is required. Run `pip install pydantic-settings`.")


class Settings(BaseSettings):
    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017/alacakai"

    # Auth
    secret_key: str = "change_me_dev"
    access_token_expire_minutes: int = 60

    # LLM (single backend, multiple personas)
    llm_api_url: str | None = None             # e.g. http://localhost:11434
    llm_text_model: str | None = None          # e.g. qwen2.5:7b
    llm_vision_model: str | None = None        # e.g. qwen2.5vl:7b

    # Vision & OCR
    google_api_key: str | None = None          # Gemini Vision API (fatura OCR)
    ocr_space_api_key: str | None = None
    # Enable Gemini for OCR if API key present
    use_gemini_vision: bool = True             # toggle Gemini Vision for invoice OCR


    # WhatsApp via Node.js microservice (whatsapp-service/)
    whatsapp_api_url: str | None = None        # e.g. http://localhost:3001
    whatsapp_api_token: str | None = None
    # Legacy aliases — kept so an older .env still loads
    wppconnect_url: str | None = None
    wppconnect_session: str | None = None
    wppconnect_token: str | None = None

    class Config:
        env_file = "app/.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
