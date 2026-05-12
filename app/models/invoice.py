from pydantic import BaseModel, Field
from datetime import date

class FaturaInDB(BaseModel):
    id: str | None = Field(None, alias="_id")
    fatura_no: str
    tutar: float
    vade_tarihi: date
    musteri_id: str
    vergi_no: str | None = None
    ocr_raw: str | None = None

    model_config = {"json_schema_extra": {"example": {"fatura_no": "INV-2026-001", "tutar": 12500.5}}}
