import { authHeaders } from "./auth";

const BASE = "/api";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
};

export async function getDashboardStats() {
  return api.get("/invoices/stats");
}

export async function getInvoices() {
  return api.get("/invoices");
}

export async function getCustomers() {
  return api.get("/customers");
}

export async function getCustomerStats() {
  return api.get("/customers/stats");
}

export interface CashflowForecast {
  range: string;
  horizon_days: number;
  series: { ay: string; tahsilat: number; gider: number; net: number }[];
  has_data: boolean;
}

export async function getCashflowForecast(range: "30g" | "60g" | "90g" | "1y" = "90g"): Promise<CashflowForecast> {
  return api.get(`/invoices/cashflow?range=${encodeURIComponent(range)}`);
}

export type CustomerSector =
  | "insaat" | "perakende" | "uretim" | "hizmet" | "tarim"
  | "lojistik" | "teknoloji" | "saglik" | "egitim" | "diger";

export interface CustomerCreatePayload {
  isim: string;
  musteri_tipi?: "kurumsal" | "bireysel";
  email?: string;
  telefon?: string;
  whatsapp?: string;
  vergi_no?: string;
  vergi_dairesi?: string;
  adres?: string;
  sehir?: string;
  sektor?: CustomerSector;
  yetkili_kisi?: string;
  kredi_limiti?: number;
  odeme_vadesi_gun?: number;
  acik_borc?: number;
  notlar?: string;
  is_critical?: boolean;
}

export async function createCustomer(payload: CustomerCreatePayload) {
  return api.post(`/customers/`, payload);
}

export async function deleteCustomer(id: string) {
  return api.delete(`/customers/${id}`);
}

// ---------- Agent / persona / activity ----------------------------------

export interface AgentLog {
  id: string;
  agent: string;
  message?: string;
  persona?: string;
  ts: string;
  meta?: Record<string, unknown>;
}

export async function getAgentLogs(limit = 20): Promise<AgentLog[]> {
  return api.get(`/agent-logs?limit=${limit}`);
}

export interface AgentSummary {
  total: number;
  by_agent: Record<string, number>;
}

export async function getAgentSummary(): Promise<AgentSummary> {
  return api.get(`/agent-logs/summary`);
}

export interface Persona {
  id: string;
  name: string;
  title: string;
}

export async function getPersonas(): Promise<{ personas: Persona[] }> {
  return api.get(`/agents/personas`);
}

// ---------- Invoices -----------------------------------------------------

export interface InvoiceCreatePayload {
  fatura_no: string;
  firma_adi: string;
  ara_toplam: number;
  kdv_orani: number;
  kdv_tutari?: number;
  tutar?: number;
  para_birimi: "TRY" | "USD" | "EUR";
  duzenleme_tarihi: string; // YYYY-MM-DD
  vade_tarihi: string;      // YYYY-MM-DD
  musteri_id?: string;
  vergi_no?: string;
  aciklama?: string;
  durum?: "Bekleyen" | "Ödendi" | "Gecikmiş" | "İptal";
}

export async function createInvoice(payload: InvoiceCreatePayload) {
  return api.post(`/invoices/`, payload);
}

export async function uploadInvoice(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/invoices/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Yükleme başarısız");
  }
  return res.json();
}

// ---------- Risk ---------------------------------------------------------

export interface RiskBucket {
  name: "Kritik" | "Yüksek" | "Orta" | "Düşük";
  value: number;
  color: string;
}

export interface RiskDistribution {
  data: RiskBucket[];
  total: number;
  scored: number;
  unscored: number;
}

export interface RiskRadarPoint {
  subject: string;
  value: number;
}

export interface RiskRadar {
  data: RiskRadarPoint[];
  context: {
    customers: number;
    invoices: number;
    scored: number;
    overdue_invoices: number;
  };
}

export interface RiskCustomer {
  id: string;
  isim: string;
  sektor?: string | null;
  acik_borc?: number;
  score: number;
  label: "Kritik" | "Yüksek" | "Orta" | "Düşük";
  color: string;
  delta: number;
  previous_score: number | null;
  recommended_action?: string | null;
  signals: string[];
  payment_probability: number | null;
}

export async function getRiskDistribution(): Promise<RiskDistribution> {
  return api.get(`/risk/distribution`);
}

