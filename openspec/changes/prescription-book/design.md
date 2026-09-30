# Design

## Context

Estado atual que molda a abordagem (ver `proposal.md` para a motivação):

- `medications` é uma lista plana por usuário (`name`, `dosage`, `frequency`), sem documento associado e sem
  qualquer vínculo com médico ou paciente. O `MedicationsController` opera só sobre o próprio usuário e valida
  posse por `userId`.
- O padrão de acesso de médico a paciente já existe em `backend/src/vitals/vitals.service.ts`
  (`patientsOfMedico` devolve pacientes vinculados; `pressureForPatient` valida o vínculo em
  `PatientDoctor` e libera `ADMINISTRADOR`) — o Receituário segue exatamente esse desenho em vez de inventar
  um mecanismo novo de autorização.
- Não há, hoje, nenhum upload de arquivo no sistema: `main.ts` não registra assets estáticos e o frontend
  não tem componente de input de arquivo (o `input[app-input]` já traz as classes utilitárias `file:*` do
  Tailwind, então aceita `type="file"` sem alteração).
- Restrições do ambiente: `@nestjs/platform-express` já traz `multer` como dependência transitiva, então upload
  multipart não exige nova dependência. Não há suíte de testes no backend nem specs no frontend — a validação
  disponível é `npm run build -w backend` / `npm run build -w frontend` e verificação manual via Swagger e
  dev server.

## Goals / Non-Goals

**Goals:**

- Modelo de dados que sustente receita → medicamentos → horários, com marcação de uso contínuo e status da receita.
- Armazenamento local de 1 PDF por receita, com nome em disco não identificável e download autenticado.
- Regras de permissão entre paciente e médico centralizadas no service, reaproveitando o padrão de vínculo já
  existente no projeto.
- Filtro de "medicamentos ativos" calculado no backend, para que dashboard e visão do médico não divirjam.
- Escopo entregável em etapas pequenas, cada uma validável por build.

**Non-Goals:**

- Sincronização com farmácias, notificações/lembretes de horário e histórico de adesão (o paciente marcar que
  tomou o remédio) — fora desta change.
- Múltiplos anexos por receita, OCR do PDF, visualização do PDF dentro do app (o download abre o arquivo).
- Trocar o array de `frequency` por catálogo de medicamentos ou códigos (RDC/ANVISA) — `frequency` segue
  texto livre como hoje.
- Introduzir suíte de testes (jest/Karma) no repositório.

## Decisions

### 1. Modelagem: `Prescription` nova + `Medication` realocada + `MedicationSchedule`

```prisma
enum PrescriptionStatus { ATIVA ENCERRADA }

model Prescription {
  id               String             @id @default(uuid())
  patientId        String             @map("patient_id")
  doctorId         String?            @map("doctor_id")  // médico emissor; null quando o paciente registra
  issuedAt         DateTime           @default(now()) @map("issued_at") @db.Timestamptz
  status           PrescriptionStatus @default(ATIVA)
  fileStoredName   String             @map("file_stored_name")
  fileDisplayName  String             @map("file_display_name")
  fileMimeType     String             @map("file_mime_type")
  fileSize         Int                @map("file_size")
  uploadedById     String             @map("uploaded_by_id")
  createdAt        DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime           @updatedAt @map("updated_at") @db.Timestamptz
}

model Medication {
  // campos atuais: name, dosage, frequency, userId
  prescriptionId String  @map("prescription_id")
  continuousUse  Boolean @default(false) @map("continuous_use")
  prescribedById String? @map("prescribed_by_id") // null = lançado pelo próprio paciente
}

model MedicationSchedule {
  id           String @id @default(uuid())
  medicationId String @map("medication_id")
  time         String // "HH:mm"
  @@unique([medicationId, time])
}
```

Racional e alternativas:

- **"Uso contínuo" no medicamento, não na receita.** A pergunta é "este remédio é de uso contínuo", que é
  propriedade do item, não do documento. Uma mesma receita pode ter um antibiótico temporário e um remédio
  de uso contínuo ao mesmo tempo.
