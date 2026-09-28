# Tasks

## 0. Pontos de volta antes de qualquer mudança destrutiva

- [x] 0.1 Confirmar que o working tree está limpo em relação ao trabalho desta change — `git status --short` deve mostrar apenas `openspec/changes/prescription-book/`, o ajuste de `AGENTS.md` (mudança nossa, de documentação) e as alterações de `.devcontainer/` que já eram do usuário, que não devem ser tocadas
- [x] 0.2 Criar a branch de trabalho a partir de `develop` (`git switch -c feature/prescription-book`) e registrar a tag do baseline (`git tag rx-pre-prescription-book`) antes do primeiro commit; verificar com `git branch --show-current` e `git tag`
- [x] 0.3 Fazer dump do banco de desenvolvimento **antes** da migration destrutiva: com `node backend/tunnel.js` em um terminal e `pg_dump "$DATABASE_URL" > ~/backups/vitality-control-antes-rx-<data>.sql` em outro, conferindo que o arquivo existe, não está vazio e contém a tabela `medications` com dados; confirmar que `pg_dump` está disponível (`pg_dump --version`)
- [x] 0.4 Gerar também o SQL reverso da migration como segunda rede, **depois** de editar o schema em 1.1 (antes de 1.3), com `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > ~/backups/rx-rollback.sql` executado em `backend/`; conferir que o script foi gerado e contém o `DROP TABLE` das tabelas novas
- [x] 0.5 Registrar em `docs/migration-plan/LOG.md` o caminho do dump e da tag do baseline, para que a retomada de sessão saiba de onde voltar
- [ ] 0.6 Ao final de cada grupo (1 a 6), fechar com um commit e uma tag (`git tag rx-grupo-<n>`), de modo que qualquer grupo possa ser revertido isoladamente; verificar com `git log --oneline` e `git tag`

## 1. Modelo de dados e migration

- [x] 1.1 Editar `backend/prisma/schema.prisma` com `enum PrescriptionStatus { ATIVA ENCERRADA }`, `model Prescription`, `model MedicationSchedule` (`@@unique([medicationId, time])`) e os campos `prescriptionId`, `continuousUse`, `prescribedById` em `Medication`; validar com `npx prisma validate` executado em `backend/` (deve reportar schema válido)
- [x] 1.2 Rodar `npm run prisma:generate -w backend` e verificar que o Prisma Client expõe os novos models
- [x] 1.3 Gerar a migration destrutiva com `npm run prisma:migrate -w backend` (drop de `medications`, criação de `prescriptions` e `medication_schedules`) e verificar que o schema resultante no banco contém as três tabelas e que `medications` não existe mais
- [x] 1.4 Registrar em `docs/migration-plan/LOG.md` a decisão de descartar os dados de `medications` e o novo modelo de receita, e confirmar que a entrada nova aparece no arquivo

## 2. Autorização compartilhada de paciente

- [ ] 2.1 Criar em `backend/src/common/` o helper que verifica acesso de médico a paciente a partir de `PatientDoctor` (liberando `ADMINISTRADOR`), na mesma forma de `pressureForPatient`
- [ ] 2.2 Refatorar `VitalsService.pressureForPatient` para usar o helper, preservando as mensagens de erro existentes (`Paciente não encontrado`, `Paciente não vinculado a este médico`) e verificar com `npm run build -w backend` e uma chamada a `GET /api/v1/vitals/pressure/:patientId` no Swagger com médico vinculado e não vinculado

## 3. Módulo de receitas no backend

