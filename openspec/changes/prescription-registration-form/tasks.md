# Tasks

## 1. Modelo de dados

- [x] 1.1 Tornar `fileStoredName`, `fileDisplayName`, `fileMimeType` e `fileSize` nuláveis em
      `schema.prisma`
- [x] 1.2 Renomear `uploadedById` para `createdById` (`created_by_id`) e a relação para `prescriptionAuthor`
- [x] 1.3 Adicionar `durationDays Int?` (`duration_days`) em `Medication`
- [x] 1.4 Gerar a migration, revisar o SQL, aplicar com `migrate deploy` e conferir `migrate status`
- [x] 1.5 Rodar `prisma:generate` e `npm run build -w backend`

## 2. Contrato e serviço

- [x] 2.1 `CreatePrescriptionMedicationDto` com `durationDays` (1–3650) e `schedules` (`HH:mm`, único, min. 1)
- [x] 2.2 `CreatePrescriptionDto` com `medications` em JSON e `fileDisplayName`/`issuedAt` opcionais
      (parse e validação item a item no serviço, sem `@Transform` — ver nota em `prescriptions.service.ts`)
- [x] 2.3 `PrescriptionFileService.register` aceita ausência de arquivo e devolve `null` no lugar dos metadados
- [x] 2.4 `PrescriptionsService.create` grava receita + medicamentos + horários em uma única escrita
      aninhada do Prisma (atômica por consulta)
- [x] 2.5 Resposta inclui `durationDays` e trata arquivo ausente; `file` responde "sem arquivo" sem tocar disco
- [x] 2.6 `addMedication` e `updateMedication` aceitam `durationDays`; duplicidade de horário retorna 409
- [x] 2.7 `PrescriptionsController` documenta o novo corpo no Swagger (rota de paciente e de médico)
- [x] 2.8 `CleanUploadOnErrorInterceptor` apaga o PDF gravado pelo multer quando a requisição falha
      (DTO inválido, vínculo ausente, erro de banco) — evita PDF órfão em disco

## 3. Validação do backend

- [x] 3.1 `npm run build -w backend` sem erro
- [x] 3.2 Receita com 2 medicamentos + horários + PDF em um único request
- [x] 3.3 Receita sem PDF, com nome de exibição ausente e com arquivo não-PDF
- [x] 3.4 Recusas: sem medicamentos, horário inválido, horário duplicado, duração 0 e 4000
- [x] 3.5 Autorização: médico sem vínculo (403), paciente em receita alheia (404)
- [x] 3.6 Download e listagem com receita sem arquivo; nenhum `fileStoredName` exposto

## 4. Formulário do paciente

- [x] 4.1 `models/prescription.ts` com `durationDays`, arquivo anulável e payload composto
- [x] 4.2 `PrescriptionsService.create` monta `FormData` com `medications` em JSON e arquivo opcional
- [x] 4.3 Modal "Nova receita" com grupos repetíveis de medicamento: nome, dose, frequência, uso contínuo,
      duração e horários (adicionar/remover)
- [x] 4.4 PDF e nome de exibição como campos opcionais, abaixo dos medicamentos
- [x] 4.5 Formulário único também no acréscimo posterior ("Medicamento" em receita existente), em vez de
      um modal separado; edição de horários na listagem foi mantida

## 5. Formulário do médico e widget

- [x] 5.1 `pages/medico/receituario.ts` usa o mesmo formulário composto
- [x] 5.2 Widget `active-medications` exibe a duração ("30 dias" ou "uso contínuo")
- [x] 5.3 Histórico do receituário exibe a duração e esconde "Baixar PDF" quando não há arquivo

## 6. Fechamento

- [x] 6.1 `npm run build -w frontend` sem erro e conferência das rotas `/receituario` e `/medico/receituario`
- [x] 6.2 Fluxo completo validado no backend com o payload do novo formulário: sem PDF (201, `hasFile:
      false`), com PDF (201, `hasFile: true`) e médico vinculado/sem vínculo (201/403)
- [x] 6.3 Limpeza dos dados de teste criados na validação
- [x] 6.4 `tasks.md` da change `prescription-book` ajustada (seção 7) e LOG.md atualizado (Sessão 3)
- [x] 6.5 Specs principais sincronizadas (`prescription-book` e `medication-dashboard`); commit e tag `rx-registration-form`