- **`time` como `String` "HH:mm" em vez de `Time`/`DateTime`.** O valor é horário de parede, sem data: o mesmo
  horário vale para todos os dias. `String` evita as armadilhas de serialização de `time`/`timestamptz` com fuso
  (o app exibe e trata tudo em horário local) e a ordenação lexicográfica de "HH:mm" coincide com a ordem
  cronológica, o que dispensa ordenação em SQL. O formato é validado no DTO com
  `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`.
- **`@@unique([medicationId, time])`** garante a unicidade no banco; o DTO apenas evita a chamada inútil.
- **Sem `validUntil`.** A vigência é modelada pelo status `ATIVA | ENCERRADA`, que é o que as specs definem;
  expiração automática por data é pergunta em aberto (ver Open Questions).

### 2. Descartar a tabela `medications` em vez de migrar os dados

Decisão de produto: os registros atuais são perdidos. A migration é destrutiva — drop de `medications` e
recriação com os novos campos, mais criação de `prescriptions` e `medication_schedules`.

Racional: o backfill exigiria inventar uma receita fictícia ("Migração") para cada paciente, com médico emissor
nulo e sem PDF, produzindo histórico falso no receituário — pior que a ausência de registro. A alternativa de
manter a tabela atual e adicionar campos opcionais foi descartada porque deixa duas formas de dado válido
convivendo e nenhuma delas é consultável pelo dashboard.

### 3. Arquivo em disco com nome gerado, metadados no banco

Upload gravado em `<UPLOADS_DIR>/receitas/<randomUUID().pdf>`, com `UPLOADS_DIR` defaultando para
`path.join(process.cwd(), 'uploads')` (tanto em `npm run … -w backend` quanto em `cd backend`, o `cwd` é
`backend/`, nos dois fluxos do README). O diretório é criado no bootstrap se não existir.

No banco ficam `fileStoredName`, `fileDisplayName`, `fileMimeType`, `fileSize` e `uploadedById`. O
`fileDisplayName` é o que aparece na tela e no download; o `fileStoredName` nunca é devolvido nas respostas de
listagem — só é usado internamente pelo serviço de arquivo.

Alternativas consideradas: guardar o PDF como `Bytes` no Postgres (rejeitado — engorda backup e dump com
documentos de usuário); bucket externo (rejeitado — o produto definiu pasta local no site; a troca de
implementação fica isolada no serviço de arquivo).

### 4. Download por endpoint autenticado, nunca por asset estático

`GET /api/v1/prescriptions/:id/file` valida posse/vínculo e responde o PDF com
`Content-Disposition: attachment; filename*=UTF-8''<valor codificado>`.

Rejeitado: `app.useStaticAssets()` sobre `uploads/` — sem autenticação, com nome de arquivo adivinhável na URL e
indexação acidental pelo proxy do dev server. Como a pasta fica fora de `frontend/public`, o build do Angular
não a empacota.

`filename*` na forma RFC 5987 resolve nome de exibição com acentos; o `filename=` ASCII é apenas fallback.

### 5. Upload único no POST de criação da receita

`POST` em multipart com `FileInterceptor('file', { storage: diskStorage, limits: { fileSize: 10 * 1024 * 1024 },
fileFilter })` e os campos de texto no corpo. Criar receita e anexar PDF em um passo evita estado intermediário
de receita sem documento. Se a gravação falhar depois da escrita no banco, a transação é desfeita e o arquivo
órfão é apagado em `catch`.

Alternativa: dois passos (criar receita, depois `POST /:id/file`). Rejeitada por duplicar a validação de posse e
por criar receita sem documento — estado que as specs proíbem.

### 6. Permissões no service, reaproveitando o padrão de `vitals`

- `assertCanAccessPrescription(user, patientId)`: paciente só o próprio; `MEDICO` exige `PatientDoctor`;
  `ADMINISTRADOR` passa direto — mesma lógica de `pressureForPatient`, extraída para um helper em
  `backend/src/common/` porque agora serve a dois módulos.
