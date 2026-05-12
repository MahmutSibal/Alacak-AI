from pydantic import BaseModel, EmailStr

class KullaniciCreate(BaseModel):
    isim: str
    email: EmailStr
    sifre: str
    sirket_adi: str | None = None


class YetkiliCreate(BaseModel):
    isim: str
    email: EmailStr
    sifre: str
    rol: str
    sirket_adi: str | None = None
    telefon: str | None = None

class KullaniciRead(BaseModel):
    id: str | None
    isim: str
    email: EmailStr
    rol: str
    telefon: str | None = None
    sirket_adi: str | None = None

    model_config = {"from_attributes": True}
