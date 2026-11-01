// Mini servidor WebSocket sin dependencias (solo módulos de Node).
// Soporta lo necesario para el juego: handshake, mensajes de texto, ping/pong y cierre.
const crypto = require('crypto');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 1 << 20; // 1 MB, de sobra para mensajes del juego

class Socket {
  constructor(sock) {
    this.sock = sock;
    this.readyState = 1; // 1 = abierto, 3 = cerrado (igual que WebSocket)
    this.handlers = {};
    this.buf = Buffer.alloc(0);
    this.frag = null;
    sock.on('data', d => { this.buf = Buffer.concat([this.buf, d]); this._parse(); });
    sock.on('close', () => this._closed());
    sock.on('error', () => this._closed());
  }

  on(ev, fn) { this.handlers[ev] = fn; return this; }
  _emit(ev, ...args) { if (this.handlers[ev]) this.handlers[ev](...args); }

  _closed() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this._emit('close');
  }

  _frame(op, payload) {
    const len = payload.length;
    let head;
    if (len < 126) {
      head = Buffer.from([0x80 | op, len]);
    } else if (len < 65536) {
      head = Buffer.alloc(4);
      head[0] = 0x80 | op; head[1] = 126; head.writeUInt16BE(len, 2);
    } else {
      head = Buffer.alloc(10);
      head[0] = 0x80 | op; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([head, payload]);
  }

  send(str) {
    if (this.readyState !== 1) return;
    this.sock.write(this._frame(1, Buffer.from(String(str))));
  }

  close() {
    if (this.readyState !== 1) return;
    try { this.sock.write(this._frame(8, Buffer.alloc(0))); } catch { /* ya cerrado */ }
    this.sock.end();
    this._closed();
  }

  _parse() {
    while (this.readyState === 1) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = !!(b[0] & 0x80);
      const op = b[0] & 0x0f;
      const masked = !!(b[1] & 0x80);
      let len = b[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2); off = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        len = Number(b.readBigUInt64BE(2)); off = 10;
      }
      if (len > MAX_PAYLOAD) { this.sock.destroy(); return; }
      const mlen = masked ? 4 : 0;
      if (b.length < off + mlen + len) return; // falta llegar el resto
      const payload = Buffer.from(b.subarray(off + mlen, off + mlen + len));
      if (masked) {
        const mk = b.subarray(off, off + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mk[i & 3];
      }
      this.buf = b.subarray(off + mlen + len);

      if (op === 8) { this.close(); return; }                                 // cerrar
      if (op === 9) { this.sock.write(this._frame(10, payload)); continue; }  // ping -> pong
      if (op === 10) continue;                                                // pong
      if (op === 1 || op === 2) this.frag = [payload];                        // inicio de mensaje
      else if (op === 0 && this.frag) this.frag.push(payload);                // continuación
      if (fin && this.frag) {
        const msg = Buffer.concat(this.frag).toString();
        this.frag = null;
        this._emit('message', msg);
      }
    }
  }
}

class WebSocketServer {
  constructor({ server }) {
    this.handlers = {};
    server.on('upgrade', (req, sock) => {
      const key = req.headers['sec-websocket-key'];
      if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { sock.destroy(); return; }
      const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
      sock.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
      );
      sock.setNoDelay(true);
      sock.setKeepAlive(true, 30000);
      const ws = new Socket(sock);
      if (this.handlers.connection) this.handlers.connection(ws);
    });
  }
  on(ev, fn) { this.handlers[ev] = fn; return this; }
}

module.exports = { WebSocketServer };
