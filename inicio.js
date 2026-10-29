/* Gestão Rural · página inicial: voo entre os grãos, prévia das páginas e cotação */

(function(){
  var landingMode=document.body.dataset.landing || "coffee";
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rnd(a){ var x=Math.sin(a*9301+49297)*233280; return x-Math.floor(x); }

  /* ---------- pé de café com torrão (desenhado uma vez em canvas, com luz e sombra) ---------- */
  var semente = 20251028;
  function R(){ semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; }
  function hsl(h,s,l,a){ return 'hsla('+h+','+s+'%,'+Math.max(0,Math.min(100,l))+'%,'+(a==null?1:a)+')'; }

  var BEAN = new Path2D('M2 -62C33 -61 49 -32 47 3C45 38 27 63 -2 62C-31 61 -48 33 -46 -2C-44 -35 -26 -63 2 -62Z');
  var CREASE = new Path2D('M0 -58C-22 -32 20 -10 -2 16C-16 36 10 48 3 60');
  function graoCanvas(c, x, y, escala, ang, tom){
    c.save(); c.translate(x,y); c.rotate(ang); c.scale(escala,escala);
    c.save(); c.translate(9,10); c.fillStyle='rgba(0,0,0,.35)'; c.fill(BEAN); c.restore();
    var g=c.createRadialGradient(-16,-22,4,0,0,70);
    g.addColorStop(0,tom[0]); g.addColorStop(.4,tom[1]); g.addColorStop(1,tom[2]);
    c.fillStyle=g; c.fill(BEAN);
    c.lineCap='round';
    c.strokeStyle='rgba(0,0,0,.35)'; c.lineWidth=13; c.stroke(CREASE);
    c.strokeStyle='#0a0402'; c.lineWidth=5; c.stroke(CREASE);
    c.save(); c.translate(4,0); c.strokeStyle='rgba(200,140,95,.5)'; c.lineWidth=1.6; c.stroke(CREASE); c.restore();
    var h=c.createRadialGradient(-22,-32,0,-22,-32,22); h.addColorStop(0,'rgba(255,255,255,.5)'); h.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=h; c.beginPath(); c.ellipse(-22,-32,12,21,.5,0,6.29); c.fill();
    c.restore();
  }
  var TOM_TORRADO=['#a06c48','#5e3823','#1c0c05'];

  /* ---------- voo entre os grãos: grãos reais num espaço 3D, a câmera avança com a rolagem ---------- */
  var cvV=document.getElementById('voo'), cv=cvV.getContext('2d'), VW=1, VH=1, dprV=1;
  var reais=["data:image/webp;base64,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","data:image/webp;base64,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","data:image/webp;base64,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"].map(function(u){ var im=new Image(); im.src=u; return im; });
  var spr=document.createElement('canvas'); spr.width=120; spr.height=150;
  (function(){ var s=spr.getContext('2d'); s.translate(60,72); graoCanvas(s,0,0,.95,0,['#a8744e','#64402a','#1e0e06']); })();
  var NIVEIS=[0,1.5,4,9], sprites=[];
  function prepararSprites(){
    var fontes=reais.filter(function(im){ return im.complete && im.naturalWidth; }); fontes.push(spr);
    sprites=fontes.map(function(im){
      var w=im.naturalWidth||im.width, h=im.naturalHeight||im.height, esc=96/Math.max(w,h);
      return NIVEIS.map(function(b){
        var m=Math.ceil(b*2.5)+2, c=document.createElement('canvas'); c.width=Math.round(w*esc)+m*2; c.height=Math.round(h*esc)+m*2;
        var x=c.getContext('2d'); x.filter=(b?'blur('+b+'px) ':'')+'saturate(.85) brightness(.92)'; x.drawImage(im,m,m,w*esc,h*esc); return c;
      });
    });
  }
  prepararSprites();
  Promise.all(reais.map(function(im){ return im.decode?im.decode().catch(function(){}):null; })).then(prepararSprites);

  var PROF=15, graosV=[];
  semente=9091;
  for(var iv=0;iv<300;iv++){
    graosV.push({x:(R()*2-1)*2.6, y:(R()*2-1)*1.6, z:.6+R()*PROF, k:Math.floor(R()*16), rot:R()*6.28, vr:(R()-.5)*.9,
      fl:R()*6.28, vf:.6+R()*1.6, tam:.8+R()*.5, ox:0, oy:0, vx:0, vy:0});
  }
  function medirVoo(){ dprV=Math.min(2,window.devicePixelRatio||1); VW=cvV.offsetWidth; VH=cvV.offsetHeight; cvV.width=VW*dprV; cvV.height=VH*dprV; }
  medirVoo(); addEventListener('resize',medirVoo);

  // cz: posição da câmera; abre: grãos se afastam do centro e abrem caminho para o painel
  function desenharVoo(t, cz, abre, camX, camY, mouseX, mouseY, ativo){
    cv.setTransform(dprV,0,0,dprV,0,0); cv.clearRect(0,0,VW,VH);
    if(!sprites.length) return;
    var f=Math.min(VW,VH)*1.05, cx=VW/2, cy=VH/2, lista=[];
    for(var i=0;i<graosV.length;i++){
      var g=graosV[i], d=g.z-cz; d=((d%PROF)+PROF)%PROF; if(d<.25) continue;
      var esp=1+abre*abre*7/Math.max(.6,d*.35);
      var sx=cx+(g.x*esp-camX/d*.9)*f/d, sy=cy+(g.y*esp-camY/d*.9)*f/d;
      lista.push([d,g,sx,sy]);
    }
    lista.sort(function(a,b){ return b[0]-a[0]; });
    for(var j=0;j<lista.length;j++){
      var d=lista[j][0], g=lista[j][1], sx=lista[j][2], sy=lista[j][3];
      var s=.2*g.tam*f/d; if(s<3) continue;
      // grãos perto do mouse se afastam e voltam devagar
      var ex=sx+g.ox-mouseX, ey=sy+g.oy-mouseY, dist=Math.sqrt(ex*ex+ey*ey), raio=90+s*.8;
      if(ativo && dist<raio && dist>.1){ var fz=(1-dist/raio)*(1.2+s/60); g.vx+=ex/dist*fz; g.vy+=ey/dist*fz; g.vr+=(ex>0?1:-1)*fz*.01; }
      g.vx+=-g.ox*.04; g.vy+=-g.oy*.04; g.vx*=.86; g.vy*=.86; g.ox+=g.vx; g.oy+=g.vy; g.vr*=.995;
      var foco=Math.abs(d-4.5), nivel=d<1.3?3:d<2.4?2:foco<2.2?0:d<10?1:2;
      var alfa=Math.min(1,(PROF-d)/4)*Math.min(1,(d-.25)/.6)*(d>10?.8:1);
      var cor=sprites[g.k%sprites.length][nivel], virada=Math.cos(t*g.vf+g.fl);
      cv.globalAlpha=Math.max(0,alfa);
      cv.setTransform(dprV,0,0,dprV,0,0); cv.translate(sx+g.ox,sy+g.oy); cv.rotate(g.rot+t*g.vr*.6); cv.scale(.35+.65*Math.abs(virada),1);
      var w=s*cor.width/96, h=s*cor.height/96; cv.drawImage(cor,-w/2,-h/2,w,h);
    }
    cv.globalAlpha=1;
  }

  /* ---------- mouse ---------- */
  var hero=document.querySelector('.hero'), foto=document.getElementById('foto'), titulo=document.getElementById('titulo');
  var cena=document.getElementById('cena'), fixo=document.getElementById('fixo'), veu=document.getElementById('veu'), sis=document.getElementById('sistema'), app=sis.querySelector('.app');
  var brilho=document.getElementById('brilho'), frase=document.getElementById('frase');
  var cardsHero=[].slice.call(hero.querySelectorAll('.vidro,.rodape-hero,.hero-copy,.hero-eyebrow'));
  var estatico=false;
  function decidirModo(){ estatico = reduz || innerWidth<760 || innerHeight<560; document.documentElement.classList.toggle('estatico',estatico); }
  decidirModo(); addEventListener('resize',decidirModo);
  var pAlvo=0, pSuave=0;
  function lerScroll(){ if(estatico){ pAlvo=0; return; } var r=cena.getBoundingClientRect(), faixa=cena.offsetHeight-innerHeight; pAlvo=Math.max(0,Math.min(1,-r.top/Math.max(1,faixa))); }
  addEventListener('scroll',lerScroll,{passive:true}); lerScroll();
  document.querySelectorAll('a[href="#sistema"]').forEach(function(a){ a.addEventListener('click',function(e){ if(estatico) return; e.preventDefault(); var faixa=cena.offsetHeight-innerHeight; scrollTo({top:cena.offsetTop+faixa*.82,behavior:'smooth'}); }); });
  function faixa(v,a,b){ return Math.max(0,Math.min(1,(v-a)/(b-a))); }
  function suave(x){ return x*x*(3-2*x); }
  var mx=0,my=0, tx=0,ty=0, px=-9999,py=-9999, W=1,H=1, dentro=false;
  function medir(){ var r=hero.getBoundingClientRect(); W=r.width; H=r.height; }
  medir(); addEventListener('resize',medir);
  fixo.addEventListener('pointermove',function(e){ var r=hero.getBoundingClientRect(); px=e.clientX-r.left; py=e.clientY-r.top; tx=px/W-.5; ty=py/H-.5; dentro=pSuave<.5; });
  fixo.addEventListener('pointerleave',function(){ dentro=false; tx=0; ty=0; px=py=-9999; });

  /* ---------- barras de exemplo ---------- */
  var bx=document.getElementById('barras'), dados=[[52,38],[64,41],[80,46],[58,50],[90,44],[72,40]], maior=90, b='';
  dados.forEach(function(d){ b+='<div class="mes"><span class="val">R$ 0 mil</span><div class="trio"><i data-h="'+(d[0]/maior*100)+'" style="background:linear-gradient(#c8a45c,#8a6a24)"></i><i data-h="'+(d[1]/maior*100)+'" style="background:#a39080"></i><i data-h="'+(Math.max(3,(d[0]-d[1])/maior*100))+'" style="background:#5a7a4a"></i></div></div>'; });
  bx.innerHTML=b;
  var subiu=false;
  function subirBarras(){
    if(subiu) return; subiu=true;
    bx.querySelectorAll('.mes').forEach(function(mes,i){
      setTimeout(function(){
        mes.querySelectorAll('i').forEach(function(h,k){ h.style.transition='height .9s cubic-bezier(.16,1,.3,1) '+(k*70)+'ms'; h.style.height=h.dataset.h+'%'; });
        var alvo=dados[i][0]-dados[i][1], val=mes.querySelector('.val'), ini=null;
        (function conta(tt){ if(!ini) ini=tt; var p=Math.min(1,(tt-ini)/900); val.textContent='R$ '+Math.round(alvo*(1-Math.pow(1-p,3)))+' mil'; if(p<1) requestAnimationFrame(conta); })(performance.now());
      }, reduz?0:i*110);
    });
  }
  if('IntersectionObserver' in window){ var ob=new IntersectionObserver(function(e){ if(e[0].isIntersecting && (estatico||pSuave>.7)){ subirBarras(); } },{threshold:.3}); ob.observe(bx); }

  document.addEventListener('pointermove',function(ev){ var el=ev.target.closest&&ev.target.closest('.btn'); if(!el) return; var r=el.getBoundingClientRect(); el.style.setProperty('--lx',(ev.clientX-r.left)+'px'); el.style.setProperty('--ly',(ev.clientY-r.top)+'px'); },{passive:true});
  var t0=performance.now();
  function quadro(agora){
    var t=(agora-t0)/1000;
    mx+=(tx-mx)*.06; my+=(ty-my)*.06;
    pSuave+=(pAlvo-pSuave)*.12;
    var voo=faixa(pSuave,0,.5), z=suave(voo), abre=suave(faixa(pSuave,.44,.62)), rev=suave(faixa(pSuave,.54,.84));
    if(!subiu && rev>.85) subirBarras();
    var cz=(reduz?0:t*.35)+Math.pow(voo,1.6)*34;
    foto.style.transform='scale('+(1.06+z*.5).toFixed(3)+') translate3d('+(-mx*18).toFixed(1)+'px,'+(-my*10).toFixed(1)+'px,0)';
    foto.style.filter='brightness('+(1-z*.35).toFixed(3)+')';
    brilho.style.opacity=(.45+z*.55*(1-abre)).toFixed(3);
    // a câmera atravessa o título
    titulo.style.transform='translate3d('+(-mx*10)+'px,'+(-my*6)+'px,0) scale('+(1+Math.pow(faixa(pSuave,0,.2),2)*5).toFixed(3)+')';
    titulo.style.opacity=(1-faixa(pSuave,.04,.14)).toFixed(3);
    // a frase vem do fundo, passa pela câmera e some
    var fr=faixa(pSuave,.16,.46);
    frase.style.opacity=(fr<=0||fr>=1?0:Math.min(1,fr*4)*(1-faixa(fr,.7,1))).toFixed(3);
    frase.style.transform='translate3d('+(-mx*16).toFixed(1)+'px,'+(-my*10).toFixed(1)+'px,0) translateY(-50%) scale('+(.2+Math.pow(fr,2.2)*4.5).toFixed(3)+')';
    cardsHero.forEach(function(el){ el.style.opacity=(1-faixa(pSuave,0,.12)).toFixed(3); el.style.pointerEvents=pSuave>.08?'none':''; });
    if(landingMode === "coffee") desenharVoo(t, cz, abre, mx*1.4, my*1, dentro?px:-9999, dentro?py:-9999, dentro);
    cvV.style.opacity=(1-rev*.85).toFixed(3);
    sis.style.visibility=(estatico || rev>.01)?'visible':'hidden';
    sis.inert=!estatico && rev<=.6;
    if(!estatico){
      veu.style.opacity=(rev*.9).toFixed(3);
      sis.style.opacity=rev.toFixed(3); sis.style.pointerEvents=rev>.6?'auto':'none';
      app.style.transform='translate3d('+(mx*-14).toFixed(1)+'px,'+((1-rev)*90).toFixed(1)+'px,0) scale('+(.84+rev*.16).toFixed(3)+') rotateX('+(-my*7).toFixed(2)+'deg) rotateY('+(mx*10).toFixed(2)+'deg)';
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  /* ---------- prévia de cada página do sistema ---------- */
  var abas=[].slice.call(document.querySelectorAll('.app aside .m')), telas=[].slice.call(document.querySelectorAll('.pv'));
  var pontos=document.getElementById('pontos'), atual=0, mexeu=false, tAuto=0;
  pontos.innerHTML=abas.map(function(){ return '<i></i>'; }).join('');
  var bolinhas=[].slice.call(pontos.children);
  function mostrar(i, foco){
    atual=(i+abas.length)%abas.length;
    abas.forEach(function(a,k){ var sel=k===atual; a.setAttribute('aria-selected',sel?'true':'false'); a.tabIndex=sel?0:-1; });
    telas.forEach(function(p){ var active=p.id==='pv-'+abas[atual].dataset.pv; p.classList.toggle('at',active); p.setAttribute('aria-hidden',active?'false':'true'); p.inert=!active; });
    bolinhas.forEach(function(b,k){ b.classList.toggle('at',k===atual); });
    if(foco) abas[atual].focus();
    if(abas[atual].dataset.pv==='financeiro'){ subiu=false; bx.querySelectorAll('.trio i').forEach(function(h){ h.style.transition='none'; h.style.height='0'; }); requestAnimationFrame(function(){ requestAnimationFrame(subirBarras); }); }
    if(window.innerWidth<900) abas[atual].scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
  }
  abas.forEach(function(a,k){
    a.addEventListener('click',function(){ mexeu=true; mostrar(k); });
    a.addEventListener('keydown',function(e){
      var dir={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];
      if(dir){ e.preventDefault(); mexeu=true; mostrar(atual+dir,true); }
      if(e.key==='Home'){ e.preventDefault(); mexeu=true; mostrar(0,true); }
      if(e.key==='End'){ e.preventDefault(); mexeu=true; mostrar(abas.length-1,true); }
    });
  });
  app.addEventListener('pointerenter',function(){ tAuto=performance.now()+6000; });
  document.querySelectorAll('[data-preview]').forEach(function(link){
    link.addEventListener('click',function(){
      var index=abas.findIndex(function(tab){ return tab.dataset.pv===link.dataset.preview; });
      if(index>=0){ mexeu=true; mostrar(index,true); }
    });
  });
  app.addEventListener('focusin',function(){ mexeu=true; });
  var initialPreview=landingMode === "cattle" ? "gado" : landingMode === "grains" ? "graos" : "visao";
  var initialIndex=abas.findIndex(function(tab){ return tab.dataset.pv === initialPreview; });
  if(landingMode !== "coffee") mexeu=true;
  mostrar(Math.max(0,initialIndex));
  // troca sozinha a cada 4 s enquanto o painel está na tela e ninguém clicou
  setInterval(function(){
    if(mexeu || reduz || document.hidden || performance.now()<tAuto) return;
    var r=app.getBoundingClientRect(), visivel=r.top<innerHeight*.8 && r.bottom>innerHeight*.2 && (estatico || pSuave>.8);
    if(visivel) mostrar(atual+1);
  },4000);

  /* ---------- cotação real da saca (mesma fonte do sistema) ---------- */
  function moeda(v){ return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  if(landingMode !== 'cattle') fetch('/api/cotacao-cafe').then(function(r){ return r.ok?r.json():Promise.reject(); }).then(function(c){
    if(!c || !isFinite(c.brlPerSaca)) return Promise.reject();
    var partes=moeda(c.brlPerSaca).split(',');
    document.querySelectorAll('[data-cot]').forEach(function(el){ el.innerHTML='R$ '+partes[0]+'<small>,'+partes[1]+'</small>'; });
    document.querySelectorAll('[data-cot-txt]').forEach(function(el){ el.textContent='R$ '+partes.join(','); });
    var rot=document.getElementById('cotRot'); if(rot) rot.textContent='Saca de 60 kg · referência Coffee C convertida';
  }).catch(function(){
    var rot=document.getElementById('cotRot'); if(rot) rot.textContent='Cotação da saca ao vivo dentro do sistema';
    document.querySelectorAll('[data-cot]').forEach(function(el){ el.innerHTML='Café · <small>Coffee C</small>'; });
  });
})();

