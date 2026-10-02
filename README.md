# Central de Vitalidade (migração)

Monorepo da migração: `backend/` (NestJS + Prisma + PostgreSQL) e
`frontend/` (Angular 21 + Tailwind v4).

## Como iniciar a aplicação

A aplicação precisa de **3 processos**: túnel do banco, backend e frontend.

### 1. Túnel do banco (obrigatório só no sandbox)

O sandbox só acessa a internet via proxy HTTP, então o Neon é acessado por um
túnel local (`127.0.0.1:5433` → Neon).

```bash
cd backend
node tunnel.js
```

> Fora do sandbox, pule esta etapa: use a `DATABASE_URL` real no `backend/.env`.

### 2. Backend (API em `http://localhost:5000`)

```bash
cd backend
npm run build && node dist/src/main.js
```

Ou, em desenvolvimento com watch:

```bash
cd backend
npm run start:dev
```

### 3. Frontend (dev server em `http://localhost:4300`)

```bash
cd frontend
npm start
```

`npm start` executa `ng serve` e faz proxy de `/api` para `http://localhost:5000`
(ver `frontend/proxy.conf.json`). Abra `http://localhost:4300/`.

Você também pode usar o modo monorepo a partir da raiz (instala/apps e serviços
em um só comando):

```bash
npm ci            # instala backend + frontend (raiz = npm workspaces)
npm start         # sobe backend (watch) + frontend (ng serve) via concurrently
```

### Build de produção do frontend

```bash
cd frontend
npm run build
```

Os artefatos ficam em `frontend/dist/`.

## Publicação

### Backend no Render

O backend roda como Web Service de runtime Node, sem Dockerfile. Crie o serviço
em <https://render.com> conectado ao repositório `denisdmm/vitality-control`
(branch `develop`):

| Campo | Valor |
| --- | --- |
| Name | `vitality-api` |
| Root Directory | `backend` |
| Runtime | Node (native, sem Docker) |
| Build Command | `npm ci && npm run prisma:generate && npm run build` |
| Start Command | `npm run prisma:deploy && npm run start:prod` |
| Health Check Path | `/api` (Swagger) |

Variáveis de ambiente (painel do serviço):

```
DATABASE_URL=postgresql://neondb_owner:<senha>@ep-<id>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&connect_timeout=15
JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://<host do frontend>
NODE_VERSION=22
UPLOADS_DIR=/tmp
```

Regras que quebram o deploy se não forem respeitadas:

- **Sem aspas** nos valores das variáveis. `DATABASE_URL` colada com `"` vira uma
  string inválida para o Prisma.
- **Não use a URL do túnel local** (`127.0.0.1:5433`) no Render: copie a URL do
  host real do Neon (`POSTGRES_URL` no `backend/.env`, ou a linha comentada com
  o host sem pooler).
- **Não defina `NODE_ENV=production`** nas variáveis de ambiente: com ela, o
  `npm ci` do build pula `devDependencies`, onde ficam `prisma`, `@nestjs/cli` e
  `ts-node`.
- **As migrations são aplicadas no start** (`prisma:deploy && start:prod`),
  porque o `PrismaService` só faz `$connect()` e não migra o banco. O comando é
  idempotente; rodar em todo start é intencional.
- O `P1001 Can't reach database server` logo após o primeiro deploy costuma ser o
  compute do Neon suspenso: force um resume no console do Neon e redeploy.
- `P1012 Environment variable not found: DATABASE_URL` significa variável ausente
  no serviço; `P1000` é senha inválida.
- **Não existe `/api/v1/health`** ainda (entra na change
  `migrate-backend-to-vps-runtime`); use `/api` como health check.

Limitações conhecidas no Render: o plano free hiberna após 15 min sem tráfego
(primeira requisição demora), e `UPLOADS_DIR=/tmp` faz os PDFs de receita se
perderem a cada restart.

### Frontend na Vercel

O build do frontend lê a URL da API de env (`frontend/scripts/write-environment.mjs`
gera `frontend/src/environments/environment.ts` a partir de `API_BASE_URL`, com
default `/api/v1` para o proxy local). No projeto Vercel:

```
API_BASE_URL=https://<host do backend>/api/v1
```

Sem essa variável o frontend assume a API no mesmo domínio e recebe `404`, já que
o projeto Vercel publica apenas os arquivos estáticos do Angular.

## Documentação

- Plano de migração e histórico de sessões: `docs/migration-plan/LOG.md`
- README do frontend (Angular CLI): `frontend/README.md`
