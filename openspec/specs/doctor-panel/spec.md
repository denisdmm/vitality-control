# doctor-panel Specification

## Purpose

Área do médico: painel dos pacientes com sinais de acompanhamento pendente, ficha resumida do
prontuário em uma única consulta, trilha de quem abriu a ficha e entrada de menu própria para o painel.

## Requirements

### Requirement: Painel de pacientes do médico

O sistema SHALL apresentar ao `MEDICO` um painel com os pacientes vinculados a ele, ordenados alfabeticamente,
exibindo para cada um o nome, a data da última consulta — entendida como a emissão mais recente de receita para
esse paciente, por qualquer médico —, os médicos já vinculados e os sinais que indicam acompanhamento
pendente: última medição de pressão e de glicemia, peso mais recente, medicamentos sem horário definido e
contadores de exames e anotações. O painel SHALL permitir busca por nome ou número de prontuário entre todos
os pacientes, vinculados ou não, e SHALL oferecer ação para incluir paciente.

#### Scenario: Listagem dos próprios pacientes

- **WHEN** um `MEDICO` abre o painel
- **THEN** recebe os pacientes vinculados a ele, com nome, número de prontuário, data da última consulta,
  médicos vinculados, sinais clínicos e a marcação de que ele já é o médico responsável

#### Scenario: Paciente sem receita emitida

- **WHEN** o paciente vinculado nunca recebeu nenhuma receita
- **THEN** a lista o exibe sem data de última consulta, sinalizando que ainda não houve consulta

#### Scenario: Incluir paciente a partir do painel

- **WHEN** o usuário aciona a ação de incluir paciente
- **THEN** o sistema oferece vincular o paciente aos seus pacientes, assumir quando outro médico já atende ou
  apenas visualizar a ficha, sem alterar vínculo antes da escolha

#### Scenario: Paciente sem sinais registrados

- **WHEN** o paciente vinculado ainda não possui medições, medicamentos ou exames
- **THEN** o painel o exibe normalmente, sinalizando a ausência de dados em vez de omitir o paciente

#### Scenario: Painel sem pacientes

- **WHEN** o `MEDICO` não tem nenhum paciente vinculado
- **THEN** o painel informa que não há pacientes e oferece a busca para vincular o primeiro

#### Scenario: Busca alcança paciente de outro médico

- **WHEN** a busca encontra um paciente que não está vinculado ao `MEDICO`
- **THEN** o resultado é exibido com a identificação dos médicos já vinculados, convidando à decisão entre
  adicionar, assumir ou apenas visualizar

#### Scenario: Administrador não fica sem lista

- **WHEN** um `ADMINISTRADOR` abre o painel
- **THEN** recebe todos os pacientes do sistema, e não uma lista vazia filtrada pelo próprio id

#### Scenario: Filtro por pendência

- **WHEN** o usuário filtra por pacientes com pendência
- **THEN** são exibidos apenas os pacientes com ao menos um destes critérios: medicamento ativo sem horário
  definido, nenhuma medição de biometria nos últimos 7 dias, ou nenhum exame realizado nos últimos 90 dias
  (considerando o paciente sem exame nenhum como pendente)

### Requirement: Ficha resumida do paciente

O sistema SHALL disponibilizar a ficha do paciente em uma única consulta, reunindo perfil, médicos vinculados,
noventa dias de biometria com indicadores calculados (último valor, mínimo, máximo e média de pressão
sistólica, diastólica, pulso, glicemia e peso), medicamentos ativos com horários, receitas, exames com seus
subitens e anotações clínicas. Essa consulta SHALL ser somente leitura para quem não for o médico vinculado.

#### Scenario: Ficha completa em uma requisição

- **WHEN** um `MEDICO` solicita a ficha de um paciente
- **THEN** a resposta reúne biometria, medicamentos, receitas, exames e anotações sem exigir chamadas
  adicionais do front

#### Scenario: Janela de 90 dias com comparação

- **WHEN** o paciente possui medições nos últimos 90 dias e nos 90 anteriores
- **THEN** a resposta traz a série dos últimos 90 dias e os indicadores comparados com o período anterior

#### Scenario: Período sem medições

- **WHEN** o paciente não possui medição nos últimos 90 dias
- **THEN** a ficha é devolvida normalmente, com a série vazia e sinalização de que não há medições recentes

#### Scenario: Médico sem vínculo abre em modo leitura

