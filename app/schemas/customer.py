"""Pydantic schemas for customer CRUD.

KOBİ alacak takibinde müşteri = "borçlu firma/kişi". Telefon kritik çünkü
Communication Agent WhatsApp üzerinden iletişim kuruyor — telefon yoksa
hatırlatma mesajı gönderilemez.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


CustomerType = Literal["kurumsal", "bireysel"]
SectorChoice = Literal[
    "insaat",
    "perakende",
    "uretim",
    "hizmet",
    "tarim",
    "lojistik",
    "teknoloji",
    "saglik",
    "egitim",
    "diger",
]


class RiskSummary(BaseModel):
    risk_score: int = 0
    payment_probability: float | None = None
    recommended_action: str | None = None


class MusteriCreate(BaseModel):
    """Manuel müşteri kayıt payload'ı."""

    isim: str = Field(..., min_length=1, max_length=200)
    musteri_tipi: CustomerType = "kurumsal"

    # Communication channels
    email: EmailStr | None = None
    telefon: str | None = Field(default=None, max_length=20, description="Ana telefon (E.164 önerilir)")
    whatsapp: str | None = Field(default=None, max_length=20, description="Boşsa telefon kullanılır")

    # Tax & legal
    vergi_no: str | None = Field(default=None, max_length=20)
    vergi_dairesi: str | None = Field(default=None, max_length=120)

    # Address
    adres: str | None = Field(default=None, max_length=500)
    sehir: str | None = Field(default=None, max_length=80)

    # Business context
    sektor: SectorChoice | None = None
    yetkili_kisi: str | None = Field(default=None, max_length=120, description="İrtibat kurulacak kişi")

    # Financial setup
    kredi_limiti: float | None = Field(default=None, ge=0)
    odeme_vadesi_gun: int | None = Field(default=30, ge=0, le=365)
    acik_borc: float = Field(default=0, ge=0)

    notlar: str | None = Field(default=None, max_length=2000)
    is_critical: bool = False

    @field_validator("telefon", "whatsapp", "vergi_no")
    @classmethod
    def strip_separators(cls, v: str | None) -> str | None:
        """Allow user-friendly input ('+90 555 123 45 67') but normalize stored value."""
        if v is None:
            return v
        return v.strip()

    @field_validator("vergi_no")
    @classmethod
    def vergi_no_digits(cls, v: str | None) -> str | None:
        if v in (None, ""):
            return None
        digits = re.sub(r"\D", "", v)
        # 10 haneli vergi no ve 11 haneli T.C. kimlik no'yu kabul et
        if len(digits) not in (10, 11):
            raise ValueError("Vergi No 10, T.C. Kimlik 11 hane olmalı")
        return digits


class MusteriUpdate(BaseModel):
    """Kısmi güncelleme — her alan opsiyonel."""

    isim: str | None = None
    musteri_tipi: CustomerType | None = None
    email: EmailStr | None = None
    telefon: str | None = None
    whatsapp: str | None = None
    vergi_no: str | None = None
    vergi_dairesi: str | None = None
    adres: str | None = None
    sehir: str | None = None
    sektor: SectorChoice | None = None
    yetkili_kisi: str | None = None
    kredi_limiti: float | None = None
    odeme_vadesi_gun: int | None = None
    acik_borc: float | None = None
    notlar: str | None = None
    is_critical: bool | None = None


class MusteriRead(BaseModel):
    id: str | None = None
    isim: str
    musteri_tipi: CustomerType | None = "kurumsal"
    email: str | None = None
    telefon: str | None = None
    whatsapp: str | None = None
    vergi_no: str | None = None
    vergi_dairesi: str | None = None
    adres: str | None = None
    sehir: str | None = None
    sektor: str | None = None
    yetkili_kisi: str | None = None
    kredi_limiti: float | None = None
    odeme_vadesi_gun: int | None = None
    acik_borc: float = 0
    notlar: str | None = None
    is_critical: bool = False
    risk: RiskSummary | None = None
    created_at: datetime | str | None = None

    model_config = {"from_attributes": True}
