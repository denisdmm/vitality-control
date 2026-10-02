# Spec Delta

## MODIFIED Requirements

### Requirement: Registro de receita com medicamentos

O sistema SHALL permitir que um paciente ou um médico registre uma receita médica contendo, obrigatoriamente,
ao menos um medicamento com nome, dose, frequência, marcação de uso contínuo, ao menos um horário de tomada e
duração em dias quando houver prazo definido, e SHALL registrar o arquivo PDF da receita como complemento
opcional. O status inicial da receita SHALL ser `ATIVA`.

O registro da receita com medicamentos SHALL ser aceito independentemente da disponibilidade do armazenamento de
arquivos: quando o armazenamento de arquivos estiver indisponível, o registro SHALL continuar aceito e nenhum
arquivo SHALL ser gravado.

#### Scenario: Médico registra receita para paciente vinculado

- **WHEN** um usuário com papel `MEDICO` registra uma receita para um paciente com vínculo ativo, com seus
  medicamentos e horários, e anexa um PDF válido, com o armazenamento de arquivos disponível
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

#### Scenario: Registro de receita sem armazenamento de arquivos disponível

- **WHEN** o registro de uma receita é enviado sem arquivo anexado e o armazenamento de arquivos está
  indisponível
- **THEN** a receita e seus medicamentos são criados normalmente
- **AND** a consulta da receita informa que não há arquivo associado

### Requirement: Arquivo armazenado com nome opaco e não identificável

Quando o armazenamento de arquivos está disponível, o sistema SHALL gravar o PDF da receita em diretório do
site com nome gerado pelo sistema, não identificável por inspeção visual, e SHALL manter no banco apenas os
metadados e o nome de exibição escolhido no upload.

Quando o armazenamento de arquivos está indisponível, o sistema SHALL NOT gravar nenhum arquivo da receita e
SHALL NOT preparar diretório de arquivos.

#### Scenario: Nome original não é usado no disco

- **WHEN** um arquivo chamado `receita-do-joao-janeiro.pdf` é enviado
- **THEN** o arquivo é gravado com um nome gerado pelo sistema, terminado em `.pdf`, que não contém trechos do nome original

#### Scenario: Nome de armazenamento não é exposto

- **WHEN** a receita é consultada pela API ou exibida na tela
- **THEN** a resposta contém o nome de exibição escolhido no upload e os metadados do arquivo
- **AND** não contém o nome do arquivo em disco nem o caminho do diretório

#### Scenario: Armazenamento indisponível não prepara diretório de arquivos

- **WHEN** a API sobe com o armazenamento de arquivos indisponível
- **THEN** nenhum diretório de arquivos é criado e nenhuma gravação de arquivo da receita é aceita

### Requirement: Download do PDF autorizado por posse ou vínculo

O sistema SHALL servir o PDF da receita somente por operação autenticada que valide a posse da receita ou o
vínculo médico com o paciente, respondendo o download com o nome de exibição escolhido no upload.

O download SHALL ser recusado como recurso indisponível quando o armazenamento de arquivos estiver indisponível,
antes de qualquer acesso ao arquivo e independentemente de quem faz a solicitação.

#### Scenario: Paciente baixa o PDF da própria receita

- **WHEN** o paciente dono da receita solicita o download, com o armazenamento de arquivos disponível
- **THEN** o PDF é devolvido integralmente com o nome de exibição escolhido no upload

#### Scenario: Médico vinculado baixa o PDF

- **WHEN** um `MEDICO` com vínculo ativo com o paciente solicita o download da receita, com o armazenamento de
  arquivos disponível
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

#### Scenario: Download com armazenamento de arquivos indisponível

- **WHEN** uma requisição de download de PDF é feita e o armazenamento de arquivos está indisponível
- **THEN** a operação é recusada informando que o recurso está indisponível
- **AND** o PDF não é devolvido e nenhum acesso ao sistema de arquivos é realizado

## ADDED Requirements

### Requirement: Anexo de PDF recusado quando o armazenamento está indisponível

O sistema SHALL recusar o registro de uma receita que chegue com arquivo anexado enquanto o armazenamento de
arquivos estiver indisponível, sem criar receita, medicamentos ou qualquer arquivo em disco, nem parcial.

#### Scenario: Receita com anexo e armazenamento indisponível

- **WHEN** um paciente ou um médico envia o registro de uma receita com arquivo anexado e o armazenamento de
  arquivos está indisponível
- **THEN** a operação é recusada informando que o recurso está indisponível
- **AND** nenhuma receita e nenhum medicamento são criados
- **AND** nenhum arquivo, nem parcial, é gravado em disco

#### Scenario: Erro de indisponibilidade para o cliente

- **WHEN** o registro com anexo é recusado por indisponibilidade do armazenamento
- **THEN** a resposta identifica o motivo como recurso indisponível, distinguível de erro de validação e de
  erro interno

### Requirement: Interface coerente com a disponibilidade do armazenamento

A interface SHALL ocultar, quando o armazenamento de arquivos estiver indisponível, o envio de anexo no
formulário de receita e o download do PDF no receituário do paciente e do médico, e SHALL manter visível o
cadastro de receita sem anexo.

#### Scenario: Formulário de receita sem envio de anexo

- **WHEN** o paciente ou o médico abre o formulário de receita com o armazenamento de arquivos indisponível
- **THEN** o campo de envio de anexo não é apresentado

#### Scenario: Receituário sem download de PDF

- **WHEN** o paciente ou o médico abre o receituário com o armazenamento de arquivos indisponível
- **THEN** não há indicação de arquivo de PDF nem ação de download para as receitas
- **AND** as receitas e seus medicamentos continuam listados normalmente

#### Scenario: Disponibilidade restaurada

- **WHEN** o armazenamento de arquivos passa a estar disponível
- **THEN** o envio de anexo e o download de PDF voltam a ser apresentados

#### Scenario: Envio de receita sem anexo continua válido

- **WHEN** uma receita é registrada pela interface com o armazenamento de arquivos indisponível
- **THEN** a receita é criada normalmente
