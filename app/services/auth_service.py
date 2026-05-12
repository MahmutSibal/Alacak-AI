from passlib.context import CryptContext
from datetime import datetime, timedelta
import hashlib
import jwt  # PyJWT
from ..config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class AuthService:
    def hash_password(self, plain: str) -> str:
        if isinstance(plain, str):
            pre = hashlib.sha256(plain.encode("utf-8")).hexdigest()
        else:
            pre = hashlib.sha256(plain).hexdigest()
        return pwd_context.hash(pre)

    def verify_password(self, plain: str, hashed: str) -> bool:
        if isinstance(plain, str):
            pre = hashlib.sha256(plain.encode("utf-8")).hexdigest()
        else:
            pre = hashlib.sha256(plain).hexdigest()
        return pwd_context.verify(pre, hashed)

    def create_access_token(self, subject: str) -> str:
        expire = datetime.utcnow() + timedelta(minutes=int(settings.access_token_expire_minutes))
        to_encode = {"sub": subject, "exp": expire}
        # PyJWT returns a str
        return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")

    def decode_access_token(self, token: str) -> dict | None:
        try:
            return jwt.decode(token, settings.secret_key, algorithms=["HS256"]) 
        except Exception:
            return None
