"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [form, setForm] = useState({ token: tokenFromUrl, sifre: "", sifre2: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.token) {
      setError("Sıfırlama tokenı gereklidir");
      return;
    }
    if (form.sifre.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }
    if (form.sifre !== form.sifre2) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(form.token, form.sifre);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.message || "Şifre sıfırlama başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-white font-bold text-xl">AlacakAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Yeni Şifre Belirle</h1>
          <p className="text-muted text-sm mt-2">Güçlü bir şifre seçin</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8">
          {success ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-4">
              <div className="w-14 h-14 bg-success/20 border border-success/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Şifreniz Güncellendi!</h3>
              <p className="text-muted text-sm">Giriş sayfasına yönlendiriliyorsunuz...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {!tokenFromUrl && (
                <div>
                  <label className="text-muted text-xs mb-2 block">Sıfırlama Tokenı</label>
                  <input
                    type="text"
                    value={form.token}
                    onChange={(e) => setForm({ ...form, token: e.target.value })}
                    placeholder="E-postanızdaki token"
                    className="w-full bg-border/30 text-white text-sm px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="text-muted text-xs mb-2 block">Yeni Şifre</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.sifre}
                    onChange={(e) => setForm({ ...form, sifre: e.target.value })}
                    placeholder="En az 6 karakter"
                    className="w-full bg-border/30 text-white text-sm pl-10 pr-12 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted text-xs mb-2 block">Şifre Tekrar</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.sifre2}
                    onChange={(e) => setForm({ ...form, sifre2: e.target.value })}
                    placeholder="Şifrenizi tekrar girin"
                    className={`w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border focus:outline-none placeholder:text-muted/50 transition-colors ${
                      form.sifre2 && form.sifre !== form.sifre2 ? "border-danger/60" : "border-border focus:border-primary/60"
                    }`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold hover:bg-primary/80 disabled:opacity-50 transition-all glow-primary flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Güncelleniyor...</> : "Şifremi Güncelle"}
              </button>

              <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Giriş sayfasına dön
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}