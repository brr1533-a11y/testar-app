const{test}=require('node:test'),assert=require('node:assert/strict'),{go,reveal}=require('./support/navigation.cjs');
function fixture({direct=true,parent=true,tab=true,states=[false]}={}){
 const events=[],containers=states.map((open,i)=>({getAttribute:async()=>open?'':null,locator:selector=>({click:async()=>{assert.equal(selector,':scope > summary');open=true;events.push('expand:'+i);}})}));
 const item={count:async()=>1,locator:selector=>{assert.equal(selector,'xpath=ancestor::details');return{all:async()=>containers};},click:async()=>{assert.ok(states.length===0||events.length>=states.filter(x=>!x).length);events.push('click');}};
 const page={locator:selector=>{if(selector.includes('data-tab'))return{count:async()=>tab?1:0,click:async()=>events.push('tab')};if(selector.includes('data-page="recebimentos"'))return{count:async()=>direct?1:0,...(direct?item:{})};if(selector.includes('data-page="financeiro-gestao"'))return parent?item:{count:async()=>0};return direct?item:{count:async()=>0};}};
 return{page,item,events};
}
test('Navegação abre categoria fechada antes do clique, sem forçar o item',async()=>{const f=fixture();await go(f.page,'talhoes');assert.deepEqual(f.events,['expand:0','click']);});
test('Navegação preserva categorias abertas e abre ancestrais externos primeiro',async()=>{const f=fixture({states:[false,false,true]});await reveal(f.item);assert.deepEqual(f.events,['expand:0','expand:1']);});
test('Navegação por aba abre categoria do pai antes de clicar na aba',async()=>{const f=fixture({direct:false});await go(f.page,'recebimentos');assert.deepEqual(f.events,['expand:0','click','tab']);});
test('Ausência de acesso continua sendo erro; auxiliar não cria botão nem contorna permissão',async()=>{const f=fixture({direct:false,parent:false});await assert.rejects(go(f.page,'recebimentos'),/sem entrada/);await assert.rejects(go(f.page,'usuarios'),/sem entrada/);await assert.rejects(go(f.page,'bad"]'),/inválida/);});
