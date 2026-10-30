const RuralDomain = require("./rural-domain.js");
const SubscriptionDomain = require("./subscription-domain.js");
const PlotHistory = require("./talhoes-domain.js");
const SeasonHistory = require("./safras-domain.js");
const RuralOps = require("./operacao-domain.js");
const SoilAnalysis = require("./analise-solo-domain.js");
const FarmManagement = require("./gestao-domain.js");
const GroupAccess = require("./group-access.js");
const PriceWatch = require("./price-watch.js");
const AdmAccess = require("./adm-access.js");
const PlanFeatures = require("./plan-features.js");
const FieldOps = require("./campo-domain.js");
const RuralManagement = require("./evolucao-domain.js");
const HarvestLabor = require("./maodeobra-domain.js");
const Carencia = require("./carencia-domain.js");
const Medicamentos = require("./medicamentos-domain.js");
const Expansion = require("./expansao-domain.js");
const express = require("express");
const path = require("path");
const fs = require("fs");
const ACTIVITY_PRICING = SubscriptionDomain.parsePricing(process.env.ACTIVITY_PRICES_JSON || fs.readFileSync(path.join(__dirname, 'planos-atividades.json'), 'utf8'));
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
// Quantos proxies ficam na frente do app. Se estiver errado, o IP de cada cliente sai errado e os limites de tentativa
// passam a valer para todo mundo junto. Confira no log "[proteções]" depois do deploy e ajuste TRUST_PROXY se preciso.
app.set("trust proxy", Math.max(0, Number(process.env.TRUST_PROXY ?? 1) || 0));
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; media-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
  if (IS_PRODUCTION && req.headers['x-forwarded-proto'] === 'https') res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Cache-Control", req.path.startsWith('/api/') ? "no-store" : "no-cache");
  next();
});
const PORT = process.env.PORT || 3000;
const NODE_ENV = String(process.env.NODE_ENV || "").trim().toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || "";
// Falha fechado: no Render (variável RENDER) ou com banco configurado, o servidor se trata como produção
// mesmo que NODE_ENV tenha sido esquecida. Para rodar sem as proteções é preciso dizer NODE_ENV=development.
const IS_PRODUCTION = NODE_ENV === "production" || (!["development", "test"].includes(NODE_ENV) && Boolean(process.env.RENDER || DATABASE_URL));
const PUBLIC_DIR = __dirname;
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);
const LOCAL_DB_PATH = path.join(__dirname, ".local-cloud.json");
const SEED_GROUP_SLUG = process.env.SEED_GROUP_SLUG || "grupo-fagundes-miari";
const SEED_GROUP_CODE = String(process.env.SEED_GROUP_CODE || "1001").replace(/\D/g, "") || "1001";
const SEED_GROUP_NAME = process.env.SEED_GROUP_NAME || "Grupo Fagundes Miari";
const SEED_CEO_NAME = process.env.SEED_CEO_NAME || "Jacques Miari";
const SEED_CEO_USER = process.env.SEED_CEO_USER || "jacquesmiari";
const SEED_CEO_PASSWORD = process.env.SEED_CEO_PASSWORD || "";
// Senhas que já circularam em documentação ou são fracas demais: quem entrar com elas é obrigado a trocar.
const WEAK_PASSWORDS = new Set(["05091722", "CAFE123", "ADM123", "123456", "1234567", "12345678", "123456789", "senha123", "senha", "admin123", "fazenda123"]);
const APP_VERSION = "22.0";
const SEED_CEO_EMAIL = String(process.env.SEED_CEO_EMAIL || "").trim().toLowerCase();
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const PLAN_CATALOG = {
  // monthlyPrice: valor das três atividades, usado só por compras antigas que não guardaram a escolha de atividades.
  essential: { id: "essential", name: "Essencial", monthlyPrice: 397, maxFarms: 1, usersPerFarm: 10 },
  pro: { id: "pro", name: "Profissional", monthlyPrice: 997, maxFarms: 5, usersPerFarm: 10 },
  group: { id: "group", name: "Grupo", monthlyPrice: 1497, maxFarms: 15, usersPerFarm: 10 }
};
const BILLING_CYCLES = {
  monthly: { id: "monthly", label: "Mensal", months: 1, discount: 0 },
  quarterly: { id: "quarterly", label: "Trimestral", months: 3, discount: 0.05 },
  semiannual: { id: "semiannual", label: "Semestral", months: 6, discount: 0.10 },
  annual: { id: "annual", label: "Anual", months: 12, discount: 0.20 }
};
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const billingAmount = (planId, billingCycle) => {
  const plan = PLAN_CATALOG[planId] || PLAN_CATALOG.pro;
  const cycle = BILLING_CYCLES[billingCycle] || BILLING_CYCLES.monthly;
  return SubscriptionDomain.quote(plan.id, cycle, ["coffee", "cattle", "grains"], { [plan.id]: { "coffee+cattle+grains": plan.monthlyPrice } }).amount;
};
const PLAN_PRICE = PLAN_CATALOG.pro.monthlyPrice;
const PLAN_NAME = "Gestão Rural";
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
const MP_PLAN_ID = process.env.MERCADOPAGO_PLAN_ID || "";
// Assinatura secreta dos avisos (Suas integrações > Webhooks > Configurar notificações). Com ela, avisos falsos são recusados.
const MP_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
const PLATFORM_SETUP_KEY = process.env.PLATFORM_SETUP_KEY || ""; // legado: só desenvolvimento / migração
const PLATFORM_ADMIN_EMAIL = String(process.env.PLATFORM_ADMIN_EMAIL || "").trim().toLowerCase();
const PLATFORM_ADMIN_PASSWORD = String(process.env.PLATFORM_ADMIN_PASSWORD || "");
const PLATFORM_SESSION_HOURS = Math.max(1, Number(process.env.PLATFORM_SESSION_HOURS || 12));
const PLATFORM_REQUIRE_2FA = String(process.env.PLATFORM_REQUIRE_2FA || "false").toLowerCase() === "true";
const ALLOW_LEGACY_PLATFORM_KEY = String(process.env.ALLOW_LEGACY_PLATFORM_KEY || "").toLowerCase() === "true";
const TEST_PURCHASE_MODE_FLAG = String(process.env.TEST_PURCHASE_MODE || "").toLowerCase() === "true";
// Em produção o modo de compra simulada precisa de liberação explícita e de prazo (TEST_MODE_UNTIL=2026-11-05T18:00:00-03:00).
// Passado o prazo, ele se desliga sozinho, mesmo que alguém esqueça a variável ligada.
const TEST_MODE_UNTIL = Date.parse(String(process.env.TEST_MODE_UNTIL || ""));
function testModeActive() {
  if (!TEST_PURCHASE_MODE_FLAG) return false;
  if (!IS_PRODUCTION) return true;
  return ALLOW_TEST_MODE_IN_PRODUCTION && Number.isFinite(TEST_MODE_UNTIL) && Date.now() < TEST_MODE_UNTIL;
}
const ALLOW_TEST_MODE_IN_PRODUCTION = String(process.env.ALLOW_TEST_MODE_IN_PRODUCTION || "").toLowerCase() === "true";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const PASSWORD_RESET_FROM = process.env.PASSWORD_RESET_FROM || "Gestão Rural <onboarding@resend.dev>";
const PASSWORD_RESET_MINUTES = Math.max(5, Number(process.env.PASSWORD_RESET_MINUTES || 10));

// Corpo grande só onde precisa (dados do Grupo e anexos). Nas demais rotas, inclusive as públicas, até 64 KB:
// um anônimo não consegue mais mandar megabytes num cadastro ou num login.
const BIG_BODY_ROUTES = new Set(["PUT /api/state", "POST /api/state/import-local", "POST /api/files"]);
const bigJson = express.json({ limit: "12mb" }), smallJson = express.json({ limit: "64kb" });
app.use((req, res, next) => (BIG_BODY_ROUTES.has(`${req.method} ${req.path}`) ? bigJson : smallJson)(req, res, next));

const clone = v => JSON.parse(JSON.stringify(v));

// Limite de tentativas por chave (IP, IP+usuário...). Fica em memória: reinicia junto com o servidor.
const rateBuckets = new Map();
function rateHit(key, max, windowMs) {
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || b.reset <= now) { b = { count: 0, reset: now + windowMs }; rateBuckets.set(key, b); }
  b.count += 1;
  return b.count <= max;
}
function rateBlocked(key, max) {
  const b = rateBuckets.get(key);
  return Boolean(b && b.reset > Date.now() && b.count >= max);
}
function rateClear(key) { rateBuckets.delete(key); }
function rateRetryMinutes(key) {
  const b = rateBuckets.get(key);
  return b ? Math.max(1, Math.ceil((b.reset - Date.now()) / 60000)) : 1;
}
// Sessões vencidas saem de hora em hora (antes, só ao reiniciar o servidor).
setInterval(() => { store.pruneSessions().catch(e => console.error("Limpeza de sessões:", e.message)); }, 3600_000).unref();
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of rateBuckets) if (b.reset <= now) rateBuckets.delete(k);
  for (const [k, at] of passwordResetRequestTimes) if (now - at > 60_000) passwordResetRequestTimes.delete(k);
}, 10 * 60_000).unref();
function limitRequests(name, max, windowMs, message) {
  return (req, res, next) => {
    if (rateHit(`${name}|${req.ip}`, max, windowMs)) return next();
    res.status(429).json({ error: message || "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
  };
}
// Compara em tempo constante. Compara os resumos SHA-256 (sempre 32 bytes): assim nem o tamanho do segredo vaza pelo tempo.
function safeEqual(a, b) {
  const sa = String(a || ""), sb = String(b || "");
  if (!sa || !sb) return false;
  const digest = s => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(digest(sa), digest(sb));
}
const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const slugify = value => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const tokenHash = token => crypto.createHash("sha256").update(token).digest("hex");
const cleanGroupCode = value => String(value || "").replace(/\D/g, "").slice(0, 8);

function makeFarm(name) {
  return {
    id: uid(), name, type: "mixed", photo: "", tractors: [], implements: [], stock: [], finances: [], notes: [],
    assignments: [], equipmentLogs: [], talhoes: [], plotProcedures: [], soilAnalyses: [], banho: { products: [], orders: [] },
    cattle: { paddocks: [], lots: [], weighings: [], healthEvents: [] }, agriculture: { cycles: [], harvests: [], sales: [] }
  };
}

function makeDefaultState({ ceoName, ceoUser, ceoPasswordHash, ceoEmail = "" }) {
  return {
    version: 21,
    interfaceMode: "coffee",
    users: [{
      id: uid(), username: ceoUser, passwordHash: ceoPasswordHash, name: ceoName, email: String(ceoEmail || "").trim().toLowerCase(),
      role: "ceo", active: true, function: "CEO", pixKey: "", allowedFarmId: "", allowedActivity: "both",
      mustChangePassword: false, createdAt: nowIso(), createdBy: "sistema"
    }],
    pendingRegistrations: [],
    // Começa com uma fazenda vazia; o CEO renomeia e cadastra as demais em Configurações › Fazendas.
    farms: [makeFarm("Minha Fazenda")],
    receipts: []
  };
}

function sanitizeState(state) {
  const out = clone(state || {});
  for (const u of out.users || []) {
    delete u.password;
    delete u.passwordHash;
  }
  for (const r of out.pendingRegistrations || []) {
    delete r.password;
    delete r.passwordHash;
  }
  return out;
}

async function normalizeSecrets(incoming, existing = null) {
  const next = clone(incoming || {});
  next.version = 21;
  next.users = Array.isArray(next.users) ? next.users : [];
  next.pendingRegistrations = Array.isArray(next.pendingRegistrations) ? next.pendingRegistrations : [];
  const oldUsers = new Map((existing?.users || []).map(u => [String(u.id || u.username).toLowerCase(), u]));
  const oldRegs = new Map((existing?.pendingRegistrations || []).map(r => [String(r.id || r.username).toLowerCase(), r]));

  for (const u of next.users) {
    const key = String(u.id || u.username).toLowerCase();
    const old = oldUsers.get(key);
    if (!u.email && old?.email) u.email = old.email;
    if (u.password) {
      u.passwordHash = await bcrypt.hash(String(u.password), 11);
      delete u.password;
    } else if (!u.passwordHash && old?.passwordHash) {
      u.passwordHash = old.passwordHash;
    } else if (!u.passwordHash && old?.password) {
      u.passwordHash = await bcrypt.hash(String(old.password), 11);
    }
  }

  for (const r of next.pendingRegistrations) {
    const key = String(r.id || r.username).toLowerCase();
    const old = oldRegs.get(key);
    if (!r.email && old?.email) r.email = old.email;
    if (r.password) {
      r.passwordHash = await bcrypt.hash(String(r.password), 11);
      delete r.password;
    } else if (!r.passwordHash && old?.passwordHash) {
      r.passwordHash = old.passwordHash;
    } else if (!r.passwordHash && old?.password) {
      r.passwordHash = await bcrypt.hash(String(old.password), 11);
    }
  }
  return next;
}

class LocalStore {
  constructor(file) { this.file = file; this.data = { groups: [], sessions: [], purchases: [], passwordResets: [], config: {} }; }
  async init() {
    if (fs.existsSync(this.file)) {
      try { this.data = JSON.parse(fs.readFileSync(this.file, "utf8")); }
      catch (e) {
        // Nunca sobrescreve um arquivo que não deu para ler: guarda uma cópia e para, para ninguém perder os dados.
        const copy = `${this.file}.corrompido-${Date.now()}`;
        fs.copyFileSync(this.file, copy);
        throw new Error(`Não foi possível ler ${this.file} (${e.message}). Uma cópia foi guardada em ${copy}.`);
      }
    }
    this.data.groups ||= []; this.data.sessions ||= []; this.data.purchases ||= []; this.data.passwordResets ||= []; this.data.config ||= {}; this.data.files ||= [];
    this.flush();
  }
  // Grava num arquivo temporário e troca no fim: se o servidor cair no meio, o arquivo antigo continua inteiro.
  flush() { const tmp = `${this.file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2)); fs.renameSync(tmp, this.file); }
  async getGroupBySlug(slug) { return clone(this.data.groups.find(g => g.slug === slug) || null); }
  async getGroupByCode(code) { return clone(this.data.groups.find(g => String(g.code || "") === String(code || "")) || null); }
  async getGroupById(id) { return clone(this.data.groups.find(g => g.id === id) || null); }
  async createGroup(group) { group.state ||= {}; group.state._rev = Number(group.state._rev || 0) + 1; this.data.groups.push(clone(group)); this.flush(); return clone(group); }
  async saveGroup(group) {
    const i = this.data.groups.findIndex(g => g.id === group.id);
    const currentRev = i >= 0 ? Number(this.data.groups[i].state?._rev || 0) : 0;
    group.state._rev = Math.max(currentRev, Number(group.state?._rev || 0)) + 1;
    group.updatedAt = nowIso();
    if (i >= 0) this.data.groups[i] = clone(group); else this.data.groups.push(clone(group));
    this.flush(); return clone(group);
  }
  // Grava só se ninguém salvou o grupo desde que ele foi lido (evita uma pessoa apagar o trabalho da outra).
  // Só os dados mudam aqui; status e plano mudam por saveGroupMeta, então uma gravação comum nunca desfaz uma suspensão.
  async saveGroupIfRev(group, expectedRev) {
    const i = this.data.groups.findIndex(g => g.id === group.id);
    if (i < 0 || Number(this.data.groups[i].state?._rev || 0) !== Number(expectedRev || 0)) return null;
    const cur = this.data.groups[i];
    cur.state = clone(group.state);
    cur.state._rev = Number(expectedRev || 0) + 1;
    cur.cloudInitialized = Boolean(cur.cloudInitialized || group.cloudInitialized);
    cur.updatedAt = nowIso();
    this.flush(); return clone(cur);
  }
  // Muda status, plano e dados de cobrança sem tocar nos dados do Grupo.
  async saveGroupMeta(group) {
    const cur = this.data.groups.find(g => g.id === group.id);
    if (!cur) return null;
    for (const k of ["code", "name", "status", "plan", "subscriptionId", "payerEmail"]) cur[k] = group[k];
    cur.updatedAt = nowIso();
    this.flush(); return clone(cur);
  }
  filesDir() { return path.join(path.dirname(this.file), ".local-files"); }
  async createFile(f) {
    fs.mkdirSync(this.filesDir(), { recursive: true });
    fs.writeFileSync(path.join(this.filesDir(), f.id), f.data);
    this.data.files ||= [];
    this.data.files.push({ id: f.id, groupId: f.groupId, name: f.name, mime: f.mime, size: f.size, createdBy: f.createdBy, createdAt: f.createdAt });
    this.flush();
  }
  async getFile(id) {
    const meta = (this.data.files || []).find(x => x.id === id);
    if (!meta) return null;
    try { return { ...clone(meta), data: fs.readFileSync(path.join(this.filesDir(), id)) }; } catch (_) { return null; }
  }
  async listFiles(groupId) { return clone((this.data.files || []).filter(x => x.groupId === groupId)); }
  async deleteFiles(ids) {
    const set = new Set(ids);
    for (const id of set) { try { fs.unlinkSync(path.join(this.filesDir(), id)); } catch (_) {} }
    this.data.files = (this.data.files || []).filter(x => !set.has(x.id));
    this.flush();
  }
  async listGroups() { return clone(this.data.groups); }
  async deleteGroup(id) {
    await this.deleteFiles((this.data.files || []).filter(x => x.groupId === id).map(x => x.id));
    this.data.groups = this.data.groups.filter(g => g.id !== id);
    this.data.sessions = this.data.sessions.filter(s => s.groupId !== id);
    this.data.passwordResets = this.data.passwordResets.filter(r => r.groupId !== id);
    this.data.purchases = this.data.purchases.map(p => p.groupId === id ? { ...p, groupId: null } : p);
    this.flush();
  }
  async createSession(session) { this.data.sessions.push(clone(session)); this.flush(); }
  async getSession(hash) {
    const s = this.data.sessions.find(x => x.tokenHash === hash && new Date(x.expiresAt) > new Date());
    return clone(s || null);
  }
  async deleteSession(hash) { this.data.sessions = this.data.sessions.filter(s => s.tokenHash !== hash); this.flush(); }
  async deleteSessionsForUser(groupId, userId) { this.data.sessions = this.data.sessions.filter(s => !(s.groupId === groupId && String(s.userId) === String(userId))); this.flush(); }
  async pruneSessions() { this.data.sessions = this.data.sessions.filter(s => new Date(s.expiresAt) > new Date()); this.flush(); }

  async createPurchase(purchase) { this.data.purchases.push(clone(purchase)); this.flush(); return clone(purchase); }
  async getPurchaseById(id) { return clone(this.data.purchases.find(p => p.id === id) || null); }
  // Reserva a compra para criar um Grupo; só a primeira chamada consegue.
  async claimPurchase(id) {
    const p = this.data.purchases.find(x => x.id === id);
    if (!p || p.usedAt) return null;
    p.usedAt = nowIso(); this.flush(); return clone(p);
  }
  async releasePurchase(id) { const p = this.data.purchases.find(x => x.id === id); if (p && !p.groupId) { p.usedAt = null; this.flush(); } }
  async getPurchaseBySubscription(id) { return clone(this.data.purchases.find(p => p.subscriptionId === id) || null); }
  // usedAt e groupId nunca voltam a vazio por aqui (uma cópia antiga não desfaz a reserva da compra; só releasePurchase faz isso).
  async savePurchase(purchase) {
    const i = this.data.purchases.findIndex(p => p.id === purchase.id);
    const next = clone(purchase);
    if (i >= 0) { next.usedAt = this.data.purchases[i].usedAt || next.usedAt || null; next.groupId = this.data.purchases[i].groupId || next.groupId || null; this.data.purchases[i] = next; }
    else this.data.purchases.push(next);
    this.flush(); return clone(next);
  }
  async getGroupBySubscription(id) { return clone(this.data.groups.find(g => g.subscriptionId === id) || null); }
  async createPasswordReset(r) { this.data.passwordResets.push(clone(r)); this.flush(); return clone(r); }
  async findPasswordReset(groupId, userId, email) {
    const matches = this.data.passwordResets.filter(r => r.groupId === groupId && String(r.userId) === String(userId) && String(r.email).toLowerCase() === String(email).toLowerCase() && !r.usedAt);
    matches.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return clone(matches[0] || null);
  }
  async savePasswordReset(r) { const i=this.data.passwordResets.findIndex(x=>x.id===r.id); if(i>=0)this.data.passwordResets[i]=clone(r); else this.data.passwordResets.push(clone(r)); this.flush(); return clone(r); }
  async deletePasswordResetsForUser(groupId, userId) { this.data.passwordResets = this.data.passwordResets.filter(r => !(r.groupId === groupId && String(r.userId) === String(userId))); this.flush(); }
  async getConfig(key) { return clone(this.data.config[key] ?? null); }
  async setConfig(key, value) { this.data.config[key] = clone(value); this.flush(); }
}

class PgStore {
  constructor(url) {
    // DATABASE_SSL_STRICT=true passa a conferir o certificado do banco (use quando o provedor tiver certificado válido).
    const strict = String(process.env.DATABASE_SSL_STRICT || "").toLowerCase() === "true";
    this.pool = new Pool({ connectionString: url, ssl: IS_PRODUCTION ? { rejectUnauthorized: strict } : undefined });
    this.pool.on("error", e => console.error("PostgreSQL (conexão ociosa):", e.message));
  }
  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_groups (
        id UUID PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        code TEXT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        plan TEXT NOT NULL DEFAULT 'pro',
        state JSONB NOT NULL,
        cloud_initialized BOOLEAN NOT NULL DEFAULT FALSE,
        subscription_id TEXT,
        payer_email TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE tenant_groups ADD COLUMN IF NOT EXISTS code TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS tenant_groups_code_unique ON tenant_groups(code) WHERE code IS NOT NULL;
      CREATE TABLE IF NOT EXISTS app_sessions (
        token_hash TEXT PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES tenant_groups(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS platform_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS purchases (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'created',
        subscription_id TEXT,
        used_at TIMESTAMPTZ,
        group_id UUID,
        plan_id TEXT NOT NULL DEFAULT 'pro',
        billing_cycle TEXT NOT NULL DEFAULT 'monthly',
        amount NUMERIC(12,2),
        interval_months INTEGER NOT NULL DEFAULT 1,
        discount_pct NUMERIC(6,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'pro';
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS interval_months INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(6,4) NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id UUID PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES tenant_groups(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS password_reset_lookup_idx ON password_reset_codes(group_id,user_id,email,created_at DESC);
      CREATE TABLE IF NOT EXISTS group_files (
        id UUID PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES tenant_groups(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        data BYTEA NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS group_files_group_idx ON group_files(group_id);
      CREATE INDEX IF NOT EXISTS tenant_groups_subscription_idx ON tenant_groups(subscription_id);
      CREATE INDEX IF NOT EXISTS purchases_subscription_idx ON purchases(subscription_id);
      CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(group_id, user_id);
    `);
  }
  row(r) {
    if (!r) return null;
    return {
      id: r.id, slug: r.slug, code: r.code, name: r.name, status: r.status, plan: r.plan, state: r.state,
      cloudInitialized: r.cloud_initialized, subscriptionId: r.subscription_id, payerEmail: r.payer_email,
      createdAt: r.created_at, updatedAt: r.updated_at
    };
  }
  async getGroupBySlug(slug) { const { rows } = await this.pool.query("SELECT * FROM tenant_groups WHERE slug=$1", [slug]); return this.row(rows[0]); }
  async getGroupByCode(code) { const { rows } = await this.pool.query("SELECT * FROM tenant_groups WHERE code=$1", [String(code)]); return this.row(rows[0]); }
  async getGroupById(id) { const { rows } = await this.pool.query("SELECT * FROM tenant_groups WHERE id=$1", [id]); return this.row(rows[0]); }
  async createGroup(g) {
    g.state ||= {}; g.state._rev = Number(g.state._rev || 0) + 1;
    const { rows } = await this.pool.query(`INSERT INTO tenant_groups(id,slug,code,name,status,plan,state,cloud_initialized,subscription_id,payer_email)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [g.id,g.slug,g.code||null,g.name,g.status,g.plan,g.state,g.cloudInitialized,g.subscriptionId||null,g.payerEmail||null]);
    return this.row(rows[0]);
  }
  async saveGroup(g) {
    // A versão é incrementada pelo próprio banco, então duas gravações nunca ficam com o mesmo número.
    const { rows } = await this.pool.query(`UPDATE tenant_groups SET code=$2,name=$3,status=$4,plan=$5,
      state=jsonb_set($6::jsonb,'{_rev}',to_jsonb(COALESCE((state->>'_rev')::int,0)+1)),
      cloud_initialized=$7,subscription_id=$8,payer_email=$9,updated_at=now() WHERE id=$1 RETURNING *`,
      [g.id,g.code||null,g.name,g.status,g.plan,JSON.stringify(g.state),g.cloudInitialized,g.subscriptionId||null,g.payerEmail||null]);
    return this.row(rows[0]);
  }
  // Só os dados mudam aqui; status e plano mudam por saveGroupMeta, então uma gravação comum nunca desfaz uma suspensão.
  async saveGroupIfRev(g, expectedRev) {
    const { rows } = await this.pool.query(`UPDATE tenant_groups SET
      state=jsonb_set($2::jsonb,'{_rev}',to_jsonb(COALESCE((state->>'_rev')::int,0)+1)),
      cloud_initialized=(cloud_initialized OR $3),updated_at=now()
      WHERE id=$1 AND COALESCE((state->>'_rev')::int,0)=$4 RETURNING *`,
      [g.id,JSON.stringify(g.state),Boolean(g.cloudInitialized),Number(expectedRev||0)]);
    return this.row(rows[0]);
  }
  async saveGroupMeta(g) {
    const { rows } = await this.pool.query(`UPDATE tenant_groups SET code=$2,name=$3,status=$4,plan=$5,subscription_id=$6,payer_email=$7,updated_at=now() WHERE id=$1 RETURNING *`,
      [g.id,g.code||null,g.name,g.status,g.plan,g.subscriptionId||null,g.payerEmail||null]);
    return this.row(rows[0]);
  }
  async createFile(f) {
    await this.pool.query("INSERT INTO group_files(id,group_id,name,mime,size,data,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [f.id,f.groupId,f.name,f.mime,f.size,f.data,f.createdBy||null,f.createdAt]);
  }
  async getFile(id) {
    const { rows } = await this.pool.query("SELECT * FROM group_files WHERE id=$1", [id]);
    const r = rows[0]; if (!r) return null;
    return { id: r.id, groupId: r.group_id, name: r.name, mime: r.mime, size: r.size, data: r.data, createdBy: r.created_by, createdAt: r.created_at };
  }
  async listFiles(groupId) {
    const { rows } = await this.pool.query("SELECT id,group_id,name,mime,size,created_by,created_at FROM group_files WHERE group_id=$1", [groupId]);
    return rows.map(r => ({ id: r.id, groupId: r.group_id, name: r.name, mime: r.mime, size: r.size, createdBy: r.created_by, createdAt: r.created_at }));
  }
  async deleteFiles(ids) { if (ids.length) await this.pool.query("DELETE FROM group_files WHERE id = ANY($1::uuid[])", [ids]); }
  async listGroups() { const { rows } = await this.pool.query("SELECT * FROM tenant_groups ORDER BY created_at DESC"); return rows.map(r => this.row(r)); }
  async deleteGroup(id) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE purchases SET group_id=NULL, updated_at=now() WHERE group_id=$1", [id]);
      await client.query("DELETE FROM tenant_groups WHERE id=$1", [id]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  }
  async createSession(s) { await this.pool.query("INSERT INTO app_sessions(token_hash,group_id,user_id,expires_at) VALUES($1,$2,$3,$4)", [s.tokenHash,s.groupId,s.userId,s.expiresAt]); }
  async getSession(hash) { const { rows } = await this.pool.query("SELECT * FROM app_sessions WHERE token_hash=$1 AND expires_at>now()", [hash]); return rows[0] ? { tokenHash: rows[0].token_hash, groupId: rows[0].group_id, userId: rows[0].user_id, expiresAt: rows[0].expires_at } : null; }
  async deleteSession(hash) { await this.pool.query("DELETE FROM app_sessions WHERE token_hash=$1", [hash]); }
  async deleteSessionsForUser(groupId, userId) { await this.pool.query("DELETE FROM app_sessions WHERE group_id=$1 AND user_id=$2", [groupId, String(userId)]); }
  async pruneSessions() { await this.pool.query("DELETE FROM app_sessions WHERE expires_at<=now()"); }

  async createPurchase(p) {
    const {rows}=await this.pool.query(`INSERT INTO purchases(id,email,status,subscription_id,used_at,group_id,plan_id,billing_cycle,amount,interval_months,discount_pct)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [p.id,p.email,p.status,p.subscriptionId||null,p.usedAt||null,p.groupId||null,p.planId||"pro",p.billingCycle||"monthly",p.amount||null,p.intervalMonths||1,p.discountPct||0]);
    return this.purchaseRow(rows[0]);
  }
  purchaseRow(r){ if(!r)return null; return {id:r.id,email:r.email,status:r.status,subscriptionId:r.subscription_id,usedAt:r.used_at,groupId:r.group_id,planId:r.plan_id||"pro",billingCycle:r.billing_cycle||"monthly",amount:r.amount==null?null:Number(r.amount),intervalMonths:Number(r.interval_months||1),discountPct:Number(r.discount_pct||0),createdAt:r.created_at,updatedAt:r.updated_at}; }
  async getPurchaseById(id){ const {rows}=await this.pool.query("SELECT * FROM purchases WHERE id=$1",[id]); return this.purchaseRow(rows[0]); }
  async claimPurchase(id){ const {rows}=await this.pool.query("UPDATE purchases SET used_at=now(), updated_at=now() WHERE id=$1 AND used_at IS NULL RETURNING *",[id]); return this.purchaseRow(rows[0]); }
  async releasePurchase(id){ await this.pool.query("UPDATE purchases SET used_at=NULL, updated_at=now() WHERE id=$1 AND group_id IS NULL",[id]); }
  async getPurchaseBySubscription(id){ const {rows}=await this.pool.query("SELECT * FROM purchases WHERE subscription_id=$1",[id]); return this.purchaseRow(rows[0]); }
  // used_at e group_id nunca voltam a vazio por aqui (uma cópia antiga não desfaz a reserva da compra; só releasePurchase faz isso).
  async savePurchase(p){ const {rows}=await this.pool.query(`UPDATE purchases SET email=$2,status=$3,subscription_id=$4,used_at=COALESCE(used_at,$5),group_id=COALESCE(group_id,$6),plan_id=$7,billing_cycle=$8,amount=$9,interval_months=$10,discount_pct=$11,updated_at=now() WHERE id=$1 RETURNING *`,
    [p.id,p.email,p.status,p.subscriptionId||null,p.usedAt||null,p.groupId||null,p.planId||"pro",p.billingCycle||"monthly",p.amount||null,p.intervalMonths||1,p.discountPct||0]); return this.purchaseRow(rows[0]); }
  async getGroupBySubscription(id){ const {rows}=await this.pool.query("SELECT * FROM tenant_groups WHERE subscription_id=$1",[id]); return this.row(rows[0]); }
  async createPasswordReset(r) { await this.pool.query(`INSERT INTO password_reset_codes(id,group_id,user_id,email,code_hash,expires_at,attempts,used_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [r.id,r.groupId,String(r.userId),r.email,r.codeHash,r.expiresAt,r.attempts||0,r.usedAt||null,r.createdAt||nowIso()]); return r; }
  async findPasswordReset(groupId, userId, email) { const {rows}=await this.pool.query(`SELECT * FROM password_reset_codes WHERE group_id=$1 AND user_id=$2 AND lower(email)=lower($3) AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`,[groupId,String(userId),email]); const r=rows[0]; return r?{id:r.id,groupId:r.group_id,userId:r.user_id,email:r.email,codeHash:r.code_hash,expiresAt:r.expires_at,attempts:r.attempts,usedAt:r.used_at,createdAt:r.created_at}:null; }
  async savePasswordReset(r) { await this.pool.query(`UPDATE password_reset_codes SET code_hash=$2,expires_at=$3,attempts=$4,used_at=$5 WHERE id=$1`,[r.id,r.codeHash,r.expiresAt,r.attempts||0,r.usedAt||null]); return r; }
  async deletePasswordResetsForUser(groupId, userId) { await this.pool.query("DELETE FROM password_reset_codes WHERE group_id=$1 AND user_id=$2",[groupId,String(userId)]); }
  async getConfig(key) { const { rows } = await this.pool.query("SELECT value FROM platform_config WHERE key=$1", [key]); return rows[0]?.value ?? null; }
  async setConfig(key, value) { await this.pool.query(`INSERT INTO platform_config(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [key, JSON.stringify(value)]); }
}

const store = DATABASE_URL ? new PgStore(DATABASE_URL) : new LocalStore(LOCAL_DB_PATH);

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

// Lê a versão mais nova do Grupo, aplica a alteração e grava só se ninguém salvou no meio.
// Se alguém salvou, refaz a alteração em cima da versão nova. Faça o bcrypt antes: `mutate` pode rodar mais de uma vez.
async function mutateGroup(groupId, mutate) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const group = await store.getGroupById(groupId);
    if (!group) throw httpError(404, "Grupo não encontrado");
    const rev = Number(group.state?._rev || 0);
    const result = await mutate(group);
    const saved = await store.saveGroupIfRev(group, rev);
    if (saved) return { saved, result };
  }
  throw httpError(409, "Muitas alterações ao mesmo tempo. Tente de novo.");
}

