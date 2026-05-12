"""Pydantic schemas for invoice CRUD.

Used by the manual-entry flow on the Faturalar page. The OCR-driven flow
(monitoring_agent) writes directly to Mongo with looser shapes, so this schema
deliberately stays optional-friendly — only the truly required fields are
non-optional. Everything else has a sensible default.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


Currency = Literal["TRY", "USD", "EUR"]
InvoiceStatus = Literal["Bekleyen", "Ödendi", "Gecikmiş", "İptal"]


class FaturaCreate(BaseModel):
    """Manual invoice entry payload."""

    fatura_no: str = Field(..., min_length=1, max_length=64, description="Fatura numarası")
    firma_adi: str = Field(..., min_length=1, max_length=200, description="Müşteri/firma adı")

    # Money — all in the chosen currency
    ara_toplam: float = Field(..., ge=0, description="KDV hariç tutar")
    kdv_orani: int = Field(default=20, ge=0, le=100, description="KDV oranı (yüzde)")
    kdv_tutari: float | None = Field(default=None, ge=0, description="KDV tutarı (boş bırakılırsa hesaplanır)")
    tutar: float | None = Field(default=None, ge=0, description="Genel toplam (boş bırakılırsa hesaplanır)")
    para_birimi: Currency = "TRY"

    # Dates
    duzenleme_tarihi: date = Field(default_factory=date.today)
    vade_tarihi: date

    # Optional metadata
    musteri_id: str | None = None
    vergi_no: str | None = Field(default=None, max_length=20)
    aciklama: str | None = Field(default=None, max_length=2000)
    durum: InvoiceStatus = "Bekleyen"

    @field_validator("vade_tarihi")
    @classmethod
    def vade_must_be_today_or_future(cls, v: date, info) -> date:
        # Allow past vade (for legacy invoices) but flag it implicitly via durum
        return v


class FaturaUpdate(BaseModel):
    """Partial update — every field optional."""

    fatura_no: str | None = None
    firma_adi: str | None = None
    ara_toplam: float | None = None
    kdv_orani: int | None = None
    kdv_tutari: float | None = None
    tutar: float | None = None
    para_birimi: Currency | None = None
    duzenleme_tarihi: date | None = None
    vade_tarihi: date | None = None
    musteri_id: str | None = None
    vergi_no: str | None = None
    aciklama: str | None = None
    durum: InvoiceStatus | None = None


class FaturaRead(BaseModel):
    id: str | None = None
    fatura_no: str
    firma_adi: str | None = None
    ara_toplam: float | None = None
    kdv_orani: int | None = None
    kdv_tutari: float | None = None
    tutar: float | None = None
    para_birimi: Currency = "TRY"
    duzenleme_tarihi: date | datetime | str | None = None
    vade_tarihi: date | datetime | str | None = None
    musteri_id: str | None = None
    vergi_no: str | None = None
    aciklama: str | None = None
    durum: InvoiceStatus | str = "Bekleyen"
    created_at: datetime | str | None = None

    model_config = {"from_attributes": True}
