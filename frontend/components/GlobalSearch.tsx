"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Users, Loader2 } from "lucide-react";
import { globalSearch, SearchHit } from "@/lib/api";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await globalSearch(q);
        setHits(data);
        setActiveIdx(0);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const navigate = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && hits[activeIdx]) {
      e.preventDefault();
      navigate(hits[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Fatura veya müşteri ara…"
        className="bg-border/50 text-white text-sm pl-9 pr-12 py-2 rounded-lg border border-border focus:outline-none focus:border-primary/50 w-64 placeholder:text-muted"
      />
      <kbd className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded bg-bg/80 border border-border text-[10px] text-muted font-mono">
        Ctrl K
      </kbd>

      <AnimatePresence>
        {open && (query.trim() || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            {loading && (
              <div className="px-4 py-3 flex items-center gap-2 text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Aranıyor…
              </div>
            )}
            {!loading && hits.length === 0 && query.trim() && (
              <div className="px-4 py-6 text-center text-muted text-sm">
                Eşleşme yok
              </div>
            )}
            {!loading && hits.length > 0 && (
              <div className="max-h-72 overflow-y-auto">
                {hits.map((h, i) => {
                  const Icon = h.type === "fatura" ? FileText : Users;
                  const active = i === activeIdx;
                  return (
                    <button
                      key={`${h.type}-${h.id}`}
                      onClick={() => navigate(h)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/40 last:border-0 ${
                        active ? "bg-primary/10" : "hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${h.type === "fatura" ? "text-accent" : "text-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{h.title}</p>
                        {h.subtitle && <p className="text-muted text-xs truncate">{h.subtitle}</p>}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted font-mono">
                        {h.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
