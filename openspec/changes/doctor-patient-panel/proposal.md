# Proposal

## Why

A área do médico hoje não tem centro. São duas telas (`/medico/pressao-arterial` e `/medico/receituario`) que
repetem o mesmo `app-select` de paciente, alimentado por `GET /api/v1/vitals/patients` — que devolve só
`{ id, name, fullName, medicalRecordNumber, photoUrl }`. Não existe lista de "meus pacientes", não se sabe quem
é o paciente de quem, e um médico que atende o mesmo paciente em outro lugar do sistema não tem como assumir o
vínculo: hoje só o `ADMINISTRADOR` cria e destroy vínculos, e a troca é um `deleteMany` + `create` físico, sem
histórico de quem removeu quem.

O segundo problema é de leitura. `HealthRecordsService.assertOwner`, `VaccinesController` e `ReportsController`
aceitam apenas o dono ou o admin: um médico vinculado não consegue abrir os exames do seu próprio paciente. E
não existe nenhum endpoint que junte a ficha — o médico precisaria disparar N chamadas (`/vitals/pressure/:id`,
`/patients/:id/prescriptions`, `/patients/:id/medications/active`) e ainda ficaria sem exames, sem vacinas, sem histórico de peso e glicemia e sem nenhuma anotação. Não existe
entidade de anotação: `HealthRecord.result` é observação de exame, não prontuário.

O resultado é que o médico não tem como "controlar os pacientes que ele atende" nem como "ver a ficha" de quem
não é dele.

## What Changes

- **Painel de pacientes do médico** (`/medico/pacientes`): lista dos pacientes vinculados a ele com sinais
  clínicos (última medição de pressão e glicemia, peso, adesão de horários, contadores de exames e notas) e
  atalhos para a ficha, o pressionarterial e o receituário. A busca alcança qualquer paciente, vinculado ou
  não, para abrir a ficha em modo somente leitura.
- **Ficha resumida do paciente** (`GET /api/v1/doctor/patients/:id/summary`): uma chamada devolve perfil,
  vínculos, 90 dias de biometria com mínimo/máximo/média, medicamentos ativos, receitas, exames com subitens e
  anotações. Aberta a qualquer `MEDICO`, ao `ADMINISTRADOR` e ao próprio paciente; sempre **somente leitura**
  para quem não é o médico vinculado.
- **Trilha de consulta**: toda abertura de ficha por `MEDICO`/`ADMINISTRADOR` é registrada em
  `PatientAuditEvent` (quem, qual paciente, quando), reaproveitando a mesma tabela para a auditoria de
  vínculos.
- **Vínculo continua N:N**, conforme decisão: o paciente pode ter vários médicos. Três ações no painel:
  **adicionar aos meus** (só cria vínculo), **assumir** (remove os vínculos dos outros médicos e cria o
  próprio, na hora, com a confirmação que o usuário descreveu) e **apenas visualizar** (não altera nada).
- **Assumir não apaga histórico**: `Prescription.doctorId` continua apontando o médico emissor original, então
  o médico anterior mantém a autoria das receitas que ele mesmo emitiu.
- **Anotações clínicas**: nova entidade `ClinicalNote` (paciente, autor, texto, datas). Qualquer médico
  vinculado ou com acesso de leitura e o próprio paciente listam; só o autor edita ou apaga.
- **`medicoGuard` nas rotas `/medico/*`**: hoje qualquer usuário logado consegue abrir `/medico/receituario`
  pela URL e só toma 403 na API depois de a tela montar.
- O `ADMINISTRADOR` continua gerenciando vínculos por `GET/POST/PATCH /api/v1/users`, sem mudança de contrato.

## Impact

- **Specs afetadas**: três capabilities novas — `doctor-panel` (painel, ficha e trilha de consulta),
  `doctor-patient-links` (vínculo, assumir, auditoria) e `clinical-notes`. Nenhuma spec existente é removida ou
  renomeada; `prescription-book` e `medication-dashboard` seguem válidas.
- **Código**: novo módulo `backend/src/doctor-panel` (controller com prefixo `doctor`, service, DTOs),
  extensão de `PatientAccessService` com um método de leitura distinto do de escrita, novo `schema.prisma` +
  migration, `medicoGuard` e três telas novas no frontend (`painel`, `ficha`, diálogo de vínculo) mais
  `PrescriptionsService`/`VitalsService` do frontend para o painel.
- **Contrato**: todos os endpoints novos; nenhum existente muda de forma. `GET /api/v1/vitals/patients` continua
  existindo porque `PatientAccessSummary` é usada por outros serviços — o painel usa um endpoint novo, com
  paginação e busca, porque `GET /api/v1/users` é exclusivo do admin e sem paginação.
- **Superfície de leitura de dados de saúde**: este é o ponto sensível. A ampliação é explícita e
  somente leitura; escrita continua exigindo vínculo. A trilha de consulta é o contrapeso dessa ampliação.
- **Dados**: `PatientDoctor` está vazio de legado relevante e ganha apenas `created_at`;
  `ClinicalNote` e `PatientAuditEvent` são tabelas novas, sem backfill. `PatientAuditEvent` cresce a cada
  abertura de ficha — volume baixo em uso de clínica, mas sem política de deduplicação.
