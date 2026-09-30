# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Registro de receita com PDF obrigatório`
- TO: `### Requirement: Registro de receita com medicamentos`

## MODIFIED Requirements

### Requirement: Registro de receita com medicamentos

O sistema SHALL permitir que um paciente ou um médico registre uma receita médica contendo, obrigatoriamente,
ao menos um medicamento com nome, dose, frequência, marcação de uso contínuo, ao menos um horário de tomada e
duração em dias quando houver prazo definido, e SHALL registrar o arquivo PDF da receita como complemento
opcional. O status inicial da receita SHALL ser `ATIVA`.

#### Scenario: Médico registra receita para paciente vinculado

- **WHEN** um usuário com papel `MEDICO` registra uma receita para um paciente com vínculo ativo, com seus
  medicamentos e horários, e anexa um PDF válido
- **THEN** a receita é criada com status `ATIVA`, associada ao paciente e ao médico emissor
- **AND** os medicamentos são gravados como prescritos por esse médico
- **AND** o nome de exibição informado é o nome do arquivo apresentado na tela

#### Scenario: Paciente registra a própria receita

- **WHEN** um usuário com papel `PACIENTE` registra uma receita para si mesmo, com seus medicamentos e horários
- **THEN** a receita é criada associada ao próprio paciente, sem médico emissor
- **AND** os medicamentos são gravados como de autoria do próprio paciente
- **AND** o status inicial é `ATIVA`

#### Scenario: Receita com medicamentos e horários em um único registro

- **WHEN** a receita é registrada com dois medicamentos, cada um com nome, dose, frequência e horários
- **THEN** a receita é criada com os dois medicamentos e todos os horários informados
- **AND** uma falha ao gravar qualquer item não deixa receita nem medicamentos pela metade

#### Scenario: Receita sem nenhum medicamento

- **WHEN** o registro da receita é enviado sem medicamentos
- **THEN** a operação é rejeitada e nenhuma receita é criada

#### Scenario: Horário inválido no cadastro

- **WHEN** um medicamento do cadastro informa um horário fora do formato `HH:mm`, ou sem nenhum horário
- **THEN** a operação é rejeitada com erro de validação e nada é criado

#### Scenario: Horário duplicado no mesmo cadastro

- **WHEN** um mesmo medicamento do cadastro informa o mesmo horário duas vezes
- **THEN** a operação é rejeitada sem duplicar o registro

#### Scenario: Duração do tratamento registrada

- **WHEN** um medicamento do cadastro informa `30` em duração
- **THEN** o medicamento é gravado com duração de 30 dias e a informação é devolvida na consulta
- **WHEN** a duração não é informada
- **THEN** o medicamento é gravado sem prazo definido

#### Scenario: Receita sem arquivo PDF

- **WHEN** o registro da receita é enviado sem arquivo anexado
- **THEN** a receita e seus medicamentos são criados normalmente
- **AND** a consulta da receita informa que não há arquivo associado

#### Scenario: Arquivo que não é PDF

- **WHEN** o arquivo anexado não tem o tipo ou a extensão PDF
- **THEN** a operação é rejeitada e nenhum arquivo é gravado

#### Scenario: Nome de exibição não informado

- **WHEN** é enviado um arquivo PDF sem nome de exibição
- **THEN** a operação é aceita usando o nome original do arquivo enviado como nome de exibição
- **WHEN** o nome de exibição informado é vazio
- **THEN** a operação é rejeitada com erro de validação

#### Scenario: Médico sem vínculo com o paciente

- **WHEN** um `MEDICO` tenta registrar receita para um paciente com o qual não possui vínculo
- **THEN** a operação é recusada e nenhuma receita é criada

### Requirement: Medicamento pertence a uma receita

O sistema SHALL exigir que todo medicamento pertença a uma receita registrada, com nome, dose e frequência, e
SHALL registrar em cada medicamento a origem da prescrição (médico ou o próprio paciente) e a duração do
tratamento em dias inteiros quando houver prazo definido.

#### Scenario: Cadastro de medicamento avulso

- **WHEN** é tentado cadastrar um medicamento sem informar a receita à qual ele pertence
- **THEN** a operação é rejeitada

#### Scenario: Receita inexistente ou de outro paciente

- **WHEN** é tentado cadastrar um medicamento em receita que não existe ou pertence a outro paciente
- **THEN** a operação é recusada e nenhum medicamento é criado

#### Scenario: Duração fora do intervalo aceito

- **WHEN** a duração informada é zero, negativa ou superior a 3650 dias
- **THEN** a operação é rejeitada com erro de validação

### Requirement: Consulta do receituário

O sistema SHALL listar as receitas do paciente com seus medicamentos, marcação de uso contínuo, duração e
horários, permitindo ao paciente e ao médico vinculado filtrar por status da receita.

#### Scenario: Listagem do paciente

- **WHEN** o paciente abre o receituário
- **THEN** recebe as próprias receitas com medicamentos, marcação de uso contínuo, duração e horários, da
  mais recente para a mais antiga

#### Scenario: Listagem do médico

- **WHEN** o médico abre o receituário de um paciente vinculado
- **THEN** recebe as receitas desse paciente, com os medicamentos que ele prescreveu identificados como tal

#### Scenario: Filtro por status

- **WHEN** o usuário filtra por receitas ativas ou encerradas
- **THEN** somente as receitas do status selecionado são devolvidas

#### Scenario: Receita sem arquivo

- **WHEN** a listagem devolve uma receita registrada sem PDF
- **THEN** a resposta traz a receita e seus medicamentos normalmente
- **AND** informa a ausência de arquivo, sem qualquer dado do caminho em disco
