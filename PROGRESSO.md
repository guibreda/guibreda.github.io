# PROGRESSO - Site CT Viva Feliz

> Última atualização: 27/10/2026

## Objetivo
Site institucional e de encaminhamento da **CT Viva Feliz** (www.ctvivafeliz.com.br): orienta famílias de todo o Brasil e encaminha pacientes para clínicas parceiras de tratamento de dependência química e álcool. Remoção própria (traslado voluntário, involuntário e aeroporto, carro descaracterizado). Atendimento 24h.

## Tecnologias
- Gerador estático em Node.js (`build.js`, sem dependências). Node 18+.
- HTML semântico, CSS e JS puros (sem bibliotecas, sem fontes externas).
- SEO: title/description por página, canonical, Open Graph, JSON-LD (LocalBusiness, WebSite, BreadcrumbList, FAQPage, Article), sitemap.xml, robots.txt, 404, `.htaccess` (HTTPS, www, cache).

## Como usar
- Gerar o site: `node build.js` (cria a pasta `dist/`).
- Publicar: enviar TODO o conteúdo de `dist/` para a hospedagem (raiz do domínio). Se o domínio hoje roda WordPress, faça backup e remova o WordPress antes.
- Mudar telefones, CNPJ, endereço, redes: `src/data/site.json`.
- Clínicas (adicionar/remover): `src/data/clinicas.json` (copiar bloco; `"ativa": false` oculta).
- Perguntas do formulário: `src/data/formulario.json`.
- Depoimentos: `src/data/depoimentos.json`, formato `[{"nome":"M.S., Sorocaba","texto":"..."}]`. Só usar relatos reais e autorizados. Vazio = seção não aparece.
- Textos das páginas: `src/pages/*.md`; artigos: `src/blog/*.md` (novo artigo = novo arquivo com cabeçalho title, description, resumo, date).
- Google Ads/Analytics: colocar o ID em `site.json > analytics.gtagId` (só carrega após aceitar cookies; cliques em WhatsApp/telefone e envio do formulário geram eventos).
- Formulário: sem endpoint, abre o WhatsApp com os dados; para receber por e-mail, cadastrar em formspree.io e colar a URL em `site.json > formulario.endpoint`.

## Estrutura de arquivos
```
build.js  PROGRESSO.md
src/data/   site, clinicas, formulario, depoimentos, menu (.json)
src/pages/  sobre, tratamentos(+6), remocao(+3), perguntas-frequentes, politica-de-privacidade, termos-de-uso
src/blog/   3 artigos
assets/     css/style.css, js/main.js, img/ (logo, sonia, roberto, favicon, og-image, clinicas/)
dist/       site gerado
```

## Concluído e testado (27/10/2026)
- 23 páginas geradas, 0 links internos quebrados, 1 H1 por página, JSON-LD válido.
- Home, Sobre, Tratamentos (hub + 6), Clínicas (filtro por estado/tratamento/público/cidade funcionando + página de cada clínica), Remoção (hub + 3), Blog (3 artigos), FAQ (com schema), Contato (formulário testado), Privacidade (LGPD), Termos, 404.
- Layout responsivo conferido em 1280px e 390px sem rolagem horizontal.

## Pendências / atenção
1. Fotos da clínica: colocar em `assets/img/clinicas/` e listar em `clinicas.json > fotos`.
2. Textos da clínica Alambari são genéricos: revisar com dados reais (estrutura, equipe, rotina).
3. Confirmar endereço de Sorocaba (copiado do site antigo) e se `publico` da clínica é só masculino.
4. Depoimentos reais (com autorização escrita).
5. Foto do Roberto tem 142px: enviar versão maior.
6. Revisão de advogado: Política de Privacidade, Termos e textos de internação involuntária/compulsória e remoção. Revisão do CRP quanto a divulgação.
7. Contrato com a família deve informar com clareza todos os valores e condições; o site não nega nem omite isso.
8. Google Ads para saúde/dependência tem regras próprias; checar políticas antes de anunciar.
9. Cadastrar o site no Google Search Console e enviar `sitemap.xml`; criar perfil no Google Meu Negócio.

## Última tarefa concluída
Build, testes de links, filtro, formulário e visual (desktop e celular).

## Próxima tarefa exata
Receber do dono: fotos da clínica e dados reais; então atualizar `clinicas.json`, rodar `node build.js` e publicar `dist/`.

## Próximas etapas
1. Mais artigos no blog (SEO): sintomas de abstinência, codependência, como escolher clínica.
2. Páginas por cidade/região (SEO local) se desejado.
3. Integrar formulário a e-mail (Formspree) e configurar tag do Google Ads.

## Para continuar sem refazer
Ler este arquivo, conferir os arquivos e executar só a "Próxima tarefa exata". Não recriar o que está concluído.
