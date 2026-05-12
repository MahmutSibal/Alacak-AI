"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import KPICard from "@/components/KPICard";
import CashflowChart from "@/components/CashflowChart";
import AgentFeed from "@/components/AgentFeed";
import RiskTable from "@/components/RiskTable";
import { DollarSign, Clock, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { getDashboardStats } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

interface DashboardData {
  stats: { title: string; value: string; change: string }[];
  cashflowSeries: { ay: string; tahsilat: number; gider: number }[];
  riskMusteriler: { id: string; isim: string; tutar: string; risk: string; gecikme: string }[];
  total_invoices?: number;
  customer_count?: number;
}

const iconMap = [DollarSign, Clock, TrendingUp, AlertTriangle, Users];
const colorMap = ["primary", "danger", "success", "accent", "primary"] as const;

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    getDashboardStats()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const kpis = data?.stats.map((s, i) => ({
    ...s,
    changePositive: !s.change.startsWith("-") || s.title === "Riskli Müşteri",
    icon: iconMap[i] || DollarSign,
    color: colorMap[i] || "primary",
  })) || [];

  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Dashboard" subtitle="Genel performans özeti" />
        <main className="p-6 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass rounded-2xl border border-border h-36 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {kpis.map((kpi, i) => (
                <KPICard key={kpi.title} {...kpi} index={i} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <CashflowChart data={data?.cashflowSeries} loading={loading} />
            </div>
            <div>
              <AgentFeed />
            </div>
          </div>

          <RiskTable data={data?.riskMusteriler} loading={loading} />
        </main>
      </div>
    </div>
  );
}
