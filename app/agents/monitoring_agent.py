"""Monitoring Agent — invoice ingestion (OCR + field extraction).

Pipeline:
    1. Try one-shot vision extraction: image -> structured JSON
    2. If that fails or returns garbage, fall back to OCR text -> LLM JSON parse
    3. Persist result to invoices + agent_logs collections

Note: this agent is not a "persona" — it's an infrastructure pipeline. The
vision and parse calls go through llm_client directly.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from ..database import get_db
from ..services.ocr_service import extract_invoice_fields, extract_text
from .base import log_agent_event, parse_json_lenient
from .llm_client import generate_text


def _is_useful_fields(fields: dict[str, Any]) -> bool:
    """Vision sometimes returns the schema with all-null values. Detect that."""
    if not isinstance(fields, dict):
        return False
    if fields.get("error"):
        return False
    important = ["fatura_no", "tutar", "firma_adi", "vade_tarihi"]
    return any(fields.get(k) not in (None, "", "null") for k in important)


class MonitoringAgent:
    def __init__(self):
        self.db = get_db()

    async def parse_invoice_text(self, raw_text: str) -> dict:
        if not raw_text or not raw_text.strip():
            return {"error": "empty_text"}
        prompt = (
            "Aşağıdaki Türkçe fatura metninden alan çıkarımı yap ve SADECE şu şemada "
            "GEÇERLİ JSON döndür (başka hiçbir şey yazma):\n"
            "{\n"
            '  "fatura_no": "<string>",\n'
            '  "tutar": <ondalık>,\n'
            '  "para_birimi": "TRY|USD|EUR",\n'
            '  "vade_tarihi": "YYYY-MM-DD",\n'
            '  "duzenleme_tarihi": "YYYY-MM-DD",\n'
            '  "firma_adi": "<string>",\n'
            '  "vergi_no": "<string>",\n'
            '  "kdv_orani": <int>,\n'
            '  "kdv_tutari": <ondalık>,\n'
            '  "ara_toplam": <ondalık>\n'
            "}\n"
            "Bilgi okunamıyorsa o alana null koy.\n\n"
            f"METIN:\n{raw_text}\n\nJSON:"
        )
        res = await generate_text(prompt, temperature=0.0)
        if not isinstance(res, dict) or res.get("error"):
            return {"error": str(res)}
        text = res.get("text", "")
        try:
            return parse_json_lenient(text)
        except Exception as e:
            return {"error": f"parse_failed: {e}", "raw": text}

    async def process_file(self, file_path: str, source: str = "upload", sirket_adi: str | None = None) -> dict:
        ts = datetime.utcnow()
        ocr_text = ""
        parsed: dict[str, Any] = {}

        # Step 1 — vision-only one-shot
        try:
            vision = await extract_invoice_fields(file_path)
        except Exception as e:
            vision = {"error": f"vision_failed: {e}"}

        if isinstance(vision, dict) and vision.get("text"):
            try:
                parsed = parse_json_lenient(vision["text"])
            except Exception:
                parsed = {}

        # Step 2 — fallback: OCR text -> structured parse
        if not _is_useful_fields(parsed):
            try:
                ocr_text = await extract_text(file_path)
            except Exception as e:
                ocr_text = f"__ocr_error__:{e}"
            if ocr_text and not ocr_text.startswith("__ocr_error__"):
                parsed = await self.parse_invoice_text(ocr_text)

        if not isinstance(parsed, dict):
            parsed = {"error": "unexpected_parse_result"}

        await log_agent_event(
            "monitoring",
            message="fatura işlendi" if _is_useful_fields(parsed) else "fatura işlenemedi",
            meta={
                "source": source,
                "filename": os.path.basename(file_path),
                "ocr_preview": (ocr_text or "")[:300],
                "parsed_keys": [k for k, v in parsed.items() if v not in (None, "", "null")],
            },
        )

        try:
            doc = {
                "ocr_text": ocr_text,
                "parsed": parsed,
                "source": source,
                "created_at": ts,
                "sirket_adi": sirket_adi,
                "fatura_no": parsed.get("fatura_no"),
                "tutar": parsed.get("tutar"),
                "vade_tarihi": parsed.get("vade_tarihi"),
                "firma_adi": parsed.get("firma_adi"),
                "durum": "Bekliyor",
            }
            await self.db.invoices.insert_one(doc)
        except Exception:
            pass

        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

        return parsed

    async def run_once(self, raw_text: str = "", source: str = "upload", sirket_adi: str | None = None) -> dict:
        if raw_text and os.path.exists(raw_text):
            return await self.process_file(raw_text, source=source, sirket_adi=sirket_adi)
        parsed = await self.parse_invoice_text(raw_text)
        await log_agent_event(
            "monitoring",
            message="manuel metinden çıkarım",
            meta={"source": source, "ok": isinstance(parsed, dict) and not parsed.get("error")},
        )
        return parsed
