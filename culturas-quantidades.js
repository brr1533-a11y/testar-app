/* Cadastros iniciais conferidos em IAC, Incaper e Embrapa. Não seleciona cultivar automaticamente. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RuralInputs=api;})(globalThis,function(){
 const VARIETIES={
  'Café arábica':['Catuaí Vermelho','Catuaí Amarelo','Mundo Novo','Bourbon Amarelo','Bourbon Vermelho','Obatã','Tupi'],
  'Café conilon':['Vitória Incaper 8142','Diamante ES8112','Jequitibá ES8122','Centenária ES8132','Marilândia ES8143'],
  'Soja':['BRS 284'],'Milho':['BRS 1055'],'Trigo':['BRS 264']
 };
 function toKg(value,unit,bagKg){const amount=Number(value),weight=Number(bagKg);if(!Number.isFinite(amount)||amount<=0||!['kg','bags'].includes(unit)||!Number.isFinite(weight)||weight<=0)throw Error('Informe uma quantidade positiva e o peso válido da saca.');const kg=unit==='bags'?amount*weight:amount;if(!Number.isFinite(kg)||kg<=0)throw Error('Quantidade inválida.');const result=Math.round(kg*1e6)/1e6;if(result<=0)throw Error('A quantidade é pequena demais para registrar em kg.');return result;}
 const varietyOptions=(crop,existing='')=>[['','Não informada'],...(VARIETIES[crop]||[]).map(v=>[v,v]),['__other','Outra variedade / informar']];
 return {VARIETIES,toKg,varietyOptions};
});
