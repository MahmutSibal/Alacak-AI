"use client";

import { useState, useEffect, useCallback } from "react";
import { getUser, getToken, clearAuth, User } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { normalizeRole } from "@/lib/access";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (u && t) {
      setUser(u);
      // Sync cookie for middleware
      document.cookie = `alacakai_token=${t}; path=/; max-age=86400; SameSite=Lax`;
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    document.cookie = "alacakai_token=; path=/; max-age=0";
    setUser(null);
    router.push("/login");
  }, [router]);

  return {
    user,
    role: normalizeRole(user?.rol),
    companyName: user?.sirket_adi ?? null,
    loading,
    logout,
    isAuthenticated: !!user,
  };
}
