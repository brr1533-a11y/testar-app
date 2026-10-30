exports.go = async (page, id) => {
  const item = page.locator('#navMenu [data-page="'+id+'"]');
  if (await item.count()) return item.click();
  const parent = {recebimentos:'financeiro-gestao','historico-talhoes':'talhoes','log-equipamentos':'equipamentos',notas:'fiscal'}[id];
  if (!parent) throw Error('Página sem entrada no menu: '+id);
  await page.locator('#navMenu [data-page="'+parent+'"]').click();
  await page.locator('.page-tab[data-tab="'+id+'"]').click();
};
