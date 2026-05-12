"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import WhatsAppConnectCard from "@/components/WhatsAppConnectCard";
import { Settings, Bell, Shield, Zap, Save, RefreshCw, CheckCircle, Users, UserPlus, Mail, Lock, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createAuthorizedUser } from "@/lib/auth";
import { ROLE_LABELS, ROLE_OPTIONS } from "@/lib/access";

export default function Ayarlar() {
  const { user, role, loading } = useAuth();
  const [saved, setSaved] = useState(false);
  const [teamSaved, setTeamSaved] = useState("");
  const [form, setForm] = useState({
    companyName: "Demo Şirket A.Ş.",
    email: "cfo@demo.com",
    riskThreshold: 70,
    whatsapp: true,
    email_notify: true,
    sms: false,
    llmModel: "llama3.1:8b",
    orchestratorInterval: 30,
  });
  const [teamForm, setTeamForm] = useState({
    isim: "",
    email: "",
    sifre: "",
    rol: "finans_sorumlusu",
    sirket_adi: "",
    telefon: "",
  });

  useEffect(() => {
    const companyName = user?.sirket_adi || user?.isim || form.companyName;
    setForm((current) => (current.companyName === companyName ? current : { ...current, companyName }));
    setTeamForm((current) => ({
      ...current,
      sirket_adi: current.sirket_adi || companyName,
    }));
  }, [user]);

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCreateAuthorized = async (event: React.FormEvent) => {
    event.preventDefault();
    setTeamSaved("");

    if (!teamForm.isim || !teamForm.email || !teamForm.sifre) {
      setTeamSaved("Tüm yetkili alanlarını doldurun.");
      return;
    }

    if (teamForm.sifre.length < 6) {
      setTeamSaved("Şifre en az 6 karakter olmalı.");
      return;
    }

    try {
      const created = await createAuthorizedUser({
        isim: teamForm.isim,
        email: teamForm.email,
        sifre: teamForm.sifre,
        rol: teamForm.rol,
        telefon: teamForm.telefon || undefined,
        sirket_adi: teamForm.sirket_adi || form.companyName,
      });
      setTeamSaved(`${created.isim} için ${ROLE_LABELS[created.rol as keyof typeof ROLE_LABELS] || created.rol} oluşturuldu.`);
      setTeamForm({
        isim: "",
        email: "",
        sifre: "",
        rol: "finans_sorumlusu",
        sirket_adi: form.companyName,
        telefon: "",
      });
    } catch (error: any) {
      setTeamSaved(error.message || "Yetkili oluşturulamadı.");
    }
  };

  return (
    <div className="flex min-h-screen bg-bg grid-bg">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Ayarlar" subtitle="Sistem ve AI konfigürasyonu" />
        <main className="p-6 space-y-6 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Genel Ayarlar
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-muted text-xs mb-2 block">Şirket Adı</label>
                <input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full bg-border/30 text-white text-sm px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-muted text-xs mb-2 block">E-posta Adresi</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-border/30 text-white text-sm px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border border-border p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-danger" />
              Risk Eşiği
            </h3>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-muted text-xs">Kritik Risk Eşiği</label>
                <span className="text-white font-bold text-lg">{form.riskThreshold}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={form.riskThreshold}
                onChange={(e) => setForm({ ...form, riskThreshold: parseInt(e.target.value) })}
                className="w-full accent-danger"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>0 — İyi</span>
                <span>100 — Kritik</span>
              </div>
              <p className="text-xs text-muted mt-3">Bu eşiğin üzerindeki müşteriler otomatik olarak kritik listesine alınır.</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <WhatsAppConnectCard />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="glass rounded-2xl border border-border p-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Yetkili Ekle
            </h3>
            <p className="text-muted text-sm mb-5">
              Şirket hesabınız altında yeni kullanıcı oluşturun. Her rol yalnızca kendi ekranlarına erişir.
            </p>

            {loading ? null : !role || role !== "admin" ? (
              <div className="rounded-xl border border-border bg-border/20 p-4 text-sm text-muted">
                Bu bölüm yalnızca yönetici hesabına açıktır.
              </div>
            ) : (
              <form onSubmit={handleCreateAuthorized} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-muted text-xs mb-2 block">Ad Soyad / Ünvan</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        value={teamForm.isim}
                        onChange={(e) => setTeamForm({ ...teamForm, isim: e.target.value })}
                        placeholder="Ahmet Yılmaz"
                        className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-muted text-xs mb-2 block">E-posta</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={teamForm.email}
                        onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                        placeholder="yetkili@sirket.com"
                        className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-muted text-xs mb-2 block">Şifre</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={teamForm.sifre}
                        onChange={(e) => setTeamForm({ ...teamForm, sifre: e.target.value })}
                        placeholder="En az 6 karakter"
                        className="w-full bg-border/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted/50"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-muted text-xs mb-2 block">Rol</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ROLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTeamForm({ ...teamForm, rol: option.value })}
                          className={`p-3 rounded-xl text-left border transition-colors ${teamForm.rol === option.value ? "border-primary bg-primary/10" : "border-border bg-border/10"}`}
                        >
                          <div className="text-white font-medium">{option.label}</div>
                          <div className="text-muted text-xs mt-1">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-muted text-xs mb-2 block">Telefon (WhatsApp)</label>
                    <div className="relative">
                      <input
                        value={teamForm.telefon}
                        onChange={(e) => setTeamForm({ ...teamForm, telefon: e.target.value })}
                        placeholder="905xx... veya +90..."
                        className="w-full bg-border/30 text-white text-sm pl-4 pr-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50 placeholder:text-muted/50"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-muted text-xs mb-2 block">Şirket</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={teamForm.sirket_adi || form.companyName}
                      readOnly
                      className="w-full bg-border/20 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-border/80 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-border/20 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Rol kısıtları</p>
                  {ROLE_OPTIONS.filter((option) => option.value !== "admin").map((option) => (
                    <div key={option.value} className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-white">{option.label}</span>
                      <span className="text-muted text-right">{option.description}</span>
                    </div>
                  ))}
                </div>

                {teamSaved && <p className="text-sm text-muted">{teamSaved}</p>}

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-primary px-5 py-3 rounded-xl text-on-primary font-medium hover:bg-primary/80 transition-all glow-primary"
                >
                  <UserPlus className="w-4 h-4" />
                  Yetkili Oluştur
                </button>
              </form>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl border border-border p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Bell className="w-4 h-4 text-accent" />
              Bildirim Kanalları
            </h3>
            <div className="space-y-4">
              {[
                { key: "whatsapp", label: "WhatsApp", desc: "Ödeme hatırlatmaları için WhatsApp mesajları (varsayılan kanal)" },
                { key: "email_notify", label: "E-posta", desc: "Tüm bildirimler için e-posta" },
              ].map((ch) => (
                <div key={ch.key} className="flex items-center justify-between p-4 bg-border/20 rounded-xl border border-border">
                  <div>
                    <p className="text-white text-sm font-medium">{ch.label}</p>
                    <p className="text-muted text-xs mt-0.5">{ch.desc}</p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, [ch.key]: !(form as any)[ch.key] })}
                    className={`w-11 h-6 rounded-full transition-all relative ${(form as any)[ch.key] ? "bg-primary" : "bg-border"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${(form as any)[ch.key] ? "right-1" : "left-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl border border-border p-6">
            <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              AI Konfigürasyonu
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-muted text-xs mb-2 block">Ollama Modeli</label>
                <select
                  value={form.llmModel}
                  onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                  className="w-full bg-border/30 text-white text-sm px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary/50"
                >
                  <option value="llama3.1:8b">Llama 3.1 8B (Önerilen)</option>
                  <option value="llama3.1:70b">Llama 3.1 70B (Ağır)</option>
                  <option value="qwen2.5:7b">Qwen 2.5 7B</option>
                  <option value="qwen2.5:14b">Qwen 2.5 14B</option>
                  <option value="mistral:7b">Mistral 7B</option>
                </select>
                <p className="text-xs text-muted mt-2">
                  4 persona (risk, iletişim, yapılandırma, nakit akışı) bu modele konuşur. Model değişimi backend restart gerektirir.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-muted text-xs">Orchestrator Döngü Süresi</label>
                  <span className="text-white font-bold">{form.orchestratorInterval}s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={10}
                  value={form.orchestratorInterval}
                  onChange={(e) => setForm({ ...form, orchestratorInterval: parseInt(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-primary px-6 py-3 rounded-xl text-on-primary font-medium hover:bg-primary/80 transition-all glow-primary"
            >
              {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Kaydedildi!" : "Kaydet"}
            </button>
            <button className="flex items-center gap-2 border border-border px-6 py-3 rounded-xl text-muted hover:text-white hover:border-primary/30 transition-all">
              <RefreshCw className="w-4 h-4" />
              Sıfırla
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
