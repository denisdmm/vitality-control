# Spec Delta

## Purpose

Receituário do paciente: registra receitas médicas com o PDF correspondente, os medicamentos prescritos e os
horários de tomada definidos pelo paciente, separando o que é decisão do médico do que é decisão do paciente.

## ADDED Requirements

### Requirement: Registro de receita com PDF obrigatório

O sistema SHALL permitir que um paciente ou um médico registre uma receita médica contendo, obrigatoriamente,
o arquivo PDF da receita, o nome de exibição escolhido por quem fez o upload, a data de emissão e o status
inicial `ATIVA`.

#### Scenario: Médico registra receita para paciente vinculado

- **WHEN** um usuário com papel `MEDICO` registra uma receita para um paciente com vínculo ativo e anexa um PDF válido
- **THEN** a receita é criada com status `ATIVA`, associada ao paciente e ao médico emissor
- **AND** o nome de exibição informado é o nome do arquivo apresentado na tela

#### Scenario: Paciente registra a própria receita

- **WHEN** um usuário com papel `PACIENTE` registra uma receita para si mesmo e anexa um PDF válido
- **THEN** a receita é criada associada ao próprio paciente, sem médico emissor
- **AND** o status inicial é `ATIVA`

#### Scenario: Registro sem arquivo PDF

- **WHEN** o registro da receita é enviado sem arquivo anexado
- **THEN** a operação é rejeitada e nenhuma receita é criada

#### Scenario: Arquivo que não é PDF

- **WHEN** o arquivo anexado não tem o tipo ou a extensão PDF
- **THEN** a operação é rejeitada e nenhum arquivo é gravado

#### Scenario: Nome de exibição não informado

- **WHEN** o nome de exibição do arquivo é ausente ou vazio
- **THEN** a operação é rejeitada com erro de validação

#### Scenario: Médico sem vínculo com o paciente

- **WHEN** um `MEDICO` tenta registrar receita para um paciente com o qual não possui vínculo
- **THEN** a operação é recusada e nenhuma receita é criada

### Requirement: Arquivo armazenado com nome opaco e não identificável

O sistema SHALL gravar o PDF da receita em diretório do site com nome gerado pelo sistema, não identificável
por inspeção visual, e SHALL manter no banco apenas os metadados e o nome de exibição escolhido no upload.

#### Scenario: Nome original não é usado no disco

- **WHEN** um arquivo chamado `receita-do-joao-janeiro.pdf` é enviado
- **THEN** o arquivo é gravado com um nome gerado pelo sistema, terminado em `.pdf`, que não contém trechos do nome original

#### Scenario: Nome de armazenamento não é exposto

- **WHEN** a receita é consultada pela API ou exibida na tela
- **THEN** a resposta contém o nome de exibição escolhido no upload e os metadados do arquivo
- **AND** não contém o nome do arquivo em disco nem o caminho do diretório

### Requirement: Download do PDF autorizado por posse ou vínculo

O sistema SHALL servir o PDF da receita somente por operação autenticada que valide a posse da receita ou o
vínculo médico com o paciente, respondendo o download com o nome de exibição escolhido no upload.

#### Scenario: Paciente baixa o PDF da própria receita

- **WHEN** o paciente dono da receita solicita o download
- **THEN** o PDF é devolvido integralmente com o nome de exibição escolhido no upload

#### Scenario: Médico vinculado baixa o PDF

- **WHEN** um `MEDICO` com vínculo ativo com o paciente solicita o download da receita
- **THEN** o PDF é devolvido integralmente

#### Scenario: Médico sem vínculo tenta baixar

- **WHEN** um `MEDICO` sem vínculo com o paciente solicita o download
- **THEN** a operação é recusada e o PDF não é devolvido

#### Scenario: Usuário não autenticado tenta baixar

- **WHEN** uma requisição sem credencial válida solicita o download
- **THEN** a operação é recusada e o PDF não é devolvido

#### Scenario: Receita sem arquivo

- **WHEN** é solicitada uma receita sem PDF associado
- **THEN** o sistema informa que não há arquivo disponível em vez de falhar com erro interno

### Requirement: Medicamento pertence a uma receita

O sistema SHALL exigir que todo medicamento pertença a uma receita registrada, com nome, dosagem e frequência,
e SHALL marcar em cada medicamento a origem da prescrição (médico ou o próprio paciente).

#### Scenario: Cadastro de medicamento avulso

- **WHEN** é tentado cadastrar um medicamento sem informar a receita à qual ele pertence
- **THEN** a operação é rejeitada

#### Scenario: Receita inexistente ou de outro paciente

- **WHEN** é tentado cadastrar um medicamento em receita que não existe ou pertence a outro paciente
- **THEN** a operação é recusada e nenhum medicamento é criado

### Requirement: Marcação de uso contínuo

