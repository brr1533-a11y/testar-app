/* Monitor de preços das cotações com link de oferta. Uso exclusivo do servidor.
   De tempos em tempos abre a página da oferta, lê o preço publicado (dados de produto schema.org ou etiquetas de preço)
   e, se mudou, atualiza a cotação e guarda o histórico. Preço passado por WhatsApp ou telefone não tem página para ler:
   esses ficam marcados como "peça de novo" na tela depois de alguns dias.
   Segurança: o servidor abre endereços que usuários digitaram, então só https na porta 443, sem usuário/senha no link,
   sem IP de rede interna (nem por DNS nem por redirecionamento), com tempo e tamanho máximos. */
const https = require("https");
const dns = require("dns").promises;
const net = require("net");

const MAX_BYTES = 1_500_000, TIMEOUT_MS = 8000, MAX_REDIRECTS = 3, HISTORY_MAX = 60;
// Mudança maior que esta (para cima ou para baixo) não é aplicada sozinha: pode ser outro produto ou outra embalagem.
const MAX_AUTO_CHANGE = 0.6;

function ipv4Blocked(ip) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
function addressBlocked(ip) {
  if (net.isIPv4(ip)) return ipv4Blocked(ip);
  if (!net.isIPv6(ip)) return true;
  const s = ip.toLowerCase();
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Blocked(mapped[1]);
  return s === "::" || s === "::1" || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s) || s.startsWith("::ffff:") || s.startsWith("64:ff9b:") || s.startsWith("2001:db8");
}
// Confere o endereço antes de qualquer acesso. Devolve o URL normalizado ou lança erro com code "blocked".
function checkUrl(raw) {
  let u;
  try { u = new URL(String(raw || "")); } catch { throw Object.assign(new Error("Link inválido."), { code: "blocked" }); }
  if (u.protocol !== "https:") throw Object.assign(new Error("Só links https:// são conferidos."), { code: "blocked" });
  if (u.username || u.password) throw Object.assign(new Error("Link com usuário ou senha não é conferido."), { code: "blocked" });
  if (u.port && u.port !== "443") throw Object.assign(new Error("Só a porta padrão (443) é conferida."), { code: "blocked" });
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".") && !net.isIP(host))
    throw Object.assign(new Error("Endereço interno não é conferido."), { code: "blocked" });
  if (net.isIP(host) && addressBlocked(host)) throw Object.assign(new Error("Endereço interno não é conferido."), { code: "blocked" });
  return u;
}
// Resolve o nome e só segue se TODOS os endereços forem públicos; a conexão usa exatamente o endereço conferido
// (assim um DNS que muda de resposta entre a conferência e a conexão não leva para a rede interna).
async function resolvePublic(host) {
  if (net.isIP(host)) return { address: host, family: net.isIPv6(host) ? 6 : 4 };
  const list = await dns.lookup(host, { all: true, verbatim: true });
  if (!list.length || list.some(a => addressBlocked(a.address))) throw Object.assign(new Error("Endereço interno não é conferido."), { code: "blocked" });
  return list[0];
}
function getOnce(u, target) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      protocol: "https:", hostname: u.hostname.replace(/^\[|\]$/g, ""), port: 443, path: u.pathname + u.search, method: "GET",
      servername: net.isIP(u.hostname) ? undefined : u.hostname,
      lookup: (_h, opts, cb) => opts && opts.all ? cb(null, [target]) : cb(null, target.address, target.family),
      headers: { "User-Agent": "GestaoRural-Precos/1.0 (+conferencia de cotacao)", "Accept": "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9" },
      timeout: TIMEOUT_MS
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) { res.resume(); return resolve({ redirect: res.headers.location }); }
      if (res.statusCode !== 200) { res.resume(); return reject(Object.assign(new Error(`A página respondeu ${res.statusCode}.`), { code: "error" })); }
      const type = String(res.headers["content-type"] || "");
      if (type && !/html|xml/i.test(type)) { res.resume(); return reject(Object.assign(new Error("O link não é uma página."), { code: "error" })); }
      let size = 0; const chunks = [];
      res.on("data", c => { size += c.length; if (size > MAX_BYTES) { req.destroy(); reject(Object.assign(new Error("Página grande demais."), { code: "error" })); } else chunks.push(c); });
      res.on("end", () => resolve({ body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", e => reject(Object.assign(e, { code: "error" })));
    });
    req.on("timeout", () => req.destroy(Object.assign(new Error("A página demorou demais."), { code: "error" })));
    req.on("error", e => reject(Object.assign(e, { code: e.code === "blocked" ? "blocked" : "error" })));
    req.end();
  });
}
async function fetchPage(raw) {
  let u = checkUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const target = await resolvePublic(u.hostname.replace(/^\[|\]$/g, ""));
    const r = await getOnce(u, target);
    if (r.body !== undefined) return r.body;
    u = checkUrl(new URL(r.redirect, u).toString());
  }
  throw Object.assign(new Error("Redirecionamentos demais."), { code: "error" });
}

