"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, ShieldAlert, TrendingUp,
  MessageSquare, Settings, Zap, ChevronRight, LogOut, User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getAgentSummary, AgentSummary } from "@/lib/api";
import { canAccessPath, ROLE_LABELS } from "@/lib/access";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faturalar", label: "Faturalar", icon: FileText },
  { href: "/musteriler", label: "Müşteriler", icon: Users },
  { href: "/risk", label: "Risk Analizi", icon: ShieldAlert },
  { href: "/nakit-akisi", label: "Nakit Akışı", icon: TrendingUp },
  { href: "/ai", label: "AI Chat", icon: MessageSquare },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

const ACTIVE_PERSONA_COUNT = 4;

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, loading, role } = useAuth();
  const [summary, setSummary] = useState<AgentSummary | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await getAgentSummary();
        if (alive) setSummary(s);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const activePersonas = ACTIVE_PERSONA_COUNT;
  const recentEvents = summary?.total ?? 0;
  // Simple capacity proxy: scale recent activity into 0-100%.
  const capacity = Math.min(100, Math.round((recentEvents % 200) / 2 + activePersonas * 10));
  const visibleNavItems = role ? navItems.filter((item) => canAccessPath(role, item.href)) : navItems;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border flex flex-col z-50">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">AlacakAI</h1>
            <p className="text-muted text-xs mt-0.5">AI Alacak Yönetimi</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/25 glow-primary"
                    : "text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`${active ? "text-primary" : "text-muted group-hover:text-white"} transition-colors`} size={18} />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-primary" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3 border-t border-border">
        <div className="glass rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted">AI Orchestrator</span>
          </div>
          <p className="text-xs text-white/70">
            {activePersonas}/4 persona aktif · {recentEvents} olay
          </p>
          <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${capacity}%` }}
              transition={{ duration: 1.0, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted mt-1">%{capacity} kapasite</p>
        </div>

        {user && !loading && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.isim}</p>
              <p className="text-muted text-xs truncate">{user.sirket_adi || user.email}</p>
              <p className="text-muted text-[11px] truncate">{role ? ROLE_LABELS[role] : user.rol}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all"
              title="Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
