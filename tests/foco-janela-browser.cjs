// Janela aberta: o cursor vai sozinho para o primeiro campo só se a pessoa ainda não estiver em outro campo.
// Antes, com a tela ocupada, o foco automático chegava atrasado e puxava o cursor no meio da digitação
// (o texto ia para a data e o campo digitado ficava vazio). Uso: node tests/foco-janela-browser.cjs
const assert = require('node:assert/strict'), { chromium } = require('playwright'), { startServer } = require('./support/server.cjs');
(async () => {
  const s = await startServer({ PRICE_WATCH_HOURS: '0' }), browser = await chromium.launch();
  try {
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    const token = (await (await fetch(s.url + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupCode: '1001', username: 'testceo', password: s.password }) })).json()).token;
    await page.addInitScript(t => sessionStorage.setItem('gestaoRuralToken', t), token);
    await page.goto(s.url + '/app');
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && !document.querySelector('#appView').classList.contains('hidden'));
    // A pessoa abre a janela e vai direto para o segundo campo, antes do foco automático.
    const r = await page.evaluate(async () => {
      askForm({ title: 'Teste de foco', fields: [{ name: 'a', label: 'Primeiro' }, { name: 'b', label: 'Segundo' }] });
      const b = document.querySelector('.dlg-back:not(.closing) [name=b]'); b.focus(); b.value = 'digitando';
      await new Promise(res => setTimeout(res, 150));
      return { focus: document.activeElement?.name, b: b.value };
    });
    assert.deepEqual(r, { focus: 'b', b: 'digitando' }, 'o cursor não pode ser puxado para o primeiro campo');
    await page.keyboard.press('Escape');
    // Sem a pessoa mexer, o primeiro campo continua recebendo o cursor sozinho.
    const auto = await page.evaluate(async () => { askForm({ title: 'Foco automático', fields: [{ name: 'c', label: 'Primeiro' }] }); await new Promise(res => setTimeout(res, 150)); return document.activeElement?.name; });
    assert.equal(auto, 'c');
    assert.deepEqual(errors, []);
    console.log('PASS: foco automático da janela não rouba o cursor de quem já está digitando e continua no primeiro campo quando ninguém mexeu.');
  } finally { await browser.close(); await s.stop(); }
})().catch(e => { console.error(e); process.exit(1); });
