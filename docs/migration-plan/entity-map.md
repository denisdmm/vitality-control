# Mapeamento Entidade-a-Entidade — Firestore → PostgreSQL

Documento de referência cruzada para a equipe de migração.
Formato: **Firestore (path/coleção)** → **tabela/coluna Postgres**.

> Fonte: análise dos arquivos `src/**` em `/tmp/opencode/central-vitalidade`
> (clone de `denisdmm/Central-de-vitalidade`, commit atual da branch `main`).

---

## 1. Coleções raiz (namespace `central-de-vitalidade`)

| Caminho Firestore | Natureza | Tabela Postgres |
|---|---|---|
| `central-de-vitalidade/users/accounts/{id}` | documento de perfil | `users` |
| `central-de-vitalidade/data/bloodPressure/{uid_date}` | documento diário (PA) | `vital_scores` (colo. bloodPressurePeriods) |
| `central-de-vitalidade/data/glucose/{uid_date}` | documento diário (glicemia) | `vital_scores` (colo. glucosePeriods) |
| `central-de-vitalidade/data/weight/{uid_date}` | documento diário (peso) | `vital_scores` (colo. weight) |
| `central-de-vitalidade/{uid}/medications/{id}` | subcoleção de usuário | `medications` |
| `central-de-vitalidade/{uid}/vaccines/{id}` | subcoleção de usuário | `vaccines` |
| `central-de-vitalidade/sharedData` | documento singleton global | `shared_data` |
| `central-de-vitalidade/sharedData/exams/{slug}` | subcoleção global | `exam_types` |

## 2. Subcoleções aninhadas (exames)

| Caminho Firestore | Tabela Postgres |
|---|---|
| `users/accounts/{uid}/healthRecords/{id}` | `health_records` |
| `healthRecords/{id}/subItems/{itemId}` | `sub_items` |

---

## 3. Mapeamento campo-a-campo

### 3.1 users (contas)

| Firestore (doc.users/accounts) | Postgres (users) | Tipo | Observação |
|---|---|---|---|
| (doc-id) | `id` | uuid PK | preservar | 
| `name` | `name` | text UNIQUE | username |
| `password` | `password_hash` | text | **bcrypt** |
| `fullName` | `full_name` | text | |
| `socialName` | `social_name` | text? | |
| `email` | `email` | text? | |
| `medicalRecordNumber` | `medical_record_number` | text? | prontuário |
| `crm` | `crm` | text? UNIQUE | médico |
| `photoUrl` | `photo_url` | text? | base64/URL |
| `role` | `role` | enum | paciente/medico/administrador |
| `height` | `height` | float? | metros |
| `inactivityTimeout` | `inactivity_timeout` | int? | ms |
| — | `created_at`/`updated_at` | timestamptz | novos |

### 3.2 patient_doctors (N:N)

| Firestore (users.accounts.{id}.doctorIds[]) | Postgres (patient_doctors) |
|---|---|
| elemento do array `doctorIds` | `doctor_id` (uuid FK→users) |
| dono do array (paciente) | `patient_id` (uuid FK→users) |
| — | `@@unique([patient_id, doctor_id])` |

### 3.3 health_records + sub_items

| Firestore (healthRecords) | Postgres (health_records) |
|---|---|
| doc-id | `id` |
| (subcoleção de users/accounts) | `user_id` FK→users CASCADE |
| `name` | `name` |
| `type` | `type` |
| `requestDate` (Timestamp) | `request_date` timestamptz |
| `examDate?` | `exam_date?` timestamptz |
| `result?` | `result?` |
| `status` | `status` enum (solicitado/agendado/realizado) |
| `requestingDoctorName?` | `requesting_doctor_name?` |
| `requestingDoctorCRM?` | `requesting_doctor_crm?` |

| Firestore (subItems) | Postgres (sub_items) |
|---|---|
| doc-id | `id` |
| (subcoleção de healthRecords) | `record_id` FK→health_records CASCADE |
| `name` | `name` |
| `result` | `result` |
| `reference` | `reference` |

### 3.4 vital_scores (PA + glicemia + peso do dia)

| Firestore (data/…) | Postgres (vital_scores) |
|---|---|
| doc-id `{uid}_{YYYY-MM-DD}` → split `lastIndexOf('_')` | `user_id` uuid FK + `date` date |
| bloodPressure: `manha/tarde/noite` `{systolic, diastolic, pulse}` | `blood_pressure_periods` jsonb `{manha?, tarde?, noite?}` |
| glucose: `manha/tarde/noite` `{value}` | `glucose_periods` jsonb |
| weight: `weight` | `weight` float? |
| — | `@@unique([user_id, date])` |

