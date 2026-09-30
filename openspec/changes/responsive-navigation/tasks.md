# Tasks

## 1. Shell do layout

- [x] 1.1 `layout.ts`: extrair a lista do `<nav>` para um componente `shared/widgets/nav-links.ts` usado pelas
      duas formas do menu, sem duplicar a lista `MENU`
- [x] 1.2 `layout.html`: botão de menu no header (`md:hidden`) e drawer próprio com overlay, botão de fechar e
      `Esc`; o `<aside>` fixo continua `hidden md:flex`
- [x] 1.3 Drawer fecha ao navegar, ao clicar no overlay e no `Esc`, e não fecha junto com o dialog de vínculo
      aberto por cima dele
- [x] 1.4 `main` com `min-w-0` e `overflow-x-hidden`, `aside` com `shrink-0` mantido

## 2. Navegabilidade

- [x] 2.1 `core/back.service.ts` com `historyDepth` (incrementado em cada `NavigationEnd`, zerado no carregamento
      inicial) e `goBack(fallback)`
- [x] 2.2 Botão "Voltar" no header, exibido apenas quando a rota declara `data.backTo`
- [x] 2.3 `app.routes.ts`: `backTo` nas rotas internas (ficha e detalhe de exame para as listas que as abrem;
      `/admin/indices` para `/admin`) e nenhum em `''` nem `/login`
- [x] 2.4 `provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling:
      'enabled' }))` em `app.config.ts`
- [x] 2.5 Remover o `Voltar` manual de `paciente-ficha.ts` e ajustar a ordem dos botões do header da ficha

## 3. Rolagem horizontal das telas

- [x] 3.1 Envelope `overflow-x-auto` nas oito tabelas sem contenção: `glicemia.ts`, `exames.ts`,
      `exames-detail.ts`, `peso.ts`, `pages/receituario/receituario.ts`, `pages/medico/receituario.ts`,
      `shared/widgets/active-medications.ts` e a tabela de `shared/ui/table.ts` se usada fora de envelope
- [x] 3.2 Conferir que o relatório A4 continua com rolagem local (`relatorios.ts:107`) e que nenhum outro
      `w-[...]` fixo ficou sem contenção
- [x] 3.3 Nenhuma tela de primeira lista ganha `whitespace-nowrap` em célula que estoure a largura mínima

## 4. Gráfico

- [x] 4.1 `shared/ui/chart.ts`: `ResizeObserver` no contêiner chamando `chart.resize()`, com desconexão no
      `ngOnDestroy`
- [x] 4.2 `min-w-0` e `overflow-hidden` no div que envolve o `<canvas>` e `max-width: 100%` no próprio canvas
- [x] 4.3 `min-w-0` nos quatro containers de gráfico: `paciente-ficha.ts:148`, `blood-pressure-log.ts:53`,
      `glucose-log.ts:59`, `blood-pressure-report.ts:115`
- [x] 4.4 Série com muitos rótulos em tela estreita: `maxTicksLimit` e rotação continuam legíveis sem cortar o
      eixo x

## 5. Fechamento

- [x] 5.1 `npm run build -w frontend` sem erro
- [ ] 5.2 Dev server (`http://localhost:4300`): 360x800 (Samsung) e 390x844 (iPhone) e 1280x800 — menu abre e
      fecha, navegação funciona pelo drawer, gráfico cabe na tela, tabela rola sem empurrar o menu
- [ ] 5.3 "Voltar" nas telas com e sem histórico: vindo da lista, por link direto e por acesso em nova aba
- [ ] 5.4 Verificar que nenhum diálogo (vínculo, registro de sinais, anotação) foi afetado pelo `Esc` do drawer
- [x] 5.5 `LOG.md` com o que foi feito e as evidências; `backTo` registrado como contrato do layout nas specs