async function allocateGroupCode(preferred = "") {
  const cleaned = cleanGroupCode(preferred);
  if (cleaned && cleaned.length >= 4 && !(await store.getGroupByCode(cleaned))) return cleaned;
  for (let i = 0; i < 200; i++) {
    const code = String(1000 + crypto.randomInt(0, 9000));
    if (!(await store.getGroupByCode(code))) return code;
  }
  for (let i = 0; i < 200; i++) {
    const code = String(100000 + crypto.randomInt(0, 900000));
    if (!(await store.getGroupByCode(code))) return code;
  }
  throw new Error("Não foi possível gerar um Código de Grupo disponível");
}

async function ensureExistingGroupCodes() {
  const groups = await store.listGroups();
  for (const group of groups) {
    if (cleanGroupCode(group.code).length >= 4) continue;
    group.code = await allocateGroupCode(group.slug === SEED_GROUP_SLUG ? SEED_GROUP_CODE : "");
    await store.saveGroup(group);
  }
}

async function ensureSeedGroup() {
  let group = await store.getGroupBySlug(SEED_GROUP_SLUG);
  if (group) {
    let changed = false;
    if (!cleanGroupCode(group.code)) { group.code = await allocateGroupCode(SEED_GROUP_CODE); changed = true; }
    const seedCeo = (group.state?.users || []).find(u => u.role === "ceo");
    if (SEED_CEO_EMAIL && seedCeo && !seedCeo.email) { seedCeo.email = SEED_CEO_EMAIL; changed = true; }
    if (changed) await store.saveGroup(group);
    return group;
  }
  let seedPassword = SEED_CEO_PASSWORD;
  if (!seedPassword) {
    seedPassword = crypto.randomBytes(9).toString("base64url");
    console.warn(`\n[Gestão Rural] SEED_CEO_PASSWORD não foi definida. Senha inicial gerada para ${SEED_CEO_USER}: ${seedPassword}\nDefina SEED_CEO_PASSWORD nas variáveis do servidor e troque a senha no primeiro acesso.\n`);
  }
  const hash = await bcrypt.hash(seedPassword, 11);
  group = {
    id: uid(), slug: SEED_GROUP_SLUG, code: await allocateGroupCode(SEED_GROUP_CODE), name: SEED_GROUP_NAME, status: "active", plan: "pro",
    state: makeDefaultState({ ceoName: SEED_CEO_NAME, ceoUser: SEED_CEO_USER, ceoPasswordHash: hash, ceoEmail: SEED_CEO_EMAIL }),
    cloudInitialized: false, subscriptionId: null, payerEmail: null, createdAt: nowIso(), updatedAt: nowIso()
  };
  return store.createGroup(group);
}

async function auth(req, res, next) {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Sessão não informada" });
    const session = await store.getSession(tokenHash(token));
    if (!session) return res.status(401).json({ error: "Sessão expirada" });
    const group = await store.getGroupById(session.groupId);
    if (!group) return res.status(401).json({ error: "Grupo não encontrado" });
    if (group.status !== "active") return res.status(403).json({ error: "Acesso do grupo suspenso", status: group.status });
    if (trialExpired(group.state)) return res.status(402).json(trialExpiredBody(group));
    const user = (group.state.users || []).find(u => String(u.id) === String(session.userId) && u.active !== false);
    if (!user) return res.status(401).json({ error: "Usuário desativado" });
    // Essencial não tem permissão por atividade: o contribuinte trabalha em todas as atividades contratadas da fazenda.
    const scoped = user.role === "contribuinte" && !PlanFeatures.has(group.plan, "userScopes") ? { ...user, allowedActivity: "all" } : user;
    req.auth = { token, session, group, user: scoped };
    const changeAllowed = req.originalUrl.startsWith("/api/auth/change-password") || req.originalUrl.startsWith("/api/auth/logout");
    if (user.mustChangePassword && !changeAllowed) return res.status(428).json({ error: "Troque sua senha para continuar", mustChangePassword: true });
    next();
  } catch (error) { next(error); }
}

function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.auth?.user?.role) ? next() : res.status(403).json({ error: "Sem permissão" });
}


function validateUsername(username) { return /^[a-zA-Z0-9._-]{3,30}$/.test(String(username || "")); }
function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
function validateEmail(email) { const e = normalizeEmail(email); return e.length <= 254 && /^\S+@\S+\.\S+$/.test(e); }
const MAX_NAME_LENGTH = 120, MAX_PIX_LENGTH = 140, MAX_PENDING_REGISTRATIONS = 50;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("senha-que-nunca-confere", 11);
// Senhas padrão antigas que ficaram públicas: no login continuam bloqueadas (só o "Esqueci minha senha" libera).
const WEAK_PASSWORDS_LOWER = new Set([...WEAK_PASSWORDS].map(p => p.toLowerCase()));
// Regra única de senha (a tela usa a mesma): 8 a 128 caracteres, com letra maiúscula, minúscula, número e símbolo.
// Senha antiga fora da regra continua entrando, mas a pessoa precisa trocar logo depois do login.
// Senhas comuns: palavra óbvia + números simples (ex.: Fazenda@123, Senha@2026) passam na regra, mas são as primeiras
// que alguém tenta. A tela usa a mesma lista (app.js).
const COMMON_PASSWORD_WORDS = new Set(["senha", "password", "admin", "administrador", "fazenda", "fazendas", "sitio", "cafe", "cafes", "gado", "boi", "leite", "graos", "soja", "milho", "rural", "agro", "gestao", "brasil", "minas", "teste", "mudar", "trocar", "acesso", "usuario", "qwerty", "asdf", "abc", "abcd", "ceo", "adm", "fiscal", "trator", "tratorista", "colheita", "safra", "deus", "amor", "familia", "flamengo", "corinthians", "palmeiras", "cruzeiro", "atletico", "gremio", "santos", "vasco"]);
function commonPassword(p) {
  const letters = p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""), digits = p.replace(/[^0-9]/g, "");
  const simple = "1234567890".startsWith(digits) || "0123456789".startsWith(digits) || "9876543210".startsWith(digits) || /^(\d)\1*$/.test(digits) || /^(19|20)\d\d$/.test(digits);
  return WEAK_PASSWORDS_LOWER.has(p.toLowerCase()) || COMMON_PASSWORD_WORDS.has(letters) && simple;
}
function passwordProblem(password) {
  const p = String(password || "");
  if (p.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (p.length > 128) return "A senha pode ter no máximo 128 caracteres.";
  const missing = [!/[A-Z]/.test(p) && "letra maiúscula", !/[a-z]/.test(p) && "letra minúscula", !/[0-9]/.test(p) && "número", !/[^A-Za-z0-9]/.test(p) && "símbolo (ex.: @)"].filter(Boolean);
  if (missing.length) return "Falta na senha: " + missing.join(", ") + ".";
  if (commonPassword(p)) return "Essa senha é muito comum (palavra conhecida com números simples). Misture palavras ou use números que não sejam sequência nem ano.";
  return "";
}
function assertPassword(password) { const problem = passwordProblem(password); if (problem) throw Object.assign(new Error(problem), { statusCode: 400 }); }
function maskEmail(email) { return normalizeEmail(email).replace(/(^.).*(@.*$)/, "$1***$2"); }
function escapeEmailHtml(value) { return String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
async function sendPasswordResetEmail({ to, code, groupName }) {
  if (!RESEND_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: PASSWORD_RESET_FROM,
      to: [to],
      subject: "Código para redefinir sua senha — Gestão Rural",
      html: `<div style="font-family:Arial,sans-serif;color:#171815;line-height:1.5"><h2>Redefinição de senha</h2><p>Recebemos uma solicitação para redefinir sua senha no <b>${escapeEmailHtml(groupName)}</b>.</p><p>Seu código é:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:18px 0">${code}</div><p>O código vence em ${PASSWORD_RESET_MINUTES} minutos. Se você não fez essa solicitação, ignore este e-mail.</p></div>`
    })
  });
  if (!response.ok) { const detail = await response.text().catch(() => ""); throw new Error(`Falha ao enviar e-mail (${response.status}) ${detail.slice(0,160)}`); }
  return true;
}
// Aviso de segurança por e-mail (melhor esforço: sem e-mail configurado, não envia nada).
async function sendSecurityNotice({ to, groupName, text }) {
  if (!RESEND_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: PASSWORD_RESET_FROM, to: [to], subject: "Aviso de segurança — Gestão Rural", html: `<div style="font-family:Arial,sans-serif;color:#171815;line-height:1.5"><h2>Aviso de segurança</h2><p><b>${escapeEmailHtml(groupName)}</b></p><p>${escapeEmailHtml(text)}</p></div>` })
  });
  if (!response.ok) throw new Error(`Falha ao enviar aviso (${response.status})`);
  return true;
}
const passwordResetRequestTimes = new Map();

app.get("/api/health", (req, res) => res.json({ ok: true, storage: DATABASE_URL ? "postgres" : "local", version: APP_VERSION }));

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const groupInput = String(req.body.groupCode || req.body.groupSlug || req.body.group || SEED_GROUP_CODE).trim();
    const groupCode = cleanGroupCode(groupInput);
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    // Usuário fora do formato ou senha gigante nem chegam ao bcrypt nem viram chave do limitador.
    if (!validateUsername(username) || password.length > 128 || groupInput.length > 80) return res.status(401).json({ error: "Código do Grupo, usuário ou senha incorretos" });
    // Limites de erro em 15 min: 8 por usuário em cada aparelho/rede, 30 por aparelho/rede e 50 por usuário somando todas as redes.
    // O limite por usuário inclui a rede: assim um estranho não consegue deixar o CEO bloqueado errando a senha dele de propósito.
    // O teto de 50 continua barrando quem tenta adivinhar a senha trocando de rede.
    const account = `${groupCode || groupInput}|${username}`;
    const userKey = `login-user|${account}|${req.ip}`, ipKey = `login-ip|${req.ip}`, accountKey = `login-account|${account}`;
    const blockedKey = rateBlocked(userKey, 8) ? userKey : rateBlocked(ipKey, 30) ? ipKey : rateBlocked(accountKey, 50) ? accountKey : null;
    if (blockedKey) {
      return res.status(429).json({ error: `Muitas tentativas erradas. Tente de novo em ${rateRetryMinutes(blockedKey)} min ou use "Esqueci minha senha".` });
    }
    const fail = () => { rateHit(userKey, 8, 15 * 60_000); rateHit(ipKey, 30, 15 * 60_000); rateHit(accountKey, 50, 15 * 60_000); return res.status(401).json({ error: "Código do Grupo, usuário ou senha incorretos" }); };
    const group = groupCode.length >= 4 ? await store.getGroupByCode(groupCode) : await store.getGroupBySlug(slugify(groupInput));
    // Mesmo sem Grupo ou usuário, roda um bcrypt: assim o tempo de resposta não revela quem existe.
    if (!group) { await bcrypt.compare(password, DUMMY_PASSWORD_HASH); return fail(); }
    const user = (group.state.users || []).find(u => String(u.username || "").toLowerCase() === username && u.active !== false);
    if (!user) {
      // Cadastro ainda não aprovado: com a senha certa, avisa que está aguardando, em vez de "senha incorreta" (e não conta como erro).
      const pending = (group.state.pendingRegistrations || []).find(r => String(r.username || "").toLowerCase() === username);
      if (pending?.passwordHash && await bcrypt.compare(password, pending.passwordHash)) {
        return res.status(403).json({ error: "Seu cadastro ainda está aguardando a aprovação do responsável da fazenda (CEO). Avise-o para liberar seu acesso.", pendingApproval: true });
      }
      if (!pending) await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return fail();
    }
    let ok = false;
    if (user.passwordHash) ok = await bcrypt.compare(password, user.passwordHash);
    else if (user.password) ok = safeEqual(user.password, password);
    if (!ok) return fail();
    rateClear(userKey);
    if (group.status !== "active") return res.status(403).json({ error: "O acesso deste Grupo está suspenso.", status: group.status, suspended: true, isCeo: user.role === "ceo" });
    if (trialExpired(group.state)) return res.status(402).json(trialExpiredBody(group));
    // Senha vazada ou fácil: quem a conhece também conseguiria "trocá-la" e tomar a conta.
    // Não abre sessão; só o código por e-mail (ou o Super Admin) libera o acesso.
    if (WEAK_PASSWORDS_LOWER.has(password.toLowerCase())) {
      return res.status(403).json({ error: "Por segurança, esta senha foi bloqueada. Use \"Esqueci minha senha\" para receber um código no e-mail cadastrado.", resetRequired: true });
    }
    // Senha fora da regra atual (maiúscula, minúscula, número e símbolo): entra, mas precisa trocar na hora.
    const mustChangePassword = Boolean(user.mustChangePassword) || Boolean(passwordProblem(password));
    const legacyHash = user.passwordHash ? null : await bcrypt.hash(password, 11);
    if (legacyHash || (mustChangePassword && !user.mustChangePassword)) {
      await mutateGroup(group.id, g => {
        const u = (g.state.users || []).find(x => String(x.id) === String(user.id));
        if (!u) return;
        if (legacyHash && !u.passwordHash) { u.passwordHash = legacyHash; delete u.password; }
        if (mustChangePassword) u.mustChangePassword = true;
      });
    }
    const token = crypto.randomBytes(36).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await store.createSession({ tokenHash: tokenHash(token), groupId: group.id, userId: user.id, expiresAt });
    store.setConfig(`lastLogin:${group.id}`, { at: nowIso(), user: user.name || user.username }).catch(() => {});
    res.json({ token, expiresAt, mustChangePassword, group: { id: group.id, slug: group.slug, code: group.code, name: group.name, plan: group.plan, status: group.status, cloudInitialized: group.cloudInitialized }, user: sanitizeState({ users: [user] }).users[0] });
  } catch (e) { next(e); }
});

