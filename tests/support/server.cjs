const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
exports.startServer = async function (extraEnv = {}) {
  const root = path.resolve(__dirname, '../..');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rural-tests-'));
  for (const file of fs.readdirSync(root)) if (/\.(js|html|css)$/.test(file) || ['planos-atividades.json', 'manifest.webmanifest', 'gerar-worker.cjs'].includes(file)) fs.copyFileSync(path.join(root,file),path.join(folder,file));
  if (fs.existsSync(path.join(root,"assets"))) fs.cpSync(path.join(root,"assets"),path.join(folder,"assets"),{recursive:true});
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0,'127.0.0.1',resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const password = crypto.randomBytes(24).toString('hex');
  const child = spawn(process.execPath, [path.join(folder,'server.js')], { windowsHide:true, env:{...process.env, NODE_ENV:'test', DATABASE_URL:'', NODE_PATH:path.join(root,'node_modules'), PORT:String(port), SEED_CEO_USER:'testceo', SEED_CEO_PASSWORD:password, SEED_CEO_EMAIL:'test@example.invalid', PLATFORM_ADMIN_EMAIL:'admin@example.invalid', PLATFORM_ADMIN_PASSWORD:password, TEST_PURCHASE_MODE:'false', ...extraEnv} });
  let log='';child.stdout.on('data',c=>log+=c);child.stderr.on('data',c=>log+=c);
  const url='http://127.0.0.1:'+port;
  async function stop() {
    if(child.exitCode==null){const closed=new Promise(r=>child.once('close',r));child.kill();await closed;}
    const resolved=path.resolve(folder);
    if(path.dirname(resolved)===path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('rural-tests-')) fs.rmSync(resolved,{recursive:true,force:true});
  }
  try {
    let ready=false;
    for(let i=0;i<100;i++){
      if(child.exitCode!=null) throw Error('Servidor de teste não iniciou: '+log);
      try{const r=await fetch(url+'/api/health'); if(r.ok){ready=true;break;}}catch{}
      await new Promise(r=>setTimeout(r,100));
    }
    if(!ready) throw Error('Timeout ao iniciar servidor de teste: '+log);
    return {url,password,stop,folder,logs:()=>log};
  }catch(e){await stop();throw e;}
};