O sistema SHALL permitir que o médico que prescreve e o próprio paciente marquem um medicamento como uso
contínuo, e essa marcação SHALL ser a condição, junto com a receita ativa, para o medicamento aparecer na
listagem de medicamentos ativos.

#### Scenario: Médico marca uso contínuo no cadastro

- **WHEN** o médico cadastra um medicamento para o paciente e marca a caixa de uso contínuo
- **THEN** o medicamento é gravado com a marcação de uso contínuo ativa

#### Scenario: Paciente marca uso contínuo em medicamento próprio

- **WHEN** o paciente cadastra um medicamento na própria receita e marca a caixa de uso contínuo
- **THEN** o medicamento é gravado com a marcação de uso contínuo ativa

#### Scenario: Marcação desmarcada

- **WHEN** o usuário desmarca o uso contínuo de um medicamento
- **THEN** o medicamento deixa de constar na listagem de medicamentos ativos, permanecendo no receituário

### Requirement: Horários de tomada definidos pelo paciente

O sistema SHALL permitir que o paciente defina e remova os horários de tomada de qualquer medicamento da sua
lista, inclusive os prescritos por médico, e o sistema SHALL ordenar os horarios e recusar duplicidades.

#### Scenario: Paciente define horários de medicamento prescrito

- **WHEN** o paciente adiciona os horários `08:00` e `20:00` a um medicamento prescrito por médico
- **THEN** os dois horarios ficam gravados e são apresentados em ordem crescente

#### Scenario: Horário duplicado

- **WHEN** o paciente tenta adicionar um horário já existente no mesmo medicamento
- **THEN** a operação é rejeitada sem duplicar o registro

#### Scenario: Paciente remove um horário

- **WHEN** o paciente remove um horário de um medicamento
- **THEN** o horário deixa de constar da lista, e o restante é preservado

#### Scenario: Horário inválido

- **WHEN** o valor informado não está no formato `HH:mm`
- **THEN** a operação é rejeitada com erro de validação

### Requirement: Separação de responsabilidades entre paciente e médico

O sistema SHALL permitir ao paciente editar e excluir apenas os medicamentos de autoria própria, mantendo
intacto o conteúdo prescrito por médico, sobre o qual o paciente só pode agir nos horários.

#### Scenario: Paciente tenta editar medicamento prescrito

- **WHEN** o paciente tenta alterar nome, dosagem, frequência ou a marcação de uso contínuo de um medicamento prescrito por médico
- **THEN** a operação é recusada com erro de permissão

#### Scenario: Paciente tenta excluir medicamento prescrito

- **WHEN** o paciente tenta excluir um medicamento prescrito por médico
- **THEN** a operação é recusada e o medicamento é preservado

#### Scenario: Paciente edita medicamento próprio

- **WHEN** o paciente altera ou exclui um medicamento de autoria própria
- **THEN** a alteração é aplicada normalmente

#### Scenario: Médico altera medicamento que prescreveu

- **WHEN** o médico que prescreveu altera ou exclui um medicamento da receita que emitiu para paciente vinculado
- **THEN** a alteração é aplicada normalmente

#### Scenario: Convite de outro paciente

- **WHEN** um usuário tenta operar sobre a receita de um paciente com o qual não tem vínculo nem é o próprio paciente
- **THEN** a operação é recusada

### Requirement: Encerramento de receita

O sistema SHALL permitir encerrar uma receita, e SHALL garantir que medicamentos de receita encerrada deixem
de constar na listagem de medicamentos ativos, permanecendo no histórico do receituário.

#### Scenario: Encerrar receita

- **WHEN** o paciente dono ou o médico emissor encerra a receita
- **THEN** o status passa a `ENCERRADA` e seus medicamentos deixam de aparecer como ativos

#### Scenario: Reabrir receita

- **WHEN** o usuário reabre uma receita encerrada
- **THEN** o status volta a `ATIVA` e seus medicamentos marcados como uso contínuo voltam a constar como ativos

#### Scenario: Histórico preservado

- **WHEN** o paciente consulta o receituário após encerrar uma receita
- **THEN** a receita e seus medicamentos continuam listados no histórico, identificados como encerrados

### Requirement: Consulta do receituário

O sistema SHALL listar as receitas do paciente com seus medicamentos, marcação de uso contínuo e horários,
permitindo ao paciente e ao médico vinculado filtrar por status da receita.

#### Scenario: Listagem do paciente

- **WHEN** o paciente abre o receituário
- **THEN** recebe as próprias receitas com medicamentos, marcação de uso contínuo e horários, da mais recente para a mais antiga

#### Scenario: Listagem do médico

- **WHEN** o médico abre o receituário de um paciente vinculado
- **THEN** recebe as receitas desse paciente, com os medicamentos que ele prescreveu identificados como tal

#### Scenario: Filtro por status

- **WHEN** o usuário filtra por receitas ativas ou encerradas
- **THEN** somente as receitas do status selecionado são devolvidas
