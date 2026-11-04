const Subscription=require('./subscription-domain'),Adm=require('./adm-access');
const STATUS=['novo','em análise','resolvido'];
exports.register=function({app,store,auth,requireRole,platformAuth,mutateGroup,recordPlatformAudit,publicBase,port}){
 app.get('/api/platform/feedbacks',platformAuth,async(req,res,next)=>{try{
  const status=String(req.query.status||''),q=String(req.query.q||'').trim().toLocaleLowerCase('pt-BR'),offset=Number(req.query.offset||0);
  if(status&&!STATUS.includes(status)||q.length>100||!Number.isInteger(offset)||offset<0||offset>1000000)return res.status(422).json({error:'Filtro inválido.'});
  const rows=[];for(const g of await store.listGroups())for(const f of g.state?.routine?.feedback||[]){const platformStatus=f.platformStatus||'novo';if(status&&platformStatus!==status)continue;if(q&&!`${g.name} ${g.code} ${f.message}`.toLocaleLowerCase('pt-BR').includes(q))continue;rows.push({id:f.id,groupId:g.id,groupName:g.name,groupCode:g.code,at:f.at,category:f.category,message:f.message,page:f.page,groupStatus:f.status,status:platformStatus,reviewedAt:f.platformReviewedAt||null});}
  rows.sort((a,b)=>String(b.at).localeCompare(String(a.at))||String(a.id).localeCompare(String(b.id)));res.set('Cache-Control','no-store');res.json({feedbacks:rows.slice(offset,offset+50),total:rows.length,nextOffset:offset+50<rows.length?offset+50:null});
 }catch(e){next(e);}});
 app.patch('/api/platform/groups/:groupId/feedbacks/:feedbackId',platformAuth,async(req,res,next)=>{try{
  if(!STATUS.includes(req.body.status))return res.status(422).json({error:'Situação inválida.'});
  const {saved}=await mutateGroup(req.params.groupId,g=>{const row=g.state.routine?.feedback?.find(f=>f.id===req.params.feedbackId);if(!row)throw Object.assign(Error('Feedback não encontrado.'),{statusCode:404});row.platformStatus=req.body.status;row.platformReviewedAt=new Date().toISOString();});
  await recordPlatformAudit(req,'revisou-feedback',saved,`Feedback ${req.params.feedbackId}: ${req.body.status}`);res.json({ok:true});
 }catch(e){next(e);}});
 app.get('/api/labor/worker-qr',auth,requireRole('ceo','adm'),async(req,res,next)=>{try{
  const {group,user}=req.auth;if(!Subscription.licensed(group.state).includes('coffee')||user.role==='adm'&&!Adm.can(group.state,'mao-de-obra'))return res.status(403).json({error:'Sem acesso à mão de obra do café.'});
  const f=group.state.farms.find(f=>f.id===req.query.farmId),w=f?.labor?.workers?.find(w=>w.id===req.query.workerId&&w.active!==false);if(!w)return res.status(404).json({error:'Pessoa ativa não encontrada nesta fazenda.'});
  const url=new URL('/app',publicBase||'http://127.0.0.1:'+port);url.searchParams.set('activity','coffee');url.searchParams.set('farmId',f.id);url.searchParams.set('harvestWorker',w.id);
  const svg=await require('qrcode').toString(url.href,{type:'svg',errorCorrectionLevel:'M',margin:4});res.set('Cache-Control','no-store');res.json({svg,url:url.href,private:true,worker:{id:w.id,name:w.name}});
 }catch(e){next(e);}});
};
