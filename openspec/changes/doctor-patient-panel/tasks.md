# Tasks

## 1. Modelo de dados

- [x] 1.1 `ClinicalNote` (`clinical_notes`): `patientId`, `authorId` (`Restrict`), `body`, `createdAt`, `updatedAt`;
      índices por paciente e por data
- [x] 1.2 `PatientAuditEvent` (`patient_audit_events`): `patientId`, `actorId`, `subjectDoctorId?`, `action`
      (`LINK_ADDED`, `LINK_REMOVED`, `PATIENT_TRANSFERRED`, `CHART_VIEWED`), `createdAt`; índice por paciente e
      por data
- [x] 1.3 `PatientDoctor` ganha `createdAt` (`created_at`), para ordenar vínculos
- [x] 1.4 Migration, `prisma:generate` e `npm run build -w backend`

## 2. Autorização de leitura

- [x] 2.1 `PatientAccessService.assertCanReadChart(requesterId, requesterRole, patientId)` — `MEDICO` qualquer,
      `ADMINISTRADOR` qualquer, `PACIENTE` só a si mesmo; `assertDoctorCanAccess` intacto
- [x] 2.2 `assertCanReadChart` confirma que o `:id` é um usuário com papel `PACIENTE` (hoje a checagem de
      vínculo não valida o papel do alvo)
- [x] 2.3 Registro do evento `CHART_VIEWED` na abertura da ficha por `MEDICO`/`ADMINISTRADOR`
- [x] 2.4 Testes manuais: paciente em ficha alheia (403), médico sem vínculo (200), admin (200), paciente
      em ficha própria (200 e sem evento)

## 3. Serviço e endpoints do painel

- [x] 3.1 `backend/src/doctor-panel/` com `doctor-panel.module.ts`, service e DTOs
- [x] 3.2 `GET /api/v1/doctor/patients` — `scope=mine|all`, `search`, `pendingOnly`, paginado; devolve nome,
      `lastPrescriptionAt` (última consulta), médicos vinculados, sinais clínicos e marcadores `linkedToMe` e
      `otherDoctors`
- [x] 3.3 `GET /api/v1/doctor/patients/:id/summary` — perfil, vínculos, 90 dias de `VitalScore` com
      indicadores comparados ao período anterior, medicamentos ativos, receitas, exames com subitens, anotações
- [x] 3.4 `POST /api/v1/doctor/patients/:id/links` (vincular a si mesmo) e
      `POST /api/v1/doctor/patients/:id/transfer` (assumir) em transação, com eventos de auditoria
- [x] 3.5 `GET /api/v1/doctor/audit-events?patientId=` restrito a `ADMINISTRADOR` e ao próprio paciente
- [x] 3.6 `GET/POST /api/v1/doctor/patients/:id/notes`, `PATCH/DELETE /api/v1/doctor/notes/:id` com regra de
      autoria
- [x] 3.7 `@Roles(Role.MEDICO, Role.ADMINISTRADOR)` em todas as rotas mutáveis, `Swagger` em todas, e nenhum
      `fileStoredName`/caminho em resposta
- [x] 3.8 `npm run build -w backend` e matriz de validação no Swagger: vínculo duplicado, assunção, escopo
      `all` para admin, paciente fora de papel, paciente recusado nas rotas de médico
- [x] 3.9 Eventos de vínculo também na edição de usuário pelo `ADMINISTRADOR` (`users.service.ts`): `LINK_ADDED`
      para cada doctorId novo e `LINK_REMOVED` para cada removido

## 4. Anotações clínicas

- [x] 4.1 `ClinicalNote` no `prisma` com `authorId` obrigatório e cascade apenas do paciente
- [x] 4.2 `CreateClinicalNoteDto` (1–4000) e `UpdateClinicalNoteDto` parcial
- [x] 4.3 Regra de autoria: autor edita/apaga, admin apaga, demais recebem 403
- [x] 4.4 Anotação listada na ficha e sobrevive à remoção do vínculo (teste manual)

## 5. Rotas e menu (frontend)

- [x] 5.1 `roleGuard` em `core/auth.guard.ts` e aplicado a todas as rotas `medico/*`
- [x] 5.5 Sinais de pendência com limiares em constantes do service (`PENDING_MEASUREMENT_DAYS = 7`,
      `PENDING_EXAM_DAYS = 90`)
- [x] 5.2 `MENU` do `layout.ts` com "Meus Pacientes" como primeira entrada do médico; `/medico` redireciona
      para `/medico/pacientes`
- [x] 5.3 `core/doctor-panel.service.ts` e models de `patients`, `summary`, `link`, `note` e `auditEvent`
- [x] 5.4 `pages/medico/pacientes.ts` — lista com nome, última consulta e médicos, busca, filtro de pendência,
      ação "Incluir paciente" e atalhos

## 6. Diálogo de vínculo

- [x] 6.1 `shared/widgets/patient-link-dialog.ts` com as três ações (adicionar, assumir, apenas visualizar)
- [x] 6.2 Ao abrir paciente de outro médico, o diálogo informa os médicos atuais e exige escolha explícita
- [x] 6.3 Após assumir, painel e ficha passam a refletir o novo vínculo sem reload

## 7. Ficha do paciente

- [x] 7.1 `pages/medico/paciente-ficha.ts` em `/medico/pacientes/:patientId/ficha`, com rota de paciente
      somente leitura quando não vinculado
- [x] 7.2 Seções: sinais do período, biometria (Chart.js, paleta `chart-1..5`), medicamentos ativos,
      receitas, exames com subitens e anotações
- [x] 7.3 Anotações: listar, criar, editar e apagar conforme a regra de autoria
- [x] 7.4 Seletores de `receituario.ts` e `pressao-arterial.ts` passam a usar o serviço do painel, indicando
      quais pacientes já são do médico

## 8. Fechamento

- [x] 8.1 `npm run build -w backend` e `npm run build -w frontend` sem erro
- [x] 8.2 Fluxo completo no dev server: paciente sem vínculo → apenas visualizar → assumir → anotar → conferir
      no painel
- [x] 8.3 Limpeza dos dados de teste criados na validação
- [x] 8.4 ADR novo em `docs/migration-plan/README.md` para o modelo de acesso ao prontuário
- [x] 8.5 `LOG.md` atualizado, sync das specs principais e commit com tag
