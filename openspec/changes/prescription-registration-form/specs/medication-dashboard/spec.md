# Spec Delta

## MODIFIED Requirements

### Requirement: Listagem de medicamentos ativos

O sistema SHALL listar no dashboard somente os medicamentos cuja receita esteja com status `ATIVA` e que
estejam marcados como uso contínuo, exibindo nome, dosagem, frequência, duração do tratamento e horários de
tomada.

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

#### Scenario: Duração do tratamento exibida

- **WHEN** o medicamento ativo tem duração de 30 dias
- **THEN** a tela informa o período de 30 dias junto aos demais dados
- **WHEN** o medicamento ativo não tem prazo definido
- **THEN** a tela o apresenta como uso contínuo, sem período
