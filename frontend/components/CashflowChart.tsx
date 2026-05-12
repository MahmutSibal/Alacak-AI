"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { getCashflowForecast } from "@/lib/api";

type RangeKey = "30g" | "60g" | "90g" | "1y";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: "30g", label: "30G", days: 30 },
  { key: "60g", label: "60G", days: 60 },
  { key: "90g", label: "90G", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl p-3 border border-border text-xs">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted">{p.name}:</span>
            <span className="text-white font-medium">₺{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface Props {
  data?: { ay: string; tahsilat: number; gider: number }[];
  loading?: boolean;
}

export default function CashflowChart({ data, loading }: Props) {
  const [range, setRange] = useState<RangeKey>("90g");
  const [chartData, setChartData] = useState<{ ay: string; tahsilat: number; gider: number; net: number }[]>(
    (data || []).map((d) => ({ ...d, net: (d.tahsilat || 0) - (d.gider || 0) })),
  );
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    setChartData((data || []).map((d) => ({ ...d, net: (d.tahsilat || 0) - (d.gider || 0) })));
  }, [data]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setChartLoading(true);
      setChartError(null);
      try {
        const result = await getCashflowForecast(range);
        if (!alive) return;
        setChartData(result.series || []);
      } catch (error) {
        if (!alive) return;
        setChartError(error instanceof Error ? error.message : "Nakit akışı verisi alınamadı");
        setChartData([]);
      } finally {
        if (alive) setChartLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [range]);

  const isEmpty = !chartLoading && !chartError && chartData.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-6 border border-border"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold">Nakit Akışı</h3>
          <p className="text-muted text-xs mt-0.5">Seçilen aralık için gerçek tahsilat ve gider analizi</p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setRange(p.key)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                range === p.key
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted hover:text-white bg-border/50 border border-border"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || chartLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartError ? (
        <div className="h-64 flex items-center justify-center text-center px-6">
          <div>
            <p className="text-white font-medium">Nakit akışı yüklenemedi</p>
            <p className="text-muted text-sm mt-1">{chartError}</p>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="h-64 flex items-center justify-center text-center px-6">
          <div>
            <p className="text-white font-medium">Henüz nakit akışı verisi yok</p>
            <p className="text-muted text-sm mt-1">Fatura ve tahsilat verileri geldikçe grafik burada oluşur.</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tahsilatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="giderGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,41,55,0.8)" />
            <XAxis dataKey="ay" tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span className="text-xs text-muted capitalize">{v}</span>} wrapperStyle={{ paddingTop: "16px" }} />
            <Area type="monotone" dataKey="tahsilat" name="Tahsilat" stroke="#14B8A6" strokeWidth={2} fill="url(#tahsilatGrad)" dot={false} />
            <Area type="monotone" dataKey="gider" name="Gider" stroke="#EF4444" strokeWidth={2} fill="url(#giderGrad)" dot={false} />
            <Area type="monotone" dataKey="net" name="Net" stroke="#38BDF8" strokeWidth={2} fill="url(#netGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
