"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, MessageCircle } from "lucide-react";
import { useEffect } from "react";

import GlobalSearch from "./GlobalSearch";
import NotificationPopover from "./NotificationPopover";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { getWhatsAppStatus, WhatsAppStatus } from "@/lib/api";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void | Promise<void>;
}

export default function Header({ title, subtitle, onRefresh }: HeaderProps) {
  const [syncing, setSyncing] = useState(false);
  const [wa, setWa] = useState<WhatsAppStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await getWhatsAppStatus();
        if (alive) setWa(s);
      } catch {
        if (alive) setWa({ configured: false, connected: false, reason: "ulaşılamadı" });
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        router.refresh();
      }
    } finally {
      setTimeout(() => setSyncing(false), 600);
    }
  };

  const waColor = !wa?.configured
    ? "text-muted"
    : wa.connected
    ? "text-success"
    : "text-warning";
  const waLabel = !wa
    ? "kontrol ediliyor"
    : !wa.configured
    ? "yapılandırılmamış"
    : wa.connected
    ? "bağlı"
    : "bağlı değil";

  return (
    <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h2 className="text-white font-semibold text-lg leading-none">{title}</h2>
        {subtitle && <p className="text-muted text-xs mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <GlobalSearch />

        <div
          title={`WhatsApp: ${waLabel}`}
          className="hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-border/40 border border-border"
        >
          <MessageCircle className={`w-3.5 h-3.5 ${waColor}`} />
          <span className={`text-[11px] font-mono ${waColor}`}>{waLabel}</span>
        </div>

        <button
          onClick={handleSync}
          className="w-9 h-9 rounded-lg bg-border/50 border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
          aria-label="Yenile"
          title="Yenile"
        >
          <RefreshCw className={`w-4 h-4 text-muted ${syncing ? "animate-spin text-primary" : ""}`} />
        </button>

        <ThemeToggle />
        <NotificationPopover />
        <UserMenu />
      </div>
    </header>
  );
}
