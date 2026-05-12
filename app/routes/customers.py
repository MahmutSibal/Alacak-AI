from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request

from ..database import get_db
from ..schemas.customer import MusteriCreate, MusteriRead, MusteriUpdate
from ..utils.access_control import (
    attach_company,
    company_filter,
    get_company_name,
    get_current_user,
    CUSTOMER_READ_ROLES,
    CUSTOMER_WRITE_ROLES,
    require_roles,
)

router = APIRouter(prefix="/customers", tags=["customers"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", ""))
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            doc[k] = str(v)
    return doc


@router.get("/")
async def list_customers(request: Request):
    user = await get_current_user(request)
    require_roles(user, CUSTOMER_READ_ROLES)
    company_name = get_company_name(user)
    try:
        db = get_db()
        cursor = db.customers.find(company_filter(company_name)).sort("created_at", -1)
        docs = await cursor.to_list(length=200)
        return [_serialize(d) for d in docs]
    except Exception:
        return []


@router.get("/stats")
async def customer_stats(request: Request):
    user = await get_current_user(request)
    require_roles(user, CUSTOMER_READ_ROLES)
    company_name = get_company_name(user)
    scope = company_filter(company_name)
    try:
        db = get_db()
        total = await db.customers.count_documents(scope)
        critical = await db.customers.count_documents({**scope, "risk.risk_score": {"$gte": 70}})
        high = await db.customers.count_documents({**scope, "risk.risk_score": {"$gte": 50, "$lt": 70}})
        good = await db.customers.count_documents({**scope, "risk.risk_score": {"$lt": 30}})
        return {"toplam": total, "kritik": critical, "yuksek": high, "iyi": good}
    except Exception:
        return {"toplam": 0, "kritik": 0, "yuksek": 0, "iyi": 0}


@router.get("/{customer_id}")
async def get_customer(request: Request, customer_id: str):
    user = await get_current_user(request)
    require_roles(user, CUSTOMER_READ_ROLES)
    company_name = get_company_name(user)
    db = get_db()
    try:
        doc = await db.customers.find_one({"_id": ObjectId(customer_id), **company_filter(company_name)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return _serialize(doc)


@router.post("/", response_model=MusteriRead)
async def create_customer(data: MusteriCreate, request: Request):
    user = await get_current_user(request)
    require_roles(user, CUSTOMER_WRITE_ROLES)
    payload = data.model_dump(exclude_unset=False)
    payload["created_at"] = datetime.utcnow()
    payload.setdefault("risk", {"risk_score": 0})
    attach_company(payload, user)

    # Eğer whatsapp ayrı verilmediyse telefon'u kullan (Communication Agent için)
    if not payload.get("whatsapp") and payload.get("telefon"):
        payload["whatsapp"] = payload["telefon"]

    try:
        db = get_db()
        result = await db.customers.insert_one(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Müşteri kaydedilemedi: {e}")

    # Aktivite akışına bildirim düş
    try:
        await db.agent_logs.insert_one({
            "agent": "monitoring",
            "ts": datetime.utcnow(),
            "message": f"Yeni müşteri: {payload.get('isim')}",
            "meta": {"source": "manual", "musteri_tipi": payload.get("musteri_tipi")},
        })
    except Exception:
        pass

    return _serialize({"_id": result.inserted_id, **payload})


@router.put("/{customer_id}")
async def update_customer(request: Request, customer_id: str, data: MusteriUpdate):
    user = await get_current_user(request)
    require_roles(user, CUSTOMER_WRITE_ROLES)
    company_name = get_company_name(user)
    try:
        oid = ObjectId(customer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz ID")

    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not payload:
        return {"success": True, "updated": 0}
    payload["updated_at"] = datetime.utcnow()
    payload.pop("sirket_adi", None)

    try:
        db = get_db()
        res = await db.customers.update_one({"_id": oid, **company_filter(company_name)}, {"$set": payload})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Güncelleme başarısız: {e}")
    return {"success": True, "updated": res.modified_count}


@router.delete("/{customer_id}")
async def delete_customer(request: Request, customer_id: str):
    user = await get_current_user(request)
    require_roles(user, {"admin"})
    company_name = get_company_name(user)
    try:
        oid = ObjectId(customer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz ID")
    try:
        db = get_db()
        res = await db.customers.delete_one({"_id": oid, **company_filter(company_name)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silinemedi: {e}")
    return {"success": True, "deleted": res.deleted_count}
