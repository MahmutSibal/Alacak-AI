"use client";

import { motion } from "framer-motion";

interface AIBrainProps {
  size?: number;
  className?: string;
}

export default function AIBrain({ size = 120, className = "" }: AIBrainProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      animate={{ filter: ["drop-shadow(0 0 8px rgba(20,184,166,0.4))", "drop-shadow(0 0 16px rgba(20,184,166,0.7))", "drop-shadow(0 0 8px rgba(20,184,166,0.4))"] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    >
      <defs>
        <radialGradient id="brainGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brainStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      <circle cx="60" cy="60" r="50" fill="url(#brainGrad)" />

      {/* Brain shape */}
      <path
        d="M60 25 C45 25 32 36 32 50 C32 58 36 64 42 68 C42 72 38 76 38 80 C38 86 44 90 50 88 C52 92 56 94 60 94 C64 94 68 92 70 88 C76 90 82 86 82 80 C82 76 78 72 78 68 C84 64 88 58 88 50 C88 36 75 25 60 25Z"
        stroke="url(#brainStroke)"
        strokeWidth="1.5"
        fill="rgba(20,184,166,0.08)"
      />

      {/* Neural connections */}
      {[
        "M60 40 L48 52", "M60 40 L72 52", "M48 52 L52 65", "M72 52 L68 65",
        "M52 65 L60 72", "M68 65 L60 72", "M48 52 L40 60", "M72 52 L80 60",
      ].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          stroke="#14B8A6"
          strokeWidth="1"
          strokeOpacity="0.6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: i * 0.15, duration: 0.8, repeat: Infinity, repeatType: "loop", repeatDelay: 2 }}
        />
      ))}

      {/* Nodes */}
      {[
        [60, 40], [48, 52], [72, 52], [52, 65], [68, 65], [60, 72], [40, 60], [80, 60],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="3"
          fill="#14B8A6"
          animate={{ opacity: [0.4, 1, 0.4], r: [2.5, 3.5, 2.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </motion.svg>
  );
}
