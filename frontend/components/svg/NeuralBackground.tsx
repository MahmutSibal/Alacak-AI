"use client";

import { motion } from "framer-motion";

export default function NeuralBackground() {
  const nodes = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
  }));

  const connections = [
    [0, 3], [1, 4], [2, 5], [3, 6], [4, 7], [5, 8],
    [6, 9], [7, 10], [8, 11], [9, 12], [10, 13], [11, 14],
    [0, 5], [1, 6], [2, 7], [3, 8], [4, 9], [5, 10],
  ];

  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {connections.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={`${nodes[a].x}%`}
          y1={`${nodes[a].y}%`}
          x2={`${nodes[b].x}%`}
          y2={`${nodes[b].y}%`}
          stroke="#14B8A6"
          strokeWidth="0.1"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      {nodes.map((node) => (
        <motion.circle
          key={node.id}
          cx={`${node.x}%`}
          cy={`${node.y}%`}
          r="0.4"
          fill="#14B8A6"
          animate={{ opacity: [0.2, 1, 0.2], r: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: node.delay }}
        />
      ))}
    </svg>
  );
}
