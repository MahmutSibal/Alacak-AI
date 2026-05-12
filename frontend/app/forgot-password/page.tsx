"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft, Copy, CheckCheck } from "lucide-react";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ message: string; reset_token?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("E-posta adresi gereklidir"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await forgotPassword(email);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "İşlem başarısız");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (result?.reset_token) {
      navigator.clipboard.writeText(result.reset_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-white font-bold text-xl">AlacakAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Şifremi Unuttum</h1>
          <p className="text-muted text-sm mt-2">E-postanızı girin, sıfırlama tokenı oluşturalım</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <div className="w-14 h-14 bg-success/20 border border-success/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-success" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Talep Alındı</h3>
                <p className="text-muted text-sm mb-5">{result.message}</p>

                {result.reset_token && (
                  <div className="bg-border/30 border border-border rounded-xl p-4 text-left mb-4">
                    <p className="text-muted text-xs mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                      Geliştirici Modu — Reset Token (gerçek ortamda e-posta ile gelir)
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-accent text-xs font-mono flex-1 break-all">{result.reset_token}</code>
                      <button onClick={copyToken} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors flex-shrink-0">
                        {copied ? <CheckCheck className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Link
                  href={result.reset_token ? `/reset-password?token=${result.reset_token}` : "/login"}
                  className="block w-full bg-primary text-on-primary py-3 rounded-xl font-semibold text-center hover:bg-primary/80 transition-all"
                >
                  {result.reset_token ? "Şifremi Sıfırla" : "Giriş Sayfasına Dön"}
                </Link>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-muted text-xs mb-2 block">Kayıtlı E-posta Adresiniz</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@sirket.com"
                      className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-primary flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</> : "Sıfırlama Bağlantısı Gönder"}
                </button>

                <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted hover:text-white transition-colors mt-2">
                  <ArrowLeft className="w-4 h-4" /> Giriş sayfasına dön
                </Link>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