app.post("/api/auth/password-reset/request", limitRequests("reset-request", 10, 15 * 60_000), async (req, res, next) => {
  try {
    const groupCode = cleanGroupCode(req.body.groupCode || req.body.group || "");
    const username = String(req.body.username || "").trim().toLowerCase();
    const email = normalizeEmail(req.body.email);
    if (groupCode.length < 4 || !validateUsername(username) || !validateEmail(email)) return res.status(400).json({ error: "Confira Código do Grupo, usuário e e-mail" });
    // Sem e-mail configurado, só o desenvolvimento local segue (o código vai para o log do servidor). O modo de compra de teste não interfere aqui.
    if (IS_PRODUCTION && !RESEND_API_KEY) return res.status(503).json({ error: "Recuperação por e-mail ainda não configurada no servidor" });

    const rateKey = `${req.ip}|${groupCode}|${username}`;
    const last = passwordResetRequestTimes.get(rateKey) || 0;
    const generic = { ok: true, message: "Se os dados conferirem, enviaremos um código para o e-mail cadastrado." };
    if (Date.now() - last < 60_000) return res.json(generic);
    passwordResetRequestTimes.set(rateKey, Date.now());

    const group = await store.getGroupByCode(groupCode);
    const user = group?.status === "active" ? (group.state.users || []).find(u => String(u.username || "").toLowerCase() === username && u.active !== false) : null;
    const registeredEmail = normalizeEmail(user?.email || (user?.role === "ceo" ? group?.payerEmail : ""));
    if (!group || !user || !registeredEmail || registeredEmail !== email) return res.json(generic);
    // Cada código novo traz mais 5 tentativas. No máximo 5 códigos por pessoa por dia (de qualquer rede),
    // para ninguém ir pedindo código atrás de código até acertar um.
    if (!rateHit(`reset-codes|${group.id}|${user.id}`, 5, 24 * 3600_000)) return res.json(generic);

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    await store.deletePasswordResetsForUser(group.id, user.id);
    const reset = { id: uid(), groupId: group.id, userId: user.id, email, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + PASSWORD_RESET_MINUTES * 60_000).toISOString(), attempts: 0, usedAt: null, createdAt: nowIso() };
    await store.createPasswordReset(reset);
    let sent = false;
    if (RESEND_API_KEY) { try { sent = await sendPasswordResetEmail({ to: email, code, groupName: group.name }); } catch (mailError) { console.error("Falha no e-mail de recuperação:", mailError.message); } }
    if (!sent && IS_PRODUCTION) return res.status(503).json({ error: "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos." });
    // O código nunca vai na resposta: quem pede o reset não pode recebê-lo sem acesso ao e-mail.
    if (!sent) console.log(`[desenvolvimento] Código de recuperação para ${username} (Grupo ${groupCode}): ${code}`);
    res.json({ ...generic, email: maskEmail(email) });
  } catch (e) { next(e); }
});

app.post("/api/auth/password-reset/confirm", limitRequests("reset-confirm", 20, 15 * 60_000), async (req, res, next) => {
  try {
    const groupCode = cleanGroupCode(req.body.groupCode || "");
    const username = String(req.body.username || "").trim().toLowerCase();
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").replace(/\D/g, "").slice(0, 6);
    const newPassword = String(req.body.newPassword || "");
    const passwordIssue = passwordProblem(newPassword); if (passwordIssue) return res.status(400).json({ error: passwordIssue });
    if (code.length !== 6) return res.status(400).json({ error: "Informe o código de 6 dígitos" });

    const group = await store.getGroupByCode(groupCode);
    const user = group?.status === "active" ? (group.state.users || []).find(u => String(u.username || "").toLowerCase() === username && u.active !== false) : null;
    const registeredEmail = normalizeEmail(user?.email || (user?.role === "ceo" ? group?.payerEmail : ""));
    if (!group || !user || registeredEmail !== email) return res.status(400).json({ error: "Código inválido ou expirado" });
    const reset = await store.findPasswordReset(group.id, user.id, email);
    if (!reset || reset.usedAt || new Date(reset.expiresAt).getTime() < Date.now() || Number(reset.attempts || 0) >= 5) return res.status(400).json({ error: "Código inválido ou expirado" });
    const ok = await bcrypt.compare(code, reset.codeHash);
    if (!ok) { reset.attempts = Number(reset.attempts || 0) + 1; await store.savePasswordReset(reset); return res.status(400).json({ error: "Código inválido ou expirado" }); }

    const newHash = await bcrypt.hash(newPassword, 11);
    reset.usedAt = nowIso();
    await store.savePasswordReset(reset);
    await mutateGroup(group.id, g => {
      const u = (g.state.users || []).find(x => String(x.id) === String(user.id));
      if (!u) throw httpError(400, "Código inválido ou expirado");
      u.passwordHash = newHash;
      u.mustChangePassword = false;
      delete u.password;
    });
    await store.deleteSessionsForUser(group.id, user.id);
    res.json({ ok: true, message: "Senha alterada com sucesso. Entre novamente com a nova senha." });
  } catch (e) { next(e); }
});


