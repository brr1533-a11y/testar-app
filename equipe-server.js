const T=require('./equipe-domain'),crypto=require('crypto'),Sub=require('./subscription-domain'),Rural=require('./rural-domain');
module.exports=({app,auth,mutateGroup,statePayload,store,validateStatePlanLimits})=>{
 app.post('/api/team',auth,async(req,res,next)=>{try{
  const {saved,result}=await mutateGroup(req.auth.group.id,g=>{
   const actor=g.state.users.find(u=>u.id===req.auth.user.id&&u.active!==false);if(!actor||actor.role!==req.auth.user.role)throw Object.assign(Error('Seu acesso mudou. Entre novamente.'),{statusCode:403});
   const id=crypto.randomUUID(),at=new Date().toISOString();T.act(g.state,req.body,actor,{id,at});
   if(req.body.kind==='assign'){const target=g.state.users.find(u=>u.id===req.body.userId);if(target.role==='contribuinte'&&!Rural.activitiesFor(target.allowedActivity).some(a=>Sub.licensed(g.state).includes(a)))throw Object.assign(Error('Escolha uma atividade contratada pelo grupo.'),{statusCode:422});validateStatePlanLimits(g,g.state);}
   g.state.audit=[...(g.state.audit||[]),{id:crypto.randomUUID(),at,user:actor.name,username:actor.username,action:req.body.kind==='clock'?String(req.body.action):String(req.body.kind),area:req.body.kind==='clock'||req.body.kind==='correct'?'Ponto da equipe':'Cargos e permissões',label:String(req.body.name||req.body.userId||req.body.id||'').slice(0,120)}];
   return req.body.kind==='assign'?req.body.userId:null;
  });if(result)await store.deleteSessionsForUser(saved.id,result);res.json(statePayload(saved,saved.state.users.find(u=>u.id===req.auth.user.id)));
 }catch(e){next(e);}});
};
