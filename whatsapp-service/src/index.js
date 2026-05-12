/**
 * AlacakAI — WhatsApp microservice.
 *
 * Endpoints (all require Bearer auth except /health):
 *   GET  /health                     liveness probe
 *   GET  /session/status             current session state + QR availability
 *   GET  /session/qr                 latest QR as base64 PNG (if state=qr)
 *   POST /session/start              boot the wppconnect session
 *   POST /session/stop               close the session
 *   POST /messages/send              { phone, message } -> sends text
 *   POST /messages/send-bulk         { messages: [{phone, message}, ...] }
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { WhatsAppSession } = require('./session');

const PORT = parseInt(process.env.PORT || '3001', 10);
const API_TOKEN = process.env.API_TOKEN || '';
const WPP_SESSION = process.env.WPP_SESSION || 'alacakai';
const WPP_TOKEN_DIR = process.env.WPP_TOKEN_DIR || './tokens';
const WPP_LOG_LEVEL = process.env.WPP_LOG_LEVEL || 'info';

if (!API_TOKEN) {
  console.error('[boot] API_TOKEN env yok — .env dosyasını kontrol et.');
  process.exit(1);
}

const session = new WhatsAppSession({
  session: WPP_SESSION,
  tokenDir: WPP_TOKEN_DIR,
  logLevel: WPP_LOG_LEVEL,
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- middleware --------------------------------------------------

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ---------- routes ------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'whatsapp', state: session.state });
});

app.get(
  '/session/status',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const snap = session.snapshot();
    snap.profile = await session.profile();
    res.json(snap);
  }),
);

app.get('/session/qr', requireAuth, (_req, res) => {
  if (!session.qr) {
    return res.status(404).json({ error: 'no_qr', state: session.state });
  }
  res.json({
    qr: session.qr,
    dataUrl: `data:image/png;base64,${session.qr}`,
    attempts: session.qrAttempts,
  });
});

app.post(
  '/session/start',
  requireAuth,
  asyncHandler(async (_req, res) => {
    // Don't await — wppconnect can take 30s+ to print a QR. Return immediately
    // so the dashboard can start polling /session/status.
    session.start().catch((err) => {
      console.error('[session] start failed:', err.message || err);
    });
    res.json({ started: true, state: session.state });
  }),
);

app.post(
  '/session/stop',
  requireAuth,
  asyncHandler(async (_req, res) => {
    await session.stop();
    res.json({ stopped: true, state: session.state });
  }),
);

app.post(
  '/messages/send',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { phone, message } = req.body || {};
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone ve message gerekli' });
    }
    try {
      const result = await session.sendText(phone, message);
      return res.json({ sent: true, ...result });
    } catch (err) {
      const status = err.code === 'NOT_CONNECTED' ? 409 : 500;
      return res.status(status).json({
        sent: false,
        error: err.message || 'send_failed',
        code: err.code || null,
      });
    }
  }),
);

app.post(
  '/messages/send-bulk',
  requireAuth,
  asyncHandler(async (req, res) => {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length) {
      return res.status(400).json({ error: 'messages dizisi gerekli' });
    }
    const results = [];
    for (const m of messages) {
      try {
        const result = await session.sendText(m.phone, m.message);
        results.push({ phone: m.phone, sent: true, ...result });
      } catch (err) {
        results.push({ phone: m.phone, sent: false, error: err.message });
      }
    }
    res.json({ count: results.length, results });
  }),
);

// ---------- error handler -----------------------------------------------

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'internal_error' });
});

// ---------- boot --------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[boot] AlacakAI WhatsApp service on :${PORT}`);
  console.log(`[boot] session=${WPP_SESSION}, tokens=${WPP_TOKEN_DIR}`);
  console.log(`[boot] POST /session/start ile WhatsApp Web'i başlat, sonra /session/qr ile QR'ı al.`);
});

// Graceful shutdown so wppconnect closes Chromium cleanly.
const shutdown = async () => {
  console.log('[shutdown] kapatılıyor...');
  try { await session.stop(); } catch (_) { /* ignore */ }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
