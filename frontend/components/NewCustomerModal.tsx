"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, UserPlus, Loader2, AlertCircle, CheckCircle,
  Building2, User, Phone, MessageCircle,
} from "lucide-react";
import { createCustomer, type CustomerCreatePayload, type CustomerSector } from "@/lib/api";

interface NewCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const inputCls =
  "w-full bg-bg/60 text-white text-sm px-3 py-2.5 rounded-lg border border-border " +
  "focus:outline-none focus:border-primary/60 placeholder:text-muted/60";
const labelCls = "block text-xs text-muted font-medium mb-1.5";

const SECTORS: { value: CustomerSector; label: string }[] = [
  { value: "insaat", label: "İnşaat" },
  { value: "perakende", label: "Perakende" },
  { value: "uretim", label: "Üretim" },
  { value: "hizmet", label: "Hizmet" },
  { value: "tarim", label: "Tarım" },
  { value: "lojistik", label: "Lojistik" },
  { value: "teknoloji", label: "Teknoloji" },
  { value: "saglik", label: "Sağlık" },
  { value: "egitim", label: "Eğitim" },
  { value: "diger", label: "Diğer" },
];

export default function NewCustomerModal({ open, onClose, onCreated }: NewCustomerModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [musteriTipi, setMusteriTipi] = useState<"kurumsal" | "bireysel">("kurumsal");
  const [isim, setIsim] = useState("");
  const [yetkiliKisi, setYetkiliKisi] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [vergiNo, setVergiNo] = useState("");
  const [vergiDairesi, setVergiDairesi] = useState("");
  const [sehir, setSehir] = useState("");
  const [adres, setAdres] = useState("");
  const [sektor, setSektor] = useState<CustomerSector | "">("");
  const [krediLimiti, setKrediLimiti] = useState("");
  const [odemeVadesi, setOdemeVadesi] = useState("30");
  const [acikBorc, setAcikBorc] = useState("");
  const [notlar, setNotlar] = useState("");

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setMusteriTipi("kurumsal");
    setIsim("");
    setYetkiliKisi("");
    setEmail("");
    setTelefon("");
    setWhatsapp("");
    setWhatsappSameAsPhone(true);
    setVergiNo("");
    setVergiDairesi("");
    setSehir("");
    setAdres("");
    setSektor("");
    setKrediLimiti("");
    setOdemeVadesi("30");
    setAcikBorc("");
    setNotlar("");
    setError(null);
    setSuccess(false);
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  const validate = (): string | null => {
    if (!isim.trim()) {
      return musteriTipi === "kurumsal" ? "Firma adı zorunlu" : "Ad soyad zorunlu";
    }
    if (vergiNo) {
      const digits = vergiNo.replace(/\D/g, "");
      if (digits.length !== 10 && digits.length !== 11) {
        return "Vergi No 10 hane, T.C. Kimlik 11 hane olmalı";
      }
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "E-posta formatı geçersiz";
    }
    if (telefon) {
      const digits = telefon.replace(/\D/g, "");
      if (digits.length < 10) return "Telefon en az 10 haneli olmalı";
    }
    if (!telefon && !whatsappSameAsPhone && !whatsapp) {
      // No way to reach the customer — soft warning
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CustomerCreatePayload = {
        isim: isim.trim(),
        musteri_tipi: musteriTipi,
        email: email.trim() || undefined,
        telefon: telefon.trim() || undefined,
        whatsapp: (whatsappSameAsPhone ? telefon.trim() : whatsapp.trim()) || undefined,
        vergi_no: vergiNo.replace(/\D/g, "") || undefined,
        vergi_dairesi: vergiDairesi.trim() || undefined,
        adres: adres.trim() || undefined,
        sehir: sehir.trim() || undefined,
        sektor: (sektor || undefined) as CustomerSector | undefined,
        yetkili_kisi: yetkiliKisi.trim() || undefined,
        kredi_limiti: krediLimiti ? parseFloat(krediLimiti.replace(",", ".")) : undefined,
        odeme_vadesi_gun: odemeVadesi ? parseInt(odemeVadesi, 10) : undefined,
        acik_borc: acikBorc ? parseFloat(acikBorc.replace(",", ".")) : 0,
        notlar: notlar.trim() || undefined,
      };
      await createCustomer(payload);
      setSuccess(true);
      onCreated?.();
      setTimeout(onClose, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kayıt başarısız";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !submitting && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl shadow-black/60 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base leading-none">Yeni Müşteri</h3>
                  <p className="text-muted text-xs mt-1">Manuel müşteri kaydı</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-muted hover:text-white disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Customer type toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-bg/40 border border-border rounded-xl">
                  {[
                    { value: "kurumsal" as const, label: "Kurumsal", Icon: Building2 },
                    { value: "bireysel" as const, label: "Bireysel", Icon: User },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMusteriTipi(value)}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        musteriTipi === value
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-muted hover:text-white"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Identity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>
                      {musteriTipi === "kurumsal" ? "Firma Adı *" : "Ad Soyad *"}
                    </label>
                    <input
                      value={isim}
                      onChange={(e) => setIsim(e.target.value)}
                      placeholder={musteriTipi === "kurumsal" ? "ABC Ticaret Ltd. Şti." : "Ahmet Yılmaz"}
                      className={inputCls}
                    />
                  </div>
                  {musteriTipi === "kurumsal" && (
                    <div className="md:col-span-2">
                      <label className={labelCls}>Yetkili Kişi</label>
                      <input
                        value={yetkiliKisi}
                        onChange={(e) => setYetkiliKisi(e.target.value)}
                        placeholder="İrtibat kuracağın kişinin adı"
                        className={inputCls}
                      />
                    </div>
                  )}
                </div>

                {/* Communication block */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>E-posta</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@firma.com"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          Telefon
                        </span>
                      </label>
                      <input
                        value={telefon}
                        onChange={(e) => {
                          setTelefon(e.target.value);
                          if (whatsappSameAsPhone) setWhatsapp(e.target.value);
                        }}
                        placeholder="+90 555 123 45 67"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {/* WhatsApp — same as phone toggle */}
                  <div className="bg-bg/40 border border-border rounded-xl p-3">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={whatsappSameAsPhone}
                        onChange={(e) => {
                          setWhatsappSameAsPhone(e.target.checked);
                          if (e.target.checked) setWhatsapp(telefon);
                        }}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                        <MessageCircle className="w-3.5 h-3.5 text-success" />
                        WhatsApp numarası telefonla aynı
                      </span>
                    </label>
                    {!whatsappSameAsPhone && (
                      <input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="Ayrı WhatsApp numarası"
                        className={inputCls}
                      />
                    )}
                    <p className="text-[11px] text-muted mt-2 leading-relaxed">
                      WhatsApp numarası, AlacakAI'nin tahsilat hatırlatma mesajlarını gönderebilmesi için kullanılır.
                    </p>
                  </div>
                </div>

                {/* Tax & legal */}
                {musteriTipi === "kurumsal" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Vergi No</label>
                      <input
                        value={vergiNo}
                        onChange={(e) => setVergiNo(e.target.value)}
                        placeholder="1234567890"
                        maxLength={11}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Vergi Dairesi</label>
                      <input
                        value={vergiDairesi}
                        onChange={(e) => setVergiDairesi(e.target.value)}
                        placeholder="Maslak / Çankaya / vb."
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Şehir</label>
                    <input
                      value={sehir}
                      onChange={(e) => setSehir(e.target.value)}
                      placeholder="İstanbul"
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Adres</label>
                    <input
                      value={adres}
                      onChange={(e) => setAdres(e.target.value)}
                      placeholder="Mahalle, cadde, no…"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Business profile */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Sektör</label>
                    <select
                      value={sektor}
                      onChange={(e) => setSektor(e.target.value as CustomerSector | "")}
                      className={inputCls}
                    >
                      <option value="">— Seçilmedi —</option>
                      {SECTORS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Ödeme Vadesi (gün)</label>
                    <input
                      value={odemeVadesi}
                      onChange={(e) => setOdemeVadesi(e.target.value)}
                      placeholder="30"
                      inputMode="numeric"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Kredi Limiti (TL)</label>
                    <input
                      value={krediLimiti}
                      onChange={(e) => setKrediLimiti(e.target.value)}
                      placeholder="100.000"
                      inputMode="decimal"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Initial debt */}
                <div>
                  <label className={labelCls}>Başlangıç Açık Borç (TL)</label>
                  <input
                    value={acikBorc}
                    onChange={(e) => setAcikBorc(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className={inputCls}
                  />
                  <p className="text-[11px] text-muted mt-1.5">
                    Bu müşterinin halihazırda var olan toplam borcunu girin (yoksa boş bırakın).
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>Notlar</label>
                  <textarea
                    value={notlar}
                    onChange={(e) => setNotlar(e.target.value)}
                    rows={2}
                    placeholder="İsteğe bağlı — özel anlaşma, ödeme alışkanlığı, vb."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {/* Error / success */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success/10 border border-success/30 text-success text-sm"
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Müşteri kaydedildi.</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg/30">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-muted hover:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-bg rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : (
                    "Müşteriyi Kaydet"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
