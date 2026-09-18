# LOG DE ATIVIDADES — Migração Central de Vitalidade

> Mantenha este arquivo atualizado a cada sessão de trabalho. Ele garante a
> continuidade do trabalho em momentos futuros (quem retomar lerá o estado).

---

## Sessão 1 — Análise do projeto legado e plano de migração

**Data:** 15/09/2026

### O que foi feito
1. Clonado repositório de origem para `/tmp/opencode/central-vitalidade`
   (branch `main`), origem: `https://github.com/denisdmm/Central-de-vitalidade.git`.
2. Leitura do stack atual (`package.json`, `tailwind.config.ts`,
   `src/lib/firebase.ts`, `src/lib/auth.tsx`, `src/app/actions.ts`,
   `docs/blueprint.md`).
3. Exploração completa (subagente) de:
   - todas as coleções Firestore e formatos de documento;
   - todas as páginas/componentes e seus pontos de persistência;
   - estilo/tema (tokens HSL, fonte Inter, shadcn/ui, recharts, pdf);
   - Auth (localStorage, senha em texto puro, admin hardcoded).
4. Produzidos os seguintes artefatos em `docs/migration-plan/`:
   - `README.md` — plano completo de migração (arquitetura, schema-alvo,
     relacionamentos, estratégia de migração, roadmap, ADRs, checkpoints);
   - `schema.prisma.md` — rascunho do schema Prisma (PostgreSQL 16);
   - `entity-map.md` — mapeamento campo-a-campo Firestore→Postgres;
   - `LOG.md` — este registro.

### Estado do repositório
- O clone está em `/tmp/opencode/central-vitalidade` (TEMPORÁRIO).
  > Ação pendente: decidir local definitivo do novo projeto
  > (ex.: subir as novas pastas `backend/` e `frontend/` ou criar repositórios
  > separados). Recomendação de monorepo no README (seção 2).

### Decisões já tomadas (ADRs)
- ADR-001..006 registrados no `migration-plan/README.md` (seção 11).
- Destaque: ADR-003 (tabela única `vital_scores` com JSONB por período) e
  ADR-004 (`shared_data` com colunas tipadas).

### Pendências / próximos passos
- [x] Fase 1 — scaffold NestJS + Prisma + Postgres com o `schema.prisma` do rascunho.
- [x] Migração real dos dados (REST público do Firestore → Postgres) CONCLUÍDA.
- [ ] Confirmar situação das senhas em texto puro no legado (resolvida via
      bcrypt no import; falta apenas troca no 1º acesso).
- [ ] Definir repositório/layout definitivo do novo projeto.
- [ ] Decidir biblioteca gráfica Angular (ngx-charts vs Chart.js) — ADR-006.
- [ ] Trocar senha do admin recriado no import (`admin/admin`) no 1º acesso.

---

## Sessão 2 — Banco de dados (Neon/Vercel), migrations e importação do Firebase

**Data:** 15/09/2026
**Estado:** concluída

### O que foi feito
1. **Conexão com o banco**: criado `backend/.env` com a `DATABASE_URL` fornecida
   (Neon/Vercel Postgres, projeto `neondb`, host pooler sa-east-1). O sandbox
   bloqueia TCP direto (usa proxy HTTP), então foi criado `backend/tunnel.js` —
   túnel local `127.0.0.1:5433` → Neon via CONNECT do proxy, com
   `options=endpoint%3D...` exigido pelo Neon sem SNI. Conexão validada:
   **PostgreSQL 18.6** no Neon.
2. **Backend scaffold**: `backend/` com NestJS deps (`@nestjs/*`, `@prisma/client`,
   `prisma`, `bcryptjs`, `@nestjs/jwt`, passport, class-validator/transformer).
3. **Schema Prisma** (`backend/prisma/schema.prisma`): `User`,
   `PatientDoctor` (N:N paciente↔médico), `HealthRecord`+`SubItem`,
   `VitalScore` (ADR-003, JSONB por período), `Medication`, `Vaccine`,
   `ExamType`, `SharedData` (colunas tipadas, ADR-004) + enums
   `Role`, `HealthRecordStatus`.