- `prescribedById != null` marca o item como prescrito: o paciente só age sobre `MedicationSchedule`; tentativa de
  `PATCH`/`DELETE` em nome, dosagem, frequência ou `continuousUse` de item prescrito resulta em `403`. Sobre item
  de autoria própria, o paciente edita e exclui livremente.
- A listagem de ativos é filtrada no backend (`status: ATIVA AND continuousUse: true`, com include de
  `schedules` e da receita), para ser fonte única do dashboard e da visão do médico, como a spec exige.

### 7. Contrato de API

Recurso novo `prescriptions`; `medications` passa a operar subordinado a receita e a rota `/medicamentos` da UI
sai do ar:

| Método | Rota | Quem |
|---|---|---|
| GET | `/api/v1/prescriptions?status=` | paciente (as próprias) |
| POST | `/api/v1/prescriptions` (multipart) | paciente (as próprias) |
| GET | `/api/v1/prescriptions/:id` | paciente dono ou médico vinculado |
| GET | `/api/v1/prescriptions/:id/file` | paciente dono ou médico vinculado |
| PATCH | `/api/v1/prescriptions/:id/status` | paciente dono ou médico emissor |
| DELETE | `/api/v1/prescriptions/:id` | paciente dono ou médico emissor |
| GET | `/api/v1/patients/:patientId/prescriptions` | `MEDICO` vinculado, `ADMINISTRADOR` |
| POST | `/api/v1/patients/:patientId/prescriptions` (multipart) | `MEDICO` vinculado, `ADMINISTRADOR` |
| POST | `/api/v1/prescriptions/:id/medications` | dono (item próprio) ou médico emissor/vinculado |
| PATCH | `/api/v1/medications/:id` | conforme regra de autoria |
| DELETE | `/api/v1/medications/:id` | conforme regra de autoria |
| POST | `/api/v1/medications/:id/schedules` | paciente dono do medicamento |
| DELETE | `/api/v1/medication-schedules/:id` | paciente dono do medicamento |
| GET | `/api/v1/medications/active` | paciente (dashboard) |
| GET | `/api/v1/patients/:patientId/medications/active` | `MEDICO` vinculado, `ADMINISTRADOR` |

`GET /api/v1/medications/active` é declarado antes de qualquer rota com `:id` no mesmo controller, para não ser
capturado pelo parâmetro. Endpoints mutáveis recebem decorators de Swagger, como o resto do projeto.

### 8. Frontend: store de signals para a lista de ativos

`core/prescriptions.service.ts` expõe as chamadas HTTP e um estado de signals (`activeMedications`,
`prescriptions`, `loading`, `error`) com `reload()`. O widget do dashboard e a página do receituário leem o mesmo
estado, então salvar horários atualiza o dashboard sem reload — requisito da spec "atualização da listagem
após alterações".

Estrutura: `pages/receituario/receituario.ts` (paciente), `pages/medico/receituario.ts` (médico, reaproveitando
o seletor de paciente de `pages/medico/pressao-arterial.ts`) e `shared/widgets/active-medications.ts`
(dashboard). `shared/widgets/medication-tracker.ts` é removido junto com a rota `/medicamentos`;
`MedicationsService` (frontend) sai, e `core/medications.service.ts` passa a conter apenas `VaccinesService` e
`ExamTypesService`, que já vivem lá.

### 9. Validação sem suíte de testes

Cada etapa termina com `npm run build -w backend` e `npm run build -w frontend`; os casos de permissão, upload e
download são verificados manualmente no Swagger. Introduzir infra de testes é non-goal desta change.

## Risks / Trade-offs

- **[Migration destrutiva em base Neon compartilhada]** → task 0.3 exige dump do banco **antes** de
  `prisma:migrate`, e o diff reverso cobre a estrutura; migration nova, nunca editar SQL já aplicado; em
  produção, `prisma:deploy` com a perda dos dados antigos assumida.
