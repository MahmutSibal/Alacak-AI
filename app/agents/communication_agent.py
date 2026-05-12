"""Communication Agent — payment-collection writer persona.

Channels: WhatsApp (primary, via wppconnect) and Email. SMS is deprecated.
The agent writes the message; the WhatsApp service ships it.
"""

from __future__ import annotations

from typing import Any, Literal

from ..database import get_db
from ..services.whatsapp_service import WhatsAppService, WhatsAppNotConfigured
from .base import call_persona, log_agent_event
from .personas import Persona

Channel = Literal["whatsapp", "email"]


class CommunicationAgent:
    def __init__(self):
        self.db = get_db()
        self.whatsapp = WhatsAppService()

    @staticmethod
    def _tone_from_risk(risk_score: int) -> str:
        if risk_score < 30:
            return "yumuşak"
        if risk_score < 70:
            return "orta"
        return "sert ama profesyonel"

    async def create_message(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
        channel: Channel = "whatsapp",
    ) -> dict:
        risk = customer.get("risk") or {}
        try:
            score = int(risk.get("risk_score", 50)) if isinstance(risk, dict) else 50
        except Exception:
            score = 50
        tone = self._tone_from_risk(score)

        prompt = (
            f"Kanal: {channel}\n"
            f"Müşteri: {customer.get('isim', 'Sayın Müşteri')}\n"
            f"Açık borç: {context.get('amount', '?')} TL\n"
            f"Vade: {context.get('due_date', '?')}\n"
            f"Risk skoru: {score} (ton: {tone})\n\n"
            "Şu şemada JSON döndür:\n"
            "{\n"
            f'  "channel": "{channel}",\n'
            '  "subject": "<email konusu, whatsapp için boş bırak>",\n'
            '  "body": "<gönderilecek mesaj metni — emojiler kullanma, profesyonel ol>",\n'
            '  "tone": "<yumuşak|orta|sert>"\n'
            "}\nSadece JSON döndür."
        )

        result = await call_persona(Persona.COMMUNICATION, prompt)
        customer_id = str(customer.get("_id", ""))

        if not result["ok"]:
            await log_agent_event(
                "communication",
                persona=Persona.COMMUNICATION,
                message="mesaj üretimi başarısız",
                meta={"customer_id": customer_id, "error": result["error"]},
            )
            return {"error": result["error"], "raw": result.get("raw", "")}

        msg = result["data"]
        msg.setdefault("channel", channel)
        msg.setdefault("tone", tone)

        await log_agent_event(
            "communication",
            persona=Persona.COMMUNICATION,
            message=f"{channel} mesajı hazır ({tone} tonu)",
            meta={"customer_id": customer_id, "channel": channel},
        )
        return msg

    async def send(self, customer: dict[str, Any], message: dict[str, Any]) -> dict:
        """Send a previously generated message. Currently only WhatsApp is wired."""
        channel = message.get("channel", "whatsapp")
        if channel != "whatsapp":
            return {"sent": False, "reason": f"channel '{channel}' is not deliverable from this agent"}

        phone = customer.get("telefon") or customer.get("phone")
        if not phone:
            await log_agent_event(
                "communication",
                persona=Persona.COMMUNICATION,
                message="WhatsApp gönderilemedi: telefon yok",
                meta={"customer_id": str(customer.get("_id", ""))},
            )
            return {"sent": False, "reason": "müşteri telefon numarası eksik"}

        try:
            delivery = await self.whatsapp.send_text(phone, message.get("body", ""))
        except WhatsAppNotConfigured as e:
            await log_agent_event(
                "communication",
                persona=Persona.COMMUNICATION,
                message="WhatsApp servisi yapılandırılmamış",
                meta={"error": str(e)},
            )
            return {"sent": False, "reason": str(e)}
        except Exception as e:
            await log_agent_event(
                "communication",
                persona=Persona.COMMUNICATION,
                message="WhatsApp gönderim hatası",
                meta={"error": str(e)},
            )
            return {"sent": False, "reason": f"whatsapp error: {e}"}

        await log_agent_event(
            "communication",
            persona=Persona.COMMUNICATION,
            message=f"WhatsApp mesajı gönderildi: {phone}",
            meta={"customer_id": str(customer.get("_id", "")), "phone": phone, "delivery": delivery},
        )
        return {"sent": True, "delivery": delivery}

    async def create_and_send(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
        channel: Channel = "whatsapp",
    ) -> dict:
        msg = await self.create_message(customer, context, channel=channel)
        if msg.get("error"):
            return {"message": msg, "delivery": None}
        delivery = await self.send(customer, msg)
        return {"message": msg, "delivery": delivery}
