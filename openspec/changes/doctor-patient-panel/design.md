# Design

## Contexto

A change implementa três capacidades novas e não altera nenhuma spec vigente. O que já existe e importa:

- `PatientAccessService.assertDoctorCanAccess(requesterId, requesterRole, patientId)` exige vínculo (exceto
  `ADMINISTRADOR`) e é usado por `VitalsService` e `PrescriptionsService` para **escrita e leitura de receita**.
- `VitalsService.patientsOfMedico` devolve os pacientes vinculados, mas só com 5 campos e, para
  `ADMINISTRADOR`, filtra `doctorId = adminId` e volta vazio.
- `GET /api/v1/users` (admin) lista a tabela inteira, sem paginação, e achata vínculos por papel.
- `Prescription.doctorId` é a autoria do emissor e **não** depende do vínculo atual: é isso que permite o
  médico anterior continuar dono das receitas que emitiu depois de perder o vínculo.
- `/api/v1/patients` é servido por `PatientPrescriptionsController`, dentro do módulo de prescrições.

## Decisões

### 1. Módulo novo com prefixo `doctor`, sem mexer em `/api/v1/patients`

Criar `backend/src/doctor-panel` com `@Controller('doctor')`. Não reaproveitar o prefixo `patients` evita
mover os três endpoints de receita que hoje moram em `prescriptions.controller.ts` e evita colisão de rota com
o `PatientPrescriptionsController`. O custo é um prefixo `doctor` que descreve o ator, não o recurso — aceito
porque toda rota nova age, por definição, no contexto do médico.

### 2. Leitura ampliada e escrita restrita: dois métodos, não um só

`PatientAccessService` ganha `assertCanReadChart(requesterId, requesterRole, patientId)`: qualquer `MEDICO`
passa, `ADMINISTRADOR` passa, `PACIENTE` só a si mesmo. `assertDoctorCanAccess` continua intacto e segue sendo
usado por toda escrita. A separação é o ponto: **a ficha é só leitura**, e nenhuma rota de escrita passa a
aceitar médico sem vínculo.

Por que uma única chamada e não abrir `health-records`, `vaccines` e `reports` para médico: essas três
módulos são hoje `dono ou admin`, e ampliar a leitura deles em três lugares diferentes amplia a superfície de
dados de saúde três vezes e cria três lugares para vazar. Um endpoint de resumo, novo, explícito e
documentado, concentra a ampliação em um ponto só, com a trilha de consulta escrita no mesmo lugar.

### 3. Uma tabela de auditoria para vínculo e para consulta

`PatientAuditEvent` (paciente, alvo, ator, ação, data) com ações `LINK_ADDED`, `LINK_REMOVED`,
`PATIENT_TRANSFERRED` e `CHART_VIEWED`. Uma tabela em vez de duas (`PatientDoctorEvent` +
`PatientChartAccess`) porque as duas têm o mesmo formato e a mesma finalidade probatória, e a consulta de
auditoria raramente precisa de uma sem a outra.

Volume: `CHART_VIEWED` cresce a cada abertura de ficha. Em uso de clínica é irrelevante, mas abrir a ficha 40
vezes gera 40 linhas. Não há deduplicação nesta change; se virar problema, a política é uma coluna
`dedupeKey` + índice único parcial, ou agregar por hora.

### 4. N:N mantido; "assumir" é a operação que remove

O usuário escolheu manter N:N, e a ação descrita por ele ("desassociar e associar ao seu perfil") continua
existindo como operação explícita. São três ações distintas, todas registradas:

| Ação | Efeito |
|---|---|
| Adicionar aos meus | cria o vínculo; não toca em ninguém |
| Assumir | remove os vínculos dos outros **médicos** e cria o próprio; admin nunca é removido |
| Apenas visualizar | não altera vínculo nenhum |

"Assumir" é um `prisma.$transaction` com `deleteMany` + `create` + um `PATIENT_TRANSFERRED` no mesmo
`PatientAuditEvent`. O vínculo novo continua N:N depois disso: nada impede o próximo médico de assumir também.

### 5. O que "assumir" não faz

- Não apaga histórico: `Prescription.doctorId` e `Medication.prescribedById` continuam apontando o emissor.
- Não apaga `ClinicalNote` nem muda sua autoria: a nota pertence ao paciente, não ao vínculo.
- Não altera vínculo de `ADMINISTRADOR`, que já bypassa a checagem de acesso.

### 6. `ClinicalNote` é entidade nova, com autor obrigatório

`body` obrigatório, 1–4000 caracteres, `authorId` com `onDelete: Restrict` (não pode sobrar nota órfã de
autor). Edição e remoção só pelo autor ou pelo admin; leitura por qualquer médico com acesso à ficha e pelo
próprio paciente. Não há campo de "tipo" da nota: a primeira versão é texto livre, e tipar agora seria
especulação.

### 7. `medicoGuard` é guarda de rota, não de menu

`auth.guard.ts` ganha `roleGuard(...roles)`, aplicado nas rotas `medico/*`. Hoje a proteção é só de menu: um
`PACIENTE` que digitar `/medico/receituario` monta a tela inteira e só recebe 403 da API. A rota `medico`
passa a redirecionar para `/medico/pacientes`.

### 8. Janela de 90 dias

O resumo entrega 90 dias de `VitalScore` e compara com os 90 anteriores (mínimo, máximo, média, último valor).
90 dias cobre um ciclo de tratamento típico sem inflar a resposta; o paciente que precisa de mais histórico
entra por uma tela própria no futuro, não por esta chamada.

## Risco

**Ampliação de leitura de dado sensível de saúde.** Qualquer médico autenticado passa a abrir a ficha de
qualquer paciente. Mitigações neste desenho: leitura apenas, `PACIENTE` só a si mesmo, escrita ainda exige
vínculo, e toda abertura por terceiro fica registrada em `PatientAuditEvent`. A auditoria é só de
`ADMINISTRADOR`; se houver exigência de conformidade mais forte (aviso ao paciente, prazo de acesso, 2FA),
isso é change própria.

**Vazamento entre áreas.** A ficha passa a reunir dado de vários módulos. `fileStoredName` e caminho de
upload continuam fora de toda resposta, como já vale no Receituário.

**Ruído de auditoria.** Ver decisão 3.

## Fora de escopo

- Consentimento/convite do paciente para assumir.
- Expiração de acesso temporário ("visualizar por 24h").
- Edição de exames, biometria ou medicamentos pelo médico a partir da ficha.
- Notificação ao paciente de que a ficha foi aberta.
- Política de deduplicação da trilha de consulta.
