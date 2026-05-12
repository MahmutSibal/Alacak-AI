"""OCR pipeline.

Strategy (in order):
    1. Vision LLM (Qwen-VL / LLaVA via Ollama) — primary; needs no system binaries
    2. OCR.Space HTTP API — fallback
    3. Local Tesseract — only if installed; never required to be present

PDF handling: PyMuPDF (`fitz`) renders pages to PNG entirely in Python — no
poppler binary required. This was a key blocker on the user's box where
neither tesseract nor poppler are installed.

The vision-LLM path can return either raw OCR text or a structured JSON that
the monitoring agent passes through. Use `extract_text` for plain text or
`extract_invoice_fields` for one-shot vision-to-fields extraction.
"""

from __future__ import annotations

import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from PIL import Image

try:
    import pytesseract  # optional
except Exception:
    pytesseract = None

try:
    import fitz  # PyMuPDF — pure-python PDF rasterizer
except Exception:
    fitz = None

try:
    from pdf2image import convert_from_path  # optional, requires poppler
except Exception:
    convert_from_path = None

import requests

from ..agents.llm_client import generate_with_image
from ..config import settings
from .gemini_ocr import extract_text_with_gemini, extract_invoice_fields_with_gemini


_executor = ThreadPoolExecutor(max_workers=4)


# ---------------------------------------------------------------------------
# PDF -> images (poppler-free path via PyMuPDF)
# ---------------------------------------------------------------------------

def _pdf_to_images_pymupdf(pdf_path: str, dpi: int = 200) -> list[str]:
    """Render every PDF page to a temp PNG and return the file paths."""
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is not installed")
    doc = fitz.open(pdf_path)
    out: list[str] = []
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        tmp = tempfile.NamedTemporaryFile(prefix=f"pg{i}_", suffix=".png", delete=False)
        tmp.close()
        pix.save(tmp.name)
        out.append(tmp.name)
    doc.close()
    return out


def _pdf_to_images_poppler(pdf_path: str, dpi: int = 200) -> list[str]:
    if convert_from_path is None:
        raise RuntimeError("pdf2image/poppler not available")
    images = convert_from_path(pdf_path, dpi=dpi)
    paths: list[str] = []
    for i, img in enumerate(images):
        tmp = tempfile.NamedTemporaryFile(prefix=f"pop{i}_", suffix=".png", delete=False)
        tmp.close()
        img.save(tmp.name, "PNG")
        paths.append(tmp.name)
    return paths


def pdf_to_images(pdf_path: str, dpi: int = 200) -> list[str]:
    """Try PyMuPDF first (no system deps), then poppler. Raises if both fail."""
    if fitz is not None:
        try:
            return _pdf_to_images_pymupdf(pdf_path, dpi=dpi)
        except Exception:
            pass
    if convert_from_path is not None:
        try:
            return _pdf_to_images_poppler(pdf_path, dpi=dpi)
        except Exception:
            pass
    raise RuntimeError("Neither PyMuPDF nor poppler available for PDF rasterization")


def _normalize_image(path: str) -> str:
    """Make sure we have a JPEG/PNG the vision model will accept; downsize huge files."""
    try:
        with Image.open(path) as img:
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            # Cap the long edge at ~2000px so we don't blow the model's context.
            w, h = img.size
            longest = max(w, h)
            if longest > 2000:
                scale = 2000.0 / longest
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            tmp = tempfile.NamedTemporaryFile(prefix="norm_", suffix=".png", delete=False)
            tmp.close()
            img.save(tmp.name, "PNG", optimize=True)
            return tmp.name
    except Exception:
        return path


# ---------------------------------------------------------------------------
# Local Tesseract (only used if explicitly available)
# ---------------------------------------------------------------------------

