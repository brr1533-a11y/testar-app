/* Ferramentas de gestão e compra de insumos — regras compartilhadas pelo navegador e pelo servidor.
   Financeiro, fiscal, conciliação bancária e contratos de venda organizam o dinheiro, as notas e as vendas da fazenda;
   não compram nada. Pedidos de compra organizam e aprovam internamente o que a fazenda vai comprar; a cotação de
   insumos compara preços para essa decisão. Nenhuma compra ou emissão oficial é feita pelo sistema. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./rural-domain.js'):root.RuralDomain);if(typeof module==='object'&&module.exports)module.exports=api;else root.FarmManagement=api;})(globalThis,function(D){
 'use strict';
 const KEYS=['payables','purchaseOrders','quotes','salesContracts','bankEntries','fiscalDocs'];
 const QUOTE_CHANNELS=['site','whatsapp','telefone','visita','email'];
 // Cotação sem conferência automática (WhatsApp, telefone...) é considerada velha depois destes dias.
 const QUOTE_STALE_DAYS=7;
 // Data do preço: a da cotação ou a da última troca de preço (a mais nova); no link conferido, a da conferência.
 function priceDate(q){const a=String(q.date||''),b=String(q.priceUpdatedAt||'').slice(0,10);return b>a?b:a;}
 function quoteAgeDays(q,on=today()){const ref=String(q.priceCheck?.status==='ok'&&q.priceCheck.checkedAt||priceDate(q)).slice(0,10);if(!D.validDate(ref))return null;return Math.max(0,Math.round((Date.parse(on)-Date.parse(ref))/86400000));}
 function quoteStale(q,on=today()){const age=quoteAgeDays(q,on);return age!=null&&age>QUOTE_STALE_DAYS;}
 function whatsappLink(q,itemName){const n=String(q.whatsapp||'').replace(/\D/g,'');if(!n)return '';const full=n.length<=11?'55'+n:n;return 'https://wa.me/'+full+'?text='+encodeURIComponent(`Olá! Pode me passar o preço atualizado de ${itemName||q.itemName} (${q.unit})?`);}
 // Só o CEO vê e altera estes (dinheiro da fazenda). O ADM continua sem acesso ao balanço.
 const CEO_ONLY=['payables','salesContracts','bankEntries'];
 const ORDER_STATUS=['pending','approved','rejected','received','canceled'];
 const FISCAL_KINDS=['nfe-entrada','nfe-saida','mdfe'];
 const cents=v=>Math.round((Number(v)+Number.EPSILON)*100),money=v=>cents(v)/100;
 const fail=(message,statusCode=400)=>{throw Object.assign(new Error(message),{statusCode});};
 const check=(ok,msg)=>{if(!ok)fail(msg);};
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const clone=v=>JSON.parse(JSON.stringify(v));
 const text=(v,max)=>typeof v==='string'&&v.length<=max;
 const filled=(v,max)=>text(v,max)&&v.trim().length>0;
 const optText=(v,max)=>v==null||v===''||text(v,max);
 const num=v=>typeof v==='number'&&Number.isFinite(v);
 const pos=v=>num(v)&&v>0;
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
 const today=()=>new Date().toISOString().slice(0,10);
 const norm=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

 function init(f){f.management||={};for(const k of KEYS)if(!Array.isArray(f.management[k]))f.management[k]=[];return f.management;}

 // ---------- Insumos acabando e menor preço ----------
 // Item "acabando": quantidade no mínimo ou abaixo. "Perto do mínimo": até 25% acima do mínimo.
 // Valor do pedido; sem preço em algum item não há como conferir a alçada (fica com o CEO).
 function orderTotal(o){if((o.items||[]).some(i=>!(i.unitPrice>0)))return null;return Math.round(o.items.reduce((n,i)=>n+i.unitPrice*i.quantity,0)*100)/100;}
 function stockLevel(item){const q=Number(item.quantity||0),m=Number(item.min||0);if(!(m>0))return q<=0?'out':'ok';if(q<=0)return 'out';if(q<=m)return 'low';if(q<=m*1.25)return 'near';return 'ok';}
 // Mesmo produto entre cotação, nota e estoque: pelo id do item ou pelo nome normalizado.
 function sameProduct(stockItem,row){return (row.stockId&&row.stockId===stockItem.id)||(!row.stockId&&norm(row.itemName||row.name)===norm(stockItem.item));}
 // Custo por unidade da cotação, já com o frete dividido pela quantidade cotada.
 function unitTotal(q){const freight=pos(q.freight)&&pos(q.quantity)?q.freight/q.quantity:0;return money(q.unitPrice+freight);}
 function quotesFor(farm,stockItem,on=today()){return (farm.management?.quotes||[]).filter(q=>sameProduct(stockItem,q)&&!q.discarded&&(!q.validUntil||q.validUntil>=on)).map(q=>({...q,unitTotal:unitTotal(q)})).sort((a,b)=>a.unitTotal-b.unitTotal||String(b.date).localeCompare(String(a.date)));}
 // Últimos preços pagos, a partir das notas de entrada registradas (NF-e importada ou digitada).
 function paidHistory(farm,stockItem){return (farm.management?.fiscalDocs||[]).filter(d=>d.kind==='nfe-entrada'&&!d.canceled).flatMap(d=>(d.items||[]).filter(i=>norm(i.name)===norm(stockItem.item)||(i.stockId&&i.stockId===stockItem.id)).map(i=>({date:d.date,supplier:d.party,number:d.number,unitPrice:i.unitPrice,unit:i.unit}))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
 function shoppingList(farm,activity){return (farm.stock||[]).filter(i=>(i.activity||'coffee')===activity).map(item=>{const level=stockLevel(item),quotes=quotesFor(farm,item),history=paidHistory(farm,item),need=Math.max(0,Number(item.min||0)*2-Number(item.quantity||0));return {item,level,quotes,best:quotes[0]||null,lastPaid:history[0]||null,suggestedQty:Math.round(need*1000)/1000};}).sort((a,b)=>['out','low','near','ok'].indexOf(a.level)-['out','low','near','ok'].indexOf(b.level)||String(a.item.item).localeCompare(String(b.item.item),'pt-BR'));}
 // Links de busca para o produto (o sistema não compra nem lê preços de lojas; abre a pesquisa para a pessoa comparar).
 function searchLinks(name){const q=String(name||'').trim();return [{label:'Google Shopping',url:'https://www.google.com/search?tbm=shop&q='+encodeURIComponent(q)},{label:'Mercado Livre',url:'https://lista.mercadolivre.com.br/'+encodeURIComponent(q.replace(/\s+/g,'-'))}];}

 // ---------- Contas a pagar ----------
 function payableBalance(p){return p.status==='paid'?0:p.status==='canceled'?0:money(p.amount);}

 // ---------- Contratos de venda ----------
 function contractDelivered(c){return Math.round((c.deliveries||[]).reduce((n,d)=>n+d.kg,0)*1000)/1000;}
 function contractBalance(c){return Math.round((c.quantityKg-contractDelivered(c))*1000)/1000;}

 // ---------- Conciliação bancária ----------
 // Lê extrato em CSV (data;descrição;valor) ou OFX. Valores negativos são saídas.
 function parseStatement(raw,fileName=''){
  const src=String(raw||'');const rows=[];
  if(/<OFX>|<STMTTRN>/i.test(src)||/\.ofx$/i.test(fileName)){
   for(const block of src.split(/<STMTTRN>/i).slice(1)){const tag=t=>(block.match(new RegExp('<'+t+'>([^<\\r\\n]*)','i'))||[])[1]?.trim()||'';const d=tag('DTPOSTED');const amount=Number(tag('TRNAMT').replace(',','.'));if(/^\d{8}/.test(d)&&Number.isFinite(amount))rows.push({date:d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8),description:(tag('MEMO')||tag('NAME')||'Lançamento').slice(0,160),amount:money(amount),fitid:tag('FITID').slice(0,80)});}
   return rows;
  }
  const lines=src.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  for(const line of lines){
   const sep=line.includes(';')?';':',';const cols=line.split(sep).map(c=>c.replace(/^"|"$/g,'').trim());if(cols.length<3)continue;
   let [d,desc,val]=[cols[0],cols[1],cols[cols.length-1]];
   const br=d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(br)d=br[3]+'-'+br[2]+'-'+br[1];
   if(!D.validDate(d))continue;
   const v=Number(val.replace(/[R$\s]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));if(!Number.isFinite(v)||v===0)continue;
   rows.push({date:d,description:desc.slice(0,160)||'Lançamento',amount:money(v),fitid:''});
  }
  return rows;
 }
 // Sugere o lançamento do Financeiro que bate com a linha do extrato: mesmo valor (entrada/saída) e data até 3 dias de diferença.
 function suggestMatch(farm,entry,taken=new Set()){
  const target=Math.abs(entry.amount),type=entry.amount>=0?'entrada':'saida',t=Date.parse(entry.date);
  return (farm.finances||[]).filter(x=>!taken.has(x.id)&&x.type===type&&cents(x.value)===cents(target)&&Math.abs(Date.parse(x.date)-t)<=3*86400000).sort((a,b)=>Math.abs(Date.parse(a.date)-t)-Math.abs(Date.parse(b.date)-t))[0]||null;
 }

 // ---------- Fiscal: leitura do XML da NF-e ----------
 // Só organiza e registra a nota; emissão e transmissão oficiais (SEFAZ) são feitas no emissor com certificado digital.
 function parseNFeXML(xml,DOMParserImpl){
  const P=DOMParserImpl||(typeof DOMParser!=='undefined'?DOMParser:null);check(P,'Leitura de XML indisponível.');
  const doc=new P().parseFromString(String(xml||''),'application/xml');check(!doc.getElementsByTagName('parsererror').length,'Arquivo XML inválido.');
  const first=(el,tag)=>el.getElementsByTagName(tag)[0];const val=(el,tag)=>first(el,tag)?.textContent?.trim()||'';
  const inf=first(doc,'infNFe');check(inf,'Este XML não é uma NF-e.');
  const ide=first(inf,'ide'),emit=first(inf,'emit'),dest=first(inf,'dest'),tot=first(inf,'ICMSTot');
  const items=[...inf.getElementsByTagName('det')].map(det=>{const p=first(det,'prod');return {productCode:val(p,'cProd').slice(0,60),ncm:val(p,'NCM').slice(0,8),cfop:val(p,'CFOP').slice(0,4),name:val(p,'xProd').slice(0,160),quantity:Number(val(p,'qCom')),unit:val(p,'uCom').slice(0,20),unitPrice:money(Number(val(p,'vUnCom')))};}).filter(i=>i.name&&pos(i.quantity)&&pos(i.unitPrice)).slice(0,500);
  return {city:val(emit,'xMun').slice(0,120),uf:val(emit,'UF').slice(0,2),municipalityCode:val(emit,'cMun').slice(0,7),key:(inf.getAttribute('Id')||'').replace(/^NFe/,'').slice(0,44),number:val(ide,'nNF').slice(0,20),series:val(ide,'serie').slice(0,5),date:(val(ide,'dhEmi')||val(ide,'dEmi')).slice(0,10),emitName:val(emit,'xNome').slice(0,160),emitDoc:(val(emit,'CNPJ')||val(emit,'CPF')).slice(0,18),destName:dest?val(dest,'xNome').slice(0,160):'',destDoc:dest?(val(dest,'CNPJ')||val(dest,'CPF')).slice(0,18):'',total:money(Number(val(tot,'vNF'))),items};
 }

 // ---------- Validação ----------
 function validateFarm(f){
  const m=init(f),cycles=new Map((f.agriculture?.cycles||[]).map(c=>[c.id,c])),lots=new Map((f.cattle?.lots||[]).map(l=>[l.id,l])),stock=new Map((f.stock||[]).map(s=>[s.id,s]));
  for(const k of KEYS){check(m[k].length<=20000,'Lista de gestão grande demais.');const ids=new Set();for(const r of m[k]){check(r&&id(r.id)&&!ids.has(r.id),'Identificação de registro de gestão inválida ou repetida.');ids.add(r.id);check(!r.activity||D.ACTIVITIES.includes(r.activity),'Atividade inválida.');check(!r.date||D.validDate(r.date),'Data inválida.');}}
  for(const p of m.payables){check(filled(p.supplier,160)&&filled(p.description,200)&&optText(p.category,80)&&pos(p.amount)&&Math.abs(cents(p.amount)-p.amount*100)<0.000001&&D.validDate(p.dueDate)&&['open','paid','canceled'].includes(p.status),'Confira fornecedor, descrição, valor e vencimento da conta.');if(p.cycleId)check(cycles.get(p.cycleId)?.activity===p.activity,'Rateio: escolha uma safra da atividade.');if(p.lotId)check(p.activity==='cattle'&&lots.has(p.lotId),'Rateio: lote não encontrado.');if(p.status==='paid')check(D.validDate(p.paidDate)&&p.paidDate<=today(),'Data de pagamento inválida.');check(optText(p.notes,1000)&&optText(p.document,60),'Observações longas demais.');check(p.toStock==null||p.toStock===true&&!p.cycleId&&!p.lotId,'Compra para o estoque não tem rateio: o custo entra no consumo.');}
  for(const o of m.purchaseOrders){check(Array.isArray(o.items)&&o.items.length>=1&&o.items.length<=50,'O pedido precisa de 1 a 50 itens.');for(const i of o.items){check(filled(i.name,160)&&pos(i.quantity)&&filled(i.unit,20)&&(i.unitPrice==null||pos(i.unitPrice)),'Confira produto, quantidade, unidade e preço dos itens do pedido.');check(!i.stockId||stock.has(i.stockId),'Item do pedido não encontrado no estoque.');}check(ORDER_STATUS.includes(o.status)&&filled(o.justification,500)&&optText(o.supplier,160)&&optText(o.decisionNote,500),'Confira a justificativa e a situação do pedido.');}
  for(const q of m.quotes){check(filled(q.itemName,160)&&filled(q.supplier,160)&&pos(q.unitPrice)&&filled(q.unit,20)&&(q.quantity==null||pos(q.quantity))&&(q.freight==null||num(q.freight)&&q.freight>=0)&&(!q.validUntil||D.validDate(q.validUntil))&&optText(q.notes,500),'Confira produto, fornecedor, preço e unidade da cotação.');check(!q.stockId||stock.has(q.stockId),'Item da cotação não encontrado no estoque.');check(!q.link||(text(q.link,500)&&/^https:\/\/[^\s<>"']+$/i.test(q.link)),'O link da cotação precisa começar com https://.');check((!q.channel||QUOTE_CHANNELS.includes(q.channel))&&(!q.whatsapp||/^\d{10,13}$/.test(q.whatsapp))&&(q.autoUpdate==null||typeof q.autoUpdate==='boolean'),'Confira o canal e o número de WhatsApp (só números, com DDD).');check(Array.isArray(q.priceHistory||[])&&(q.priceHistory||[]).length<=60&&(q.priceCheck==null||typeof q.priceCheck==='object'),'Histórico de preço inválido.');}
  for(const c of m.salesContracts){check(filled(c.buyer,160)&&filled(c.product,120)&&pos(c.quantityKg)&&pos(c.pricePerKg)&&D.validDate(c.deliveryStart)&&D.validDate(c.deliveryEnd)&&c.deliveryEnd>=c.deliveryStart&&['open','closed','canceled'].includes(c.status)&&optText(c.notes,1000)&&optText(c.number,40),'Confira comprador, produto, quantidade, preço e período de entrega do contrato.');if(c.cycleId)check(cycles.get(c.cycleId)?.activity===c.activity,'Safra do contrato inválida.');check(Array.isArray(c.deliveries||[])&&(c.deliveries||[]).length<=1000,'Entregas inválidas.');const dids=new Set();for(const d of c.deliveries||[]){check(id(d.id)&&!dids.has(d.id)&&D.validDate(d.date)&&d.date<=today()&&pos(d.kg)&&optText(d.note,300),'Confira data e peso da entrega.');dids.add(d.id);}check(contractDelivered(c)<=c.quantityKg+0.000001,'As entregas superam a quantidade do contrato.');}
  for(const b of m.bankEntries){check(filled(b.description,160)&&num(b.amount)&&b.amount!==0&&optText(b.fitid,80)&&optText(b.batch,60),'Linha de extrato inválida.');if(b.financeId)check((f.finances||[]).some(x=>x.id===b.financeId),'Lançamento conciliado não encontrado.');}
  const matched=m.bankEntries.filter(b=>b.financeId).map(b=>b.financeId);check(new Set(matched).size===matched.length,'Um lançamento do Financeiro só pode ser conciliado com uma linha do extrato.');
  for(const d of m.fiscalDocs){check(FISCAL_KINDS.includes(d.kind)&&filled(d.number,20)&&optText(d.series,5)&&(!d.key||/^\d{44}$/.test(d.key))&&filled(d.party,160)&&optText(d.partyDoc,18)&&(d.total==null||num(d.total)&&d.total>=0)&&optText(d.notes,1000),'Confira tipo, número, data, emitente/destinatário e chave (44 dígitos) do documento.');if(d.kind==='mdfe')check(optText(d.plate,10)&&optText(d.route,200),'Confira placa e percurso do MDF-e.');check(Array.isArray(d.items||[])&&(d.items||[]).length<=500,'Itens da nota inválidos.');for(const i of d.items||[])check(filled(i.name,160)&&pos(i.quantity)&&optText(i.unit,20)&&pos(i.unitPrice),'Item da nota inválido.');}
  const keys=m.fiscalDocs.filter(d=>d.key&&!d.canceled).map(d=>d.key);check(new Set(keys).size===keys.length,'Esta NF-e (mesma chave) já está registrada.');
 }
 function validate(state){for(const f of state.farms||[])validateFarm(f);return state;}

 // ---------- Regras de quem pode o quê (aplicadas pelo servidor antes de gravar) ----------
 function prepare(before,after,user,now=new Date().toISOString()){
  const who=user.name||user.username,ceo=user.role==='ceo';
  for(const f of after.farms||[]){
   const prior=(before.farms||[]).find(x=>x.id===f.id)||{},old=init(clone(prior)),m=init(f);
   // Fora do CEO, o que é dinheiro da fazenda volta a ser exatamente o que estava gravado.
   if(!ceo)for(const k of CEO_ONLY)if(!(user.managementKeys||[]).includes(k))m[k]=clone(old[k]);
   if(user.role==='contribuinte')for(const k of KEYS)m[k]=clone(old[k]);
   // Contas pagas ou canceladas não mudam; ao pagar, o servidor lança a saída no Financeiro (uma vez).
   for(const p of old.payables){const n=m.payables.find(x=>x.id===p.id);check(n,'Conta a pagar registrada não pode ser apagada; cancele-a.');if(p.status!=='open')check(same(p,n),'Conta paga ou cancelada não pode ser alterada.');}
   for(const p of m.payables){const o=old.payables.find(x=>x.id===p.id);if(!o){p.createdBy=who;p.createdAt=now;check(p.status==='open','Conta nova começa em aberto.');continue;}
    if(o.status==='open'&&p.status==='paid'){p.paidBy=who;p.paidAt=now;f.finances||=[];const fid='payable_'+p.id;check(!f.finances.some(x=>x.id===fid),'Pagamento duplicado.');f.finances.push({id:fid,activity:p.activity,type:'saida',category:p.category||'Contas a pagar',description:p.supplier+' · '+p.description,date:p.paidDate,value:p.amount,sourcePayableId:p.id,cycleId:p.cycleId||'',lotId:p.lotId||'',createdBy:who,createdAt:now});}
    if(o.status==='open'&&p.status==='canceled'){check(text(p.cancelReason,300)&&p.cancelReason.trim().length>=3,'Informe o motivo do cancelamento.');p.canceledBy=who;p.canceledAt=now;}
   }
   // Saída financeira gerada pelo pagamento fica preservada.
   for(const p of old.payables.filter(p=>p.status==='paid')){const fid='payable_'+p.id,orig=(prior.finances||[]).find(x=>x.id===fid);if(orig){f.finances||=[];const i=f.finances.findIndex(x=>x.id===fid);if(i<0)f.finances.push(orig);else f.finances[i]=orig;}}
   // Pedidos de compra: ADM pede; só o CEO aprova ou recusa; o recebimento entra no estoque uma única vez.
   for(const o of old.purchaseOrders){const n=m.purchaseOrders.find(x=>x.id===o.id);check(n,'Pedido de compra registrado não pode ser apagado; cancele-o.');if(['rejected','received','canceled'].includes(o.status))check(same(o,n),'Pedido encerrado não pode ser alterado.');if(o.status==='approved'){check(['approved','received','canceled'].includes(n.status),'Pedido aprovado só pode ser recebido ou cancelado.');for(const k of ['items','supplier','justification','decidedBy','decidedAt','decisionNote','requestedBy','createdAt'])check(same(o[k],n[k]),'Pedido aprovado não pode ser alterado.');}}
   for(const o of m.purchaseOrders){const prev=old.purchaseOrders.find(x=>x.id===o.id);
    if(!prev){check(['ceo','adm'].includes(user.role),'Somente CEO e ADM fazem pedidos de compra.');check(o.status==='pending','Pedido novo começa aguardando aprovação.');o.requestedBy=who;o.createdAt=now;delete o.decidedBy;delete o.decidedAt;continue;}
    if(prev.status==='pending'){
     if(['approved','rejected'].includes(o.status)){const value=orderTotal(o);check(ceo||(user.approvalLimit>0&&value!=null&&value<=user.approvalLimit),'Este pedido precisa da aprovação do CEO (acima da alçada do ADM ou sem preço).');o.decidedBy=who;o.decidedAt=now;}
     else if(o.status==='pending'){for(const k of ['requestedBy','createdAt'])o[k]=prev[k];}
     else check(o.status==='canceled','Situação do pedido inválida.');
     if(o.status==='canceled'){check(ceo||prev.requestedBy===who,'Só quem pediu (ou o CEO) cancela o pedido.');o.canceledBy=who;o.canceledAt=now;}
    }
    if(prev.status==='approved'&&o.status==='received'){o.receivedBy=who;o.receivedAt=now;
     for(const it of o.items){if(!it.stockId)continue;const item=(f.stock||[]).find(s=>s.id===it.stockId);if(!item)continue;item.quantity=Math.round((Number(item.quantity||0)+it.quantity)*1000)/1000;if(pos(it.unitPrice))item.unitCost=it.unitPrice;item.moves||=[];item.moves.push({id:'po_'+o.id+'_'+it.stockId,at:now,delta:it.quantity,reason:'Recebido do pedido de compra',by:who});}
    }
    if(prev.status==='approved'&&o.status==='canceled'){check(ceo,'Somente o CEO cancela um pedido aprovado.');o.canceledBy=who;o.canceledAt=now;}
   }
   // Cotações: CEO e ADM registram; autoria e data de registro vêm do servidor.
   // O histórico de preço e a última conferência automática são do servidor: o navegador não inventa nem apaga.
   // Preço trocado à mão (ex.: o fornecedor mandou outro valor no WhatsApp) entra no histórico como "manual".
   for(const q of m.quotes){const prev=old.quotes.find(x=>x.id===q.id);if(!prev){check(['ceo','adm'].includes(user.role),'Somente CEO e ADM registram cotações.');q.recordedBy=who;q.createdAt=now;q.priceHistory=[{at:now,unitPrice:q.unitPrice,source:'manual',by:who}];delete q.priceCheck;delete q.priceUpdatedAt;}else{q.recordedBy=prev.recordedBy;q.createdAt=prev.createdAt;q.priceHistory=prev.priceHistory||[];if(prev.priceCheck&&prev.link===q.link)q.priceCheck=prev.priceCheck;else delete q.priceCheck;if(prev.priceUpdatedAt)q.priceUpdatedAt=prev.priceUpdatedAt;else delete q.priceUpdatedAt;if(Math.abs(Number(q.unitPrice)-Number(prev.unitPrice))>=0.005){q.priceHistory=[...q.priceHistory,{at:now,unitPrice:q.unitPrice,source:'manual',by:who}].slice(-60);q.priceUpdatedAt=now;if(q.priceCheck)q.priceCheck={...q.priceCheck,status:q.priceCheck.status==='review'?'ok':q.priceCheck.status,previousPrice:prev.unitPrice,lastChangeAt:now,direction:q.unitPrice>prev.unitPrice?'up':'down'};}}}
   // Contratos: entregas registradas não somem nem mudam.
   for(const c of old.salesContracts){const n=m.salesContracts.find(x=>x.id===c.id);check(n,'Contrato registrado não pode ser apagado; cancele-o.');for(const d of c.deliveries||[])check((n.deliveries||[]).some(x=>x.id===d.id&&same(x,d)),'Entrega registrada não pode ser apagada ou alterada.');if((c.deliveries||[]).length)for(const k of ['buyer','product','quantityKg','pricePerKg','activity'])check(same(c[k],n[k]),'Contrato com entregas não pode mudar comprador, produto, quantidade ou preço.');}
   for(const c of m.salesContracts){const prev=old.salesContracts.find(x=>x.id===c.id);if(!prev){c.createdBy=who;c.createdAt=now;}for(const d of c.deliveries||[])if(!(prev?.deliveries||[]).some(x=>x.id===d.id)){d.recordedBy=who;d.createdAt=now;}}
   // Notas e MDF-e: não são apagadas; podem ser marcadas como canceladas, com motivo.
   for(const d of old.fiscalDocs){const n=m.fiscalDocs.find(x=>x.id===d.id);check(n,'Documento fiscal registrado não pode ser apagado; marque como cancelado.');const {canceled,cancelReason,canceledBy,canceledAt,...rest}=n,{canceled:c0,cancelReason:r0,canceledBy:b0,canceledAt:a0,...orig}=d;check(same(orig,rest),'Documento fiscal registrado não pode ser alterado.');if(d.canceled)check(same([c0,r0,b0,a0],[canceled,cancelReason,canceledBy,canceledAt]),'Cancelamento já registrado não pode ser desfeito.');else if(n.canceled){check(text(n.cancelReason,300)&&n.cancelReason.trim().length>=3,'Informe o motivo do cancelamento.');n.canceledBy=who;n.canceledAt=now;}}
   for(const d of m.fiscalDocs)if(!old.fiscalDocs.some(x=>x.id===d.id)){check(['ceo','adm'].includes(user.role),'Somente CEO e ADM registram documentos fiscais.');d.recordedBy=who;d.createdAt=now;delete d.canceled;delete d.cancelReason;}
   // Extrato: linhas importadas não somem; a conciliação (vínculo com o Financeiro) pode ser feita ou desfeita pelo CEO.
   for(const b of old.bankEntries){const n=m.bankEntries.find(x=>x.id===b.id);check(n,'Linha de extrato importada não pode ser apagada.');for(const k of ['date','description','amount','fitid','batch','importedAt'])check(same(b[k],n[k]),'Linha de extrato importada não pode ser alterada.');}
   for(const b of m.bankEntries){const prev=old.bankEntries.find(x=>x.id===b.id);if(!prev){b.importedAt=now;b.importedBy=who;}if(b.financeId&&b.financeId!==prev?.financeId){b.matchedBy=who;b.matchedAt=now;}if(!b.financeId){delete b.matchedBy;delete b.matchedAt;}}
  }
  for(const f of before.farms||[])if(!after.farms?.some(n=>n.id===f.id)&&KEYS.some(k=>(f.management?.[k]||[]).length))fail('A fazenda possui registros de gestão. Preserve o histórico.',403);
  validate(after);
 }
 // O que cada perfil recebe do servidor.
 function forRole(farm,role,keys=[]){const m=init(farm);if(role!=='ceo')for(const k of CEO_ONLY)if(!keys.includes(k))m[k]=[];if(role==='contribuinte')for(const k of KEYS)m[k]=[];return farm;}
 return {orderTotal,KEYS,QUOTE_CHANNELS,QUOTE_STALE_DAYS,priceDate,quoteAgeDays,quoteStale,whatsappLink,CEO_ONLY,ORDER_STATUS,FISCAL_KINDS,init,stockLevel,quotesFor,paidHistory,shoppingList,searchLinks,unitTotal,payableBalance,contractDelivered,contractBalance,parseStatement,suggestMatch,parseNFeXML,validateFarm,validate,prepare,forRole,norm};
});
