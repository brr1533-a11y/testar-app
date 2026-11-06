// 4.21 · Balança por Bluetooth: padrão oficial (Weight Scale, até 327 kg) e texto por UART Bluetooth, comum nas balanças de curral.
const test = require('node:test'), a = require('node:assert/strict'), M = require('../melhorias-domain.js');
const pacote = (flags, raw) => [flags, raw & 0xff, (raw >> 8) & 0xff];

test('peso em kg: cada unidade vale 0,005 kg (o padrão vai até 327 kg)', () => {
  a.deepEqual(M.parseBleWeight(pacote(0, 60000)), { kg: 300, unit: 'kg' });   // 60000 × 0,005 = 300 kg
  a.deepEqual(M.parseBleWeight(pacote(0b10, 14000)), { kg: 70, unit: 'kg' }); // com data/hora no pacote: o peso continua nos bytes 1-2
});
test('peso em libras vira kg; leitura com falha (0xFFFF) e pacote curto são ignorados', () => {
  a.deepEqual(M.parseBleWeight(pacote(1, 22046)), { kg: 100, unit: 'lb' });   // 220,46 lb ≈ 100 kg
  a.equal(M.parseBleWeight(pacote(0, 0xFFFF)), null);
  a.equal(M.parseBleWeight([0, 1]), null);
  a.equal(M.parseBleWeight(new Uint8Array(pacote(0, 2000))).kg, 10);
});
test('peso estável: duas leituras seguidas iguais (até 0,2 kg), acima de 1 kg', () => {
  a.equal(M.stableWeight([0, 0, 120, 380, 452.1, 452.2]), 452.2);
  a.equal(M.stableWeight([0, 0.4, 0.4]), null, 'balança vazia não conta');
  a.equal(M.stableWeight([300, 420, 451]), null, 'animal ainda se mexendo');
});
test('balança de curral por texto (UART Bluetooth ou cabo): "452,5 kg" vira 452,5', () => {
  a.equal(M.parseScaleText('ST,GS, 452,5 kg\r\n'), 452.5);
  a.equal(M.parseScaleText('0452.5\n'), 452.5);
  a.equal(M.parseScaleText('PESO: --- \r\n'), null);
  a.equal(M.parseScaleText('452,5'), null, 'sem fim de linha a leitura ainda não terminou');
});
