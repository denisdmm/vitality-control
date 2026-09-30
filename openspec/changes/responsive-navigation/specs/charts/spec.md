# Spec Delta

## ADDED Requirements

### Requirement: Gráfico dentro da largura disponível

O sistema SHALL exibir os gráficos de linha sempre contidos na largura disponível do contêiner que os hospeda,
em qualquer tamanho de viewport. O gráfico SHALL ser redimensionado quando o próprio contêiner mudar de tamanho,
e não apenas quando a janela do navegador mudar. O gráfico SHALL nunca produzir rolagem horizontal da página nem
invadir elementos vizinhos.

#### Scenario: Gráfico em tela estreita

- **WHEN** um gráfico é exibido em viewport estreito, como um celular
- **THEN** ele ocupa a largura disponível e não ultrapassa a borda do contêiner
- **AND** a página não ganha rolagem horizontal

#### Scenario: Contêiner muda de tamanho

- **WHEN** o contêiner do gráfico muda de largura sem que a janela mude — por exemplo, ao abrir ou fechar um menu
  lateral, ou ao passar o gráfico para outra coluna do grid
- **THEN** o gráfico é redimensionado para a nova largura

#### Scenario: Janela é redimensionada

- **WHEN** a janela do navegador muda de largura ou é girada no celular
- **THEN** o gráfico acompanha a nova largura sem distorcer os eixos

#### Scenario: Série longa em tela estreita

- **WHEN** o gráfico tem muitos rótulos no eixo horizontal e a largura é reduzida
- **THEN** os rótulos são reduzidos ou omitidos para caber, sem cortar o eixo
- **AND** a leitura dos valores continua disponível pelo tooltip

#### Scenario: Altura preservada

- **WHEN** o gráfico é redimensionado
- **THEN** a altura definida para ele é preservada, mantendo a proporção de leitura definida no card que o hospeda