from fastapi import APIRouter, HTTPException, Form, Request
from ..schemas.user import KullaniciCreate, KullaniciRead, YetkiliCreate
from ..repositories.user_repo import KullaniciRepo
from ..services.auth_service import AuthService
from ..database import get_db
from ..services.whatsapp_service import WhatsAppService
import secrets
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])
repo = KullaniciRepo()
service = AuthService()
ALLOWED_ROLES = {"admin", "finans_sorumlusu", "tahsilat_elemani", "muhasebe_veri_giris"}


def _serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "isim": user["isim"],
        "email": user["email"],
        "rol": user.get("rol", "user"),
        "telefon": user.get("telefon"),
        "sirket_adi": user.get("sirket_adi") or user.get("isim"),
    }


async def _get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token gereklidir")
    token = auth_header.split(" ", 1)[1]
    decoded = service.decode_access_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")
    user = await repo.get(decoded["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


def _require_admin(user: dict) -> None:
    if user.get("rol") not in {"admin", "owner"}:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekir")


@router.post("/register", response_model=KullaniciRead)
async def register(data: KullaniciCreate):
    existing = await repo.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    hashed = service.hash_password(data.sifre)
    company_name = data.sirket_adi or data.isim
    doc = {
        "isim": data.isim,
        "email": data.email,
        "hashed_password": hashed,
        "rol": "admin",
        "sirket_adi": company_name,
        "olusturulma_tarihi": datetime.utcnow(),
    }
    created = await repo.create(doc)
    return _serialize_user(created)


@router.post("/users", response_model=KullaniciRead)
async def create_authorized_user(data: YetkiliCreate, request: Request):
    current_user = await _get_current_user(request)
    _require_admin(current_user)

    if data.rol not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Geçersiz rol seçimi")

    if await repo.get_by_email(data.email):
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")

    hashed = service.hash_password(data.sifre)
    company_name = data.sirket_adi or current_user.get("sirket_adi") or current_user.get("isim")
    doc = {
        "isim": data.isim,
        "email": data.email,
        "hashed_password": hashed,
        "rol": data.rol,
        "telefon": data.telefon,
        "sirket_adi": company_name,
        "olusturulma_tarihi": datetime.utcnow(),
    }
    created = await repo.create(doc)
    # Notify created user via WhatsApp if phone provided (best-effort)
    if data.telefon:
        try:
            wa = WhatsAppService()
            if wa.is_configured:
                msg = f"Merhaba {data.isim}, hesabınız oluşturuldu. Giriş için e-posta: {data.email}"
                await wa.send_text(data.telefon, msg)
        except Exception:
            # best-effort notify, ignore errors
            pass
    return _serialize_user(created)


@router.post("/token")
async def token(username: str = Form(...), password: str = Form(...)):
    user = await repo.get_by_email(username)
    if not user or not service.verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre")
    access = service.create_access_token(str(user["_id"]))
    return {
        "access_token": access,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/login")
async def login(data: dict):
    email = data.get("email", "")
    password = data.get("sifre", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="E-posta ve şifre gereklidir")
    user = await repo.get_by_email(email)
    if not user or not service.verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre")
    access = service.create_access_token(str(user["_id"]))
    return {
        "access_token": access,
        "token_type": "bearer",
        "user": _serialize_user(user),
    }


@router.post("/forgot-password")
async def forgot_password(data: dict):
    email = data.get("email", "")
    if not email:
        raise HTTPException(status_code=400, detail="E-posta gereklidir")
    db = get_db()
    user = await repo.get_by_email(email)
    reset_token = secrets.token_urlsafe(32)
    if user:
        expires_at = datetime.utcnow() + timedelta(hours=1)
        await db.password_resets.delete_many({"email": email})
        await db.password_resets.insert_one({
            "user_id": str(user["_id"]),
            "email": email,
            "token": reset_token,
            "expires_at": expires_at,
            "used": False,
        })
    return {
        "message": "Eğer bu e-posta sistemde kayıtlıysa sıfırlama bağlantısı gönderildi.",
        "reset_token": reset_token if user else None,
        "dev_note": "Gerçek ortamda bu token e-posta ile gönderilir",
    }


@router.post("/reset-password")
async def reset_password(data: dict):
    token_val = data.get("token", "")
    new_password = data.get("new_password", "")
    if not token_val or not new_password:
        raise HTTPException(status_code=400, detail="Token ve yeni şifre gereklidir")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Şifre en az 6 karakter olmalıdır")

    db = get_db()
    reset_doc = await db.password_resets.find_one({"token": token_val, "used": False})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Geçersiz veya kullanılmış token")
    if reset_doc["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token süresi dolmuş, yeni bir talep oluşturun")

    hashed = service.hash_password(new_password)
    await db.users.update_one({"email": reset_doc["email"]}, {"$set": {"hashed_password": hashed}})
    await db.password_resets.update_one({"token": token_val}, {"$set": {"used": True}})
    return {"message": "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz."}


@router.get("/me")
async def get_me(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token gereklidir")
    tok = auth_header.split(" ")[1]
    decoded = service.decode_access_token(tok)
    if not decoded:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")
    user = await repo.get(decoded["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return _serialize_user(user)
