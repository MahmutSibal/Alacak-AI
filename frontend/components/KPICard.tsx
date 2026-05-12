"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changePositive?: boolean;
  icon: LucideIcon;
  color?: "primary" | "accent" | "danger" | "success";
  index?: number;
}

const colorMap = {
  primary: { bg: "bg-primary/10", border: "border-primary/25", icon: "text-primary", glow: "glow-primary" },
  accent: { bg: "bg-accent/10", border: "border-accent/25", icon: "text-accent", glow: "glow-accent" },
  danger: { bg: "bg-danger/10", border: "border-danger/25", icon: "text-danger", glow: "glow-danger" },
  success: { bg: "bg-success/10", border: "border-success/25", icon: "text-success", glow: "" },
};

export default function KPICard({
  title,
  value,
  change,
  changePositive = true,
  icon: Icon,
  color = "primary",
  index = 0,
}: KPICardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`glass rounded-2xl p-5 border ${c.border} hover:${c.glow} transition-all duration-300 cursor-default`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
            changePositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {changePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      </div>

      <div>
        <p className="text-muted text-xs mb-1">{title}</p>
        <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
      </div>

      <div className="mt-3 h-0.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color === "danger" ? "bg-danger" : color === "success" ? "bg-success" : color === "accent" ? "bg-accent" : "bg-primary"}`}
          initial={{ width: "0%" }}
          animate={{ width: changePositive ? "72%" : "45%" }}
          transition={{ delay: index * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
