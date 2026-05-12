export type UserRole = "admin" | "finans_sorumlusu" | "tahsilat_elemani" | "muhasebe_veri_giris";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin / Owner",
  finans_sorumlusu: "Finans Sorumlusu",
  tahsilat_elemani: "Tahsilat Elemanı",
  muhasebe_veri_giris: "Muhasebe / Veri Giriş",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Tüm ekranlar, ayarlar ve yetkili yönetimi.",
  finans_sorumlusu: "Risk analizi ve nakit akışı görüntüleme.",
  tahsilat_elemani: "Müşteriler ve tahsilat iletişimi.",
  muhasebe_veri_giris: "Fatura ve müşteri ekleme.",
};

export const ROLE_ROUTE_ACCESS: Record<UserRole, string[]> = {
  admin: ["/dashboard", "/faturalar", "/musteriler", "/risk", "/nakit-akisi", "/ai", "/ayarlar"],
  finans_sorumlusu: ["/dashboard", "/risk", "/nakit-akisi"],
  tahsilat_elemani: ["/musteriler", "/ai"],
  muhasebe_veri_giris: ["/faturalar", "/musteriler"],
};

export const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  admin: "/dashboard",
  finans_sorumlusu: "/risk",
  tahsilat_elemani: "/musteriler",
  muhasebe_veri_giris: "/faturalar",
};

export const ROLE_OPTIONS = [
  { value: "admin" as UserRole, label: ROLE_LABELS.admin, description: ROLE_DESCRIPTIONS.admin },
  { value: "finans_sorumlusu" as UserRole, label: ROLE_LABELS.finans_sorumlusu, description: ROLE_DESCRIPTIONS.finans_sorumlusu },
  { value: "tahsilat_elemani" as UserRole, label: ROLE_LABELS.tahsilat_elemani, description: ROLE_DESCRIPTIONS.tahsilat_elemani },
  { value: "muhasebe_veri_giris" as UserRole, label: ROLE_LABELS.muhasebe_veri_giris, description: ROLE_DESCRIPTIONS.muhasebe_veri_giris },
];

export function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;
  if (role === "user" || role === "owner") {
    return "admin";
  }
  if (role in ROLE_ROUTE_ACCESS) {
    return role as UserRole;
  }
  return null;
}

export function canAccessPath(role: string | null | undefined, pathname: string): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  const allowedPrefixes = ROLE_ROUTE_ACCESS[normalizedRole];
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function defaultRouteForRole(role: string | null | undefined): string {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? ROLE_DEFAULT_ROUTE[normalizedRole] : "/dashboard";
}