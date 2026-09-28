# Spec Delta

## Purpose

Dashboard do paciente: exibe os medicamentos que estão em tratamento no momento, com nome, dosagem, frequência
e os horários de tomada definidos pelo paciente.

## ADDED Requirements

### Requirement: Listagem de medicamentos ativos

O sistema SHALL listar no dashboard somente os medicamentos cuja receita esteja com status `ATIVA` e que
estejam marcados como uso contínuo, exibindo nome, dosagem, frequência e horários de tomada.

#### Scenario: Apenas ativos são exibidos

- **WHEN** o paciente possui um medicamento com receita ativa e uso contínuo marcado, outro com receita ativa
  sem uso contínuo, e um terceiro de receita encerrada com uso contínuo marcado
- **THEN** o dashboard lista somente o primeiro medicamento

#### Scenario: Dados exibidos de cada medicamento

- **WHEN** um medicamento ativo é listado
- **THEN** a tela mostra o nome, a dosagem, a frequência e os horários de tomada ordenados

#### Scenario: Horários exibidos ordenados

- **WHEN** o medicamento possui os horários `20:00` e `08:00`
- **THEN** a tela apresenta `08:00` e `20:00`, nessa ordem

#### Scenario: Medicamento sem horários definidos

- **WHEN** um medicamento ativo ainda não tem horário definido pelo paciente
- **THEN** a tela apresenta o medicamento sem horário e sinaliza que os horários ainda não foram definidos

#### Scenario: Lista igual à visão do médico

- **WHEN** o médico consulta os medicamentos ativos de um paciente vinculado
- **THEN** a listagem é idêntica à exibida no dashboard daquele paciente

### Requirement: Estado vazio e carregamento

O sistema SHALL apresentar estado vazio com orientação quando o paciente não tiver medicamentos ativos, e
SHALL sinalizar o carregamento da listagem antes da resposta da API.

#### Scenario: Paciente sem medicamentos ativos

- **WHEN** o paciente não possui nenhum medicamento ativo
- **THEN** a área exibe mensagem informando que não há medicamentos em uso, sem linhas na tabela
- **AND** orienta a registrar uma receita no receituário

#### Scenario: Carregamento em andamento

- **WHEN** a listagem ainda não foi obtida
- **THEN** a área exibe indicador de carregamento e não lista dados parciais

### Requirement: Atualização da listagem após alterações

O sistema SHALL recarregar a listagem de medicamentos ativos sempre que houver alteração em receitas ou
horários, sem exigir recarga manual da página.

#### Scenario: Paciente altera horários

- **WHEN** o paciente salva um novo horário no receituário
- **THEN** o dashboard passa a exibir o novo horário sem recarregar a página

#### Scenario: Médico altera a prescrição

- **WHEN** o médico encerra a receita ou desmarca o uso contínuo de um medicamento
- **THEN** o dashboard do paciente deixa de exibir aquele medicamento na próxima atualização dos dados

#### Scenario: Falha ao obter a listagem

- **WHEN** a listagem não pode ser obtida
- **THEN** a área exibe mensagem de erro pelo mecanismo padrão de notificação e não exibe lista vazia como se fosse ausência de dados
