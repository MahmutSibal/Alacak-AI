"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, RotateCcw, Copy, CheckCheck } from "lucide-react";
import { sendChat } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestions = [
  "Bu ay tahsilat riskim nedir?",
  "En riskli müşterileri göster",
  "Geciken faturalar için mesaj oluştur",
  "Nakit akışı tahminimi analiz et",
  "Kritik müşteriler için yapılandırma öner",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Merhaba. Ben AlacakAI analiz asistanıyım. Sohbet için değil; tahsilat riski, geciken faturalar, nakit akışı ve yapılandırma aksiyonları için veri okurum. Ne analiz edelim?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const prompt = text || input.trim();
    if (!prompt || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChat(prompt);

      const extractText = (d: any) => {
        if (d == null) return "Yanıt alınamadı.";
        if (typeof d === "string") return d;
        if (typeof d === "object") {
          if (typeof d.result === "string") return d.result;
          if (d.result && typeof d.result.text === "string") return d.result.text;
          if (d.result && typeof d.result.error === "string") return `❗ AI hatası: ${d.result.error}`;
          // FastAPI 4xx/5xx errors land here
          if (typeof d.detail === "string") return `❗ ${d.detail}`;
          if (d.error) return d.error.message || JSON.stringify(d.error);
          if (d.choices && Array.isArray(d.choices) && d.choices[0]) {
            const c = d.choices[0];
            return c.message?.content || c.text || JSON.stringify(c);
          }
          try {
            return JSON.stringify(d);
          } catch (e) {
            return String(d);
          }
        }
        return String(d);
      };

      const text = extractText(data);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat send error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Bağlantı hatası oluştu. Lütfen backend servisinin çalıştığından emin olun.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Sohbet temizlendi. Size nasıl yardımcı olabilirim?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-white font-semibold">CEO AI Asistanı</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted">Analiz modu • Veri odaklı</span>
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-white px-3 py-1.5 rounded-lg hover:bg-border/50 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Temizle
        </button>
      </div>

      <div className="flex-1 glass rounded-2xl border border-border overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                    msg.role === "assistant"
                      ? "bg-primary/20 border border-primary/40"
                      : "bg-accent/20 border border-accent/40"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-4 h-4 text-primary" />
                  ) : (
                    <User className="w-4 h-4 text-accent" />
                  )}
                </div>

                <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div
                    className={`relative group rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent/15 border border-accent/25 text-white rounded-tr-sm"
                        : "bg-surface border border-border text-white/90 rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10"
                    >
                      {copiedId === msg.id ? (
                        <CheckCheck className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted" />
                      )}
                    </button>
                  </div>
                  <span className="text-xs text-muted px-1">
                    {msg.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted ml-1">AI düşünüyor...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-5 pb-3">
            <p className="text-xs text-muted mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Hızlı analiz soruları
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs text-muted hover:text-white px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Bir soru sorun veya komut verin..."
              disabled={loading}
              className="flex-1 bg-border/30 text-white text-sm px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all glow-primary"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
