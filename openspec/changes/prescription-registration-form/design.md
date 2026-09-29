# Design

## Contexto

A change `prescription-book` foi implementada e sincronizada com o PDF obrigatório e o medicamento em passo
separado. Esta change corrige o modelo de entrada sem tocar no restante do Receituário: autorização, status,
horários e dashboard continuam como estão.

## Decisões

### 1. `medications` chega como JSON no multipart

`POST /prescriptions` continua sendo `multipart/form-data` porque o arquivo opcional precisa ir junto. O
problema clássico é mandar array de objetos em multipart: com notação de colchetes
(`medications[0][name]=X`) o multer entrega as chaves literais em `req.body` e o `ValidationPipe` com
`whitelist` as descarta antes de qualquer DTO.

Escolhido: **um campo de texto `medications` com o array em JSON**, convertido por `@Transform` antes da
validação declarativa. Um valor que não seja um array JSON permanece string e é reprovado por `@IsArray` com
mensagem explícita, então o erro chega como 400 e não como 500.

- **Vantagens**: um request só (receita + medicamentos + horários entram juntos), validação declarativa
  preservada via `@ValidateNested` + `@Type`, e nenhum estado intermediario no banco.
- **Desvantagens**: o Swagger mostra `medications` como string; o conteúdo é um JSON valido dentro de um
  request JSON-ish.
- **Alternativa descartada**: notação de colchetes + `transform` global para reparsear `req.body` — funciona,
  mas afeta todos os endpoints do projeto e é mais difícil de debugar. Outra alternativa, base64 no corpo
  JSON, evita o multipart mas infla o payload em 33% e empurra o limite de 10 MB para ~13 MB de JSON.

### 2. Uma transação para receita + medicamentos

A gravação usa `prisma.$transaction`: ou a receita e todos os medicamentos e horários entram, ou nada entra.
Com o passo separado, uma falha no segundo medicamento deixava receita vazia na tela — exatamente o estado
que o usuário passage agora.

`prescribedById` continua sendo derivado do papel (médico/admin = prescritor, paciente = autor próprio), e
`userId` do medicamento é o paciente da receita, nunca quem cadastrou. Esses dois campos não vêm do corpo.

### 3. Horários obrigatórios no cadastro, opcionais depois

Dentro do cadastro, cada medicamento exige ao menos um horário (`ArrayMinSize(1)`): o formulário sempre
entrega horários, e é o que alimenta o dashboard. No endpoint de acréscimo
(`POST /prescriptions/:id/medications`) o horário continua opcional, preservando o cenário já especificado de
medicamento sem horário definido. A duplicidade dentro do mesmo cadastro é barrada por `@ArrayUnique`, e
entre requests pelo índice `@@unique([medicationId, time])` (409).

### 4. `durationDays` em dias inteiros

`Int?` em dias, conforme decisão do usuário. Vazio significa "sem prazo definido", o que se distingue da
marcação `continuousUse` (uso contínuo, sem data de término). Faixa aceita: 1 a 3650.

Não há expiração automática: a listagem de ativos continua sendo `status ATIVA` + `continuousUse`, agora
mostrando a duração. Fazer o tratamento vencer sair do dashboard é regra de produto e ficou fora do escopo.

### 5. Autor do registro em vez de autor do upload

Com o arquivo opcional, `uploadedById` passaria a significar "quem registrou a receita" na maioria dos casos.
A coluna foi renomeada para `created_by_id` (`createdById` no Prisma) com a relação `prescriptionAuthor`. Como
o campo não era exposto na resposta da API, a mudança é interna ao banco e ao schema — frontend não muda.

### 6. Nome de exibição com fallback

Com o PDF opcional, `fileDisplayName` também é opcional. Se o arquivo for enviado sem nome, o próprio nome
original do upload é usado (o serviço de arquivos já sanitiza); se não houver arquivo, o campo é ignorado. O
que continua proibido é arquivo não-PDF, acima de 10 MB, ou com extensão divergente do MIME.

## Riscos

- **Órfão de upload**: `FileInterceptor` grava antes do corpo do método, então falha de validação do DTO ou de
  autorização deixa PDF em disco. Com o arquivo opcional isso fica menos frecuente, mas não some. O serviço
  já remove o arquivo quando a gravação falha; a validação do DTO acontece antes e permanece uma lacuna
  conhecida, idêntica à apontada na change anterior.
- **Contrato do `medications`**: o `whitelist` global do `ValidationPipe` exige que `CreatePrescriptionMedicationDto`
  declare todos os campos aceitos, senão o segundo nível de validação os remove silenciosamente.

## Migração

`prisma migrate dev` gerou, e aplicou, `20260929122419_prescription_registration_form`:

```sql
ALTER TABLE medications ADD COLUMN duration_days INTEGER;

ALTER TABLE prescriptions DROP COLUMN uploaded_by_id,
  ADD COLUMN created_by_id TEXT NOT NULL,
  ALTER COLUMN file_stored_name  DROP NOT NULL,
  ALTER COLUMN file_display_name DROP NOT NULL,
  ALTER COLUMN file_mime_type    DROP NOT NULL,
  ALTER COLUMN file_size         DROP NOT NULL;
```

O Prisma não emite `RENAME COLUMN`, e sim `DROP` + `ADD ... NOT NULL`. É seguro **nesta** migration porque a
tabela estava vazia: um `ADD COLUMN NOT NULL` sem default falha se houver qualquer linha, então o sucesso da
aplicação é a própria prova de que não havia receita para perder (conferido depois com `select count(*)` = 0).
A partir de agora `created_by_id` é a coluna definitiva.
