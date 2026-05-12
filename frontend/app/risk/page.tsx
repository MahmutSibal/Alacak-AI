"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  Cell, PieChart, Pie, Tooltip,
} from "recharts";
import {
  ShieldAlert, Brain, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Zap, Loader2, Info,
} from "lucide-react";
import {
  getRiskDistribution, getRiskRadar, getRiskCustomers,
  analyzeCustomerRisk, analyzeAllRisks,
  type RiskDistribution, type RiskRadar, type RiskCustomer,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

export default function Risk() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [distribution, setDistribution] = useState<RiskDistribution | null>(null);
  const [radar, setRadar] = useState<RiskRadar | null>(null);
  const [customers, setCustomers] = useState<RiskCustomer[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const [dist, rad, list] = await Promise.all([
        getRiskDistribution(),
        getRiskRadar(),
        getRiskCustomers(20),
      ]);
      setDistribution(dist);
      setRadar(rad);
      setCustomers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri alınamadı");
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [router]);

  const runOne = async (c: RiskCustomer) => {
    setError(null);
    setInfo(null);
    setAnalyzingId(c.id);
    try {
      await analyzeCustomerRisk(c.id);
      await refresh();
      setInfo(`${c.isim} için risk analizi tamamlandı.`);
      setTimeout(() => setInfo(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analiz başarısız");
    } finally {
      setAnalyzingId(null);
    }
  };

  const runAll = async () => {
    setError(null);
    setInfo(null);
    setBulkAnalyzing(true);
    try {
      const res = await analyzeAllRisks();
      setInfo(res.message || "Toplu analiz başlatıldı");
      // Liste arka planda dolacak; periyodik refresh
      const start = Date.now();
      const id = setInterval(async () => {
        await refresh();
        if (Date.now() - start > 60_000) clearInterval(id);
      }, 5000);
      setTimeout(() => clearInterval(id), 90_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toplu analiz başlatılamadı");
    } finally {
      setBulkAnalyzing(false);
    }
  };

  const fmtMoney = (v?: number) => {
    if (!v && v !== 0) return "—";
    return `₺${Number(v).toLocaleString("tr-TR")}`;
  };

  const isEmpty =
    !loading && (!distribution || distribution.total === 0) && customers.length === 0;

  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Risk Analizi" subtitle="AI destekli müşteri risk değerlendirmesi" onRefresh={refresh} />
        <main className="p-6 space-y-6">
          {/* Status / coverage strip */}
          {distribution && distribution.total > 0 && (
            <div className="flex flex-wrap items-center gap-6 px-5 py-3 glass rounded-xl border border-border text-sm">
              <span className="text-white/80">
                <span className="text-muted">Toplam müşteri:</span>{" "}
                <span className="font-semibold">{distribution.total}</span>
              </span>
              <span className="text-success">
                <span className="text-muted">Skorlanmış:</span>{" "}
                <span className="font-semibold">{distribution.scored}</span>
              </span>
              {distribution.unscored > 0 && (
                <span className="text-warning">
                  <span className="text-muted">Skorlanmamış:</span>{" "}
                  <span className="font-semibold">{distribution.unscored}</span>
                </span>
              )}
              {radar && (
                <span className="text-accent ml-auto">
                  <span className="text-muted">Geciken fatura:</span>{" "}
                  <span className="font-semibold">{radar.context.overdue_invoices}</span>
                </span>
              )}
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="glass rounded-2xl border border-border p-10 text-center">
              <Info className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
              <p className="text-white font-medium">Henüz risk analizi için veri yok</p>
              <p className="text-muted text-sm mt-1">
                Müşteri ve fatura ekledikten sonra "Tümünü Analiz Et" ile AI risk skorlarını üretebilirsin.
              </p>
            </div>
          )}

          {/* Charts */}
          {!isEmpty && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl border border-border p-6"
              >
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-danger" />
                  Risk Radar
                </h3>
                <p className="text-muted text-xs mb-4">
                  Portföy seviyesinde 6 risk boyutu — değer ne kadar yüksekse risk o kadar yüksek
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radar?.data || []}>
                    <PolarGrid stroke="rgba(31,41,55,0.8)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                    <Radar
                      name="Risk"
                      dataKey="value"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      dot={{ fill: "#EF4444", r: 3 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#111827",
                        border: "1px solid #1F2937",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(v: number) => [`${v}`, "Risk"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass rounded-2xl border border-border p-6"
              >
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Risk Dağılımı
                </h3>
                <p className="text-muted text-xs mb-4">
                  Skorlanmış {distribution?.scored ?? 0} müşteri kategorize edildi
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={distribution?.data || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(distribution?.data || []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} opacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [`${v} müşteri`, n]}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #1F2937",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(distribution?.data || []).map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-muted">{d.name}:</span>
                      <span className="text-white font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* Customer list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl border border-border overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  AI Risk Değerlendirmesi
                </h3>
                <p className="text-muted text-xs mt-1">
                  Risk Analisti persona'sı (Llama 3.1) tarafından skorlanan müşteriler
                </p>
              </div>
              <button
                onClick={runAll}
                disabled={bulkAnalyzing}
                className="flex items-center gap-2 text-sm font-medium bg-primary/15 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/25 transition-all disabled:opacity-50"
              >
                {bulkAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {bulkAnalyzing ? "Kuyruklanıyor..." : "Tümünü Analiz Et"}
              </button>
            </div>

            {(error || info) && (
              <div className={`px-6 py-3 text-sm border-b border-border ${
                error ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
              }`}>
                {error || info}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-white/60">Henüz analiz edilmiş müşteri yok</p>
                <p className="text-xs mt-2">
                  Üstteki "Tümünü Analiz Et" butonuyla müşterileri AI ile skorlayabilirsin.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {customers.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: `${c.color}20`,
                        color: c.color,
                        border: `1px solid ${c.color}40`,
                      }}
                    >
                      {c.isim.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{c.isim}</p>
                      <p className="text-muted text-xs mt-0.5 truncate">
                        {c.recommended_action || (c.sektor ? `Sektör: ${c.sektor}` : "Henüz öneri yok")}
                      </p>
                    </div>

                    {c.acik_borc != null && c.acik_borc > 0 && (
                      <div className="text-right hidden md:block">
                        <p className="text-white text-sm font-medium">{fmtMoney(c.acik_borc)}</p>
                        <p className="text-muted text-[10px]">açık borç</p>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs w-12 justify-end">
                      {c.delta > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-danger" />
                          <span className="text-danger font-medium">+{c.delta}</span>
                        </>
                      ) : c.delta < 0 ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-success" />
                          <span className="text-success font-medium">{c.delta}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 text-muted" />
                          <span className="text-muted">—</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-44">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(c.score, 100)}%`, background: c.color }}
                        />
                      </div>
                      <span className="text-sm font-bold tabular-nums w-8 text-right" style={{ color: c.color }}>
                        {c.score}
                      </span>
                    </div>

                    <button
                      onClick={() => runOne(c)}
                      disabled={analyzingId === c.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {analyzingId === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Brain className="w-3 h-3" />
                      )}
                      {analyzingId === c.id ? "Analiz ediliyor" : "Analiz Et"}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
