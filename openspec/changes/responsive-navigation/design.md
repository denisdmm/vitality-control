# Design

## Contexto

O que existe hoje e é relevante:

- `layout/layout.html` tem um único `<aside class="hidden w-60 shrink-0 ... md:flex md:flex-col">` e um header
  com título, `app-health-entry-modal` (só para paciente) e "Sair". Não há botão de menu nem de voltar.
- `layout.ts` tem a constante `MENU`, filtrada por papel em `visibleMenu`, e `pageTitle` derivado de
  `route.root.firstChild?.snapshot.data['title']`. Ou seja, a rota **já** carrega metadados de tela
  (`data.title`), e é por ali que cabe um destino de retorno.
- `app.config.ts` usa `provideRouter(routes)` sem `withInMemoryScrolling`.
- `shared/ui/chart.ts` é o único componente de gráfico (`LineChartComponent`), com `responsive: true` e
  `maintainAspectRatio: false`, altura por `options.height` e `<div class="w-full" [style.height.px]>`.
- Quatro telas usam gráfico: ficha do paciente, widget de pressão, widget de glicemia e relatório de pressão.
- Oito telas têm tabela sem contêiner de rolagem local; `relatorios.ts:107` e os relatórios A4 já têm a
  rolagem local correta.
- Não existe teste no repositório; a validação é build do frontend e verificação manual no dev server
  (`http://localhost:4300`), com `npm run build -w frontend`.

## Decisões

### 1. Drawer reaproveita a lista, não cria outra

A lista `MENU` de `layout.ts` é renderizada duas vezes no template — uma no `<aside>` fixo e outra no drawer —
mas ambas leem o mesmo `visibleMenu()`. Um componente novo `app-nav-links` (em `shared/widgets/`) recebe os itens
e o modo visual; o drawer é só o invólucro.

Alternativa descartada: menu embaixo, no rodapé, com os itens principais e um "Mais". É melhor para o polegar em
uma tela de paciente com poucas entradas, mas o menu tem 14 itens e é filtrado por três papéis; uma barra
fixa que muda de conteúdo conforme o papel obriga a decidir na mão o que é "principal" para cada um, e o que é
principal hoje (`Dashboard`, `Receituário`) não é o principal do médico (`Meus Pacientes`). O drawer não exige
essa decisão.

O drawer fecha ao navegar, ao clicar no overlay e no `Esc`. `DialogComponent` já trata `Esc` e clique no fundo,
mas é `position: fixed` com `place-items-center` no centro da tela; para o drawer é preciso um variante
ancorado à esquerda, então o drawer é markup próprio no `layout.html` em vez de reuso do `DialogComponent`.

### 2. Larguras: o botão do menu é o md breakpoint do Tailwind

768px é o `md` que o `<aside>` já usa. Manter o mesmo valor evita o caso em que o sidebar some e o botão não
aparece. O botão é `md:hidden` e o `<aside>` continua `hidden md:flex`.

### 3. "Voltar" é histórico do navegador, com destino declarado pela rota

O Angular Router não tem "voltar": `Location.back()` navega no histórico do navegador e sai da aplicação quando
o histórico não tem entrada interna — caso do link copiado ou da aba nova. Duas fontes de verdade seriam um
serviço de pilha próprio (mantido em memória, perdido ao recarregar) ou o histórico do navegador.

Escolhido o histórico do navegador, com um piso declarado pela rota: `data.backTo` em `app.routes.ts`. Rota com
`backTo` mostra o botão; o handler tenta `location.back()` e, quando não há histórico interno, navega para
`backTo`. Sem histórico interno não há como saber se existe — a estratégia é o que importa:

- o `Location.back()` só é tentado quando houve navegação dentro da aplicação, marcado por um sinal do próprio
  app (`historyDepth`), incrementado a cada `NavigationEnd` e zerado no carregamento inicial;
- quando `historyDepth === 0`, o botão vai direto para `backTo`, sem tocar no histórico do navegador.

