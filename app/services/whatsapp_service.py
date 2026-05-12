"""HTTP client for the Node.js WhatsApp microservice.

Architecture: this Python class is just a thin client. The real WhatsApp
logic lives in `whatsapp-service/` (Node.js + @wppconnect-team/wppconnect).
We talk to it over HTTP with a bearer token.

Env contract:
    WHATSAPP_API_URL    e.g. http://localhost:3001
    WHATSAPP_API_TOKEN  shared secret matching the Node.js API_TOKEN

Legacy fallback: WPPCONNECT_URL / WPPCONNECT_TOKEN are also accepted so an
existing .env from the previous wppconnect-server setup keeps working.
"""

from __future__ import annotations

import os
import re
from typing import Any

try:
    import httpx
except Exception:
    httpx = None

from ..config import settings


class WhatsAppNotConfigured(RuntimeError):
    """Raised when the WhatsApp microservice URL or token is missing."""


def _normalize_phone(phone: str) -> str:
    """Strip non-digits. wppconnect accepts a plain digit string and adds @c.us itself."""
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        raise ValueError("invalid phone")
    if digits.startswith("0") and len(digits) == 11:
        digits = "90" + digits[1:]
    return digits


class WhatsAppService:
    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
    ):
        # Pydantic Settings reads app/.env into the `settings` object but does NOT
        # push it into os.environ — so we have to consult both. OS env wins so a
        # shell `set WHATSAPP_API_URL=...` overrides the dotenv file.
        self.base_url = (
            base_url
            or os.getenv("WHATSAPP_API_URL")
            or os.getenv("WPPCONNECT_URL")
            or getattr(settings, "whatsapp_api_url", None)
            or getattr(settings, "wppconnect_url", None)
            or ""
        ).rstrip("/")
        self.token = (
            token
            or os.getenv("WHATSAPP_API_TOKEN")
            or os.getenv("WPPCONNECT_TOKEN")
            or getattr(settings, "whatsapp_api_token", None)
            or getattr(settings, "wppconnect_token", None)
            or ""
        )

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.token and httpx is not None)

    def _ensure(self) -> None:
        if not self.base_url:
            raise WhatsAppNotConfigured("WHATSAPP_API_URL ortam değişkeni tanımlı değil")
        if not self.token:
            raise WhatsAppNotConfigured("WHATSAPP_API_TOKEN ortam değişkeni tanımlı değil")
        if httpx is None:
            raise WhatsAppNotConfigured("httpx yüklü değil")

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    async def status(self) -> dict[str, Any]:
        """Return the wppconnect session state. Frontend polls this."""
        self._ensure()
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/session/status", headers=self._headers())
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text}
        return {
            "connected": bool(data.get("connected")),
            "state": data.get("state", "unknown"),
            "session": data.get("session"),
            "has_qr": bool(data.get("hasQr")),
            "profile": data.get("profile"),
            "last_error": data.get("lastError"),
        }

    async def get_qr(self) -> dict[str, Any]:
        """Latest QR (base64 PNG). Returns {"qr": ...} or 404-like dict."""
        self._ensure()
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/session/qr", headers=self._headers())
        if resp.status_code == 404:
            return {"qr": None, "state": "no_qr"}
        try:
            return resp.json()
        except Exception:
            return {"qr": None, "raw": resp.text}

    async def start_session(self) -> dict[str, Any]:
        """Trigger session boot. Non-blocking: returns immediately, poll status afterwards."""
        self._ensure()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{self.base_url}/session/start", headers=self._headers(), json={})
        try:
            return resp.json()
        except Exception:
            return {"raw": resp.text, "status_code": resp.status_code}

    async def stop_session(self) -> dict[str, Any]:
        self._ensure()
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{self.base_url}/session/stop", headers=self._headers(), json={})
        try:
            return resp.json()
        except Exception:
            return {"raw": resp.text, "status_code": resp.status_code}

    async def send_text(self, phone: str, message: str) -> dict[str, Any]:
        self._ensure()
        if not message:
            raise ValueError("message is empty")
        payload = {"phone": _normalize_phone(phone), "message": message}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/messages/send",
                headers=self._headers(),
                json=payload,
            )
        if resp.status_code >= 400:
            try:
                err = resp.json()
            except Exception:
                err = {"error": resp.text[:200]}
            raise RuntimeError(f"whatsapp send failed ({resp.status_code}): {err}")
        try:
            return resp.json()
        except Exception:
            return {"raw": resp.text, "status_code": resp.status_code}
