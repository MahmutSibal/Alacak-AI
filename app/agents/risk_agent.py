"""Risk Agent — credit-risk persona.

Scores a customer 0-100 based on payment history, overdue days, and recent
invoice activity. Writes the resulting risk object back onto the customer
document so the dashboard can read it without re-querying the LLM.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId

from ..database import get_db
from .base import call_persona, log_agent_event
from .personas import Persona


class RiskAgent:
    def __init__(self):
        self.db = get_db()

    @staticmethod
    def _clamp_score(v: Any, default: int = 50) -> int:
        """LLM bazen 105 veya -10 dönebiliyor; 0-100 aralığına sıkıştır."""
        try:
            n = int(round(float(v)))
        except Exception:
            return default
        return max(0, min(100, n))

    async def analyze_customer(self, customer_id: str, context: dict[str, Any]) -> dict:
        prompt = (
            "Aşağıdaki müşteri verilerini analiz et ve şu şemada JSON döndür:\n"
            '{"risk_score": <0-100 tam sayı>, "payment_probability": <0.0-1.0 ondalık>, '
            '"recommended_action": "<kısa Türkçe öneri, en fazla 100 karakter>", '
            '"signals": ["<gerekçe1>", "<gerekçe2>"]}\n\n'
            f"Müşteri ID: {customer_id}\n"
            f"Veri: {context}\n\n"
            "Sadece JSON döndür."
        )
        result = await call_persona(Persona.RISK, prompt)

        if not result["ok"]:
            await log_agent_event(
                "risk",
                persona=Persona.RISK,
                message="risk analizi başarısız",
                meta={"customer_id": customer_id, "error": result["error"]},
            )
            return {"error": result["error"], "raw": result.get("raw", "")}

        out = dict(result["data"]) if isinstance(result["data"], dict) else {}
        out["risk_score"] = self._clamp_score(out.get("risk_score"), default=50)
        try:
            pp = float(out.get("payment_probability", 0.5))
            out["payment_probability"] = max(0.0, min(1.0, pp))
        except Exception:
            out["payment_probability"] = 0.5

        # Diff calculation — fetch the previous score before overwriting
        previous_score = None
        try:
            existing = await self.db.customers.find_one(
                {"_id": ObjectId(customer_id)},
                {"risk.risk_score": 1},
            )
            if existing and isinstance(existing.get("risk"), dict):
                previous_score = existing["risk"].get("risk_score")
        except Exception:
            pass

        out["previous_risk_score"] = previous_score
        if isinstance(previous_score, (int, float)):
            out["delta"] = out["risk_score"] - int(previous_score)
        else:
            out["delta"] = 0

        await log_agent_event(
            "risk",
            persona=Persona.RISK,
            message=f"müşteri risk skoru: {out['risk_score']} (Δ {out['delta']:+d})",
            meta={"customer_id": customer_id, "result": out},
        )

        try:
            await self.db.customers.update_one(
                {"_id": ObjectId(customer_id)},
                {"$set": {"risk": out, "risk_updated_at": datetime.utcnow()}},
                upsert=False,
            )
        except Exception:
            pass

        return out