// "1.234,56" / "1234.56" / "R$ 1.234" → número.
function parsePrice(v) {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
  let s = String(v ?? "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 1e9 ? Math.round(n * 100) / 100 : null;
}
const decode = s => String(s).replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
// Lê o preço publicado na página. Ordem: dados de produto (JSON-LD), etiquetas meta, itemprop="price".
function extractPrice(html) {
  const page = String(html || "");
  const offers = [];
  const walk = (n, depth = 0) => {
    if (!n || typeof n !== "object" || depth > 8) return;
    if (Array.isArray(n)) return n.forEach(x => walk(x, depth + 1));
    const type = [].concat(n["@type"] || []).map(String);
    if (type.some(t => /Offer$/.test(t))) {
      const p = parsePrice(n.price ?? n.lowPrice ?? n.priceSpecification?.price);
      const cur = String(n.priceCurrency || n.priceSpecification?.priceCurrency || "BRL").toUpperCase();
      if (p && cur === "BRL") offers.push(p);
    }
    for (const k of ["offers", "@graph", "mainEntity", "itemOffered"]) if (n[k]) walk(n[k], depth + 1);
  };
  for (const m of page.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim())); } catch {}
  }
  if (offers.length) return { price: Math.min(...offers), source: "dados do produto" };
  const meta = name => {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${name}["']`, "i");
    const m = page.match(re1) || page.match(re2); return m ? parsePrice(decode(m[1])) : null;
  };
  const currency = (page.match(/<meta[^>]+(?:property|name|itemprop)=["'](?:product:price:currency|og:price:currency|priceCurrency)["'][^>]*content=["']([A-Za-z]{3})["']/i) || [])[1];
  if (currency && currency.toUpperCase() !== "BRL") return null;
  for (const n of ["product:price:amount", "og:price:amount", "twitter:data1", "price"]) { const p = meta(n); if (p) return { price: p, source: "etiqueta da página" }; }
  const ip = page.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) || page.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i);
  if (ip) { const p = parsePrice(decode(ip[1])); if (p) return { price: p, source: "etiqueta da página" }; }
  return null;
}

// Cotações que entram na conferência automática.
function watchable(q, today) { return Boolean(q && q.link && q.autoUpdate !== false && !q.discarded && (!q.validUntil || q.validUntil >= today)); }

// Aplica o resultado de uma conferência na cotação (função pura, usada pelo agendador e pelo botão "Conferir agora").
function applyResult(q, result, at) {
  const prev = q.priceCheck || {};
  if (result.ok) {
    const found = result.price, old = Number(q.unitPrice);
    const check = { status: "ok", checkedAt: at, foundPrice: found, source: result.source };
    if (Math.abs(found - old) < 0.005) { q.priceCheck = { ...check, lastChangeAt: prev.lastChangeAt, direction: prev.direction, previousPrice: prev.previousPrice }; return "same"; }
    if (old > 0 && Math.abs(found - old) / old > MAX_AUTO_CHANGE) { q.priceCheck = { ...check, status: "review", message: "Preço muito diferente do registrado: confira se é o mesmo produto e embalagem.", lastChangeAt: prev.lastChangeAt, direction: prev.direction, previousPrice: prev.previousPrice }; return "review"; }
    const hist = (q.priceHistory || []).length ? q.priceHistory : [{ at: q.createdAt || q.date || at, unitPrice: old, source: "manual" }];
    q.priceHistory = [...hist, { at, unitPrice: found, source: "auto" }].slice(-HISTORY_MAX);
    q.unitPrice = found;
    q.priceCheck = { ...check, previousPrice: old, lastChangeAt: at, direction: found > old ? "up" : "down" };
    return "changed";
  }
  q.priceCheck = { status: result.code === "blocked" ? "blocked" : result.code === "notFound" ? "notFound" : "error", checkedAt: at, message: String(result.message || "Não foi possível conferir.").slice(0, 200), lastChangeAt: prev.lastChangeAt, direction: prev.direction, previousPrice: prev.previousPrice };
  return q.priceCheck.status;
}
async function checkQuote(q, fetcher = fetchPage) {
  try {
    const found = extractPrice(await fetcher(q.link));
    return found ? { ok: true, ...found } : { ok: false, code: "notFound", message: "A página não informa o preço de um jeito que dê para ler. Atualize à mão." };
  } catch (e) { return { ok: false, code: e.code === "blocked" ? "blocked" : "error", message: e.message }; }
}

module.exports = { checkUrl, addressBlocked, parsePrice, extractPrice, watchable, applyResult, checkQuote, fetchPage, HISTORY_MAX, MAX_AUTO_CHANGE };
