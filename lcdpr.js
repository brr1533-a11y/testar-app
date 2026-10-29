/* Livro Caixa Digital do Produtor Rural (LCDPR), leiaute 1.3 (código 0013) do Manual de Preenchimento da Receita Federal.
   Gera o arquivo texto a partir dos lançamentos do Financeiro: registros 0000, 0010, 0030, 0040, 0045, 0050, Q100, Q200 e 9999.
   Cada fazenda é um imóvel (0040); cada lançamento é uma linha Q100; o Q200 resume cada mês.
   O arquivo deve ser conferido e transmitido pelo programa oficial da Receita (com o contador). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LCDPR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const VERSION = '0013';
  const TIPO_DOC = { 1: 'Nota fiscal', 2: 'Fatura', 3: 'Recibo', 4: 'Contrato', 5: 'Folha de pagamento', 6: 'Outros' };
  const TIPO_EXPLORACAO = { 1: 'Exploração individual (imóvel próprio)', 2: 'Condomínio', 3: 'Imóvel arrendado', 4: 'Parceria', 5: 'Comodato', 6: 'Outros' };
  const digits = v => String(v || '').replace(/\D/g, '');
  // Campos texto: só ASCII imprimível, sem "|" (regra 2.3.1 do manual).
  const txt = (v, max = 255) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, ' ').replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, max);
  const cents = v => String(Math.round(Math.abs(Number(v || 0)) * 100));
  const ddmmaaaa = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return d + m + y; };
  const code3 = n => String(n).padStart(3, '0');
  function validCPF(v) {
    const c = digits(v); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    const dv = len => { let s = 0; for (let i = 0; i < len; i++) s += Number(c[i]) * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
  }
  function validCNPJ(v) {
    const c = digits(v); if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    const dv = len => { const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = w.reduce((n, x, i) => n + Number(c[i]) * x, 0) % 11; return s < 2 ? 0 : 11 - s; };
    return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
  }
  const validDoc = v => validCPF(v) || validCNPJ(v);
  // Lançamentos do ano: todas as fazendas configuradas como imóvel, entradas e saídas do Financeiro.
  function entries(state, year, cfg) {
    const out = [];
    for (const farm of state.farms || []) {
      const imovel = (cfg.imoveis || []).find(i => i.farmId === farm.id); if (!imovel) continue;
      for (const f of farm.finances || []) {
        if (String(f.date || '').slice(0, 4) !== String(year) || !(Number(f.value) > 0) || !['entrada', 'saida'].includes(f.type)) continue;
        out.push({ farm, imovel, f, l: f.lcdpr || {} });
      }
    }
    return out.sort((a, b) => String(a.f.date).localeCompare(String(b.f.date)) || String(a.f.id).localeCompare(String(b.f.id)));
  }
  function build(state, year, cfg) {
    const warnings = [], lines = [], p = cfg.produtor || {}, c = cfg.contador || {};
    if (!validCPF(p.cpf)) warnings.push('CPF do produtor inválido ou não informado.');
    if (!txt(p.nome)) warnings.push('Nome do produtor não informado.');
    if (!txt(p.endereco) || !txt(p.bairro) || !/^[A-Z]{2}$/.test(p.uf || '') || digits(p.codMun).length !== 7 || digits(p.cep).length !== 8 || !txt(p.email)) warnings.push('Endereço do produtor incompleto (endereço, número, bairro, UF, código IBGE do município com 7 dígitos, CEP e e-mail).');
    const imoveis = (cfg.imoveis || []).filter(i => (state.farms || []).some(f => f.id === i.farmId));
    if (!imoveis.length) warnings.push('Cadastre pelo menos uma fazenda como imóvel rural.');
    imoveis.forEach((i, n) => { if (digits(i.cafir).length !== 8) warnings.push(`Imóvel ${code3(n + 1)}: informe o CAFIR (NIRF) com 8 dígitos.`); if (!txt(i.endereco) || !txt(i.bairro) || digits(i.codMun).length !== 7 || digits(i.cep).length !== 8) warnings.push(`Imóvel ${code3(n + 1)}: endereço, bairro, município (IBGE) e CEP são obrigatórios.`); if (String(i.tipo || '1') !== '1' && !(i.terceiros || []).length) warnings.push(`Imóvel ${code3(n + 1)}: exploração não individual exige o cadastro do terceiro (0045).`); });
    const contas = cfg.contas || [];
    if (!contas.length) warnings.push('Cadastre pelo menos uma conta bancária usada na atividade rural.');
    lines.push(['0000', 'LCDPR', VERSION, digits(p.cpf), txt(p.nome), String(p.indInicio ?? 0), String(p.sitEspecial ?? 0), '', '0101' + year, '3112' + year]);
    lines.push(['0010', String(cfg.formaApuracao || 1)]);
    lines.push(['0030', txt(p.endereco, 150), txt(p.numero || 'SN', 6), txt(p.complemento, 50), txt(p.bairro, 50), txt(p.uf, 2), digits(p.codMun), digits(p.cep), digits(p.telefone).slice(0, 15), txt(p.email, 115)]);
    const codeOf = new Map();
    imoveis.forEach((i, n) => {
      const code = code3(n + 1); codeOf.set(i.farmId, code);
      const farm = state.farms.find(f => f.id === i.farmId);
      const part = Math.min(100, Math.max(0, Number(i.participacao ?? 100)));
      lines.push(['0040', code, 'BR', 'BRL', digits(i.cafir), digits(i.caepf), digits(i.ie), txt(i.nome || farm?.name, 50), txt(i.endereco, 150), txt(i.numero, 6), txt(i.complemento, 50), txt(i.bairro, 50), txt(i.uf, 2), digits(i.codMun), digits(i.cep), String(i.tipo || 1), cents(part)]);
      for (const t of i.terceiros || []) lines.push(['0045', code, String(t.tipo || 5), digits(t.doc), txt(t.nome, 50), cents(t.participacao)]);
    });
    contas.forEach((a, n) => lines.push(['0050', code3(n + 1), 'BR', digits(a.banco).padStart(3, '0').slice(-3), txt(a.nomeBanco, 30), digits(a.agencia).slice(0, 4), digits(a.conta).slice(0, 16)]));
    let balance = 0, missingPartic = 0;
    const months = new Map();
    for (const { imovel, f, l } of entries(state, year, cfg)) {
      const isIn = f.type === 'entrada', v = Math.round(Number(f.value) * 100) / 100;
      balance = Math.round((balance + (isIn ? v : -v)) * 100) / 100;
      let partic = digits(l.partic);
      if (!validDoc(partic)) { missingPartic++; partic = digits(p.cpf); }
      const conta = l.conta === 'especie' ? '000' : l.conta === 'transito' ? '999' : l.conta ? code3(Number(l.conta)) : contas.length ? '001' : '999';
      const tipoLanc = isIn ? (l.tipoLanc === 3 ? '3' : '1') : '2';
      lines.push(['Q100', ddmmaaaa(f.date), codeOf.get(imovel.farmId), conta, txt(l.numDoc || f.noteNumber || '', 60), String(l.tipoDoc || (f.noteId ? 1 : 6)), txt([f.category, f.description].filter(Boolean).join(' - ') || 'Lancamento', 255), partic, tipoLanc, isIn ? cents(v) : '0', isIn ? '0' : cents(v), cents(balance), balance < 0 ? 'N' : 'P']);
      const m = String(f.date).slice(5, 7) + year, row = months.get(m) || { in: 0, out: 0 };
      row.in += isIn ? v : 0; row.out += isIn ? 0 : v; row.end = balance; months.set(m, row);
    }
    if (missingPartic) warnings.push(`${missingPartic} lançamento(s) sem CPF/CNPJ do participante: o arquivo usa o CPF do produtor. Informe o comprador ou fornecedor em cada lançamento.`);
    for (const [m, r] of [...months.entries()].sort((a, b) => a[0].slice(0, 2).localeCompare(b[0].slice(0, 2)))) lines.push(['Q200', m, cents(r.in), cents(r.out), cents(r.end), r.end < 0 ? 'N' : 'P']);
    lines.push(['9999', txt(c.nome), digits(c.doc), txt(c.crc), txt(c.email, 115), digits(c.telefone).slice(0, 15), String(lines.length + 1)]);
    return { text: lines.map(l => l.join('|')).join('\r\n') + '\r\n', warnings, count: lines.length, balance, entries: entries(state, year, cfg).length };
  }
  return { VERSION, TIPO_DOC, TIPO_EXPLORACAO, validCPF, validCNPJ, validDoc, entries, build };
});

// ---------- Tela (só no navegador) ----------
if (typeof window !== 'undefined') {
  var lcdprYear = new Date().getFullYear() - 1;
  window.renderLcdpr = function renderLcdpr() {
    setHeader('FINANCEIRO E FISCAL', 'Livro Caixa (LCDPR)');
    const cfg = data.lcdpr || {}, ceo = currentUser.role === 'ceo';
    const r = LCDPR.build(data, lcdprYear, cfg), list = LCDPR.entries(data, lcdprYear, cfg);
    const years = [...new Set(data.farms.flatMap(f => (f.finances || []).map(x => Number(String(x.date).slice(0, 4)))).filter(Boolean))].sort((a, b) => b - a);
    if (!years.includes(lcdprYear)) years.unshift(lcdprYear);
    const L = v => escapeHTML(v ?? '');
    $('#pageContent').innerHTML = `<div class="hero-surface"><div><h2>Livro Caixa Digital do Produtor Rural.</h2><p>O produtor pessoa física com receita bruta da atividade rural acima do limite da Receita entrega o LCDPR junto com o Imposto de Renda. O sistema monta o arquivo a partir dos lançamentos do Financeiro, no leiaute 1.3 do manual da Receita. Gere o arquivo, confira com o contador e transmita pelo programa oficial.</p></div></div>
      <div class="grid kpis">${ruralKpi('Lançamentos no ano', r.entries)}${ruralKpi('Resultado do ano', money(r.balance))}${ruralKpi('Linhas do arquivo', r.count)}${ruralKpi('Pendências', r.warnings.length)}</div>
      <div class="section-head"><div><h2>Ano-calendário</h2></div><div class="inline"><select id="lcYear" style="width:auto;min-width:110px">${years.map(y => `<option ${y === lcdprYear ? 'selected' : ''}>${y}</option>`).join('')}</select>${ceo ? '<button class="btn" id="lcCfg">Dados do produtor, imóveis e contas</button>' : ''}<button class="btn primary" id="lcGen">Gerar arquivo LCDPR</button></div></div>
      ${r.warnings.length ? `<div class="card soft"><b>Antes de entregar, resolva:</b><ul>${r.warnings.map(w => `<li>${L(w)}</li>`).join('')}</ul></div>` : '<div class="card soft"><span class="badge green">Pronto</span> Nenhuma pendência encontrada. Confira o arquivo no programa da Receita antes de transmitir.</div>'}
      <div class="section-head"><div><h2>Lançamentos do ano</h2><p>Informe o CPF/CNPJ do comprador ou fornecedor e o documento de cada lançamento. Só entram as fazendas cadastradas como imóvel.</p></div></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Fazenda</th><th>Histórico</th><th>Entrada</th><th>Saída</th><th>Participante</th><th>Documento</th><th></th></tr></thead><tbody>${list.map(({ farm, f, l }) => `<tr><td>${dateBR(f.date)}</td><td>${L(farm.name)}</td><td>${L([f.category, f.description].filter(Boolean).join(' · '))}</td><td>${f.type === 'entrada' ? money(f.value) : ''}</td><td>${f.type === 'saida' ? money(f.value) : ''}</td><td>${LCDPR.validDoc(l.partic) ? L(l.partic) : '<span class="badge gold">Falta CPF/CNPJ</span>'}</td><td>${L(LCDPR.TIPO_DOC[l.tipoDoc || (f.noteId ? 1 : 6)])}${l.numDoc ? ' ' + L(l.numDoc) : ''}</td><td>${ceo || canSee('financeiro') ? `<button class="btn small lc-edit" data-farm="${L(farm.id)}" data-id="${L(f.id)}">Completar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">Nenhum lançamento neste ano nas fazendas cadastradas como imóvel.</div>'}`;
    $('#lcYear').onchange = e => { lcdprYear = Number(e.target.value); renderLcdpr(); };
    $('#lcGen').onclick = () => {
      const out = LCDPR.build(data, lcdprYear, data.lcdpr || {});
      const blob = new Blob([out.text], { type: 'text/plain' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `LCDPR_${(data.lcdpr?.produtor?.cpf || 'produtor').replace(/\D/g, '')}_${lcdprYear}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast(out.warnings.length ? `Arquivo gerado com ${out.warnings.length} pendência(s). Confira antes de entregar.` : 'Arquivo LCDPR gerado.');
    };
    $$('.lc-edit').forEach(b => b.onclick = async () => {
      const farm = data.farms.find(x => x.id === b.dataset.farm), f = farm.finances.find(x => x.id === b.dataset.id), l = f.lcdpr || {};
      const v = await askForm({ title: 'Lançamento no LCDPR', text: `${dateBR(f.date)} · ${f.description || f.category} · ${money(f.value)}`, fields: [
        { name: 'partic', label: 'CPF ou CNPJ do participante', value: l.partic || '', hint: 'Comprador (receita) ou fornecedor (despesa). Para salários pode ser o CPF do trabalhador ou o seu.' },
        { name: 'tipoDoc', label: 'Tipo de documento', type: 'select', value: String(l.tipoDoc || (f.noteId ? 1 : 6)), options: Object.entries(LCDPR.TIPO_DOC) },
        { name: 'numDoc', label: 'Número do documento', value: l.numDoc || '' },
        { name: 'conta', label: 'Conta usada', type: 'select', value: l.conta || '', options: [['', 'Primeira conta cadastrada'], ...(data.lcdpr?.contas || []).map((c, i) => [String(i + 1), `${String(i + 1).padStart(3, '0')} · ${c.nomeBanco} ${c.agencia}/${c.conta}`]), ['especie', 'Dinheiro em espécie (000)'], ['transito', 'Numerário em trânsito (999)']] },
        ...(f.type === 'entrada' ? [{ name: 'tipoLanc', label: 'Tipo de receita', type: 'select', value: String(l.tipoLanc || 1), options: [['1', 'Receita da atividade rural'], ['3', 'Produto entregue referente a adiantamento']] }] : [])
      ] });
      if (!v) return;
      if (v.partic && !LCDPR.validDoc(v.partic)) return toast('CPF ou CNPJ inválido.');
      f.lcdpr = { partic: v.partic.replace(/\D/g, ''), tipoDoc: Number(v.tipoDoc), numDoc: v.numDoc.trim().slice(0, 60), conta: v.conta, ...(v.tipoLanc ? { tipoLanc: Number(v.tipoLanc) } : {}) };
      saveData(); renderLcdpr();
    });
    if ($('#lcCfg')) $('#lcCfg').onclick = () => lcdprConfig();
  };
  window.lcdprConfig = async function lcdprConfig() {
    const cfg = JSON.parse(JSON.stringify(data.lcdpr || {})), p = cfg.produtor || {}, c = cfg.contador || {};
    const v = await askForm({ title: 'Produtor e contador', wide: true, text: 'Dados do declarante (pessoa física) e do contador responsável.', fields: [
      { name: 'cpf', label: 'CPF do produtor', value: p.cpf || '', required: true }, { name: 'nome', label: 'Nome completo', value: p.nome || '', required: true },
      { name: 'endereco', label: 'Endereço', value: p.endereco || '', required: true }, { name: 'numero', label: 'Número', value: p.numero || '' }, { name: 'complemento', label: 'Complemento', value: p.complemento || '' }, { name: 'bairro', label: 'Bairro/distrito', value: p.bairro || '', required: true },
      { name: 'uf', label: 'UF', value: p.uf || '', required: true }, { name: 'codMun', label: 'Código IBGE do município (7 dígitos)', value: p.codMun || '', required: true }, { name: 'cep', label: 'CEP', value: p.cep || '', required: true }, { name: 'telefone', label: 'Telefone com DDD', value: p.telefone || '' }, { name: 'email', label: 'E-mail', value: p.email || '', required: true },
      { name: 'indInicio', label: 'Início do período', type: 'select', value: String(p.indInicio ?? 0), options: [['0', 'Regular (desde 1º de janeiro)'], ['1', 'Início de atividades no ano'], ['2', 'Passou a ser obrigado no ano']] },
      { name: 'formaApuracao', label: 'Forma de apuração', type: 'select', value: String(cfg.formaApuracao || 1), options: [['1', 'Livro Caixa'], ['2', 'Lucro de 20% da receita bruta (art. 5º Lei 8.023/90)']] },
      { name: 'cNome', label: 'Contador · nome', value: c.nome || '' }, { name: 'cDoc', label: 'Contador · CPF/CNPJ', value: c.doc || '' }, { name: 'cCrc', label: 'Contador · CRC', value: c.crc || '' }, { name: 'cEmail', label: 'Contador · e-mail', value: c.email || '' }, { name: 'cFone', label: 'Contador · telefone', value: c.telefone || '' }
    ] });
    if (!v) return;
    if (!LCDPR.validCPF(v.cpf)) return toast('CPF do produtor inválido.');
    cfg.produtor = { cpf: v.cpf.replace(/\D/g, ''), nome: v.nome.trim(), endereco: v.endereco.trim(), numero: v.numero.trim(), complemento: v.complemento.trim(), bairro: v.bairro.trim(), uf: v.uf.trim().toUpperCase().slice(0, 2), codMun: v.codMun.replace(/\D/g, ''), cep: v.cep.replace(/\D/g, ''), telefone: v.telefone.replace(/\D/g, ''), email: v.email.trim(), indInicio: Number(v.indInicio), sitEspecial: 0 };
    cfg.formaApuracao = Number(v.formaApuracao);
    cfg.contador = { nome: v.cNome.trim(), doc: v.cDoc.replace(/\D/g, ''), crc: v.cCrc.trim(), email: v.cEmail.trim(), telefone: v.cFone.replace(/\D/g, '') };
    // Imóveis: um por fazenda (a ordem define o código 001, 002...).
    cfg.imoveis ||= [];
    for (const farm of data.farms) {
      const cur = cfg.imoveis.find(i => i.farmId === farm.id) || {};
      const w = await askForm({ title: 'Imóvel rural · ' + farm.name, wide: true, text: 'Deixe o CAFIR em branco para não incluir esta fazenda no livro.', fields: [
        { name: 'cafir', label: 'CAFIR / NIRF (8 dígitos)', value: cur.cafir || '' }, { name: 'caepf', label: 'CAEPF (14 dígitos)', value: cur.caepf || '' }, { name: 'ie', label: 'Inscrição estadual', value: cur.ie || '' },
        { name: 'endereco', label: 'Endereço do imóvel', value: cur.endereco || '' }, { name: 'numero', label: 'Número', value: cur.numero || '' }, { name: 'bairro', label: 'Bairro/distrito', value: cur.bairro || '' }, { name: 'uf', label: 'UF', value: cur.uf || cfg.produtor.uf }, { name: 'codMun', label: 'Código IBGE do município', value: cur.codMun || '' }, { name: 'cep', label: 'CEP', value: cur.cep || '' },
        { name: 'tipo', label: 'Tipo de exploração', type: 'select', value: String(cur.tipo || 1), options: Object.entries(LCDPR.TIPO_EXPLORACAO) }, { name: 'participacao', label: 'Participação (%)', type: 'number', min: '0', max: '100', step: '0.01', value: cur.participacao ?? 100 }
      ] });
      if (!w) return;
      cfg.imoveis = cfg.imoveis.filter(i => i.farmId !== farm.id);
      if (w.cafir.trim()) cfg.imoveis.push({ ...cur, farmId: farm.id, nome: farm.name, cafir: w.cafir.replace(/\D/g, ''), caepf: w.caepf.replace(/\D/g, ''), ie: w.ie.replace(/\D/g, ''), endereco: w.endereco.trim(), numero: w.numero.trim(), bairro: w.bairro.trim(), uf: w.uf.trim().toUpperCase().slice(0, 2), codMun: w.codMun.replace(/\D/g, ''), cep: w.cep.replace(/\D/g, ''), tipo: Number(w.tipo), participacao: Number(w.participacao) });
    }
    const a = cfg.contas?.[0] || {};
    const acc = await askForm({ title: 'Conta bancária da atividade rural', text: 'Conta 001 do livro. Para mais contas, repita depois.', fields: [{ name: 'banco', label: 'Código do banco (3 dígitos)', value: a.banco || '' }, { name: 'nomeBanco', label: 'Nome do banco', value: a.nomeBanco || '' }, { name: 'agencia', label: 'Agência (sem dígito)', value: a.agencia || '' }, { name: 'conta', label: 'Conta com dígito', value: a.conta || '' }] });
    if (acc && acc.banco.trim()) { cfg.contas = [{ banco: acc.banco.replace(/\D/g, ''), nomeBanco: acc.nomeBanco.trim(), agencia: acc.agencia.replace(/\D/g, ''), conta: acc.conta.replace(/\D/g, '') }, ...(cfg.contas || []).slice(1)]; }
    data.lcdpr = cfg; saveData(); toast('Dados do LCDPR salvos.'); renderLcdpr();
  };
}
