# Spec Delta

## ADDED Requirements

### Requirement: Menu disponível em qualquer tamanho de tela

O sistema SHALL oferecer a navegação entre as telas em qualquer largura de viewport. A partir de 768px o menu
lateral SHALL permanecer fixo, como hoje; abaixo de 768px o mesmo menu SHALL estar disponível por drawer aberto
a partir de um botão no header, com overlay, botão de fechar e fechamento por `Esc`. Em ambos os casos o menu
SHALL ser o mesmo, derivado da mesma lista de entradas filtrada por papel, sem lista paralela.

#### Scenario: Celular abre o menu pelo header

- **WHEN** o usuário está em uma tela interna com viewport abaixo de 768px
- **THEN** o header exibe um botão de menu
- **AND** o menu lateral não ocupa a largura da tela

#### Scenario: Drawer abre, navega e fecha

- **WHEN** o usuário aciona o botão de menu no header em tela pequena
- **THEN** o menu é exibido sobre o conteúdo, com overlay
- **AND** ao escolher uma entrada, a navegação acontece e o menu fecha

#### Scenario: Drawer fecha sem navegar

- **WHEN** o drawer está aberto e o usuário aciona o botão de fechar, o overlay ou a tecla `Esc`
- **THEN** o menu fecha sem alterar a rota atual

#### Scenario: Desktop mantém o menu fixo

- **WHEN** o viewport tem 768px ou mais
- **THEN** o menu lateral permanece visível e fixo, sem botão de menu no header

#### Scenario: Menu respeita o papel do usuário

- **WHEN** o menu é aberto em qualquer tamanho de tela
- **THEN** exibe as mesmas entradas do menu fixo, respeitando o papel do usuário

### Requirement: Retorno à tela anterior

O sistema SHALL oferecer, no header de toda tela que não seja de primeiro nível, uma ação de retorno que
reproduza o histórico de navegação do usuário. A tela SHALL declarar sua rota segura em `data.backTo` da própria
rota, e a ação só SHALL ser exibida quando esse dado existir. Quando não houver histórico — acesso direto por URL,
link compartilhado ou nova aba — a ação SHALL levar à rota segura declarada pela própria rota. Telas de primeiro
nível SHALL não exibir a ação de retorno. O retorno SHALL reposicionar a rolagem no ponto em que o usuário estava.

#### Scenario: Retorno usa o histórico

- **WHEN** o usuário chega a uma ficha a partir da lista de pacientes e aciona "Voltar"
- **THEN** ele retorna à lista de pacientes, na posição de rolagem em que a lista estava

#### Scenario: Acesso direto sem histórico

- **WHEN** o usuário abre a ficha de um paciente diretamente pela URL e aciona "Voltar"
- **THEN** ele é levado à rota segura declarada por essa rota, e não para fora da aplicação nem para a tela em branco

#### Scenario: Primeiro nível sem botão de retorno

- **WHEN** o usuário está no dashboard ou na tela de login
- **THEN** a ação de retorno não é exibida

#### Scenario: Rota interna declara a rota segura

- **WHEN** uma rota declara `data.backTo`
- **THEN** a ação de retorno é exibida e, sem histórico, leva à rota declarada
- **AND** rotas de primeiro nível não declaram `backTo`

#### Scenario: Navegação do próprio aparelho

- **WHEN** o usuário aciona o voltar do navegador ou do aparelho
- **THEN** a tela anterior é restaurada, com a posição de rolagem original

### Requirement: Nenhuma tela rola na horizontal

O sistema SHALL garantir que o conteúdo da aplicação não produza rolagem horizontal da página. Tabelas, listas
e relatórios com largura intrínseca maior que a área disponível SHALL rolar dentro do próprio contêiner, sem
afetar o menu, o header ou a largura da janela.

#### Scenario: Tabela mais larga que a tela

- **WHEN** uma tela exibe tabela com mais colunas que a largura disponível
- **THEN** a tabela rola dentro do seu contêiner
- **AND** o menu lateral e o header permanecem visíveis e na largura da janela

#### Scenario: Relatório em tamanho de papel

- **WHEN** a tela exibe relatório com largura de papel A4
- **THEN** o documento mantém sua largura e rola dentro do próprio contêiner
- **AND** a página não ganha rolagem horizontal

#### Scenario: Tela estreita com tabela

- **WHEN** o viewport é estreito e a tela exibe tabela
- **THEN** nenhum elemento ultrapassa a borda direita da janela

#### Scenario: Modal e painel não empurram a página

- **WHEN** um diálogo ou painel com conteúdo largo é aberto
- **THEN** a rolagem horizontal fica contida nele e o layout ao redor não se move