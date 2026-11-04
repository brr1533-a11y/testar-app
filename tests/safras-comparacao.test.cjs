const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../safras-comparacao-domain');
const cycle=(id,startDate='2025-08-15',bagKg=60)=>({id,name:id,activity:'coffee',crop:'Café arábica',startDate,areaHa:10,bagKg});
const farm=(id,harvests=[])=>({id,name:id,agriculture:{harvests}}),h=(cycleId,date,netKg)=>({cycleId,date,netKg});
test('comparativo alinha meses desde o início e cruza o ano com sacas acumuladas',()=>{
 const a={farm:farm('f',[h('a','2025-08-20',600),h('a','2025-09-01',1200),h('a','2026-01-01',600)]),cycle:cycle('a')},b={farm:farm('g',[h('b','2024-08-20',300)]),cycle:cycle('b','2024-08-15')};
 const m=C.compare(a,b,{asOf:'2026-11-03',bagKg:60});assert.equal(m.length,12);assert.deepEqual(m.series[0].values.slice(0,3),[10,30,30]);assert.equal(m.series[0].values[5],40);assert.equal(m.series[1].values[0],5);
});
test('base comum permite comparar sacas de pesos distintos e produtividade por área',()=>{
 const a={farm:farm('f',[h('a','2025-02-01',600)]),cycle:cycle('a','2025-01-01',60)},b={farm:farm('g',[h('b','2025-02-01',600)]),cycle:{...cycle('b','2025-01-01',30),areaHa:5}};
 const s=C.compare(a,b,{asOf:'2026-01-01',bagKg:60}),y=C.compare(a,b,{asOf:'2026-01-01',bagKg:60,metric:'yield'});assert.equal(s.series[0].values[1],10);assert.equal(s.series[1].values[1],10);assert.equal(y.series[0].values[1],1);assert.equal(y.series[1].values[1],2);
});
test('não mistura culturas nem a mesma safra; produtividade sem área não é inventada',()=>{
 const a={farm:farm('f'),cycle:cycle('a')};assert.equal(C.compare(a,a),null);assert.equal(C.compare(a,{farm:farm('g'),cycle:{...cycle('b'),crop:'Soja'}}),null);assert.equal(C.series(farm('f'),{...cycle('a'),areaHa:0},{metric:'yield'}),null);assert.equal(C.series(farm('f'),cycle('a'),{bagKg:0}),null);
});
test('meses futuros são nulos e lançamentos de outra safra ou do futuro não entram',()=>{
 const s=C.series(farm('f',[h('a','2026-01-20',60),h('a','2026-04-01',9999),h('outra','2026-01-01',9999)]),cycle('a','2026-01-01'),{asOf:'2026-02-15'});assert.equal(s.recorded,1);assert.deepEqual(s.values.slice(0,4),[1,1,null,null]);
});
test('produção vazia não é fictícia; registros fora da janela são identificados',()=>{
 const c=cycle('a','2020-01-01'),s=C.series(farm('f',[h('a','2019-01-01',60),h('a','2025-01-01',60)]),c,{asOf:'2026-11-03'});assert.equal(s.excluded,2);assert.equal(s.recorded,0);assert.ok(s.values.every(v=>v===0));assert.equal(C.series(farm('f'),{...c,startDate:'inválida'}),null);
});
