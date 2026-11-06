/* 4.21 · Provedores externos que ligam sozinhos quando as chaves estão no servidor (variáveis de ambiente no Render).
   Sem as chaves, nada muda: a tela avisa "ainda não configurado" e o resto do sistema segue igual.

   WhatsApp (Meta WhatsApp Cloud API)
     WHATSAPP_TOKEN        token permanente do app no Meta for Developers
     WHATSAPP_PHONE_ID     "Phone number ID" do número de envio
     WHATSAPP_TEMPLATE     nome do modelo aprovado (padrão: rural_alert), com 2 variáveis no corpo: {{1}} fazenda, {{2}} aviso
     WHATSAPP_LANG         idioma do modelo (padrão: pt_BR)
     WHATSAPP_API_VERSION  versão da API Graph (padrão: v21.0)

   Open Finance (Pluggy, só leitura de extrato)
     PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET   credenciais do painel da Pluggy
   A conta de cada fazenda (id da conta na Pluggy) é informada pelo CEO na tela de Conciliação.

   Nota fiscal: depende de escolher o emissor (ex.: Focus NFe, NFe.io, PlugNotas) e do certificado digital A1 do produtor;
   o encaixe 'fiscal' continua desligado até essa escolha. */
'use strict';
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function whatsapp(env, fetchImpl) {
  const version = env.WHATSAPP_API_VERSION || 'v21.0', url = `https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_ID}/messages`;
  return {
    async send({ phone, template, parameters = {}, idempotencyKey } = {}) {
      const to = String(phone || '').replace(/\D/g, '');
      if (to.length < 12 || to.length > 13) throw Object.assign(new Error('Telefone do WhatsApp inválido: use DDI + DDD + número, só dígitos (ex.: 5535999990000).'), { statusCode: 422 });
      const body = { messaging_product: 'whatsapp', to, type: 'template', template: { name: env.WHATSAPP_TEMPLATE || template || 'rural_alert', language: { code: env.WHATSAPP_LANG || 'pt_BR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: String(parameters.farm || 'Fazenda').slice(0, 60) }, { type: 'text', text: String(parameters.message || '').slice(0, 900) }] }] } };
      const r = await fetchImpl(url, { method: 'POST', headers: { Authorization: 'Bearer ' + env.WHATSAPP_TOKEN, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Idempotency-Key': String(idempotencyKey).slice(0, 64) } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
      const j = await r.json().catch(() => ({}));
      // 4xx (fora o 429 de "muitas mensagens") é recusa de vez: modelo ou número errado. Vira 422 e não é tentado de novo.
      if (!r.ok) throw Object.assign(new Error('WhatsApp recusou o envio' + (j?.error?.message ? ': ' + String(j.error.message).slice(0, 160) : '.')), { statusCode: r.status >= 400 && r.status < 500 && r.status !== 429 ? 422 : 502 });
      return { id: j?.messages?.[0]?.id || null };
    }
  };
}

function pluggy(env, fetchImpl) {
  const base = 'https://api.pluggy.ai';
  let key = null, until = 0;
  async function apiKey() {
    if (key && Date.now() < until) return key;
    const r = await fetchImpl(base + '/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: env.PLUGGY_CLIENT_ID, clientSecret: env.PLUGGY_CLIENT_SECRET }), signal: AbortSignal.timeout(10000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.apiKey) throw Object.assign(new Error('Pluggy recusou as credenciais do servidor.'), { statusCode: 502 });
    key = j.apiKey; until = Date.now() + 110 * 60000; return key;   // a chave vale 2 h; renova antes
  }
  async function get(path) {
    const r = await fetchImpl(base + path, { headers: { 'X-API-KEY': await apiKey() }, signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { key = null; until = 0; }
    if (!r.ok) throw Object.assign(new Error('Pluggy não respondeu o extrato (' + r.status + ').'), { statusCode: 502 });
    return j;
  }
  return {
    // Lançamentos da conta no período, no mesmo formato do extrato OFX: {date, description, amount (saída negativa), fitid}.
    async transactions({ accountId, from, to }) {
      if (!/^[0-9a-f-]{36}$/i.test(String(accountId || ''))) throw Object.assign(new Error('Informe o código da conta na Pluggy (36 caracteres).'), { statusCode: 422 });
      const rows = [];
      for (let page = 1; page <= 10; page++) {
        const j = await get(`/transactions?accountId=${encodeURIComponent(accountId)}&from=${from}&to=${to}&pageSize=500&page=${page}`);
        for (const t of j.results || []) {
          const value = Number(t.amount); if (!Number.isFinite(value) || !t.id) continue;
          const amount = round2(t.type === 'DEBIT' && value > 0 ? -value : t.type === 'CREDIT' && value < 0 ? -value : value);
          rows.push({ date: String(t.date || '').slice(0, 10), description: String(t.description || t.descriptionRaw || 'Lançamento do banco').slice(0, 160), amount, fitid: 'pluggy:' + t.id });
        }
        if (!j.totalPages || page >= j.totalPages) break;
      }
      return rows.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.amount !== 0);
    }
  };
}

// Liga o que tiver chave. Chamado uma vez pelo servidor; fetchImpl pode ser trocado nos testes.
function configure(Integrations, env = process.env, fetchImpl = globalThis.fetch) {
  const ligados = [];
  if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID && !Integrations.ready('whatsapp')) { Integrations.register('whatsapp', whatsapp(env, fetchImpl)); ligados.push('whatsapp'); }
  if (env.PLUGGY_CLIENT_ID && env.PLUGGY_CLIENT_SECRET && !Integrations.ready('openfinance')) { Integrations.register('openfinance', pluggy(env, fetchImpl)); ligados.push('openfinance'); }
  return ligados;
}

// Aviso já tentado: enviado ou recusado de vez (telefone/modelo errado) não tenta de novo; erro passageiro e
// "não configurado" esperam 1 hora (antes repetia a cada minuto, para sempre).
function podeTentar(prev, agora = Date.now()) {
  if (!prev) return true;
  if (prev.status === 'sent' || prev.status === 'refused') return false;
  return !(agora - Date.parse(prev.at) < 3600000);
}

module.exports = { configure, whatsapp, pluggy, podeTentar };
