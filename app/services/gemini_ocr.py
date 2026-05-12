"""Gemini Vision API OCR integration for invoice extraction."""

from __future__ import annotations

import base64
import json
from pathlib import Path

import google.generativeai as genai

from ..config import settings


def _init_gemini():
    """Initialize Gemini API client if key is available."""
    if not settings.google_api_key:
        return None
    try:
        genai.configure(api_key=settings.google_api_key)
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        return None


def _image_to_base64(image_path: str) -> str:
    """Convert image file to base64 for Gemini API."""
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


async def extract_text_with_gemini(image_paths: list[str]) -> str:
    """Extract raw OCR text from invoice images using Gemini Vision API."""
    model = _init_gemini()
    if not model:
        return ""
    
    try:
        # Combine all images into one prompt
        prompt = (
            "Bu Türkçe ticari faturalarının metni okunacak. Her sayfadaki TÜM metni "
            "satır satır, olduğu gibi oku. Hiçbir JSON, açıklama, yorum ekleme. "
            "Sayıları, ₺, %, . gibi karakterleri koru.\n\n"
            "Metin:"
        )
        
        # Build multimodal message with images
        content = [{"type": "text", "text": prompt}]
        
        for img_path in image_paths:
            ext = Path(img_path).suffix.lower()
            if ext in (".jpg", ".jpeg"):
                mime = "image/jpeg"
            elif ext == ".png":
                mime = "image/png"
            elif ext == ".gif":
                mime = "image/gif"
            elif ext == ".webp":
                mime = "image/webp"
            else:
                continue
            
            b64 = _image_to_base64(img_path)
            content.append({
                "type": "image",
                "image": {
                    "mime_type": mime,
                    "data": b64
                }
            })
        
        response = model.generate_content(content)
        text = response.text.strip() if response.text else ""
        return text if len(text) >= 20 else ""
    except Exception:
        return ""


async def extract_invoice_fields_with_gemini(image_paths: list[str]) -> dict:
    """Extract structured invoice fields using Gemini Vision API."""
    model = _init_gemini()
    if not model:
        return {"error": "gemini_api_key_not_configured"}
    
    try:
        prompt = (
            "Bu Türkçe ticari fatura resimlerinden aşağıdaki bilgileri çıkar. "
            "SADECE geçerli JSON döndür, başka hiçbir metin yazma:\n\n"
            "{\n"
            '  "fatura_no": "string",\n'
            '  "tutar": "number (TL cinsinden)",\n'
            '  "para_birimi": "TRY|USD|EUR",\n'
            '  "vade_tarihi": "YYYY-MM-DD",\n'
            '  "duzenleme_tarihi": "YYYY-MM-DD",\n'
            '  "firma_adi": "satıcı firma adı",\n'
            '  "vergi_no": "satıcı vergi/T.C. kimlik no",\n'
            '  "kdv_orani": "int %",\n'
            '  "kdv_tutari": "number (TL)",\n'
            '  "ara_toplam": "number (KDV hariç)"\n'
            "}\n\n"
            "Bilgi okunamıyorsa o alana null koy. Yalnızca JSON döndür."
        )
        
        content = [{"type": "text", "text": prompt}]
        
        for img_path in image_paths:
            ext = Path(img_path).suffix.lower()
            if ext in (".jpg", ".jpeg"):
                mime = "image/jpeg"
            elif ext == ".png":
                mime = "image/png"
            elif ext == ".gif":
                mime = "image/gif"
            elif ext == ".webp":
                mime = "image/webp"
            else:
                continue
            
            b64 = _image_to_base64(img_path)
            content.append({
                "type": "image",
                "image": {
                    "mime_type": mime,
                    "data": b64
                }
            })
        
        response = model.generate_content(content)
        text = response.text.strip() if response.text else ""
        
        # Extract JSON from response (handle markdown code blocks)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        data = json.loads(text)
        
        # Normalize field types
        if isinstance(data.get("tutar"), str):
            try:
                data["tutar"] = float(data["tutar"])
            except Exception:
                pass
        
        if isinstance(data.get("kdv_tutari"), str):
            try:
                data["kdv_tutari"] = float(data["kdv_tutari"])
            except Exception:
                pass
        
        if isinstance(data.get("ara_toplam"), str):
            try:
                data["ara_toplam"] = float(data["ara_toplam"])
            except Exception:
                pass
        
        if isinstance(data.get("kdv_orani"), str):
            try:
                data["kdv_orani"] = int(data["kdv_orani"])
            except Exception:
                pass
        
        return data
    except Exception as e:
        return {"error": str(e)}
