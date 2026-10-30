/* Tentativas de PIN do cofre do modo de campo (regra usada por campo-offline.js; separada para ter teste automático).
   Depois de 5 erros seguidos, espera crescente: 5 min, 10, 20... até 24 h. Com 10 erros, o cofre só abre depois de entrar
   com usuário e senha (com internet). Acertar o PIN zera tudo. O contador fica no aparelho, junto do cofre. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CofrePin = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const LOCK_AFTER = 5, LOGIN_AFTER = 10, BASE_MS = 5 * 60000, MAX_MS = 86400000;
  const minutes = ms => Math.ceil(ms / 60000);
  // Registro do cofre depois de um PIN errado, e a mensagem para a pessoa.
  function wrong(record, now = Date.now()) {
    const fails = (record.fails || 0) + 1;
    const lockedUntil = fails >= LOCK_AFTER ? now + Math.min(BASE_MS * 2 ** (fails - LOCK_AFTER), MAX_MS) : 0;
    const next = { ...record, fails, lockedUntil, requireLogin: fails >= LOGIN_AFTER };
    const message = next.requireLogin ? 'PIN incorreto. O cofre foi bloqueado: entre com seu usuário e senha, com internet, para liberar.'
      : lockedUntil ? `PIN incorreto. Cofre bloqueado por ${minutes(lockedUntil - now)} min.`
      : `PIN incorreto. Restam ${LOCK_AFTER - fails} tentativa(s) antes do bloqueio.`;
    return { record: next, message };
  }
  // Motivo para nem perguntar o PIN agora ('' = pode tentar). loggedIn: a pessoa já entrou com usuário e senha nesta aba.
  function blocked(record, { loggedIn = false, now = Date.now() } = {}) {
    if (record.requireLogin && !loggedIn) return 'Cofre bloqueado por PIN errado várias vezes. Entre com seu usuário e senha, com internet, e depois abra o cofre.';
    if (record.lockedUntil > now) return `Cofre bloqueado por PIN errado. Tente de novo em ${minutes(record.lockedUntil - now)} min.`;
    return '';
  }
  // PIN certo, ou login com usuário e senha: volta a zero.
  function reset(record) { return { ...record, fails: 0, lockedUntil: 0, requireLogin: false }; }
  const dirty = record => Boolean(record.fails || record.lockedUntil || record.requireLogin);
  return { LOCK_AFTER, LOGIN_AFTER, wrong, blocked, reset, dirty };
});
