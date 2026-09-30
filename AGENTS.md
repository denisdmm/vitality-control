# Guia do agente — Vitality Control

## Sobre o projeto

VitalityControl (Sistema de Controle e Acompanhamento da Saúde) — "Central de Vitalidade".
Monorepo (npm workspaces) em migração do legado Next.js 15 + Firebase/Firestore.

- Backend: NestJS 10 + Prisma 5 (`backend/`), prefixo global `/api/v1`, Swagger em `/api`, porta 5000
- Frontend: Angular 21 standalone + signals + Tailwind CSS 4 (`frontend/`), dev server na 4300 com proxy de `/api`
- Persistência: PostgreSQL 16 (Neon em dev/prod), acesso somente via Prisma Client
- Auth: JWT access token via Passport (`@nestjs/jwt`), senha com `bcryptjs`, roles `PACIENTE` / `MEDICO` / `ADMINISTRADOR`
- Migração de dados: scripts em `backend/scripts/` (`firestore-export.mjs`, `firestore-to-postgres.ts`)

Plano, entity-map e histórico: `docs/migration-plan/` (`README.md`, `LOG.md`, `schema.prisma.md`, `entity-map.md`).
O contexto completo do projeto deveria estar em `openspec/config.yaml` (fonte da verdade), mas o arquivo ainda
contém apenas o template do OpenSpec. Este arquivo é o resumo.

## Regras permanentes

- Use sempre o idioma em Português Brasil
- Seja objetivo.
- Evite respostas longas quando uma resposta curta resolver.
- Nao gere codigo sem solicitacao.
- Nao repita informacoes ja definidas anteriormente.
- Considere decisoes aprovadas como regras permanentes do projeto.
- Preserve compatibilidade com decisoes anteriores.
- Quando houver mais de uma solucao possivel, apresente vantagens, desvantagens e uma recomendacao tecnica.
- Priorize simplicidade, manutencao e escalabilidade.

## Autonomia

Resolva a tarefa completa antes de responder.

Não peça confirmação para:

- renomeações;
- refatorações locais;
- criação de métodos privados;
- ajustes de import;
- correções de lint;
- correções de Sonar;
- melhorias de legibilidade.

Pergunte somente quando a decisão alterar regra de negócio, contrato de API, banco de dados ou comportamento funcional.

## Modo economico

- Antes de ler arquivos grandes, use `rg` para localizar simbolos, rotas, classes ou textos exatos.
- Leia apenas os trechos necessarios com `sed -n 'inicio,fimp' arquivo`.
- Evite abrir README, lockfiles, JSONs grandes, changelogs, assets e arquivos gerados sem necessidade.
- Nao liste a arvore inteira do projeto quando uma busca direcionada resolver.
- Mantenha respostas curtas: diga o que mudou, onde mudou e como foi validado.
- Nao explique codigo obvio. Explique somente decisoes, riscos ou pontos nao triviais.

## Edicao

- Faca mudancas pequenas e localizadas.
- Preserve o padrao existente do NestJS (modulos por dominio, controller/service/dto), do Angular (standalone + signals) e do Prisma.
- Nao refatore arquivos fora do escopo pedido.
- Nao reverta alteracoes existentes do usuario.
- Prefira nomes claros a comentarios longos.
- Use ASCII salvo quando o arquivo ja usar acentos ou houver motivo claro.

## Testes e validacao

- Backend nao possui suite de testes configurada (sem jest no `backend/package.json`) nem lint. Valide por build (`npm run build -w backend`) e, quando houver, por chamada ao endpoint no Swagger (`http://localhost:5000/api`).
- Frontend tem `ng test` declarado, mas nao ha specs no repositorio; a validacao real hoje e `npm run build -w frontend` (build de producao) ou verificacao manual no dev server. `npm test` na raiz delega para `ng test -w frontend`.
- Nao existe lint configurado em nenhuma das duas apps; o unico formatador e o Prettier do frontend (`frontend/.prettierrc`).
- Rode sempre a menor validacao util para a mudanca.

## Mapa do codigo

Modulos do backend (`backend/src/<dominio>/`):

`auth`, `common` (guards/decorators/`JwtStrategy`), `doctor-panel`, `exam-types`, `health-records`,
`prescriptions`, `prisma` (`PrismaService`), `reports`, `shared-data`, `users`, `vaccines`, `vitals`.
Upload de PDF de receita: `backend/uploads/` via multer (`prescriptions/prescription-file.service.ts`,
`clean-upload-on-error.interceptor.ts`).

