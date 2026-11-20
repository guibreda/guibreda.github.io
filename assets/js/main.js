/* CT Viva Feliz - scripts: menu, filtro de clínicas, formulário e cookies */
(function () {
  'use strict';

  /* menu mobile */
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var aberto = menu.classList.toggle('aberto');
      btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      btn.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });
  }

  /* medição (Google tag) só após consentimento */
  var cfg = window.CTVF || {};
  function carregarGtag() {
    if (!cfg.gtagId || window.__gtagCarregado) return;
    window.__gtagCarregado = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.gtagId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.gtagId);
  }
  function lerConsentimento() { try { return localStorage.getItem('ctvf-cookies'); } catch (e) { return null; } }
  function gravarConsentimento(v) { try { localStorage.setItem('ctvf-cookies', v); } catch (e) { /* ignora */ } }
  var aviso = document.getElementById('aviso-cookies');
  if (cfg.gtagId) {
    var c = lerConsentimento();
    if (c === 'aceitar') carregarGtag();
    else if (!c && aviso) aviso.hidden = false;
    if (aviso) {
      aviso.addEventListener('click', function (e) {
        var acao = e.target && e.target.getAttribute('data-cookie');
        if (!acao) return;
        gravarConsentimento(acao);
        aviso.hidden = true;
        if (acao === 'aceitar') carregarGtag();
      });
    }
  }

  /* eventos de conversão (cliques em WhatsApp e telefone) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.js-wa, a.js-tel');
    if (!a || !window.gtag) return;
    window.gtag('event', a.classList.contains('js-wa') ? 'clique_whatsapp' : 'clique_telefone', { event_category: 'contato' });
  });

  /* filtro de clínicas */
  var filtro = document.getElementById('filtro-clinicas');
  if (filtro) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#lista-clinicas .cartao-clinica'));
    var vazio = document.getElementById('filtro-vazio');
    var contagem = document.getElementById('filtro-contagem');
    var uf = document.getElementById('flt-uf');
    var trat = document.getElementById('flt-trat');
    var pub = document.getElementById('flt-pub');
    var cid = document.getElementById('flt-cid');
    var aplicar = function () {
      var n = 0;
      var q = cid.value.trim().toLowerCase();
      cards.forEach(function (c) {
        var ok = (!uf.value || c.dataset.uf === uf.value) &&
          (!trat.value || (' ' + c.dataset.trat + ' ').indexOf(' ' + trat.value + ' ') > -1) &&
          (!pub.value || (' ' + c.dataset.publico + ' ').indexOf(' ' + pub.value + ' ') > -1) &&
          (!q || c.dataset.cidade.indexOf(q) > -1);
        c.hidden = !ok;
        c.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      vazio.hidden = n > 0;
      contagem.textContent = n === 1 ? '1 clínica encontrada' : n + ' clínicas encontradas';
    };
    [uf, trat, pub].forEach(function (el) { el.addEventListener('change', aplicar); });
    cid.addEventListener('input', aplicar);
    filtro.addEventListener('reset', function () { setTimeout(aplicar, 0); });
    aplicar();
  }

  /* formulário de contato */
  var form = document.getElementById('form-contato');
  if (form) {
    var status = form.querySelector('.form-status');
    var msg = function (texto, tipo) { status.textContent = texto; status.className = 'form-status ' + tipo; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.site && form.elements.site.value) return; /* anti-robô */
      var ok = true;
      Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
        var valido = el.type === 'checkbox' ? el.checked : el.value.trim() !== '';
        var campo = el.closest('.campo');
        if (campo) campo.classList.toggle('invalido', !valido);
        if (!valido) ok = false;
      });
      if (!ok) { msg('Preencha os campos obrigatórios e aceite a Política de Privacidade.', 'erro'); return; }

      var dados = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name && el.name !== 'site' && el.name !== 'lgpd' && el.value) {
          var lab = form.querySelector('label[for="' + el.id + '"]');
          dados[lab ? lab.textContent.replace('*', '').trim() : el.name] = el.value.trim();
        }
      });
      var texto = 'Olá, vim pelo site da CT Viva Feliz e gostaria de orientação.\n' +
        Object.keys(dados).map(function (k) { return '- ' + k + ': ' + dados[k]; }).join('\n');
      var endpoint = form.getAttribute('data-endpoint');

      if (endpoint) {
        msg('Enviando...', '');
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(dados) })
          .then(function (r) {
            if (!r.ok) throw new Error('falha');
            form.reset();
            msg('Recebemos seus dados. Nossa equipe entrará em contato em breve.', 'ok');
            if (window.gtag) window.gtag('event', 'formulario_enviado', { event_category: 'contato' });
          })
          .catch(function () { msg('Não foi possível enviar. Chame no WhatsApp ou ligue para a nossa equipe.', 'erro'); });
      } else {
        if (window.gtag) window.gtag('event', 'formulario_enviado', { event_category: 'contato' });
        var url = 'https://wa.me/' + form.getAttribute('data-wa') + '?text=' + encodeURIComponent(texto);
        msg('Abrindo o WhatsApp com as suas informações. Basta tocar em enviar.', 'ok');
        window.open(url, '_blank', 'noopener');
      }
    });
  }
})();
