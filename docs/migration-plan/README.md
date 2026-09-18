# Central de Vitalidade — Plano de Migração

> **Status:** 📋 ANÁLISE CONCLUÍDA — PLANO DE MIGRAÇÃO PRONTO
> **Última atualização:** 15/09/2026
> **Stack de destino:** Angular (frontend) + NestJS (backend) + Prisma ORM (PostgreSQL) + Tailwind CSS (estilos)

Este documento registra a análise da migração do projeto atual
(**Next.js 15 + Firebase/Firestore**) para o ambiente alvo
(**Angular + NestJS + Prisma + Postgres**), preservando o modelo de estilos
existente e os relacionamentos do banco de dados.

---

## 1. Visão geral do estado atual

| Item | Valor |
|---|---|
| Frontend atual | Next.js 15.3.8 (App Router, React 18, TypeScript) |
| Banco de dados atual | Firebase Firestore (via SDK `firebase/firestore`) |
| Autenticação atual | Custom (localStorage) — usuário como objeto no navegador, senha em texto puro no Firestore |
| Estilos | Tailwind CSS 3.4 + shadcn/ui + tokens CSS (HSL variables) |
| Gráficos | recharts 2.15 encapado em `ui/chart.tsx` |
| PDF | jsPDF 2.5 + html2canvas 1.4 |
| IA | Genkit + Gemini 2.5 Flash (flow de reforços de vacinação) |

O repositório clonado usa a coleção top-level `central-de-vitalidade` como
namespace. As credenciais do Firebase estão hardcoded em `src/lib/firebase.ts`.

---

## 2. Arquitetura alvo

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Angular 18+ (Standalone)   │  HTTP  │  NestJS 10+                  │
│  - Tailwind CSS (mantido)   │ ─────► │  - Prisma Client             │
│  - shadcn-style components  │  JSON  │  - Guards (JWT / roles)      │
│  - recharts (Wrapper p/ Ng) │        │  - Modules por domínio       │
└─────────────────────────────┘        └──────────────┬───────────────┘
                                                       │ Prisma ORM
                                                       ▼
                                          ┌───────────────────────────┐
                                          │  PostgreSQL 16             │
                                          │  (schema público, tx/rel)  │
                                          └───────────────────────────┘
```

| Camada | Tecnologia | Justificativa |
|---|---|---|
| SPA | Angular 18 (standalone components, signals) | Requisito do usuário |
| Backend API | NestJS 10 (express, swagger) | Requisito do usuário |
| ORM | Prisma 5/6 (migrate + client + studio) | Requisito do usuário |
| Banco | PostgreSQL 16 (relacional, `uuid` PKs, FKs indexadas) | Migração do Firestore |
| Estilos | Tailwind CSS 3.4 + mesmos tokens HSL | Requisito: manter visual atual |
| Auth | JWT (Access + Refresh) no NestJS, `bcrypt` p/ hash | Melhoria de segurança sobre o atual |

### Repositório sugerido (monorepo ou diretórios irmãos)

```
central-de-vitalidade/
├── docs/migration-plan/        ← este plano
├── backend/                    ← NestJS (novo)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── health-records/
│   │   ├── blood-pressure/
│   │   ├── glucose/
│   │   ├── weight/
│   │   ├── medications/
│   │   ├── vaccines/
│   │   ├── shared-data/
│   │   ├── reports/
│   │   └── prisma.module.ts
│   └── .env
└── frontend/                   ← Angular (novo)
    ├── src/app/
    │   ├── core/        (auth guard, http interceptor, services)
    │   ├── features/    (pages: exames, glicemia, pressao, peso, relatorios, admin, medico)
    │   ├── shared/      (components: ui, dialogs, logs, report)
    │   └── styles.css   (tokens HSL + tailwind)
    └── angular.json
