"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Loader2, RefreshCw, Power, AlertCircle, CheckCircle2, Smartphone,
} from "lucide-react";
import {
  getWhatsAppQR,
  getWhatsAppStatus,
  startWhatsAppSession,
  stopWhatsAppSession,
  type WhatsAppStatus,
} from "@/lib/api";

const STATE_LABEL: Record<string, string> = {
  idle: "Beklemede",
  starting: "Başlatılıyor",
  opening: "Başlatılıyor",
  pairing: "Eşleştiriliyor",
  qr: "QR taranmayı bekliyor",
  qrcode: "QR taranmayı bekliyor",
  connecting: "Bağlanıyor",
  connected: "Bağlı",
  connected_idle: "Bağlı (boşta)",
  disconnected: "Bağlantı kesildi",
  conflict: "Oturum çakışması",
  error: "Hata",
  unknown: "Bilinmiyor",
};

export default function WhatsAppConnectCard() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const s = await getWhatsAppStatus();
      setStatus(s);
      if (s.has_qr && !s.connected) {
        try {
          const q = await getWhatsAppQR();
          if (q.dataUrl) setQrDataUrl(q.dataUrl);
        } catch {
          /* swallow */
        }
      } else if (s.connected) {
        setQrDataUrl(null);
      }
    } catch (err) {
      setStatus({ configured: false, connected: false, reason: err instanceof Error ? err.message : "ulaşılamadı" });
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const onConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      await startWhatsAppSession();
      // QR ~5-10 saniye sonra hazır olur, polling zaten getiriyor
      setTimeout(refresh, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı başlatılamadı");
    } finally {
      setLoading(false);
    }
  };

  const onDisconnect = async () => {
    setError(null);
    setLoading(true);
    try {
      await stopWhatsAppSession();
      setQrDataUrl(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oturum kapatılamadı");
    } finally {
      setLoading(false);
    }
  };

  const rawState = String(status?.state || "").toLowerCase();
  const state = rawState || (status?.connected ? "connected" : "unknown");
  const stateLabel = STATE_LABEL[state] || state;

  const dotColor = !status?.configured
    ? "bg-muted"
    : status.connected
    ? "bg-success"
    : state.includes("qr") || state.includes("qrcode")
    ? "bg-warning"
    : state.includes("start") || state.includes("open")
    ? "bg-accent"
    : "bg-danger";

  return (
    <div className="glass rounded-2xl border border-border p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="text-white font-semibold leading-none">WhatsApp Bağlantısı</h3>
            <p className="text-muted text-xs mt-1">Tahsilat hatırlatma kanalı</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor} ${status?.connected ? "" : "animate-pulse"}`} />
          <span className="text-xs font-mono text-muted">{stateLabel}</span>
        </div>
      </div>

      {/* Configured? */}
      {!status?.configured && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">WhatsApp servisi yapılandırılmamış</p>
            <p className="text-xs text-warning/80 mt-1">
              {status?.reason || "WHATSAPP_API_URL ve WHATSAPP_API_TOKEN .env'de tanımlı olmalı."}
            </p>
            <p className="text-xs text-warning/80 mt-1">
              Servisi başlat:{" "}
              <code className="font-mono bg-bg/40 px-1.5 py-0.5 rounded">
                cd whatsapp-service && npm install && npm start
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Connected — show profile */}
      {status?.connected && (
        <div className="bg-bg/40 border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-sm text-white font-medium">Aktif oturum</span>
          </div>
          {status.profile?.pushname && (
            <div className="flex items-center gap-2 pl-6">
              <Smartphone className="w-3.5 h-3.5 text-muted" />
              <span className="text-sm text-white/80">{status.profile.pushname}</span>
              {status.profile.platform && (
                <span className="text-[10px] text-muted bg-border/50 px-2 py-0.5 rounded font-mono uppercase">
                  {status.profile.platform}
                </span>
              )}
            </div>
          )}
          {status.profile?.wid && (
            <p className="text-xs text-muted pl-6 font-mono break-all">
              {status.profile.wid.replace("@c.us", "")}
            </p>
          )}
        </div>
      )}

      {/* QR */}
      <AnimatePresence>
        {status?.configured && !status.connected && qrDataUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="bg-white p-4 rounded-xl flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="WhatsApp QR" className="w-56 h-56" />
              <p className="text-xs text-bg font-medium text-center">
                Telefonunda WhatsApp → Bağlı Cihazlar → Cihaz Bağla
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-5">
        {!status?.connected ? (
          <button
            onClick={onConnect}
            disabled={loading || !status?.configured}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-bg rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            Bağlan
          </button>
        ) : (
          <button
            onClick={onDisconnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-danger/40 text-danger rounded-lg hover:bg-danger/10 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            Bağlantıyı Kes
          </button>
        )}
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-border text-muted hover:text-white hover:border-primary/30 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Yenile
        </button>
      </div>
    </div>
  );
}