4. **Migrations aplicadas no Neon**:
   - `20260915191853_init`
   - `20260915192138_preserve_legacy_ids_text` (IDs como texto, preservando
     doc-ids do Firestore)
5. **Export Firestore** (`scripts/firestore-export.mjs`): via REST público
   (regras `allow read: if true`) → JSONs em
   `backend/scripts/migration/firestore-export/`.
6. **Importação** (`scripts/firestore-to-postgres.ts`):
   - users **3** (denisdmm, Teste123 + admin recriado com bcrypt)
   - health_records **3**, medications **4**, exam_types **4**,
     vital_scores **122** (mesclando PA/glicemia/peso por `userId+date`),
     sub_items **0**, vaccines **0**, patient_doctors **0** (sem doctorIds reais)
   - Senhas do Firestore (texto puro) → **bcrypt hash (10 rounds)**.
   - Validação: total = distintos em `(user_id, date)`; órfãos = **0**.
7. **Seed** (`prisma/seed.ts`): cria `admin/admin` + paciente exemplo via
   `npx prisma db seed` (testado OK).

### Decisões desta sessão (novas)
- ADR-007: IDs primárias em **text** (preservando doc-ids do Firestore);
  novos registros usam UUID gerado pelo Prisma.
- ADR-008: importação por script idempotente (upsert), não por migration SQL.

### Bloqueios / observações
- O sandbox só acessa a internet via proxy HTTP (`192.168.132.202:8080`);
  conexões ao Neon exigem `tunnel.js`. Fora do sandbox, basta usar a
  `DATABASE_URL` real (comentada no `.env`).
- `channel_binding=require` não é usada; usamos `sslmode=require`.

### Próximos passos
- [x] Fase 2 — implementar endpoints NestJS (auth JWT, users, vitals,
      medications, vaccines, health-records, shared-data, reports) — CONCLUÍDA
      (ver Sessão 3).
- [ ] Fase 3 — frontend Angular + Tailwind (tokens copiados) + login/guards.
- [ ] Fase 4 — portar telas (exames, pressão, glicemia, peso, relatórios,
      minha área, admin, médico).

---

## Sessão 3 — Fase 2: endpoints NestJS implementados e testados

**Data:** 15/09/2026
**Estado:** concluída (endpoints entregues; pendências abaixo)

### O que foi feito
1. **Módulos NestJS criados** em `backend/src/`:
   - `prisma/` (service + module @Global),
   - `common/` (roles.decorator, current-user.decorator, roles.guard, jwt.strategy),
   - `auth/` (POST `/auth/login`, GET `/auth/me`; bcrypt compare + JWT 15min),
   - `users/` (me/updateMe; CRUD admin + vínculo médico-paciente via `patient_doctors`),
   - `vitals/` (GET list/patients/pressure/:patientId/:date; PUT daily|blood-pressure|glucose|weight/:date; DELETE :date),
   - `health-records/` (CRUD + sub-itens com ownership por usuário/admin),
   - `medications/`, `vaccines/`, `exam-types/`, `shared-data/` (GET; PUT admin),
   - `reports/` (GET `/consolidated` e `/pressure` com `from/to` + resumo estatístico).
   - `app.module.ts` + `main.ts`: prefixo global `api/v1`, `ValidationPipe`
     (transform/whitelist), CORS, Swagger em `/api`.
2. **Build e execução**: `nest build` OK; servidor em `:5000` via `dist/src/main.js`
   (tsconfig passou a incluir `src/**`). Túnel `tunnel.js` (porta 5433) reativado.
3. **Testes de integração (curl)** — todos OK:
   - Login: `admin/admin`, `denisdmm/1q2w3e4r5t`, `Teste123/123456` → `{accessToken, tokenType, user}`.
   - Autenticação obrigatória (401 sem token); `/auth/me` retorna perfil + `photoUrl`.
   - Vitals: listagem (117 p/ denisdmm), saveDaily com merge por período
     (manha/tarde/noite), readback do dia, delete.
   - Health-records: CRUD completo + sub-items (subitem deletado e registro removido no teste);
   - Medications/Vaccines/ExamTypes/SharedData/Reports: leitura e escrita conforme esperado.
   - Regras de acesso: paciente só acessa dados próprios (404 ao pegar medicação alheia),
     `PUT /shared-data` só admin (403 p/ paciente), admin consegue (200).
