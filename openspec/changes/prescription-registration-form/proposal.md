# Proposal

## Why

O primeiro corte do Receituário inverteu a prioridade do-domain: o PDF virou campo **obrigatório** e os
medicamentos ficaram em um passo separado, gravados por um endpoint próprio depois que a receita já existia.
Na tela isso virou um modal "Nova receita" que só pedia o arquivo, deixando o trabalho real — dizer *quais*
medicamentos, *que dose*, *que horários* e *por quanto tempo* — para outra tela e outra ação.

Isso não corresponde a como uma receita funciona. O conteúdo da receita são os medicamentos; o PDF é apenas o
documento que a comprova, e muitos pacientes nem recebem o arquivo. O resultado atual força o usuário a
inventar nome de arquivo para conseguir salvar qualquer coisa, e permite receitas vazias sem utilidade.

## What Changes

- **O PDF passa a ser opcional**. As quatro colunas de arquivo (`file_stored_name`, `file_display_name`,
  `file_mime_type`, `file_size`) viram nuláveis, e o `uploaded_by_id` passa a significar *autor do registro*
  (renomeado para `created_by_id`), já que pode não haver upload.
- **O cadastro da receita passa a incluir os medicamentos**: `POST /api/v1/prescriptions` (e
  `POST /api/v1/patients/:patientId/prescriptions`) recebe a lista de medicamentos com nome, dose,
  frequência, marcação de uso contínuo, **duração em dias** e **horários**, gravada em uma única transação
  junto com a receita.
- **Duração do tratamento**: `medications.duration_days` (`Int?`, em dias). Vazio = sem prazo definido, o que
  convive com a marcação de uso contínuo já existente.
- **Formulário único na tela**: o modal "Nova receita" ganha grupos repetíveis de medicamento (nome, dose,
  frequência, uso contínuo, duração, horários com adicionar/remover) e mantém o anexo de PDF como campo
  opcional, abaixo dos medicamentos.
- **Frequência continua obrigatória**, como está hoje: os horários dizem *quando* tomar, a frequência diz
  *como* o paciente deve tomar.
- `POST /prescriptions/:id/medications` permanece para acrescentar medicamento a uma receita existente, agora
  aceitando também a duração — nada de capability é removida.

## Impact

- **Specs afetadas**: `prescription-book` (renomeia e reescreve "Registro de receita com PDF obrigatório",
  altera "Medicamento pertence a uma receita" e "Consulta do receituário") e `medication-dashboard`
  (duração passa a ser exibida junto dos dados do medicamento ativo).
- **Código**: `schema.prisma` + nova migration; DTO composto e serviço de prescrição no backend; models,
  service, página do paciente, página do médico e widget no frontend.
- **Contrato**: `CreatePrescriptionDto` ganha `medications` (JSON) e `fileDisplayName`/`file` viram
  opcionais. A resposta de receita passa a trazer `fileDisplayName: null` e `durationDays: null` sem quebrar
  quem já consome. Nenhum endpoint é removido.
- **Dados**: nenhuma receita existe ainda no ambiente (as linhas do dump anterior eram os 4 medicamentos
  legados, já descartados), então a migration é puramente estrutural e sem backfill.
