/* Efeitos visuais do tema Café Premium.
   1. Gráfico financeiro: barras sobem uma a uma e o resultado de cada mês conta até o valor.
   2. Botões: um brilho dourado segue o mouse por dentro do botão. */
(function () {
  "use strict";
  var reduz = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var formata = typeof window.compactMoney === "function"
    ? window.compactMoney
    : function (v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); };

  /* ---------- 1. gráfico de barras ---------- */
  function animarGrafico(grafico) {
    if (grafico.dataset.animado) return;
    grafico.dataset.animado = "1";
    if (reduz) return;
    var meses = grafico.querySelectorAll(".month-group");
    meses.forEach(function (mes, i) {
      var barras = mes.querySelectorAll(".bar");
      var total = mes.querySelector(".month-total");
      barras.forEach(function (b) {
        b.dataset.alvo = b.style.height;
        b.style.animation = "none";
        b.style.transition = "none";
        b.style.height = "2px";
      });
      if (total) total.textContent = formata(0);
      setTimeout(function () {
        barras.forEach(function (b, k) {
          b.style.transition = "height .9s cubic-bezier(.16,1,.3,1) " + (k * 70) + "ms";
          b.style.height = b.dataset.alvo;
        });
        if (!total) return;
        var alvo = Number(total.dataset.v || 0), ini = null;
        (function conta(t) {
          if (!ini) ini = t;
          var p = Math.min(1, (t - ini) / 900);
          total.textContent = formata(alvo * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(conta);
          else total.textContent = formata(alvo);
        })(performance.now());
      }, 120 + i * 110);
    });
  }

  function procurarGraficos(raiz) {
    (raiz || document).querySelectorAll(".finance-chart:not([data-animado])").forEach(function (g) {
      // espera um quadro para o navegador medir as alturas iniciais
      requestAnimationFrame(function () { animarGrafico(g); });
    });
  }

  var conteudo = document.getElementById("pageContent");
  if (conteudo && "MutationObserver" in window) {
    new MutationObserver(function () { procurarGraficos(conteudo); })
      .observe(conteudo, { childList: true, subtree: true });
  }
  procurarGraficos(document);

  /* ---------- 2. luz que segue o mouse nos botões ---------- */
  document.addEventListener("pointermove", function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest(".btn, .switch-btn, .nav-btn, .key-card button, .primary-tool, .modal-actions button");
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty("--lx", (ev.clientX - r.left) + "px");
    el.style.setProperty("--ly", (ev.clientY - r.top) + "px");
  }, { passive: true });

  /* ---------- 3. Botão elástico ----------
     Mola com velocidade e amortecimento (vitrine do canal Não Codei, efeito 14): cresce ao passar o mouse,
     afunda ao apertar e assenta sozinho. Funciona com o dedo; a animação para quando o botão se acomoda
     (não fica rodando à toa) e não anima para quem pediu menos movimento no aparelho. */
  window.botaoElastico = function (btn) {
    if (!btn || btn.dataset.elastico) return;
    btn.dataset.elastico = "1";
    if (reduz) return;
    var escala = 1, vel = 0, alvo = 1, id = null;
    function passo() {
      var forca = (alvo - escala) * 0.22;   /* rigidez da mola */
      vel = (vel + forca) * 0.72;           /* amortecimento */
      escala += vel;
      if (Math.abs(alvo - escala) < 0.0005 && Math.abs(vel) < 0.0005) { escala = alvo; id = null; }
      btn.style.transform = escala === 1 ? "" : "scale(" + escala.toFixed(4) + ")";
      if (id !== null) id = requestAnimationFrame(passo);
    }
    function para(v) { alvo = v; if (id === null) id = requestAnimationFrame(passo); }
    btn.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") para(1.08); });
    btn.addEventListener("pointerleave", function () { para(1); });
    btn.addEventListener("pointerdown", function () { para(0.9); });
    btn.addEventListener("pointerup", function (e) { para(e.pointerType === "mouse" ? 1.08 : 1); });
    btn.addEventListener("pointercancel", function () { para(1); });
  };
})();
