"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
  Zap, Shield, TrendingUp, MessageSquare, FileText,
  ArrowRight, CheckCircle, Star, ChevronRight
} from "lucide-react";

const features = [
  { icon: FileText, title: "AI Fatura Analizi", desc: "PDF faturaları sürükle bırak ile yükle, OCR ve Llama 3.1 AI otomatik tüm alanları çıkarsın." },
  { icon: Shield, title: "Risk Skorlama", desc: "Her müşteri için 0-100 arası risk skoru, tahsilat olasılığı ve önerilen aksiyon üretilir." },
  { icon: MessageSquare, title: "Otomatik İletişim", desc: "WhatsApp, e-posta ve SMS için risk skoruna göre tonlanmış ödeme hatırlatma mesajları." },
  { icon: TrendingUp, title: "Nakit Akışı Tahmini", desc: "30/60/90 günlük tahsilat, gider ve nakit dengesi simülasyonu ile riskli dönemler öngörülür." },
  { icon: Zap, title: "AI Orchestrator", desc: "4 persona eş zamanlı çalışarak faturalarınızı izler, müşterilerinizi analiz eder, öneriler üretir." },
  { icon: Star, title: "CEO Asistanı", desc: "Llama 3.1 destekli chat ile tek soruyla tüm finansal durumunuzu anlık öğrenin." },
];

const stats = [
  { value: "%34", label: "Ortalama tahsilat hızlanması" },
  { value: "4", label: "Otonom AI persona" },
  { value: "%92", label: "Risk tahmin doğruluğu" },
  { value: "∞", label: "Fatura işleme kapasitesi" },
];

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-bg grid-bg text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-white font-bold text-xl">AlacakAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted hover:text-white transition-colors px-4 py-2">
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="text-sm bg-primary text-on-primary px-5 py-2.5 rounded-xl hover:bg-primary/80 transition-all glow-primary"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-10 w-96 h-96 bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/6 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary text-xs px-4 py-2 rounded-full mb-6"
            >
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Llama 3.1 ile güçlendirilmiş
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
            >
              KOBİ'ler için <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Yapay Zeka</span> Destekli
              <br /> Alacak Yönetimi
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-lg text-muted max-w-2xl mx-auto md:mx-0 mb-8"
            >
              Faturaları analiz et, müşterileri risk skorla, otomatik hatırlatmalar gönder ve 90 güne kadar nakit akışı tahminleri al. Sürekli çalışan 4 AI persona
              ile süreçleriniz hız kazanır.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="flex items-center gap-4 flex-wrap justify-center md:justify-start"
            >
              <Link
                href="/register"
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-2xl text-base font-semibold hover:bg-primary/80 transition-all glow-primary"
              >
                Ücretsiz Başla <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 border border-border text-white px-5 py-3 rounded-2xl text-base hover:border-primary/40 transition-all"
              >
                Giriş Yap <ChevronRight className="w-5 h-5 text-muted" />
              </Link>
            </motion.div>
          </div>

          {/* Animated mockup */}
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-80 h-56 perspective">
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-primary mb-2">{s.value}</p>
              <p className="text-muted text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">4 Otonom AI Persona, Tek Platform</h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Her ajan kendi alanında uzmanlaşmış, birbirleriyle koordineli çalışarak tahsilat sürecinizi otomatikleştirir.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-2xl border border-border p-6 hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:glow-primary transition-all">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-3xl border border-primary/25 p-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-6 glow-primary">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Hemen Ücretsiz Başlayın</h2>
            <p className="text-muted mb-8 text-lg">
              Kredi kartı gerektirmez. Dakikalar içinde kurulum tamamlanır.
            </p>
            <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
              {["Sınırsız fatura", "4 AI persona", "Nakit akışı tahmini", "Risk analizi"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted">
                  <CheckCircle className="w-4 h-4 text-success" />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-2xl font-semibold hover:bg-primary/80 transition-all glow-primary"
            >
              Ücretsiz Hesap Oluştur <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-muted text-sm">© 2026 AlacakAI — KOBİ'ler için Yapay Zekâ Alacak Yönetimi</p>
      </footer>
    </div>
  );
}
