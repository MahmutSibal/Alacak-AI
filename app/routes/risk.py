"""Risk analytics — aggregations from real Mongo data + RiskAgent triggers.

Frontend calls these from /risk page. All endpoints fail-soft (return empty
data, never 500) so the dashboard stays usable even when Mongo or the LLM is
having a bad day.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, date
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from ..agents.risk_agent import RiskAgent
from ..database import get_db
from ..utils.access_control import (
    company_filter,
    get_company_name,
    get_current_user,
    RISK_READ_ROLES,
    require_roles,
)
from ..utils.risk_labels import risk_color, risk_label

router = APIRouter(prefix="/risk", tags=["risk"])

_agent = RiskAgent()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_overdue(invoice: dict, today: datetime) -> bool:
    if invoice.get("durum") == "Ödendi":
        return False
    vade = invoice.get("vade_tarihi")
    if isinstance(vade, datetime):
        return vade < today
    if isinstance(vade, date):
        return vade < today.date()
    if isinstance(vade, str):
        try:
            return datetime.fromisoformat(vade.replace("Z", "")) < today
        except Exception:
            return False
    return False


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/distribution")
async def distribution(request: Request) -> dict[str, Any]:
    """Pie chart: how many customers fall into each risk bucket."""
    user = await get_current_user(request)
    require_roles(user, RISK_READ_ROLES)
    company_name = get_company_name(user)
    buckets = {"Kritik": 0, "Yüksek": 0, "Orta": 0, "Düşük": 0}
    colors = {"Kritik": "#EF4444", "Yüksek": "#F97316", "Orta": "#FBBF24", "Düşük": "#22C55E"}

    try:
        db = get_db()
        cursor = db.customers.find(company_filter(company_name), {"risk.risk_score": 1})
        total = 0
        unscored = 0
        async for c in cursor:
            total += 1
            risk = c.get("risk")
            if not isinstance(risk, dict) or risk.get("risk_score") is None:
                unscored += 1
                # Henüz analiz edilmemiş müşterileri "Düşük" varsayma — ayrı sayım
                continue
            buckets[risk_label(int(risk["risk_score"]))] += 1
    except Exception:
        return {
            "data": [{"name": k, "value": 0, "color": colors[k]} for k in buckets],
            "total": 0,
            "scored": 0,
            "unscored": 0,
        }

    data = [{"name": k, "value": v, "color": colors[k]} for k, v in buckets.items()]
    return {
        "data": data,
        "total": total,
        "scored": total - unscored,
        "unscored": unscored,
    }


@router.get("/radar")
async def radar(request: Request) -> dict[str, Any]:
    """Portfolio-level 6-axis risk profile derived from real data.

    Each axis is a 0-100 score where higher = more risk.
    """
    user = await get_current_user(request)
    require_roles(user, RISK_READ_ROLES)
    company_name = get_company_name(user)
    try:
        db = get_db()
        customers = await db.customers.find(company_filter(company_name)).to_list(length=500)
        invoices = await db.invoices.find(company_filter(company_name)).to_list(length=2000)
    except Exception:
        customers, invoices = [], []

    today = datetime.utcnow()
    n_customers = len(customers)
    n_invoices = len(invoices)

    # 1. Gecikme — geciken faturaların oranı
    overdue_count = sum(1 for i in invoices if _is_overdue(i, today))
    delay_score = round((overdue_count / n_invoices) * 100) if n_invoices else 0

    # 2. Ödeme Düzeni — ödenmemiş yüzdesi
    unpaid_count = sum(1 for i in invoices if i.get("durum") != "Ödendi")
    payment_score = round((unpaid_count / n_invoices) * 100) if n_invoices else 0

    # 3. Borç Yoğunluğu — toplam açık borç / toplam kredi limiti
    total_debt = sum(float(c.get("acik_borc") or 0) for c in customers)
    total_limit = sum(float(c.get("kredi_limiti") or 0) for c in customers)
    if total_limit > 0:
        debt_score = min(100, round(total_debt / total_limit * 100))
    elif total_debt > 0:
        debt_score = 50  # limit tanımlı değilse ortada bırak
    else:
        debt_score = 0

    # 4. Sektör Konsantrasyonu — tek sektörde yığılma yüksek risk
    sectors: dict[str, int] = {}
    for c in customers:
        s = c.get("sektor")
        if s:
            sectors[s] = sectors.get(s, 0) + 1
    if n_customers and sectors:
        sector_score = round(max(sectors.values()) / n_customers * 100)
    else:
        sector_score = 0

    # 5. İletişim Riski — ulaşılamayan müşteri yüzdesi
    no_contact = sum(
        1 for c in customers
        if not (c.get("telefon") or c.get("whatsapp") or c.get("email"))
    )
    contact_score = round((no_contact / n_customers) * 100) if n_customers else 0

    # 6. AI Skoru — RiskAgent'ın verdiği ortalama skor
    scored = [
        int(c.get("risk", {}).get("risk_score", 0))
        for c in customers
        if isinstance(c.get("risk"), dict) and c["risk"].get("risk_score") is not None
    ]
    ai_score = round(sum(scored) / len(scored)) if scored else 0

    return {
        "data": [
            {"subject": "Gecikme", "value": delay_score},
            {"subject": "Ödeme Düzeni", "value": payment_score},
            {"subject": "Borç Yoğunluğu", "value": debt_score},
            {"subject": "Sektör Konsantrasyonu", "value": sector_score},
            {"subject": "İletişim", "value": contact_score},
            {"subject": "AI Skoru", "value": ai_score},
        ],
        "context": {
            "customers": n_customers,
            "invoices": n_invoices,
            "scored": len(scored),
            "overdue_invoices": overdue_count,
        },
    }


@router.get("/customers")
async def risk_customers(request: Request, limit: int = 20) -> list[dict[str, Any]]:
    """En riskli N müşteri (skoru yüksekten düşüğe). Henüz skorlanmamış olanları atla."""
    user = await get_current_user(request)
    require_roles(user, RISK_READ_ROLES)
    company_name = get_company_name(user)
    try:
        db = get_db()
        cursor = (
            db.customers.find(
                {**company_filter(company_name), "risk.risk_score": {"$exists": True, "$ne": None}},
                {"isim": 1, "risk": 1, "acik_borc": 1, "sektor": 1},
            )
            .sort("risk.risk_score", -1)
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
    except Exception:
        return []

    out = []
    for d in docs:
        risk = d.get("risk") or {}
        score = int(risk.get("risk_score", 0))
        out.append({
            "id": str(d.get("_id")),
            "isim": d.get("isim", "—"),
            "sektor": d.get("sektor"),
            "acik_borc": d.get("acik_borc", 0),
            "score": score,
            "label": risk_label(score),
            "color": risk_color(score),
            "delta": int(risk.get("delta", 0) or 0),
            "previous_score": risk.get("previous_risk_score"),
            "recommended_action": risk.get("recommended_action"),
            "signals": risk.get("signals") or [],
            "payment_probability": risk.get("payment_probability"),
        })
    return out


@router.post("/analyze/{customer_id}")
async def analyze_one(request: Request, customer_id: str) -> dict[str, Any]:
    """Tek müşteri için RiskAgent çalıştır."""
    user = await get_current_user(request)
    require_roles(user, RISK_READ_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    try:
        oid = ObjectId(customer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz müşteri ID")

    customer = await db.customers.find_one({"_id": oid, **company_filter(company_name)})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    # Müşterinin son 50 faturasını LLM'e bağlam olarak ver
    invoices = await db.invoices.find({"musteri_id": str(oid), **company_filter(company_name)}).sort("created_at", -1).to_list(length=50)
    today = datetime.utcnow()
    overdue = sum(1 for i in invoices if _is_overdue(i, today))
    paid = sum(1 for i in invoices if i.get("durum") == "Ödendi")

    context = {
        "isim": customer.get("isim"),
        "sektor": customer.get("sektor"),
        "acik_borc": customer.get("acik_borc", 0),
        "kredi_limiti": customer.get("kredi_limiti"),
        "fatura_sayisi": len(invoices),
        "geciken": overdue,
        "odenmis": paid,
        "vade_gun": customer.get("odeme_vadesi_gun"),
    }

    result = await _agent.analyze_customer(str(oid), context)
    return {"customer_id": str(oid), "isim": customer.get("isim"), "result": result}


@router.post("/analyze-all")
async def analyze_all(request: Request, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """Tüm müşteriler için RiskAgent'ı arka planda çalıştır.

    Kuyruğa atar ve hemen döner. Frontend agent_logs'tan ilerleyişi izler.
    """
    user = await get_current_user(request)
    require_roles(user, RISK_READ_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    customers = await db.customers.find(company_filter(company_name), {"_id": 1}).to_list(length=500)
    ids = [str(c["_id"]) for c in customers]

    if not ids:
        return {"queued": 0, "message": "Henüz müşteri yok"}

    background_tasks.add_task(_run_bulk_analysis, ids, company_name)
    return {"queued": len(ids), "message": f"{len(ids)} müşteri için risk analizi kuyruklandı"}


async def _run_bulk_analysis(customer_ids: list[str], company_name: str) -> None:
    """Sequentially analyze each customer. LLM-bound — keeps a single Ollama
    in-flight at a time to avoid OOM on 8GB GPUs."""
    db = get_db()
    today = datetime.utcnow()
    for cid in customer_ids:
        try:
            customer = await db.customers.find_one({"_id": ObjectId(cid), **company_filter(company_name)})
            if not customer:
                continue
            invoices = await db.invoices.find({"musteri_id": cid, **company_filter(company_name)}).to_list(length=50)
            overdue = sum(1 for i in invoices if _is_overdue(i, today))
            paid = sum(1 for i in invoices if i.get("durum") == "Ödendi")
            context = {
                "isim": customer.get("isim"),
                "sektor": customer.get("sektor"),
                "acik_borc": customer.get("acik_borc", 0),
                "kredi_limiti": customer.get("kredi_limiti"),
                "fatura_sayisi": len(invoices),
                "geciken": overdue,
                "odenmis": paid,
            }
            await _agent.analyze_customer(cid, context)
            # küçük gecikme — Ollama'ya nefes aldır
            await asyncio.sleep(0.3)
        except Exception:
            continue
