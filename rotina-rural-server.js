const R=require('./rotina-rural-domain'),crypto=require('crypto');
module.exports=({app,auth,mutateGroup,statePayload})=>{
  app.post('/api/routine',auth,async(req,res,next)=>{
    try{const {saved}=await mutateGroup(req.auth.group.id,g=>{
      if(req.body.baseRev!==Number(g.state._rev||0))throw Object.assign(Error('Os dados mudaram. Atualize e confira antes de salvar.'),{statusCode:409});
      const actor=g.state.users.find(u=>u.id===req.auth.user.id&&u.active!==false);
      if(!actor||actor.role!==req.auth.user.role)throw Object.assign(Error('Seu acesso mudou. Atualize a sessão.'),{statusCode:403});
      R.apply(g.state,req.body,actor,{id:crypto.randomUUID(),at:new Date().toISOString()});
      g.state.audit=[...(g.state.audit||[]),{id:crypto.randomUUID(),at:new Date().toISOString(),username:req.auth.user.username,user:req.auth.user.name,action:'registrou',area:'Rotina rural',notes:String(req.body.kind||'').slice(0,40)}];
    });res.json(statePayload(saved,saved.state.users.find(u=>u.id===req.auth.user.id)));}catch(e){next(e);}
  });
};
