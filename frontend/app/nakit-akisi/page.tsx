"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from "recharts";
import { TrendingUp, AlertTriangle, DollarSign, Zap } from "lucide-react";
import { getCashflowForecast, type CashflowForecast } from "@/lib/api";

type RangeKey = "30g" | "60g" | "90g" | "1y";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "30g", label: "30 Gün" },
  { key: "60g", label: "60 Gün" },
  { key: "90g", label: "90 Gün" },
  { key: "1y", label: "1 Yıl" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

const formatSignedCurrency = (value: number) => {
  const formatted = formatCurrency(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
};

const summarize = (forecast: CashflowForecast | null) => {
  const series = forecast?.series || [];
  const tahsilat = series.reduce((sum, item) => sum + (item.tahsilat || 0), 0);
  const gider = series.reduce((sum, item) => sum + (item.gider || 0), 0);
  const net = series.reduce((sum, item) => sum + (item.net || 0), 0);
  const worst = series.length
    ? series.reduce((lowest, item) => ((item.net || 0) < (lowest.net || 0) ? item : lowest), series[0])
    : null;

  return {
    tahsilat,
    gider,
    net,
    worstLabel: worst?.ay || "-",
    worstNet: worst?.net ?? 0,
  };
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 border border-border text-xs">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted">{p.name}:</span>
            <span className={`font-medium ${p.value < 0 ? "text-danger" : "text-white"}`}>{formatCurrency(Number(p.value) || 0)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function NakitAkisi() {
  const [range, setRange] = useState<RangeKey>("90g");
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCashflowForecast(range);
        if (!alive) return;
        setForecast(result);
      } catch (err) {
        if (!alive) return;
        setForecast(null);
        setError(err instanceof Error ? err.message : "Nakit akışı verisi alınamadı");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [range]);

  const simulate = async () => {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSimulating(false);
  };

  const summary = summarize(forecast);
  const series = forecast?.series || [];
  const selectedLabel = RANGE_OPTIONS.find((item) => item.key === range)?.label || "90 Gün";

  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Nakit Akışı" subtitle="Gerçek fatura verisiyle 30/60/90/1y forecast" />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            {RANGE_OPTIONS.map((item) => (
              <button
                key={item.key}
                onClick={() => setRange(item.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  range === item.key
                    ? "bg-primary/20 text-primary border-primary/40 glow-primary"
                    : "text-muted border-border hover:border-primary/30"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={simulate}
              disabled={simulating}
              className="flex items-center gap-2 text-sm bg-primary px-5 py-2.5 rounded-xl text-on-primary hover:bg-primary/80 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {simulating ? "Simüle ediliyor..." : "AI Simülasyonu Çalıştır"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Toplam Tahsilat", value: formatCurrency(summary.tahsilat), icon: TrendingUp, color: "text-success", bg: "bg-success/10 border-success/30" },
              { label: "Toplam Gider", value: formatCurrency(summary.gider), icon: DollarSign, color: "text-danger", bg: "bg-danger/10 border-danger/30" },
              { label: "Net Nakit", value: formatSignedCurrency(summary.net), icon: DollarSign, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
            ].map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-2xl border p-5 ${s.bg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <p className="text-muted text-xs">{s.label}</p>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-muted text-xs mt-1">{selectedLabel} projeksiyonu</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-semibold">Nakit Akışı Grafiği</h3>
                <p className="text-muted text-xs mt-0.5">{forecast?.has_data ? "Gerçek verilere dayalı özet" : "Fatura ve tahsilat verisi geldikçe grafik oluşur"}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1.5 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                En zayıf dönem: {summary.worstLabel} ({formatSignedCurrency(summary.worstNet)})
              </div>
            </div>
            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="h-[280px] flex items-center justify-center text-center px-6">
                <div>
                  <p className="text-white font-medium">Grafik yüklenemedi</p>
                  <p className="text-muted text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : series.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-center px-6">
                <div>
                  <p className="text-white font-medium">Henüz forecast verisi yok</p>
                  <p className="text-muted text-sm mt-1">Fatura kayıtları oluştuğunda burada gerçek nakit akışı görünecek.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tahGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gidGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.8)" />
                  <XAxis dataKey="ay" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(Number(v) || 0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v) => <span className="text-xs text-muted">{v}</span>} wrapperStyle={{ paddingTop: "12px" }} />
                  <Area type="monotone" dataKey="tahsilat" name="Tahsilat" stroke="#14B8A6" strokeWidth={2} fill="url(#tahGrad)" dot={false} />
                  <Area type="monotone" dataKey="gider" name="Gider" stroke="#EF4444" strokeWidth={2} fill="url(#gidGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Net Pozisyon</h3>
              <span className="text-xs text-muted">{selectedLabel}</span>
            </div>
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="h-[200px] flex items-center justify-center text-center px-6">
                <div>
                  <p className="text-white font-medium">Net pozisyon yüklenemedi</p>
                  <p className="text-muted text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.8)" />
                  <XAxis dataKey="ay" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(Number(v) || 0)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="net"
                    name="Net"
                    fill="#38BDF8"
                    opacity={0.7}
                    radius={[4, 4, 0, 0]}
                    label={false}
                    {...{
                      shape: (props: any) => {
                        const { x, y, width, height, value } = props;
                        return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={value < 0 ? "#EF4444" : "#38BDF8"} opacity={0.7} rx={4} ry={4} />;
                      },
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
