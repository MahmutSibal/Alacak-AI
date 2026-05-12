"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, Info, ShieldAlert, X } from "lucide-react";
import { getNotifications, Notification } from "@/lib/api";

function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}d önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}

const LEVEL_STYLES: Record<Notification["level"], { color: string; Icon: typeof Info }> = {
  info: { color: "text-accent", Icon: Info },
  warning: { color: "text-warning", Icon: ShieldAlert },
  error: { color: "text-danger", Icon: AlertTriangle },
};

const READ_KEY = "alacakai_notifications_read_at";

export default function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [readAt, setReadAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = window.localStorage.getItem(READ_KEY);
    return v ? Number(v) : 0;
  });
  const popRef = useRef<HTMLDivElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(15);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((i) => new Date(i.ts).getTime() > readAt).length;
  const errorCount = items.filter((i) => i.level === "error").length;

  const markAllRead = () => {
    const now = Date.now();
    setReadAt(now);
    if (typeof window !== "undefined") window.localStorage.setItem(READ_KEY, String(now));
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh();
        }}
        className="w-9 h-9 rounded-lg bg-border/50 border border-border flex items-center justify-center hover:border-primary/50 transition-colors relative"
        aria-label="Bildirimler"
      >
        <Bell className="w-4 h-4 text-muted" />
        {unread > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${
              errorCount > 0 ? "bg-danger text-on-primary" : "bg-primary text-on-primary"
            }`}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-2 w-96 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-semibold">Bildirimler</p>
                <p className="text-muted text-xs">
                  {loading ? "Yenileniyor…" : items.length > 0 ? `${items.length} olay` : "Bekleyen olay yok"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-muted hover:text-primary px-2 py-1 rounded-md transition-colors"
                  >
                    Hepsini işaretle
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-muted hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && !loading && (
                <div className="px-4 py-10 text-center text-muted text-sm">
                  Henüz bildirim yok.
                </div>
              )}
              {items.map((n) => {
                const { color, Icon } = LEVEL_STYLES[n.level];
                const isUnread = new Date(n.ts).getTime() > readAt;
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-border/60 last:border-0 flex items-start gap-3 ${
                      isUnread ? "bg-primary/[0.04]" : ""
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-snug">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase tracking-wide text-muted font-mono">
                          {n.agent}
                        </span>
                        <span className="text-muted text-xs">·</span>
                        <span className="text-muted text-xs">{timeAgo(n.ts)}</span>
                      </div>
                    </div>
                    {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
