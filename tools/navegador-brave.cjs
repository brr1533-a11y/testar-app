// Faz os roteiros do Playwright abrirem o Brave instalado (perfil temporário e vazio do próprio Playwright)
// em vez do Chromium baixado. Sem o Brave (ou no GitHub Actions), não muda nada: usa o Chromium do Playwright.
// Uso: node -r ./tools/navegador-brave.cjs tests/algum-browser.cjs   (ou npm run test:navegador)
// Outro caminho do navegador: defina BRAVE_PATH.
const fs = require('node:fs');
const BRAVE = process.env.BRAVE_PATH || 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
if (fs.existsSync(BRAVE)) {
  const pw = require(require.resolve('playwright', { paths: [process.cwd()] }));
  for (const name of ['launch', 'launchPersistentContext']) {
    const orig = pw.chromium[name].bind(pw.chromium);
    pw.chromium[name] = (...args) => { const i = name === 'launch' ? 0 : 1; args[i] = { ...(args[i] || {}), executablePath: BRAVE }; return orig(...args); };
  }
}