- **[Escrita do banco ok e gravação do arquivo falha → PDF órfão em disco]** → remover o arquivo em `catch` e
  conferir a pasta de uploads ao final da implantação.
- **[`uploads/` não versionado: em produção pode faltar permissão de escrita]** → criação do diretório no
  bootstrap (`mkdirSync` recursivo) e menção no README de que a pasta precisa de backup.
- **[Nome de exibição com acento quebra `Content-Disposition` se enviado em ASCII]** → usar `filename*`
  (RFC 5987) e sanitizar o valor (sem barras, sem `..`, tamanho limitado) antes de persistir.
- **[PDF grande ocupa disco e banda]** → `limits.fileSize` de 10 MB e `fileFilter` por mimetype/extensão.
- **[Filtro de ativos no backend aumenta a carga do dashboard]** → hoje é uma consulta com include em duas
  tabelas; se virar gargalo, cache por usuário entra depois sem mudar contrato.
- **[Troca de rotas no frontend deixa 404 em links antigos]** → `/medicamentos` vira redirect para
  `/receituario`; a remoção definitiva fica para change posterior.
- **[Médico vê apenas pacientes vinculados]** → comportamento já vigente em `vitals`; replicar evita dois
  critérios de visibilidade entre telas do mesmo produto.

## Migration Plan

### Pontos de volta

Três níveis, porque a change é destrutiva em código, em banco e em disco:

| Nível | Ponto de volta | Como se desfaz |
|---|---|---|
| Código | tag `rx-pre-prescription-book` no baseline de `develop`, mais uma tag por grupo de tarefas | `git reset --hard <tag>` ou `git revert` do commit do grupo |
| Banco | dump do dev em `~/backups/vitality-control-antes-rx-<data>.sql` + script reverso `rx-rollback.sql` gerado com `prisma migrate diff` | restaurar o dump, ou aplicar o script reverso se só a estrutura importar |
| Disco | `backend/uploads/` fora do git | PDF órfãos de um rollback são removidos manualmente; o banco é a fonte de verdade, então nenhum registro passa a apontar para arquivo inexistente |

O dump precisa existir **antes** de `npm run prisma:migrate -w backend`: a migration descarta as linhas de
`medications` e o script reverso (gerado do diff entre o schema do datasource e o datamodel novo) não
recupera dados. Se a migration falhar no meio, `prisma migrate resolve --rolled-back <nome>` devolve o estado
antes de tentar de novo.

### Passos

1. `prisma/schema.prisma` com `Prescription`, `PrescriptionStatus`, `MedicationSchedule` e os campos novos em
   `Medication`; `npm run prisma:generate -w backend`.
2. Migration nova (destrutiva) e aplicação em dev com `npm run prisma:migrate -w backend`.
3. Backend: módulo `prescriptions` (controller/service/dto) + reescrita de `medications` para respeitar
   `prescriptionId`, autoria e horários; helper de acesso a paciente extraído para `common/`.
4. Frontend: `core/prescriptions.service.ts`, modelos, página do receituário, página do médico, widget de
   ativos, rotas e navegação.
5. Remoção de `medication-tracker.ts`, do `MedicationsService` e da rota `/medicamentos` (com redirect).
6. Validação: builds das duas apps, fluxo manual de upload/download no Swagger e conferência da listagem de
   ativos no dashboard.
7. Rollback: reverter o deploy da aplicação e restaurar o dump anterior do banco. Não há rollback de dados para
   os medicamentos antigos — perda aceita na decisão de produto.
8. Em produção: `npm run prisma:deploy` antes de subir o backend novo, garantindo que `uploads/` exista com
   permissão de escrita para o usuário do processo.

## Open Questions

- O limite de 10 MB por PDF atende ao uso real (exames digitalizados costumam passar disso)? Ajustável por
  variável de ambiente, sem alterar contrato.
- Retenção e limpeza de receitas encerradas e dos respectivos PDFs (nenhuma, ou por período)?
- O backup de `uploads/` entra no mesmo processo de backup do banco ou é item separado de infraestrutura?
