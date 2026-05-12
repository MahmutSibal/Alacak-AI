"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const initials = (user?.isim || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-2 rounded-lg bg-primary/10 border border-primary/30 hover:border-primary/60 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
          {initials}
        </div>
        <span className="hidden sm:inline text-white text-xs font-medium max-w-[100px] truncate">
          {user?.isim || "Kullanıcı"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-2 w-60 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user?.isim || "—"}</p>
                  <p className="text-muted text-xs truncate">{user?.email || ""}</p>
                </div>
              </div>
              {user?.rol && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] uppercase tracking-wide font-mono">
                  {user.rol}
                </span>
              )}
            </div>

            <div className="py-1">
              <Link
                href="/ayarlar"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Ayarlar
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
