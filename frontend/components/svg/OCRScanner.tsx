"use client";

import { motion } from "framer-motion";

interface OCRScannerProps {
  size?: number;
  className?: string;
}

export default function OCRScanner({ size = 120, className = "" }: OCRScannerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Document */}
      <rect x="25" y="15" width="70" height="90" rx="6" fill="url(#scanGrad)" stroke="#14B8A6" strokeWidth="1" strokeOpacity="0.5" />

      {/* Corner brackets */}
      {[
        { x: 25, y: 15, rotate: 0 },
        { x: 95, y: 15, rotate: 90 },
        { x: 95, y: 105, rotate: 180 },
        { x: 25, y: 105, rotate: 270 },
      ].map((c, i) => (
        <g key={i} transform={`rotate(${c.rotate}, ${c.x}, ${c.y})`}>
          <path d={`M${c.x} ${c.y + 12} L${c.x} ${c.y} L${c.x + 12} ${c.y}`} stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ))}

      {/* Text lines */}
      {[35, 48, 61, 74, 87].map((y, i) => (
        <motion.rect
          key={y}
          x="35"
          y={y}
          width={i % 2 === 0 ? 50 : 38}
          height="5"
          rx="2"
          fill="#14B8A6"
          opacity="0.3"
          animate={{ opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      {/* Scanning line */}
      <motion.line
        x1="25"
        y1="60"
        x2="95"
        y2="60"
        stroke="#14B8A6"
        strokeWidth="1.5"
        strokeOpacity="0.9"
        animate={{ y1: [15, 105, 15], y2: [15, 105, 15] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />

      {/* Scan glow */}
      <motion.rect
        x="25"
        y="55"
        width="70"
        height="10"
        fill="url(#scanGlowGrad)"
        animate={{ y: [10, 100, 10], opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}