```

---

## 3. Mapeamento do modelo de dados Firestore → PostgreSQL

> **Regra de ouro:** cada coleção/subcoleção vira uma **tabela**, e cada edge
> implícita (prefixo de doc-id, subcoleção) vira uma **FK real** com `ON DELETE`.
> Os firestore `Timestamp` viram `timestamptz`. Chaves `{uid}_{YYYY-MM-DD}`
> viram **colunas separadas** `userId` + `date` (ou `dailyKey`). Mixins de
> biometria usam **JSONB** (Postgres) para os períodos manhã/tarde/noite.

### 3.1 Diagrama Entidade-Relacionamento (Prisma-ready)

```
┌───────────────┐   1:N    ┌────────────────┐   1:N    ┌──────────────┐
│     User      ├─────────►│  HealthRecord  ├─────────►│   SubItem    │
│  id (uuid pk) │          │ id (uuid pk)   │          │ id (uuid pk) │
│  name unique  │          │ userId (fk)    │          │ recordId(fk) │
│  passwordHash │          │ name, type     │          │ name, result │
│  fullName     │          │ requestDate    │          │ reference    │
│  socialName?  │          │ examDate?      │          └──────────────┘
│  email?       │          │ result?        │
│  medicalRecord │         │ status (enum)  │
│  crm?          │         │ reqDoctorName? │
│  photoUrl?    │          │ reqDoctorCRM?  │
│  role (enum)   │          └────────────────┘
│  height?      │
│  timeout?     │
└──────┬────────┘
       │
       │ N:N  self (patients x doctors) via join table
       ▼
┌───────────────────────┐       1:N
│  PatientDoctor (junc) │        (medicamentos / vacinas abaixo)
│  id (uuid pk)         │
│  patientId(fk→User)   │
│  doctorId(fk→User)    │
│  @@unique(pat, doc)   │
└───────────────────────┘

┌────────────────┐     1:N     ┌──────────────────┐
│ MedicalRecord  │             │   VitalDaily     │
│ (nome do exame │             │  (biometria por  │
│  compartilhado)│             │   dia)           │
│ id (uuid pk)   │             │ id (uuid pk)     │
│ label unique   │             │ userId (fk)      │
└────────────────┘             │ date (date)      │
                               │ bloodPressure   │→ JSONB (manha/tarde/noite{systolic,diastolic,pulse})
                               │ glucose         │→ JSONB (manha/tarde/noite{value})
                               │ weight??        │→ number (separado; ver 3.5)
                               └──────────────────┘