app.post("/api/auth/change-password", auth, async (req, res, next) => {
  try {
    const key = `chpass|${req.auth.group.id}|${req.auth.user.id}`;
    if (rateBlocked(key, 6)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const current = String(req.body.currentPassword || "");
    const next_ = String(req.body.newPassword || "");
    const passwordIssue = passwordProblem(next_); if (passwordIssue) return res.status(400).json({ error: passwordIssue });
    const group = await store.getGroupById(req.auth.group.id);
    const user = (group.state.users || []).find(u => String(u.id) === String(req.auth.user.id));
    if (!user || !user.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) { rateHit(key, 6, 15 * 60_000); return res.status(400).json({ error: "A senha atual não confere" }); }
    // Saber uma senha vazada não pode bastar para trocá-la (vale também para sessões abertas antes deste bloqueio).
    if (WEAK_PASSWORDS.has(current)) return res.status(403).json({ error: "Por segurança, esta senha só pode ser trocada pelo \"Esqueci minha senha\", com o código enviado ao e-mail cadastrado.", resetRequired: true });
    if (current === next_) return res.status(400).json({ error: "A nova senha precisa ser diferente da atual" });
    const newHash = await bcrypt.hash(next_, 11);
    const { saved } = await mutateGroup(group.id, g => {
      const u = (g.state.users || []).find(x => String(x.id) === String(user.id));
      if (!u || u.passwordHash !== user.passwordHash) throw httpError(409, "Sua senha foi alterada em outro lugar. Entre novamente.");
      u.passwordHash = newHash;
      u.mustChangePassword = false;
      delete u.password;
    });
    // Desconecta os outros aparelhos dessa pessoa e mantém este.
    await store.deleteSessionsForUser(group.id, user.id);
    const token = crypto.randomBytes(36).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await store.createSession({ tokenHash: tokenHash(token), groupId: group.id, userId: user.id, expiresAt });
    res.json({ ok: true, token, expiresAt, ...statePayload(saved, user) });
  } catch (e) { next(e); }
});

// Envio de anexo (nota fiscal ou comprovante). O arquivo fica guardado à parte; os dados guardam só o fileId.
app.post("/api/files", auth, requireRole("ceo", "adm"), async (req, res, next) => {
  try {
    if (!rateHit(`upload|${req.auth.group.id}`, 120, 3600_000)) return res.status(429).json({ error: "Muitos envios em pouco tempo. Aguarde um pouco." });
    const decoded = decodeDataUrl(req.body.data);
    if (!decoded || !decoded.data.length) return res.status(400).json({ error: "Arquivo inválido" });
    if (decoded.data.length > MAX_FILE_BYTES) return res.status(413).json({ error: "O arquivo precisa ter no máximo 2 MB" });
    const detectedMime = detectAllowedMime(decoded.data);
    if (!detectedMime) return res.status(415).json({ error: "O conteúdo do arquivo não corresponde a um PDF ou imagem permitida" });
    const declaredMime = String(req.body.type || decoded.mime || "").toLowerCase();
    const sameType = !declaredMime || declaredMime === detectedMime || (detectedMime === "image/jpeg" && /image\/jpe?g/.test(declaredMime)) || (detectedMime === "image/heic" && /image\/(heic|heif)/.test(declaredMime));
    if (!sameType) return res.status(415).json({ error: "Tipo de arquivo divergente do conteúdo enviado" });
    const mime = detectedMime;
    const file = { id: uid(), groupId: req.auth.group.id, name: String(req.body.name || "anexo").replace(/[\/\r\n"]/g, "_").slice(0, 120), mime, size: decoded.data.length, data: decoded.data, createdBy: req.auth.user.id, createdAt: nowIso() };
    await store.createFile(file);
    res.json({ ok: true, fileId: file.id, name: file.name, type: file.mime, size: file.size });
  } catch (e) { next(e); }
});

app.get("/api/files/:id", auth, async (req, res, next) => {
  try {
    const id = String(req.params.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(404).json({ error: "Arquivo não encontrado" });
    const file = await store.getFile(id);
    const group = req.auth.group, user = req.auth.user;
    if (!file || String(file.groupId) !== String(group.id)) return res.status(404).json({ error: "Arquivo não encontrado" });
    const receipt = (group.state.receipts || []).find(r => String(r.fileId) === id);
    const note = (group.state.farms || []).flatMap(f => f.notes || []).find(n => String(n.fileId) === id);
    let allowed = user.role === "ceo";
    if (!allowed && receipt) allowed = String(receipt.userId || "") === String(user.id);
    if (!allowed && note) allowed = user.role === "adm";
    const extensionRef=(group.state.farms||[]).flatMap(f=>['documents','certifications'].flatMap(k=>(f.expansion?.[k]||[]).filter(r=>r.fileId===id).map(r=>({f,k,r}))));
    if(!allowed&&extensionRef.length) allowed=extensionRef.some(({f,k,r})=>Expansion.can(user,k==='documents'?'documentos':'certificacoes',AdmAccess.pagesFor(group.state))&&(user.role!=='contribuinte'||String(f.id)===String(user.allowedFarmId)));
    if (!allowed && !receipt && !note && !extensionRef.length) allowed = String(file.createdBy) === String(user.id);
    if (!allowed) return res.status(403).json({ error: "Sem permissão para este arquivo" });
    // Só foto e PDF abrem na tela. Qualquer outro tipo (anexos antigos) vira download, para nunca rodar como página do site.
    const safeMime = ALLOWED_FILE_MIMES.has(String(file.mime).toLowerCase()) ? file.mime : "application/octet-stream";
    res.setHeader("Content-Type", safeMime);
    res.setHeader("Content-Length", file.size);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
    res.setHeader("Content-Disposition", `${safeMime === file.mime ? "inline" : "attachment"}; filename="${encodeURIComponent(file.name)}"`);
    res.end(file.data);
  } catch (e) { next(e); }
});

// Plano, limites e uso do Grupo (tela "Minha assinatura").
function groupUsage(group) {
  const farms = group.state?.farms || [];
  const users = group.state?.users || [];
  const contributors = users.filter(u => u.active !== false && u.role === "contribuinte");
  return {
    farms: farms.length,
    users: users.filter(u => u.active !== false).length,
    contributors: contributors.length,
    perFarm: farms.map(f => ({ id: f.id, name: f.name, contributors: contributors.filter(u => String(u.allowedFarmId) === String(f.id)).length }))
  };
}
app.get("/api/account", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const group = req.auth.group;
    const rules = getPlanRules(group);
    const purchase = group.subscriptionId ? await store.getPurchaseBySubscription(group.subscriptionId) : null;
    const request = await store.getConfig(`planRequest:${group.id}`);
    res.json({
      group: groupInfo(group),
      plan: { ...rules, monthlyPrice: null, maxFarms: Number.isFinite(rules.maxFarms) ? rules.maxFarms : null },
      plans: Object.values(PLAN_CATALOG).map(p=>({...p,monthlyPrice:null})),
      usage: groupUsage(group),
      billing: purchase ? { cycle: purchase.billingCycle, cycleLabel: BILLING_CYCLES[purchase.billingCycle]?.label || "Mensal", amount: purchase.amount, email: maskEmail(purchase.email) } : null,
      planRequest: request
    });
  } catch (e) { next(e); }
});
app.post("/api/account/plan-request", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const plan = PLAN_CATALOG[req.body.plan] ? req.body.plan : null;
    if (!plan) return res.status(400).json({ error: "Escolha um plano" });
    if (plan === req.auth.group.plan) return res.status(400).json({ error: "Esse já é o seu plano atual" });
    const request = { plan, planName: PLAN_CATALOG[plan].name, note: String(req.body.note || "").slice(0, 300), at: nowIso(), by: req.auth.user.name || req.auth.user.username };
    await store.setConfig(`planRequest:${req.auth.group.id}`, request);
    res.json({ ok: true, planRequest: request });
  } catch (e) { next(e); }
});
app.delete("/api/account/plan-request", auth, requireRole("ceo"), async (req, res, next) => {
  try { await store.setConfig(`planRequest:${req.auth.group.id}`, null); res.json({ ok: true }); } catch (e) { next(e); }
});

app.post("/api/auth/logout", auth, async (req, res, next) => {
  try { await store.deleteSession(tokenHash(req.auth.token)); res.json({ ok: true }); } catch (e) { next(e); }
});
app.post("/api/auth/logout-others", auth, async (req, res, next) => {
  try {
    await store.deleteSessionsForUser(req.auth.group.id, req.auth.user.id);
    const token = crypto.randomBytes(36).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await store.createSession({ tokenHash: tokenHash(token), groupId: req.auth.group.id, userId: req.auth.user.id, expiresAt });
    res.json({ ok: true, token, expiresAt, message: "Outros aparelhos foram desconectados." });
  } catch (e) { next(e); }
});

// ---------- Aparelhos com modo de campo (cofre offline) ----------
// Cada cofre tem um identificador aleatório registrado ao habilitar. O CEO/ADM pode desconectar um aparelho (perdido,
// trocado): as sessões da pessoa são encerradas e, quando o aparelho pegar internet, o próprio app apaga o cofre.
const FIELD_DEVICE_ID = /^[a-f0-9]{32}$/;
const fieldDevicesKey = groupId => `fieldDevices:${groupId}`;
async function fieldDevices(groupId) { return (await store.getConfig(fieldDevicesKey(groupId))) || []; }
app.post("/api/field-devices", auth, async (req, res, next) => {
  try {
    const id = String(req.body.id || ""), label = String(req.body.label || "").slice(0, 120);
    if (!FIELD_DEVICE_ID.test(id)) return res.status(400).json({ error: "Identificação do aparelho inválida." });
    const list = await fieldDevices(req.auth.group.id), found = list.find(d => d.id === id);
    if (found && String(found.userId) !== String(req.auth.user.id)) return res.status(409).json({ error: "Este cofre pertence a outro usuário." });
    if (found?.revokedAt) return res.status(403).json({ error: "Este aparelho foi desconectado pelo responsável.", revoked: true });
    if (found) Object.assign(found, { label: label || found.label, lastSeenAt: nowIso() });
    else {
      const mine = list.filter(d => String(d.userId) === String(req.auth.user.id) && !d.revokedAt);
      if (mine.length >= 10) return res.status(400).json({ error: "Limite de 10 aparelhos com modo de campo por pessoa. Peça ao responsável para desconectar um antigo." });
      list.push({ id, userId: req.auth.user.id, userName: req.auth.user.name || req.auth.user.username, label, createdAt: nowIso(), lastSeenAt: nowIso() });
    }
    await store.setConfig(fieldDevicesKey(req.auth.group.id), list.slice(-500));
    res.json({ ok: true });
  } catch (e) { next(e); }
});
// Consulta do próprio aparelho (sem login, porque a sessão pode já ter sido encerrada): responde só se foi desconectado.
app.post("/api/field-devices/status", limitRequests("field-device-status", 60, 15 * 60_000), async (req, res, next) => {
  try {
    const id = String(req.body.id || ""), groupId = String(req.body.groupId || "");
    if (!FIELD_DEVICE_ID.test(id) || !/^[A-Za-z0-9_-]{1,80}$/.test(groupId)) return res.json({ revoked: false });
    const d = (await fieldDevices(groupId)).find(x => x.id === id);
    res.json({ revoked: Boolean(d?.revokedAt) });
  } catch (e) { next(e); }
});
app.get("/api/field-devices", auth, requireRole("ceo", "adm"), async (req, res, next) => {
  try { res.json({ devices: (await fieldDevices(req.auth.group.id)).slice().reverse() }); } catch (e) { next(e); }
});
app.post("/api/field-devices/:id/revoke", auth, requireRole("ceo", "adm"), async (req, res, next) => {
  try {
    const list = await fieldDevices(req.auth.group.id), d = list.find(x => x.id === String(req.params.id));
    if (!d) return res.status(404).json({ error: "Aparelho não encontrado." });
    if (!d.revokedAt) {
      Object.assign(d, { revokedAt: nowIso(), revokedBy: req.auth.user.name || req.auth.user.username });
      await store.setConfig(fieldDevicesKey(req.auth.group.id), list);
      // Sessões da pessoa encerradas: a sessão lembrada no aparelho perdido para de valer na hora.
      await store.deleteSessionsForUser(req.auth.group.id, d.userId);
      await mutateGroup(req.auth.group.id, g => { g.state.audit = [...(g.state.audit || []), { id: uid(), at: nowIso(), user: req.auth.user.name || req.auth.user.username, username: req.auth.user.username, action: "desconectou", area: "Aparelho do modo de campo", label: `${d.userName} · ${d.label || "aparelho"}`.slice(0, 200), farm: "" }].slice(-1500); });
    }
    res.json({ ok: true, devices: list.slice().reverse() });
  } catch (e) { next(e); }
});

app.post("/api/auth/register-request", limitRequests("register", 10, 3600_000, "Muitas solicitações deste aparelho. Tente mais tarde."), async (req, res, next) => {
  try {
    const groupInput = String(req.body.groupCode || req.body.groupSlug || req.body.group || "").trim();
    const groupCode = cleanGroupCode(groupInput);
    const group = groupCode.length >= 4 ? await store.getGroupByCode(groupCode) : await store.getGroupBySlug(slugify(groupInput));
    if (!group || group.status !== "active") return res.status(404).json({ error: "Código do Grupo não encontrado" });
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const email = normalizeEmail(req.body.email);
    const role = "contribuinte";
    let workerFunction = String(req.body.function || "").trim();
    const pixKey = String(req.body.pixKey || "").trim();
    if (!name) return res.status(400).json({ error: "Informe o nome" });
    // Rota pública: cada campo tem tamanho máximo, para ninguém inflar os dados do Grupo.
    if (name.length > MAX_NAME_LENGTH) return res.status(400).json({ error: `O nome pode ter no máximo ${MAX_NAME_LENGTH} caracteres` });
    if (pixKey.length > MAX_PIX_LENGTH) return res.status(400).json({ error: `A chave PIX pode ter no máximo ${MAX_PIX_LENGTH} caracteres` });
    if (!validateEmail(email)) return res.status(400).json({ error: "Informe um e-mail válido" });
    if (!validateUsername(username)) return res.status(400).json({ error: "Usuário inválido" });
    const passwordIssue = passwordProblem(password); if (passwordIssue) return res.status(400).json({ error: passwordIssue });
    if (role === "contribuinte" && !["Tratorista","Campo",HarvestLabor.FISCAL].includes(workerFunction)) return res.status(400).json({ error: "Selecione Tratorista, Campo ou Fiscal de colheita" });
    const taken = g => [...(g.state.users || []), ...(g.state.pendingRegistrations || [])].some(u => String(u.username || "").toLowerCase() === username.toLowerCase());
    if (taken(group)) return res.status(409).json({ error: "Esse usuário já existe ou está pendente" });
    const passwordHash = await bcrypt.hash(password, 11);
    const registration = {
      id: uid(), name, username, email, passwordHash, role, function: workerFunction,
      pixKey, allowedActivity: "both", createdAt: nowIso()
    };
    await mutateGroup(group.id, g => {
      if (g.status !== "active") throw httpError(404, "Código do Grupo não encontrado");
      if (taken(g)) throw httpError(409, "Esse usuário já existe ou está pendente");
      // Pedidos com mais de 30 dias saem sozinhos; acima de 50 pendentes, o CEO precisa analisar antes de chegarem novos.
      const monthAgo = Date.now() - 30 * 86400_000;
      g.state.pendingRegistrations = (g.state.pendingRegistrations || []).filter(r => !(Date.parse(r.createdAt) < monthAgo));
      if (g.state.pendingRegistrations.length >= MAX_PENDING_REGISTRATIONS) throw httpError(429, "Este Grupo já tem muitas solicitações aguardando. Peça ao responsável da fazenda para analisá-las.");
      g.state.pendingRegistrations.push(registration);
    });
    res.json({ ok: true, message: "Solicitação enviada para o CEO" });
  } catch (e) { next(e); }
});


// ---------- Dados que cada perfil recebe ----------
// O servidor só envia o que a pessoa pode ver. A tela esconder não basta: qualquer um consegue abrir o F12.
function publicUser(u) {
  return { id: u.id, name: u.name, username: u.username, role: u.role, function: u.function, active: u.active !== false, allowedFarmId: u.allowedFarmId || "", allowedActivity: u.allowedActivity || "both" };
}
function stateForUser(state,user,plan) { return Expansion.project(stateForUserBase(state,user,plan),state,user,AdmAccess.pagesFor(state)); }
function stateForUserBase(state, user, plan) {
  const full = GroupAccess.project(sanitizeState(state));
  full.coffeeQualities ||= RuralOps.defaultQualities();
  full.cattleStages ||= RuralOps.defaultStages();
  // Histórico de alterações: Profissional e Grupo (o registro continua sendo feito; só não é mostrado no Essencial).
  if (!PlanFeatures.has(plan, "audit")) full.audit = [];
  if (user.role === "ceo") {
    full.audit = (full.audit || []).slice(-400);
    return full;
  }
  const fullAudit = full.audit;
  delete full.audit;
  if (user.role === "adm") {
    full.users = (full.users || []).map(u => String(u.id) === String(user.id) ? { ...u } : publicUser(u));
    full.pendingRegistrations = [];
    full.receipts = [];
    // Páginas liberadas pelo CEO (Usuários > Permissões do ADM).
    // Dados do Livro Caixa (CPF e endereço do produtor) só com a página LCDPR liberada.
    if (!AdmAccess.can(state, "lcdpr")) delete full.lcdpr;
    if (!AdmAccess.can(state, "mao-de-obra")) for (const farm of full.farms || []) delete farm.labor;
    if (AdmAccess.can(state, "historico") && PlanFeatures.has(plan, "audit")) full.audit = (fullAudit || []).slice(-400);
    const mgmtKeys = AdmAccess.mgmtKeys(state);
    if (AdmAccess.financeVisible(state)) {
      const readKeys = [...mgmtKeys];
      if (["custos-unidade","comercializacao","orcamento-safra","qualidade-leite","rotacao-piquetes"].some(p=>AdmAccess.can(state,p))) readKeys.push("payables");
      for (const farm of full.farms || []) FarmManagement.forRole(farm, "adm", readKeys);
      return full;
    }
    // Sem página de dinheiro liberada, o ADM lança entradas e saídas, mas não vê o balanço nem o histórico financeiro.
    for (const farm of full.farms || []) {
      farm.finances = []; if(farm.operations)farm.operations.payments=[]; FarmManagement.forRole(farm, "adm", mgmtKeys);
      // Produção (Grãos/Café): o ADM registra safras e vendas, mas não vê preço de venda nem custo planejado,
      // pela mesma regra do balanço. Ao salvar, o servidor repõe esses valores (veja mergeAgricultureForAdm).
      if (farm.agriculture) {
        farm.agriculture.sales = (farm.agriculture.sales || []).map(({ pricePerKg, ...rest }) => rest);
        farm.agriculture.cycles = (farm.agriculture.cycles || []).map(({ plannedCost, ...rest }) => rest);
      }
    }
    return full;
  }
  delete full.lcdpr;
  const farmId = String(user.allowedFarmId || "");
  const activity = RuralDomain.PERMISSIONS.includes(user.allowedActivity) ? user.allowedActivity : "both";
  const activities = RuralDomain.activitiesFor(activity).filter(a => SubscriptionDomain.licensed(state).includes(a));
  full.users = (full.users || []).filter(u => String(u.id) === String(user.id));
  full.pendingRegistrations = [];
  delete full.coffeeQualities;
  full.receipts = (full.receipts || []).filter(r => String(r.userId || "") === String(user.id));
  const isMine = x => String(x.user || "") === String(user.username || "");
  full.farms = (full.farms || []).filter(f => String(f.id) === farmId).map(f => ({
    id: f.id, name: f.name, type: f.type, photo: f.photo || "",
    // Só os campos que a tela do campo usa: um custo cadastrado no futuro não vaza para o trabalhador.
    tractors: (f.tractors || []).map(t => ({ id: t.id, name: t.name, model: t.model || "", plate: t.plate || "", status: t.status })),
    implements: (f.implements || []).map(i => ({ id: i.id, name: i.name, category: i.category || "", status: i.status })),
    talhoes: f.talhoes || [],
    assignments: (f.assignments || []).filter(isMine), equipmentLogs: (f.equipmentLogs || []).filter(isMine),
    // Máquinas já reservadas por outras pessoas (sem nomes), para a tela não oferecer o mesmo trator duas vezes.
    occupancy: (f.assignments || []).filter(x => !isMine(x) && isRecentDay(x.date)).map(x => ({ date: x.date, tractorId: x.tractorId || "", implementId: x.implementId || "" })),
    banho: !activities.includes("coffee") ? { products: [], orders: [] } : (f.banho || { products: [], orders: [] }),
    cattle: !activities.includes("cattle") ? { paddocks: [], lots: [], weighings: [] } : { ...(f.cattle||{}), lots:(f.cattle?.lots||[]).map(l=>{const {quotePerArroba,carcassYieldPct,valuationBasis,quoteDate,quoteSource,...safe}=l;return safe;}) },
    agriculture: {
      cycles: (f.agriculture?.cycles || []).filter(c => activities.includes(c.activity)).map(c => { const { plannedCost, quotePerBag, ...safe } = c; return safe; }),
      harvests: (f.agriculture?.harvests || []).filter(h => (f.agriculture?.cycles || []).some(c => c.id === h.cycleId && activities.includes(c.activity))),
      sales: (f.agriculture?.sales || []).filter(s => (f.agriculture?.cycles || []).some(c => c.id === s.cycleId && activities.includes(c.activity))).map(s => ({ id: s.id, cycleId: s.cycleId, date: s.date, kg: s.kg }))
    },
    operations: {dryingGuidelines: activities.includes("coffee")?(f.operations?.dryingGuidelines||[]):[], dryingLogs: activities.includes("coffee")?(f.operations?.dryingLogs||[]):[]},
    stock: [], finances: [], notes: []
  }));
  if (user.function === HarvestLabor.FISCAL) {
    const source = (state.farms || []).find(f => String(f.id) === farmId);
    // Carência dos banhos vai pronta por talhão (o fiscal não recebe as ordens), para avisar também sem internet.
    const grace = source ? Carencia.forFiscalPlots(source) : {};
    full.farms = full.farms.map(f => ({ ...f, tractors: [], implements: [], assignments: [], equipmentLogs: [], occupancy: [], banho: { products: [], orders: [] }, cattle: { paddocks: [], lots: [], weighings: [] }, agriculture: { cycles: [], harvests: [], sales: [] }, operations: {}, talhoes: (f.talhoes || []).map(t => ({ id: t.id, name: t.name, ...(grace[t.id] ? { carencia: grace[t.id] } : {}) })), labor: HarvestLabor.forFiscal(source?.labor) }));
  }
  return full;
}
function groupInfo(group) {
  return { id: group.id, slug: group.slug, code: group.code, name: group.name, status: group.status, plan: group.plan, cloudInitialized: group.cloudInitialized, trial: trialActive(group.state) ? { endsAt: group.state.trial.endsAt, days: group.state.trial.days } : null };
}
function statePayload(group, user) {
  return { state: stateForUser(group.state, user, group.plan), group: groupInfo(group), userId: user.id, rev: Number(group.state?._rev || 0), serverTime: nowIso() };
}

// ---------- Anexos guardados fora do pacote de dados ----------
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_FILE_MIMES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]);
function decodeDataUrl(value) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(value || ""));
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  let buf;
  try { buf = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8"); } catch (_) { return null; }
  return { mime, data: buf };
}
function detectAllowedMime(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;
  if (buf.subarray(0,5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buf[0]===0xFF && buf[1]===0xD8 && buf[2]===0xFF) return "image/jpeg";
  if (buf.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))) return "image/png";
  const head12 = buf.subarray(0,12).toString("ascii");
  if (head12.startsWith("RIFF") && head12.slice(8,12)==="WEBP") return "image/webp";
  const head6 = buf.subarray(0,6).toString("ascii");
  if (head6==="GIF87a" || head6==="GIF89a") return "image/gif";
  if (buf.length >= 12 && buf.subarray(4,8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8,12).toString("ascii").toLowerCase();
    if (["heic","heix","hevc","hevx","mif1","msf1"].includes(brand)) return "image/heic";
  }
  return null;
}
// Arquivos antigos vinham dentro dos dados (fileData). Move cada um para o armazenamento de arquivos e deixa só o fileId.
// Passa pelas mesmas regras do envio normal: só foto ou PDF de verdade (pelo conteúdo, não pelo tipo informado).
// O limite de tamanho vale para o que chega agora; anexos antigos migrados ao iniciar são aceitos como estão.
async function extractInlineFiles(group, state, createdBy = "migração") {
  let moved = 0;
  const holders = [...(state.receipts || []), ...(state.farms || []).flatMap(f => f.notes || [])];
  for (const item of holders) {
    if (!item || !item.fileData) continue;
    if (String(item.fileData).startsWith("data:")) {
      const decoded = decodeDataUrl(item.fileData);
      const mime = decoded ? detectAllowedMime(decoded.data) : null;
      const sizeOk = decoded && (createdBy === "migração" || decoded.data.length <= MAX_FILE_BYTES);
      if (mime && sizeOk) {
        const id = uid();
        await store.createFile({ id, groupId: group.id, name: String(item.fileName || "anexo").replace(/[\/\r\n"]/g, "_").slice(0, 120), mime, size: decoded.data.length, data: decoded.data, createdBy, createdAt: nowIso() });
        item.fileId = id; item.fileType = mime; moved++;
      }
    }
    delete item.fileData;
  }
  return moved;
}
function referencedFileIds(state) {
  const ids = new Set();
  for (const r of state.receipts || []) if (r.fileId) ids.add(String(r.fileId));
  for (const f of state.farms || []) for (const n of f.notes || []) if (n.fileId) ids.add(String(n.fileId));
  for(const f of state.farms||[]) for(const k of ["documents","certifications"]) for(const r of f.expansion?.[k]||[]) if(r.fileId) ids.add(String(r.fileId));
  return ids;
}
async function cleanupOrphanFiles(group) {
  try {
    const used = referencedFileIds(group.state);
    const dayAgo = Date.now() - 24 * 3600_000;
    const orphans = (await store.listFiles(group.id)).filter(f => !used.has(String(f.id)) && new Date(f.createdAt).getTime() < dayAgo).map(f => f.id);
    if (orphans.length) await store.deleteFiles(orphans);
  } catch (e) { console.error("Limpeza de anexos:", e.message); }
}

// ---------- Histórico de alterações (quem mudou o quê) ----------
const AUDIT_AREAS = [
  ["tractors", "Trator"], ["implements", "Implemento"], ["stock", "Estoque"], ["finances", "Lançamento"], ["notes", "Nota fiscal"],
  ["talhoes", "Talhão"], ["soilAnalyses", "Análise laboratorial"], ["plotProcedures", "Procedimento do talhão"], ["banho.products", "Produto de banho"], ["banho.orders", "Ordem de banho"],
  ["cattle.paddocks", "Piquete"], ["cattle.lots", "Lote"], ["cattle.weighings", "Pesagem"], ["cattle.healthEvents", "Manejo"],
  ["operations.tasks", "Tarefa"], ["operations.expenses", "Custo operacional"], ["operations.stockUses", "Consumo de estoque"], ["operations.payments", "Recebimento"], ["operations.cattleMoves", "Movimentação do gado"], ["operations.deliveries", "Conferência de entrega"], ["agriculture.cycles", "Safra"], ["agriculture.harvests", "Colheita"], ["agriculture.sales", "Venda de produção"], ["management.payables", "Conta a pagar"], ["management.purchaseOrders", "Pedido de compra"], ["management.quotes", "Cotação de insumo"], ["management.salesContracts", "Contrato de venda"], ["management.bankEntries", "Extrato bancário"], ["management.fiscalDocs", "Documento fiscal"], ["management.maintenance", "Manutenção"], ["management.fuel", "Abastecimento"], ["management.traceLots", "Lote rastreado"], ["management.mapAreas", "Área do mapa"], ["labor.workers", "Pessoa da colheita"], ["labor.plotRates", "Valor do saco no talhão"], ["labor.adjustments", "Adiantamento ou desconto"], ["labor.closings", "Fechamento da colheita"],
  ["assignments", "Trabalho do dia"], ["equipmentLogs", "Log de equipamento"]
];
for(const key of Expansion.KEYS) AUDIT_AREAS.push(['expansion.'+key,Expansion.META[key].name]);
const pick = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
function auditLabel(item) {
  const base = item.name || item.item || item.title || item.description || (item.number ? `Nº ${item.number}` : "") || item.category || "";
  const value = item.value != null && item.value !== "" ? ` (R$ ${Number(item.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : "";
  return String(base).slice(0, 80) + value;
}
function diffList(before = [], after = [], area, farmName, out) {
  const b = new Map(before.map(x => [String(x.id), x]));
  const a = new Map(after.map(x => [String(x.id), x]));
  for (const [id, x] of a) {
    if (!b.has(id)) out.push({ action: "adicionou", area, label: auditLabel(x), farm: farmName });
    else if (JSON.stringify(b.get(id)) !== JSON.stringify(x)) out.push({ action: "alterou", area, label: auditLabel(x), farm: farmName });
  }
  for (const [id, x] of b) if (!a.has(id)) out.push({ action: "excluiu", area, label: auditLabel(x), farm: farmName });
}
function auditChanges(before, after, user) {
  const out = [];
  const bf = new Map((before.farms || []).map(f => [String(f.id), f]));
  const af = new Map((after.farms || []).map(f => [String(f.id), f]));
  for (const [id, f] of af) {
    const old = bf.get(id);
    if (!old) { out.push({ action: "criou", area: "Fazenda", label: f.name, farm: f.name }); continue; }
    if (old.name !== f.name) out.push({ action: "renomeou", area: "Fazenda", label: `${old.name} → ${f.name}`, farm: f.name });
    for (const [path, area] of AUDIT_AREAS) diffList(pick(old, path) || [], pick(f, path) || [], area, f.name, out);
  }
  for (const [id, f] of bf) if (!af.has(id)) out.push({ action: "excluiu", area: "Fazenda", label: f.name, farm: f.name });
  diffList(before.receipts || [], after.receipts || [], "Comprovante", "", out);
  const bu = new Map((before.users || []).map(u => [String(u.id), u]));
  for (const u of after.users || []) {
    const old = bu.get(String(u.id));
    if (!old) out.push({ action: "adicionou", area: "Usuário", label: u.name || u.username, farm: "" });
    else if (old.active !== u.active || old.role !== u.role || old.allowedFarmId !== u.allowedFarmId || old.function !== u.function || old.allowedActivity !== u.allowedActivity || u.password)
      out.push({ action: "alterou", area: "Usuário", label: u.name || u.username, farm: "" });
  }
  const au = new Set((after.users || []).map(u => String(u.id)));
  for (const u of before.users || []) if (!au.has(String(u.id))) out.push({ action: "excluiu", area: "Usuário", label: u.name || u.username, farm: "" });
  const at = nowIso();
  return out.slice(0, 60).map(e => ({ id: uid(), at, user: user.name || user.username, username: user.username, ...e }));
}

// ---------- Estoque ligado ao banho ----------
const normName = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function unitFamily(u) {
  const x = normName(u).replace(/\./g, "");
  if (["l", "lt", "lts", "litro", "litros"].includes(x)) return "L";
  if (["kg", "kgs", "quilo", "quilos", "kilo", "kilos"].includes(x)) return "kg";
  return x;
}
// Quando uma ordem de banho é concluída, os produtos usados saem do estoque (se houver item com o mesmo nome e unidade).
function applyBathStockDeduction(before, after, who) {
  const oldOrders = new Map();
  for (const f of before.farms || []) for (const o of f.banho?.orders || []) oldOrders.set(String(o.id), o.status);
  for (const farm of after.farms || []) {
    for (const order of farm.banho?.orders || []) {
      if (order.status !== "completed" || order.stockDeducted) continue;
      const prev = oldOrders.get(String(order.id));
      if (prev === "completed" || prev === undefined && order.completedAt && Date.parse(order.completedAt) < Date.now() - 3600_000) continue;
      const used = [];
      for (const p of order.products || []) {
        const item = (farm.stock || []).find(s => (s.activity || "coffee") === "coffee" && normName(s.item) === normName(p.name) && unitFamily(s.unit) === unitFamily(p.unit));
        if (!item) continue;
        // Com a quantidade real por talhão informada, baixa o que foi usado; sem ela, a quantidade planejada da ordem.
        const real = Array.isArray(order.usage) ? order.usage.filter(u => String(u.productId) === String(p.productId)) : [];
        const qty = real.length ? Math.round(real.reduce((n, u) => n + Number(u.quantity || 0), 0) * 1000) / 1000 : Number(p.quantity || 0);
        if (!(qty > 0)) continue;
        item.quantity = Math.round((Number(item.quantity || 0) - qty) * 1000) / 1000;
        item.moves ||= [];
        item.moves.push({ id: uid(), at: nowIso(), delta: -qty, reason: `Banho: ${order.title || "ordem"}`, by: order.completedByName || who.name || who.username });
        item.moves = item.moves.slice(-60);
        used.push(`${p.name} ${qty} ${p.unit}`);
      }
      order.stockDeducted = true;
      if (used.length) order.stockDeductedItems = used;
    }
  }
}

app.get("/api/state", auth, async (req, res) => {
  const rev = Number(req.auth.group.state?._rev || 0);
  // A tela consulta a cada poucos segundos: se nada mudou, responde só "sem mudanças".
  if (req.query.rev != null && Number(req.query.rev) === rev) return res.json({ unchanged: true, rev });
  res.json(statePayload(req.auth.group, req.auth.user));
});


function getPlanRules(group) {
  return PLAN_CATALOG[group?.plan] || PLAN_CATALOG.pro;
}

function validateStatePlanLimits(group, state) {
  const rules = getPlanRules(group);
  const farms = Array.isArray(state?.farms) ? state.farms : [];
  if (Number.isFinite(rules.maxFarms) && farms.length > rules.maxFarms) {
    throw Object.assign(new Error(`Seu plano ${rules.name} permite até ${rules.maxFarms} fazenda${rules.maxFarms === 1 ? "" : "s"}.`), { statusCode: 422 });
  }
  const activeContributors = (state?.users || []).filter(u => u.active !== false && u.role === "contribuinte");
  for (const farm of farms) {
    const count = activeContributors.filter(u => String(u.allowedFarmId || "") === String(farm.id)).length;
    if (count > rules.usersPerFarm) {
      throw Object.assign(new Error(`O plano permite até ${rules.usersPerFarm} usuários operacionais por fazenda. ${farm.name || "Uma fazenda"} está com ${count}.`), { statusCode: 422 });
    }
  }
}

function validateSubscriptionWrites(before, after) {
  const licensed = SubscriptionDomain.licensed(before);
  // 422 = alteração recusada: a tela volta ao que está gravado (403 fica para "sem permissão").
  if(!licensed.includes('coffee')&&JSON.stringify(before.coffeeQualities||RuralOps.defaultQualities())!==JSON.stringify(after.coffeeQualities||RuralOps.defaultQualities()))throw Object.assign(new Error('Qualidades exigem o módulo Café.'),{statusCode:422});
  if(!licensed.includes('cattle')&&JSON.stringify(before.cattleStages||RuralOps.defaultStages())!==JSON.stringify(after.cattleStages||RuralOps.defaultStages()))throw Object.assign(new Error('Etapas exigem o módulo Gado.'),{statusCode:422});
  const denied = message => { throw Object.assign(new Error(message), { statusCode: 422 }); };
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  for (const nextFarm of after.farms || []) {
    const prior = clone((before.farms || []).find(f => f.id === nextFarm.id) || {});
    const next = clone(nextFarm); RuralDomain.farmData(prior); RuralDomain.farmData(next);
    if (!licensed.includes('cattle') && !same(prior.cattle,next.cattle)) denied('Gado não faz parte da assinatura contratada.');
    if (!licensed.includes('coffee') && !same(prior.banho || {products:[],orders:[]},next.banho || {products:[],orders:[]})) denied('Café não faz parte da assinatura contratada.');
    for(const key of ['expenses','tasks','stockUses','payments','cattleMoves','deliveries','dryingLogs','dryingGuidelines']) {
      const hidden=f=>(f.operations?.[key]||[]).filter(r=>!licensed.includes(r.activity));
      if(!same(hidden(prior),hidden(next)))denied('Essa operação usa uma atividade não contratada.');
    }
    if(!licensed.includes('coffee')&&!same(before.coffeeQualities||RuralOps.defaultQualities(),after.coffeeQualities||RuralOps.defaultQualities()))denied('Qualidades exigem o módulo Café.');
    for (const key of ['stock','finances','notes','plotProcedures','soilAnalyses']) {
      const hidden = farm => (farm[key] || []).filter(row => !licensed.includes(row.activity || 'coffee'));
      if (!same(hidden(prior),hidden(next))) denied('Esse lançamento usa uma atividade que não faz parte da assinatura.');
    }
    for (const key of ['assignments','equipmentLogs']) {
      const hidden = farm => (farm[key] || []).filter(row => !licensed.includes(row.activityModule || 'coffee'));
      if (!same(hidden(prior),hidden(next))) denied('Esse trabalho usa uma atividade que não faz parte da assinatura.');
    }
    const hiddenProduction = farm => {
      const cycles = farm.agriculture.cycles.filter(c => !licensed.includes(c.activity));
      const ids = new Set(cycles.map(c => c.id));
      return {cycles,harvests:farm.agriculture.harvests.filter(h => ids.has(h.cycleId)),sales:farm.agriculture.sales.filter(s => ids.has(s.cycleId))};
    };
    if (!same(hiddenProduction(prior),hiddenProduction(next))) denied('A safra usa uma atividade não contratada.');
  }
  for (const u of after.users || []) if (u.role === 'contribuinte' && u.active !== false && !RuralDomain.activitiesFor(u.allowedActivity).some(a => licensed.includes(a))) denied('O usuário precisa ter acesso a uma atividade contratada.');
}

// Produção gravada pelo ADM, que não recebe preço de venda nem custo planejado:
// - vendas já gravadas ficam exatamente como estão (o ADM não reescreve nem apaga receita); vendas novas entram;
// - safras já gravadas mantêm o custo planejado do servidor; o resto (etapa, datas, área...) o ADM pode atualizar.
function mergeAgricultureForAdm(current, proposed, user) {
  const cur = current || {}, prop = proposed || {};
  const savedSales = new Map((cur.sales || []).map(s => [String(s.id), s]));
  const newSales = (Array.isArray(prop.sales) ? prop.sales : []).filter(s => s && !savedSales.has(String(s.id)));
  for (const s of newSales) {
    if (!(typeof s.pricePerKg === "number" && Number.isFinite(s.pricePerKg) && s.pricePerKg > 0)) throw httpError(422, "Informe o preço da venda.");
    s.createdBy = user.name || user.username;
  }
  const savedCycles = new Map((cur.cycles || []).map(c => [String(c.id), c]));
  const cycles = (Array.isArray(prop.cycles) ? prop.cycles : []).map(c => {
    const saved = c && savedCycles.get(String(c.id));
    // Safra nova sem custo (por exemplo, copiada de uma que o ADM recebeu sem o valor): entra com custo 0.
    if (!saved) return c && c.plannedCost === undefined ? { ...c, plannedCost: 0 } : c;
    const out = { ...c };
    if (saved.plannedCost === undefined) delete out.plannedCost; else out.plannedCost = saved.plannedCost;
    return out;
  });
  return { ...prop, cycles, sales: [...(cur.sales || []), ...newSales] };
}

function mergeStateByRole(existing, incoming, user) {
  const current = clone(existing);
  const next = ["ceo","adm"].includes(user.role) ? GroupAccess.restore(current,incoming) : clone(incoming);
  if (current.subscriptionActivities !== undefined) next.subscriptionActivities = clone(current.subscriptionActivities);
  else delete next.subscriptionActivities;
  if (user.role === "ceo") {
    // E-mail é dado de recuperação de senha e só muda pela rota protegida /api/account/email.
    const emailById = new Map((current.users || []).map(u => [String(u.id), u.email]));
    for (const u of next.users || []) if (emailById.has(String(u.id))) u.email = emailById.get(String(u.id));
    // Permissões do ADM: só páginas conhecidas; data e autor da mudança vêm do servidor.
    if (next.admAccess !== undefined) {
      const pages = AdmAccess.normalize(next.admAccess?.pages), approvalLimit = AdmAccess.approvalLimit(next);
      if (current.admAccess && JSON.stringify(current.admAccess.pages) === JSON.stringify(pages) && AdmAccess.approvalLimit(current) === approvalLimit) next.admAccess = current.admAccess;
      else next.admAccess = { pages, approvalLimit, updatedAt: nowIso(), updatedBy: user.name || user.username };
    } else if (current.admAccess) next.admAccess = current.admAccess;
    next.audit = current.audit; next._rev = current._rev; return next;
  }

  if (user.role === "adm") {
    // O ADM não gerencia usuários, mas pode atualizar os próprios dados no Perfil.
    const mineIn = (next.users || []).find(u => String(u.id) === String(user.id));
    next.users = clone(current.users || []);
    const mineStored = next.users.find(u => String(u.id) === String(user.id));
    if (mineIn && mineStored) {
      mineStored.name = String(mineIn.name || mineStored.name).slice(0, 120);
      mineStored.pixKey = String(mineIn.pixKey || "").slice(0, 140);
      mineStored.function = String(mineIn.function || mineStored.function || "Administração").slice(0, 60);
    }
    next.pendingRegistrations = current.pendingRegistrations;
    next.receipts = current.receipts;
    next.admAccess = current.admAccess;
    if (next.admAccess === undefined) delete next.admAccess;
    // Configuração do LCDPR (produtor, imóveis, contas) é do CEO.
    if (current.lcdpr === undefined) delete next.lcdpr; else next.lcdpr = current.lcdpr;
    const seesMoney = AdmAccess.financeVisible(current), canPostMoney = seesMoney || AdmAccess.can(current, "lancamentos");
    const lock = AdmAccess.lockedParts(current);
    const incomingFarms = new Map((next.farms || []).map(f => [String(f.id), f]));
    next.farms = (current.farms || []).map(oldFarm => {
      const proposed = incomingFarms.get(String(oldFarm.id));
      if (!proposed) return oldFarm;
      // Páginas tiradas pelo CEO: o que elas gravam fica exatamente como estava no servidor.
      for (const key of lock.farm) { if (oldFarm[key] === undefined) delete proposed[key]; else proposed[key] = clone(oldFarm[key]); }
      if (lock.ops.size) { proposed.operations ||= {}; for (const key of lock.ops) { if (oldFarm.operations?.[key] === undefined) delete proposed.operations[key]; else proposed.operations[key] = clone(oldFarm.operations[key]); } }
      if (lock.field.size) { proposed.field ||= {}; for (const key of lock.field) { if (oldFarm.field?.[key] === undefined) delete proposed.field[key]; else proposed.field[key] = clone(oldFarm.field[key]); } }
      if (lock.mgmt.size) { proposed.management ||= {}; for (const key of lock.mgmt) { if (oldFarm.management?.[key] === undefined) delete proposed.management[key]; else proposed.management[key] = clone(oldFarm.management[key]); } }
      // Com página de dinheiro liberada, o ADM vê e edita os valores como o CEO (exceto usuários, fazendas e assinatura).
      if (seesMoney) {
        const merged = { ...proposed, id: oldFarm.id, name: oldFarm.name, photo: oldFarm.photo, type: oldFarm.type };
        if (!proposed.agriculture && oldFarm.agriculture) merged.agriculture = oldFarm.agriculture;
        return merged;
      }
      if (!seesMoney && oldFarm.operations?.payments) { proposed.operations ||= {}; proposed.operations.payments = clone(oldFarm.operations.payments); }
      const oldFinanceIds = new Set((oldFarm.finances || []).map(x => String(x.id)));
      const newFinances = canPostMoney ? (proposed.finances || []).filter(x => x && !oldFinanceIds.has(String(x.id))).map(x => ({ ...x, createdBy: user.name || user.username })) : [];
      const keptNotes = new Set((proposed.notes || []).map(n => String(n.id)));
      const removedNoteIds = new Set((oldFarm.notes || []).filter(n => !keptNotes.has(String(n.id))).map(n => String(n.id)));
      const finances = [...(oldFarm.finances || []), ...newFinances].filter(x => !(x.noteId && removedNoteIds.has(String(x.noteId))));
      const merged = { ...proposed, id: oldFarm.id, name: oldFarm.name, photo: oldFarm.photo, type: oldFarm.type, finances };
      // Tela antiga (sem o módulo de produção) não apaga as safras: sem "agriculture" na gravação, fica o que está no servidor.
      if (proposed.agriculture) merged.agriculture = mergeAgricultureForAdm(oldFarm.agriculture, proposed.agriculture, user);
      else if (oldFarm.agriculture) merged.agriculture = oldFarm.agriculture;
      return merged;
    });
    next.audit = current.audit;
    return next;
  }

  // Contribuinte: servidor aceita apenas suas ações operacionais e seus dados básicos de perfil.
  const result = current;
  const incomingUser = (next.users || []).find(u => String(u.id) === String(user.id));
  const storedUser = (result.users || []).find(u => String(u.id) === String(user.id));
  if (incomingUser && storedUser) {
    storedUser.name = String(incomingUser.name || storedUser.name).trim().slice(0, MAX_NAME_LENGTH) || storedUser.name;
    storedUser.pixKey = String(incomingUser.pixKey || "").trim().slice(0, MAX_PIX_LENGTH);
  }

  const farmId = user.allowedFarmId;
  const oldFarm = (result.farms || []).find(f => String(f.id) === String(farmId));
  const proposedFarm = (next.farms || []).find(f => String(f.id) === String(farmId));
  if (!oldFarm || !proposedFarm) return result;

  const keepOthers = (items, field = "user") => (items || []).filter(x => String(x[field] || "") !== String(user.username));
  const mine = (items, field = "user") => (items || []).filter(x => String(x[field] || "") === String(user.username));
  // Atividades que este trabalhador pode registrar (permissão dele dentro do que o Grupo contratou).
  const permitted = RuralDomain.activitiesFor(user.allowedActivity).filter(a => SubscriptionDomain.licensed(existing).includes(a));
  const moduleOf = x => x.activityModule || "coffee";

  // O trabalhador pode enviar trabalhos antigos guardados offline; só desfaz os de hoje/ontem.
  // e só das atividades liberadas para ele. Tudo o que vem dele é refeito a partir do cadastro da fazenda;
  // máquina ocupada por outra pessoa ou fora de "Disponível" é recusada.
  const oldAssignmentIds = new Set((oldFarm.assignments || []).map(a => String(a.id)));
  const proposedMine = mine(proposedFarm.assignments);
  const proposedMineIds = new Set(proposedMine.map(a => String(a.id)));
  const keptMine = mine(oldFarm.assignments).filter(a => proposedMineIds.has(String(a.id)) || !isRecentDay(a.date) || !permitted.includes(moduleOf(a)));
  const others = keepOthers(oldFarm.assignments);
  const added = [];
  for (const a of proposedMine.filter(a => !oldAssignmentIds.has(String(a.id)))) {
    const date = String(a.date || "");
    const activityModule = moduleOf(a);
    if (!permitted.includes(activityModule)) throw httpError(422, "Essa atividade não está liberada para você.");
    if (!RuralDomain.validDate(date) || date > nowIso().slice(0,10)) throw httpError(422, "A data do trabalho não confere. Informe uma data válida, sem ser futura.");
    if ([...keptMine, ...added].some(x => x.date === date && moduleOf(x) === activityModule)) throw httpError(422, "Você já confirmou o trabalho desse dia.");
    const tractor = a.tractorId ? (oldFarm.tractors || []).find(t => String(t.id) === String(a.tractorId)) : null;
    const implemento = a.implementId ? (oldFarm.implements || []).find(i => String(i.id) === String(a.implementId)) : null;
    if (a.tractorId && (!tractor || tractor.status !== "Disponível")) throw httpError(422, "Esse trator não está disponível. Atualize a tela e escolha outro.");
    if (a.implementId && (!implemento || implemento.status !== "Disponível")) throw httpError(422, "Esse implemento não está disponível. Atualize a tela e escolha outro.");
    const busy = [...others, ...keptMine, ...added].filter(x => x.date === date);
    if (tractor && busy.some(x => String(x.tractorId) === String(tractor.id))) throw httpError(422, `O trator ${tractor.name} já foi reservado hoje por outra pessoa. Escolha outro.`);
    if (implemento && busy.some(x => String(x.implementId) === String(implemento.id))) throw httpError(422, `O implemento ${implemento.name} já foi reservado hoje por outra pessoa. Escolha outro.`);
    const talhoes = (oldFarm.talhoes || []).filter(t => (a.talhaoIds || []).map(String).includes(String(t.id)));
    added.push({
      id: String(a.id).slice(0, 80), date, user: user.username, userName: user.name, userFunction: user.function || "Campo", activityModule,
      activity: String(a.activity || "").trim().slice(0, 200), talhaoIds: talhoes.map(t => t.id), talhaoNames: talhoes.map(t => t.name),
      tractorId: tractor?.id || "", tractorName: tractor?.name || "", implementId: implemento?.id || "", implementName: implemento?.name || ""
    });
  }
  oldFarm.assignments = [...others, ...keptMine, ...added];

  // Log de equipamento é só de acréscimo: nada do que já foi registrado sai ou muda, e cada linha nova
  // precisa ser de uma atribuição criada nesta gravação. A hora oficial é a do servidor; a do celular fica em reportedAt.
  // (O histórico do talhão usa estes logs, então ele também fica à prova de alteração.)
  const addedById = new Map(added.map(a => [String(a.id), a]));
  const oldLogIds = new Set((oldFarm.equipmentLogs || []).map(l => String(l.id)));
  const newLogs = mine(proposedFarm.equipmentLogs)
    .filter(l => !oldLogIds.has(String(l.id)) && addedById.has(String(l.assignmentId)))
    .map(l => ({ ...addedById.get(String(l.assignmentId)), id: String(l.id).slice(0, 80), assignmentId: String(l.assignmentId), loggedAt: nowIso(), reportedAt: validIsoOrNull(l.loggedAt), notes: String(l.notes || "").slice(0, 500) }));
  oldFarm.equipmentLogs = [...(oldFarm.equipmentLogs || []), ...newLogs];

  const proposedOrders = new Map((proposedFarm.banho?.orders || []).map(o => [String(o.id), o]));
  oldFarm.banho ||= { products: [], orders: [] };
  oldFarm.banho.orders = (oldFarm.banho.orders || []).map(order => {
    const proposed = proposedOrders.get(String(order.id));
    if (!proposed) return order;
    const validCompletion = RuralDomain.activitiesFor(user.allowedActivity).includes("coffee") && order.status === "released" && proposed.status === "completed" && String(proposed.completedBy || "") === String(user.username);
    if (!validCompletion) return order;
    return {
      ...order,
      status: "completed",
      // Hora oficial é a do servidor; a informada pelo celular (por exemplo, feita sem sinal) fica guardada à parte.
      completedAt: nowIso(),
      reportedAt: validIsoOrNull(proposed.completedAt),
      completedBy: user.username,
      completedByName: user.name,
      ...(bathUsage(order, proposed.usage) ? { usage: bathUsage(order, proposed.usage) } : {})
    };
  });
  return result;
}
// Quantidade real usada por talhão, informada ao concluir o banho (opcional). Só talhões e produtos da própria ordem.
function bathUsage(order, usage) {
  if (!Array.isArray(usage) || !usage.length) return null;
  const plots = new Set((order.talhaoIds || []).map(String)), products = new Set((order.products || []).map(p => String(p.productId)));
  const out = usage.filter(u => u && plots.has(String(u.plotId)) && products.has(String(u.productId)) && Number.isFinite(Number(u.quantity)) && Number(u.quantity) >= 0 && Number(u.quantity) <= 1e6)
    .map(u => ({ plotId: String(u.plotId), productId: String(u.productId), quantity: Math.round(Number(u.quantity) * 1000) / 1000 }));
  return out.length ? out.slice(0, 2000) : null;
}

// Data "AAAA-MM-DD" a no máximo um dia e meio de agora (cobre fuso horário e um registro feito sem sinal ontem).
function isRecentDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return false;
  return Math.abs(Date.parse(`${date}T12:00:00Z`) - Date.now()) <= 36 * 3600_000;
}
function validIsoOrNull(value) {
  const t = Date.parse(String(value || ""));
  return Number.isFinite(t) && t <= Date.now() + 5 * 60_000 ? new Date(t).toISOString() : null;
}

app.put("/api/state", auth, async (req, res, next) => {
  try {
    const incoming = req.body.state;
    if (!incoming || typeof incoming !== "object") return res.status(400).json({ error: "Estado inválido" });
    const group = req.auth.group, user = req.auth.user;
    const currentRev = Number(group.state?._rev || 0);
    const baseRev = req.body.baseRev;
    // CEO e ADM enviam a versão em que estavam trabalhando. Se alguém salvou depois, a tela junta as duas mudanças e tenta de novo.
    // Sem a versão de base não dá para saber se a gravação passaria por cima de outra (app antigo, script ou integração).
    if (baseRev == null || !Number.isFinite(Number(baseRev))) return res.status(400).json({ error: "Envie a versão dos dados (baseRev) junto com a gravação. Atualize a página e tente de novo." });
    if (Number(baseRev) !== currentRev) {
      return res.status(409).json({ error: "Os dados mudaram enquanto você editava", conflict: true, ...statePayload(group, user) });
    }
    // A separação entre grupos acontece no servidor: um token só consegue gravar seu próprio tenant.
    // As permissões também são reaplicadas no backend; a interface não é a única barreira de acesso.
    const before = clone(group.state);
    const allowedState = mergeStateByRole(group.state, incoming, user);
    if (user.role === "contribuinte" && user.function === HarvestLabor.FISCAL) {
      const sent = (incoming.farms || []).find(f => String(f.id) === String(user.allowedFarmId)), mine = (allowedState.farms || []).find(f => String(f.id) === String(user.allowedFarmId));
      if (sent && mine) mine.labor = { ...(mine.labor || {}), entries: Array.isArray(sent.labor?.entries) ? sent.labor.entries : [], workers: Array.isArray(sent.labor?.workers) ? sent.labor.workers : (mine.labor?.workers || []) };
    }
    // Funções que o plano não inclui (cotações, conciliação, contratos, pedidos de compra) ficam como estavam.
    PlanFeatures.restoreLocked(before, allowedState, group.plan);
    // Prazo do teste grátis é do servidor.
    if (before.trial) allowedState.trial = clone(before.trial); else delete allowedState.trial;
    Expansion.prepare(before, allowedState, incoming, user, AdmAccess.pagesFor(before));
    SoilAnalysis.prepare(before, allowedState, user);
    PlotHistory.sealAndValidate(before, allowedState, user);
    // ADM com páginas de dinheiro liberadas pelo CEO grava nelas também (recebimentos, contas a pagar, extrato, contratos).
    const ruleUser = user.role === "adm" ? { ...user, canReceive: AdmAccess.can(before, "recebimentos"), managementKeys: AdmAccess.mgmtKeys(before), approvalLimit: AdmAccess.can(before, "pedidos-compra") ? AdmAccess.approvalLimit(before) : 0 } : user;
    // Parto com nascidos vivos vira entrada no lote antes das movimentações do gado serem aplicadas.
    FieldOps.applyBirths(before, allowedState);
    RuralOps.prepare(before, allowedState, ruleUser);
    // Gestão: só o CEO mexe no dinheiro da fazenda (ou o ADM nas páginas liberadas); pedidos de compra só o CEO aprova.
    FarmManagement.prepare(before, allowedState, ruleUser);
    // Pós-colheita, pragas, reprodução, sanidade, GTA e leite: valida, grava autor e data, não deixa apagar GTA e vacinas.
    FieldOps.prepare(before, allowedState, user);
    // Manutenção, combustível, rastreabilidade e mapa: preserva histórico, autoria e regras de cada área.
    RuralManagement.prepare(before, allowedState, user);
    // Mão de obra da colheita: valor congelado nos apontamentos, semana fechada travada e contas a pagar geradas no fechamento.
    const laborRole = user.role === "ceo" || (user.role === "adm" && AdmAccess.can(before, "mao-de-obra")) ? "manager" : user.role === "contribuinte" && user.function === HarvestLabor.FISCAL ? "fiscal" : null;
    HarvestLabor.prepare(before, allowedState, { ...user, labor: laborRole });
    // Carência de defensivo: alerta nas colheitas novas e decisão do CEO/ADM (vai para o histórico).
    Expansion.applyAnnualWork(before,allowedState);
    Expansion.applyFieldLogs(before,allowedState,user);
    for(const f of allowedState.farms||[]) FieldOps.validateFarm(f);
    const graceAudit = Carencia.stamp(before, allowedState, user);
    // Carência de medicamento: ordenha na carência vira descarte; venda ou GTA para abate de lote em carência ganha alerta.
    Medicamentos.stamp(before, allowedState);
    for (const f of allowedState.farms || []) FarmManagement.validateFarm(f);
    SeasonHistory.recordChanges(before, allowedState, user);
    validateSubscriptionWrites(before, allowedState);
    RuralDomain.validateState(allowedState);
    await extractInlineFiles(group, allowedState, user.username);
    applyBathStockDeduction(before, allowedState, user);
    validateStatePlanLimits(group, allowedState);
    const changes = [...auditChanges(before, allowedState, user), ...graceAudit.map(e => ({ id: uid(), at: nowIso(), user: user.name || user.username, username: user.username, ...e }))];
    allowedState.audit = [...(before.audit || []), ...changes].slice(-1500);
    // Senha de outra pessoa definida pelo CEO por aqui vale como temporária, igual à rota /api/users/:id/password.
    const existingIds = new Set((before.users || []).map(u => String(u.id)));
    const passwordResetIds = user.role === "ceo" ? (allowedState.users || []).filter(u => u.password && existingIds.has(String(u.id)) && String(u.id) !== String(user.id)).map(u => String(u.id)) : [];
    for (const u of allowedState.users || []) if (passwordResetIds.includes(String(u.id))) u.mustChangePassword = true;
    group.state = await normalizeSecrets(allowedState, before);
    group.state.audit = allowedState.audit;
    const saved = await store.saveGroupIfRev(group, currentRev);
    if (!saved) {
      const fresh = await store.getGroupById(group.id);
      return res.status(409).json({ error: "Os dados mudaram enquanto você editava", conflict: true, ...statePayload(fresh, user) });
    }
    for (const id of passwordResetIds) await store.deleteSessionsForUser(group.id, id);
    if (changes.some(c => c.area === "Nota fiscal" || c.area === "Comprovante")) cleanupOrphanFiles(saved);
    res.json({ ok: true, savedAt: nowIso(), ...statePayload(saved, user) });
  } catch (e) { next(e); }
});

app.post("/api/state/import-local", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const group = req.auth.group;
    const baseRev = Number(group.state?._rev || 0);
    if (group.cloudInitialized) return res.status(409).json({ error: "A migração inicial deste grupo já foi concluída" });
    const incoming = req.body.state;
    if (!incoming || typeof incoming !== "object") return res.status(400).json({ error: "Dados locais inválidos" });
    const currentCeo = req.auth.user;
    if (group.state.subscriptionActivities !== undefined) incoming.subscriptionActivities = clone(group.state.subscriptionActivities);
    else delete incoming.subscriptionActivities;
    SoilAnalysis.prepare(group.state, incoming, currentCeo);
    PlotHistory.sealAndValidate(group.state, incoming, currentCeo);
    RuralOps.prepare(group.state, incoming, currentCeo);
    FarmManagement.prepare(group.state, incoming, currentCeo);
    FieldOps.prepare(group.state, incoming, currentCeo);
    Expansion.prepare(group.state,incoming,incoming,currentCeo,AdmAccess.pagesFor(group.state));
    RuralManagement.prepare(group.state, incoming, currentCeo);
    HarvestLabor.prepare(group.state, incoming, { ...currentCeo, labor: "manager" });
    PlanFeatures.restoreLocked(group.state, incoming, group.plan);
    if (group.state.trial) incoming.trial = clone(group.state.trial); else delete incoming.trial;
    if (group.state.admAccess) incoming.admAccess = clone(group.state.admAccess);
    SeasonHistory.recordChanges(group.state, incoming, currentCeo);
    validateSubscriptionWrites(group.state, incoming);
    RuralDomain.validateState(incoming);
    const normalized = await normalizeSecrets(incoming, group.state);
    normalized.version = 21;
    normalized.users ||= [];
    let importedCeo = normalized.users.find(u => String(u.username || "").toLowerCase() === String(currentCeo.username || "").toLowerCase());
    if (!importedCeo) {
      importedCeo = clone(currentCeo);
      normalized.users.unshift(importedCeo);
    }
    importedCeo.id = currentCeo.id;
    importedCeo.role = "ceo";
    importedCeo.active = true;
    importedCeo.passwordHash = currentCeo.passwordHash;
    importedCeo.email = normalizeEmail(importedCeo.email || currentCeo.email || group.payerEmail);
    delete importedCeo.password;
    group.state = normalized;
    group.cloudInitialized = true;
    await extractInlineFiles(group, group.state, "migração");
    const saved = await store.saveGroupIfRev(group, baseRev);
    if (!saved) return res.status(409).json({ error: "Os dados do Grupo mudaram durante a importação. Entre novamente e tente de novo." });
    res.json({ ok: true, ...statePayload(saved, currentCeo) });
  } catch (e) { next(e); }
});

app.patch("/api/account/email", auth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newEmail = normalizeEmail(req.body.newEmail);
    if (!validateEmail(newEmail)) return res.status(400).json({ error: "Informe um e-mail válido" });
    // Mesmo limite da troca de senha: com uma sessão roubada não dá para ficar chutando a senha atual.
    const key = `chpass|${req.auth.group.id}|${req.auth.user.id}`;
    if (rateBlocked(key, 6)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const group = await store.getGroupById(req.auth.group.id);
    const user = (group.state.users || []).find(u => String(u.id) === String(req.auth.user.id));
    if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) { rateHit(key, 6, 15 * 60_000); return res.status(400).json({ error: "A senha atual não confere" }); }
    const oldEmail = normalizeEmail(user.email);
    const { saved } = await mutateGroup(group.id, g => {
      const u = (g.state.users || []).find(x => String(x.id) === String(user.id));
      if (!u || u.passwordHash !== user.passwordHash) throw httpError(409, "Sua senha foi alterada em outro lugar. Entre novamente.");
      u.email = newEmail;
      g.state.audit = [...(g.state.audit || []), { id: uid(), at: nowIso(), user: u.name, username: u.username, action: "alterou", area: "E-mail de acesso", label: maskEmail(newEmail), farm: "" }].slice(-1500);
    });
    // Aviso ao e-mail antigo: se não foi a própria pessoa (sessão roubada), ela fica sabendo antes de perder a recuperação de senha.
    if (oldEmail && oldEmail !== newEmail) sendSecurityNotice({ to: oldEmail, groupName: group.name, text: `O e-mail de recuperação de senha do usuário ${user.username} foi trocado para ${maskEmail(newEmail)}. Se não foi você, avise o responsável pela fazenda e o suporte imediatamente.` }).catch(e => console.error("Aviso de troca de e-mail:", e.message));
    res.json({ ok: true, email: newEmail, ...statePayload(saved, user) });
  } catch (e) { next(e); }
});

app.patch("/api/users/:id/password", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const group = await store.getGroupById(req.auth.group.id);
    const target = (group.state.users || []).find(u => String(u.id) === String(req.params.id));
    if (!target) return res.status(404).json({ error: "Usuário não encontrado" });
    if (String(target.id) === String(req.auth.user.id)) return res.status(400).json({ error: "Use 'Trocar minha senha' para alterar a sua própria senha" });
    const password = String(req.body.password || "");
    const issue = passwordProblem(password); if (issue) return res.status(400).json({ error: issue });
    const newHash = await bcrypt.hash(password, 11);
    const { saved } = await mutateGroup(group.id, g => {
      const t = (g.state.users || []).find(u => String(u.id) === String(target.id));
      if (!t) throw httpError(404, "Usuário não encontrado");
      t.passwordHash = newHash;
      t.mustChangePassword = true;
      delete t.password;
      g.state.audit = [...(g.state.audit || []), { id: uid(), at: nowIso(), user: req.auth.user.name, username: req.auth.user.username, action: "redefiniu senha de", area: "Usuário", label: t.name, farm: "" }].slice(-1500);
    });
    // Depois de gravar: assim ninguém abre uma sessão nova com a senha antiga no meio do caminho.
    await store.deleteSessionsForUser(group.id, target.id);
    res.json({ ok: true, message: "Senha temporária definida. As sessões antigas foram encerradas e o usuário deverá trocar a senha no próximo acesso.", ...statePayload(saved, req.auth.user) });
  } catch (e) { next(e); }
});

app.post("/api/users", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const group = req.auth.group;
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const email = normalizeEmail(body.email);
    const role = ["ceo","adm","contribuinte"].includes(body.role) ? body.role : "contribuinte";
    let workerFunction = String(body.function || "").trim();
    if (!name || !validateUsername(username) || !validateEmail(email)) return res.status(400).json({ error: "Confira nome, e-mail e usuário" });
    const passwordIssue = passwordProblem(password); if (passwordIssue) return res.status(400).json({ error: passwordIssue });
    if (role === "contribuinte" && !["Tratorista","Campo",HarvestLabor.FISCAL].includes(workerFunction)) return res.status(400).json({ error: "Selecione Tratorista, Campo ou Fiscal de colheita" });
    if (role !== "contribuinte" && !workerFunction) workerFunction = role === "ceo" ? "CEO" : "Administração";
    const allowedActivity = role === "contribuinte" && RuralDomain.PERMISSIONS.includes(body.allowedActivity) ? body.allowedActivity : "all";
    // Conferências que dependem dos dados ficam dentro do mutateGroup, para valerem sobre a versão mais nova.
    const checkUserCanBeAdded = (g, targetFarmId) => {
      if ((g.state.users || []).some(u => String(u.username || "").toLowerCase() === username.toLowerCase())) throw httpError(409, "Esse usuário já existe");
      if (role !== "contribuinte") return;
      if (!RuralDomain.activitiesFor(allowedActivity).some(a => SubscriptionDomain.licensed(g.state).includes(a))) throw httpError(422, "Escolha uma atividade incluída na assinatura.");
      const rules = getPlanRules(g);
      const currentCount = (g.state.users || []).filter(u => u.active !== false && u.role === "contribuinte" && String(u.allowedFarmId || "") === targetFarmId).length;
      if (currentCount >= rules.usersPerFarm) throw httpError(403, `Limite de ${rules.usersPerFarm} usuários operacionais por fazenda atingido neste plano.`);
    };
    checkUserCanBeAdded(group, String(body.allowedFarmId || group.state.farms?.[0]?.id || ""));
    const passwordHash = await bcrypt.hash(password, 11);
    const { saved, result: user } = await mutateGroup(group.id, g => {
      const targetFarmId = String(body.allowedFarmId || g.state.farms?.[0]?.id || "");
      checkUserCanBeAdded(g, targetFarmId);
      const user = {
        id: uid(), name, username, email, passwordHash, role, active: true, function: workerFunction,
        mustChangePassword: true,
        pixKey: String(body.pixKey || "").trim().slice(0, MAX_PIX_LENGTH),
        allowedFarmId: role === "contribuinte" ? targetFarmId : "",
        allowedActivity,
        createdAt: nowIso(), createdBy: req.auth.user.username
      };
      g.state.users ||= []; g.state.users.push(user);
      g.state.audit = [...(g.state.audit || []), { id: uid(), at: nowIso(), user: req.auth.user.name, username: req.auth.user.username, action: "adicionou", area: "Usuário", label: name, farm: "" }].slice(-1500);
      return user;
    });
    res.json({ ok: true, user: sanitizeState({ users: [user] }).users[0], ...statePayload(saved, req.auth.user) });
  } catch (e) { next(e); }
});

app.post("/api/registrations/:id/approve", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const { saved } = await mutateGroup(req.auth.group.id, g => {
      const regs = g.state.pendingRegistrations || [];
      const reg = regs.find(r => String(r.id) === String(req.params.id));
      if (!reg) throw httpError(404, "Solicitação não encontrada");
      if ((g.state.users || []).some(u => String(u.username || "").toLowerCase() === String(reg.username || "").toLowerCase())) throw httpError(409, "Esse usuário já existe");
      const role = reg.role === "adm" ? "adm" : "contribuinte";
      const targetFarmId = String(req.body.allowedFarmId || g.state.farms?.[0]?.id || "");
      const allowedActivity = role === "contribuinte" && RuralDomain.PERMISSIONS.includes(req.body.allowedActivity) ? req.body.allowedActivity : "all";
      if (role === "contribuinte") {
        if (!RuralDomain.activitiesFor(allowedActivity).some(a => SubscriptionDomain.licensed(g.state).includes(a))) throw httpError(422, "Escolha uma atividade incluída na assinatura.");
        const rules = getPlanRules(g);
        const currentCount = (g.state.users || []).filter(u => u.active !== false && u.role === "contribuinte" && String(u.allowedFarmId || "") === targetFarmId).length;
        if (currentCount >= rules.usersPerFarm) throw httpError(403, `Limite de ${rules.usersPerFarm} usuários operacionais por fazenda atingido neste plano.`);
      }
      const user = {
        id: uid(), name: reg.name, username: reg.username, email: normalizeEmail(reg.email), passwordHash: reg.passwordHash, role, active: true,
        function: role === "contribuinte" ? reg.function : "Administração", mustChangePassword: false, pixKey: reg.pixKey || "",
        allowedFarmId: role === "contribuinte" ? targetFarmId : "",
        allowedActivity,
        createdAt: nowIso(), createdBy: req.auth.user.username
      };
      g.state.users ||= []; g.state.users.push(user);
      g.state.pendingRegistrations = regs.filter(r => r.id !== reg.id);
      g.state.audit = [...(g.state.audit || []), { id: uid(), at: nowIso(), user: req.auth.user.name, username: req.auth.user.username, action: "aprovou", area: "Usuário", label: user.name, farm: "" }].slice(-1500);
    });
    res.json({ ok: true, ...statePayload(saved, req.auth.user) });
  } catch (e) { next(e); }
});

app.post("/api/registrations/:id/reject", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    const { saved } = await mutateGroup(req.auth.group.id, g => {
      g.state.pendingRegistrations = (g.state.pendingRegistrations || []).filter(r => String(r.id) !== String(req.params.id));
    });
    res.json({ ok: true, ...statePayload(saved, req.auth.user) });
  } catch (e) { next(e); }
});

// Senha do Super Admin: a do ambiente (Render) vale até ser trocada pelo próprio painel; a nova fica guardada só como
// hash. PLATFORM_ADMIN_PASSWORD_RESET=1 volta a usar a do ambiente (para quem perdeu a senha nova).
const PLATFORM_PASSWORD_RESET = process.env.PLATFORM_ADMIN_PASSWORD_RESET === "1";
async function platformStoredPassword() { return PLATFORM_PASSWORD_RESET ? null : await store.getConfig("platformAdminPassword"); }
async function platformPasswordOk(password) {
  const stored = await platformStoredPassword();
  if (stored?.hash) return bcrypt.compare(String(password || ""), stored.hash);
  if (!PLATFORM_ADMIN_PASSWORD) return false;
  if (PLATFORM_ADMIN_PASSWORD.startsWith("$2")) return bcrypt.compare(String(password || ""), PLATFORM_ADMIN_PASSWORD);
  return safeEqual(password, PLATFORM_ADMIN_PASSWORD);
}
async function getPlatformSessions() { return (await store.getConfig("platformAdminSessions")) || []; }
async function savePlatformSessions(list) { await store.setConfig("platformAdminSessions", list.slice(-30)); }
// mustChangePassword: a senha usada no login está fora da regra; a sessão só serve para trocar a senha (ou sair).
async function createPlatformSession(req, mustChangePassword = false) {
  const token = crypto.randomBytes(36).toString("hex");
  const sessions = (await getPlatformSessions()).filter(x => new Date(x.expiresAt).getTime() > Date.now());
  sessions.push({ tokenHash: tokenHash(token), email: PLATFORM_ADMIN_EMAIL, createdAt: nowIso(), expiresAt: new Date(Date.now() + PLATFORM_SESSION_HOURS * 3600_000).toISOString(), ip: String(req.ip || ""), userAgent: String(req.headers["user-agent"] || "").slice(0,180), ...(mustChangePassword ? { mustChangePassword: true } : {}) });
  await savePlatformSessions(sessions);
  return token;
}
async function platformAuth(req, res, next) {
  try {
    const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (bearer) {
      const sessions = await getPlatformSessions();
      const hash = tokenHash(bearer);
      const session = sessions.find(x => x.tokenHash === hash && new Date(x.expiresAt).getTime() > Date.now());
      if (session) {
        req.platformAdmin = { email: session.email, session, token: bearer };
        if (session.mustChangePassword && !/^\/api\/platform\/auth\/(change-password|logout)/.test(req.originalUrl)) return res.status(428).json({ error: "Troque a senha do Super Admin para continuar.", mustChangePassword: true });
        return next();
      }
    }
    // Migração/local: a chave antiga só é aceita fora de produção, ou com liberação explícita,
    // e com limite de tentativas erradas (antes dava para testar chaves sem parar).
    const legacyKey = req.headers["x-setup-key"];
    if (legacyKey && (!IS_PRODUCTION || ALLOW_LEGACY_PLATFORM_KEY) && PLATFORM_SETUP_KEY) {
      const limitKey = `platform-key|${req.ip}`;
      if (rateBlocked(limitKey, 10)) return res.status(429).json({ error: `Muitas tentativas com chave errada. Aguarde ${rateRetryMinutes(limitKey)} min.` });
      if (safeEqual(legacyKey, PLATFORM_SETUP_KEY)) { req.platformAdmin = { email: "legacy-key", legacy: true }; return next(); }
      rateHit(limitKey, 10, 15 * 60_000);
    }
    return res.status(401).json({ error: "Sessão administrativa expirada" });
  } catch (e) { next(e); }
}
async function recordPlatformAudit(req, action, group = null, detail = "") {
  const list = (await store.getConfig("platformAudit")) || [];
  list.push({ id: uid(), at: nowIso(), admin: req.platformAdmin?.email || PLATFORM_ADMIN_EMAIL || "sistema", action, groupId: group?.id || null, groupCode: group?.code || null, groupName: group?.name || null, detail: String(detail || "").slice(0,300), ip: String(req.ip || "") });
  await store.setConfig("platformAudit", list.slice(-1500));
}
async function sendPlatformCodeEmail(code) {
  if (!RESEND_API_KEY || !PLATFORM_ADMIN_EMAIL) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: PASSWORD_RESET_FROM, to: [PLATFORM_ADMIN_EMAIL], subject: "Código de acesso — Super Admin Gestão Rural", html: `<div style="font-family:Arial,sans-serif;color:#171815"><h2>Acesso ao Super Admin</h2><p>Seu código de confirmação é:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:18px 0">${code}</div><p>Ele vence em 10 minutos.</p></div>` })
  });
  if (!response.ok) throw new Error(`Falha ao enviar código do Super Admin (${response.status})`);
  return true;
}
app.post("/api/platform/auth/login", limitRequests("platform-login", 10, 15 * 60_000), async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!PLATFORM_ADMIN_EMAIL || !PLATFORM_ADMIN_PASSWORD) return res.status(503).json({ error: "Super Admin ainda não configurado no servidor" });
    // Além do limite por IP: no máximo 20 erros em 15 min somando todos os aparelhos, para não dar para testar senhas trocando de rede.
    const accountKey = "platform-login-account";
    if (rateBlocked(accountKey, 20)) return res.status(429).json({ error: `Login do Super Admin bloqueado por excesso de tentativas. Tente de novo em ${rateRetryMinutes(accountKey)} min.` });
    if (email !== PLATFORM_ADMIN_EMAIL || !(await platformPasswordOk(password))) { rateHit(accountKey, 20, 15 * 60_000); return res.status(401).json({ error: "E-mail ou senha incorretos" }); }
    rateClear(accountKey);
    // A conta mais sensível: senha fora da regra só entra para trocar.
    const mustChangePassword = Boolean(passwordProblem(password));
    if (PLATFORM_REQUIRE_2FA) {
      if (!RESEND_API_KEY) return res.status(503).json({ error: "2FA do Super Admin está ativo, mas o envio de e-mail não está configurado" });
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      const challengeId = uid();
      const challenges = (await store.getConfig("platformChallenges")) || [];
      challenges.push({ id: challengeId, email, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), attempts: 0, ...(mustChangePassword ? { mustChangePassword: true } : {}) });
      await store.setConfig("platformChallenges", challenges.filter(x => new Date(x.expiresAt).getTime() > Date.now()).slice(-20));
      await sendPlatformCodeEmail(code);
      return res.json({ ok: true, needsCode: true, challengeId, email: maskEmail(email) });
    }
    const token = await createPlatformSession(req, mustChangePassword);
    await recordPlatformAudit({ platformAdmin: { email }, ip: req.ip }, "login-super-admin", null, "Login administrativo");
    res.json({ ok: true, token, expiresInHours: PLATFORM_SESSION_HOURS, mustChangePassword });
  } catch (e) { next(e); }
});
app.post("/api/platform/auth/verify", limitRequests("platform-2fa", 15, 15 * 60_000), async (req, res, next) => {
  try {
    const id = String(req.body.challengeId || "");
    const code = String(req.body.code || "").replace(/\D/g, "").slice(0,6);
    const challenges = (await store.getConfig("platformChallenges")) || [];
    const ch = challenges.find(x => x.id === id);
    if (!ch || ch.email !== PLATFORM_ADMIN_EMAIL || new Date(ch.expiresAt).getTime() < Date.now() || Number(ch.attempts || 0) >= 5) return res.status(400).json({ error: "Código inválido ou expirado" });
    const ok = await bcrypt.compare(code, ch.codeHash);
    if (!ok) { ch.attempts = Number(ch.attempts || 0) + 1; await store.setConfig("platformChallenges", challenges); return res.status(400).json({ error: "Código inválido ou expirado" }); }
    await store.setConfig("platformChallenges", challenges.filter(x => x.id !== id));
    const token = await createPlatformSession(req, Boolean(ch.mustChangePassword));
    await recordPlatformAudit({ platformAdmin: { email: PLATFORM_ADMIN_EMAIL }, ip: req.ip }, "login-super-admin", null, "Login com verificação em duas etapas");
    res.json({ ok: true, token, expiresInHours: PLATFORM_SESSION_HOURS, mustChangePassword: Boolean(ch.mustChangePassword) });
  } catch (e) { next(e); }
});
// Troca da senha do Super Admin pelo painel: guarda só o hash, encerra as outras sessões e libera esta.
app.post("/api/platform/auth/change-password", platformAuth, async (req, res, next) => {
  try {
    if (!req.platformAdmin.session) return res.status(403).json({ error: "Entre com e-mail e senha para trocar a senha." });
    const key = "platform-chpass";
    if (rateBlocked(key, 6)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
    const current = String(req.body.currentPassword || ""), next_ = String(req.body.newPassword || "");
    if (!(await platformPasswordOk(current))) { rateHit(key, 6, 15 * 60_000); return res.status(400).json({ error: "A senha atual não confere" }); }
    const issue = passwordProblem(next_); if (issue) return res.status(400).json({ error: issue });
    if (current === next_) return res.status(400).json({ error: "A nova senha precisa ser diferente da atual" });
    await store.setConfig("platformAdminPassword", { hash: await bcrypt.hash(next_, 12), changedAt: nowIso() });
    const hash = tokenHash(req.platformAdmin.token);
    await savePlatformSessions((await getPlatformSessions()).filter(x => x.tokenHash === hash).map(x => { const { mustChangePassword, ...rest } = x; return rest; }));
    await recordPlatformAudit(req, "senha-super-admin", null, "Senha do Super Admin trocada pelo painel");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
app.post("/api/platform/auth/logout", platformAuth, async (req, res, next) => {
  try {
    if (req.platformAdmin.token) {
      const hash = tokenHash(req.platformAdmin.token);
      await savePlatformSessions((await getPlatformSessions()).filter(x => x.tokenHash !== hash));
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});
app.get("/api/platform/audit", platformAuth, async (req, res, next) => {
  try { const list = (await store.getConfig("platformAudit")) || []; res.json({ audit: list.slice(-100).reverse() }); } catch (e) { next(e); }
});

// Criação de novos grupos para onboarding. Em produção, chame este endpoint somente depois de validar o pagamento.
app.post("/api/platform/groups", platformAuth, async (req, res, next) => {
  try {
    const name = String(req.body.groupName || "").trim();
    const code = await allocateGroupCode(req.body.groupCode || "");
    let slug = slugify(req.body.groupSlug || name);
    if (await store.getGroupBySlug(slug)) slug = `${slug}-${code}`;
    const ceoName = String(req.body.ceoName || "").trim();
    const ceoUser = String(req.body.ceoUser || "").trim();
    const ceoPassword = String(req.body.ceoPassword || "");
    const ceoEmail = normalizeEmail(req.body.ceoEmail || req.body.payerEmail);
    if (!name || !slug || !ceoName || !validateUsername(ceoUser) || !validateEmail(ceoEmail)) return res.status(400).json({ error: "Confira os dados do grupo, CEO e e-mail" });
    const passwordIssue = passwordProblem(ceoPassword); if (passwordIssue) return res.status(400).json({ error: passwordIssue });
    const hash = await bcrypt.hash(ceoPassword, 11);
    const selectedPlan = PLAN_CATALOG[req.body.plan] ? req.body.plan : "pro";
    const initialState = makeDefaultState({ ceoName, ceoUser, ceoPasswordHash: hash, ceoEmail });
    initialState.farms = [makeFarm("Minha Fazenda")];
    initialState.subscriptionActivities = SubscriptionDomain.normalize(req.body.activities || ["coffee","cattle","grains"]);
    if (initialState.users?.[0]) initialState.users[0].mustChangePassword = true;
    const group = {
      id: uid(), slug, code, name, status: "active", plan: selectedPlan,
      state: initialState, cloudInitialized: true,
      subscriptionId: req.body.subscriptionId || null, payerEmail: ceoEmail,
      createdAt: nowIso(), updatedAt: nowIso()
    };
    await store.createGroup(group);
    await store.setConfig(`commercial:${group.id}`, { type: "courtesy", label: "Cortesia/manual", createdAt: nowIso() });
    await recordPlatformAudit(req, "criou-grupo", group, `Plano ${selectedPlan}`);
    res.json({ ok: true, group: { id: group.id, slug: group.slug, code: group.code, name: group.name, status: group.status, plan: group.plan } });
  } catch (e) { next(e); }
});

app.get("/api/platform/groups", platformAuth, async (req, res, next) => {
  try {
    const groups = await store.listGroups();
    const out = [];
    for (const g of groups) {
      const rules = getPlanRules(g);
      const [lastLogin, planRequest, commercial, archivedAt] = await Promise.all([store.getConfig(`lastLogin:${g.id}`), store.getConfig(`planRequest:${g.id}`), store.getConfig(`commercial:${g.id}`), store.getConfig(`archivedAt:${g.id}`)]);
      const purchase = g.subscriptionId ? await store.getPurchaseBySubscription(g.subscriptionId).catch(() => null) : null;
      out.push({ id:g.id, slug:g.slug, code:g.code, name:g.name, status:g.status, plan:g.plan, cloudInitialized:g.cloudInitialized, subscriptionId:g.subscriptionId, payerEmail:g.payerEmail, createdAt:g.createdAt,
        activities: SubscriptionDomain.licensed(g.state),
        usage: groupUsage(g), limits: { maxFarms: Number.isFinite(rules.maxFarms) ? rules.maxFarms : null, usersPerFarm: rules.usersPerFarm },
        billingCycle: purchase?.billingCycle || null, amount: purchase?.amount ?? null, purchaseStatus: purchase?.status || null,
        commercial: commercial || (purchase ? { type: "paid", label: "Assinatura" } : { type: "internal", label: "Interno" }), archivedAt,
        lastLogin, planRequest, protected: g.slug === SEED_GROUP_SLUG || String(g.code) === String(SEED_GROUP_CODE) });
    }
    res.json({ groups: out });
  } catch (e) { next(e); }
});


app.patch("/api/platform/groups/:id/activities", platformAuth, async (req,res,next)=>{
  try{
    const group=await store.getGroupById(req.params.id);if(!group)return res.status(404).json({error:"Grupo não encontrado"});
    const activities=SubscriptionDomain.normalize(req.body.activities);
    if(group.subscriptionId&&!String(group.subscriptionId).startsWith('TEST-')){
      const purchase=await store.getPurchaseBySubscription(group.subscriptionId);
      const contracted=purchase?await store.getConfig(`purchaseActivities:${purchase.id}`):null;
      if(!contracted||SubscriptionDomain.key(contracted)!==SubscriptionDomain.key(activities))return res.status(409).json({error:"Os módulos precisam corresponder à assinatura paga. Atualize a contratação antes de mudar o acesso."});
    }
    const rev=Number(group.state._rev||0);group.state.subscriptionActivities=activities;
    for(const user of group.state.users||[])if(user.role==='contribuinte'&&!RuralDomain.activitiesFor(user.allowedActivity).some(a=>activities.includes(a)))user.active=false;
    const saved=await store.saveGroupIfRev(group,rev);if(!saved)return res.status(409).json({error:"O grupo mudou. Atualize a lista e tente novamente."});
    await recordPlatformAudit(req,"alterou-modulos",group,activities.join(' + '));res.json({ok:true,activities,message:"Atividades do grupo atualizadas."});
  }catch(error){next(error);}
});
app.patch("/api/platform/groups/:id/ceo-password", platformAuth, async (req, res, next) => {
  try {
    const password = String(req.body.password || "");
    const issue = passwordProblem(password); if (issue) return res.status(400).json({ error: issue });
    const newHash = await bcrypt.hash(password, 11);
    const findCeo = g => (g.state.users || []).find(u => u.role === "ceo" && u.active !== false) || (g.state.users || []).find(u => u.role === "ceo");
    const { saved: group, result: ceo } = await mutateGroup(req.params.id, g => {
      const ceo = findCeo(g);
      if (!ceo) throw httpError(404, "CEO não encontrado neste Grupo");
      ceo.passwordHash = newHash;
      ceo.mustChangePassword = true;
      delete ceo.password;
      return { id: ceo.id, username: ceo.username };
    });
    await store.deleteSessionsForUser(group.id, ceo.id);
    await recordPlatformAudit(req, "resetou-senha-ceo", group, `CEO: ${ceo.username}`);
    res.json({ ok: true, message: "Senha temporária definida. O CEO foi desconectado e deverá trocar a senha no próximo acesso.", username: ceo.username });
  } catch (e) { next(e); }
});

app.patch("/api/platform/groups/:id/status", platformAuth, async (req, res, next) => {
  try {
    const group = await store.getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    const status = req.body.status === "active" ? "active" : req.body.status === "suspended" ? "suspended" : null;
    if (!status) return res.status(400).json({ error: "Status inválido" });
    group.status = status;
    await store.saveGroupMeta(group);
    // Suspensão manual não pode ser desfeita sozinha pelo Mercado Pago (veja applySubscriptionStatus).
    await store.setConfig(`manualSuspension:${group.id}`, status === "suspended" ? { at: nowIso(), by: req.platformAdmin?.email || "" } : null);
    await recordPlatformAudit(req, status === "active" ? "reativou-grupo" : "suspendeu-grupo", group);
    res.json({ ok: true, group: { id: group.id, slug: group.slug, code: group.code, name: group.name, status: group.status, plan: group.plan } });
  } catch (e) { next(e); }
});

app.patch("/api/platform/groups/:id/plan", platformAuth, async (req, res, next) => {
  try {
    const group = await store.getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    const plan = PLAN_CATALOG[req.body.plan] ? req.body.plan : null;
    if (!plan) return res.status(400).json({ error: "Plano inválido" });
    const rules = PLAN_CATALOG[plan];
    const usage = groupUsage(group);
    if (Number.isFinite(rules.maxFarms) && usage.farms > rules.maxFarms) {
      return res.status(409).json({ error: `Downgrade bloqueado: este Grupo tem ${usage.farms} fazendas e o plano ${rules.name} permite ${rules.maxFarms}. Reduza o uso antes de mudar o plano.` });
    }
    const activeContributors = (group.state.users || []).filter(u => u.active !== false && u.role === "contribuinte");
    for (const farm of group.state.farms || []) {
      const count = activeContributors.filter(u => String(u.allowedFarmId || "") === String(farm.id)).length;
      if (count > rules.usersPerFarm) return res.status(409).json({ error: `Downgrade bloqueado: ${farm.name} tem ${count} usuários operacionais e o plano permite ${rules.usersPerFarm}.` });
    }
    const realSubscription = group.subscriptionId && !String(group.subscriptionId).startsWith("TEST-");
    if (realSubscription) {
      if (!MP_ACCESS_TOKEN) return res.status(503).json({ error: "Configure o Mercado Pago para validar a cobrança antes de alterar este plano." });
      const purchase = await store.getPurchaseBySubscription(group.subscriptionId);
      const cycleId = purchase?.billingCycle || "monthly";
      const subscribedActivities = await store.getConfig(`purchaseActivities:${purchase?.id}`);
      const expected = subscribedActivities ? SubscriptionDomain.quote(plan, BILLING_CYCLES[cycleId], subscribedActivities, ACTIVITY_PRICING).amount : billingAmount(plan, cycleId);
      if (expected == null) return res.status(422).json({ error: "Defina os valores da combinação contratada antes de alterar o porte." });
      const sub = await fetchMpSubscription(group.subscriptionId);
      const charged = Number(sub?.auto_recurring?.transaction_amount ?? NaN);
      if (!Number.isFinite(charged) || Math.abs(charged - expected) > 0.01) {
        return res.status(409).json({ error: `Cobrança ainda não confere com o plano ${rules.name}. Valor esperado no período ${BILLING_CYCLES[cycleId]?.label || cycleId}: R$ ${expected.toFixed(2).replace(".",",")}. Ajuste a assinatura no Mercado Pago e tente novamente.` });
      }
      if (purchase) {
        purchase.planId = plan; purchase.amount = expected; purchase.intervalMonths = BILLING_CYCLES[cycleId]?.months || 1; purchase.discountPct = BILLING_CYCLES[cycleId]?.discount || 0;
        await store.savePurchase(purchase);
      }
    }
    group.plan = plan;
    await store.saveGroupMeta(group);
    await store.setConfig(`planRequest:${group.id}`, null);
    await recordPlatformAudit(req, "alterou-plano", group, `Novo plano: ${PLAN_CATALOG[plan].name}`);
    res.json({ ok: true, group: groupInfo(group) });
  } catch (e) { next(e); }
});

async function cancelSubscriptionBeforeGroupDeletion(group) {
  const subscriptionId = String(group?.subscriptionId || "");
  if (!subscriptionId || subscriptionId.startsWith("TEST-")) return;
  if (!MP_ACCESS_TOKEN) throw Object.assign(new Error("Antes de excluir este cliente, configure o Mercado Pago para cancelar a assinatura e evitar novas cobranças"), { statusCode: 503 });
  // Já cancelada (por exemplo, numa tentativa anterior de arquivar): não há o que cancelar de novo.
  const current = await fetchMpSubscription(subscriptionId).catch(() => null);
  if (["cancelled", "canceled"].includes(String(current?.status || "").toLowerCase())) return;
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "canceled" })
  });
  if (!response.ok) { const detail = await response.text().catch(() => ""); throw Object.assign(new Error(`Não foi possível cancelar a assinatura no Mercado Pago (${response.status}). O Grupo não foi excluído.` + (detail ? ` ${detail.slice(0,120)}` : "")), { statusCode: 502 }); }
}

app.post("/api/platform/groups/:id/archive", platformAuth, async (req, res, next) => {
  try {
    const group = await store.getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    if (group.slug === SEED_GROUP_SLUG || String(group.code) === String(SEED_GROUP_CODE)) return res.status(403).json({ error: "O Grupo inicial 1001 é protegido" });
    if (cleanGroupCode(req.body.confirmCode) !== cleanGroupCode(group.code)) return res.status(400).json({ error: "Digite o Código do Grupo corretamente para confirmar" });
    await cancelSubscriptionBeforeGroupDeletion(group);
    group.status = "archived";
    await store.saveGroupMeta(group);
    await store.setConfig(`archivedAt:${group.id}`, nowIso());
    await recordPlatformAudit(req, "arquivou-grupo", group, "Assinatura cancelada quando aplicável");
    res.json({ ok: true, message: "Grupo arquivado. Os dados foram preservados." });
  } catch (e) { next(e); }
});

app.delete("/api/platform/groups/:id", platformAuth, async (req, res, next) => {
  try {
    const group = await store.getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: "Grupo não encontrado" });
    if (group.slug === SEED_GROUP_SLUG || String(group.code) === String(SEED_GROUP_CODE)) return res.status(403).json({ error: "O Grupo inicial 1001 é protegido contra exclusão" });
    if (group.status !== "archived") return res.status(409).json({ error: "Arquive o Grupo antes da exclusão definitiva" });
    if (cleanGroupCode(req.body.confirmCode) !== cleanGroupCode(group.code) || String(req.body.confirmText || "").trim().toUpperCase() !== "EXCLUIR") return res.status(400).json({ error: "Confirmação inválida" });
    await recordPlatformAudit(req, "excluiu-grupo", group, "Exclusão definitiva");
    await store.deleteGroup(group.id);
    await Promise.all([store.setConfig(`commercial:${group.id}`, null), store.setConfig(`archivedAt:${group.id}`, null), store.setConfig(`planRequest:${group.id}`, null), store.setConfig(`lastLogin:${group.id}`, null), store.setConfig(`manualSuspension:${group.id}`, null)]);
    res.json({ ok: true, message: "Grupo excluído definitivamente" });
  } catch (e) { next(e); }
});

