const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),jsQR=require('jsqr'),{startServer}=require('./support/server.cjs');

// Rasteriza os traços horizontais do SVG realmente devolvido pela API.
// A leitura é feita por outro decodificador, sem regenerar o QR pelo endereço.
function decodeSVG(svg){
 const size=Number(svg.match(/viewBox="0 0 (\d+) \d+"/)[1]),scale=8,width=size*scale,pixels=new Uint8ClampedArray(width*width*4).fill(255);
 const d=svg.match(/<path stroke="#000000" d="([^"]+)"/)[1];let x=0,y=0;
 for(const m of d.matchAll(/([Mmh])([^Mmh]*)/g)){const values=m[2].trim().split(/[ ,]+/).map(Number);if(m[1]==='M'){[x,y]=values;}else if(m[1]==='m'){x+=values[0];y+=values[1];}else{const end=x+values[0];for(let row=Math.round((y-.5)*scale);row<Math.round((y+.5)*scale);row++)for(let col=x*scale;col<end*scale;col++){const i=(row*width+col)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}x=end;}}
 const decoded=jsQR(pixels,width,width);A.ok(decoded,'O SVG emitido precisa ser legível');return decoded.data;
}

test('QR real decodifica a URL HTTPS privada e bloqueia visitante, funcionário, ADM sem permissão e lote inexistente',async t=>{
 const s=await startServer({PUBLIC_BASE_URL:'https://fazenda.example.invalid',PRICE_WATCH_HOURS:'0'});t.after(()=>s.stop());
 const call=async(p,b,token,method)=>{const r=await fetch(s.url+p,{method:method||(b?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(b?{body:JSON.stringify(b)}:{})});return{status:r.status,cache:r.headers.get('cache-control'),...await r.json()};};
 const login=async username=>(await call('/api/auth/login',{groupCode:'1001',username,password:s.password})).token;
 const ceo=await login('testceo');let v=await call('/api/state',null,ceo),f=v.state.farms[0];
 f.agriculture={cycles:[{id:'c',activity:'coffee',crop:'Café arábica',name:'2026',bagKg:60,areaHa:1,plannedCost:0,startDate:'2026-01-01',stage:'Em colheita'}],harvests:[{id:'h',cycleId:'c',date:'2026-01-01',netKg:100}],sales:[]};
 f.coffeeStudio={events:[{id:'lote-qr',kind:'source',date:'2026-01-02',harvestId:'h',code:'Origem privada',kg:100,stage:'beneficiado'}]};v.state.admAccess={pages:['dashboard','safras']};
 A.equal((await call('/api/state',{baseRev:v.rev,state:v.state},ceo,'PUT')).status,200);
 const path='/api/coffee-studio/qr?farmId='+encodeURIComponent(f.id)+'&lotId=lote-qr',r=await call(path,null,ceo);
 A.equal(r.status,200);A.equal(r.cache,'no-store');A.equal(r.private,true);A.equal(decodeSVG(r.svg),r.url);
 const u=new URL(r.url);A.equal(u.origin,'https://fazenda.example.invalid');A.equal(u.pathname,'/app');A.equal(u.searchParams.get('farmId'),f.id);A.equal(u.searchParams.get('coffeeLot'),'lote-qr');A.deepEqual([...u.searchParams.keys()],['activity','farmId','coffeeLot']);A.doesNotMatch(r.svg,/Origem privada|Bearer|password|token=/);
 A.equal((await call(path)).status,401);A.equal((await call(path.replace('lote-qr','ausente'),null,ceo)).status,404);A.equal((await call('/api/coffee-studio/qr?farmId=outro-grupo&lotId=lote-qr',null,ceo)).status,404);
 for(const [username,role]of[['admqr','adm'],['workerqr','contribuinte']]){A.equal((await call('/api/users',{username,name:username,email:username+'@example.invalid',password:s.password,role,...(role==='contribuinte'?{function:'Tratorista',allowedFarmId:f.id,allowedActivity:'coffee'}:{})},ceo)).status,200);}
 const ready=async username=>{const token=await login(username);A.equal((await call('/api/auth/change-password',{currentPassword:s.password,newPassword:s.password+'Z9'},token)).status,200);return(await call('/api/auth/login',{groupCode:'1001',username,password:s.password+'Z9'})).token;};const adm=await ready('admqr'),worker=await ready('workerqr');A.equal((await call(path,null,adm)).status,200);A.equal((await call(path,null,worker)).status,403);
 v=await call('/api/state',null,ceo);v.state.admAccess={pages:['dashboard']};A.equal((await call('/api/state',{baseRev:v.rev,state:v.state},ceo,'PUT')).status,200);A.equal((await call(path,null,adm)).status,403);
});

test('link do QR seleciona a fazenda e mantém Safras como página ativa após atualização',()=>{
 const code=fs.readFileSync(require.resolve('../coffee-studio.js'),'utf8');const start=code.indexOf(' const oldDash=');A.ok(start>0);
 const context={URL,location:{href:'https://fazenda.invalid/app?activity=coffee&farmId=f&coffeeLot=l'},data:{farms:[{id:'f'}]},canStudio:()=>true,snapshot:()=>({lots:[{id:'l'}]}),renderDashboard:()=>{},renderFarmSelector:()=>{},renderNav:()=>{},renderStudio:()=>{},toast:()=>{},currentPage:'dashboard',ruralSeasonSelection:'anterior',activeFarmId:'',selectedStudioLot:''};
 vm.createContext(context);vm.runInContext(code.slice(start,code.lastIndexOf('})();')),context);context.renderDashboard();A.equal(context.currentPage,'safras');A.equal(context.activeFarmId,'f');A.equal(context.selectedStudioLot,'l');A.equal(context.ruralSeasonSelection,null);
});

test('QR de lote fora do acesso não troca a fazenda nem abre a ficha',()=>{
 const code=fs.readFileSync(require.resolve('../coffee-studio.js'),'utf8'),context={URL,location:{href:'https://fazenda.invalid/app?farmId=outro&coffeeLot=l'},data:{farms:[{id:'f'}]},canStudio:()=>true,snapshot:()=>({lots:[]}),renderDashboard:()=>{},renderStudio:()=>A.fail('Não deve abrir'),toast:()=>{},currentPage:'dashboard',activeFarmId:'f'};vm.createContext(context);vm.runInContext(code.slice(code.indexOf(' const oldDash='),code.lastIndexOf('})();')),context);context.renderDashboard();A.equal(context.activeFarmId,'f');A.equal(context.currentPage,'dashboard');
});
