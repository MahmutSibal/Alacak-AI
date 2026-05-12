"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import NewInvoiceModal from "@/components/NewInvoiceModal";
import {
  FileText, Search, Eye, CheckCircle,
  Clock, AlertCircle, Download, Plus, Loader2,
} from "lucide-react";
import { getInvoices } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: typeof AlertCircle }> = {
  Gecikmiş: { color: "text-danger", bg: "bg-danger/10", border: "border-danger/30", icon: AlertCircle },
  Bekleyen: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", icon: Clock },
  Ödendi: { color: "text-success", bg: "bg-success/10", border: "border-success/30", icon: CheckCircle },
  İptal: { color: "text-muted", bg: "bg-white/[0.03]", border: "border-border", icon: AlertCircle },
};

interface Invoice {
  id?: string;
  _id?: string;
  fatura_no?: string;
  firma_adi?: string;
  musteri?: string;
  customer_id?: string;
  tutar?: number;
  ara_toplam?: number;
  para_birimi?: string;
  vade_tarihi?: string;
  durum?: string;
  parsed?: {
    tutar?: number;
    vade_tarihi?: string;
    musteri?: string;
  };
}

function fmtMoney(v: unknown, currency: string = "TRY"): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return String(v);
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";
  return `${symbol}${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(v: unknown): string {
  if (!v) return "—";
  try {
    return new Date(String(v)).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(v);
  }
}

export default function Faturalar() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tümü");
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = async () => {
    try {
      const data = await getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setInvoices([]);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [router]);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch =
      String(inv.fatura_no || "").toLowerCase().includes(q) ||
      String(inv.firma_adi || inv.musteri || inv.parsed?.musteri || "").toLowerCase().includes(q) ||
      String(inv.id || inv._id || "").toLowerCase().includes(q);
    const durum = inv.durum || "Bekleyen";
    const matchFilter = filter === "Tümü" || durum === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    toplam: invoices.length,
    bekleyen: invoices.filter((i) => (i.durum || "Bekleyen") === "Bekleyen").length,
    gecikmis: invoices.filter((i) => i.durum === "Gecikmiş").length,
    odendi: invoices.filter((i) => i.durum === "Ödendi").length,
  };

  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header
          title="Faturalar"
          subtitle="Manuel fatura yönetimi"
          onRefresh={refresh}
        />
        <main className="p-6 space-y-6">
          {/* Quick stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Toplam", value: counts.toplam, color: "text-white", icon: FileText },
              { label: "Bekleyen", value: counts.bekleyen, color: "text-yellow-400", icon: Clock },
              { label: "Gecikmiş", value: counts.gecikmis, color: "text-danger", icon: AlertCircle },
              { label: "Ödendi", value: counts.odendi, color: "text-success", icon: CheckCircle },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="glass rounded-xl border border-border p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-white/[0.04] border border-border flex items-center justify-center ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-muted text-xs">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toolbar + table */}
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-4 p-5 border-b border-border flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Fatura No veya Firma Adı..."
                  className="w-full bg-border/30 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted"
                />
              </div>
              <div className="flex gap-2">
                {["Tümü", "Bekleyen", "Gecikmiş", "Ödendi"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                      filter === f
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "text-muted border-border hover:border-primary/30"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 text-sm font-medium bg-primary text-bg px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" /> Yeni Fatura
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-white/60">
                  {invoices.length === 0
                    ? "Henüz fatura yok"
                    : "Arama kriterine uyan fatura bulunamadı"}
                </p>
                {invoices.length === 0 && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    İlk faturayı ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Fatura No", "Firma", "Tutar", "Vade", "Durum", "İşlem"].map((h) => (
                        <th key={h} className="text-left text-xs text-muted font-medium px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map((inv, i) => {
                      const durum = inv.durum || "Bekleyen";
                      const sc = statusConfig[durum] || statusConfig["Bekleyen"];
                      const Icon = sc.icon;
                      const firma =
                        inv.firma_adi ||
                        inv.musteri ||
                        inv.parsed?.musteri ||
                        inv.customer_id ||
                        "—";
                      const tutar = inv.tutar ?? inv.parsed?.tutar;
                      const currency = inv.para_birimi || "TRY";
                      const vade = inv.vade_tarihi || inv.parsed?.vade_tarihi;
                      const faturaNo = inv.fatura_no || inv.id || `INV-${i + 1}`;
                      return (
                        <motion.tr
                          key={inv.id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span className="text-white font-mono text-xs">
                                {String(faturaNo).slice(0, 24)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-white/80 max-w-[220px] truncate">
                            {String(firma).slice(0, 50)}
                          </td>
                          <td className="px-5 py-4 text-white font-semibold">
                            {fmtMoney(tutar, currency)}
                          </td>
                          <td className="px-5 py-4 text-muted text-xs">{fmtDate(vade)}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`flex items-center gap-1.5 w-fit text-xs px-2.5 py-1 rounded-lg border ${sc.color} ${sc.bg} ${sc.border}`}
                            >
                              <Icon className="w-3 h-3" />
                              {durum}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors" title="Görüntüle">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-accent/10 text-muted hover:text-accent transition-colors" title="İndir">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <NewInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
