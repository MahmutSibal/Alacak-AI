"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { riskBarClass, riskLabel, RISK_TW, type RiskLabel } from "@/lib/risk";

interface Customer {
  id: string | number;
  isim: string;
  tutar: string;
  risk: string;             // backend label, ama defansif olarak skoru tekrar etiketliyoruz
  riskScore?: number;       // backend artık her zaman gönderiyor
  gecikme: string;
}

interface Props {
  data?: Customer[];
  loading?: boolean;
}

export default function RiskTable({ data, loading }: Props) {
  const customers = data || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass rounded-2xl border border-border overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            Riskli Müşteriler
          </h3>
          <p className="text-muted text-xs mt-0.5">Risk skoruna göre sıralanmış</p>
        </div>
        <Link href="/musteriler" className="text-xs text-primary hover:underline flex items-center gap-1">
          Tümünü Gör <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-lg bg-border animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-border rounded animate-pulse w-1/2" />
                <div className="h-2 bg-border rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Riskli müşteri bulunamadı</p>
          <p className="text-xs mt-1">Müşteri ekleyip AI analizi çalıştırın</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {customers.map((c, i) => {
            // Tek source of truth: gerçek skor → label. Backend'in 'risk'
            // string'ini eski kayıtlarda yanlış olabilir; skoru kanon kabul ediyoruz.
            const score = typeof c.riskScore === "number" ? c.riskScore : 0;
            const label: RiskLabel = riskLabel(score);
            const tw = RISK_TW[label];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-border flex items-center justify-center text-xs font-bold text-muted">
                  {String(c.isim).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.isim}</p>
                  <p className="text-muted text-xs">
                    {c.gecikme && c.gecikme !== "—" ? `${c.gecikme} gecikme` : "Gecikme yok"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-semibold">{c.tutar}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${riskBarClass(score)}`}
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-6 tabular-nums text-right">{score}</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${tw.color} ${tw.bg} ${tw.border}`}>
                  {label}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