4. **Bugs corrigidos durante o teste**:
   - `RolesGuard` registrado como `APP_GUARD` global executava ANTES do `AuthGuard('jwt')`
     (req.user ainda vazio) → removido o guard global (cada controller já aplica
     `AuthGuard('jwt') + RolesGuard`);
   - `UsersService` sem `@Injectable()` → injetado com `this.prisma` undefined (500 em
     `/users/me`, create, updateMe) → adicionado decorator;
   - `UpdateUserDto` estendia `CreateUserDto` com `password?: string` (TS2416) → classe
     standalone com todos os campos opcionais;
   - Prisma rejeitava `null` em colunas JSONB no `vitals.service` → helper `jsonOrNull`
     (mapeia para `Prisma.DbNull`);
   - filtro `NOT: { bloodPressurePeriods: DbNull }` em reports → trocado por filtro em memória.

### Estado atual do banco
- Import Firestore intacto (users=4 incl. seed-paciente, health_records=3,
  medications=4, vital_scores=122, exam_types=4, shared_data=1).
- Removidos os dados criados apenas para teste (exame/subitem, medicação Vit. D,
  dia 2026-09-10 de vitals, usuário `testeme2`).

### Pendências / próximos passos
- [ ] Refresh token JWT (7d) previsto no plano (`POST /auth/refresh`) — não implementado.
- [ ] `patient_doctors=0` e `vaccines=0` no banco → fluxo "médico" e vacinas só terão
      teste real quando houver dados/vínculos.
- [ ] Trocar senha do admin (`admin/admin`) no 1º acesso (segurança).
- [x] Fase 3 — frontend Angular + Tailwind (tokens copiados) + login/guards
      apontando para `/api/v1` — CONCLUÍDA (ver Sessão 4).
- [ ] Fase 4 — portar telas (exames, pressão, glicemia, peso, relatórios,
      minha área, admin, médico) e decidir biblioteca gráfica (ADR-006).

### Comandos úteis
```bash
# infra (obrigatório no sandbox)
node tunnel.js                         # túnel 127.0.0.1:5433 → Neon
npm run build && node dist/src/main.js # servidor em :5000

# smoke test
curl -s -X POST http://localhost:5000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"name":"admin","password":"admin"}'
```

---

## Sessão 4 — Fase 3: frontend Angular base (Tailwind + auth + layout)

**Data:** 17/09/2026
**Estado:** concluída (base funcional; telas reais ficam para a Fase 4)

### O que foi feito
1. **Scaffold** em `frontend/`:
   - Angular **21** (standalone, routing, sem SSR). Angular 22 exigia Node ≥22.22.3
     (temos 22.16.0) → usado v21.
   - Tailwind **v4** (`tailwindcss@^4.3.3` + `@tailwindcss/postcss`), via
     `postcss.config.mjs` (detectado pelo builder `@angular/build`).
   - `.gitignore` gerado pelo CLI.
2. **Tema copiado do legado** (globals.css/tailwind.config):
   - Tokens HSL de `:root`/`.dark` idênticos (background 234/43%/94%, primary
     231/48%/48%, accent 266/39%/58%, sidebar, chart-1..5, radius) mapeados para
     o Tailwind v4 com `@theme inline` (`bg-background`, `text-foreground`,
     `border-border`, `bg-card`, `text-primary`, etc.).
   - Fonte **Inter** (Google Fonts) em `index.html` + `--font-sans`.
3. **Auth** (padrão do legado, agora contra a API Nest `/api/v1`):
   - `core/auth.service.ts` — `login(name, password)` faz
     `POST /api/v1/auth/login`, guarda `accessToken`+`user` no localStorage
     (signals reativos);
   - `core/auth.interceptor.ts` — injeta `Authorization: Bearer` e desloga em 401;
   - `core/auth.guard.ts` — `authGuard` (bloqueia `/` para não logados) e
     `guestGuard` (já logado pula `/login`);
   - `core/inactivity.service.ts` — logout por inatividade (default 60s, respeita
     `inactivityTimeout` do usuário, igual ao legado);
   - Página `pages/login` (nome+senha, erros, loading).
