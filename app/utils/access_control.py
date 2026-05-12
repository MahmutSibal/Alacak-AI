from __future__ import annotations

from fastapi import HTTPException, Request

from ..repositories.user_repo import KullaniciRepo
from ..services.auth_service import AuthService

auth_service = AuthService()
user_repo = KullaniciRepo()

LEGACY_ADMIN_ROLES = {"admin", "owner", "user"}
ROLE_ALIASES = {
    "user": "admin",
    "owner": "admin",
}

INVOICE_READ_ROLES = {"admin", "finans_sorumlusu", "tahsilat_elemani", "muhasebe_veri_giris"}
INVOICE_WRITE_ROLES = {"admin", "muhasebe_veri_giris"}
CUSTOMER_READ_ROLES = {"admin", "finans_sorumlusu", "tahsilat_elemani", "muhasebe_veri_giris"}
CUSTOMER_WRITE_ROLES = {"admin", "muhasebe_veri_giris"}
RISK_READ_ROLES = {"admin", "finans_sorumlusu"}


def normalize_role(role: str | None) -> str | None:
    if not role:
        return None
    return ROLE_ALIASES.get(role, role)


def get_company_name(user: dict) -> str:
    return user.get("sirket_adi") or user.get("isim") or user.get("email") or ""


def company_filter(company_name: str | None) -> dict:
    if not company_name:
        return {}
    return {
        "$or": [
            {"sirket_adi": company_name},
            {"sirket_adi": {"$exists": False}},
            {"sirket_adi": None},
        ]
    }


def require_roles(user: dict, allowed_roles: set[str]) -> dict:
    role = normalize_role(user.get("rol"))
    if role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    return user


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    else:
        # Fallback: tarayıcı cookie'sinde token olabilir (frontend setAuth ile yazıyor)
        token = request.cookies.get("alacakai_token")
        if not token:
            raise HTTPException(status_code=401, detail="Token gereklidir")
    decoded = auth_service.decode_access_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")

    user = await user_repo.get(decoded["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


def attach_company(payload: dict, user: dict) -> dict:
    payload["sirket_adi"] = get_company_name(user)
    return payload