Detalhe de coalescência na migração (mesma `user_id`+`date` em 3 coleções
diferentes):
```
1. ler data/weight → quase sempre existe doc por dia
2. ler data/glucose → mergir períodos
3. ler data/bloodPressure → mergir períodos
4. UPSERT vital_scores on conflict (user_id, date) do update
```

### 3.5 medications

| Firestore ({uid}/medications) | Postgres (medications) |
|---|---|
| doc-id | `id` |
| (pai `{uid}`, inconsistência do schema legado) | `user_id` FK→users CASCADE |
| `name` | `name` |
| `dosage` | `dosage` |
| `frequency` | `frequency` |

### 3.6 vaccines

| Firestore ({uid}/vaccines) | Postgres (vaccines) |
|---|---|
| doc-id | `id` |
| (pai `{uid}`) | `user_id` FK→users CASCADE |
| `vaccineName` | `vaccine_name` |
| `vaccinationDate` (Timestamp) | `vaccination_date` timestamptz |
| `seriesSchedule?` | `series_schedule?` text |
| `intervalBetweenDoses?` | `interval_between_doses?` int (meses) |
| `intervalBetweenBoosterDoses?` | `interval_between_booster_doses?` int (meses) |

### 3.7 exam_types

| Firestore (sharedData/exams/{slug}) | Postgres (exam_types) |
|---|---|
| doc-id = slug | `id` uuid (preservar slug em `label`) |
| `label` | `label` text UNIQUE |

### 3.8 shared_data (singleton)

| Firestore (sharedData.healthIndices) | Postgres (shared_data) |
|---|---|
| bloodPressure.systolicIdeal | `bp_systolic_ideal` int? |
| bloodPressure.diastolicIdeal | `bp_diastolic_ideal` int? |
| bloodPressure.systolicLimit | `bp_systolic_limit` int? |
| bloodPressure.diastolicLimit | `bp_diastolic_limit` int? |
| glucose.preLimit | `glucose_pre_limit` int? |
| glucose.diabetesLimit | `glucose_diabetes_limit` int? |
| — | `id` = 1 (singleton) |

---

## 4. Relação de contagem esperada (validação)

Ao final da migração, rodar estas consultas e comparar com a contagem do
export Firestore (por coleção):

```sql
SELECT 'users'          AS colecao, count(*) FROM users;
SELECT 'health_records' AS colecao, count(*) FROM health_records;
SELECT 'sub_items'      AS colecao, count(*) FROM sub_items;
SELECT 'medications'    AS colecao, count(*) FROM medications;
SELECT 'vaccines'       AS colecao, count(*) FROM vaccines;
SELECT 'vital_scores'   AS colecao, count(*) FROM vital_scores;
SELECT 'exam_types'     AS colecao, count(*) FROM exam_types;
SELECT 'patient_doctors'AS colecao, count(*) FROM patient_doctors;

-- anti-join: verificar órfãos
SELECT 'sub_items orfaos' FROM sub_items s
  LEFT JOIN health_records h ON h.id = s.record_id WHERE h.id IS NULL;
```

---

## 5. Decisões pendentes (abertas para a Fase 1)

1. **IDs**: manter doc-ids Firestore como `id` (rastreabilidade) ou gerar
   `uuid()`? → Recomendação: manter quando for string válida, `uuid()` caso
   contrário (documentar em migration README).
2. **`medications`/`vaccines`** têm path inconsistente no schema legado
   (`central-de-vitalidade/{uid}/…` vs `users/accounts/{uid}/…`): confirmar
   com o time que `{uid}` é sempre a mesma entidade de `users/accounts/{id}`.
3. **`VitalScore` tabela única vs 3 tabelas**: ADR-003 definiu tabela única
   com JSONB; se o time preferir colunas tipadas para consultas SQL, será um
   delta no schema (as 3 coleções originais mapeiam 3 tabelas).
4. **Password dos usuários legados**: como `password` está em texto puro, o
   script de migração não consegue recriar o mesmo hash bcrypt — decidir:
   (a) reset de senha p/ todos os usuários não-admin pós-migração, ou
   (b) migrar os hashes bcrypt gerados na hora (usuário terá que trocar).