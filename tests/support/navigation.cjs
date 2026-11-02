// Faz os mesmos cliques de uma pessoa. Não força visibilidade, não altera permissões nem preferências.
async function reveal(item) {
  const ancestors = await item.locator('xpath=ancestor::details').all();
  // XPath entrega a ordem do documento: abre os contêineres externos antes dos internos.
  for (const details of ancestors) {
    if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click();
  }
}
async function menuClick(page, id) {
  const item = page.locator('#navMenu [data-page="'+id+'"]');
  if (!await item.count()) throw Error('Página sem entrada no menu: '+id);
  await reveal(item);
  await item.click();
}
async function go(page, id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error('Página inválida: '+id);
  const item = page.locator('#navMenu [data-page="'+id+'"]');
  if (await item.count()) return menuClick(page,id);
  const parent = {recebimentos:'financeiro-gestao','historico-talhoes':'talhoes','log-equipamentos':'equipamentos',notas:'fiscal'}[id];
  if (!parent) throw Error('Página sem entrada no menu: '+id);
  await menuClick(page,parent);
  const tab = page.locator('.page-tab[data-tab="'+id+'"]');
  if (!await tab.count()) throw Error('Aba sem acesso: '+id);
  await tab.click();
}
module.exports = { go, reveal };
