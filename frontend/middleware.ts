import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath, defaultRouteForRole, normalizeRole } from "./lib/access";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
const PROTECTED_PREFIXES = ["/dashboard", "/faturalar", "/musteriler", "/risk", "/nakit-akisi", "/ai", "/ayarlar"];

function getRoleFromCookie(rawUserCookie?: string): string | null {
  if (!rawUserCookie) return null;
  try {
    const parsed = JSON.parse(rawUserCookie);
    return parsed?.rol ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("alacakai_token")?.value;
  const userCookie = request.cookies.get("alacakai_user")?.value;
  const role = getRoleFromCookie(userCookie);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isProtected && token && !role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isProtected && token && role && !normalizeRole(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isProtected && token && role && !canAccessPath(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = defaultRouteForRole(role);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && token) {
    const url = request.nextUrl.clone();
    url.pathname = defaultRouteForRole(role);
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && token) {
    const url = request.nextUrl.clone();
    url.pathname = defaultRouteForRole(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