4. **Layout shell** (`layout/`): sidebar esquerda (logo HeartPulse + menu completo
   do legado: Dashboard, Exames, Relatórios, Pressão, Glicemia, Peso e IMC,
   Vacinação, Medicamentos, Campanhas, Minha Área + Médico/Admin por role),
   header sticky `h-16 border-b bg-card` com título da rota, botão
   "Registrar Sinais Vitais" (placeholder desabilitado) e "Sair".
5. **Rotas/placeholders**: `pages/placeholder` reutilizável (title/description via
   `route.data`) para todas as telas da Fase 4; relatórios/admin/médico já criados
   como rotas.
6. **Dev proxy**: `proxy.conf.json` redireciona `/api` → `http://localhost:5000`
   (evita CORS no dev); `API_BASE = '/api/v1'` relativo.
7. **Validação**: `ng build` OK (81 kB transferido ~312 kB raw);
   `ng serve` em `:4200`; proxy testado (`POST /:4200/api/v1/auth/login` → 200);
   tokens CSS presentes no bundle.

### Decisões desta sessão
- ADR-011: Angular 21 (não 22) por compatibilidade com Node 22.16 do sandbox.
- ADR-012: Tailwind v4 com `@theme inline` + variáveis HSL (mesma técnica do
  shadcn render atual), sem `tailwind.config.ts`.

### Pendências / próximos passos
- [ ] Fase 4 — portar telas pass-a-pass: Dashboard (histórico + alertas),
      Exames + sub-itens, Pressão, Glicemia, Peso/IMC, Relatórios (consolidado +
      PDF `data-report-part`), Vacinação, Medicamentos, Campanhas, Minha Área,
      Admin (usuários/índices), Médico (seleção de paciente). Decidir biblioteca
      gráfica (ADR-006).
- [ ] Revisar `photoUrl` (base64 grande) — validar limite/Storage (rota
      `users/me` hoje retorna o base64 inteiro).
- [ ] Login: considerar mostrar o `fullName` no header (hoje nº: sidebar).

### Comandos úteis
```bash
# certifique-se de backend+proxy (túnel) ativos na porta 5000
cd /vitality-control/frontend
npm run build        # build de produção
npx ng serve --port 4200   # dev server com proxy /api -> :5000
```

---

## Sessão 5 — Fase 4: telas reais (vitals, exames, relatórios, área, médico, admin)

**Data:** 17/09/2026
**Estado:** concluída (todas as telas do legado portadas; build OK)

### O que foi feito
1. **UI compartilhada concluída** (`frontend/src/app/shared/`):
   - `ui/button.ts` e `ui/badge.ts`: corrigido `host: { '[class]': 'classes()' }`
     (antes as classes computadas eram ignoradas e os botões saíam sem estilo).
   - `ui/table.ts`: convertido de **componentes de elemento** (`<app-table>`) para
     **diretivas de atributo** (`table[app-table]`, `thead[app-table-header]`,
     `tbody[app-table-body]`, `tr[app-table-row]`, `th[app-table-head]`,
     `td[app-table-cell]`) + export `TABLE_IMPORTS`. As telas já usavam a sintaxe
     de atributo, mas nada aplicava o estilo (seletores não casavam).
   - `ui/combobox.ts` (busca + texto livre no Enter) e `ui/multi-select.ts`
     (seleção múltipla com chips, usada no vínculo de médicos).
   - `ui/chart.ts` (wrapper Chart.js `app-line-chart`) e `core/theme.ts`
     (`themeColor` emitindo `hsla(r, g%, b%, a)` compatível com canvas).
   - `shared/reports/`: `blood-pressure-report.ts` e `consolidated-report.ts`
     (multi-parte, com `[data-report-part]` para o PDF).
