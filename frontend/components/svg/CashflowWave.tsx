"use client";

import { motion } from "framer-motion";

interface CashflowWaveProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function CashflowWave({ width = 300, height = 80, className = "" }: CashflowWaveProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.path
        d={`M0 ${height * 0.6} C${width * 0.15} ${height * 0.3} ${width * 0.3} ${height * 0.8} ${width * 0.5} ${height * 0.5} S${width * 0.85} ${height * 0.2} ${width} ${height * 0.4} L${width} ${height} L0 ${height} Z`}
        fill="url(#waveGrad1)"
        animate={{
          d: [
            `M0 ${height * 0.6} C${width * 0.15} ${height * 0.3} ${width * 0.3} ${height * 0.8} ${width * 0.5} ${height * 0.5} S${width * 0.85} ${height * 0.2} ${width} ${height * 0.4} L${width} ${height} L0 ${height} Z`,
            `M0 ${height * 0.4} C${width * 0.15} ${height * 0.7} ${width * 0.3} ${height * 0.2} ${width * 0.5} ${height * 0.55} S${width * 0.85} ${height * 0.4} ${width} ${height * 0.3} L${width} ${height} L0 ${height} Z`,
            `M0 ${height * 0.6} C${width * 0.15} ${height * 0.3} ${width * 0.3} ${height * 0.8} ${width * 0.5} ${height * 0.5} S${width * 0.85} ${height * 0.2} ${width} ${height * 0.4} L${width} ${height} L0 ${height} Z`,
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.path
        d={`M0 ${height * 0.7} C${width * 0.2} ${height * 0.4} ${width * 0.4} ${height * 0.9} ${width * 0.6} ${height * 0.6} S${width * 0.9} ${height * 0.3} ${width} ${height * 0.5} L${width} ${height} L0 ${height} Z`}
        fill="url(#waveGrad2)"
        animate={{
          d: [
            `M0 ${height * 0.7} C${width * 0.2} ${height * 0.4} ${width * 0.4} ${height * 0.9} ${width * 0.6} ${height * 0.6} S${width * 0.9} ${height * 0.3} ${width} ${height * 0.5} L${width} ${height} L0 ${height} Z`,
            `M0 ${height * 0.5} C${width * 0.2} ${height * 0.8} ${width * 0.4} ${height * 0.3} ${width * 0.6} ${height * 0.65} S${width * 0.9} ${height * 0.5} ${width} ${height * 0.4} L${width} ${height} L0 ${height} Z`,
            `M0 ${height * 0.7} C${width * 0.2} ${height * 0.4} ${width * 0.4} ${height * 0.9} ${width * 0.6} ${height * 0.6} S${width * 0.9} ${height * 0.3} ${width} ${height * 0.5} L${width} ${height} L0 ${height} Z`,
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      <motion.path
        d={`M0 ${height * 0.5} C${width * 0.25} ${height * 0.2} ${width * 0.5} ${height * 0.7} ${width} ${height * 0.35}`}
        stroke="#14B8A6"
        strokeWidth="2"
        fill="none"
        animate={{
          d: [
            `M0 ${height * 0.5} C${width * 0.25} ${height * 0.2} ${width * 0.5} ${height * 0.7} ${width} ${height * 0.35}`,
            `M0 ${height * 0.35} C${width * 0.25} ${height * 0.65} ${width * 0.5} ${height * 0.25} ${width} ${height * 0.5}`,
            `M0 ${height * 0.5} C${width * 0.25} ${height * 0.2} ${width * 0.5} ${height * 0.7} ${width} ${height * 0.35}`,
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}
