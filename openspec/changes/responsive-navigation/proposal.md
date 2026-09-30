# Proposal

## Why

O layout foi desenhado só para desktop e nunca ganhou critério de responsividade nem de navegabilidade. Três
falhas concretas, observadas em Samsung e iPhone e em telas de painel:

1. **Abaixo de 768px não existe menu.** `frontend/src/app/layout/layout.html:3` traz o `<aside>` como
   `hidden ... md:flex` e o header não tem nenhum botão alternativo. No celular, uma vez dentro do app, não há
   caminho para nenhuma outra tela: o menu some e não volta. É o item "o menu lateral some em algumas páginas",
   e some em *todas* as telas pequenas.

2. **O conteúdo empurra o menu para fora da tela no desktop.** `layout.html:68` deixa `<main>` com
   `overflow-y-auto` e sem contenção horizontal. Oito telas têm tabela sem contêiner de rolagem local
   (`glicemia.ts`, `exames.ts`, `exames-detail.ts`, `peso.ts`, `receituario.ts` — as duas versões —,
   `medico/receituario.ts` e `active-medications.ts`). Quando a tabela é mais larga que a área de conteúdo, a
   página cresce na horizontal e o `aside`, que está à esquerda, sai de vista junto com a rolagem.

3. **O gráfico de pressão estoura a tela.** Os quatro containers de `app-line-chart` são `h-[...] w-full` sem
   `min-w-0` (`paciente-ficha.ts:148`, `blood-pressure-log.ts:53`, `glucose-log.ts:59`,
   `blood-pressure-report.ts:115`). Item de flex sem `min-w-0` não encolhe abaixo do tamanho intrínseco do
   `<canvas>`, e o Chart.js fixa a largura do canvas em pixels: o gráfico nasce com a largura do primeiro
   render e não volta atrás. No celular isso aparece como gráfico cortada ou estourando a borda.

Some a isso a falta de critério de retorno: só existe um "Voltar" em toda a aplicação
(`paciente-ficha.ts:91`), apontando para uma rota fixa. Não há botão de voltar no header, e
`app.config.ts:11` usa `provideRouter(routes)` sem `withInMemoryScrolling`, então o voltar do aparelho
refaz a tela mas perde a posição de rolagem.

## What Changes

- **Menu em duas formas, uma só lista**: sidebar fixa a partir de 768px (como hoje) e, abaixo disso, o mesmo
  menu em drawer aberto por um botão no header, com overlay, botão de fechar e `Esc`. Nenhuma entrada duplicada:
  a lista `MENU` de `layout.ts` continua sendo a única fonte.
- **Critério de retorno no header**: botão "Voltar" em toda tela interna, usando o histórico do navegador; sem
  histórico (acesso direto por URL, link compartilhado) ele cai numa rota segura declarada pela própria rota.
  Telas de primeiro nível (dashboard, login) não mostram o botão.
- **Nenhuma tela pode rolar na horizontal**: `<main>` ganha contenção horizontal e as oito tabelas sem
  contêiner ganham um; o relatório A4 (`w-[794px]`) continua com a sua rolagem local, já que é um documento
  impresso e não uma tabela de dados.
- **Gráfico que respeita o contêiner**: `LineChartComponent` passa a observar o tamanho do próprio contêiner
  (`ResizeObserver`) e a redoimensionar, e o `<canvas>` ganha `max-width: 100%`. Os containers de gráfico
  ganham `min-w-0`. Gráfico passa a ser redimensionado por mudança de contêiner, não só por mudança de janela.
- **`withInMemoryScrolling`** com restauração de posição e âncora, para que voltar Positiona onde o usuário
  estava em vez de no topo.
- Duas capabilities novas: `app-shell` (menu, retorno e contenção de layout) e `charts` (gráfico dentro da
  largura disponível).

## Impact

- **Specs afetadas**: duas capabilities novas, `app-shell` e `charts`. Nenhuma spec vigente é alterada — os
  requisitos atuais de `doctor-panel`, `prescription-book`, `medication-dashboard`, `clinical-notes` e
  `doctor-patient-links` continuam válidos e passam a valer também em tela pequena.
- **Código**: `layout/layout.html`, `layout/layout.ts` (estado do drawer e do botão voltar),
  `app.config.ts`, `shared/ui/chart.ts`, os quatro containers de gráfico, `shared/ui/table.ts` e as oito telas
  com tabela sem contenção.
- **Contrato**: nenhum endpoint muda. A rota pode passar a declarar `data.backTo`, que é consumo do frontend e
  não aparece na API.
- **SemMigration, sem backend**: a change é inteiramente de frontend. A única alteração de contrato é a leitura
  de `data.backTo` pelo layout.
- **Fora de escopo**: não há design mobile paralelo — é o mesmo layout com o menu em drawer; não há barra
  inferior de abas; não há modo offline nem ajuste de densidade de informação por tamanho de tela.