- [ ] 3.1 Criar `backend/src/prescriptions/dto/` com os DTOs de criação (multipart: nome de exibição, data de emissão), status e listagem por `status`, com validação de `class-validator` e decorators de Swagger
- [ ] 3.2 Implementar o serviço de arquivo em `backend/src/prescriptions/`: resolução de `UPLOADS_DIR` (default `uploads` sob o `cwd` do backend), criação do diretório no bootstrap, gravação em `receitas/<randomUUID().pdf>` e sanitização do nome de exibição (sem barras, sem `..`, tamanho limitado); verificar gravando um arquivo de teste e confirmando que o nome em disco é um UUID e que o diretório é criado quando ausente
- [ ] 3.3 Implementar `POST /api/v1/prescriptions` (multipart, PDF obrigatório) e `POST /api/v1/patients/:patientId/prescriptions` para `MEDICO`/`ADMINISTRADOR`, validando vínculo, tipo PDF e limite de tamanho, com remoção do arquivo órfão quando a escrita no banco falhar; verificar no Swagger: criação sem arquivo, com arquivo não PDF e com PDF válido
- [ ] 3.4 Implementar `GET /api/v1/prescriptions` (com filtro opcional por status, somente as próprias) e `GET /api/v1/patients/:patientId/prescriptions` com os medicamentos, marcação de uso contínuo e horários inclusos, ordenadas da mais recente para a mais antiga
- [ ] 3.5 Implementar `GET /api/v1/prescriptions/:id` validando posse ou vínculo, respondendo 404 para receita de outro paciente
- [ ] 3.6 Implementar `GET /api/v1/prescriptions/:id/file` com `Content-Disposition` em `filename*` (RFC 5987) usando o nome de exibição, validando posse/vínculo e respondendo com mensagem de "sem arquivo" quando não houver PDF; verificar no Swagger o download com paciente dono, médico vinculado e médico sem vínculo
- [ ] 3.7 Implementar `PATCH /api/v1/prescriptions/:id/status` (encerrar/reabrir) e `DELETE /api/v1/prescriptions/:id` com remoção do arquivo em disco, restritos ao paciente dono ou médico emissor
- [ ] 3.8 Implementar `POST /api/v1/prescriptions/:id/medications`, `PATCH /api/v1/medications/:id` e `DELETE /api/v1/medications/:id` exigindo receita válida, gravando `prescribedById` quando a criação vier de médico e recusando com 403 edição/exclusão de item prescrito pelo próprio paciente; verificar no Swagger os quatro casos (criação por médico, edição bloqueada do paciente, edição liberada do item próprio, vínculo inválido)
- [ ] 3.9 Implementar `POST /api/v1/medications/:id/schedules` e `DELETE /api/v1/medication-schedules/:id` restritos ao paciente dono do medicamento, com validação de `HH:mm`, rejeição de duplicidade e ordenação crescente na resposta; verificar tentando adicionar horário inválido, duplicado e válido
- [ ] 3.10 Implementar `GET /api/v1/medications/active` (declaração de rota antes de qualquer `:id`) e `GET /api/v1/patients/:patientId/medications/active`, ambos filtrando `status: ATIVA` e `continuousUse: true`, com nome, dosagem, frequência e horários
- [ ] 3.11 Registrar `PrescriptionsModule` em `app.module.ts`, remover o controller antigo de `medications` e validar que o Swagger em `http://localhost:5000/api` lista os novos endpoints com o prefixo `/api/v1`
- [ ] 3.12 Adicionar `backend/uploads/` ao `.gitignore` e confirmar que `git status` não mostra o PDF de teste criado na tarefa 3.2

## 4. Camada de serviço e modelos no frontend

- [ ] 4.1 Criar `frontend/src/app/models/prescription.ts` com as interfaces de prescrição, medicamento com horários, e os DTOs de envio, espelhando o contrato da seção 7 do design
- [ ] 4.2 Criar `frontend/src/app/core/prescriptions.service.ts` com as chamadas HTTP (incluindo envio de `FormData` sem `Content-Type` manual) e o estado de signals `prescriptions`, `activeMedications`, `loading`, `error` mais `reload()`
- [ ] 4.3 Remover `MedicationsService` de `frontend/src/app/core/medications.service.ts`, mantendo `VaccinesService` e `ExamTypesService`, e verificar com `npm run build -w frontend` que não há referência quebrada

## 5. Telas do receituário e widget de ativos

- [ ] 5.1 Criar `frontend/src/app/shared/widgets/active-medications.ts` consumindo o estado de signals, listando nome, dosagem, frequência e horários dos medicamentos ativos, com estado vazio orientando a registrar uma receita, indicador de carregamento e mensagem de erro pelo `ToastService`
- [ ] 5.2 Trocar o `MedicationTrackerComponent` por `ActiveMedicationsComponent` em `frontend/src/app/pages/dashboard/dashboard.ts`
- [ ] 5.3 Criar `frontend/src/app/pages/receituario/receituario.ts`: listagem das receitas com status, criação com upload de PDF e nome de exibição, cadastro de medicamento próprio com a caixa de uso contínuo, edição dos horários de qualquer medicamento da lista e encerramento/reabertura de receita
- [ ] 5.4 Criar `frontend/src/app/pages/medico/receituario.ts` reaproveitando o seletor de paciente de `pages/medico/pressao-arterial.ts`, com criação de receita para o paciente selecionado, cadastro de medicamento prescrito e marcação de uso contínuo
- [ ] 5.5 Atualizar `app.routes.ts` (rota `/receituario` e `/medico/receituario` com `roles` no layout, redirect de `/medicamentos` para `/receituario`) e `layout.ts` (entradas de navegação "Receituário" e "Receituário dos Pacientes"), removendo a entrada "Medicamentos"
- [ ] 5.6 Apagar `frontend/src/app/shared/widgets/medication-tracker.ts` e verificar com `npm run build -w frontend` e navegação no dev server que o receituário abre, o upload envia o PDF e os horários editados aparecem no dashboard sem recarregar a página

## 6. Verificação de integração

- [ ] 6.1 Rodar `npm run build -w backend` e `npm run build -w frontend` e confirmar que ambos terminam sem erro
- [ ] 6.2 Percorrer no Swagger o fluxo completo: paciente cria receita com PDF, baixa o PDF, adiciona medicamento e horários; médico vinculado cria receita e medicamento prescrito; paciente recebe 403 ao tentar alterar o medicamento prescrito; listagem de ativos reflete receita encerrada
- [ ] 6.3 Conferir no dev server (`http://localhost:4300`) o fluxo do paciente e do médico, o download do PDF abrindo com o nome escolhido no upload e a atualização do dashboard após editar horários
- [ ] 6.4 Verificar que nenhum endpoint devolve `fileStoredName` ou caminho de diretório e que `GET /api/v1/medications/active` não retorna medicamentos de receita encerrada