- **WHEN** um `MEDICO` sem vínculo com o paciente solicita a ficha
- **THEN** a consulta é respondida com todos os dados da ficha
- **AND** nenhuma ação de escrita fica disponível a partir dela

#### Scenario: Paciente não acessa a ficha de terceiros

- **WHEN** um `PACIENTE` solicita a ficha de outro paciente
- **THEN** a operação é recusada

#### Scenario: Ficheiro do paciente não é exposto

- **WHEN** a ficha é devolvida
- **THEN** a resposta não contém nome de arquivo em disco nem caminho de diretório de nenhum PDF de receita

### Requirement: Período da biometria ajustável

A ficha SHALL apresentar por padrão os 90 dias encerrando no dia corrente e SHALL permitir que o `MEDICO` defina
outro período por data de início e data de fim. A operação SHALL ser recusada quando a data inicial for posterior
à data final, quando a data inicial for o dia corrente, quando a data final for futura ou quando o intervalo
ultrapassar 365 dias. Os indicadores SHALL continuar comparados com o período imediatamente anterior, do mesmo
tamanho.

#### Scenario: Período padrão

- **WHEN** a ficha é solicitada sem indicação de período
- **THEN** a resposta traz a biometria dos 90 dias encerrando no dia corrente

#### Scenario: Médico define outro período

- **WHEN** o `MEDICO` escolhe uma data de início e uma data de fim
- **THEN** a série e os indicadores são calculados nesse intervalo
- **AND** a comparação é feita com o período imediatamente anterior, do mesmo tamanho

#### Scenario: Data inicial posterior à data final

- **WHEN** a data inicial escolhida for posterior à data final
- **THEN** a operação é recusada

#### Scenario: Data inicial no dia corrente

- **WHEN** a data inicial escolhida for o dia corrente
- **THEN** a operação é recusada

#### Scenario: Período acima do limite

- **WHEN** o intervalo escolhido ultrapassar 365 dias
- **THEN** a operação é recusada

### Requirement: Trilha de consulta ao prontuário

O sistema SHALL registrar em trilha de auditoria toda abertura de ficha de paciente realizada por `MEDICO` ou
`ADMINISTRADOR`, com o paciente, o profissional, o instante e a ação, e SHALL restringir a consulta dessa
trilha ao `ADMINISTRADOR` e ao próprio paciente — nenhum `MEDICO` consulta a trilha, ainda que tenha aberto a
ficha.

#### Scenario: Abertura por médico registrado

- **WHEN** um `MEDICO` abre a ficha de um paciente
- **THEN** um evento de consulta é registrado com o identificador do paciente, o do médico e a data e hora

#### Scenario: Próprio paciente acessando os próprios dados

- **WHEN** um `PACIENTE` abre a ficha de si mesmo
- **THEN** nenhum evento de consulta é registrado, por se tratar do próprio titular dos dados

#### Scenario: Médico não consulta a trilha

- **WHEN** um `MEDICO` tenta listar a trilha de auditoria
- **THEN** a operação é recusada, mesmo tendo acesso de leitura à ficha

#### Scenario: Paciente consulta a própria trilha

- **WHEN** um `PACIENTE` lista a trilha com o próprio id de paciente
- **THEN** recebe os eventos ligados a si, e a listagem de qualquer outro paciente é recusada

#### Scenario: Auditoria ordena por recência

- **WHEN** o administrador lista a trilha de um paciente
- **THEN** os eventos são devolvidos do mais recente para o mais antigo

### Requirement: Área do médico no menu e nas rotas

O sistema SHALL oferecer no menu da área do médico a entrada de painel de pacientes, SHALL redirecionar a
rota inicial do médico para ela e SHALL impedir que papéis sem autorização de médico abram qualquer rota
`/medico/*`.

#### Scenario: Entrada no menu

- **WHEN** um `MEDICO` ou `ADMINISTRADOR` entra no sistema
- **THEN** o menu da área do médico lista o painel de pacientes como primeira entrada

#### Scenario: Rota inicial do médico

- **WHEN** o usuário acessa `/medico`
- **THEN** é redirecionado para o painel de pacientes

#### Scenario: Paciente em rota de médico

- **WHEN** um `PACIENTE` tenta abrir qualquer rota sob `/medico/`
- **THEN** o acesso é bloqueado antes da renderização da tela
