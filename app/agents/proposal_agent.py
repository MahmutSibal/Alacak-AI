"""Proposal Agent — restructuring/discount persona.

Generates 3 concrete restructuring proposals (iskonto / taksit / vade_uzatma)
for an overdue invoice. The orchestrator and route layer surface these in the
collection workflow.
"""

from __future__ import annotations

from typing import Any

from ..database import get_db
from .base import call_persona, log_agent_event
from .personas import Persona


class ProposalAgent:
    def __init__(self):
        self.db = get_db()

    async def propose(self, invoice: dict[str, Any], customer: dict[str, Any] | None = None) -> dict:
        risk_score = 50
        if customer and isinstance(customer.get("risk"), dict):
            try:
                risk_score = int(customer["risk"].get("risk_score", 50))
            except Exception:
                risk_score = 50

        prompt = (
            "Geciken bir fatura için 3 yapılandırma teklifi tasarla. Şu şemada JSON döndür:\n"
            "{\n"
            '  "proposals": [\n'
            '    {"tur": "iskonto|taksit|vade_uzatma", "aciklama": "...", "kosul": "...", '
            '"sayisal_etki": "%5 / 3 ay / 14 gün gibi", "gerekce": "..."}\n'
            "  ]\n"
            "}\n\n"
            f"Fatura: {invoice}\n"
            f"Müşteri risk skoru: {risk_score}\n\n"
            "Yüksek risk skorlarında iskonto önceliklidir; düşük risk skorlarında vade uzatma "
            "veya taksit önceliklidir. Sadece JSON döndür."
        )

        result = await call_persona(Persona.PROPOSAL, prompt)

        invoice_id = str(invoice.get("_id") or invoice.get("id") or "")
        if not result["ok"]:
            await log_agent_event(
                "proposal",
                persona=Persona.PROPOSAL,
                message="yapılandırma önerisi başarısız",
                meta={"invoice_id": invoice_id, "error": result["error"]},
            )
            return {"error": result["error"], "raw": result.get("raw", "")}

        proposals = result["data"]
        await log_agent_event(
            "proposal",
            persona=Persona.PROPOSAL,
            message=f"{len(proposals.get('proposals', []))} yapılandırma teklifi üretildi",
            meta={"invoice_id": invoice_id, "proposals": proposals},
        )
        return proposals
