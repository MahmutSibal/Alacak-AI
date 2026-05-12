"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, Loader2, Building2 } from "lucide-react";
import { register, login, getToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ isim: "", email: "", sifre: "", sifre2: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const passwordStrength = (p: string) => {
    if (p.length === 0) return 0;
    if (p.length < 6) return 1;
    if (p.length < 8) return 2;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return 4;
    return 3;
  };

  const strength = passwordStrength(form.sifre);
  const strengthColors = ["", "bg-danger", "bg-orange-400", "bg-yellow-400", "bg-success"];
  const strengthLabels = ["", "Çok zayıf", "Zayıf", "Orta", "Güçlü"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.isim || !form.email || !form.sifre) { setError("Tüm alanları doldurun"); return; }
    if (form.sifre !== form.sifre2) { setError("Şifreler eşleşmiyor"); return; }
    if (form.sifre.length < 6) { setError("Şifre en az 6 karakter olmalıdır"); return; }

    setLoading(true);
    try {
      await register(form.isim, form.email, form.sifre);
      setSuccess(true);
      // Auto-login after register
      await login(form.email, form.sifre);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg grid-bg flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-white font-bold text-xl">AlacakAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Ücretsiz Hesap Oluşturun</h1>
          <p className="text-muted text-sm mt-2">İlk hesap şirketinizin yönetici hesabı olarak açılır, kredi kartı gerekmez.</p>
        </div>

        <div className="glass rounded-2xl border border-border p-8">
          {success ? (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-6">
              <div className="w-16 h-16 bg-success/20 border border-success/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Hesabınız Oluşturuldu!</h3>
              <p className="text-muted text-sm">Dashboard'a yönlendiriliyorsunuz...</p>
            </motion.div>
          ) : (
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
                <label className="text-muted text-xs mb-2 block">Ad Soyad / Şirket Adı</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={form.isim}
                    onChange={update("isim")}
                    placeholder="ACME Ticaret A.Ş."
                    className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-muted text-xs mb-2 block">E-posta Adresi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="ornek@sirket.com"
                    className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-muted text-xs mb-2 block">Şifre</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.sifre}
                    onChange={update("sifre")}
                    placeholder="En az 6 karakter"
                    className="w-full bg-border/30 text-white text-sm pl-10 pr-12 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/60 placeholder:text-muted/50"
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.sifre && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-border"}`} />
                      ))}
                    </div>
                    <p className={`text-xs mt-1 ${strengthColors[strength].replace("bg-", "text-")}`}>{strengthLabels[strength]}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-muted text-xs mb-2 block">Şifre Tekrar</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.sifre2}
                    onChange={update("sifre2")}
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
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-primary flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Hesap oluşturuluyor...</> : "Ücretsiz Kayıt Ol"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted text-sm">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Giriş Yap</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
