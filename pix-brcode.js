/* Pix "copia e cola" (BR Code estático do Banco Central, padrão EMV) para pagar cada pessoa no fechamento da colheita:
   chave Pix, nome, cidade e valor. A pessoa do escritório cola no app do banco e confere nome e valor antes de pagar.
   Usado pela tela e pelos testes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PixBR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const field = (id, value) => id + String(value.length).padStart(2, '0') + value;
  // CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como pede o padrão.
  function crc16(text) {
    let crc = 0xFFFF;
    for (const byte of new TextEncoder().encode(text)) {
      crc ^= byte << 8;
      for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  const plain = (v, max) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 .\-]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, max);
  function validCPF(c) {
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    const dv = len => { let s = 0; for (let i = 0; i < len; i++) s += Number(c[i]) * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  }
  // Chave Pix como foi cadastrada → formato do padrão, com o tipo para o escritório conferir.
  // 11 dígitos com CPF válido = CPF; senão, celular (+55). 14 dígitos = CNPJ. Com @ = e-mail. 32 hex com hífens = aleatória.
  function key(raw) {
    const v = String(raw || '').trim();
    if (!v) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return { type: 'aleatória', value: v.toLowerCase() };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { type: 'e-mail', value: v.toLowerCase() };
    const d = v.replace(/\D/g, '');
    if (/^\+/.test(v) && d.length >= 12 && d.length <= 13) return { type: 'celular', value: '+' + d };
    if (d.length === 11 && validCPF(d)) return { type: 'CPF', value: d };
    if (d.length === 14) return { type: 'CNPJ', value: d };
    if (d.length === 10 || d.length === 11) return { type: 'celular', value: '+55' + d };
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return { type: 'celular', value: '+' + d };
    return null;
  }
  // Payload do Pix copia e cola. amount em reais; txid só letras e números (até 25), ou *** sem identificação.
  function payload({ pixKey, name, city, amount, txid, description }) {
    const k = key(pixKey); if (!k) throw new Error('Chave Pix inválida.');
    const value = Number(amount); if (!(value > 0)) throw new Error('Valor do Pix inválido.');
    const desc = plain(description, 40);
    const account = field('00', 'br.gov.bcb.pix') + field('01', k.value) + (desc ? field('02', desc) : '');
    const id = String(txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
    const body = field('00', '01') + field('26', account) + field('52', '0000') + field('53', '986') + field('54', value.toFixed(2)) + field('58', 'BR') + field('59', plain(name, 25) || 'RECEBEDOR') + field('60', plain(city, 15) || 'BRASIL') + field('62', field('05', id)) + '6304';
    return body + crc16(body);
  }
  return { crc16, key, payload };
});