app.get("/api/public/config", (req, res) => res.json({
  productName: "Gestão Rural",
  planName: PLAN_NAME,
  planPrice: null,
  plans: Object.values(PLAN_CATALOG).map(p => ({ ...p, monthlyPrice: null })),
  activities: SubscriptionDomain.activities,
  activityPricing: ACTIVITY_PRICING,
  billingCycles: Object.values(BILLING_CYCLES).map(c => ({ ...c, discountPct: Math.round(c.discount * 100) })),
  currency: "BRL",
  paymentConfigured: Boolean(MP_ACCESS_TOKEN),
  cloudConfigured: Boolean(DATABASE_URL),
  testPurchaseMode: testModeActive()
}));

async function getOrCreateMpPlan() {
  if (!MP_ACCESS_TOKEN && !MP_PLAN_ID) throw new Error("Mercado Pago não configurado");
  const token = MP_ACCESS_TOKEN;
  if (MP_PLAN_ID) {
    if (!token) return { id: MP_PLAN_ID, init_point: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${encodeURIComponent(MP_PLAN_ID)}` };
    const r = await fetch(`https://api.mercadopago.com/preapproval_plan/${encodeURIComponent(MP_PLAN_ID)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Falha ao consultar plano Mercado Pago (${r.status})`);
    return r.json();
  }
  const cached = await store.getConfig("mercadopago_plan");
  if (cached?.id && cached?.init_point) return cached;
  if (!PUBLIC_BASE_URL) throw new Error("Defina PUBLIC_BASE_URL para criar o plano");
  const r = await fetch("https://api.mercadopago.com/preapproval_plan", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: PLAN_NAME,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: PLAN_PRICE, currency_id: "BRL" },
      back_url: `${PUBLIC_BASE_URL}/?checkout=success`
    })
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.message || `Falha ao criar plano Mercado Pago (${r.status})`);
  await store.setConfig("mercadopago_plan", json);
  return json;
}