export async function getRiskRadar(): Promise<RiskRadar> {
  return api.get(`/risk/radar`);
}

export async function getRiskCustomers(limit = 20): Promise<RiskCustomer[]> {
  return api.get(`/risk/customers?limit=${limit}`);
}

export async function analyzeCustomerRisk(customerId: string) {
  return api.post(`/risk/analyze/${customerId}`, {});
}

export async function analyzeAllRisks() {
  return api.post(`/risk/analyze-all`, {});
}

// ---------- AI chat ------------------------------------------------------

export async function sendChat(prompt: string) {
  return api.post("/ai/chat", { prompt });
}

// ---------- WhatsApp -----------------------------------------------------

export interface WhatsAppStatus {
  configured: boolean;
  connected: boolean;
  state?: string;
  session?: string;
  has_qr?: boolean;
  profile?: {
    wid?: string | null;
    pushname?: string | null;
    platform?: string | null;
  } | null;
  reason?: string;
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  return api.get(`/whatsapp/status`);
}

export interface WhatsAppQR {
  qr?: string;          // base64 PNG without prefix
  dataUrl?: string;     // ready-to-render data: URL
  attempts?: number;
  state?: string;
}

export async function getWhatsAppQR(): Promise<WhatsAppQR> {
  return api.get(`/whatsapp/qr`);
}

export async function sendWhatsAppRemind(customerId: string, opts?: {
  amount?: number;
  due_date?: string;
  auto_send?: boolean;
}) {
  return api.post(`/whatsapp/remind`, {
    customer_id: customerId,
    amount: opts?.amount,
    due_date: opts?.due_date,
    auto_send: opts?.auto_send ?? true,
  });
}

export async function startWhatsAppSession() {
  return api.post(`/whatsapp/start-session`, {});
}

export async function stopWhatsAppSession() {
  return api.post(`/whatsapp/stop-session`, {});
}

// ---------- Notifications (derived from agent_logs) ----------------------

export interface Notification {
  id: string;
  agent: string;
  message: string;
  ts: string;
  level: "info" | "warning" | "error";
}

const ERROR_KEYS = ["error", "başarısız", "olmadı", "hata"];
const WARNING_KEYS = ["risk", "kritik", "geciken", "uyarı"];

export async function getNotifications(limit = 12): Promise<Notification[]> {
  const logs = await getAgentLogs(limit);
  return logs
    .filter((l) => l.message)
    .map((l) => {
      const text = (l.message || "").toLowerCase();
      let level: Notification["level"] = "info";
      if (ERROR_KEYS.some((k) => text.includes(k))) level = "error";
      else if (WARNING_KEYS.some((k) => text.includes(k))) level = "warning";
      return { id: l.id, agent: l.agent, message: l.message || "", ts: l.ts, level };
    });
}

// ---------- Global search (over invoices + customers) ------------------

export interface SearchHit {
  id: string;
  type: "fatura" | "musteri";
  title: string;
  subtitle?: string;
  href: string;
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const [invoices, customers] = await Promise.all([
    getInvoices().catch(() => []),
    getCustomers().catch(() => []),
  ]);

  const invoiceHits: SearchHit[] = (invoices as Array<Record<string, unknown>>)
    .filter((inv) => {
      const fno = String(inv.fatura_no ?? inv.id ?? "").toLowerCase();
      const firma = String(inv.firma_adi ?? "").toLowerCase();
      return fno.includes(q) || firma.includes(q);
    })
    .slice(0, 5)
    .map((inv) => ({
      id: String(inv.id ?? ""),
      type: "fatura" as const,
      title: String(inv.fatura_no ?? inv.id ?? "Fatura"),
      subtitle: String(inv.firma_adi ?? ""),
      href: "/faturalar",
    }));

  const customerHits: SearchHit[] = (customers as Array<Record<string, unknown>>)
    .filter((c) => String(c.isim ?? "").toLowerCase().includes(q) || String(c.email ?? "").toLowerCase().includes(q))
    .slice(0, 5)
    .map((c) => ({
      id: String(c.id ?? c._id ?? ""),
      type: "musteri" as const,
      title: String(c.isim ?? "Müşteri"),
      subtitle: String(c.email ?? ""),
      href: "/musteriler",
    }));

  return [...customerHits, ...invoiceHits];
}
