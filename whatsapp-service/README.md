# AlacakAI — WhatsApp Microservice

Standalone Node.js process that wraps
[`@wppconnect-team/wppconnect`](https://github.com/wppconnect-team/wppconnect)
behind a small bearer-authenticated REST API. The Python backend
(`app/services/whatsapp_service.py`) calls these endpoints whenever an agent
needs to send a WhatsApp message.

## Setup

```bash
cd whatsapp-service
cp .env.example .env
# .env içindeki API_TOKEN'ı rastgele bir şeyle değiştir
# aynı değeri AlacakAI backend'in .env'inde WHATSAPP_API_TOKEN olarak kullan

npm install        # ~30 saniye, Chromium da iner
npm start          # port 3001
```

İlk çalıştırma Chromium'u indireceği için ~150 MB sürer; sonraki başlangıçlar saniyeler içinde olur.

## Auth

Tüm endpoint'ler (`/health` hariç) `Authorization: Bearer <API_TOKEN>` ister.
Token `.env` dosyasındaki `API_TOKEN` ile eşleşmeli.

## Endpoints

| Method | Path | Açıklama |
|---|---|---|
| GET  | `/health`              | Liveness probe (auth gerektirmez) |
| GET  | `/session/status`      | wppconnect session durumu + profil |
| GET  | `/session/qr`          | Son QR kodu (base64 PNG) |
| POST | `/session/start`       | wppconnect session'ı başlat (non-blocking) |
| POST | `/session/stop`        | Session'ı kapat |
| POST | `/messages/send`       | `{phone, message}` — tek mesaj |
| POST | `/messages/send-bulk`  | `{messages: [{phone, message}, …]}` |

## Akış

1. `POST /session/start` çağır — Chromium headless açılır
2. ~5-10 saniye sonra `GET /session/qr` ile QR'ı al, telefonda WhatsApp → Bağlı Cihazlar → Cihaz Bağla
3. QR taranınca `state: connected` olur
4. `POST /messages/send` ile mesaj gönder
5. Token'lar `tokens/` klasörüne kaydedilir, sonraki başlangıçta QR gerekmez

## Frontend tarafı

Ayarlar sayfasındaki **WhatsApp Bağlantısı** kartı bu API'yi kullanır:
- Durum her 5 saniyede bir poll edilir
- "Bağlan" butonu start-session'ı tetikler
- QR uygun olduğunda otomatik gösterilir
- Bağlı durumda profil bilgisi (isim, platform, numara) görünür

## Sorun giderme

- **`401 unauthorized`** — backend ve Node.js servisinin token'ları eşleşmiyor
- **Chromium hatası** — `tokens/` klasörünü sil, tekrar `npm start`
- **QR çıkmıyor** — backend logs'unda `[session] start failed` arayın, `puppeteerOptions.args` listesinden `--disable-setuid-sandbox` kaldırmayı deneyin (Windows'ta gerek yok)
