const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../cofre-pin.js');

const MIN = 60000, t0 = Date.parse('2026-10-30T12:00:00Z');
// Erra o PIN n vezes seguidas, cada uma no instante em que a anterior liberou (o pior caso: quem tenta sem parar).
function errar(n, start = {}) {
  let rec = start, now = t0, msg = '';
  for (let i = 0; i < n; i++) { now = Math.max(now, rec.lockedUntil || 0); ({ record: rec, message: msg } = P.wrong(rec, now)); }
  return { rec, msg, now };
}

test('PIN: as 4 primeiras tentativas erradas só avisam quantas restam, sem bloquear', () => {
  let rec = {};
  for (let i = 1; i <= 4; i++) {
    const r = P.wrong(rec, t0); rec = r.record;
    assert.equal(rec.fails, i); assert.equal(rec.lockedUntil, 0);
    assert.equal(r.message, `PIN incorreto. Restam ${5 - i} tentativa(s) antes do bloqueio.`);
    assert.equal(P.blocked(rec, { now: t0 }), '');
  }
});

test('PIN: no 5º erro trava por 5 minutos; durante a espera nem o PIN certo é perguntado', () => {
  const { rec, msg } = errar(5);
  assert.equal(rec.lockedUntil, t0 + 5 * MIN);
  assert.equal(msg, 'PIN incorreto. Cofre bloqueado por 5 min.');
  assert.match(P.blocked(rec, { now: t0 + 1 * MIN }), /Tente de novo em 4 min/);
  assert.match(P.blocked(rec, { now: t0 + 5 * MIN - 1 }), /Tente de novo em 1 min/);
  assert.equal(P.blocked(rec, { now: t0 + 5 * MIN }), ''); // passou a espera: pode tentar de novo
  assert.match(P.blocked(rec, { now: t0, loggedIn: true }), /Tente de novo/); // estar logado não pula a espera
});

test('PIN: a espera dobra a cada erro depois do 5º (5, 10, 20, 40, 80 min) e nunca passa de 24 h', () => {
  const esperas = [];
  let rec = {}, now = t0;
  for (let i = 1; i <= 9; i++) { now = Math.max(now, rec.lockedUntil || 0); rec = P.wrong(rec, now).record; if (rec.lockedUntil) esperas.push((rec.lockedUntil - now) / MIN); }
  assert.deepEqual(esperas, [5, 10, 20, 40, 80]);
  const muito = P.wrong({ fails: 30 }, t0).record;
  assert.equal(muito.lockedUntil - t0, 24 * 60 * MIN);
});

test('PIN: no 10º erro só abre depois de entrar com usuário e senha, mesmo depois de passar a espera', () => {
  const { rec, msg, now } = errar(10);
  assert.equal(rec.requireLogin, true);
  assert.match(msg, /entre com seu usuário e senha/);
  const muitoDepois = now + 30 * 24 * 60 * MIN;
  assert.match(P.blocked(rec, { now: muitoDepois }), /Entre com seu usuário e senha/);
  assert.equal(P.blocked(rec, { now: muitoDepois, loggedIn: true }), ''); // com login feito, pode digitar o PIN
});

test('PIN: acertar (ou entrar com usuário e senha) zera o contador; o próximo erro começa do 1', () => {
  const { rec } = errar(7);
  assert.equal(P.dirty(rec), true);
  const limpo = P.reset(rec);
  assert.deepEqual([limpo.fails, limpo.lockedUntil, limpo.requireLogin], [0, 0, false]);
  assert.equal(P.dirty(limpo), false);
  const r = P.wrong(limpo, t0);
  assert.equal(r.record.fails, 1); assert.match(r.message, /Restam 4/);
});

test('PIN: o contador fica no registro do cofre sem apagar o conteúdo cifrado', () => {
  const cofre = { v: 1, salt: 'abc', iv: 'def', cipher: 'conteudo-cifrado', deviceId: 'x'.repeat(32), pending: true };
  const { rec } = errar(6, cofre);
  assert.equal(rec.cipher, 'conteudo-cifrado'); assert.equal(rec.salt, 'abc'); assert.equal(rec.pending, true); assert.equal(rec.deviceId, cofre.deviceId);
  assert.equal(P.reset(rec).cipher, 'conteudo-cifrado');
});
