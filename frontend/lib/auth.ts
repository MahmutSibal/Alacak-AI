const API = "/api";

export interface User {
  id: string;
  isim: string;
  email: string;
  rol: string;
  sirket_adi?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

const TOKEN_COOKIE = "alacakai_token";
const USER_COOKIE = "alacakai_user";

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split("; ");
  const match = cookies.find((item) => item.startsWith(encodedName));
  if (!match) return null;
  return decodeURIComponent(match.slice(encodedName.length));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!isBrowser()) return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

export function getUser(): User | null {
  const raw = readCookie(USER_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: User) {
  writeCookie(TOKEN_COOKIE, token, 86400);
  writeCookie(USER_COOKIE, JSON.stringify(user), 86400);
}

export function clearAuth() {
  deleteCookie(TOKEN_COOKIE);
  deleteCookie(USER_COOKIE);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function login(email: string, sifre: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, sifre }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Giriş başarısız");
  }
  const data: AuthResponse = await res.json();
  setAuth(data.access_token, data.user);
  return data;
}

export async function register(isim: string, email: string, sifre: string): Promise<User> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isim, email, sifre }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Kayıt başarısız");
  }
  return res.json();
}

export async function createAuthorizedUser(data: {
  isim: string;
  email: string;
  sifre: string;
  rol: string;
  sirket_adi?: string;
  telefon?: string;
}): Promise<User> {
  const res = await fetch(`${API}/auth/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Yetkili oluşturulamadı");
  }
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
  const res = await fetch(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "İşlem başarısız");
  }
  return res.json();
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const res = await fetch(`${API}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Şifre sıfırlama başarısız");
  }
  return res.json();
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
