/* 4.24 · Conferência no servidor dos lançamentos que antes não tinham regra nenhuma: Financeiro, despesas, Estoque e Talhões.
   O "usuário bagunceiro" gravou valor -500, "abc", 1e300, tipo "roubo", data 202620-01-01, descrição de 300 mil caracteres
   e id repetido, e tudo voltou 200. Só confere registros NOVOS ou ALTERADOS: dado antigo fora da regra não trava o grupo. */
(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.RuralLancamentos = api; })(globalThis, function () {
  'use strict';
  const MAX_VALOR = 1e10, DATA_MIN = '1990-01-01', DATA_MAX = '2100-12-31';
  const check = (ok, message) => { if (!ok) throw Object.assign(new Error(message), { statusCode: 422 }); };
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const data = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= DATA_MIN && v <= DATA_MAX && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v;
  const texto = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const textoOpc = (v, max) => v == null || v === '' || typeof v === 'string' && v.length <= max;
  // Registros novos ou com conteúdo diferente do que já estava gravado.
  function mudados(antes, depois) { const old = new Map((antes || []).map(r => [String(r?.id), JSON.stringify(r)])); return (depois || []).filter(r => old.get(String(r?.id)) !== JSON.stringify(r)); }
  function idsUnicos(lista, nome) { const vistos = new Set(); for (const r of lista || []) { const id = String(r?.id ?? ''); check(id && id.length <= 100 && !vistos.has(id), `${nome}: identificação vazia ou repetida.`); vistos.add(id); } }

  function prepare(before, after) {
    for (const f of after.farms || []) {
      const old = (before.farms || []).find(o => o.id === f.id) || {};
      if (Array.isArray(f.finances)) {
        idsUnicos(f.finances, 'Financeiro');
        for (const r of mudados(old.finances, f.finances)) {
          check(r.type === 'entrada' || r.type === 'saida', 'Financeiro: o tipo precisa ser entrada ou saída.');
          check(num(r.value) && r.value > 0 && r.value <= MAX_VALOR, 'Financeiro: informe um valor maior que zero e até R$ 10 bilhões.');
          check(data(r.date), 'Financeiro: confira a data (entre 1990 e 2100).');
          check(texto(r.description, 300), 'Financeiro: escreva uma descrição (até 300 letras).');
          check(textoOpc(r.category, 80) && textoOpc(r.supplier, 120) && textoOpc(r.notes, 1000), 'Financeiro: categoria, fornecedor ou observação longos demais.');
        }
      }
      const ops = f.operations?.expenses;
      if (Array.isArray(ops)) for (const r of mudados(old.operations?.expenses, ops)) {
        check(num(r.amount) && r.amount > 0 && r.amount <= MAX_VALOR, 'Custo: informe um valor maior que zero e até R$ 10 bilhões.');
        check(data(r.date), 'Custo: confira a data (entre 1990 e 2100).');
        check(textoOpc(r.description, 300), 'Custo: descrição longa demais.');
      }
      if (Array.isArray(f.stock)) {
        idsUnicos(f.stock, 'Estoque');
        for (const r of mudados(old.stock, f.stock)) {
          check(texto(r.item, 120) && texto(r.unit, 20), 'Estoque: informe o produto (até 120 letras) e a unidade.');
          // Saldo pode ficar negativo quando o banho usa mais do que havia (fica anotado); o resto não.
          check(num(Number(r.quantity)) && Math.abs(Number(r.quantity)) <= 1e9, 'Estoque: quantidade inválida.');
          check((r.min == null || num(Number(r.min)) && Number(r.min) >= 0 && Number(r.min) <= 1e9) && (r.unitCost == null || num(Number(r.unitCost)) && Number(r.unitCost) >= 0 && Number(r.unitCost) <= MAX_VALOR), 'Estoque: mínimo e custo unitário não podem ser negativos.');
        }
      }
      if (Array.isArray(f.talhoes)) {
        idsUnicos(f.talhoes, 'Talhões');
        for (const r of mudados(old.talhoes, f.talhoes)) check(texto(r.name, 120) && (r.areaHa == null || r.areaHa === '' || num(Number(r.areaHa)) && Number(r.areaHa) > 0 && Number(r.areaHa) <= 1e6), 'Talhão: informe o nome e uma área maior que zero.');
      }
    }
    return after;
  }
  return { prepare, MAX_VALOR, DATA_MIN, DATA_MAX };
});
