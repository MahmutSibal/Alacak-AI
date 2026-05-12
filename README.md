# AlacakAI

> KOBİ'ler için yapay zekâ destekli otonom alacak takip ve nakit akış yönetim sistemi.

AlacakAI, Türkiye'deki küçük ve orta ölçekli işletmelerin geç ödeme sorununa
çözüm üretmek için inşa edilmiş bir SaaS platformudur. Tek bir LLM (Llama 3.1)
üzerinde çalışan **dört farklı persona** — Risk Analisti, Tahsilat İletişim
Uzmanı, Yapılandırma Uzmanı ve Nakit Akışı Analisti — ile müşteri risklerini
skorlar, otomatik WhatsApp hatırlatma mesajları üretir, gecikmiş alacaklar
için yapılandırma teklifleri tasarlar ve nakit akışı tahminleri hazırlar.

---

## İçindekiler

- [Mimari](#mimari)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Detaylı Kurulum](#detaylı-kurulum)
- [Servisleri Çalıştırma](#servisleri-çalıştırma)
- [WhatsApp Bağlantısı](#whatsapp-bağlantısı)
- [Tek LLM, Dört Persona](#tek-llm-dört-persona)
- [Veri Modeli](#veri-modeli)
- [API Referansı](#api-referansı)
- [Frontend Yapısı](#frontend-yapısı)
- [Tema Sistemi](#tema-sistemi)
- [Sorun Giderme](#sorun-giderme)
- [Yol Haritası](#yol-haritası)
- [Lisans](#lisans)

---

## Mimari

Beş ayrı süreç. Hiçbiri tek başına hayatta kalmaz; **frontend ↔ backend ↔
{Ollama, MongoDB, WhatsApp servisi}** zinciri çalışır olmalı.

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Next.js 15      │  HTTP   │   FastAPI        │  HTTP   │  Node.js         │
│  Frontend        │ ──────▶ │   Backend        │ ──────▶ │  WhatsApp svc    │
│  :5000           │         │   :8000          │         │  :3001           │
│                  │         │                  │         │                  │
│  - Dashboard     │         │  - 4 personas    │         │  wppconnect      │
│  - Faturalar     │         │  - REST API      │         │  Chromium        │
│  - Müşteriler    │         │  - JWT auth      │         │  WhatsApp Web    │
│  - Risk Analizi  │         │                  │         └──────────────────┘
│  - Nakit Akışı   │         └────┬────────┬────┘
│  - AI Chat       │              │        │
│  - Ayarlar       │              ▼        ▼
└──────────────────┘     ┌──────────┐  ┌──────────┐
                         │ MongoDB  │  │  Ollama  │
                         │  :27017  │  │  :11434  │
                         │          │  │          │
                         │  Mongo   │  │ llama3.1 │
                         │  driver: │  │   :8b    │
                         │  Motor   │  │          │
                         └──────────┘  └──────────┘
```

| Bileşen | Teknoloji | Sorumluluk |
|---|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind | UI, dashboard, formlar, AI chat |
| Backend | FastAPI 0.101 + Pydantic v2 + Motor | REST API, JWT auth, agent orchestration |
| WhatsApp | Node.js 18+ + `@wppconnect-team/wppconnect` | WhatsApp Web tarafına mesaj gönderme/alma |
| LLM | Ollama + Llama 3.1 8B | Dört persona için tek backend |
| Database | MongoDB 7+ | Müşteri / fatura / agent_logs / cashflow |

---

## Hızlı Başlangıç

```powershell
# 1. Bağımlılıklar
pip install -r app/requirements.txt
cd frontend && npm install && cd ..
cd whatsapp-service && npm install && cd ..

# 2. Llama modelini indir
ollama pull llama3.1:8b

# 3. .env dosyalarını hazırla
copy app\.env.example app\.env             # eğer yoksa elle oluştur (aşağıda örnek)
copy whatsapp-service\.env.example whatsapp-service\.env
# .env dosyalarındaki API_TOKEN ile WHATSAPP_API_TOKEN'ın AYNI olduğunu doğrula

# 4. Beş servisi ayrı terminallerde çalıştır
ollama serve                                                    # Terminal 1
cd whatsapp-service && npm start                                # Terminal 2
uvicorn app.main:app --port 8000                                # Terminal 3
cd frontend && npm run dev                                      # Terminal 4
# MongoDB zaten Windows servisi olarak çalışmalı                # Terminal 5 (boş)

# 5. Aç
start http://localhost:5000
```

İlk LLM çağrısı modeli RAM'e yüklediği için 10-15 saniye sürer. Sonraki
çağrılar saniyeler içindedir. WhatsApp bağlantısı için Ayarlar sayfasından
"Bağlan" düğmesine basıp QR'ı telefondan tarayın.

---

## Detaylı Kurulum

### Sistem gereksinimleri

| Bileşen | Minimum | Önerilen |
|---|---|---|
| RAM | 16 GB | 32 GB |
| GPU | yok (CPU yavaş) | NVIDIA 8 GB+ VRAM |
| Disk | 15 GB | 30 GB+ |
| OS | Windows 10/11 / macOS / Linux | Windows 11 |
| Python | 3.11+ | 3.12 |
| Node.js | 18.17+ | 20 LTS |
| Ollama | son sürüm | son sürüm |
| MongoDB | 6.0+ | 7.0+ |

### Gemini Vision API Kurulumu (Fatura OCR)

AlacakAI, fatura OCR'ı için **Gemini 2.0 Flash** kullanabilir:

1. [Google AI Studio](https://aistudio.google.com/app/apikeys)'dan API key al
2. `.env`'ye ekle: `GOOGLE_API_KEY=your-api-key-here`
3. `USE_GEMINI_VISION=true` ayarla (default true'dur)

**Avantajlar:**
- Türkçe metni %95+ doğrulukla okur
- Yapılandırılmış çıktı (fatura no, tutar, vade tarihi vs.)
- Fallback: Gemini kullanılamıyorsa Ollama vision model'e geçer

**Maliyeti:** Ücretsiz tier'da 15 API çağrı / dakika; 60 çağrı / dakika / gün.
Production için `Gemini 1.5 Pro` veya `Gemini 2.0 Flash` kullan.

### MongoDB

Windows'ta resmi installer ile servis olarak kurun. Çalıştığını doğrulayın:

```powershell
Get-Service MongoDB                  # status: Running olmalı
# yoksa
net start MongoDB
```

MongoDB Compass (GUI) ile `mongodb://localhost:27017/alacakai` veritabanını
gözleyebilirsiniz.

### Ollama + Llama 3.1 8B

[ollama.com/download](https://ollama.com/download)'dan kurun. Modeli çekin:

```powershell
ollama pull llama3.1:8b
```

İlk indirilecek dosya boyutu **~4.9 GB** (Q4_K_M quantization). RTX 50 serisi
gibi yeni GPU'larda Ollama'nın güncel sürümü gerekli — `winget upgrade ollama`.

Modelin RAM'de kalması için ortam değişkeni:

```powershell
$env:OLLAMA_KEEP_ALIVE="30m"      # 30 dakika sıcak tut, yeniden yükleme yok
ollama serve
```

### Backend (FastAPI)

```powershell
pip install -r app/requirements.txt
```

`app/.env` dosyası örneği:

```env
MONGO_URI=mongodb://localhost:27017/alacakai
SECRET_KEY=change_me_to_strong_key
ACCESS_TOKEN_EXPIRE_MINUTES=60

# LLM (Ollama)
LLM_API_URL=http://localhost:11434
LLM_TEXT_MODEL=llama3.1:8b
LLM_VISION_MODEL=
LLM_CTX=8192
LLM_MAX_TOKENS=1024

# Gemini Vision API for invoice OCR
GOOGLE_API_KEY=                                 # Get from https://aistudio.google.com/app/apikeys
USE_GEMINI_VISION=true                         # Use Gemini for invoice extraction (fallback to Ollama)

# WhatsApp microservice
WHATSAPP_API_URL=http://localhost:3001
WHATSAPP_API_TOKEN=alacakai_dev_2026
```

### WhatsApp microservice (Node.js)

```powershell
cd whatsapp-service
npm install                            # ~30 saniye, Chromium da iner (~150 MB)
copy .env.example .env
# .env içindeki API_TOKEN'ı backend'deki WHATSAPP_API_TOKEN ile AYNI yapın
npm start
```

`whatsapp-service/.env` örneği:

```env
PORT=3001
API_TOKEN=alacakai_dev_2026
WPP_SESSION=alacakai
WPP_TOKEN_DIR=./tokens
WPP_LOG_LEVEL=info
```

### Frontend (Next.js)

```powershell
cd frontend
npm install
npm run dev               # :5000
```

`frontend/next.config.ts` zaten `/api/:path*` → `http://localhost:8000/:path*`
rewrite kuralını barındırıyor. `BACKEND_URL` ortam değişkeniyle prod'da değiştirilebilir.

---

## Servisleri Çalıştırma

5 ayrı terminal:

```powershell
# Terminal 1 — Ollama
$env:OLLAMA_KEEP_ALIVE="30m"
ollama serve

# Terminal 2 — WhatsApp microservice
cd whatsapp-service
npm start

# Terminal 3 — FastAPI backend
cd C:\path\to\alacakai
uvicorn app.main:app --port 8000

# Terminal 4 — Next.js frontend
cd frontend
npm run dev

# Terminal 5 — MongoDB (zaten Windows servisi, dokunmayın)
```

### Sağlık kontrolü

```powershell
curl http://localhost:8000/health
# {"status":"ok","mongo":{"connected":true}}

curl http://localhost:3001/health
# {"ok":true,"state":"idle"}

curl http://localhost:11434/api/tags
# {"models":[{"name":"llama3.1:8b",...}]}
```

---

## WhatsApp Bağlantısı

### İlk kurulum

1. Tüm servisler ayakta olsun
2. Frontend'de `/ayarlar` sayfasına git
3. **WhatsApp Bağlantısı** kartında **"Bağlan"** düğmesine bas
4. ~5–15 saniye sonra QR kodu kartta belirir
5. Telefonda WhatsApp aç → **Bağlı Cihazlar** → **Cihaz Bağla** → QR'ı tara
6. Durum **"Bağlı"** olur, profil bilgisi (push name, platform, numara) görünür
7. Token `whatsapp-service/tokens/` klasörüne kaydedilir; sonraki başlangıçta QR gerekmez

### Mesaj gönderme

İki yol var:

**Otomatik (Communication Agent)**: Müşteriler sayfasından bir müşteri için
"Hatırlatma Gönder" — agent risk skoruna göre tonu ayarlar (yumuşak/orta/sert),
mesajı oluşturur, WhatsApp servisi ile telefon numarasına yollar.

**Manuel (REST)**:

```powershell
curl -X POST http://localhost:8000/whatsapp/send `
  -H "Content-Type: application/json" `
  -d '{"phone":"+905551234567","message":"Sayın Ali Bey, ödeme hatırlatması..."}'
```

### Sınırlamalar

- WhatsApp Web altyapısı kullandığı için telefon online olmalı
- Spam tespiti durumunda WhatsApp numarasını blok edebilir — toplu gönderimde sayıyı düşük tut
- Çoklu hesap için ayrı portlarda ayrı `whatsapp-service` instance'ları çalıştırın

---

## OCR Pipeline & Fatura Çıkarma

AlacakAI **üç kademeli OCR stratejisi** ile faturaları işler:

1. **Gemini 2.0 Flash** (Birincil) — `GOOGLE_API_KEY` ayarlanmışsa
   - Türkçe metni %95+ doğrulukla okur
   - Yapılandırılmış JSON çıkarma (fatura no, tutar, vade vb.)
   - Hız: ~2-5 saniye

2. **Ollama Vision LLM** (Fallback) — Gemini başarısız olursa
   - Yerel, privat; internet gerekmiyor
   - Modeller: qwen2.5vl:7b, llava (standart Ollama kurulumunda mevcut)
   - Hız: ~10-30 saniye (CPU'da yavaş, GPU'da hızlı)

3. **Tesseract / OCR.Space** (Son çare) — İkisi de başarısız olursa
   - Tesseract: yerel Tesseract kurulumu gerekli
   - OCR.Space: HTTP API (OCR_SPACE_API_KEY gerekli)

**Kullanım:**

```python
from app.services.ocr_service import extract_invoice_fields

# Çıkması gereken format
fields = await extract_invoice_fields("path/to/invoice.pdf")
# {
#   "fatura_no": "INV-2026-001",
#   "tutar": 5000.0,
#   "kdv_orani": 18,
#   "vade_tarihi": "2026-05-25",
#   ...
# }
```

---

Mimari sade: **bir Ollama backend, dört farklı sistem prompt'u**. Her ajan
LLM'i çağırırken kendi rolünü, tonunu ve çıktı sözleşmesini sistem mesajıyla
belirler.

| Persona | Görev | Sıcaklık | Durum | Endpoint |
|---|---|---|---|---|
| **Risk Analisti** | Müşteri risk skoru üret (0-100), gerekçe ve tavsiye verir | 0.15 | ✓ | `/risk/analyze/{id}` |
| **Tahsilat İletişim Uzmanı** | WhatsApp/email mesajı yaz, tonu risk skoruna göre ayarla | 0.40 | ✓ | `/whatsapp/remind` |
| **Yapılandırma Uzmanı** | İskonto / taksit / vade uzatma teklifleri tasarla | 0.30 | 🔄 WIP | `/configure` |
| **Nakit Akışı Analisti** | 30/60/90 günlük nakit tahmini, riskli dönemler | 0.20 | ✓ | `/cashflow` |

İmplementasyon: [`app/agents/personas.py`](app/agents/personas.py)
ve [`app/agents/base.py`](app/agents/base.py).

```python
# Örnek: bir agent çağrısı (base.py)
result = await call_persona(
    Persona.RISK,
    user_prompt=f"Müşteri ID: {customer_id}\nVeri: {context}\n\nSadece JSON döndür.",
)
# result["data"] → {"risk_score": 82, "payment_probability": 0.31, ...}
```

### Persona profili nasıl tanımlanır

```python
# app/agents/personas.py
Persona.RISK: PersonaProfile(
    name="risk",
    title="Risk Analisti",
    temperature=0.15,
    system_prompt=(
        "Sen AlacakAI'nin Risk Analistisin... Çıktın HER ZAMAN geçerli JSON "
        "olur: ek metin, açıklama, kod bloğu, ```json``` etiketi YOKTUR..."
    ),
)
```

Yeni persona eklemek için: `Persona` enum'ına yeni bir değer + `_PROFILES`
dict'ine bir `PersonaProfile` girdisi. Agent kodu otomatik kullanabilir.

---

## Nakit Akışı (Cashflow) Simülasyonu

**Cashflow Agent**, portföyü analiz ederek 30/60/90 gün nakit tahmini üretir:

### Algoritma

1. Açık alacak ve gecikmiş alacak tutarı hesaplayın
2. Müşteri risk skorlarından ortalama ödeme olasılığını al
3. Tahsilat hızını modellendirin (gecikmiş alacak 1.5x hızlı)
4. Aylık giderler düşün
5. Net nakit pozisyonunu hesapla

### Çıktı

```json
{
  "30_gun": {
    "tahsilat": 45000,
    "gider": 45000,
    "net": 0
  },
  "60_gun": {
    "tahsilat": 90000,
    "gider": 90000,
    "net": 0
  },
  "90_gun": {
    "tahsilat": 135000,
    "gider": 135000,
    "net": 0
  },
  "riskli_donemler": ["İlk 30 gün nakit açığı"],
  "oneriler": ["Gecikmiş 120K TL alacağı öncelikli olarak takip et"],
  "payment_velocity": 0.65,
  "outstanding_amount": 250000
}
```

### API

```bash
POST /cashflow/simulate
{
  "company_id": "...",
  "horizon_days": 90
}
```

---

MongoDB koleksiyonları:

### `users`
JWT auth için kullanıcı kayıtları.
```js
{ _id, isim, email, hashed_password, rol, created_at }
```

### `customers`
KOBİ'nin müşterileri (borçluları).
```js
{
  _id, isim, musteri_tipi: "kurumsal"|"bireysel",
  email, telefon, whatsapp,
  vergi_no, vergi_dairesi, sehir, adres,
  sektor, yetkili_kisi,
  kredi_limiti, odeme_vadesi_gun, acik_borc,
  risk: {
    risk_score: 0..100,
    payment_probability: 0..1,
    recommended_action,
    signals: [...],
    delta, previous_risk_score
  },
  created_at, risk_updated_at
}
```

### `invoices`
Manuel girilen veya OCR ile çıkarılan faturalar.
```js
{
  _id,
  fatura_no, firma_adi,
  ara_toplam, kdv_orani, kdv_tutari, tutar, para_birimi,
  duzenleme_tarihi, vade_tarihi,
  musteri_id, vergi_no, aciklama,
  durum: "Bekleyen"|"Ödendi"|"Gecikmiş"|"İptal",
  source: "manual"|"upload",
  created_at
}
```

### `agent_logs`
Tüm AI agent aktivitesi — frontend bildirim panelini bu beslar.
```js
{ _id, agent, persona, message, meta, ts }
```

### `cashflow_predictions`
Cashflow agent'ın ürettiği 30/60/90 günlük tahminler.
```js
{ _id, company_id, simulation: {...}, horizon_days, ts }
```

---

## API Referansı

40+ endpoint var; başlıcalar:

### Auth
- `POST /auth/register` — yeni kullanıcı kaydı
- `POST /auth/login` — JWT alır
- `GET /auth/me` — mevcut kullanıcı
- `POST /auth/forgot-password` / `POST /auth/reset-password`

### Müşteriler
- `GET /customers/` — listele
- `POST /customers/` — yeni müşteri (Pydantic schema doğrular)
- `GET /customers/{id}` / `PUT /customers/{id}` / `DELETE /customers/{id}`
- `GET /customers/stats` — kritik / yüksek / iyi sayıları

### Faturalar
- `GET /invoices/` — listele
- `POST /invoices/` — manuel fatura (KDV otomatik hesaplanır)
- `GET /invoices/stats` — dashboard için 4 KPI + 6 aylık seri + risk listesi
- `POST /invoices/upload` — OCR ile fatura yükleme (vision model gerekir, şu an UI'dan kapalı)

### Risk
- `GET /risk/distribution` — pie chart için kova sayıları
- `GET /risk/radar` — portföy bazında 6 boyutlu risk profili
- `GET /risk/customers?limit=N` — en riskli N müşteri
- `POST /risk/analyze/{id}` — tek müşteri için RiskAgent
- `POST /risk/analyze-all` — tüm portföy için arka plan görevi

### WhatsApp
- `GET /whatsapp/status` — bağlantı durumu + profil
- `GET /whatsapp/qr` — son QR (base64 PNG)
- `POST /whatsapp/start-session` / `POST /whatsapp/stop-session`
- `POST /whatsapp/send` — manuel mesaj
- `POST /whatsapp/remind` — Communication Agent ile otomatik mesaj üret + gönder

### AI
- `POST /ai/chat` — tek seferlik chat completion
- `WS /ai/ws` — streaming chat (token bearer ile)
- `GET /agents/personas` — 4 persona meta bilgisi

### Operasyonel
- `GET /health` — Mongo bağlantı durumunu da raporlar
- `GET /agent-logs/` — son N olay
- `GET /agent-logs/summary` — agent başına olay sayısı

OpenAPI / Swagger UI: <http://localhost:8000/docs>

---

## Frontend Yapısı

```
frontend/
├── app/
│   ├── layout.tsx               # ThemeProvider + tema flash-prevention script
│   ├── page.tsx                 # Landing
│   ├── login / register / forgot-password / reset-password
│   ├── (auth-protected pages)
│   │   ├── dashboard            # KPI + grafik + agent feed
│   │   ├── faturalar            # CRUD + manuel ekleme modalı
│   │   ├── musteriler           # CRUD + müşteri ekleme modalı
│   │   ├── risk                 # Radar + pie + analiz tetikleme
│   │   ├── nakit-akisi          # 30/60/90 gün tahmin
│   │   ├── ai                   # Chat
│   │   └── ayarlar              # WhatsApp connect kartı + ayarlar
│   └── api/invoices/upload      # multipart proxy (Next.js rewrite multipart'ta sorunlu)
│
├── components/
│   ├── Sidebar.tsx              # Sol menü, agent feed mini-status
│   ├── Header.tsx               # Search, theme toggle, bildirim, kullanıcı menüsü
│   ├── KPICard / CashflowChart / RiskTable / AgentFeed
│   ├── Chat.tsx                 # Streaming-uyumlu chat UI
│   ├── NewInvoiceModal.tsx      # Canlı KDV hesaplı form
│   ├── NewCustomerModal.tsx     # Kurumsal/bireysel toggle
│   ├── WhatsAppConnectCard.tsx  # QR + status + start/stop
│   ├── NotificationPopover.tsx  # agent_logs'tan beslenen dropdown
│   ├── GlobalSearch.tsx         # Ctrl+K müşteri/fatura arama
│   ├── UserMenu.tsx
│   ├── ThemeProvider.tsx        # Tema state, system preference takibi
│   ├── ThemeToggle.tsx          # Sol tıkla → quick toggle, sağ tıkla → menü
│   └── svg/                     # Custom AI/finance illüstrasyonları
│
└── lib/
    ├── api.ts                   # apiFetch + 30+ endpoint helper
    ├── auth.ts                  # JWT cookie yönetimi
    └── risk.ts                  # Risk skoru → label/color (single source of truth)
```

---

## Tema Sistemi

Dark / Light / Sistem üç seçenek var. Header'daki tema düğmesi:
- **Sol tık** → hızlı toggle (light ↔ dark)
- **Sağ tık** → açılır menü (light / dark / system)

Seçim `localStorage`'a yazılır; "system" için `prefers-color-scheme` takip
edilir. Hydration flash'i önlemek için `app/layout.tsx`'te inline bir script
çalışır.

### Renk değiştirme

Tüm renkler [`app/globals.css`](frontend/app/globals.css)'te CSS değişkeni
olarak tanımlı:

```css
.dark {
  --color-bg:         11  16  32;
  --color-surface:    17  24  39;
  --color-foreground:255 255 255;
  --color-primary:    20 184 166;
  ...
}
.light {
  --color-bg:        248 250 252;
  --color-surface:   255 255 255;
  --color-foreground: 15  23  42;
  --color-primary:    13 148 136;
  ...
}
```

Tailwind config bu değişkenleri `rgb(var(--color-x) / <alpha-value>)` şeklinde
eşler — yani `bg-primary/10`, `text-foreground/80` gibi opacity modifier'lar
otomatik çalışır.

`text-white` kullanımları teması takip eder (foreground'a maplenir). Sadece
primary teal zemini için sabit beyaz isteyen `text-on-primary` token'ı vardır.

---

## Sorun Giderme

### Backend port 8000'de cevap vermiyor (`socket hang up` / `ECONNRESET`)

Genellikle Windows'ta `--reload` modunun zombie bıraktığı durum. Önce gerçek
durumu kontrol et:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen
```

Eğer bir Python süreci tutuyorsa:

```powershell
Stop-Process -Id <PID> -Force
uvicorn app.main:app --port 8000          # --reload OLMADAN
```

### `405 Method Not Allowed` AI Chat'te

Yanlış model adı ya da fallback path'i tetikleniyor demektir. Kontrol:

```powershell
curl http://localhost:11434/api/tags
# llama3.1:8b listede olmalı
```

`.env`'de `LLM_TEXT_MODEL=llama3.1:8b` yazdığından ve backend'in restart
edildiğinden emin ol.

### LLM çağrıları çok yavaş (5+ dakika)

GPU detection sorunu. `ollama ps` çıktısında `100% CPU` görüyorsan model
GPU'ya yüklenmemiş demektir. Çözümler:

1. Ollama'yı son sürüme güncelle: `winget upgrade ollama`
2. NVIDIA driver güncel mi: `nvidia-smi`
3. `OLLAMA_KEEP_ALIVE=30m` ayarla — model her çağrıda yeniden yüklenmesin
4. Donanımın GPU'yu yetmiyorsa daha küçük bir model dene: `llama3.2:3b`

### WhatsApp servisi "yapılandırılmamış"

`app/.env` ve `whatsapp-service/.env` dosyalarındaki token'ların **harf harfine
aynı** olduğunu doğrula:

```env
# app/.env
WHATSAPP_API_TOKEN=alacakai_dev_2026

# whatsapp-service/.env
API_TOKEN=alacakai_dev_2026     # AYNI string
```

Backend'i restart etmeyi unutma — `.env` startup'ta okunur.

### QR kod gözükmüyor

```powershell
curl -H "Authorization: Bearer alacakai_dev_2026" http://localhost:3001/session/status
```

`state: starting` ise bekleyin. `state: error` ise `whatsapp-service/tokens/`
klasörünü silip baştan deneyin.

### Dashboard'da müşteri "Orta", Müşteriler'de "İyi" görünüyor

Eski bir kategori tutarsızlığıydı, **artık 4 kanon kategori** var (Kritik /
Yüksek / Orta / Düşük). Eğer hala farklı görüyorsan:
- Tarayıcıda hard refresh: Ctrl+Shift+R
- Backend restart edildi mi kontrol et

### MongoDB bağlanmıyor

```powershell
Get-Service MongoDB
net start MongoDB

# bağlantı doğrulama
curl http://localhost:8000/health
# "mongo":{"connected":true} dönerse OK

---

## Lisans

Bu proje şu an özel bir proje olarak geliştirilmekte. Kullanım, kopyalama veya
dağıtım için izin gereklidir.

---

## Teşekkür

- [@wppconnect-team/wppconnect](https://github.com/wppconnect-team/wppconnect) — WhatsApp Web altyapısı
- [Ollama](https://ollama.com) — yerel LLM runtime
- [Recharts](https://recharts.org), [Lucide](https://lucide.dev), [Framer Motion](https://framer.com/motion) — UI katmanı
