# Spec Delta

## ADDED Requirements

### Requirement: Vínculo do paciente com o médico

O sistema SHALL permitir que um paciente tenha mais de um médico vinculado ao mesmo tempo e SHALL permitir que
um `MEDICO` vincule a si mesmo um paciente, com o vínculo registrado em trilha de auditoria. O
`ADMINISTRADOR` SHALL continuar gerenciando vínculos pela administração de usuários, sem mudança de contrato.

#### Scenario: Paciente com vários médicos

- **WHEN** dois médicos diferentes se vinculam ao mesmo paciente
- **THEN** os dois vínculos coexistem e ambos acessam a ficha do paciente

#### Scenario: Médico vincula a si mesmo

- **WHEN** um `MEDICO` escolhe adicionar um paciente à sua lista
- **THEN** o vínculo é criado e o evento de vínculo é registrado na trilha de auditoria

#### Scenario: Vínculo já existente

- **WHEN** o `MEDICO` já está vinculado ao paciente e repete a ação de adicionar
- **THEN** a operação é aceita sem erro e sem duplicar o vínculo

#### Scenario: Vínculo só é criado com usuário existente e de papel médico

- **WHEN** a operação é executada por um `PACIENTE` ou por usuário inexistente
- **THEN** a operação é recusada

### Requirement: Assumir paciente atendido por outro médico

O sistema SHALL permitir que um `MEDICO` assuma um paciente que já é atendido por outros médicos, mediante
confirmação explícita, removendo os vínculos dos outros médicos e mantendo o próprio, com o registro da troca na
trilha de auditoria. A assunção SHALL NOT apagar o histórico de autoria já existente.

#### Scenario: Confirmação exigida antes de assumir

- **WHEN** o `MEDICO` solicita assumir um paciente de outro médico
- **THEN** o sistema apresenta as opções de assumir ou apenas visualizar, sem executar nenhuma alteração antes
  da escolha

#### Scenario: Assunção remove os vínculos dos outros médicos

- **WHEN** o `MEDICO` confirma a assunção de um paciente vinculado a dois outros médicos
- **THEN** os vínculos dos outros médicos são removidos e o vínculo do `MEDICO` é criado

#### Scenario: Vínculo de administrador é preservado

- **WHEN** a assunção ocorre e o paciente possui vínculo com `ADMINISTRADOR`
- **THEN** esse vínculo permanece, já que o administrador não depende de vínculo para acessar a ficha

#### Scenario: Médico anterior perde escrita, não autoria

- **WHEN** um médico perde o vínculo de um paciente que atendia
- **THEN** ele deixa de poder criar ou alterar receitas e medicamentos desse paciente
- **AND** as receitas que ele emitiu continuam registradas com ele como médico emissor e sob seu
  acompanhamento

#### Scenario: Assunção é registrada

- **WHEN** a assunção é concluída
- **THEN** a trilha de auditoria registra o paciente, o profissional que assumiu, os médicos desvinculados e o
  instante da troca

#### Scenario: Assunção de paciente já próprio

- **WHEN** o `MEDICO` já é o único vínculo do paciente e solicita assumir
- **THEN** a operação é aceita sem alterar nada além do registro do evento

### Requirement: Auditoria de mudanças de vínculo

O sistema SHALL registrar em trilha de auditoria a criação e a remoção de vínculos e a assunção de paciente, com
ator, alvo e instante, e SHALL disponibilizar a consulta dessa trilha ao `ADMINISTRADOR` e ao próprio
paciente, com filtro por paciente e ordenação da mais recente para a mais antiga.

#### Scenario: Vínculo e desvínculo registrados

- **WHEN** um vínculo é criado ou removido
- **THEN** a trilha de auditoria registra a ação correspondente com o profissional e o paciente envolvidos

#### Scenario: Admin gerencia vínculos como hoje

- **WHEN** o `ADMINISTRADOR` altera os vínculos pela edição do usuário
- **THEN** os vínculos são substituídos como hoje e a trilha de auditoria recebe os eventos correspondentes

#### Scenario: Paciente consulta os próprios eventos

- **WHEN** um `PACIENTE` lista a trilha do próprio paciente
- **THEN** recebe os eventos de vínculo ligados a ele, sem eventos de outros pacientes

#### Scenario: Filtro por paciente

- **WHEN** a trilha é consultada com um paciente como filtro
- **THEN** somente os eventos desse paciente são devolvidos
