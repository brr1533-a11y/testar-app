/* Melhorias 2027 no servidor: comparação anônima entre fazendas, exportação dos dados e exclusão da conta a pedido,
   métricas de uso (contagens por página, sem conteúdo), contatos de suporte e backup automático com teste de restauração. */
const crypto = require('crypto'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./expansao-domain'), M = require('./melhorias-domain');
const TERMS_VERSION = '2026-10-30';
const now = () => new Date().toISOString();
const DELETE_GRACE_DAYS = 7;

module.exports = function registerMelhorias(ctx) {
  const { app, auth, requireRole, store, AdmAccess, bcrypt, rateHit, platformAuth, cancelSubscriptionBeforeGroupDeletion, sanitizeState, recordPlatformAudit, SEED_GROUP_SLUG, SEED_GROUP_CODE, market } = ctx;
  const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
  const permitted = (req, page) => R.can(req.auth.user, page, AdmAccess.pagesFor(req.auth.group.state));
  const fail = (status, message) => Object.assign(new Error(message), { statusCode: status });
  const protectedGroup = g => g.slug === SEED_GROUP_SLUG || String(g.code) === String(SEED_GROUP_CODE);

  // ---------- Suporte e termos ----------
  app.get('/api/public/support', (req, res) => res.json({
    whatsapp: /^\d{12,13}$/.test(process.env.SUPPORT_WHATSAPP || '') ? process.env.SUPPORT_WHATSAPP : null,
    videoBase: /^https:\/\//.test(process.env.SUPPORT_VIDEO_URL || '') ? process.env.SUPPORT_VIDEO_URL.replace(/\/+$/, '') : null,
    termsVersion: TERMS_VERSION
  }));

  // ---------- Comparação anônima ----------
  let benchCache = { at: 0, rows: [] };
  async function benchmarkRows() {
    if (Date.now() - benchCache.at < 10 * 60000) return benchCache.rows;
    const rows = [];
    for (const g of await store.listGroups()) {
      if (g.status !== 'active') continue;
      for (const f of g.state.farms || []) {
        const p = R.active(f, 'profiles')[0];
        if (!p?.shareBenchmarks) continue;
        for (const activity of ['coffee', 'grains']) { const v = M.farmIndicators(f, R, activity); if (v.bagsHa || v.costBag) rows.push({ ...v, activity, uf: p.uf, groupKey: g.id, farmKey: g.id + ':' + f.id }); }
      }
    }
    benchCache = { at: Date.now(), rows };
    return rows;
  }
  app.get('/api/expansion/benchmark', auth, wrap(async (req, res) => {
    if (!permitted(req, 'comparacao-fazendas')) throw fail(403, 'Sem permissão para esta página.');
    if (!rateHit('benchmark:' + req.auth.group.id, 30, 60000)) return res.status(429).json({ error: 'Aguarde um pouco para consultar de novo.' });
    const f = req.auth.group.state.farms.find(f => f.id === req.query.farmId); if (!f) throw fail(404, 'Fazenda não encontrada.');
    const activity = ['coffee', 'grains'].includes(req.query.activity) ? req.query.activity : 'coffee', profile = R.active(f, 'profiles')[0];
    const all = await benchmarkRows(), uf = req.query.scope === 'brasil' ? '' : profile?.uf || '';
    // A própria fazenda não entra na comparação que ela vê.
    const result = M.benchmark(all.filter(r => r.farmKey !== req.auth.group.id + ':' + f.id), { activity, uf });
    res.json({ ...result, scope: uf ? 'uf' : 'brasil', uf, mine: M.farmIndicators(f, R, activity), sharing: Boolean(profile?.shareBenchmarks) });
  }));

  // ---------- Exportar todos os dados ----------
  app.get('/api/account/export', auth, requireRole('ceo'), wrap(async (req, res) => {
    if (!rateHit('export:' + req.auth.group.id, 5, 3600000)) return res.status(429).json({ error: 'Muitas exportações seguidas. Tente daqui a pouco.' });
    const g = req.auth.group, files = await store.listFiles(g.id), total = files.reduce((n, f) => n + (f.size || 0), 0), withData = total <= 20 * 1024 * 1024;
    const attachments = [];
    for (const f of files) { const full = withData ? await store.getFile(f.id) : null; attachments.push({ id: f.id, name: f.name, mime: f.mime, size: f.size, createdAt: f.createdAt, ...(full?.data ? { base64: Buffer.from(full.data).toString('base64') } : {}) }); }
    const body = { format: 'gestao-rural-export', version: 1, exportedAt: now(), exportedBy: req.auth.user.username, group: { name: g.name, code: g.code, plan: g.plan, createdAt: g.createdAt }, attachmentsIncluded: withData, state: sanitizeState(g.state), attachments };
    res.setHeader('Content-Disposition', `attachment; filename="gestao-rural-${g.code}-${now().slice(0, 10)}.json"`);
    res.json(body);
  }));

  // ---------- Exclusão da conta a pedido ----------
  const delKey = id => 'deletionRequest:' + id;
  app.get('/api/account/deletion', auth, requireRole('ceo'), wrap(async (req, res) => res.json({ request: await store.getConfig(delKey(req.auth.group.id)) })));
  app.post('/api/account/deletion', auth, requireRole('ceo'), wrap(async (req, res) => {
    const g = req.auth.group;
    if (protectedGroup(g)) throw fail(403, 'O Grupo inicial é protegido contra exclusão.');
    if (!rateHit('deletion:' + g.id, 5, 3600000)) return res.status(429).json({ error: 'Muitas tentativas. Tente mais tarde.' });
    const user = (g.state.users || []).find(u => String(u.id) === String(req.auth.user.id));
    if (!user?.passwordHash || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) throw fail(401, 'Senha incorreta.');
    if (String(req.body.confirmText || '').trim().toUpperCase() !== 'EXCLUIR' || String(req.body.groupCode || '').replace(/\D/g, '') !== String(g.code)) throw fail(400, 'Digite EXCLUIR e o Código do Grupo para confirmar.');
    const request = { requestedAt: now(), executeAfter: new Date(Date.now() + DELETE_GRACE_DAYS * 86400000).toISOString(), by: user.username };
    await store.setConfig(delKey(g.id), request);
    res.json({ ok: true, request, message: `Exclusão agendada para ${new Date(request.executeAfter).toLocaleDateString('pt-BR')}. Até lá você pode cancelar.` });
  }));
  app.delete('/api/account/deletion', auth, requireRole('ceo'), wrap(async (req, res) => { await store.setConfig(delKey(req.auth.group.id), null); res.json({ ok: true }); }));
  async function runDeletions() {
    for (const g of await store.listGroups()) {
      const r = await store.getConfig(delKey(g.id));
      if (!r || Date.parse(r.executeAfter) > Date.now() || protectedGroup(g)) continue;
      try {
        await cancelSubscriptionBeforeGroupDeletion(g);
        const files = await store.listFiles(g.id); await store.deleteFiles(files.map(f => f.id));
        await store.deleteGroup(g.id);
        for (const k of ['commercial', 'archivedAt', 'planRequest', 'lastLogin', 'manualSuspension', 'deletionRequest']) await store.setConfig(k + ':' + g.id, null);
        const log = await store.getConfig('deletionLog') || [];
        await store.setConfig('deletionLog', [...log, { groupHash: crypto.createHash('sha256').update(g.id).digest('hex').slice(0, 16), requestedAt: r.requestedAt, deletedAt: now() }].slice(-500));
      } catch (e) { console.error('[exclusão a pedido] falhou:', e.message); }
    }
  }
  app.get('/api/platform/deletions', platformAuth, wrap(async (req, res) => {
    const pending = [];
    for (const g of await store.listGroups()) { const r = await store.getConfig(delKey(g.id)); if (r) pending.push({ groupId: g.id, name: g.name, code: g.code, ...r }); }
    res.json({ pending, done: await store.getConfig('deletionLog') || [] });
  }));

  // ---------- Métricas de uso (só contagens) ----------
  const usage = new Map(), salt = crypto.randomBytes(16).toString('hex');
  app.post('/api/metrics/page', auth, wrap(async (req, res) => {
    const page = String(req.body.page || '');
    if (!/^[a-z0-9-]{2,40}$/.test(page) || !rateHit('metrics:' + req.auth.user.id, 120, 60000)) return res.json({ ok: true });
    const k = now().slice(0, 7) + '|' + page, row = usage.get(k) || { views: 0, groups: new Set(), roles: {} };
    row.views++; row.groups.add(crypto.createHash('sha256').update(salt + req.auth.group.id).digest('hex').slice(0, 12)); row.roles[req.auth.user.role] = (row.roles[req.auth.user.role] || 0) + 1;
    usage.set(k, row); res.json({ ok: true });
  }));
  async function flushUsage() {
    if (!usage.size) return;
    const pending = [...usage.entries()]; usage.clear();
    const byMonth = new Map(); for (const [k, v] of pending) { const [m, page] = k.split('|'); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m).push([page, v]); }
    for (const [m, list] of byMonth) {
      const cur = await store.getConfig('usage:' + m) || { pages: {} };
      for (const [page, v] of list) { const p = cur.pages[page] || { views: 0, groups: [], roles: {} }; p.views += v.views; p.groups = [...new Set([...p.groups, ...v.groups])].slice(0, 5000); for (const [r, n] of Object.entries(v.roles)) p.roles[r] = (p.roles[r] || 0) + n; cur.pages[page] = p; }
      await store.setConfig('usage:' + m, cur);
    }
  }
  app.get('/api/platform/usage', platformAuth, wrap(async (req, res) => {
    await flushUsage();
    const m = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : now().slice(0, 7), cur = await store.getConfig('usage:' + m) || { pages: {} };
    res.json({ month: m, pages: Object.entries(cur.pages).map(([page, v]) => ({ page, views: v.views, groups: v.groups.length, roles: v.roles })).sort((a, b) => b.views - a.views) });
  }));

  // ---------- Backup automático com teste de restauração ----------
  const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '.backups'), KEEP = Math.max(1, Math.min(90, Number(process.env.BACKUP_KEEP || 14)));
  const hours = Number(process.env.BACKUP_HOURS ?? 24), key = process.env.BACKUP_KEY ? crypto.createHash('sha256').update(process.env.BACKUP_KEY).digest() : null;
  const digest = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
  function seal(buf) { if (!key) return buf; const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv), body = Buffer.concat([c.update(buf), c.final()]); return Buffer.concat([Buffer.from('GRB1'), iv, c.getAuthTag(), body]); }
  function open(buf) { if (buf.subarray(0, 4).toString() !== 'GRB1') return buf; if (!key) throw Error('Backup cifrado: defina BACKUP_KEY para restaurar.'); const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(4, 16)); d.setAuthTag(buf.subarray(16, 32)); return Buffer.concat([d.update(buf.subarray(32)), d.final()]); }
  // Restaurar de verdade em memória: descompacta, lê, confere a assinatura de cada Grupo e valida as fazendas com as regras do sistema.
  function restoreTest(file, expected) {
    const t0 = Date.now(), data = JSON.parse(zlib.gunzipSync(open(fs.readFileSync(file))).toString('utf8')), problems = [];
    if (data.format !== 'gestao-rural-backup' || !Array.isArray(data.groups)) throw Error('Formato desconhecido.');
    for (const g of data.groups) {
      if (expected && expected[g.id] && expected[g.id] !== digest(g.state)) problems.push(`Grupo ${g.code}: conteúdo diferente do original`);
      for (const f of g.state?.farms || []) { try { R.validateFarm(R.clone(f), g.state.coffeeQualities || []); } catch (e) { problems.push(`Grupo ${g.code} · ${f.name}: ${e.message}`); } }
    }
    return { ok: !problems.some(p => /diferente/.test(p)), groups: data.groups.length, farms: data.groups.reduce((n, g) => n + (g.state?.farms || []).length, 0), warnings: problems.slice(0, 20), ms: Date.now() - t0 };
  }
  let running = null;
  async function runBackup(reason = 'automático') {
    if (running) return running;
    running = (async () => {
      fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
      const groups = await store.listGroups(), stamp = now().replace(/[:.]/g, '-'), file = path.join(BACKUP_DIR, `backup-${stamp}.json.gz`);
      const payload = { format: 'gestao-rural-backup', version: 1, createdAt: now(), groups: groups.map(g => ({ id: g.id, slug: g.slug, code: g.code, name: g.name, status: g.status, plan: g.plan, createdAt: g.createdAt, state: g.state })) };
      const expected = Object.fromEntries(payload.groups.map(g => [g.id, digest(g.state)]));
      fs.writeFileSync(file, seal(zlib.gzipSync(Buffer.from(JSON.stringify(payload)))), { mode: 0o600 });
      let test; try { test = restoreTest(file, expected); } catch (e) { test = { ok: false, error: e.message }; }
      const entry = { file: path.basename(file), at: payload.createdAt, reason, size: fs.statSync(file).size, encrypted: Boolean(key), test };
      const log = [...(await store.getConfig('backupLog') || []), entry].slice(-60);
      await store.setConfig('backupLog', log);
      const old = fs.readdirSync(BACKUP_DIR).filter(n => /^backup-.*\.json\.gz$/.test(n)).sort(); for (const n of old.slice(0, Math.max(0, old.length - KEEP))) try { fs.unlinkSync(path.join(BACKUP_DIR, n)); } catch (_) {}
      if (!test.ok) console.error('[backup] teste de restauração falhou:', test.error || test.warnings);
      return entry;
    })().finally(() => { running = null; });
    return running;
  }
  app.get('/api/platform/backups', platformAuth, wrap(async (req, res) => res.json({ dir: path.basename(BACKUP_DIR), keep: KEEP, everyHours: hours, encrypted: Boolean(key), log: (await store.getConfig('backupLog') || []).slice().reverse() })));
  app.post('/api/platform/backups/run', platformAuth, wrap(async (req, res) => { const entry = await runBackup('manual'); await recordPlatformAudit(req, 'backup-manual', null, entry.file); res.json(entry); }));

  // Tarefas periódicas: métricas a cada 5 min, exclusões vencidas a cada hora, backup conforme BACKUP_HOURS (0 desliga).
  const t1 = setInterval(() => flushUsage().catch(() => {}), 5 * 60000); t1.unref();
  const t2 = setInterval(() => runDeletions().catch(() => {}), 3600000); t2.unref();
  if (hours > 0) {
    const t3 = setInterval(() => runBackup().catch(e => console.error('[backup]', e.message)), hours * 3600000); t3.unref();
    const first = setTimeout(async () => { try { const log = await store.getConfig('backupLog') || [], last = log.at(-1); if (!last || Date.now() - Date.parse(last.at) > hours * 3600000) await runBackup(); } catch (e) { console.error('[backup]', e.message); } }, 60000); first.unref();
  }
  return { runBackup, restoreTest, runDeletions, flushUsage, TERMS_VERSION };
};
module.exports.TERMS_VERSION = TERMS_VERSION;
