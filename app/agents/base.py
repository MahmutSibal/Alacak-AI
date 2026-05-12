"""Shared helpers for persona-driven agents."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from ..database import get_db
from .llm_client import generate_text
from .personas import Persona, get_profile


_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)
_FIRST_OBJ_RE = re.compile(r"\{.*\}", re.DOTALL)
_FIRST_ARR_RE = re.compile(r"\[.*\]", re.DOTALL)


def _strip_fences(text: str) -> str:
    m = _FENCE_RE.search(text)
    if m:
        return m.group(1).strip()
    return text.strip()


def parse_json_lenient(text: str) -> Any:
    """Extract a JSON object/array from a free-form LLM response.

    LLMs sometimes ignore "JSON only" instructions and prepend prose or wrap in
    ```json fences. This helper tolerates that, so a small formatting hiccup
    doesn't break the whole agent.
    """
    if not text:
        raise ValueError("empty response")
    candidate = _strip_fences(text)
    try:
        return json.loads(candidate)
    except Exception:
        pass
    obj = _FIRST_OBJ_RE.search(candidate)
    if obj:
        try:
            return json.loads(obj.group(0))
        except Exception:
            pass
    arr = _FIRST_ARR_RE.search(candidate)
    if arr:
        try:
            return json.loads(arr.group(0))
        except Exception:
            pass
    raise ValueError(f"could not parse JSON from: {candidate[:200]}")


async def call_persona(
    persona: Persona,
    user_prompt: str,
    *,
    expect_json: bool = True,
) -> dict:
    """Invoke the LLM with the given persona's system prompt.

    Returns:
        On success (expect_json=True):  {"ok": True, "data": <parsed>, "raw": "..."}
        On parse failure:                {"ok": False, "error": "parse_failed", "raw": "..."}
        On upstream failure:             {"ok": False, "error": "<msg>", "raw": ""}
    """
    profile = get_profile(persona)
    res = await generate_text(
        prompt=user_prompt,
        system=profile.system_prompt,
        temperature=profile.temperature,
    )
    if isinstance(res, dict) and res.get("error"):
        return {"ok": False, "error": str(res["error"]), "raw": ""}

    raw_text = res.get("text", "") if isinstance(res, dict) else str(res)
    if not expect_json:
        return {"ok": True, "data": raw_text, "raw": raw_text}

    try:
        parsed = parse_json_lenient(raw_text)
    except Exception as e:
        return {"ok": False, "error": f"parse_failed: {e}", "raw": raw_text}
    return {"ok": True, "data": parsed, "raw": raw_text}


async def log_agent_event(
    agent: str,
    *,
    message: str | None = None,
    meta: dict | None = None,
    persona: Persona | None = None,
) -> None:
    """Write an entry to the agent_logs collection. Used for the live activity feed."""
    db = get_db()
    doc = {
        "agent": agent,
        "ts": datetime.utcnow(),
    }
    if message is not None:
        doc["message"] = message
    if persona is not None:
        doc["persona"] = persona.value
    if meta:
        doc["meta"] = meta
    try:
        await db.agent_logs.insert_one(doc)
    except Exception:
        pass