async function fetchMpSubscription(subscriptionId) {
  if (!MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");
  const r = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" }
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json?.message || `Falha ao consultar assinatura (${r.status})`);
  return json;
}

function subscriptionAllowsAccess(status) {
  return ["authorized"].includes(String(status || "").toLowerCase());
}

// Ajusta o acesso do Grupo conforme a assinatura, sem desfazer o que o Super Admin decidiu:
// Grupo arquivado continua arquivado e suspensão manual só sai pelo /platform.
async function applySubscriptionStatus(group, subStatus) {
  if (!group || group.status === "archived") return group;
  const manualSuspension = await store.getConfig(`manualSuspension:${group.id}`);
  let status = group.status;
  if (subscriptionAllowsAccess(subStatus)) status = manualSuspension ? "suspended" : "active";
  else if (String(subStatus || "").toLowerCase() !== "pending") status = "suspended";
  if (status === group.status) return group;
  group.status = status;
  return store.saveGroupMeta(group);
}

async function refreshPurchaseStatus(purchase) {
  if (testModeActive() && !purchase.subscriptionId) {
    purchase.status = "authorized";
    return store.savePurchase(purchase);
  }
  if (!purchase.subscriptionId) return purchase;
  const sub = await fetchMpSubscription(purchase.subscriptionId);
  purchase.status = sub.status || purchase.status;
  await store.savePurchase(purchase);
  await applySubscriptionStatus(await store.getGroupBySubscription(purchase.subscriptionId), sub.status);
  return purchase;
}

