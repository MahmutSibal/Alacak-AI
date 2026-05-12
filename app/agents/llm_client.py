"""LLM HTTP client for Ollama / OpenAI-compatible endpoints (text + vision).

The whole platform talks to a single LLM backend. Different "personas" are achieved
through system prompts (see app/agents/personas.py), not separate models.

Supported endpoints:
- Ollama:   POST {base}/api/generate (text + images via base64)
- Ollama:   POST {base}/api/chat (system+user messages)
- Generic:  fallback POST {base} with {prompt, model}
"""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import AsyncGenerator, Optional

try:
    import httpx
except Exception:
    httpx = None

from ..config import settings


def _resolve_base_url() -> Optional[str]:
    return (
        os.getenv("LLM_API_URL")
        or os.getenv("OLLAMA_URL")
        or os.getenv("LLAMA_URL")
        or getattr(settings, "llm_api_url", None)
    )


def _resolve_text_model(model_name: Optional[str]) -> str:
    # Pydantic Settings reads .env into `settings` but doesn't push to os.environ,
    # so we have to consult both. OS env wins so a shell override still works.
    return (
        model_name
        or os.getenv("LLM_TEXT_MODEL")
        or os.getenv("LLM_MODEL")
        or getattr(settings, "llm_text_model", None)
        or "llama3.1:8b"
    )


def _build_options(temperature: float, *, vision: bool = False) -> dict:
    """Ollama runtime options.

    Crucial for performance: shrinking `num_ctx` to a sensible value (default 8K)
    keeps the KV cache small enough that the model fits in 8GB of VRAM. Without
    this, a 7B vision model with the default 128K context spills to ~13GB and
    Ollama drops the entire model onto the CPU — turning a 5-second OCR call
    into a 5-minute one.
    """
    num_ctx = int(os.getenv("LLM_VISION_CTX" if vision else "LLM_CTX", "8192"))
    num_predict = int(os.getenv("LLM_VISION_MAX_TOKENS" if vision else "LLM_MAX_TOKENS", "1024"))
    return {
        "temperature": temperature,
        "num_ctx": num_ctx,
        "num_predict": num_predict,
    }


def _resolve_vision_model(model_name: Optional[str]) -> str:
    return (
        model_name
        or os.getenv("LLM_VISION_MODEL")
        or os.getenv("OCR_VISION_MODEL")
        or getattr(settings, "llm_vision_model", None)
        or "qwen2.5vl:7b"
    )


def _aggregate_ndjson(text: str) -> str:
    parts: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        if isinstance(obj, dict):
            chunk = obj.get("response") or obj.get("text") or ""
            if chunk:
                parts.append(str(chunk))
    return "".join(parts)


def _normalize_response(data) -> Optional[str]:
    """Pull 'text' out of any reasonable LLM JSON shape."""
    if isinstance(data, str):
        if data.lstrip().startswith("{") and "\n" in data:
            agg = _aggregate_ndjson(data)
            if agg:
                return agg
        return data
    if not isinstance(data, dict):
        return None
    # Ollama /api/generate non-streaming
    if isinstance(data.get("response"), str):
        return data["response"]
    # Ollama /api/chat non-streaming
    msg = data.get("message")
    if isinstance(msg, dict) and isinstance(msg.get("content"), str):
        return msg["content"]
    # OpenAI-compatible
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        c = choices[0]
        if isinstance(c, dict):
            m = c.get("message")
            if isinstance(m, dict) and isinstance(m.get("content"), str):
                return m["content"]
            if isinstance(c.get("text"), str):
                return c["text"]
    # Generic flavors
    for key in ("text", "outputText", "output_text"):
        v = data.get(key)
        if isinstance(v, str):
            return v
    result = data.get("result")
    if isinstance(result, dict) and isinstance(result.get("text"), str):
        return result["text"]
    return None


