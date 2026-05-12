"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, MessageSquare, FileText, TrendingUp, Zap, Activity } from "lucide-react";
import { getAgentLogs } from "@/lib/api";

const agents = [
  { id: "orchestrator", label: "Orchestrator", icon: Zap, color: "text-primary" },
  { id: "monitoring", label: "Monitoring", icon: FileText, color: "text-accent" },
  { id: "risk", label: "Risk Agent", icon: Shield, color: "text-danger" },
  { id: "communication", label: "İletişim", icon: MessageSquare, color: "text-success" },
  { id: "proposal", label: "Yapılandırma", icon: Brain, color: "text-fuchsia-400" },
  { id: "cashflow", label: "Nakit Akışı", icon: TrendingUp, color: "text-yellow-400" },
];

const personaAgents = ["risk", "communication", "proposal", "cashflow"];

const staticFeed = [
  { agent: "orchestrator", text: "Orchestrator döngüsü başlatıldı — tüm ajanlar hazır", level: "info" },
  { agent: "risk", text: "Riskli müşteri tespiti için analiz kuyruğa alındı", level: "warning" },
  { agent: "communication", text: "Ödeme hatırlatma şablonları hazırlandı", level: "success" },
  { agent: "monitoring", text: "Fatura izleme aktif — yeni yüklemeleri bekleniyor", level: "info" },
];

const levelColors: Record<string, string> = {
  danger: "text-danger border-danger/30 bg-danger/5",
  success: "text-success border-success/30 bg-success/5",
  warning: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  info: "text-accent border-accent/30 bg-accent/5",
};

interface LogItem {
  agent: string;
  text: string;
  level: string;
  ts?: string;
}

export default function AgentFeed() {
  const [feed, setFeed] = useState<LogItem[]>(staticFeed);
  const [activeAgents] = useState<string[]>(personaAgents);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logs = await getAgentLogs(8);
        if (logs && logs.length > 0) {
          const mapped = logs.map((l: any) => ({
            agent: l.agent || "orchestrator",
            text: l.message || JSON.stringify(l.parsed || l.result || ""),
            level: l.agent === "risk" && l.result?.risk_score > 70 ? "danger"
              : l.agent === "risk" ? "warning"
              : l.agent === "communication" ? "success"
              : "info",
            ts: l.ts,
          }));
          setFeed(mapped.slice(0, 6));
        }
      } catch {
        // fallback to static
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass rounded-2xl p-6 border border-border"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Canlı Agent Akışı
          </h3>
          <p className="text-muted text-xs mt-0.5">4 persona aktif, Orchestrator ve Monitoring altyapı görevleri olarak izlenir</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${live ? "bg-success animate-pulse" : "bg-muted"}`} />
          <span className="text-xs text-success">Canlı</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const active = activeAgents.includes(agent.id);
          return (
            <div
              key={agent.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                active ? `${agent.color} border-current/30 bg-current/5` : "text-muted border-border bg-border/30"
              }`}
            >
              <Icon className="w-3 h-3" />
              {agent.label}
              {active && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-0.5" />}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {feed.map((item, i) => {
            const agent = agents.find((a) => a.id === item.agent);
            const Icon = agent?.icon || Brain;
            return (
              <motion.div
                key={`${item.text}-${i}`}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 p-3 rounded-xl border text-xs ${levelColors[item.level] || levelColors.info}`}
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium opacity-70">{agent?.label || item.agent} • </span>
                  <span>{String(item.text).slice(0, 120)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {feed.length === 0 && (
          <div className="text-center py-8 text-muted text-xs">
            <Brain className="w-6 h-6 mx-auto mb-2 opacity-30" />
            Henüz agent aktivitesi yok
          </div>
        )}
      </div>
    </motion.div>
  );
}
