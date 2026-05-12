"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Aydınlık", Icon: Sun },
  { value: "dark", label: "Karanlık", Icon: Moon },
  { value: "system", label: "Sistem", Icon: Monitor },
];

export default function ThemeToggle() {
  const { mode, resolved, setMode, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // mounted guard — sunucu render'ında ikon farklı görünsün diye
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const Icon = mounted ? (resolved === "dark" ? Moon : Sun) : Moon;

  return (
    <div className="relative" ref={ref}>
      <button
        // Tek tık → quick toggle (light <-> dark). Uzun tık / sağ tık menü
        onClick={toggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        title="Tema (sağ tık ile sistem seçeneğine ulaş)"
        className="w-9 h-9 rounded-lg bg-border/50 border border-border flex items-center justify-center hover:border-primary/50 transition-colors relative"
        aria-label={`Temayı değiştir (şu an: ${mode})`}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={resolved}
            initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Icon className="w-4 h-4 text-muted" />
          </motion.span>
        </AnimatePresence>
      </button>

      {/* Dropdown for explicit light/dark/system selection */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            {OPTIONS.map(({ value, label, Icon: OptIcon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    setMode(value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-white/5"
                  }`}
                >
                  <OptIcon className="w-4 h-4" />
                  <span className="flex-1 text-left">{label}</span>
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