async def generate_text(
    prompt: str,
    model_name: Optional[str] = None,
    temperature: float = 0.2,
    system: Optional[str] = None,
) -> dict:
    """Single-shot text generation. Returns {"text": ...} or {"error": ...}."""
    base = _resolve_base_url()
    if not base or httpx is None:
        return {"error": "LLM HTTP endpoint not configured (set LLM_API_URL/OLLAMA_URL) or httpx missing"}

    base = base.rstrip("/")
    model = _resolve_text_model(model_name)

    # Pick endpoint: /api/chat for system prompts, /api/generate for plain text
    if system:
        url = f"{base}/api/chat"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": _build_options(temperature),
        }
    else:
        url = f"{base}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": _build_options(temperature),
        }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
    except Exception as e:
        return {"error": f"llm http failed: {e}"}

    # Surface the actual upstream payload — e.g. Ollama "model not found" rather
    # than a misleading 405 from a useless fallback POST to the root URL.
    if resp.status_code >= 400:
        try:
            err = resp.json()
            msg = err.get("error") or str(err)
        except Exception:
            msg = resp.text[:300]
        return {"error": f"ollama {resp.status_code}: {msg} (model={model})"}

    try:
        data = resp.json()
    except Exception:
        data = resp.text

    text = _normalize_response(data)
    if text:
        return {"text": text}

    snippet = resp.text[:300] if resp.text else "<empty body>"
    return {"error": f"llm upstream returned unexpected shape: {snippet}"}


async def generate_with_image(
    prompt: str,
    image_paths: list[str],
    model_name: Optional[str] = None,
    temperature: float = 0.0,
    system: Optional[str] = None,
) -> dict:
    """Multimodal generation against a vision model (e.g. qwen2.5vl, llava).

    Uses Ollama's native base64 image support on /api/generate or /api/chat.
    Returns {"text": ...} or {"error": ...}.
    """
    base = _resolve_base_url()
    if not base or httpx is None:
        return {"error": "LLM HTTP endpoint not configured"}

    base = base.rstrip("/")
    model = _resolve_vision_model(model_name)
    timeout_s = float(os.getenv("LLM_VISION_TIMEOUT_S", "60"))

    encoded: list[str] = []
    for p in image_paths:
        try:
            with open(p, "rb") as fh:
                encoded.append(base64.b64encode(fh.read()).decode("ascii"))
        except Exception as e:
            return {"error": f"image read failed: {e}"}

    if not encoded:
        return {"error": "no images provided"}

    if system:
        chat_url = f"{base}/api/chat"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt, "images": encoded},
            ],
            "stream": False,
            "options": _build_options(temperature, vision=True),
        }
        try:
            async with httpx.AsyncClient(timeout=timeout_s) as client:
                resp = await client.post(chat_url, json=payload)
            try:
                data = resp.json()
            except Exception:
                data = resp.text
            text = _normalize_response(data)
            if text:
                return {"text": text}
        except Exception as e:
            return {"error": f"vision chat failed: {e}"}

    gen_url = f"{base}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "images": encoded,
        "stream": False,
        "options": _build_options(temperature, vision=True),
    }
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(gen_url, json=payload)
        try:
            data = resp.json()
        except Exception:
            data = resp.text
        text = _normalize_response(data)
        if text:
            return {"text": text}
        return {"error": f"vision unexpected shape: {str(data)[:200]}"}
    except Exception as e:
        return {"error": f"vision http failed: {e}"}


async def stream_text(
    prompt: str,
    model_name: Optional[str] = None,
    temperature: float = 0.2,
    system: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Streaming generation against Ollama /api/chat (line-delimited JSON)."""
    base = _resolve_base_url()
    if not base or httpx is None:
        yield "__error__:llm_not_configured"
        return

    base = base.rstrip("/")
    model = _resolve_text_model(model_name)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    url = f"{base}/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": _build_options(temperature),
    }
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, json=payload) as resp:
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except Exception:
                        continue
                    if isinstance(obj, dict):
                        msg = obj.get("message")
                        if isinstance(msg, dict) and isinstance(msg.get("content"), str):
                            chunk = msg["content"]
                            if chunk:
                                yield chunk
                        if obj.get("done"):
                            return
    except Exception as e:
        yield f"__error__:{e}"