app.post("/api/public/checkout", limitRequests("checkout", 20, 3600_000, "Muitas tentativas de compra deste aparelho. Tente mais tarde."), async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const planId = PLAN_CATALOG[req.body.planId] ? req.body.planId : "pro";
    const billingCycle = BILLING_CYCLES[req.body.billingCycle] ? req.body.billingCycle : "monthly";
    const plan = PLAN_CATALOG[planId];
    const cycle = BILLING_CYCLES[billingCycle];
    const activities = SubscriptionDomain.normalize(req.body.activities);
    const quote = SubscriptionDomain.quote(planId, cycle, activities, ACTIVITY_PRICING);
    if (!quote.ready) return res.status(422).json({ error: "Os valores desta combinação ainda não foram definidos. Nenhuma cobrança foi feita." });
    const amount = quote.amount;
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Informe um e-mail válido para a assinatura" });

    const purchase = {
      id: uid(), email, status: "created", subscriptionId: null, usedAt: null, groupId: null,
      planId, billingCycle, amount, intervalMonths: cycle.months, discountPct: cycle.discount,
      createdAt: nowIso(), updatedAt: nowIso()
    };
    await store.setConfig(`purchaseActivities:${purchase.id}`, activities);
    await store.createPurchase(purchase);

    if (testModeActive()) {
      purchase.status = "authorized";
      await store.savePurchase(purchase);
      return res.json({ checkoutUrl: `${PUBLIC_BASE_URL || ""}/?purchase=${purchase.id}&checkout=success`, purchaseId: purchase.id, testMode: true, planId, billingCycle, amount });
    }

    if (!MP_ACCESS_TOKEN) throw new Error("Mercado Pago não configurado");
    if (!PUBLIC_BASE_URL) throw new Error("Defina PUBLIC_BASE_URL no servidor");

    const reason = `${PLAN_NAME} ${plan.name} • ${activities.map(a => SubscriptionDomain.activities.find(x => x.id === a).name).join(" + ")} • ${cycle.label}`;
    const mp = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        external_reference: purchase.id,
        payer_email: email,
        auto_recurring: { frequency: cycle.months, frequency_type: "months", transaction_amount: amount, currency_id: "BRL" },
        back_url: `${PUBLIC_BASE_URL}/?purchase=${purchase.id}&checkout=success`
      })
    });
    const sub = await mp.json();
    if (!mp.ok) throw new Error(sub?.message || `Falha ao criar assinatura (${mp.status})`);
    purchase.subscriptionId = sub.id;
    purchase.status = sub.status || "pending";
    await store.savePurchase(purchase);
    if (!sub.init_point) throw new Error("Assinatura criada sem link de checkout");
    res.json({ checkoutUrl: sub.init_point, purchaseId: purchase.id, planId, billingCycle, amount });
  } catch (e) { next(e); }
});

// Rota pública: cada chamada consulta o Mercado Pago com o token da plataforma, então tem limite por rede.
app.get("/api/public/purchases/:id/status", limitRequests("purchase-status", 60, 15 * 60_000), async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(String(req.params.id || ""))) return res.status(404).json({ error: "Compra não encontrada" });
    let purchase = await store.getPurchaseById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Compra não encontrada" });
    try { purchase = await refreshPurchaseStatus(purchase); } catch (e) { console.error("Status da assinatura:", e.message); }
    res.json({
      purchaseId: purchase.id,
      email: purchase.email.replace(/(^.).*(@.*$)/, "$1***$2"),
      status: purchase.status,
      paid: subscriptionAllowsAccess(purchase.status),
      used: Boolean(purchase.usedAt),
      canOnboard: subscriptionAllowsAccess(purchase.status) && !purchase.usedAt,
      planId: purchase.planId || "pro",
      billingCycle: purchase.billingCycle || "monthly",
      amount: purchase.amount
    });
  } catch (e) { next(e); }
});

app.post("/api/public/purchases/:id/onboard", limitRequests("onboard", 20, 3600_000), async (req, res, next) => {
  try {
    let purchase = await store.getPurchaseById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Compra não encontrada" });
    purchase = await refreshPurchaseStatus(purchase);
    if (!subscriptionAllowsAccess(purchase.status)) return res.status(403).json({ error: "A assinatura ainda não está autorizada" });
    if (purchase.usedAt) return res.status(409).json({ error: "Esta compra já foi usada para criar um Grupo" });

    // Quem fez o teste grátis continua no mesmo Grupo: confere código, usuário e senha do CEO do teste.
    if (req.body.trialGroupCode) {
      const trialGroup = await store.getGroupByCode(cleanGroupCode(req.body.trialGroupCode));
      const ceo = trialGroup && trialActive(trialGroup.state) ? (trialGroup.state.users || []).find(u => u.role === "ceo" && u.active !== false && String(u.username || "").toLowerCase() === String(req.body.ceoUser || "").trim().toLowerCase()) : null;
      if (!rateHit(`trial-convert|${req.ip}`, 10, 3600_000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      if (!ceo || !(await bcrypt.compare(String(req.body.ceoPassword || ""), ceo.passwordHash || ""))) return res.status(400).json({ error: "Grupo de teste, usuário ou senha do CEO não conferem." });
      if (!(await store.claimPurchase(purchase.id))) return res.status(409).json({ error: "Esta compra já foi usada para criar um Grupo" });
      try {
        const purchasedActivities = await store.getConfig(`purchaseActivities:${purchase.id}`);
        await mutateGroup(trialGroup.id, g => {
          g.state.trial = { ...g.state.trial, convertedAt: nowIso(), purchaseId: purchase.id };
          g.state.subscriptionActivities = purchasedActivities ? SubscriptionDomain.normalize(purchasedActivities) : g.state.subscriptionActivities;
        });
        const fresh = await store.getGroupById(trialGroup.id);
        fresh.plan = PLAN_CATALOG[purchase.planId] ? purchase.planId : "pro";
        fresh.subscriptionId = purchase.subscriptionId || `TEST-${purchase.id}`; fresh.payerEmail = purchase.email;
        await store.saveGroupMeta(fresh);
      } catch (e) { await store.releasePurchase(purchase.id).catch(() => {}); throw e; }
      await store.setConfig(`commercial:${trialGroup.id}`, { type: "paid", label: "Assinatura (após teste grátis)", purchaseId: purchase.id, createdAt: nowIso() });
      purchase.usedAt = nowIso(); purchase.groupId = trialGroup.id;
      await store.savePurchase(purchase);
      return res.json({ ok: true, group: { id: trialGroup.id, slug: trialGroup.slug, code: trialGroup.code, name: trialGroup.name }, loginUrl: `/app?grupo=${encodeURIComponent(trialGroup.code)}`, convertedTrial: true });
    }

    const name = String(req.body.groupName || "").trim();
    const code = await allocateGroupCode();
    let slug = slugify(name);
    if (await store.getGroupBySlug(slug)) slug = `${slug}-${code}`;
    const ceoName = String(req.body.ceoName || "").trim();
    const ceoUser = String(req.body.ceoUser || "").trim();
    const ceoPassword = String(req.body.ceoPassword || "");
    if (!name || !slug || !ceoName || !validateUsername(ceoUser)) return res.status(400).json({ error: "Confira Grupo, CEO e usuário" });
    const passwordIssue = passwordProblem(ceoPassword); if (passwordIssue) return res.status(400).json({ error: passwordIssue });

    // Reserva a compra antes de criar o Grupo: dois envios ao mesmo tempo não criam dois Grupos com um pagamento só.
    if (!(await store.claimPurchase(purchase.id))) return res.status(409).json({ error: "Esta compra já foi usada para criar um Grupo" });
    let group;
    try {
      const hash = await bcrypt.hash(ceoPassword, 11);
      const selectedPlan = PLAN_CATALOG[purchase.planId] ? purchase.planId : "pro";
      const initialState = makeDefaultState({ ceoName, ceoUser, ceoPasswordHash: hash, ceoEmail: purchase.email });
      initialState.farms = [makeFarm("Minha Fazenda")];
      const purchasedActivities = await store.getConfig(`purchaseActivities:${purchase.id}`);
      initialState.subscriptionActivities = purchasedActivities ? SubscriptionDomain.normalize(purchasedActivities) : RuralDomain.ACTIVITIES;
      group = {
        id: uid(), slug, code, name, status: "active", plan: selectedPlan,
        state: initialState, cloudInitialized: true,
        subscriptionId: purchase.subscriptionId || `TEST-${purchase.id}`, payerEmail: purchase.email,
        createdAt: nowIso(), updatedAt: nowIso()
      };
      await store.createGroup(group);
    } catch (e) {
      await store.releasePurchase(purchase.id).catch(() => {});
      throw e;
    }
    await store.setConfig(`commercial:${group.id}`, { type: "paid", label: "Assinatura", purchaseId: purchase.id, createdAt: nowIso() });
    purchase.usedAt = nowIso(); purchase.groupId = group.id;
    await store.savePurchase(purchase);
    res.json({ ok: true, group: { id: group.id, slug: group.slug, code: group.code, name: group.name }, loginUrl: `/app?grupo=${encodeURIComponent(group.code)}` });
  } catch (e) { next(e); }
});

// ---------- Teste grátis ----------
// Grupo de teste com as funções do Profissional por TRIAL_DAYS dias (7 a 14; padrão 14), sem cartão.
// Um teste por e-mail. Ao vencer, o acesso fica bloqueado até a assinatura; quem assina informa o código do Grupo
// de teste e o usuário/senha do CEO, e continua com os mesmos dados (veja o onboard da compra).
const TRIAL_DAYS = Math.min(14, Math.max(7, Number(process.env.TRIAL_DAYS || 14) || 14));
const trialActive = state => Boolean(state?.trial && !state.trial.convertedAt);
const trialExpired = state => trialActive(state) && Date.now() > Date.parse(state.trial.endsAt);
const trialExpiredBody = group => ({ error: `O teste grátis terminou em ${new Date(group.state.trial.endsAt).toLocaleDateString("pt-BR")}. Para continuar com os mesmos dados, assine um plano em ${PUBLIC_BASE_URL || ""}/#planos e, no cadastro, escolha "Já tenho um Grupo de teste" com o código ${group.code}.`, trialExpired: true, groupCode: group.code });
app.post("/api/public/trial", limitRequests("trial", 3, 24 * 3600_000, "Muitos testes criados a partir desta rede. Tente amanhã."), async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!validateEmail(email)) return res.status(400).json({ error: "Informe um e-mail válido." });
    const activities = SubscriptionDomain.normalize(req.body.activities);
    const name = String(req.body.groupName || "").trim().slice(0, 120), ceoName = String(req.body.ceoName || "").trim().slice(0, 120), ceoUser = String(req.body.ceoUser || "").trim(), ceoPassword = String(req.body.ceoPassword || "");
    if (!name || !ceoName || !validateUsername(ceoUser)) return res.status(400).json({ error: "Confira o nome do Grupo, seu nome e o usuário." });
    const passwordIssue = passwordProblem(ceoPassword); if (passwordIssue) return res.status(400).json({ error: passwordIssue });
    const emailKey = `trialEmail:${crypto.createHash("sha256").update(email).digest("hex")}`;
    if (await store.getConfig(emailKey)) return res.status(409).json({ error: "Este e-mail já usou o teste grátis. Para continuar, assine um plano." });
    const code = await allocateGroupCode();
    let slug = slugify(name); if (!slug || await store.getGroupBySlug(slug)) slug = `${slug || "grupo"}-${code}`;
    const state = makeDefaultState({ ceoName, ceoUser, ceoPasswordHash: await bcrypt.hash(ceoPassword, 11), ceoEmail: email });
    state.farms = [makeFarm("Minha Fazenda")];
    state.subscriptionActivities = activities;
    const startedAt = nowIso();
    state.trial = { startedAt, endsAt: new Date(Date.now() + TRIAL_DAYS * 86400_000).toISOString(), days: TRIAL_DAYS };
    const group = { id: uid(), slug, code, name, status: "active", plan: "pro", state, cloudInitialized: true, subscriptionId: `TRIAL-${uid()}`, payerEmail: email, createdAt: startedAt, updatedAt: startedAt };
    await store.createGroup(group);
    await store.setConfig(emailKey, { groupId: group.id, at: startedAt });
    await store.setConfig(`commercial:${group.id}`, { type: "trial", label: `Teste grátis (${TRIAL_DAYS} dias)`, createdAt: startedAt });
    res.json({ ok: true, days: TRIAL_DAYS, endsAt: state.trial.endsAt, group: { code: group.code, name: group.name }, loginUrl: `/app?grupo=${encodeURIComponent(group.code)}` });
  } catch (e) { next(e); }
});

// Assinatura do aviso (x-signature), conforme a documentação do Mercado Pago: HMAC-SHA256, em hexadecimal, de
// "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (campos ausentes saem do texto), com a assinatura secreta do painel.
// A documentação não deixa claro se o id vai em minúsculas, então as duas formas são aceitas.
function mercadoPagoSignatureOk(req, dataId) {
  const parts = Object.fromEntries(String(req.headers["x-signature"] || "").split(",").map(p => p.split("=").map(s => s.trim())).filter(p => p.length === 2));
  if (!parts.ts || !/^[0-9a-f]{64}$/i.test(parts.v1 || "")) return false;
  const requestId = String(req.headers["x-request-id"] || "");
  const manifest = id => `${id ? `id:${id};` : ""}${requestId ? `request-id:${requestId};` : ""}ts:${parts.ts};`;
  const expected = Buffer.from(parts.v1.toLowerCase(), "hex");
  return [...new Set([dataId, String(dataId).toLowerCase()])].some(id => {
    const mac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET).update(manifest(id)).digest();
    return mac.length === expected.length && crypto.timingSafeEqual(mac, expected);
  });
}

app.post("/api/webhooks/mercadopago", limitRequests("mp-webhook", 300, 15 * 60_000), async (req, res) => {
  // A notificação apenas dispara uma consulta autenticada na API do Mercado Pago;
  // o status confiável vem do GET /preapproval/{id}, não do corpo recebido.
  const subscriptionId = String(req.query?.["data.id"] || req.body?.data?.id || "");
  // Com MERCADOPAGO_WEBHOOK_SECRET configurada, aviso sem assinatura válida é recusado (401) e não gera consulta nenhuma.
  if (MP_WEBHOOK_SECRET && !mercadoPagoSignatureOk(req, subscriptionId)) return res.status(401).json({ error: "Assinatura inválida" });
  res.sendStatus(200);
  try {
    // Só avisos de assinatura (preapproval) interessam aqui; pagamentos e outros tipos são ignorados.
    const type = String(req.query?.type || req.query?.topic || req.body?.type || req.body?.topic || "");
    if (type && !/preapproval/i.test(type)) return;
    if (!subscriptionId || !/^[A-Za-z0-9_-]{1,80}$/.test(subscriptionId) || !MP_ACCESS_TOKEN) return;
    const sub = await fetchMpSubscription(subscriptionId);
    const purchase = await store.getPurchaseBySubscription(subscriptionId);
    if (purchase) { purchase.status = sub.status || purchase.status; await store.savePurchase(purchase); }
    await applySubscriptionStatus(await store.getGroupBySubscription(subscriptionId), sub.status);
  } catch (e) { console.error("Webhook Mercado Pago:", e.message); }
});

// Endpoints de mercado (mantidos da v20)
let cache = { at: 0, data: null };
let marketCache = { at: 0, data: null };
let cattleLocalCache = { at: 0, data: null };
const CACHE_MS = 60_000, MARKET_CACHE_MS = 30_000, CATTLE_LOCAL_CACHE_MS = 30 * 60_000;
// Última leitura boa de cada fonte, com data e hora, guardada no banco: se a fonte falhar (ou o servidor reiniciar),
// o Mercado mostra o último valor com o aviso "atualizado em …" em vez de ficar vazio.
let marketLast = null, marketLastDirty = false, marketLastSavedAt = 0;
async function marketLastLoad() { if (!marketLast) { try { marketLast = (await store.getConfig("market_last")) || {}; } catch { marketLast = {}; } } return marketLast; }
function marketLastKeep(key, data) { marketLast[key] = { data, at: nowIso() }; marketLastDirty = true; }
function marketLastGet(key) { const x = marketLast?.[key]; return x ? { ...x.data, stale: true, fetchedAt: x.at } : null; }
async function marketLastSave() {
  if (!marketLastDirty || Date.now() - marketLastSavedAt < 5 * 60_000) return;
  marketLastDirty = false; marketLastSavedAt = Date.now();
  try { await store.setConfig("market_last", marketLast); } catch (e) { console.error("[mercado] guardar última leitura:", e.message); }
}
// Cotação da bolsa com reserva: a leitura nova vira a última boa; se falhar, devolve a última boa marcada como antiga.
async function marketSnap(symbol) {
  try { const snap = await yahooSnapshot(symbol); marketLastKeep(symbol, snap); return { ...snap, fetchedAt: nowIso() }; }
  catch { return marketLastGet(symbol); }
}

