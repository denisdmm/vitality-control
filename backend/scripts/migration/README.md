# Migração de dados — Firebase → PostgreSQL

Fluxo completo para migrar a base do projeto Firebase `central-de-vitalidade`
para o banco PostgreSQL (Neon/Vercel) usado pelo backend NestJS/Prisma.

## Estrutura

```
scripts/
├── firestore-export.mjs            # etapa 1 — exporta o Firestore (REST, regras públicas)
├── firestore-to-postgres.ts        # etapa 2 — importa os JSON exportados via Prisma
└── migration/firestore-export/     # JSONs exportados (não versionar em produção)
    ├── accounts.json               #   usuarios -> users
    ├── sharedData.json             #   -> shared_data (indices de saude)
    ├── exams.json                  #   -> exam_types
    ├── data.json                   #   {bloodPressure, glucose, weight} -> vital_scores
    └── perUser.json                #   healthRecords/subItems, medications, vaccines
```

## Pré-requisitos

1. Conexão com o banco configurada em `.env` (`DATABASE_URL`).
2. (Somente no sandbox com proxy) túnel TCP ativo:
   ```bash
   node tunnel.js &
   ```
3. Schema aplicado:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

## Etapa 1 — Exportar Firestore

```bash
npm run import:firebase:export   # node scripts/firestore-export.mjs
```

> O comando usa a API REST `firestore.googleapis.com` com as regras públicas
> atuais (`allow read: if true`). Alternativa para produção: export oficial
> `gcloud firestore export gs://bucket` e converter.

## Etapa 2 — Popular o Postgres

```bash
npm run import:firebase           # npx ts-node scripts/firestore-to-postgres.ts
```

O script é idempotente (upserts por chave primária) e executa na ordem correta
de dependências (users → shared_data/exam_types → health_records → sub_items →
medications → vaccines → patient_doctors → vital_scores).

## Validação

```bash
psql "$DATABASE_URL" <<'SQL'
SELECT 'users' c, count(*) FROM users
UNION ALL SELECT 'health_records', count(*) FROM health_records
UNION ALL SELECT 'vital_scores', count(*) FROM vital_scores;
-- Órfãos?
SELECT count(*) FROM vital_scores v LEFT JOIN users u ON u.id = v.user_id WHERE u.id IS NULL;
SQL
```

Para este ambiente, o resultado esperado era:
- users = 3 (2 legados + admin)
- health_records = 3, medications = 4, vital_scores = 122, exam_types = 4
- órfãos = 0

## Regras importantes

- **Senhas**: o Firestore guarda em texto puro; o import gera hash
  `bcrypt.hashSync(senha, 10)`. O usuário legado terá a MESMA senha original
  (agora hasheada). O admin `admin/admin` foi recriado no import e deve ter a
  senha trocada no primeiro acesso.
- **IDs**: os doc-ids do Firestore são preservados como chave primária (text).
  Novos registros geram UUID.
- **Vitals**: `data/bloodPressure`, `data/glucose` e `data/weight` são mesclados
  por `(userId, date)` em `vital_scores` (JSONB com períodos manhã/tarde/noite).
- **Relacionamentos**: `doctorIds[]` → tabela `patient_doctors` (N:N).