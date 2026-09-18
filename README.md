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

## Documentação

- Plano de migração e histórico de sessões: `docs/migration-plan/LOG.md`
- README do frontend (Angular CLI): `frontend/README.md`
