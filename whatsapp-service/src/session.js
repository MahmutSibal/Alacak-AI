/**
 * wppconnect session manager.
 *
 * Boots a single WhatsApp Web client, keeps the latest QR available for the
 * frontend to render, and exposes a simple state machine the HTTP layer can
 * report on: idle -> starting -> qr -> connected -> disconnected.
 *
 * One session per process. If you need multiple WhatsApp accounts, run
 * multiple instances of this service on different ports.
 */

const wppconnect = require('@wppconnect-team/wppconnect');

const STATE = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  QR: 'qr',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
});

class WhatsAppSession {
  constructor({ session, tokenDir, logLevel }) {
    this.sessionName = session;
    this.tokenDir = tokenDir;
    this.logLevel = logLevel;
    this.client = null;
    this.state = STATE.IDLE;
    this.qr = null;          // base64 PNG (without `data:image/png;base64,` prefix)
    this.qrAttempts = 0;
    this.lastError = null;
    this.startedAt = null;
    this._starting = null;   // promise lock against double-start
  }

  /** Start (or attach to) the wppconnect session. Returns a status snapshot. */
  async start() {
    if (this.state === STATE.CONNECTED) return this.snapshot();
    if (this._starting) return this._starting;

    this.state = STATE.STARTING;
    this.lastError = null;
    this.startedAt = Date.now();

    this._starting = (async () => {
      try {
        this.client = await wppconnect.create({
          session: this.sessionName,
          folderNameToken: this.tokenDir,
          headless: 'new',
          devtools: false,
          useChrome: false,    // use bundled chromium
          debug: false,
          logQR: false,
          autoClose: 0,        // never auto-close on missed QR
          disableSpins: true,
          disableWelcome: true,
          updatesLog: false,
          puppeteerOptions: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          },
          catchQR: (base64Qr, _ascii, attempts) => {
            // wppconnect prefixes the base64 with "data:image/png;base64,"; strip it
            const stripped = (base64Qr || '').replace(/^data:image\/[a-z]+;base64,/, '');
            this.qr = stripped;
            this.qrAttempts = attempts;
            this.state = STATE.QR;
          },
          statusFind: (status) => {
            // wppconnect status strings include: 'inChat', 'qrReadSuccess',
            // 'qrReadFail', 'autocloseCalled', 'desconnectedMobile', 'browserClose',
            // 'serverClose', 'isLogged', 'notLogged'
            if (status === 'inChat' || status === 'isLogged' || status === 'qrReadSuccess') {
              this.state = STATE.CONNECTED;
              this.qr = null;
            } else if (
              status === 'browserClose' ||
              status === 'serverClose' ||
              status === 'desconnectedMobile' ||
              status === 'autocloseCalled'
            ) {
              this.state = STATE.DISCONNECTED;
            }
          },
          logLevel: this.logLevel || 'info',
        });

        // Some flows skip statusFind; if we got here with a client, treat as connected.
        if (this.state !== STATE.CONNECTED) this.state = STATE.CONNECTED;
        this.qr = null;
        return this.snapshot();
      } catch (err) {
        this.state = STATE.ERROR;
        this.lastError = err && err.message ? err.message : String(err);
        throw err;
      } finally {
        this._starting = null;
      }
    })();

    return this._starting;
  }

  async stop() {
    if (this.client) {
      try { await this.client.close(); } catch (_) { /* ignore */ }
      this.client = null;
    }
    this.state = STATE.DISCONNECTED;
    this.qr = null;
  }

  /**
   * Send a plain text WhatsApp message.
   * `phone` may be in any common format (`+90 555…`, `0555…`, `90555…`); we
   * normalize to digits and append `@c.us` which is the JID format wppconnect
   * expects for individual contacts.
   */
  async sendText(phone, message) {
    if (this.state !== STATE.CONNECTED || !this.client) {
      const err = new Error('WhatsApp oturumu bağlı değil');
      err.code = 'NOT_CONNECTED';
      throw err;
    }
    if (!phone) throw new Error('phone gerekli');
    if (!message) throw new Error('message gerekli');
    const jid = WhatsAppSession.normalizeJid(phone);
    const result = await this.client.sendText(jid, message);
    return {
      jid,
      messageId: result?.id?._serialized || result?.id || null,
      raw: result?.ack ?? null,
    };
  }

  /** Profile/account lookup so the dashboard can show "connected as Foo". */
  async profile() {
    if (!this.client || this.state !== STATE.CONNECTED) return null;
    try {
      const me = await this.client.getHostDevice();
      return {
        wid: me?.id?._serialized || me?.wid?._serialized || null,
        pushname: me?.pushname || null,
        platform: me?.platform || null,
      };
    } catch {
      return null;
    }
  }

  snapshot() {
    return {
      session: this.sessionName,
      state: this.state,
      connected: this.state === STATE.CONNECTED,
      hasQr: !!this.qr,
      qrAttempts: this.qrAttempts,
      lastError: this.lastError,
      uptimeMs: this.startedAt && this.state === STATE.CONNECTED ? Date.now() - this.startedAt : null,
    };
  }

  static normalizeJid(phone) {
    let digits = String(phone).replace(/\D/g, '');
    if (!digits) throw new Error('Geçersiz telefon');
    // 0xxxxxxxxxx (TR domestic) -> 90xxxxxxxxxx
    if (digits.startsWith('0') && digits.length === 11) {
      digits = '90' + digits.slice(1);
    }
    return `${digits}@c.us`;
  }
}

module.exports = { WhatsAppSession, STATE };
