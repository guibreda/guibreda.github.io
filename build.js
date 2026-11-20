#!/usr/bin/env node
/**
 * Gerador do site CT Viva Feliz.
 * Uso:  node build.js
 * Lê  : src/data/*.json, src/pages/*.md, src/blog/*.md, assets/
 * Gera: dist/  (pasta pronta para enviar à hospedagem)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/* ---------- utilidades ---------- */
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (n) => JSON.parse(read(path.join(SRC, 'data', n)));
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fail = (msg) => { console.error('ERRO: ' + msg); process.exit(1); };

function parseFrontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) fail(`Arquivo sem cabeçalho (--- ... ---): ${file}`);
  const meta = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return { meta, body: m[2] };
}

/* ---------- dados ---------- */
const site = readJson('site.json');
const menu = readJson('menu.json');
const formCfg = readJson('formulario.json');
const depoimentos = readJson('depoimentos.json');
const clinicas = readJson('clinicas.json').filter((c) => c.ativa !== false);

const waLink = (text) => `https://wa.me/${site.whatsappPrincipal}?text=${encodeURIComponent(text || site.mensagemWhatsapp)}`;
const telLink = (n) => `tel:+${n}`;
const abs = (u) => (/^https?:/.test(u) ? u : site.url + u);

/* ---------- markdown simples ---------- */
function inline(s) {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => {
    const ext = /^https?:/.test(url) && !url.startsWith(site.url);
    return `<a href="${url}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${txt}</a>`;
  });
  return t;
}

function mdToHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\{\{[a-z]+\}\}$/.test(line.trim())) { out.push(shortcode(line.trim().slice(2, -2))); i++; continue; }
    if (line.trim().startsWith('<')) { out.push(line); i++; continue; }
    let m;
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      const lvl = m[1].length;
      out.push(`<h${lvl} id="${slugify(m[2])}">${inline(m[2])}</h${lvl}>`);
      i++; continue;
    }
    if (/^---+$/.test(line.trim())) { out.push('<hr>'); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<aside class="aviso">${buf.map((b) => `<p>${inline(b)}</p>`).join('')}</aside>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s+/, '')); i++; }
      out.push(`<ul>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      out.push(`<ol>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|[-*]\s|\d+\.\s|>|\{\{)/.test(lines[i])) { buf.push(lines[i]); i++; }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function shortcode(name) {
  if (name === 'cta') return ctaBox();
  if (name === 'telefones') return phonesList();
  return '';
}

/* ---------- componentes ---------- */
function phonesList() {
  return `<ul class="lista-contatos">${site.telefones.map((t) =>
    `<li><strong>${esc(t.nome)}</strong> <span>${esc(t.papel)}</span><br>
      <a href="${telLink(t.numero)}" class="js-tel">${esc(t.exibicao)}</a> &middot;
      <a href="${waLink()}" class="js-wa" target="_blank" rel="noopener">WhatsApp</a></li>`).join('')}</ul>`;
}

function ctaBox(titulo = 'Precisa de orientação agora?', texto = 'Fale com a nossa equipe. O atendimento é 24 horas, com sigilo e sem julgamentos.') {
  return `<section class="cta-box" aria-label="Fale conosco">
    <div><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></div>
    <div class="cta-acoes">
      <a class="btn btn-wa js-wa" href="${waLink()}" target="_blank" rel="noopener">Falar no WhatsApp</a>
      <a class="btn btn-claro js-tel" href="${telLink(site.telefones[0].numero)}">Ligar ${esc(site.telefones[0].exibicao)}</a>
    </div></section>`;
}

const TRANSPARENCIA = 'A CT Viva Feliz é um serviço de encaminhamento. O tratamento é realizado pela clínica parceira, responsável técnica e pelos licenciamentos. Valores e condições são informados antes da contratação.';

/* ---------- páginas (markdown) ---------- */
function loadMdDir(dir) {
  const full = path.join(SRC, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith('.md')).map((f) => {
    const { meta, body } = parseFrontmatter(read(path.join(full, f)), `${dir}/${f}`);
    return { file: f, meta, body };
  });
}

const pages = loadMdDir('pages').map((p) => {
  if (!p.meta.url || !p.meta.title) fail(`Página sem url/title: ${p.file}`);
  return { ...p, url: p.meta.url };
});
const posts = loadMdDir('blog').map((p) => ({ ...p, url: `/blog/${p.file.replace(/\.md$/, '')}/` }))
  .sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''));
