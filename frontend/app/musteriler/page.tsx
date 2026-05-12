"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import NewCustomerModal from "@/components/NewCustomerModal";
import {
  Users, Search, MessageSquare, ShieldAlert, MoreHorizontal, Loader2, UserPlus,
} from "lucide-react";
import { getCustomers, getCustomerStats } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { riskLabel, riskBarClass, RISK_TW } from "@/lib/risk";

function fmt(v: any) {
  if (!v && v !== 0) return "₺0";
  const n = typeof v === "string" ? parseFloat(v.replace(/[^\d.]/g, "")) : Number(v);
  if (isNaN(n) || n === 0) return "₺0";
  return `₺${n.toLocaleString("tr-TR")}`;
}

export default function Musteriler() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState({ toplam: 0, kritik: 0, yuksek: 0, iyi: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = async () => {
    try {
      const [cList, cStats] = await Promise.all([getCustomers(), getCustomerStats()]);
      setCustomers(Array.isArray(cList) ? cList : []);
      if (cStats) setStats(cStats);
    } catch {
      /* silent — endpoints already return safe defaults */
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    refresh().finally(() => setLoading(false));
  }, [router]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      String(c.isim || "").toLowerCase().includes(q) ||
      String(c.sektor || "").toLowerCase().includes(q) ||
      String(c.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Müşteriler" subtitle="Müşteri portföyü ve risk durumu" onRefresh={refresh} />
        <main className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Toplam Müşteri", value: stats.toplam, color: "text-primary" },
              { label: "Kritik Riskli", value: stats.kritik, color: "text-danger" },
              { label: "Yüksek Riskli", value: stats.yuksek, color: "text-orange-400" },
              { label: "İyi Durumda", value: stats.iyi, color: "text-success" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl border border-border p-5">
                <p className="text-muted text-xs mb-1">{s.label}</p>
                {loading
                  ? <div className="h-8 w-16 bg-border rounded animate-pulse" />
                  : <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>}
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-4 p-5 border-b border-border">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Müşteri adı, sektör veya e-posta ara..."
                  className="w-full bg-border/30 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted"
                />
              </div>
              <Users className="w-4 h-4 text-muted" />
              <span className="text-muted text-sm">{filtered.length} müşteri</span>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 text-sm font-medium bg-primary text-bg px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Yeni Müşteri
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-white/60">
                  {customers.length === 0 ? "Henüz müşteri yok" : "Arama kriterine uyan müşteri bulunamadı"}
                </p>
                {customers.length === 0 && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    İlk müşteriyi ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((c, i) => {
                  const score = c.risk?.risk_score ?? c.risk_score ?? 0;
                  const durum = riskLabel(score);
                  const tw = RISK_TW[durum];
                  return (
                    <motion.div
                      key={c.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {String(c.isim || "?").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{c.isim || "—"}</p>
                        <p className="text-muted text-xs">{c.sektor || "—"} · {c.email || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-sm">{fmt(c.acik_borc)}</p>
                        <p className="text-muted text-xs">Açık borç</p>
                      </div>
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted">Risk</span>
                          <span className={`text-xs font-bold ${tw.color}`}>{score}</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${riskBarClass(score)}`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg border ${tw.color} ${tw.bg} ${tw.border}`}>
                        {durum}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors" title="AI Analiz">
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-accent/10 text-muted hover:text-accent transition-colors" title="Mesaj Gönder">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-border text-muted hover:text-white transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <NewCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
