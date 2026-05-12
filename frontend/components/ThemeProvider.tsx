"use client";

/**
 * ThemeProvider — light / dark / system tema yönetimi.
 *
 * - localStorage'a yazar (kalıcılık)
 * - "system" seçimi `prefers-color-scheme`'i takip eder
 * - <html> elementine `light` veya `dark` class'ı ekler — Tailwind
 *   `darkMode: "class"` + globals.css'teki `:root, .dark { ... }` /
 *   `.light { ... }` blokları bu class'ı okur
 * - SSR güvenli: ilk render'da kullanıcının seçimini tahmin etmemek için
 *   layout.tsx içinde inline bir <script> blockerla flash'i önlüyoruz
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = "alacakai-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystem(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStored(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "dark"; // ürünün varsayılan estetiği
}

function applyClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  // mount'ta: localStorage + system'i oku
  useEffect(() => {
    const stored = readStored();
    setModeState(stored);
    const next: ResolvedTheme = stored === "system" ? readSystem() : stored;
    setResolved(next);
    applyClass(next);
  }, []);

  // mode == "system" iken sistem değişimini takip et
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const next = mq.matches ? "light" : "dark";
      setResolved(next);
      applyClass(next);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const r: ResolvedTheme = next === "system" ? readSystem() : next;
    setResolved(r);
    applyClass(r);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Provider'ın dışında çağrılırsa sessiz bir varsayılan döndür — render'ı kırma
    return {
      mode: "dark",
      resolved: "dark",
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Inline'a injecte edilen flash-prevention script.
 * <head>'in başında, hydration'dan önce çalışır → tema seçimi server'dan gelen
 * markup'a anında uygulanır, "yanıp sönme" olmaz.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}') || 'dark';
    var resolved = stored;
    if (stored === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`;