┌───────────────┐   1:N   ┌──────────────┐    ┌───────────────┐
│ Medications   │         │   Vaccines    │    │  SharedData   │
│ id (uuid pk)  │         │ id (uuid pk)  │    │ id = 1 (singleton)
│ userId (fk)   │         │ userId (fk)   │    │ healthIndices │→ JSONB
│ name, dosage  │         │ vaccineName   │    └───────────────┘
│ frequency     │         │ vaccinationDate (timestamptz)
└───────────────┘         │ seriesSchedule? │ (enum opcional)
└───────────────┘ ...
```

### 3.2 Tabela `User` (origem: `users/accounts/{id}`)

| Coluna | Tipo | Origem Firestore | Obs |
|---|---|---|---|
| `id` | `uuid` PK default gen_random_uuid() | doc-id | mantém valor do doc-id na migração |
| `name` | `text` UNIQUE | `name` | username de login |
| `password_hash` | `text` | `password` | **bcrypt na migração** (hash, não texto puro) |
| `full_name` | `text` | `fullName` | |
| `social_name` | `text?` | `socialName` | |
| `email` | `text?` | `email` | |
| `medical_record_number` | `text?` | `medicalRecordNumber` | |
| `crm` | `text?`+UNIQUE | `crm` | só p/ médicos (validar) |
| `photo_url` | `text?` | `photoUrl` | dataURL base64 ou URL |
| `role` | enum | `role` | `PACIENTE \| MEDICO \| ADMINISTRADOR` |
| `height` | `double precision?` | `height` | metros p/ IMC |
| `inactivity_timeout` | `integer?` | `inactivityTimeout` | ms |
| `created_at`/`updated_at` | `timestamptz` | — | novos (ADR) |

**Relacionamentos:**
- `1:N` `healthRecords`
- `1:N` `medications`, `vaccines`
- `1:N` `dailyVitals` (biometria do dia)
- `N:N` self via `PatientDoctor` — paciente (`doctorIds[]`) ↔ médico

### 3.3 Tabela `HealthRecord` + `SubItem` (origem: `healthRecords` + `subItems`)

`HealthRecord`
| Coluna | Tipo | Origem |
|---|---|---|
| `id` | `uuid` PK | doc-id |
| `userId` | `uuid` FK→User (CASCADE) | subcoleção |
| `name` | `text` | `name` |
| `type` | `text` | `type` |
| `requestDate` | `timestamptz` | `requestDate` |
| `examDate` | `timestamptz?` | `examDate` |
| `result` | `text?` | `result` |
| `status` | enum | `solicitado \| agendado \| realizado` |
| `requestingDoctorName`/`CRM` | `text?` | `requestingDoctorName`/`requiringDoctorCRM` |

`SubItem`
| Coluna | Tipo | Origem |
|---|---|---|
| `id` | `uuid` PK | doc-id |
| `recordId` | `uuid` FK→HealthRecord (CASCADE) | subcoleção |
| `name`/`result`/`reference` | `text` | |

### 3.4 Tabela `VitalScore` (origem: `data/bloodPressure` + `data/glucose`)

Hoje são duas coleções planas com doc-id `{uid}_{YYYY-MM-DD}`. Para manter
relacionamento forte com o usuário e unificar o "Registrar Sinais Vitais"
(modal global), sugere-se **uma tabela `VitalScore` por dia**:

| Coluna | Tipo | Origem |
|---|---|---|
| `id` | `uuid` PK | — |
| `userId` | `uuid` FK→User (CASCADE) | prefixo `{uid}_` |
| `date` | `date` | `YYYY-MM-DD` |
| `bloodPressurePeriods` | `jsonb?` | `data/bloodPressure`: `{ manha?|tarde?|noite?: {systolic, diastolic, pulse} }` |
| `glucosePeriods` | `jsonb?` | `data/glucose`: `{ manha?|tarde?|noite?: {value} }` |
| `weight` | `double precision?` | `data/weight`: `{ weight }` |
| `@@unique([userId, date])` | | garante 1 linha/dia/usuário |

> **Alternativa A (3 tabelas separadas):** `BloodPressure`, `Glucose`, `Weight`
> espelhando exatamente as coleções Firestore — mais fiel, porém fragmenta a
> escrita única do modal "Registrar Sinais Vitais".
> **Alternativa B (escolhida):** tabela única com JSONB preserva o documento
> Firestore como um todo e mapeia 1:1. A escolha fica registrada na seção de
> decisões (ADR-003).

### 3.5 Tabela `Medication` e `Vaccine`

```prisma
model Medication {
  id        String @id @default(uuid()) @db.Uuid
  userId    String @db.Uuid
  name      String
  dosage    String
  frequency String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Vaccine {
  id                      String   @id @default(uuid()) @db.Uuid
  userId                  String   @db.Uuid
  vaccineName             String
  vaccinationDate         DateTime @db.Timestamptz
  seriesSchedule          String?  // 'single-dose' | 'two-dose' | 'three-dose'
  intervalBetweenDoses    Int?
  intervalBetweenBoosterDoses Int?
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

### 3.6 Tabela `MedicalRecordType` (origem: `sharedData/exams/{slug}`)

```prisma
model ExamType {
  id    String @id @default(uuid()) @db.Uuid
  label String @unique
}
```

### 3.7 Tabela `SharedData` (singleton global)

```prisma
model SharedData {
  id             Int    @id @default(1)   // singleton: always id=1
  healthIndices  Json?  // { bloodPressure: {systolicIdeal,...}, glucose: {...} }
}
```

> Alternativa: dissolver o JSONB em colunas tipadas (`bp_systolic_ideal`,
> `bp_diastolic_limit`, `glucose_pre_limit`, `glucose_diabetes_limit`, ...).
> Recomenda-se colunas tipadas no Prisma por **integridade + consulta**,
> mantendo ADR-004.

---

## 4. Mapeamento de relacionamentos

| Relação Firestore (implícita) | Relação Postgres (explícita) | Implementação |
|---|---|---|
| `users/accounts/{uid}/healthRecords` | `HealthRecord.userId → User.id` | FK `ON DELETE CASCADE` |
| `healthRecords/{id}/subItems` | `SubItem.recordId → HealthRecord.id` | FK `ON DELETE CASCADE` |
| `{uid}/medications` | `Medication.userId → User.id` | FK `ON DELETE CASCADE` |
| `{uid}/vaccines` | `Vaccine.userId → User.id` | FK `ON DELETE CASCADE` |
| `data/glucose^{uid}_{date}` | `VitalScore.userId → User.id` (+ `@@unique[userId,date]`) | FK `ON DELETE CASCADE` |
| `doctorIds[]` (array) | `PatientDoctor (patientId, doctorId)` join table | FK dupla + `@@unique` |
| `sharedData/exams/{slug}` | `ExamType label UNIQUE` | tabela própria |
| `sharedData` singleton | `SharedData id=1` | registro único |

Todos os relacionamentos do modelo original são **preservados** e agora
**garantidos pelo banco** (integridade referencial), algo que o Firestore não
oferecia.

---

## 5. Estratégia de migração de dados (Firestore → Postgres)

> Requer acesso de leitura ao projeto Firebase `central-de-vitalidade`
> (export por `gcloud firestore export` ou scripts com o SDK).

### Etapa 0 — Pré-requisitos
- Python/Node 20+; `psql`/Docker com Postgres 16.
- Export Firestore via **Firebase Admin SDK** (recomendado) ou `firestore
  export --batch-size 100`. Salvar em `scripts/migration/firebase-export/`.

### Etapa 1 — Script One-shot (`scripts/migration/firestore-to-postgres.ts`)
Lógica por entidade (manter a ordem por causa de FKs):

```ts
// Pseudocódigo do orquestrador
1. ler contas (users/accounts)                      → INSERT User (com bcrypt.hash(password))
2. ler sharedData                                   → UPSERT SharedData(id=1)
3. ler sharedData/exams                             → INSERT ExamType (slug = label-slug)
4. ler {uid}/vaccines                               → INSERT Vaccine
5. ler {uid}/medications                            → INSERT Medication
6. ler users/accounts/{uid}/healthRecords           → INSERT HealthRecord
7. ler .../healthRecords/{id}/subItems              → INSERT SubItem
8. ler doctors vinculados (doctorIds)                → INSERT PatientDoctor
9. ler data/glucose, data/bloodPressure, data/weight→ UPSERT VitalScore (merge por userId+date)
```

Regras complementares:
- **ids**: manter os doc-ids originais como `id` (uuid convertido de string) para
  rastreabilidade, ou usar `uuid_generate_v4()`. Recomenda-se **manter** e
  documentar.
- **password**: `bcrypt.hash(password, 12)` — NUNCA migrar texto puro.
- **data de registros**: `new Date(timestamp)` → `timestamptz`.
- **ids `{uid}_{date}`**: splitl no `_` → `userId` + `date` (cuidado com uids
  que contenham `_`; usar `lastIndexOf('_')`).
- **inconsistência**: `medications`/`vaccines`/`healthRecords` vivem em paths
  diferentes; o script resolve via `users/accounts` como tabela canônica de
  usuários.
- **rollback/re-tentativa**: rodar dentro de uma transação Prisma
  (`$transaction`) em blocos de 500 registros; upsert idempotente.

### Etapa 2 — Seed de dev
`prisma/seed.ts` cria: 1 admin (`admin/admin123` hasheado), 1 médico, 2
pacientes vinculados, alguns exames, vacinas, medicamentos e 30 dias de
`VitalScore` para testes visuais (recharts).

---

## 6. Autenticação (NestJS) — N [nova proposta]

O modelo atual (localStorage + senha em texto puro no Firestore, admin
`admin/admin` hardcoded) deve evoluir para:

| Camada | Proposta |
|---|---|
| Backend | `POST /auth/login` verifica `name` + bcrypt.compare → retorna JWT access (15min) + refresh (7d) |
| Backend | Guards: `JwtAuthGuard` (todas rotas), `RolesGuard` (`@Roles('ADMINISTRADOR')`) |
| Frontend | `AuthService` guarda token em `HttpOnly` cookie (ou storage) + `AuthInterceptor` injeta `Bearer` |
| Frontend | Guards de rota Angular: `authGuard`, `adminGuard`, `medicoGuard` |

**Rotas REST propostas (RESTful, com prefixo `/api/v1`):**

```
POST   /api/v1/auth/login           → { accessToken, refreshToken, user }
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/users/me
PATCH  /api/v1/users/me             (minha-area)
GET    /api/v1/users                (admin) — lista usuários
POST   /api/v1/users                (admin)
PATCH  /api/v1/users/:id            (admin)
DELETE /api/v1/users/:id            (admin)
GET    /api/v1/users/:id/vitals/pressure   (médico — pacientes)
GET    /api/v1/health-records               (minhas)
POST   /api/v1/health-records
GET    /api/v1/health-records/:id
PATCH  /api/v1/health-records/:id
DELETE /api/v1/health-records/:id
GET    /api/v1/health-records/:id/sub-items
POST   /api/v1/health-records/:id/sub-items
PATCH  /api/v1/health-records/:id/sub-items/:subId
DELETE /api/v1/health-records/:id/sub-items/:subId
GET    /api/v1/vitals?from=YYYY-MM-DD&to=YYYY-MM-DD
PUT    /api/v1/vitals/daily          (Registrar Sinais Vitais: PA+glicemia+peso)
GET    /api/v1/vitals/pressure/:userId   (médico)
GET    /api/v1/medications · POST · DELETE /api/v1/medications/:id
GET    /api/v1/vaccines    · POST · DELETE /api/v1/vaccines/:id
GET    /api/v1/exam-types
GET    /api/v1/shared-data            → índices de saúde p/ alerts
PUT    /api/v1/shared-data            (admin — /admin/indices)
GET    /api/v1/reports/consolidated?from&to   → { pressure, glucose, weight }
POST   /api/v1/vaccines/:id/check-booster      → chama genkit flow (server-side)
```

**Isolamento de dados (autorização):**
- Paciente: vê/só a si mesmo (`userId = req.user.id` na query).
- Médico: vê dados dos pacientes em `doctorIds` (matricial) — verifica join.
- Admin: tudo.
- Guardas do NestJS + inner queries com `this.prisma.user.findUnique({where:{id}})`.

---

## 7. Frontend Angular — reescrita preservando UX/estilos

### 7.1 Roteamento Angular (espelha as rotas atuais)

```ts
const routes: Routes = [
  { path: '', component: DashboardLayoutComponent, canActivate: [authGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'minha-area', component: MinhaAreaComponent },
      { path: 'exames', component: ExamesComponent },
      { path: 'exames/:id', component: ExameDetalheComponent },
      { path: 'pressao-arterial', component: PressaoArterialComponent },
      { path: 'glicemia', component: GlicemiaComponent },
      { path: 'peso', component: PesoComponent },
      { path: 'relatorios', component: RelatoriosComponent },
    ]
  },
  { path: 'admin', component: AdminLayoutComponent, canActivate: [adminGuard],
    children: [
      { path: 'indices', component: IndicesComponent },
      { path: 'usuarios', component: UserManagementComponent },
    ]
  },
  { path: 'medico', component: MedicoLayoutComponent, canActivate: [medicoGuard],
    children: [ { path: 'pressao-arterial', component: PressaoPacientesComponent } ]
  },
];
```

### 7.2 Preservando estilos

Os tokens de cor/fonte devem ser **copiados** do Next para o Angular:

1. `src/app/globals.css` → `src/styles.css` (tokens CSS-HSL idênticos):
```css
:root {
  --background: 234 43% 94%;      /* #E8EAF6  */
  --primary: 231 48% 48%;         /* #3F51B5  */
  --accent: 266 39% 58%;          /* #7E57C2  */
  --radius: 0.5rem;
  /* ...demais tokens + bloco .dark ... */
}
body { font-family: 'Inter', sans-serif; }
```
2. `tailwind.config.js` idêntico (colors ← `hsl(var(--...))`, fontes Inter).
3. Fonte Inter carregada no `index.html` (Google Fonts) ou via fontsource.
4. Componentes `shadcn` portados para Angular — o mais fiel é uma adaptação do
   **spartan/ng** (shadcn para Angular, baseado em Angular CDK/Radix port)
   mantendo exatamente as classes, o nome do style para `default`, baseColor
   `neutral`. Alternativa segura: manualmente copiar os `.ts`/`.css` de cada
   componente `ui/*` adaptando para o modelo Angular (inputs, outputs,
   signals).
   - `ui/button`, `ui/card`, `ui/dialog`, `ui/input`, `ui/form` (form: usar
     **Angular Reactive Forms** no lugar de react-hook-form — o wire-up do
     zod ficará em um adapter `@validator`), `ui/select`, `ui/combobox`,
     `ui/toast` (ngx-toastr ou primic own), `ui/sidebar`, `ui/table`,
     `ui/tabs`, `ui/accordion`, `ui/sheet`, `ui/switch`, `ui/calendar`
     (ngx-datepicker adaptado), `ui/alert-dialog`, `ui/avatar`,
     `ui/command (palette)`, `ui/popover` (CDK Overlay),
     `ui/multi-select-combobox`.
5. Gráficos: **ngx-charts ou um wrapper próprio de recharts** (recharts é React;
   para reusar o mesmo visual, ou se usa `ng2-charts/Chart.js`, ou se implementa
   um pequeno wrapper `dv-chart` com D3. Recomendação inicial: **ngx-charts**
   com mesmas cores de série output blue/purple).
6. Toasts: `ngx-toastr` (estilizado com os tokens).
7. PDF: manter **jsPDF/ht2canvas** (client-side) — funciona no Angular igual.

### 7.3 Serviços Angular (espelho das coleções)

| Serviço | Firestore atual → | HttpClient NestJS |
|---|---|---|
| `FirebaseDataService` (db direto) | → `AuthService`, `UserService` | |
| `GlucoseLog` | `data/glucose` | `GET/PUT /vitals` |
| `BloodPressureLog` | `data/bloodPressure` | `GET/PUT /vitals` |
| `WeightLog` | `data/weight` + `users.accounts.height` | `GET /vitals` |
| `MedicationTracker` | `{uid}/medications` | `/medications/*` |
| `VaccinationWallet` | `{uid}/vaccines` | `/vaccines/*` |
| `HealthEntryModal` | 3 coleções | `PUT /vitals/daily` |
| `ExamesPage` | `healthRecords` + `sharedData/exams` | `/health-records/*` |
| `AdminDashboard` | `users/accounts` | `/users/*` |
| `IndicesPage` | `sharedData` | `GET/PUT /shared-data` |
| `ReportsPage` | leitura tripla | `GET /reports/consolidated` |
| `MedicoPage` | leitura global | `GET /vitals/pressure/:userId` (filtrado no backend) |

### 7.4 Componentes/UX mantidos como estão
- Layout de sidebar (shadcn) clicada com logo HeartPulse, header sticky
  `h-16 border-b bg-card`, numero de menu igual (Dashboard, Exames, Relatórios,
  Pressão, Glicemia, Peso e IMC, Vacinação, Medicamentos, Campanhas, Minha
  Área).
- Alertas coloridos por threshold (`Skull`, `TriangleAlert`) — mesma lógica
  portada.
- Relatórios imprimíveis `data-report-part` para PDF multi-parte.
- Modal "Registrar Sinais Vitais" no header global (dashboard).

---

## 8. Segurança (melhorias sobre o atual)

| Item atual | Risco | Correção na migração |
|---|---|---|
| Senha em texto puro no Firestore | alto | `bcrypt.hash(12)` no backend; nunca logar |
| Admin `admin/admin` hardcoded | alto | seed com hash; rota única; redefinir pós-deploy |
| Firestore rules `allow rw: if true` | critico | APIs NestJS com `JwtAuthGuard` em todas as rotas |
| Dados por prefixo `doc.id.startsWith(uid_)` | médio | queries por `userId` filtrado no servidor |
| CORS aberto | médio | `CORS` habilitado com allowlist de origem |
| Upload `photoUrl` (base64) | médio | armazenar em `maxLength`, limitar tamanho (ex.: 2MB), ou mover p/ Storage |

---

## 9. Ordem de execução (roadmap em fases)

| Fase | Escopo | Entrega |
|---|---|---|
| **Fase 1 — Setup** | Scaffold NestJS + Prisma + Postgres (docker-compose); schema; 1ª migration; seed básico (`admin/admin123`) | `backend` rodando com `/health` e `/auth/login` |
| **Fase 2 — API core** | Auth (login/refresh/guards) + CRUD `users` + `vitals` + `medications` + `vaccines` | todos os endpoints funcionais via Swagger |
| **Fase 3 — Angular base** | Scaffold Angular + Tailwind (tokens copiados) + layout sidebar + login + guards de rota | app autentica e navega |
| **Fase 4 — Features (port pass-a-a-pass)** | Exames(+subItens), Pressão, Glicemia, Peso/IMC, Relatórios(consolidado+PDF), Minha Área, Admin (usuários/índices), Médico | visual e UX idênticos ao atual |
| **Fase 5 — Migração de dados** | Script Firestore→Postgres + validação (contagem por coleção) | dados reais no postgres |
| **Fase 6 — IA/Genkit** | Mover flow de booster para módulo Nest (genkit server-side), angular consome | botão "Verificar Reforços" funcionando |
| **Fase 7 — Hardening** | Testes e2e, rate-limit, docs Swagger, variáveis de ambiente, deploy docker | entregar flag `ready for prod` |

---

## 10. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| recharts é React-only (gráficos) | médio | validar ngx-charts (mesma estética) na Fase 1; fallback Chart.js com mesmos tokens |
| Components shadcn/radix são React-only | médio | port via spartan/ng (são o port oficial p/ Angular) ou adaptação manual p/ CDK |
| Migração de data (Timestamps, uids com `_`) | médio | script de migração com `lastIndexOf('_')`, testes de contagem, dry-run |
| Senhas em texto puro no Firestore legado | alto | obrigar reset pós-migração (hash novo); não expor campo |
| Dependência de SDK firebase no front | baixo | remoção total; data via API only |
| Admin hardcoded no legado | baixo | seed dedicado; log de acesso |
| Mudança de humana relacional p/ Auth effective | médio | manter `doctorIds` via join; documentar no Swagger |

---

## 11. Decisões de arquitetura (ADRs)

- **ADR-001:** Backend NestJS separado do frontend Angular (SPA); comunicação
  REST JSON sob `/api/v1`.
- **ADR-002:** Prisma como única camada de acesso a dados (sem query builder
  paralelo).
- **ADR-003:** Unificar biometria diária (PA/glicemia/peso) em **`VitalScore`
  única** com `JSONB` por período, igual ao documento Firestore e à tela
  "Registrar Sinais Vitais".
- **ADR-004:** `SharedData` será modelado com **colunas tipadas** no Prisma
  (não JSONB) para validação e queríeis de alerta; `ExamType` como tabela.
- **ADR-005:** Autenticação: JWT (access+refresh) via `@nestjs/jwt`; senhas
  bcrypt; tolerância de timeout de inatividade mantida no front (proxy do
  legado).
- **ADR-006:** Gráficos escolhidos na Fase 1 (ngx-charts ou wrapper), mantendo
  a paleta `chart-1..5`.

---

## 12. Checkpoints de validação (pós-migração)

- [ ] `prisma migrate deploy` limpo + `prisma generate`
- [ ] `/api/v1/auth/login` correto para admin/médico/paciente (seed)
- [ ] Swagger `/api` listando todas as rotas protegidas
- [ ] Front estilizado idêntico (comparar print telas antes/depois)
- [ ] Contagem de registros: `SELECT count(*)` por tabela == export Firestore
- [ ] Relações: `SubItem.recordId`, `VitalScore.userId`, `PatientDoctor` — sem
  órfãos (consulta anti-join)
- [ ] PDFs (pressão, consolidado, médico) gerados no navegador
- [ ] Fluxo IA "Verificar Reforços" funcional via backend
- [ ] `docker compose up` sobe Postgres + backend + frontend em modo prod
```

> Consulte também o restante deste diretório `migration-plan/` para
> detalhamentos, scripts e modelos.