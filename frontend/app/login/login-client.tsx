"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { login, getToken } from "@/lib/auth";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !sifre) {
      setError("E-posta ve şifre gereklidir");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, sifre);
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-white font-bold text-xl">AlacakAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Hesabınıza Giriş Yapın</h1>
          <p className="text-muted text-sm mt-2">AI alacak yönetim sisteminize hoş geldiniz</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="text-muted text-xs mb-2 block">E-posta Adresi</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-muted text-xs">Şifre</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPass ? "text" : "password"}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-border/30 text-white text-sm pl-10 pr-12 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-primary flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Giriş yapılıyor...</> : "Giriş Yap"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted text-sm">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Ücretsiz Kayıt Ol
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}