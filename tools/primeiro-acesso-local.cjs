// Adaptador para o iniciador local, fora do pacote do servidor publicado.
const crypto=require('crypto');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports=({template,origin,csrf,changePassword,onComplete,isComplete})=>async(req,res)=>{
 if(req.url!=='/primeiro-acesso')return false;
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
 const render=(message='',status=200)=>{res.statusCode=status;res.end(template.replaceAll('{{CSRF}}',escape(csrf)).replaceAll('{{ERROR_HIDDEN}}',message?'':'hidden').replaceAll('{{ERROR}}',escape(message)));};
 if(isComplete()){res.writeHead(303,{Location:'/app'});res.end();return true;}
 if(req.method==='GET'){render();return true;}
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');render('Esta operação não é permitida.',405);return true;}
 if(req.headers.origin!==origin){render('Reabra esta página para continuar com segurança.',403);return true;}
 if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||'')){render('Envie os dados pelo formulário desta página.',415);return true;}
 try{
  const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>4096){render('O formulário excedeu o tamanho permitido.',413);return true;}chunks.push(c);}
  const p=new URLSearchParams(Buffer.concat(chunks).toString('utf8')),provided=Buffer.from(p.get('csrf')||''),expected=Buffer.from(csrf);
  if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected)){render('Sua página expirou. Atualize antes de tentar novamente.',403);return true;}
  const password=p.get('password')||'';if(password!==p.get('confirm')){render('As senhas não conferem. Digite as duas novamente.',400);return true;}
  if(password.length<10||password.length>128){render('Use uma senha entre 10 e 128 caracteres.',400);return true;}
  const result=await changePassword(password);if(result.status!==200){render(result.json?.error||'Confira os requisitos da senha e tente novamente.',result.status>=400&&result.status<500?result.status:503);return true;}
  await onComplete(result.json);res.writeHead(303,{Location:'/app'});res.end();return true;
 }catch{render('Não foi possível salvar agora. Tente novamente.',503);return true;}
};
