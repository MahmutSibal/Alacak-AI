"use client";

import { motion } from "framer-motion";

interface RiskShieldProps {
  score?: number;
  size?: number;
  className?: string;
}

export default function RiskShield({ score = 72, size = 100, className = "" }: RiskShieldProps) {
  const color = score > 70 ? "#EF4444" : score > 50 ? "#F97316" : score > 35 ? "#FBBF24" : "#22C55E";
  const glowColor = score > 70 ? "rgba(239,68,68,0.5)" : score > 50 ? "rgba(249,115,22,0.5)" : "rgba(34,197,94,0.5)";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={{ filter: [`drop-shadow(0 0 6px ${glowColor})`, `drop-shadow(0 0 14px ${glowColor})`, `drop-shadow(0 0 6px ${glowColor})`] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <path
        d="M50 5 L90 20 L90 55 C90 75 72 95 50 105 C28 95 10 75 10 55 L10 20 Z"
        fill="url(#shieldGrad)"
        stroke={color}
        strokeWidth="1.5"
      />

      <motion.path
        d="M50 5 L90 20 L90 55 C90 75 72 95 50 105 C28 95 10 75 10 55 L10 20 Z"
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeOpacity="0.4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
      />

      <text x="50" y="62" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="monospace">
        {score}
      </text>
      <text x="50" y="76" textAnchor="middle" fill={color} fontSize="8" fontFamily="monospace" opacity="0.7">
        RİSK SKORU
      </text>
    </motion.svg>
  );
}
