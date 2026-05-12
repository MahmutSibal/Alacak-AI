from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class KullaniciInDB(BaseModel):
    id: str | None = Field(None, alias="_id")
    isim: str
    email: EmailStr
    hashed_password: str
    rol: str = "user"
    sirket_adi: str | None = None
    olusturulma_tarihi: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_schema_extra": {"example": {"isim": "ACME", "email": "info@acme.com", "sirket_adi": "ACME"}}}