Assim link direto e aba nova caem em `/medico/pacientes` (ou a rota equivalente do módulo), e o botão nunca
tira o usuário da aplicação. Telas de primeiro nível (`''`, `/login`) não declaram `backTo` e não mostram o
botão.

O `Voltar` manual de `paciente-ficha.ts:91` sai: passa a ser o botão do header, e o `data.backTo` da ficha é
`/medico/pacientes`.

### 4. Rolagem horizontal: contenção no CSS do shell e em cada tabela

`<main>` passa a ter `overflow-x-hidden` e `min-w-0`. Só isso resolve o sintoma do menu sumindo, mas esconde o
problema em vez de resolvê-lo: a tabela continuaria cortada, sem barra de rolagem. Por isso as oito telas
recebem `<div class="overflow-x-auto">` em volta da tabela — o mesmo envelope que `medico/pacientes.ts:79` já usa
e que está certo.

`overflow-x-hidden` no `main` é a rede de segurança, não a solução: protege o shell de qualquer tabela ou widget
que amanhã não siga o padrão.

O relatório A4 (`w-[794px]`) não muda: ele já está dentro de `overflow-x-auto` e é um documento com largura de
papel, não uma tabela de dados.

### 5. Gráfico: `ResizeObserver` no componente, `min-w-0` no contêiner

O Chart.js, com `responsive: true`, observa o próprio canvas, mas o canvas não consegue encolher porque o
contêiner — item de flex em coluna — tem `min-width: auto` e não desce abaixo do tamanho intrínseco do elemento
filho. Duas mudanças, e as duas são necessárias:

- `min-w-0` (e `overflow-hidden`) no div que envolve o `<canvas>` dentro de `LineChartComponent`, o que resolve
  o contêiner;
- `ResizeObserver` sobre o div do próprio componente, chamando `chart.resize()` quando a largura muda. Cobre o
  caso em que a largura muda sem a janela mudar — abrir e fechar o drawer, trocar de coluna no grid, girar o
  aparelho com o navegador em tela cheia.

Com o `ResizeObserver` no lugar, a altura por `options.height` continua valendo: `maintainAspectRatio: false`
faz o canvas ocupar a altura do div.

Rótulos do eixo x em tela estreita: `maxTicksLimit` continua com `autoSkip`, e `compressed` continua sendo o
interruptor de densidade. Não há detecção de largura por `matchMedia` dentro do gráfico — quem decide a
densidade é quem monta o gráfico, como já acontece hoje.

### 6. `withInMemoryScrolling` em vez de memoizar rolagem à mão

`provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling:
'enabled' }))` devolve o usuário ao ponto da lista de onde ele saiu, que é o comportamento esperado de "voltar"
em uma lista paginada. Custa uma linha e não exige estado.

## Risco

- **Drawer como markup próprio**: `DialogComponent` trata `Esc` e clique no fundo, mas centralizado; replicar os
  dois comportamentos no drawer são ~10 linhas. Se o `Esc` do drawer não for registrado no `document`, o
  dialog de-linking aberto por cima vai fechar os dois juntos.
- **Regressão visual em desktop**: mexer em `<main>` e no `<aside>` afeta todas as telas. O build passa e não há
  teste automatizado; a verificação é manual no dev server, olhando as telas com tabela mais larga (exames,
  usuários) e as com gráfico.
- **`historyDepth` em memória**: perder ao recarregar é aceitável — recarregar já zera a sessão de navegação, e o
  botão cai em `backTo`, que é o comportamento desejado.

## Fora de escopo

- Suporte a PWA, offline e instalação na tela inicial.
- Barra inferior de abas no celular.
- Densidade de informação por tamanho de tela (número de colunas da tabela, resumo em cartão no lugar da
  tabela): a tabela continua rolável.
- Reordenar o menu ou reduzir o número de entradas.
- Impressão e PDF (mantidos como estão, já com largura de papel).