2. **Páginas portadas** (com rotas lazy `loadComponent`):
   - **Pressão** (`/pressao`): tabela desktop + lista mobile por período
     (manhã/tarde/noite), CRUD por período (`PUT /vitals/blood-pressure/:date`),
     filtro de período (range, default 30 dias), `app-bp-reading-cell` com
     alerta, diálogo de impressão + PDF (html2canvas + jsPDF).
   - **Glicemia** (`/glicemia`): tabela por período, ícones de atenção/perigo
     (limiares de `SharedData`), checkbox "em jejum", limpeza de todos os
     períodos ao excluir.
   - **Peso/IMC** (`/peso`): banner de altura ausente (link p/ Minha Área),
     IMC + classificação, `DELETE /vitals/:date`.
   - **Exames** (`/exames` + `/exames/:id`): abas SOLICITADO/AGENDADO/REALIZADO,
     solicitar (combobox de tipo + médico), agendar, registrar resultado,
     sub-itens no detalhe, exclusão com AlertDialog.
   - **Relatórios** (`/relatorios`): período + `reports.consolidated`,
     prévia e PDF multi-parte com repetição do cabeçalho por página.
   - **Minha Área** (`/minha-area`): edição de perfil (fullName/social/email/
     foto/altura), logout por inatividade (1/2/5 min), troca de senha
     (informativo) e lista "Meus Médicos" (`ME` do paciente).
   - **Médico** (`/medico/pressao-arterial`): seleção de pacientes vinculados
     (`GET /vitals/patients`) + `GET /vitals/pressure/:id`, tabela e relatório PDF.
   - **Admin** (`/admin` usuários + `/admin/indices` índices): CRUD de usuários
     (foto em base64, papéis, CRM, vínculo de médicos, inatividade) e edição dos
     índices de PA/glicemia (`PUT /shared-data`).
   - **Vacinação/Medicamentos/Campanhas**: rotas passam a servir diretamente os
     widgets `VaccinationWalletComponent`, `MedicationTrackerComponent`,
     `PublicCampaignsComponent`.
3. **Rotas**: todas as telas com `loadComponent` (code-splitting) e redirect
   `/medico` → `/medico/pressao-arterial`. Menu do layout atualizado
   (Pressão Pacientes, Usuários, Índices de Saúde).
4. **Ícones** (`shared/icons.ts`): adicionados `chevronsUpDown`, `x`, `shield`,
   `briefcaseMedical`; conferidos `scale`, `droplets`, `fileText`, `save`,
   `timer`, `camera`, `ruler`, `target`.
5. **Build**: bundle inicial **~361 kB** (limite 1 MB), sem erros; PDFs e
   Chart.js ficam em chunks lazy. Warnings não-ESM de `html2canvas`/`canvg`/
   `jspdf` são esperados.

### Decisões desta sessão
- ADR-013: telas standalone "Vacinação/Medicamentos/Campanhas" reutilizam os
  widgets do dashboard via rota direta (sem wrapper).
- ADR-014: `table.ts` vira diretivas de atributo (tabela HTML semântica),
  export agrupado em `TABLE_IMPORTS` (arrays aninhados em `imports`).
- ADR-015: exclusão de peso usa `DELETE /vitals/:date` (remove o dia inteiro) —
  simplificação a revisar se houver PA/glicemia no mesmo dia.

### Bloqueios / observações
- `vaccines=0` e `patient_doctors=0` no banco: telas de Vacinação e Médico só
  terão dados reais após cadastros/vínculos.
- `photoUrl` base64 grande segue trafegando inteiro em `users/me`.

### Pendências / próximos passos
- [ ] Popular vínculos médico-paciente e vacinas para teste ponta-a-ponta.
- [ ] Refresh token JWT (`POST /auth/refresh`) não implementado.
- [ ] Trocar senha do admin (`admin/admin`) no 1º acesso.
- [ ] Revisar limite de `photoUrl` base64 (mover para Storage/URL).
- [ ] Ajustar exclusão de peso para remover apenas o campo de peso.

### Comandos úteis
```bash
# infra (sandbox): túnel + backend na :5000
cd /vitality-control/backend && node tunnel.js & node dist/src/main.js &
cd /vitality-control/frontend && npm run build
```

---

## Modelo de entrada para a próxima sessão

```
## Sessão N — <título>

**Data:** DD/MM/AAAA
**Estado:** <em andamento | concluída | bloqueada>

### O que foi feito
- ...

### Bloqueios
- ...

### Próximos passos
- [ ] ...
```