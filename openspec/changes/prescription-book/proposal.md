# Proposal

## Why

Hoje a área de medicamentos é uma lista plana (`name`, `dosage`, `frequency`) que o próprio paciente cadastra
para si, sem vínculo com receita médica, sem documento de origem e sem horários de tomada. Não existe
nenhum fluxo de prescrição: o médico que acompanha o paciente não tem onde registrar o que o paciente deve
tomar, e o paciente não tem onde anexar a receita que recebeu.

O Receituário reorganiza essa área em torno de um documento (a receita + seu PDF), onde o médico prescreve
medicamentos e o paciente define os horários de tomada. O dashboard passa a mostrar apenas o tratamento em
curso, e não uma lista acumulada de registros antigos.

## What Changes

- **Nova entidade de receita**: `prescriptions` com paciente, médico emissor (quando houver), data de
  emissão, validade, nome exibido do arquivo e status `ATIVA | ENCERRADA`. Uma receita "válida" (ativa) é
  pré-requisito para o medicamento aparecer no dashboard.
- **Medicamentos passam a pertencer a uma receita**: `medications` ganha `prescriptionId`, `continuousUse`
  (marcação de uso contínuo) e `prescribedById` (médico, quando prescrito). O `frequency` continua sendo
  texto livre, como hoje.
- **Horários de tomada definidos pelo paciente**: `medication_schedules` com `time` no formato `HH:mm`,
  pertencente ao medicamento. Somente o paciente edita os horários; o médico não os altera.
- **Upload de PDF por receita**: 1 arquivo PDF por receita, gravado em
  `backend/uploads/receitas/<uuid>.pdf` (nome opaco, sem identificação visual), com metadados
  (`displayName` escolhido no upload, `size`, `mimeType`, `uploadedById`) no banco. O nome do arquivo em
  disco **nunca** aparece na tela nem na API.
- **Download autenticado**: `GET /api/v1/prescriptions/:id/file` valida posse (paciente ou médico
  vinculado) e devolve o PDF com `Content-Disposition` usando o nome exibido escolhido no upload.
- **Papéis no receituário**:
  - Médico (`MEDICO`) e administrador: criam receita para paciente vinculado, cadastram os medicamentos
    com nome/dosagem/frequência e marcam uso contínuo.
  - Paciente (`PACIENTE`): cria a própria receita com PDF, cadastra os próprios medicamentos e define
    os horários de todos os medicamentos da sua lista.
  - Paciente **não** edita nem exclui medicamento prescrito por médico — apenas os horários.
- **Dashboard**: passa a listar apenas medicamentos com receita ativa **e** marcados como uso contínuo,
  exibindo nome, dosagem, frequência e horários.
- **BREAKING**: o contrato de `GET/POST/PATCH/DELETE /api/v1/medications` muda — deixa de ser uma lista
  plana do usuário e passa a operar sobre receitas. Os registros hoje existentes na tabela `medications`
  são **descartados** (decisão do produto) e recomeçam vazios.
- **BREAKING**: o widget `MedicationTrackerComponent` (rota `/medicamentos`) sai do ar e é substituído
  pelo Receituário, com widget de "medicamentos ativos" no dashboard.

## Capabilities

### New Capabilities
- `prescription-book`: registro de receitas médicas com PDF anexado, medicamentos prescritos por médico,
  marcação de uso contínuo, horários de tomada definidos pelo paciente e as regras de permissão entre
  paciente e médico.
- `medication-dashboard`: exibição no dashboard dos medicamentos em tratamento (receita ativa + uso
  contínuo) com nome, dosagem, frequência e horários.

### Modified Capabilities

Nenhuma — `openspec/specs/` está vazio neste repositório, então não há requisitos existentes a alterar.

## Impact

- **Banco (Prisma)**: `backend/prisma/schema.prisma` ganha `Prescription`, `MedicationSchedule` e os
  novos campos em `Medication`; nova migration destrutiva (drop de `medications` e recriação). Módulos
  `MedicationsModule`/`VaccinesModule` compartilham o arquivo `medications.service.ts` no frontend — o
  split afeta esse arquivo.
- **Backend**: `backend/src/medications/` é reescrito; novo `backend/src/prescriptions/` (controller,
  service, dto, upload com `FileInterceptor`/multer). Novo diretório `backend/uploads/receitas/`
  (fora do versionamento) e variável de ambiente para o caminho base.
- **API**: novo recurso `prescriptions` sob `/api/v1`; `medications` muda de contrato; endpoints de
  médico por paciente seguem o padrão já usado em `vitals` (`@Roles` + vínculo em `PatientDoctor`).
- **Frontend**: novo `core/prescriptions.service.ts`, modelos em `models/prescription.ts`, página
  `pages/receituario/` (paciente) e `pages/medico/receituario/` (médico), novo widget
  `shared/widgets/active-medications.ts` no dashboard, ajustes em `app.routes.ts`, `layout.ts`,
  `pages/dashboard/dashboard.ts` e remoção de `shared/widgets/medication-tracker.ts`.
- **Segurança**: o PDF nunca é servido como arquivo estático; passa por controller autenticado com
  verificação de posse. Nome original do usuário não é usado como nome de arquivo em disco.
