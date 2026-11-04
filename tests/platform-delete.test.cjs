const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{startServer}=require('./support/server.cjs');
test('exclusão do Super Admin: formulário envia confirmação correta e servidor preserva proteções',async t=>{
 const s=await startServer({PLATFORM_REQUIRE_2FA:'false'});t.after(()=>s.stop());
 const call=async(p,b,token,method)=>{const r=await fetch(s.url+p,{method:method||(b?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(b?{body:JSON.stringify(b)}:{})});return {status:r.status,...await r.json()};};
 const admin=(await call('/api/platform/auth/login',{email:'admin@example.invalid',password:s.password})).token;
 const groups=(await call('/api/platform/groups',null,admin)).groups,seed=groups.find(g=>g.code==='1001');A.ok(seed);
 const created=await call('/api/platform/groups',{groupName:'Grupo descartável · teste de exclusão',ceoName:'Pessoa de teste',ceoEmail:'delete@example.invalid',ceoUser:'deleteowner',ceoPassword:s.password,plan:'essential',activities:['coffee']},admin);A.equal(created.status,200,JSON.stringify(created));const g=created.group,url='/api/platform/groups/'+g.id;
 A.equal((await call(url,{confirmCode:g.code,confirmText:'EXCLUIR'},null,'DELETE')).status,401);
 A.equal((await call(url,{confirmCode:g.code,confirmText:'EXCLUIR'},admin,'DELETE')).status,409);
 A.equal((await call(url+'/archive',{confirmCode:g.code},admin)).status,200);
 for(const b of [{confirmCode:'invalido',confirmText:'EXCLUIR'},{confirmCode:g.code,confirmText:'NAO'},{code:g.code,confirmText:'EXCLUIR'}])A.equal((await call(url,b,admin,'DELETE')).status,400);
 A.equal((await call('/api/platform/groups/'+seed.id,{confirmCode:seed.code,confirmText:'EXCLUIR'},admin,'DELETE')).status,403);
 const source=fs.readFileSync(require.resolve('../platform.js'),'utf8'),button={dataset:{id:g.id,code:g.code,name:g.name}};let refreshed=false;
 const context={document:{querySelectorAll:selector=>selector==='.delete-action'?[button]:[]},esc:String,openDialog:async html=>{const values={};for(const m of html.matchAll(/<input name="([^"]+)"[^>]*>/g))values[m[1]]=m[1]==='confirmText'?'EXCLUIR':g.code;A.deepEqual(Object.keys(values).sort(),['confirmCode','confirmText']);return values;},api:async(p,opt)=>{const result=await call(p,JSON.parse(opt.body),admin,opt.method);A.equal(result.status,200,JSON.stringify(result));return result;},toast:message=>A.equal(message,'Grupo excluído.'),load:()=>{refreshed=true;}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function bindRows(){'),source.indexOf('$("#groupSearch")')),context);context.bindRows();await button.onclick();A.ok(refreshed);
 const remaining=(await call('/api/platform/groups',null,admin)).groups;A.ok(!remaining.some(x=>x.id===g.id));A.ok(remaining.some(x=>x.id===seed.id));A.equal((await call(url,{confirmCode:g.code,confirmText:'EXCLUIR'},admin,'DELETE')).status,404);
});