const group = (g) => pages.filter((p) => p.meta.group === g).sort((a, b) => Number(a.meta.order || 99) - Number(b.meta.order || 99));
const tratamentos = group('tratamentos');
const remocoes = group('remocao');

/* títulos para breadcrumbs */
const titles = { '/': 'Início', '/unidades/': 'Clínicas', '/blog/': 'Blog', '/contato/': 'Contato' };
pages.forEach((p) => { titles[p.url] = p.meta.nome || p.meta.title; });
clinicas.forEach((c) => { titles[`/unidades/${c.slug}/`] = c.nome; });
posts.forEach((p) => { titles[p.url] = p.meta.title; });

function breadcrumbs(url) {
  if (url === '/') return { html: '', ld: null };
  const segs = url.split('/').filter(Boolean);
  const trail = [{ name: 'Início', url: '/' }];
  let acc = '/';
  segs.forEach((s) => { acc += s + '/'; trail.push({ name: titles[acc] || s, url: acc }); });
  const html = `<nav class="migalhas" aria-label="Você está em"><ol>${trail.map((t, i) =>
    i === trail.length - 1 ? `<li aria-current="page">${esc(t.name)}</li>` : `<li><a href="${t.url}">${esc(t.name)}</a></li>`).join('')}</ol></nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: abs(t.url) })) };
  return { html, ld };
}

/* ---------- layout ---------- */
function navHtml(current) {
  const kids = { tratamentos, remocao: remocoes };
  return menu.map((m) => {
    const active = m.url === '/' ? current === '/' : current.startsWith(m.url);
    const filhos = m.filhos ? kids[m.filhos] : null;
    if (filhos && filhos.length) {
      return `<li class="tem-sub${active ? ' ativo' : ''}"><a href="${m.url}">${esc(m.rotulo)}</a>
        <ul class="sub">${filhos.map((f) => `<li><a href="${f.url}">${esc(f.meta.nome || f.meta.title)}</a></li>`).join('')}</ul></li>`;
    }
    return `<li${active ? ' class="ativo"' : ''}><a href="${m.url}">${esc(m.rotulo)}</a></li>`;
  }).join('');
}

function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': site.url + '/#organizacao',
    name: site.nome,
    description: site.descricaoCurta,
    url: site.url,
    logo: abs('/assets/img/logo.png'),
    image: abs('/assets/img/og-image.jpg'),
    email: site.email,
    telephone: '+' + site.telefones[0].numero,
    taxID: site.cnpj,
    address: { '@type': 'PostalAddress', streetAddress: site.endereco.rua, addressLocality: site.endereco.cidade, addressRegion: site.endereco.uf, addressCountry: 'BR' },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
    sameAs: Object.values(site.redes || {}).filter(Boolean)
  };
}

function layout({ title, description, url, body, schemas = [], ogType = 'website', noindex = false, home = false }) {
  const fullTitle = home ? title : `${title} | ${site.nome}`;
  const bc = breadcrumbs(url);
  const ld = [orgSchema(), ...(bc.ld ? [bc.ld] : []), ...schemas];
  const canonical = abs(url);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0b57a4">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs('/assets/img/og-image.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/css/style.css?v=${BUILD_DATE}">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
<a class="pular" href="#conteudo">Ir para o conteúdo</a>
<div class="faixa-topo"><div class="container">
  <span>Atendimento 24 horas &middot; Todo o Brasil</span>
  <span><a href="${telLink(site.telefones[0].numero)}" class="js-tel">${esc(site.telefones[0].exibicao)}</a> &middot; <a href="${telLink(site.telefones[1].numero)}" class="js-tel">${esc(site.telefones[1].exibicao)}</a></span>
</div></div>
<header class="cabecalho"><div class="container">
  <a class="marca" href="/" aria-label="${esc(site.nome)} - página inicial"><img src="/assets/img/logo.png" alt="Logotipo ${esc(site.nome)}" width="64" height="56"><span>${esc(site.nome)}</span></a>
  <button class="menu-btn" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu"><span></span><span></span><span></span></button>
  <nav id="menu" class="menu" aria-label="Principal"><ul>${navHtml(url)}</ul></nav>
</div></header>
<main id="conteudo">
${bc.html ? `<div class="container">${bc.html}</div>` : ''}
${body}
</main>
<footer class="rodape">
  <div class="container grade-rodape">
    <div>
      <img src="/assets/img/logo.png" alt="" width="72" height="63" loading="lazy">
      <p><strong>${esc(site.nome)}</strong><br>CNPJ ${esc(site.cnpj)}</p>
      <p class="peq">Psicóloga responsável: Sonia Breda - CRP 06/2005-0</p>
    </div>
    <div>
      <h2>Contato</h2>
      ${phonesList()}
      <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a><br>${esc(site.horario)}</p>
      <p>${esc(site.endereco.rua)}, ${esc(site.endereco.bairro)}<br>${esc(site.endereco.cidade)}/${esc(site.endereco.uf)}</p>
    </div>
    <div>
      <h2>Tratamentos</h2>
      <ul>${tratamentos.map((t) => `<li><a href="${t.url}">${esc(t.meta.nome || t.meta.title)}</a></li>`).join('')}</ul>
      <h2>Remoção</h2>
      <ul>${remocoes.map((t) => `<li><a href="${t.url}">${esc(t.meta.nome || t.meta.title)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2>Institucional</h2>
      <ul>
        <li><a href="/sobre/">Sobre nós</a></li>
        <li><a href="/unidades/">Clínicas parceiras</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="/perguntas-frequentes/">Perguntas frequentes</a></li>
        <li><a href="/contato/">Fale conosco</a></li>
        <li><a href="/politica-de-privacidade/">Política de privacidade</a></li>
        <li><a href="/termos-de-uso/">Termos de uso</a></li>
      </ul>
      ${site.redes && site.redes.instagram ? `<p><a href="${esc(site.redes.instagram)}" target="_blank" rel="noopener">Instagram</a> &middot; <a href="${esc(site.redes.facebook)}" target="_blank" rel="noopener">Facebook</a></p>` : ''}
    </div>
  </div>
  <div class="container legal">
    <p>${esc(TRANSPARENCIA)}</p>
    <p>As informações deste site têm caráter informativo e não substituem avaliação médica ou psicológica. Em risco de vida, ligue <strong>SAMU 192</strong>.</p>
    <p>&copy; ${new Date().getFullYear()} ${esc(site.nome)}. Todos os direitos reservados.</p>
  </div>
</footer>
<a class="wa-flutuante js-wa" href="${waLink()}" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path fill="#fff" d="M16 3C9 3 3.4 8.6 3.4 15.5c0 2.4.7 4.7 1.9 6.6L3 29l7.1-2.2c1.8 1 3.8 1.5 5.9 1.5 6.9 0 12.6-5.6 12.6-12.5S22.900 3 16 3zm0 22.700c-1.900 0-3.700-.5-5.300-1.500l-.4-.2-4.200 1.300 1.400-4-.3-.4c-1.100-1.700-1.700-3.600-1.700-5.600C5.500 9.700 10.200 5.100 16 5.100s10.500 4.600 10.500 10.400S21.800 25.700 16 25.700zm5.800-7.800c-.3-.2-1.900-.9-2.200-1-.3-.1-.5-.2-.7.200s-.8 1-1 1.200c-.2.200-.4.200-.7.100-.3-.2-1.300-.5-2.500-1.500-.9-.8-1.500-1.800-1.700-2.100-.2-.3 0-.5.100-.6l.5-.6c.2-.2.200-.3.300-.5.100-.2.100-.4 0-.6l-1-2.300c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.100-.9.400-.3.300-1.200 1.100-1.200 2.800s1.200 3.200 1.400 3.500c.2.200 2.400 3.700 5.800 5.100.8.3 1.400.5 1.900.7.8.3 1.500.2 2.100.1.600-.1 1.900-.8 2.200-1.500.3-.7.3-1.400.2-1.500-.1-.2-.3-.3-.6-.4z"/></svg></a>
<div class="aviso-cookies" id="aviso-cookies" hidden>
  <p>Usamos cookies de medição para melhorar o site e nossos anúncios. Veja a <a href="/politica-de-privacidade/">Política de Privacidade</a>.</p>
  <div><button type="button" class="btn btn-peq" data-cookie="aceitar">Aceitar</button> <button type="button" class="btn btn-peq btn-claro" data-cookie="recusar">Recusar</button></div>
</div>
<script>window.CTVF=${JSON.stringify({ gtagId: (site.analytics && site.analytics.gtagId) || '' })};</script>
<script src="/assets/js/main.js?v=${BUILD_DATE}" defer></script>
</body>
</html>`;
}

/* ---------- saída ---------- */
const written = [];
function emit(url, html, { sitemap = true } = {}) {
  const file = url.endsWith('.html') ? url : path.join(url, 'index.html');
  const full = path.join(DIST, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
  if (sitemap) written.push(url);
}

/* cartões */
const treatLabel = Object.fromEntries(tratamentos.map((t) => [t.meta.tid, t.meta.nome || t.meta.title]));

function cardTrat(t) {
  return `<article class="cartao"><h3><a href="${t.url}">${esc(t.meta.nome || t.meta.title)}</a></h3>
    <p>${esc(t.meta.resumo || t.meta.description)}</p><a class="mais" href="${t.url}">Saiba mais</a></article>`;
}

function clinicImg(c, cls = '') {
  const foto = (c.fotos || [])[0];
  if (foto) return `<img class="${cls}" src="${esc(foto)}" alt="Clínica parceira em ${esc(c.cidade)}/${esc(c.uf)}" loading="lazy">`;
  return `<div class="foto-vazia ${cls}" role="img" aria-label="Foto da clínica em breve"><img src="/assets/img/logo.png" alt="" width="90" height="79"></div>`;
}

function cardClinica(c) {
  const trats = (c.tratamentos || []).map((t) => treatLabel[t]).filter(Boolean);
  return `<article class="cartao cartao-clinica" data-uf="${esc(c.uf)}" data-cidade="${esc(c.cidade.toLowerCase())}" data-trat="${esc((c.tratamentos || []).join(' '))}" data-publico="${esc((c.publico || []).join(' '))}">
    ${clinicImg(c)}
    <div class="cartao-corpo">
      <p class="local">${esc(c.cidade)}/${esc(c.uf)}</p>
      <h3><a href="/unidades/${esc(c.slug)}/">${esc(c.nome)}</a></h3>
      <p>${esc(c.resumo)}</p>
      <ul class="etiquetas">${trats.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <a class="mais" href="/unidades/${esc(c.slug)}/">Ver detalhes</a>
    </div></article>`;
}

function cardPost(p) {
  return `<article class="cartao"><p class="local">${esc(fmtDate(p.meta.date))}</p><h3><a href="${p.url}">${esc(p.meta.title)}</a></h3>
    <p>${esc(p.meta.resumo || p.meta.description)}</p><a class="mais" href="${p.url}">Ler artigo</a></article>`;
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${Number(day)} de ${meses[Number(m) - 1]} de ${y}`;
}

/* ---------- formulário ---------- */
function formHtml() {
  const campos = formCfg.campos.map((c) => {
    const req = c.obrigatorio ? ' required' : '';
    const label = `<label for="f-${c.id}">${esc(c.label)}${c.obrigatorio ? ' <span aria-hidden="true">*</span>' : ''}</label>`;
    let input;
    if (c.tipo === 'select') input = `<select id="f-${c.id}" name="${c.id}"${req}><option value="">Selecione</option>${c.opcoes.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
    else if (c.tipo === 'textarea') input = `<textarea id="f-${c.id}" name="${c.id}" rows="4"${req}></textarea>`;
    else input = `<input id="f-${c.id}" name="${c.id}" type="${c.tipo}"${req}${c.tipo === 'tel' ? ' inputmode="tel" autocomplete="tel"' : ''}${c.id === 'nome' ? ' autocomplete="name"' : ''}>`;
    return `<div class="campo">${label}${input}</div>`;
  }).join('');
  return `<form class="formulario" id="form-contato" novalidate data-endpoint="${esc((site.formulario && site.formulario.endpoint) || '')}" data-wa="${site.whatsappPrincipal}">
    ${campos}
    <div class="campo campo-oculto" aria-hidden="true"><label>Não preencha<input type="text" name="site" tabindex="-1" autocomplete="off"></label></div>
    <div class="campo campo-check"><label><input type="checkbox" name="lgpd" required> Li e concordo com a <a href="/politica-de-privacidade/" target="_blank">Política de Privacidade</a> e autorizo o contato por telefone ou WhatsApp. <span aria-hidden="true">*</span></label></div>
    <button class="btn btn-wa" type="submit">Enviar e falar com a equipe</button>
    <p class="peq">Seus dados são usados apenas para o atendimento. Campos com * são obrigatórios.</p>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>`;
}

/* ---------- páginas especiais ---------- */
function buildHome() {
  const heroTxt = 'Você não precisa enfrentar a dependência sozinho';
  const body = `
<section class="hero"><div class="container hero-grade">
  <div>
    <p class="sobretitulo">Encaminhamento para tratamento de dependência química e álcool</p>
    <h1>${heroTxt}</h1>
    <p class="lead">Orientamos famílias de todo o Brasil, indicamos clínicas parceiras e cuidamos da remoção com discrição e respeito. Atendimento 24 horas, com sigilo.</p>
    <div class="hero-acoes">
      <a class="btn btn-wa js-wa" href="${waLink()}" target="_blank" rel="noopener">Falar no WhatsApp</a>
      <a class="btn btn-claro js-tel" href="${telLink(site.telefones[0].numero)}">Ligar agora</a>
    </div>
    <ul class="selos"><li>24 horas</li><li>Todo o Brasil</li><li>Remoção própria</li><li>Sigilo total</li></ul>
  </div>
  <div class="hero-logo"><img src="/assets/img/logo.png" alt="Beija-flor azul, símbolo da CT Viva Feliz" width="400" height="350"></div>
</div></section>

<section class="secao"><div class="container">
  <h2>Como funciona o encaminhamento</h2>
  <ol class="passos">
    <li><h3>1. Conversa e acolhimento</h3><p>Você conta a situação para a nossa equipe, pelo WhatsApp ou telefone, a qualquer hora.</p></li>
    <li><h3>2. Indicação da clínica</h3><p>Indicamos a clínica parceira mais adequada ao caso e explicamos valores e condições antes de qualquer contratação.</p></li>
    <li><h3>3. Encaminhamento e remoção</h3><p>Se necessário, nossa equipe faz a remoção até a clínica, de forma segura e discreta.</p></li>
  </ol>
  <p class="nota-transparencia">${esc(TRANSPARENCIA)}</p>
</div></section>

<section class="secao secao-areia"><div class="container">
  <h2>Tratamentos e modalidades</h2>
  <p class="intro">Cada família vive uma situação diferente. Conheça as modalidades e fale conosco para entender qual faz sentido no seu caso.</p>
  <div class="grade-cartoes">${tratamentos.map(cardTrat).join('')}</div>
</div></section>

<section class="secao"><div class="container dividido">
  <div>
    <h2>Remoção própria e especializada</h2>
    <p>Fazemos traslado voluntário, remoção involuntária e traslado de/para aeroportos, em carro descaracterizado, com discrição, respeito e segurança para o paciente e para a família.</p>
    <p>A remoção involuntária exige a documentação prevista em lei. Nós orientamos a família em cada etapa.</p>
    <a class="btn" href="/remocao/">Conhecer o serviço de remoção</a>
  </div>
  <ul class="lista-check">
    ${remocoes.map((r) => `<li><a href="${r.url}">${esc(r.meta.nome || r.meta.title)}</a></li>`).join('')}
    <li>Carro descaracterizado</li>
    <li>Atendimento 24 horas, todos os dias</li>
  </ul>
</div></section>

<section class="secao secao-areia"><div class="container">
  <h2>Clínicas parceiras</h2>
  <p class="intro">Trabalhamos com clínicas que atendem à legislação. Use o filtro para encontrar a unidade mais adequada.</p>
  <div class="grade-cartoes">${clinicas.map(cardClinica).join('')}</div>
  <p class="centro"><a class="btn" href="/unidades/">Ver e filtrar clínicas</a></p>
</div></section>

<section class="secao"><div class="container">
  <h2>Quem cuida do seu atendimento</h2>
  <div class="grade-pessoas">${site.profissionais.map((p) => `<article class="pessoa"><img src="${p.foto}" alt="Foto de ${esc(p.nome)}" width="120" height="120" loading="lazy"><div><h3>${esc(p.nome)}</h3><p class="local">${esc(p.titulo)}</p><p>${esc(p.texto)}</p></div></article>`).join('')}</div>
  <p class="centro"><a href="/sobre/">Conheça a CT Viva Feliz</a></p>
</div></section>

${depoimentos.length ? `<section class="secao secao-areia"><div class="container"><h2>Depoimentos</h2><div class="grade-cartoes">${depoimentos.map((d) => `<blockquote class="cartao"><p>${esc(d.texto)}</p><footer>${esc(d.nome)}</footer></blockquote>`).join('')}</div></div></section>` : ''}

${posts.length ? `<section class="secao ${depoimentos.length ? '' : 'secao-areia'}"><div class="container"><h2>Do nosso blog</h2><div class="grade-cartoes">${posts.slice(0, 3).map(cardPost).join('')}</div><p class="centro"><a href="/blog/">Ver todos os artigos</a></p></div></section>` : ''}

<div class="container">${ctaBox('Dê o primeiro passo hoje', 'Uma conversa já ajuda a organizar as ideias. Nossa equipe está disponível 24 horas.')}</div>`;

  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', '@id': site.url + '/#site', url: site.url, name: site.nome, inLanguage: 'pt-BR', publisher: { '@id': site.url + '/#organizacao' } }];
  emit('/', layout({
    title: 'CT Viva Feliz | Tratamento para dependência química e álcool',
    description: 'Encaminhamento para clínicas de tratamento de dependência química e alcoolismo em todo o Brasil. Remoção própria, atendimento 24 horas e sigilo.',
    url: '/', body, schemas: ld, home: true
  }));
}

function buildUnidades() {
  const ufs = [...new Set(clinicas.map((c) => c.uf))].sort();
  const body = `
<section class="secao"><div class="container">
  <h1>Clínicas parceiras</h1>
  <p class="lead">Encontre a clínica indicada para o seu caso. Se preferir, a nossa equipe faz a indicação para você, sem compromisso.</p>
  <form class="filtro" id="filtro-clinicas" aria-label="Filtrar clínicas">
    <div class="campo"><label for="flt-uf">Estado</label><select id="flt-uf"><option value="">Todos</option>${ufs.map((u) => `<option>${esc(u)}</option>`).join('')}</select></div>
    <div class="campo"><label for="flt-trat">Tratamento</label><select id="flt-trat"><option value="">Todos</option>${tratamentos.map((t) => `<option value="${esc(t.meta.tid)}">${esc(t.meta.nome || t.meta.title)}</option>`).join('')}</select></div>
    <div class="campo"><label for="flt-pub">Público</label><select id="flt-pub"><option value="">Todos</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></div>
    <div class="campo"><label for="flt-cid">Cidade</label><input id="flt-cid" type="search" placeholder="Digite a cidade"></div>
    <button class="btn btn-claro" type="reset">Limpar</button>
  </form>
  <p id="filtro-contagem" class="peq" aria-live="polite"></p>
  <div class="grade-cartoes" id="lista-clinicas">${clinicas.map(cardClinica).join('')}</div>
  <div id="filtro-vazio" class="aviso" hidden><p>Nenhuma clínica encontrada com esses filtros. Fale com a nossa equipe: podemos indicar alternativas.</p></div>
  <p class="nota-transparencia">${esc(TRANSPARENCIA)}</p>
  ${ctaBox()}
</div></section>`;
  emit('/unidades/', layout({
    title: 'Clínicas parceiras de tratamento',
    description: 'Veja as clínicas parceiras da CT Viva Feliz e filtre por estado, tipo de tratamento e público. Orientação 24 horas para a sua família.',
    url: '/unidades/', body
  }));

  clinicas.forEach((c) => {
    const url = `/unidades/${c.slug}/`;
    const trats = (c.tratamentos || []).map((t) => tratamentos.find((x) => x.meta.tid === t)).filter(Boolean);
    const fotos = (c.fotos || []).slice(1);
    const b = `
<article class="secao"><div class="container conteudo">
  <h1>${esc(c.nome)} - ${esc(c.cidade)}/${esc(c.uf)}</h1>
  ${clinicImg(c, 'capa')}
  <p class="lead">${esc(c.resumo)}</p>
  <p>${esc(c.descricao)}</p>
  <h2>Destaques</h2>
  <ul class="lista-check">${c.destaques.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
  ${trats.length ? `<h2>Tratamentos atendidos</h2><ul class="etiquetas">${trats.map((t) => `<li><a href="${t.url}">${esc(t.meta.nome || t.meta.title)}</a></li>`).join('')}</ul>` : ''}
  ${fotos.length ? `<h2>Fotos da unidade</h2><div class="galeria">${fotos.map((f) => `<img src="${esc(f)}" alt="Foto da clínica em ${esc(c.cidade)}" loading="lazy">`).join('')}</div>` : ''}
  <h2>Informações técnicas</h2>
  <ul><li><strong>Responsável técnico:</strong> ${esc(c.responsavelTecnico)}</li><li><strong>Licenças:</strong> ${esc(c.licencas)}</li></ul>
  <p class="nota-transparencia">${esc(TRANSPARENCIA)}</p>
  ${ctaBox('Quer conhecer esta clínica?', 'Fale com a nossa equipe para tirar dúvidas, conhecer valores e condições e combinar os próximos passos.')}
</div></article>`;
    emit(url, layout({
      title: `Clínica de tratamento em ${c.cidade}/${c.uf}`,
      description: `${c.resumo} Fale com a CT Viva Feliz, 24 horas.`,
      url, body: b
    }));
  });
}

function buildContato() {
  const body = `
<section class="secao"><div class="container dividido dividido-form">
  <div>
    <h1>Fale com um especialista</h1>
    <p class="lead">Responda algumas perguntas rápidas e a nossa equipe entra em contato. Se for urgente, ligue ou chame no WhatsApp agora.</p>
    ${phonesList()}
    <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a><br>${esc(site.horario)}</p>
    <aside class="aviso"><p><strong>Risco de vida?</strong> Ligue para o SAMU (192) ou vá ao pronto-socorro mais próximo.</p></aside>
    <p class="nota-transparencia">${esc(TRANSPARENCIA)}</p>
  </div>
  <div>${formHtml()}</div>
</div></section>`;
  emit('/contato/', layout({
    title: 'Fale com um especialista',
    description: 'Fale com a equipe da CT Viva Feliz pelo formulário, WhatsApp ou telefone. Atendimento 24 horas, com sigilo, para todo o Brasil.',
    url: '/contato/', body
  }));
}

function buildBlog() {
  const body = `<section class="secao"><div class="container"><h1>Blog</h1>
    <p class="lead">Informação para famílias e pacientes sobre dependência química, álcool e caminhos de tratamento.</p>
    <div class="grade-cartoes">${posts.map(cardPost).join('')}</div>${ctaBox()}</div></section>`;
  emit('/blog/', layout({
    title: 'Blog sobre dependência química e tratamento',
    description: 'Artigos para famílias sobre dependência química, alcoolismo, internação e recuperação, escritos pela equipe da CT Viva Feliz.',
    url: '/blog/', body
  }));
  posts.forEach((p) => {
    const ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: p.meta.title, description: p.meta.description, datePublished: p.meta.date, dateModified: p.meta.date, inLanguage: 'pt-BR', mainEntityOfPage: abs(p.url), image: abs('/assets/img/og-image.jpg'), author: { '@type': 'Organization', name: site.nome }, publisher: { '@id': site.url + '/#organizacao' } }];
    const b = `<article class="secao"><div class="container conteudo">
      <p class="local">${esc(fmtDate(p.meta.date))}</p><h1>${esc(p.meta.title)}</h1>
      ${mdToHtml(p.body)}
      <p class="peq">Este conteúdo é informativo e não substitui avaliação médica ou psicológica.</p>
      ${ctaBox()}</div></article>`;
    emit(p.url, layout({ title: p.meta.title, description: p.meta.description, url: p.url, body: b, schemas: ld, ogType: 'article' }));
  });
}

function buildPages() {
  pages.forEach((p) => {
    let content = mdToHtml(p.body);
    const schemas = [];
    if (p.meta.hub) {
      const list = p.meta.hub === 'tratamentos' ? tratamentos : remocoes;
      content += `<div class="grade-cartoes">${list.map(cardTrat).join('')}</div>`;
    }
    if (p.meta.layout === 'faq') {
      const itens = p.body.split(/^###\s+/m).slice(1).map((blk) => {
        const [q, ...rest] = blk.split('\n');
        return { q: q.trim(), a: rest.join('\n').trim() };
      });
      content = mdToHtml(p.body.split(/^###\s+/m)[0]) + itens.map((it) => `<details class="faq"><summary>${esc(it.q)}</summary>${mdToHtml(it.a)}</details>`).join('');
      schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: itens.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '') } })) });
    }
    if (p.meta.layout === 'sobre') {
      content += `<h2>Quem cuida do seu atendimento</h2><div class="grade-pessoas">${site.profissionais.map((x) => `<article class="pessoa"><img src="${x.foto}" alt="Foto de ${esc(x.nome)}" width="120" height="120" loading="lazy"><div><h3>${esc(x.nome)}</h3><p class="local">${esc(x.titulo)}</p><p>${esc(x.texto)}</p></div></article>`).join('')}</div>`;
    }
    const cta = p.meta.cta === 'nao' ? '' : ctaBox();
    const body = `<article class="secao"><div class="container conteudo"><h1>${esc(p.meta.h1 || p.meta.title)}</h1>${content}${cta}</div></article>`;
    emit(p.url, layout({ title: p.meta.title, description: p.meta.description || site.descricaoCurta, url: p.url, body, schemas }));
  });
}

function build404() {
  const body = `<section class="secao"><div class="container conteudo"><h1>Página não encontrada</h1>
    <p class="lead">O endereço que você procurou não existe ou foi alterado.</p>
    <p><a class="btn" href="/">Voltar ao início</a></p>${ctaBox()}</div></section>`;
  const html = layout({ title: 'Página não encontrada', description: 'Página não encontrada.', url: '/404.html', body, noindex: true });
  emit('/404.html', html, { sitemap: false });
}

function buildExtras() {
  const urls = written.slice().sort();
  const prio = (u) => (u === '/' ? '1.0' : u.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${abs(u)}</loc><lastmod>${BUILD_DATE}</lastmod><priority>${prio(u)}</priority></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
  fs.writeFileSync(path.join(DIST, '.htaccess'), `# Apache: HTTPS, www, página 404 e cache\nRewriteEngine On\nRewriteCond %{HTTPS} off [OR]\nRewriteCond %{HTTP_HOST} !^www\\. [NC]\nRewriteRule ^ https://www.ctvivafeliz.com.br%{REQUEST_URI} [L,R=301]\nErrorDocument 404 /404.html\nOptions -Indexes\n<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml\n</IfModule>\n<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType image/png "access plus 1 year"\n  ExpiresByType image/jpeg "access plus 1 year"\n  ExpiresByType image/gif "access plus 1 year"\n  ExpiresByType text/css "access plus 1 month"\n  ExpiresByType application/javascript "access plus 1 month"\n</IfModule>\n`);
}

/* ---------- execução ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });

buildHome();
buildUnidades();
buildContato();
buildBlog();
buildPages();
build404();
buildExtras();
console.log(`OK: ${written.length} páginas geradas em dist/ (${BUILD_DATE})`);