Modelos Prisma: `User`, `PatientDoctor`, `ClinicalNote`, `PatientAuditEvent`, `HealthRecord`, `SubItem`,
`VitalScore`, `Prescription`, `Medication`, `MedicationSchedule`, `Vaccine`, `ExamType`, `SharedData`;
enums `Role`, `PatientAuditAction`, `HealthRecordStatus`, `PrescriptionStatus`.

Frontend (`frontend/src/app/`):

- `pages/`: `login`, `dashboard`, `minha-area`, `peso`, `pressao-arterial`, `glicemia`, `exames`, `vacinas`
  (dentro de `minha-area`), `receituario`, `relatorios`, `medico`, `admin`, `placeholder`
- `core/`: `api.ts` (client HTTP), `auth.service.ts` + `auth.guard.ts` + `auth.interceptor.ts`,
  `inactivity.service.ts`, `theme.ts`, `toast.service.ts`, `dates.ts` e um `*.service.ts` por dominio
- `shared/ui/`: componentes reutilizaveis (button, card, dialog, input, select, combobox, multi-select, table,
  chart, calendar, toast, alert-dialog, avatar, badge, checkbox, popover, spinner, alert)
- `shared/widgets/`: `active-medications`, `blood-pressure-log`, `glucose-log`, `weight-log`,
  `health-entry-modal`, `patient-link-dialog`, `prescription-form`, `public-campaigns`, `vaccination-wallet`
- Grafico/exportacao: Chart.js (`shared/ui/chart.ts`), `jspdf` + `html2canvas` para PDF

## Comandos uteis

- Buscar arquivos: `rg --files`
- Buscar texto: `rg "texto"`
- Ler trecho: `sed -n '1,160p' caminho/arquivo`
- npm wrapper: `./npmw` (nao existe neste repo; use `npm run <script> -w backend|-w frontend`)

## Comandos de desenvolvimento

Raiz (npm workspaces, `backend` + `frontend`):

- `npm ci` — instala as duas apps
- `npm start` — sobe tunnel + backend (watch) + frontend via `concurrently`
- `npm run build` — build de backend e frontend
- `npm run prisma:deploy` / `npm run prisma:seed`

Backend:

- `npm run start:dev -w backend` — Nest em watch na porta 5000
- `npm run prisma:generate -w backend` — regenerar Prisma Client apos mexer em `schema.prisma`
- `npm run prisma:migrate -w backend` — criar/aplicar migration em dev
- `npm run prisma:studio -w backend`
- `node backend/tunnel.js` — so necessario no sandbox (Neon acessado por tunel em `127.0.0.1:5433`)

Frontend:

- `npm start -w frontend` — `ng serve` em `http://localhost:4300` com proxy de `/api`
- `npm run build -w frontend` — build de producao em `frontend/dist/`

Variaveis: `backend/.env` com `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`.

## Ao responder

- Responda em portugues.
- Comece pelo resultado.
- Cite caminhos de arquivos alterados.
- Inclua comandos executados somente quando a validacao nao for obvia.

## Convenções de arquitetura

ADRs vigentes em `docs/migration-plan/README.md` (secao 11):

- **ADR-001** Backend NestJS separado do frontend Angular (SPA); REST JSON sob `/api/v1`.
- **ADR-002** Prisma como unica camada de acesso a dados.
- **ADR-003** Biometria diaria unificada em `VitalScore` (uma linha por usuario/dia) com `JSONB` por periodo.
- **ADR-004** `SharedData` com colunas tipadas (nao JSONB); `ExamType` como tabela.
- **ADR-005** JWT via `@nestjs/jwt` + `bcryptjs`; timeout de inatividade mantido no front.
- **ADR-006** Graficos com Chart.js (`frontend/src/app/shared/ui/chart.ts`), mantendo a paleta `chart-1..5`.

Padroes a preservar:

