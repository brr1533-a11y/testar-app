{
 const employeeBindBefore=bindRows;
 bindRows=function(){employeeBindBefore();document.querySelectorAll('.modules-action').forEach(anchor=>{
  const b=document.createElement('button');b.className='action employees-action';b.textContent='Funcionários';b.dataset.id=anchor.dataset.id;anchor.after(b);
  b.onclick=async()=>{const g=allGroups.find(g=>g.id===b.dataset.id);if(!g)return;const farms=g.usage?.perFarm||[],total=g.employeeLimits?.totalLimit??50;
   const v=await openDialog(`<form class="dlg"><h3>Funcionários · ${esc(g.name)}</h3><p>Um total de vagas para todo o grupo, compartilhado entre as fazendas. Somente o Super Admin muda essa quantidade.</p><label class="field">Total de funcionários ativos no grupo<input type="number" name="totalLimit" min="0" step="1" required value="${total}"></label><p><b>${g.usage?.contributors??0} de ${total}</b> vagas ocupadas. CEO e administradores não ocupam vagas operacionais.</p>${farms.map(f=>`<p>${esc(f.name)}: <b>${f.contributors}</b> funcionários</p>`).join('')}<p>Ao atingir o total, novos cadastros e reativações são bloqueados. Transferir entre fazendas não ocupa outra vaga; desativar libera uma vaga. Zero impede novas entradas. Para reduzir abaixo do uso atual, desative os excedentes primeiro.</p><div class="dlg-actions"><button type="button" class="btn-plain" data-dlg-cancel>Cancelar</button><button type="submit" class="btn-main">Salvar total do grupo</button></div></form>`);
   if(!v)return;try{await api('/api/platform/groups/'+g.id+'/employees',{method:'PATCH',body:JSON.stringify({totalLimit:Number(v.totalLimit)})});toast('Total de funcionários do grupo atualizado.');await load();}catch(e){toast(e.message);}
  };
 });};
}
