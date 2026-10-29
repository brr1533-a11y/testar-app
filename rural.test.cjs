const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../rural-domain');
const cycle = (overrides = {}) => ({ id:'safra1', activity:'grains', crop:'Soja', name:'Soja 2020/21', areaHa:10, bagKg:60, plannedCost:30000, stage:'Em colheita', startDate:'2020-01-01', ...overrides });
const farm = () => ({ id:'farm1', talhoes:[], agriculture:{ cycles:[cycle()], harvests:[{id:'h1',cycleId:'safra1',date:'2020-05-01',netKg:60000,moisture:13}], sales:[{id:'v1',cycleId:'safra1',date:'2020-05-02',kg:12000,pricePerKg:2}] }, cattle:{lots:[],weighings:[],healthEvents:[]} });
test('mantém migração legada sem perda dos dados de café e gado', () => {
 const f={cattle:{lots:[{id:'l1',heads:5}],weighings:[]},finances:[{activity:'coffee',value:12}]};
 D.farmData(f); D.farmData(f); assert.equal(f.cattle.lots.length,1); assert.equal(f.finances[0].value,12); assert.deepEqual(f.agriculture,{cycles:[],harvests:[],sales:[]});
});
test('permissão both não amplia o acesso legado; all inclui grãos',()=>{
 assert.deepEqual(D.activitiesFor('both'),['coffee','cattle']); assert.deepEqual(D.activitiesFor('grains'),['grains']); assert.deepEqual(D.activitiesFor('all'),['coffee','cattle','grains']);
});
test('calcula safra, saldo, receita comercial e produtividade',()=>{
 const f=farm(); D.validateFarm(f); const s=D.cycleStats(f,f.agriculture.cycles[0]);
 assert.equal(s.harvestedKg,60000); assert.equal(s.availableKg,48000); assert.equal(s.revenue,24000); assert.equal(s.yieldKgHa,6000); assert.equal(s.bags,1000); assert.equal(s.costPerKg,.5);
});
test('receita comercial soma centavos sem resíduos de ponto flutuante',()=>{
 const f=farm(); f.agriculture.sales[0].pricePerKg=132/60;
 assert.equal(D.cycleStats(f,f.agriculture.cycles[0]).revenue,26400);
});
test('café e grãos permanecem em safras distintas com pesos de saca configuráveis',()=>{
 const f=farm(); f.agriculture.cycles.push(cycle({id:'cafe',activity:'coffee',crop:'Café arábica',bagKg:30}));
 f.agriculture.harvests.push({id:'hc',cycleId:'cafe',date:'2020-05-02',netKg:900}); D.validateFarm(f);
 assert.equal(D.cycleStats(f,f.agriculture.cycles[1]).bags,30); assert.equal(D.cycleStats(f,f.agriculture.cycles[0]).availableKg,48000);
});
test('bloqueia venda acima do saldo, inclusive antes da colheita',()=>{
 for(const patch of [{kg:60001},{date:'2020-04-01'}]) {const f=farm();Object.assign(f.agriculture.sales[0],patch);assert.throws(()=>D.validateFarm(f),/saldo/);}
});
test('exclusão de colheita não pode deixar vendas posteriores sem cobertura',()=>{
 const f=farm();f.agriculture.harvests=[];assert.throws(()=>D.validateFarm(f),/saldo/);
});
test('aceita colheita e venda no mesmo dia e tolerância decimal sem saldo negativo material',()=>{
 const f=farm();f.agriculture.sales[0].date='2020-05-01';f.agriculture.sales[0].kg=60000;assert.doesNotThrow(()=>D.validateFarm(f));
});
test('rejeita safra inválida, NaN, IDs repetidos, vínculo de outra fazenda e cultura indevida',()=>{
 for(const patch of [{areaHa:0},{plannedCost:NaN},{crop:'Trigo',activity:'coffee'},{startDate:'2020-02-31'},{expectedDate:'2019-01-01'},{plotId:'outra-fazenda'}]) {const f=farm(); Object.assign(f.agriculture.cycles[0],patch); assert.throws(()=>D.validateFarm(f),e=>e.statusCode===400);}
 const f=farm();f.agriculture.harvests[0].id='safra1';assert.throws(()=>D.validateFarm(f),/repetida/);
});
test('rejeita referência de safra inexistente e umidade fora dos limites',()=>{
 for(const patch of [{cycleId:'ausente'},{moisture:101},{netKg:Infinity}]){const f=farm();Object.assign(f.agriculture.harvests[0],patch);assert.throws(()=>D.validateFarm(f));}
});
test('média do rebanho usa última pesagem de cada lote e pondera pelas cabeças atuais',()=>{
 const f={cattle:{lots:[{id:'a',heads:10},{id:'b',heads:30},{id:'c',heads:4}],weighings:[{id:'1',lotId:'a',date:'2020-01-01',avgKg:100},{id:'2',lotId:'a',date:'2020-02-01',avgKg:400},{id:'3',lotId:'b',date:'2020-02-01',avgKg:200}]}};
 const s=D.herdStats([f]); assert.equal(s.avgKg,250);assert.equal(s.coveredHeads,40);assert.equal(s.heads,44);assert.equal(s.estimatedLiveKg,10000);
});
test('projeção do lote usa datas distintas; sem ganho não projeta meta',()=>{
 const f={cattle:{weighings:[{id:'a',lotId:'l',date:'2020-01-01',avgKg:300},{id:'b',lotId:'l',date:'2020-01-11',avgKg:320},{id:'c',lotId:'l',date:'2020-01-11',avgKg:330}]}};
 const l={id:'l',targetKg:450};const p=D.lotPerformance(f,l);assert.equal(p.dailyGainKg,3);assert.equal(p.daysToTarget,40);
 f.cattle.weighings[2].avgKg=290; assert.equal(D.lotPerformance(f,l).daysToTarget,null);l.targetKg=280;assert.equal(D.lotPerformance(f,l).daysToTarget,0);
});
test('agenda exige lote existente, descrição, data válida e data de realização',()=>{
 const f=farm();f.cattle.lots.push({id:'l',heads:3});const e={id:'e',lotId:'l',type:'Inspeção',title:'Conferir lote',date:'2020-01-01',status:'scheduled'}; f.cattle.healthEvents.push(e);D.validateFarm(f);
 e.status='done';assert.throws(()=>D.validateFarm(f),/realizado/);e.completedDate='2020-01-02';D.validateFarm(f);e.lotId='outra';assert.throws(()=>D.validateFarm(f),/não existe/);
});
test('datas inválidas não geram projeções e ano bissexto é aceito',()=>{
 assert.equal(D.validDate('2020-02-29'),true);assert.equal(D.validDate('2021-02-29'),false);assert.equal(D.days('2020-02-28','2020-03-01'),2);
});