async function yahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Falha ao consultar ${symbol}: ${response.status}`);
  const json = await response.json(); const result = json?.chart?.result?.[0]; if (!result) throw new Error(`Sem dados para ${symbol}`);
  const meta = result.meta || {}; const closes = result.indicators?.quote?.[0]?.close || [];
  const lastClose = [...closes].reverse().find(v => typeof v === "number"); const price = meta.regularMarketPrice ?? lastClose;
  if (typeof price !== "number") throw new Error(`Preço indisponível para ${symbol}`); return price;
}
async function yahooSnapshot(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Falha ao consultar ${symbol}: ${response.status}`);
  const json = await response.json(); const result = json?.chart?.result?.[0]; if (!result) throw new Error(`Sem dados para ${symbol}`);
  const meta = result.meta || {}, quote = result.indicators?.quote?.[0] || {}; const lastNumeric = arr => [...(arr || [])].reverse().find(v => typeof v === "number");
  const price = meta.regularMarketPrice ?? lastNumeric(quote.close); if (typeof price !== "number") throw new Error(`Preço indisponível para ${symbol}`);
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null; const change = typeof previousClose === "number" ? price - previousClose : null;
  const changePct = typeof previousClose === "number" && previousClose !== 0 ? (change / previousClose) * 100 : null;
  return { symbol, price, previousClose, change, changePct, open:lastNumeric(quote.open), high:lastNumeric(quote.high), low:lastNumeric(quote.low), currency:meta.currency||"", exchangeName:meta.exchangeName||"", marketState:meta.marketState||"", timestamp:meta.regularMarketTime ? new Date(meta.regularMarketTime*1000).toISOString() : nowIso() };
}
// Preços físicos brasileiros (CEPEA/Esalq e praças regionais) da AgroDoc AI. A API permite 100 consultas por dia:
// uma consulta a cada 30 min (48/dia) com a praça do boi em MARKET_UF (padrão MG). Se falhar, devolve a última leitura boa.
const MARKET_UF = String(process.env.MARKET_UF || "MG").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "MG";
async function latestAgroBR() {
  if (cattleLocalCache.data && Date.now()-cattleLocalCache.at<CATTLE_LOCAL_CACHE_MS) return cattleLocalCache.data;
  try {
    const r = await fetch(`https://agrodocai.com.br/api/v1/cotacao?uf=${MARKET_UF}`, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json(), n = v => Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
    const out = {
      date: j.atualizado || null, source: j.fonte || "CEPEA/Esalq", license: j.license || "",
      boiCepeaSP: n(j.boi_gordo_cepea_sp), boiCepeaLabel: j.boi_gordo_praca || "CEPEA/Esalq SP",
      boiUF: j.boi_gordo_uf && n(j.boi_gordo_uf.preco) ? { uf: j.boi_gordo_uf.uf || MARKET_UF, value: n(j.boi_gordo_uf.preco), praca: j.boi_gordo_uf.praca || "" } : null,
      vacaGorda: n(j.vaca_gorda), bezerroMS: n(j.bezerro_ms), soja: n(j.soja), milho: n(j.milho)
    };
    // Formato antigo da mesma API ({valor, data_cotacao}) continua aceito.
    if (!out.boiUF && n(j.valor)) out.boiUF = { uf: j.uf || MARKET_UF, value: n(j.valor), praca: j.uf || MARKET_UF };
    if (!out.boiCepeaSP && !out.boiUF && !out.soja && !out.milho) throw new Error("resposta sem preços");
    out.fetchedAt = nowIso();
    if (marketLast) marketLastKeep("agro", out);
    cattleLocalCache = { at: Date.now(), data: out }; return out;
  } catch (e) {
    console.error("[mercado] preços físicos:", e.message);
    if (cattleLocalCache.data) { cattleLocalCache.at = Date.now() - CATTLE_LOCAL_CACHE_MS + 5 * 60_000; return { ...cattleLocalCache.data, stale: true }; }
    return marketLastGet("agro");
  }
}
const COFFEE_CONTRACTS=[{symbol:"KCZ26.NYB",label:"Dez/26",ice:"Dec26"},{symbol:"KCH27.NYB",label:"Mar/27",ice:"Mar27"},{symbol:"KCK27.NYB",label:"Mai/27",ice:"May27"},{symbol:"KCN27.NYB",label:"Jul/27",ice:"Jul27"},{symbol:"KCU27.NYB",label:"Set/27",ice:"Sep27"},{symbol:"KCZ27.NYB",label:"Dez/27",ice:"Dec27"},{symbol:"KCH28.NYB",label:"Mar/28",ice:"Mar28"}];
// Grãos na Bolsa de Chicago (CBOT), em centavos de US$ por bushel. Peso do bushel: soja e trigo 27,2155 kg; milho 25,4012 kg.
const GRAIN_FUTURES=[{key:"soja",symbol:"ZS=F",label:"Soja",kgPerBushel:27.2155},{key:"milho",symbol:"ZC=F",label:"Milho",kgPerBushel:25.4012},{key:"trigo",symbol:"ZW=F",label:"Trigo",kgPerBushel:27.2155}];
let marketPending = null;
async function buildMarket() {
  await marketLastLoad();
  const [usd,coffee,live,feeder,br,grains,contracts]=await Promise.all([
    marketSnap("BRL=X"),marketSnap("KC=F"),marketSnap("LE=F"),marketSnap("GF=F"),latestAgroBR(),
    Promise.all(GRAIN_FUTURES.map(g=>marketSnap(g.symbol))),Promise.all(COFFEE_CONTRACTS.map(c=>marketSnap(c.symbol)))
  ]);
  marketLastSave();
  const usdBrl=usd?.price||null,poundsPer60kg=132.277357,poundsPerArroba=15*2.20462262185;
  const enrichCoffee=(snap,c={})=>!snap?{...c,available:false}:{...c,...snap,available:true,brlPerSaca:usdBrl?(snap.price/100)*poundsPer60kg*usdBrl:null};
  const convertCattle=snap=>!snap?null:{...snap,brlPerArroba:usdBrl?(snap.price/100)*poundsPerArroba*usdBrl:null};
  const grainRow=(g,snap)=>!snap?{...g,available:false}:{...g,...snap,available:true,brlPerSaca:usdBrl?(snap.price/100)/g.kgPerBushel*60*usdBrl:null};
  return {updatedAt:nowIso(),autoRefreshSeconds:30,usdBrl:usd,
    coffee:{front:enrichCoffee(coffee,{label:"Coffee C contínuo"}),contracts:COFFEE_CONTRACTS.map((c,i)=>enrichCoffee(contracts[i],c)),exchange:"ICE Futures U.S.",unit:"centavos de US$/lb",note:"Bolsa de Nova York (ICE), com até 10 minutos de atraso. R$/saca é conversão indicativa pelo dólar do momento; o café físico tem ágio ou deságio conforme tipo e região."},
    cattle:{local:br&&{boiCepeaSP:br.boiCepeaSP,boiCepeaLabel:br.boiCepeaLabel,boiUF:br.boiUF,vacaGorda:br.vacaGorda,bezerroMS:br.bezerroMS,date:br.date,source:br.source,stale:!!br.stale,fetchedAt:br.fetchedAt},localMG:br?.boiUF?{value:br.boiUF.value,date:br.date,source:br.source,unit:"@",uf:br.boiUF.uf}:null,liveCattle:convertCattle(live),feederCattle:convertCattle(feeder),note:"Preço físico do boi: CEPEA/Esalq (SP) e praça regional, em R$ por arroba (15 kg), atualizados durante o dia pela fonte. Live Cattle e Feeder Cattle são referências da bolsa dos EUA."},
    grains:{physical:br&&{soja:br.soja,milho:br.milho,date:br.date,source:br.source,stale:!!br.stale,fetchedAt:br.fetchedAt},futures:GRAIN_FUTURES.map((g,i)=>grainRow(g,grains[i])),exchange:"CBOT (Chicago)",note:"Bolsa de Chicago, com até 10 minutos de atraso. R$/saca de 60 kg é conversão indicativa pelo dólar do momento; o preço físico no Brasil tem a base (prêmio e frete) de cada praça."},
    disclaimer:"Painel informativo. Não é recomendação de investimento."};
}
async function refreshMarketSnapshot(){
 if(marketCache.data&&Date.now()-marketCache.at<MARKET_CACHE_MS)return marketCache.data;
 marketPending ||= buildMarket().finally(()=>{marketPending=null;});
 const payload=await marketPending;marketCache={at:Date.now(),data:payload};return payload;
}
app.get("/api/mercado", async(req,res)=>{try{res.json(await refreshMarketSnapshot());}catch(error){console.error(error);if(marketCache.data)return res.json({...marketCache.data,stale:true});res.status(503).json({error:"Mercado temporariamente indisponível",detail:IS_PRODUCTION?undefined:error.message});}});
app.get("/api/cotacao-cafe", async (req,res)=>{try{if(cache.data&&Date.now()-cache.at<CACHE_MS)return res.json(cache.data);const [coffeeCentsLb,usdBrl]=await Promise.all([yahooChart("KC=F"),yahooChart("BRL=X")]);const poundsPer60kg=132.277357,usdPerSaca=(coffeeCentsLb/100)*poundsPer60kg,brlPerSaca=usdPerSaca*usdBrl;const payload={symbol:"KC=F",coffeeCentsLb,usdBrl,usdPerSaca,brlPerSaca,timestamp:nowIso(),methodology:"Coffee C × 132,277357 lb por 60 kg × USD/BRL",warning:"Estimativa de referência; não é preço físico local."};cache={at:Date.now(),data:payload};res.json(payload);}catch(error){if(cache.data)return res.json({...cache.data,stale:true});res.status(503).json({error:"Cotação temporariamente indisponível",detail:error.message});}});

// ---------- Limpar os dados de uma fazenda (CEO) ----------
// Apaga talhões, máquinas, estoque, produção, gado, financeiro, gestão, campo e mão de obra; mantém a fazenda, o nome e
// os usuários. Não tem volta: exige a senha do CEO e o nome da fazenda digitado, e fica registrado no histórico.
app.post("/api/farms/:id/reset", auth, requireRole("ceo"), async (req, res, next) => {
  try {
    if (!rateHit(`farm-reset|${req.auth.user.id}`, 5, 3600_000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde uma hora." });
    const farmId = String(req.params.id || ""), norm = v => String(v || "").trim().toLocaleLowerCase("pt-BR");
    const farm = (req.auth.group.state.farms || []).find(f => String(f.id) === farmId);
    if (!farm) return res.status(404).json({ error: "Fazenda não encontrada." });
    if (norm(req.body?.confirmName) !== norm(farm.name)) return res.status(400).json({ error: "Digite o nome da fazenda exatamente como aparece." });
    const me = (req.auth.group.state.users || []).find(u => String(u.id) === String(req.auth.user.id));
    if (!me?.passwordHash || !(await bcrypt.compare(String(req.body?.password || ""), me.passwordHash))) return res.status(403).json({ error: "Senha incorreta." });
    const { saved } = await mutateGroup(req.auth.group.id, g => {
      const i = (g.state.farms || []).findIndex(f => String(f.id) === farmId);
      if (i < 0) throw httpError(404, "Fazenda não encontrada.");
      const old = g.state.farms[i];
      g.state.farms[i] = { ...makeFarm(old.name), id: old.id, type: old.type || "mixed", photo: old.photo || "" };
      g.state.audit = [...(g.state.audit || []), { id: uid(), at: nowIso(), user: req.auth.user.name || req.auth.user.username, username: req.auth.user.username, action: "limpou", area: "Fazenda", label: `${old.name} · todos os dados da fazenda apagados`, farm: old.name }].slice(-1500);
    });
    res.json(statePayload(saved, req.auth.user));
  } catch (e) { next(e); }
});

// ---------- Monitor de preços das cotações (links de oferta) ----------
// A cada PRICE_WATCH_HOURS (padrão 6; 0 desliga) o servidor confere as cotações com link e "conferir sozinho" ligado.
// As páginas são baixadas fora da gravação (podem demorar); depois o resultado entra no Grupo pelo mutateGroup.
const PRICE_WATCH_HOURS = Math.max(0, Number(process.env.PRICE_WATCH_HOURS ?? 6) || 0);
const PRICE_WATCH_MAX_PER_RUN = 300;
async function checkGroupQuotes(groupId, pick, cache = new Map()) {
  const group = await store.getGroupById(groupId);
  if (!group) throw httpError(404, "Grupo não encontrado");
  const today = nowIso().slice(0, 10), found = [];
  for (const f of group.state?.farms || []) for (const q of f.management?.quotes || []) if (PriceWatch.watchable(q, today) && pick(f, q)) found.push({ farmId: f.id, quoteId: q.id, link: q.link });
  const results = [];
  for (const job of found) {
    // O mesmo link em várias cotações é baixado uma vez só por rodada.
    if (!cache.has(job.link)) cache.set(job.link, await PriceWatch.checkQuote({ link: job.link }));
    results.push({ ...job, result: cache.get(job.link) });
  }
  if (!results.length) return { checked: 0, changed: 0, review: 0, failed: 0 };
  const at = nowIso(), count = { checked: 0, changed: 0, review: 0, failed: 0 };
  await mutateGroup(groupId, g => {
    Object.keys(count).forEach(k => { count[k] = 0; });
    const changes = [];
    for (const r of results) {
      const farm = (g.state.farms || []).find(f => f.id === r.farmId);
      const q = farm?.management?.quotes?.find(x => x.id === r.quoteId);
      if (!q || q.link !== r.link) continue;
      const before = q.unitPrice, outcome = PriceWatch.applyResult(q, r.result, at);
      count.checked++;
      if (outcome === "changed") { count.changed++; q.priceUpdatedAt = at; changes.push({ id: uid(), at, user: "Monitor de preços", username: "", action: "atualizou o preço", area: "Cotação", label: `${q.itemName} · ${q.supplier}: R$ ${before} → R$ ${q.unitPrice} (site)`, farm: farm.name, activity: q.activity }); }
      else if (outcome === "review") count.review++;
      else if (outcome !== "same") count.failed++;
    }
    if (changes.length) g.state.audit = [...(g.state.audit || []), ...changes].slice(-1500);
  });
  return count;
}
app.post("/api/precos/conferir", auth, requireRole("ceo", "adm"), async (req, res, next) => {
  try {
    const groupId = req.auth.group.id, farmId = String(req.body?.farmId || ""), quoteId = String(req.body?.quoteId || "");
    if (!PlanFeatures.has(req.auth.group.plan, "quotes")) return res.status(403).json({ error: "A conferência automática de preços faz parte dos planos Profissional e Grupo." });
    if (!rateHit(`price-check|${groupId}`, 6, 10 * 60_000)) return res.status(429).json({ error: "A conferência de preços já foi pedida várias vezes. Aguarde alguns minutos." });
    if (!(req.auth.group.state?.farms || []).some(f => f.id === farmId)) return res.status(404).json({ error: "Fazenda não encontrada." });
    let n = 0;
    const result = await checkGroupQuotes(groupId, (f, q) => f.id === farmId && (!quoteId || q.id === quoteId) && n++ < 25);
    res.json(result);
  } catch (e) { next(e); }
});
async function priceWatchRun() {
  const cache = new Map(), stale = Date.now() - (PRICE_WATCH_HOURS * 3600_000 - 10 * 60_000);
  let budget = PRICE_WATCH_MAX_PER_RUN, total = { checked: 0, changed: 0 };
  for (const g of await store.listGroups()) {
    if (budget <= 0) break;
    if (!PlanFeatures.has(g.plan, "quotes") || g.status !== "active") continue;
    try {
      const r = await checkGroupQuotes(g.id, (_f, q) => !(Date.parse(q.priceCheck?.checkedAt || "") > stale) && budget-- > 0, cache);
      total.checked += r.checked; total.changed += r.changed;
    } catch (e) { console.error(`[preços] grupo ${g.code}:`, e.message); }
  }
  if (total.checked) console.log(`[preços] ${total.checked} cotação(ões) conferida(s), ${total.changed} com preço novo`);
}
function startPriceWatch() {
  if (!PRICE_WATCH_HOURS) return;
  let running = false;
  const tick = () => { if (running) return; running = true; priceWatchRun().catch(e => console.error("[preços]", e.message)).finally(() => { running = false; }); };
  setTimeout(tick, 2 * 60_000).unref();
  setInterval(tick, Math.max(1, PRICE_WATCH_HOURS) * 3600_000).unref();
}

// Só os arquivos do site são públicos. server.js, README, package.json, .env e o banco local nunca são servidos.
require("./expansao-server")({app,auth,requireRole,store,mutateGroup,statePayload,AdmAccess,PlanFeatures,normalizeEmail,passwordProblem,bcrypt,rateHit,market:()=>marketCache.data,refreshMarket:refreshMarketSnapshot,FieldOps,RuralDomain,FarmManagement,trialExpired});

const PUBLIC_FILES = new Set(["/expansao-domain.js","/implantacao-domain.js","/expansao.js","/expansao.css","/contador.js","/analise-solo-domain.js", "/analise-solo.js", "/analise-solo.css", "/assets/gestao-rural-previa.mp4", "/index.html", "/app.html", "/platform.html", "/style.css", "/theme.css", "/inicio.css", "/sales.css", "/platform.css", "/platform-theme.css", "/app.js", "/fx.js", "/inicio.js", "/sales.js", "/platform.js", "/rural-domain.js", "/rural-modules.js", "/rural-modules.css", "/graos.js", "/gado.html", "/graos.html", "/paginas-iniciais.css", "/cafe.html", "/subscription-domain.js", "/talhoes-domain.js", "/talhoes-historico.js", "/safras-domain.js", "/safras-historico.js", "/operacao-domain.js", "/operacao.js", "/operacao.css", "/graficos-rurais.js", "/demo.js", "/safra-painel.js", "/gado-config.js", "/app-minimal.css", "/culturas-quantidades.js", "/formularios-rurais.js", "/temas-atividades.css", "/gestao-domain.js", "/gestao.js", "/gestao.css", "/adm-access.js", "/adm-acesso.js", "/plan-features.js", "/menu.js", "/campo-domain.js", "/campo.js", "/lcdpr.js", "/manifest.webmanifest", "/evolucao-domain.js", "/evolucao.js", "/evolucao.css", "/campo-offline.js", "/cofre-pin.js", "/carencia-domain.js", "/carencia.js", "/medicamentos-domain.js","/maodeobra-domain.js","/maodeobra.js", "/maodeobra.css", "/assets/app-icone-192.png", "/assets/app-icone-512.png"]);
// Service worker do app de campo: gerado ao iniciar, com a versão calculada pelos arquivos (código novo = cache novo).
// Sem cache no navegador, para o celular sempre conferir se há versão nova.
let SERVICE_WORKER = "";
try { SERVICE_WORKER = require("./gerar-worker.cjs").build(PUBLIC_DIR); } catch (e) { console.error("[app de campo] service worker não gerado:", e.message); }
app.get("/campo-sw.js", (req, res) => {
  if (!SERVICE_WORKER) return res.status(404).end();
  res.setHeader("Content-Type", "application/javascript; charset=utf-8"); res.setHeader("Cache-Control", "no-cache"); res.send(SERVICE_WORKER);
});
const staticFiles = express.static(PUBLIC_DIR, { index: false, dotfiles: "deny", maxAge: "1h" });
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let p = "";
  try { p = decodeURIComponent(req.path); } catch (_) { return next(); }
  if (PUBLIC_FILES.has(p) || /^\/assets\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp|svg)$/i.test(p)) return staticFiles(req, res, next);
  next();
});
app.use("/api", (req, res) => res.status(404).json({ error: "Rota não encontrada" }));
app.get("/contador", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"contador.html")));
app.get("/demo", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"demo.html")));
app.get("/app", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"app.html")));
app.get("/app.html", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"app.html")));
app.get("/platform", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"platform.html")));
app.get("/platform.html", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"platform.html")));
app.get("/cafe", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"cafe.html")));
app.get("/visao-geral", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"index.html")));
app.get("/gado", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"gado.html")));
app.get("/graos", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"graos.html")));
app.get("/", (req,res)=>res.sendFile(path.join(PUBLIC_DIR,"index.html")));
app.get("*", (req,res)=>res.status(404).type("html").send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página não encontrada · Gestão Rural</title><body><main><h1>Página não encontrada</h1><p>Confira o endereço ou volte ao sistema.</p><a href="/">Página inicial</a> · <a href="/app">Entrar no painel</a></main></body></html>'));

app.use((err, req, res, next) => {
  const requestId = crypto.randomBytes(5).toString("hex");
  console.error(`[${requestId}]`, err);
  const status = err.statusCode || 500;
  if (IS_PRODUCTION && status >= 500) return res.status(status).json({ error: "Erro interno. Tente novamente.", requestId });
  res.status(status).json({ error: err.message || "Erro interno", requestId });
});

function validateProductionConfiguration() {
  if (!IS_PRODUCTION) return;
  const missing = [];
  if (!DATABASE_URL) missing.push("DATABASE_URL");
  if (!PUBLIC_BASE_URL) missing.push("PUBLIC_BASE_URL");
  if (!SEED_CEO_PASSWORD) missing.push("SEED_CEO_PASSWORD");
  if (!PLATFORM_ADMIN_EMAIL) missing.push("PLATFORM_ADMIN_EMAIL");
  if (!PLATFORM_ADMIN_PASSWORD) missing.push("PLATFORM_ADMIN_PASSWORD");
  if (PLATFORM_REQUIRE_2FA && !RESEND_API_KEY) missing.push("RESEND_API_KEY (necessária para o 2FA do Super Admin)");
  if (TEST_PURCHASE_MODE_FLAG) {
    if (!ALLOW_TEST_MODE_IN_PRODUCTION) throw new Error("TEST_PURCHASE_MODE=true foi bloqueado em produção. Para um teste controlado, defina também ALLOW_TEST_MODE_IN_PRODUCTION=true e TEST_MODE_UNTIL com a data e hora de término.");
    if (!Number.isFinite(TEST_MODE_UNTIL) || TEST_MODE_UNTIL <= Date.now()) throw new Error("TEST_PURCHASE_MODE=true em produção exige TEST_MODE_UNTIL no futuro (ex.: 2026-11-05T18:00:00-03:00). Se o teste acabou, desligue TEST_PURCHASE_MODE.");
    if (TEST_MODE_UNTIL - Date.now() > 7 * 86400_000) throw new Error("TEST_MODE_UNTIL pode ficar no máximo 7 dias à frente.");
  }
  if (!(SESSION_DAYS >= 1 && SESSION_DAYS <= 365)) missing.push("SESSION_DAYS válida (entre 1 e 365)");
  if (missing.length) throw new Error(`Variáveis obrigatórias de produção ausentes: ${missing.join(", ")}`);
  if (!validateEmail(PLATFORM_ADMIN_EMAIL)) throw new Error("PLATFORM_ADMIN_EMAIL inválido");
  // Senha curta impede a subida; fora da regra nova (maiúscula, símbolo...) só avisa, para um deploy não derrubar o site.
  for (const [name, value] of [["SEED_CEO_PASSWORD", SEED_CEO_PASSWORD], ["PLATFORM_ADMIN_PASSWORD", PLATFORM_ADMIN_PASSWORD]]) {
    if (String(value || "").length < 8) throw new Error(`${name} inválida: a senha precisa ter pelo menos 8 caracteres.`);
    const issue = passwordProblem(value);
    if (issue) console.warn(`[senha] ${name} fora da regra atual (${issue}) Troque no ambiente quando puder.`);
  }
}

(async()=>{
  validateProductionConfiguration();
  await store.init();
  await store.pruneSessions();
  await ensureSeedGroup();
  await ensureExistingGroupCodes();
  for (const g of await store.listGroups()) {
    try {
      const moved = await extractInlineFiles(g, g.state);
      if (moved) { await store.saveGroup(g); console.log(`[anexos] ${moved} arquivo(s) do grupo ${g.code} movidos para o armazenamento de arquivos`); }
    } catch (e) { console.error(`[anexos] grupo ${g.code}:`, e.message); }
  }
  const HOST = process.env.HOST || (IS_PRODUCTION ? undefined : "127.0.0.1");
  startPriceWatch();
  app.listen(PORT, HOST, ()=>{
    console.log(`Gestão Rural v${APP_VERSION} em http://localhost:${PORT} • ${DATABASE_URL ? "PostgreSQL" : "armazenamento local de desenvolvimento"}`);
    // Resumo no log de cada deploy: dá para conferir de relance se as proteções estão ligadas.
    console.log(`[proteções] modo: ${IS_PRODUCTION ? "PRODUÇÃO" : "desenvolvimento"} (NODE_ENV=${NODE_ENV || "vazio"}) • compra de teste: ${testModeActive() ? (Number.isFinite(TEST_MODE_UNTIL) ? `LIGADA até ${new Date(TEST_MODE_UNTIL).toISOString()}` : "LIGADA (só desenvolvimento)") : "desligada"} • chave legada da plataforma: ${(!IS_PRODUCTION || ALLOW_LEGACY_PLATFORM_KEY) && PLATFORM_SETUP_KEY ? "ACEITA" : "recusada"} • 2FA do Super Admin: ${PLATFORM_REQUIRE_2FA ? "ligado" : "desligado"} • e-mail: ${RESEND_API_KEY ? "configurado" : "não configurado"} • assinatura do webhook: ${MP_WEBHOOK_SECRET ? "conferida" : (MP_ACCESS_TOKEN ? "NÃO conferida (defina MERCADOPAGO_WEBHOOK_SECRET)" : "sem Mercado Pago")} • trust proxy: ${app.get("trust proxy")} • escutando em: ${HOST || "todas as interfaces"}`);
  });
})().catch(err=>{console.error("Falha ao iniciar:",err);process.exit(1);});

