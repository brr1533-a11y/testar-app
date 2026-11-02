(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PendingDrafts=api;})(globalThis,function(){
function identity(state,userId){const u=(state.users||[]).find(u=>u.id===userId);if(!u)return '';return JSON.stringify([u.id,u.role,u.allowedFarmId||'',u.allowedActivity||'',u.function||'',state.admAccess||null,state.subscriptionActivities||null]);}
function key(groupId,userId){return 'ruralPendingV1:'+groupId+':'+userId;}
function recover(record,payload){return Boolean(record&&record.version===1&&record.groupId===payload.group?.id&&record.userId===payload.userId&&record.identity===identity(payload.state,payload.userId)&&record.base&&record.state);}
return {identity,key,recover};});
