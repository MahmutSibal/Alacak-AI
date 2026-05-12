"""WhatsApp endpoints — proxy to the Node.js wppconnect microservice."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..agents.communication_agent import CommunicationAgent
from ..database import get_db
from ..services.whatsapp_service import WhatsAppNotConfigured, WhatsAppService
from ..utils.access_control import (
    company_filter,
    get_company_name,
    get_current_user,
    require_roles,
)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

_service = WhatsAppService()
_comm = CommunicationAgent()

WHATSAPP_ADMIN_ROLES = {"admin"}
WHATSAPP_SEND_ROLES = {"admin", "tahsilat_elemani"}


class SendTextPayload(BaseModel):
    phone: str = Field(..., min_length=6)
    message: str = Field(..., min_length=1, max_length=4000)


class GenerateAndSendPayload(BaseModel):
    customer_id: str
    amount: float | None = None
    due_date: str | None = None
    auto_send: bool = True


@router.get("/status")
async def status(request: Request):
    user = await get_current_user(request)
    require_roles(user, WHATSAPP_ADMIN_ROLES)
    if not _service.is_configured:
        return {
            "connected": False,
            "configured": False,
            "reason": "WHATSAPP_API_URL / WHATSAPP_API_TOKEN tanımlı değil",
        }
    try:
        snap = await _service.status()
        return {"configured": True, **snap}
    except WhatsAppNotConfigured as e:
        return {"connected": False, "configured": False, "reason": str(e)}
    except Exception as e:
        return {"connected": False, "configured": True, "reason": f"unreachable: {e}"}


@router.get("/qr")
async def qr(request: Request):
    """Returns latest QR code (base64 PNG) for the dashboard to render."""
    user = await get_current_user(request)
    require_roles(user, WHATSAPP_ADMIN_ROLES)
    try:
        return await _service.get_qr()
    except WhatsAppNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"whatsapp service error: {e}")


@router.post("/start-session")
async def start_session(request: Request):
    user = await get_current_user(request)
    require_roles(user, WHATSAPP_ADMIN_ROLES)
    try:
        return await _service.start_session()
    except WhatsAppNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"whatsapp service error: {e}")


@router.post("/stop-session")
async def stop_session(request: Request):
    user = await get_current_user(request)
    require_roles(user, WHATSAPP_ADMIN_ROLES)
    try:
        return await _service.stop_session()
    except WhatsAppNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"whatsapp service error: {e}")


@router.post("/send")
async def send_text(payload: SendTextPayload, request: Request):
    user = await get_current_user(request)
    require_roles(user, WHATSAPP_SEND_ROLES)
    try:
        return await _service.send_text(payload.phone, payload.message)
    except WhatsAppNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"whatsapp service error: {e}")


@router.post("/remind")
async def generate_and_send(payload: GenerateAndSendPayload, request: Request):
    """Generate a tone-aware payment-reminder message and (optionally) ship it."""
    user = await get_current_user(request)
    require_roles(user, WHATSAPP_SEND_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    from bson import ObjectId
    try:
        customer = await db.customers.find_one({"_id": ObjectId(payload.customer_id), **company_filter(company_name)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz müşteri ID")
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    context = {
        "amount": payload.amount or customer.get("acik_borc") or 0,
        "due_date": payload.due_date or customer.get("son_vade") or "—",
    }

    if payload.auto_send:
        out = await _comm.create_and_send(customer, context, channel="whatsapp")
    else:
        msg = await _comm.create_message(customer, context, channel="whatsapp")
        out = {"message": msg, "delivery": None}
    return out
