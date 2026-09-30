# Spec Delta

## ADDED Requirements

### Requirement: Anotação clínica no prontuário do paciente

O sistema SHALL permitir que um `MEDICO` registre anotações clínicas no prontuário de um paciente, com texto
obrigatório, autor e data, e SHALL permitir que a anotação seja consultada por qualquer médico com acesso à
ficha do paciente, pelo próprio paciente e pelo `ADMINISTRADOR`. A anotação SHALL pertencer ao paciente e SHALL
permanecer após o término do vínculo que a originou.

#### Scenario: Médico registra anotação

- **WHEN** um `MEDICO` com acesso ao paciente registra uma anotação
- **THEN** a anotação é criada com o texto informado, o identificador do autor e a data e hora do registro

#### Scenario: Texto obrigatório e limitado

- **WHEN** a anotação é enviada vazia ou com mais de 4000 caracteres
- **THEN** a operação é rejeitada com erro de validação

#### Scenario: Listagem no prontuário

- **WHEN** a ficha do paciente é solicitada
- **THEN** as anotações aparecem com autor e data, da mais recente para a mais antiga

#### Scenario: Autor edita a própria anotação

- **WHEN** o autor da anotação edita ou apaga o próprio texto
- **THEN** a alteração é aplicada e a ficha reflete o novo conteúdo

#### Scenario: Outro médico não altera anotação alheia

- **WHEN** um médico que não é o autor tenta editar ou apagar a anotação
- **THEN** a operação é recusada

#### Scenario: Administrador apaga anotação

- **WHEN** um `ADMINISTRADOR` apaga uma anotação
- **THEN** a anotação é removida e o evento não fica legível na ficha

#### Scenario: Anotação sobrevive ao fim do vínculo

- **WHEN** o médico autor deixa de atender o paciente
- **THEN** a anotação continua no prontuário, com a autoria original preservada

#### Scenario: Paciente lê as próprias anotações

- **WHEN** um `PACIENTE` abre a própria ficha
- **THEN** recebe as anotações escritas pelos médicos que o atenderam
- **AND** não pode criar, editar ou apagar anotações