- Backend: um modulo por dominio em `backend/src/<dominio>/` com `*.module.ts`, `*.controller.ts`, `*.service.ts` e `dto/`; services usam `PrismaService` injetado; `ValidationPipe` global com `whitelist` e `transform`.
- Guards/decorators compartilhados em `backend/src/common/` (`RolesGuard`, `@Roles`, `@CurrentUser`, `JwtStrategy`).
- Todo endpoint mutavel expoe `Swagger` decorators; prefixo global e `/api/v1`.
- Frontend: componentes standalone com `signal()` em `src/app/pages/*`, servicos em `src/app/core/*.service.ts` consumindo `core/api.ts`, UI reutilizavel em `src/app/shared/ui/`, widgets de dominio em `src/app/shared/widgets/`.
- Mudanca de schema: editar `backend/prisma/schema.prisma`, rodar `prisma:generate` e criar migration; nunca editar SQL de migration ja aplicada.
- Padroes visuais: Tailwind 4 com tokens em `src/styles.css`; nao introduzir CSS ad-hoc nos componentes.

## Convenções de teste

Nao existe suite automatizada no repositorio (nem no backend, nem specs no frontend). Validacao real hoje:
build de cada workspace + verificacao manual. Detalhamento completo no bloco `Testing` de
`openspec/config.yaml` (hoje ainda vazio — ver "Testes e validacao" acima).

## Workflow OpenSpec

Comandos (skills) disponiveis em `.opencode/commands` / `.opencode/skills`:

- `/opsx-propose` — cria proposta completa (design, specs, tasks)
- `/opsx-apply` — implementa as tasks de uma change
- `/opsx-update` — revisa artefatos de uma change existente
- `/opsx-explore` — brainstorm/investigacao antes da change
- `/opsx-sync` - sincroniza delta specs para as specs principais
- `/opsx-archive` - arquiva a change concluida

Estrutura: `openspec/changes/<id>/` (proposal, design, tasks, specs/) e `openspec/specs/` (specs vigentes ja sincronizados).

Specs vigentes em `openspec/specs/`: `clinical-notes`, `doctor-panel`, `doctor-patient-links`, `medication-dashboard`,
`prescription-book`.

Changes ativas (tasks 100% concluidas, aguardando `/opsx-archive`): `doctor-patient-panel`, `prescription-book`,
`prescription-registration-form`. `openspec/changes/archive/` esta vazio.

CI: `.github/workflows/opencode.yml` responde a `/oc` e `/opencode` em comentarios de issue/PR.

## Projeto GitLab

- Este repositorio esta no **GitHub**: `https://github.com/denisdmm/vitality-control.git` (branch `main`).
- Nao ha `.gitlab/`, templates de issue nem grupo de labels neste repositorio.
- O bloco "Como usar o MCP GitLab" abaixo veio de outro contexto (host `gitlab.ccasj.intraer`); usar apenas se o MCP GitLab estiver habilitado na sessao.

## Templates de Issue

Nao ha templates de issue versionados neste repositorio. Preencher manualmente a partir do modelo em "Formato das Descrições".

## Labels do Time

Lista de labels nao definida neste repositorio. Sobre o que foi definido:

- Tipo — exatamente um por issue:
- Estado no board — toda issue nova nasce em `Backlog`:

Prioridade, quando informada: `ALTA`, `MÉDIA`, `BAIXA`

Sprint: label `Sprint NN` junto do milestone correspondente. Ambos são definidos por humano, não pela IA.

`Tech Debt` tem espaço no nome, então em quick action exige aspas: `/label ~"Tech Debt"`.

## Formato das Descrições

- Sempre partir do corpo do template correspondente ao tipo da issue
- Remover os comentários `<!-- ... -->` do template: são orientação de preenchimento, não conteúdo da issue
- Remover a seção "Classificação" e aplicar os labels pelo parâmetro `labels` do `create_issue` (tipo + `Backlog`), em vez de depender das quick actions `/label`
- Não definir milestone nem label de sprint
- Manter português (time é brasileiro)
- Incluir contexto do código (arquivos, classes, métodos, linhas) sempre que relevante
- Para bugs, preencher a seção "Evidências" com stack trace ou log quando disponível
- Preencher "Fora do escopo" com o que não deve ser alterado no ticket

## Como usar o MCP GitLab

```json
"mcp": {
  "GitLab": {
    "type": "remote",
    "url": "http://gitlab.ccasj.intraer/api/v4/mcp",
    "enabled": true
  }
}
```

## Exemplo de Prompt

Exemplo de pedido no estilo deste projeto:

> "Crie um endpoint `GET /api/v1/vitals/weekly` que agrupa `VitalScore` por semana para o paciente logado, com `Swagger`, e adicione o consumo no `frontend/src/app/core/vitals.service.ts`."
