from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from ..schemas.invoice import FaturaCreate, FaturaRead, FaturaUpdate
from ..repositories.invoice_repo import FaturaRepo
from ..agents.monitoring_agent import MonitoringAgent
from ..database import get_db
from ..utils.risk_labels import risk_label
from ..utils.access_control import (
    attach_company,
    company_filter,
    get_company_name,
    get_current_user,
    INVOICE_READ_ROLES,
    INVOICE_WRITE_ROLES,
    require_roles,
)
import aiofiles
import tempfile
from datetime import datetime, date
from bson import ObjectId

router = APIRouter(prefix="/invoices", tags=["invoices"])
repo = FaturaRepo()
monitor = MonitoringAgent()

HORIZON_MONTH_MAP = {
    30: 1,
    60: 2,
    90: 3,
    365: 12,
}


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", ""))
    for k, v in doc.items():
        if isinstance(v, (datetime, date)):
            doc[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            doc[k] = str(v)
    return doc


def _compute_totals(payload: dict) -> dict:
    """Fill in KDV and grand total when the user only enters ara_toplam."""
    ara = float(payload.get("ara_toplam") or 0)
    rate = int(payload.get("kdv_orani") or 0)
    if payload.get("kdv_tutari") in (None, ""):
        payload["kdv_tutari"] = round(ara * rate / 100, 2)
    if payload.get("tutar") in (None, ""):
        payload["tutar"] = round(ara + float(payload["kdv_tutari"]), 2)
    return payload


def _derive_status(payload: dict) -> str:
    """If vade is past and durum is the default 'Bekleyen', mark Gecikmiş."""
    durum = payload.get("durum") or "Bekleyen"
    if durum != "Bekleyen":
        return durum
    vade = payload.get("vade_tarihi")
    today = datetime.utcnow().date()
    if isinstance(vade, datetime):
        vade = vade.date()
    if isinstance(vade, date) and vade < today:
        return "Gecikmiş"
    return durum


def _month_label(dt: datetime) -> str:
    months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
    return months[dt.month - 1]


def _cashflow_range_to_days(range_key: str) -> int:
    normalized = (range_key or "90g").lower()
    if normalized in {"30g", "30", "30d"}:
        return 30
    if normalized in {"60g", "60", "60d"}:
        return 60
    if normalized in {"1y", "1yil", "1year", "365", "365d"}:
        return 365
    return 90


def _empty_cashflow_series(horizon_days: int) -> list[dict]:
    steps = HORIZON_MONTH_MAP.get(horizon_days, 3)
    start = datetime.utcnow()
    out = []
    for idx in range(steps):
        month_dt = datetime(start.year, start.month, 1)
        month_index = month_dt.month - 1 + idx
        year = month_dt.year + month_index // 12
        month = month_index % 12 + 1
        out.append({"ay": _month_label(datetime(year, month, 1)), "tahsilat": 0, "gider": 0, "net": 0})
    return out


def _build_cashflow_from_invoices(invoices: list[dict], horizon_days: int) -> list[dict]:
    if not invoices:
        return _empty_cashflow_series(horizon_days)

    today = datetime.utcnow()
    steps = HORIZON_MONTH_MAP.get(horizon_days, 3)
    series: list[dict] = []
    for step in range(steps):
        month_start = datetime(today.year, today.month, 1)
        month_index = month_start.month - 1 + step
        year = month_start.year + month_index // 12
        month = month_index % 12 + 1
        month_dt = datetime(year, month, 1)
        next_month_index = month_index + 1
        next_year = month_start.year + next_month_index // 12
        next_month = next_month_index % 12 + 1
        next_month_dt = datetime(next_year, next_month, 1)

        tahsilat = 0.0
        gider = 0.0
        for inv in invoices:
            amount = float(inv.get("tutar") or inv.get("parsed", {}).get("tutar") or 0)
            status = str(inv.get("durum") or "").lower()
            created_at = inv.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", ""))
                except Exception:
                    created_at = None

            due = inv.get("vade_tarihi")
            if isinstance(due, str):
                try:
                    due = datetime.fromisoformat(due.replace("Z", ""))
                except Exception:
                    due = None

            if status == "ödendi":
                if created_at and month_dt <= created_at < next_month_dt:
                    tahsilat += amount
                continue

            if due and month_dt <= due < next_month_dt:
                tahsilat += amount * 0.75
                gider += amount * 0.15

        net = tahsilat - gider
        series.append({"ay": _month_label(month_dt), "tahsilat": round(tahsilat), "gider": round(gider), "net": round(net)})

    return series


@router.post("/", response_model=FaturaRead)
async def create_invoice(data: FaturaCreate, request: Request):
    user = await get_current_user(request)
    require_roles(user, INVOICE_WRITE_ROLES)

    payload = data.model_dump()
    payload = _compute_totals(payload)
    payload["durum"] = _derive_status(payload)
    payload["created_at"] = datetime.utcnow()
    payload["source"] = "manual"
    attach_company(payload, user)

    db = get_db()

    # Coerce dates to datetimes for Mongo (BSON has no `date` type)
    for k in ("vade_tarihi", "duzenleme_tarihi"):
        v = payload.get(k)
        if isinstance(v, date) and not isinstance(v, datetime):
            payload[k] = datetime.combine(v, datetime.min.time())

    try:
        result = await db.invoices.insert_one(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fatura kaydedilemedi: {e}")

    # Light-touch agent log so the manual entry shows up in the activity feed
    try:
        await db.agent_logs.insert_one({
            "agent": "monitoring",
            "ts": datetime.utcnow(),
            "message": f"Manuel fatura eklendi: {payload.get('fatura_no')}",
            "meta": {"source": "manual", "tutar": payload.get("tutar"), "firma": payload.get("firma_adi")},
        })
    except Exception:
        pass

    return _serialize({"_id": result.inserted_id, **payload})


@router.get("/")
async def list_invoices(request: Request, limit: int = 100):
    user = await get_current_user(request)
    require_roles(user, INVOICE_READ_ROLES)
    company_name = get_company_name(user)
    try:
        db = get_db()
        cursor = db.invoices.find(company_filter(company_name)).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [_serialize(d) for d in docs]
    except Exception:
        return []


@router.post("/upload")
async def upload_invoice(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    require_roles(user, INVOICE_WRITE_ROLES)
    filename = file.filename or "upload"
    suffix = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".tmp"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    async with aiofiles.open(tmp.name, "wb") as out:
        content = await file.read()
        await out.write(content)
    parsed = await monitor.process_file(tmp.name, source="upload", sirket_adi=get_company_name(user))
    return {"file": filename, "parsed": parsed}


@router.get("/customer/{customer_id}")
async def list_by_customer(request: Request, customer_id: str):
    user = await get_current_user(request)
    require_roles(user, INVOICE_READ_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    cursor = db.invoices.find({"musteri_id": customer_id, **company_filter(company_name)}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [_serialize(doc) for doc in docs]


_FALLBACK_STATS = {
    "stats": [
        {"title": "Toplam Tahsilat", "value": "₺0", "change": "veri yok"},
        {"title": "Geciken Alacak", "value": "₺0", "change": "veri yok"},
        {"title": "Bu Ay Tahsil", "value": "₺0", "change": "veri yok"},
        {"title": "Riskli Müşteri", "value": "0", "change": "0 toplam"},
    ],
    "cashflowSeries": [],
    "riskMusteriler": [],
    "total_invoices": 0,
    "customer_count": 0,
}


@router.get("/stats")
async def get_dashboard_stats(request: Request):
    user = await get_current_user(request)
    require_roles(user, {"admin", "finans_sorumlusu"})
    try:
        return await _compute_dashboard_stats(user)
    except Exception:
        return _FALLBACK_STATS


async def _compute_dashboard_stats(user: dict | None = None):
    db = get_db()
    company_name = get_company_name(user) if user else None
    scoped_filter = company_filter(company_name)
    total_invoices = await db.invoices.count_documents(scoped_filter)
    today = datetime.utcnow()

    all_invoices = await db.invoices.find(scoped_filter).to_list(length=1000)
    total_amount = 0.0
    overdue_amount = 0.0
    overdue_count = 0
    paid_this_month = 0.0

    for inv in all_invoices:
        tutar = float(inv.get("tutar", inv.get("parsed", {}).get("tutar", 0) or 0))
        total_amount += tutar
        vade = inv.get("vade_tarihi")
        durum = inv.get("durum", "")
        if durum == "Ödendi":
            created = inv.get("created_at", datetime.utcnow())
            if hasattr(created, "month") and created.month == today.month:
                paid_this_month += tutar
        elif vade:
            try:
                if isinstance(vade, str):
                    from datetime import date as d_
                    vd = datetime.fromisoformat(vade)
                elif isinstance(vade, (datetime, date)):
                    vd = datetime.combine(vade, datetime.min.time()) if isinstance(vade, date) else vade
                else:
                    vd = None
                if vd and vd < today:
                    overdue_amount += tutar
                    overdue_count += 1
            except Exception:
                pass

    risk_count = await db.customers.count_documents({**scoped_filter, "risk.risk_score": {"$gte": 50}})
    customer_count = await db.customers.count_documents(scoped_filter)

    def fmt(amount: float) -> str:
        if amount >= 1_000_000:
            return f"₺{amount/1_000_000:.1f}M"
        if amount >= 1_000:
            return f"₺{int(amount/1000)}.{int((amount%1000)/100)}00"
        return f"₺{int(amount)}"

    cashflow_series = _build_cashflow_from_invoices(all_invoices, 90)

    risk_customers_cursor = db.customers.find({**scoped_filter, "risk.risk_score": {"$exists": True}}).sort("risk.risk_score", -1).limit(5)
    risk_customers = await risk_customers_cursor.to_list(length=5)
    risk_list = []
    for c in risk_customers:
        score = int(c.get("risk", {}).get("risk_score", 0) or 0)
        risk_list.append({
            "id": str(c["_id"]),
            "isim": c.get("isim", "—"),
            "tutar": fmt(float(c.get("acik_borc", 0))),
            "risk": risk_label(score),
            "riskScore": score,
            "gecikme": c.get("gecikme_gun", "—"),
        })

    return {
        "stats": [
            {"title": "Toplam Tahsilat", "value": fmt(total_amount) if total_amount else "₺0", "change": f"+{total_invoices} fatura"},
            {"title": "Geciken Alacak", "value": fmt(overdue_amount) if overdue_amount else "₺0", "change": f"{overdue_count} fatura"},
            {"title": "Bu Ay Tahsil", "value": fmt(paid_this_month) if paid_this_month else "₺0", "change": "Son 30 gün"},
            {"title": "Riskli Müşteri", "value": str(risk_count), "change": f"{customer_count} toplam"},
        ],
        "cashflowSeries": cashflow_series,
        "riskMusteriler": risk_list,
        "total_invoices": total_invoices,
        "customer_count": customer_count,
    }


@router.get("/cashflow")
async def cashflow_forecast(request: Request, range: str = "90g"):
    user = await get_current_user(request)
    require_roles(user, {"admin", "finans_sorumlusu"})
    company_name = get_company_name(user)
    horizon_days = _cashflow_range_to_days(range)
    db = get_db()
    invoices = await db.invoices.find(company_filter(company_name)).to_list(length=2000)
    return {
        "range": range,
        "horizon_days": horizon_days,
        "series": _build_cashflow_from_invoices(invoices, horizon_days),
        "has_data": bool(invoices),
    }


@router.get("/{invoice_id}")
async def get_invoice(request: Request, invoice_id: str):
    user = await get_current_user(request)
    require_roles(user, INVOICE_READ_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    try:
        doc = await db.invoices.find_one({"_id": ObjectId(invoice_id), **company_filter(company_name)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    return _serialize(doc)


@router.put("/{invoice_id}")
async def update_invoice(request: Request, invoice_id: str, data: dict):
    user = await get_current_user(request)
    require_roles(user, INVOICE_WRITE_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    data.pop("_id", None)
    data.pop("id", None)
    data.pop("sirket_adi", None)
    try:
        await db.invoices.update_one({"_id": ObjectId(invoice_id), **company_filter(company_name)}, {"$set": data})
    except Exception:
        raise HTTPException(status_code=400, detail="Güncelleme başarısız")
    return {"success": True}