def _tesseract_image(path: str) -> str:
    if pytesseract is None:
        return ""
    try:
        with Image.open(path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            for lang in ("tur+eng", "tur", "eng"):
                try:
                    text = (pytesseract.image_to_string(img, lang=lang) or "").strip()
                    if len(text) >= 20:
                        return text
                except Exception:
                    continue
        return ""
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# OCR.Space HTTP fallback
# ---------------------------------------------------------------------------

def _ocr_space(path: str) -> str:
    api_key = os.getenv("OCR_SPACE_API_KEY") or getattr(settings, "ocr_space_api_key", None)
    if not api_key:
        return ""
    try:
        with open(path, "rb") as f:
            files = {"file": (os.path.basename(path), f)}
            data = {"apikey": api_key, "language": "tur", "OCREngine": "2"}
            r = requests.post("https://api.ocr.space/parse/image", files=files, data=data, timeout=60)
        j = r.json()
        if j.get("IsErroredOnProcessing"):
            return ""
        parsed = j.get("ParsedResults") or []
        if parsed:
            return (parsed[0].get("ParsedText") or "").strip()
    except Exception:
        return ""
    return ""


# ---------------------------------------------------------------------------
# Vision LLM (primary path)
# ---------------------------------------------------------------------------

_OCR_VISION_PROMPT = (
    "Bu görüntü bir Türkçe ticari fatura veya makbuzdur. Görüntüde yazan TÜM metni "
    "olduğu gibi, satır satır oku ve yalnızca düz metin olarak döndür. JSON, açıklama, "
    "yorum, başlık ekleme. Sayıları ve özel karakterleri (₺, %, .) koru."
)


async def _vision_extract(image_paths: list[str]) -> str:
    """Try Gemini Vision first, then fallback to Ollama vision LLM."""
    # 1. Try Gemini Vision API if configured
    if settings.use_gemini_vision and settings.google_api_key:
        try:
            gemini_text = await extract_text_with_gemini(image_paths)
            if gemini_text and len(gemini_text) >= 20:
                return gemini_text
        except Exception:
            pass
    
    # 2. Fallback to Ollama vision LLM
    res = await generate_with_image(
        prompt=_OCR_VISION_PROMPT,
        image_paths=image_paths,
        temperature=0.0,
    )
    if isinstance(res, dict) and res.get("text"):
        return res["text"].strip()
    return ""


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

async def extract_text(file_path: str) -> str:
    """Extract raw text from an invoice file (PDF or image).

    Tries vision LLM first, then OCR.Space, then local Tesseract.
    Returns "" (empty string) if every backend fails — caller decides how to handle.
    """
    loop = asyncio.get_running_loop()
    ext = Path(file_path).suffix.lower()

    image_paths: list[str] = []
    cleanup: list[str] = []

    if ext == ".pdf":
        try:
            rendered = await loop.run_in_executor(_executor, pdf_to_images, file_path, 200)
            image_paths = rendered
            cleanup.extend(rendered)
        except Exception:
            return ""
    else:
        norm = await loop.run_in_executor(_executor, _normalize_image, file_path)
        image_paths = [norm]
        if norm != file_path:
            cleanup.append(norm)

    try:
        # 1. Vision LLM
        if image_paths:
            try:
                vision_text = await _vision_extract(image_paths)
                if vision_text and len(vision_text) >= 20:
                    return vision_text
            except Exception:
                pass

        # 2. OCR.Space (one image at a time, joined)
        try:
            chunks: list[str] = []
            for p in image_paths:
                t = await loop.run_in_executor(_executor, _ocr_space, p)
                if t:
                    chunks.append(t)
            joined = "\n".join(chunks).strip()
            if len(joined) >= 20:
                return joined
        except Exception:
            pass

        # 3. Tesseract (only if installed)
        if pytesseract is not None:
            try:
                chunks = []
                for p in image_paths:
                    t = await loop.run_in_executor(_executor, _tesseract_image, p)
                    if t:
                        chunks.append(t)
                joined = "\n".join(chunks).strip()
                if len(joined) >= 20:
                    return joined
            except Exception:
                pass

        return ""
    finally:
        for p in cleanup:
            try:
                os.remove(p)
            except Exception:
                pass


_FIELD_PROMPT = (
    "Bu bir Türkçe fatura görselidir. SADECE aşağıdaki şemada GEÇERLİ JSON döndür, "
    "başka hiçbir metin yazma:\n"
    "{\n"
    '  "fatura_no": "<string>",\n'
    '  "tutar": <ondalık sayı, TL>,\n'
    '  "para_birimi": "TRY|USD|EUR",\n'
    '  "vade_tarihi": "YYYY-MM-DD",\n'
    '  "duzenleme_tarihi": "YYYY-MM-DD",\n'
    '  "firma_adi": "<satıcı firma>",\n'
    '  "vergi_no": "<vergi/T.C. kimlik no>",\n'
    '  "kdv_orani": <int>,\n'
    '  "kdv_tutari": <ondalık sayı>,\n'
    '  "ara_toplam": <ondalık sayı>\n'
    "}\n"
    "Bilgi okunamıyorsa o alana null koy."
)


async def extract_invoice_fields(file_path: str) -> dict:
    """One-shot vision-to-fields. Tries Gemini first, then Ollama fallback."""
    loop = asyncio.get_running_loop()
    ext = Path(file_path).suffix.lower()
    image_paths: list[str] = []
    cleanup: list[str] = []

    if ext == ".pdf":
        try:
            rendered = await loop.run_in_executor(_executor, pdf_to_images, file_path, 200)
            image_paths = rendered
            cleanup.extend(rendered)
        except Exception:
            return {"error": "pdf_rasterization_failed"}
    else:
        norm = await loop.run_in_executor(_executor, _normalize_image, file_path)
        image_paths = [norm]
        if norm != file_path:
            cleanup.append(norm)

    try:
        if not image_paths:
            return {"error": "no_image"}
        
        # 1. Try Gemini Vision first
        if settings.use_gemini_vision and settings.google_api_key:
            try:
                result = await extract_invoice_fields_with_gemini(image_paths)
                if result and "error" not in result:
                    return result
            except Exception:
                pass
        
        # 2. Fallback to Ollama vision LLM
        res = await generate_with_image(
            prompt=_FIELD_PROMPT,
            image_paths=image_paths[:1],  # first page is enough for header
            temperature=0.0,
        )
        return res if isinstance(res, dict) else {"error": "bad_response"}
    finally:
        for p in cleanup:
            try:
                os.remove(p)
            except Exception:
                pass
