# Proposal

## Why

O backend hoje só existe como processo local: `npm run start:dev -w backend` na porta 5000, com
`backend/tunnel.js` abrindo túneil para o PostgreSQL do Neon e nada além disso. Não há imagem de
container, não há healthcheck, não há proxy, não há HTTPS e não há forma de subir a API sem a máquina de
desenvolvimento ligada. Como consequência, um recurso que depende de disco local — o upload do PDF da
receita, gravado em `backend/uploads/receitas` por `diskStorage` — não pode ser ligado em nenhum ambiente
que não seja a máquina do desenvolvedor: em container o diretório é efêmero, e o arquivo some no primeiro
redeploy.

Esta change entrega o runtime de produção do backend (imagem Docker, Docker Compose com proxy e TLS,
healthcheck, configuração por ambiente, migrações no boot) e, no mesmo movimento, desliga por feature flag
o salvamento de PDF em disco, deixando o código pronto para o ticket futuro que o reimplementará sobre
armazenamento adequado (object storage ou volume).

## What Changes

- **Imagem de produção do backend**: `Dockerfile` multi-stage sobre Node 22, com `nest build` no estágio de
  build, `prisma generate` para o schema, execução não-root e `CMD` em `dist/main` (`start:prod`), mais
  `.dockerignore` para não enviar `node_modules`, `dist`, `uploads` e `.env` no contexto.
- **Orquestração local de produção**: `docker-compose.yml` com o serviço `api` (porta interna 5000, healthcheck
  em `/api/v1/health`, `restart: unless-stopped`) e o serviço `proxy` (Caddy, TLS automático, `api.` no host e
  `localhost` para o backend). O PostgreSQL continua no Neon: apenas `DATABASE_URL` entra por ambiente.
- **Healthcheck público**: `GET /api/v1/health` em `backend/src/health/`, sem `AuthGuard`, respondendo `200`
  com `status` e o estado do banco (`SELECT 1` via `PrismaService`), e `503` quando o banco não responde. É o
  alvo do `HEALTHCHECK` da imagem e o que o proxy usa para decidir se a API está de pé.
- **Migrações no boot**: entrypoint que roda `prisma migrate deploy` antes de subir o Nest, em vez de depender
  de alguém lembrar de rodar `npm run prisma:deploy` no servidor.
- **Configuração por ambiente**: `CORS_ORIGIN` passa a ser obrigatório no compose, apontando para o domínio
  servido pelo proxy, e a lista de variáveis vai para um `.env.example` do backend.
- **PDF da receita desligado por flag**: nova `PRESCRIPTION_PDF_ENABLED` (default `false`). Com a flag apagada,
  `POST /prescriptions` e `POST /prescriptions/:patientId/prescriptions` que chegam com anexo são recusadas com
  `501` (recurso indisponível), sem criar receita e sem gravar nada em disco; `GET /prescriptions/:id/file`
  responde `501` antes de qualquer acesso a arquivo; e `PrescriptionFileService.onModuleInit` deixa de criar
  `uploads/receitas`. Receita sem anexo continua sendo registrada normalmente. O código do serviço, o filtro de
  PDF, o `CleanUploadOnErrorInterceptor` e as colunas `file*` do Prisma permanecem intactos para o ticket
  futuro.
- **UI coerente com a flag**: novo valor `prescriptionPdfEnabled` no ambiente de build do Angular exposto como
  signal em um serviço de configuração; `shared/widgets/prescription-form.ts` esconde o bloco de upload, e
  `pages/receituario/receituario.ts` e `pages/medico/receituario.ts` escondem o nome do arquivo e o botão
  "Baixar PDF" quando o valor é `false`.
- **Fora deste ticket**: remover de vez o código de PDF, escolher o armazenamento definitivo do arquivo e
  rodar o frontend em produção (a build do Angular continua publicada por um CDN ou pelo servidor de arquivos
  que já existir).

## Capabilities

### New Capabilities

- `backend-runtime`: como o backend da Central de Vitalidade é empacotado, iniciado, exposto pela rede e
  verificado em produção — imagem Docker, Compose com proxy e TLS, healthcheck, variáveis de ambiente e
  aplicação de migrações no boot.

### Modified Capabilities

- `prescription-book`: os requisitos de anexo e de download de PDF passam a ser condicionados à disponibilidade
  do armazenamento de arquivo; com a flag desligada, a receita continua se registrando sem arquivo, o upload é
  recusado sem tocar o disco e o download responde que o recurso está indisponível.

## Impact

- **Specs afetadas**: uma capability nova, `backend-runtime`, e um delta em `prescription-book`. As demais
  specs vigentes (`clinical-notes`, `doctor-panel`, `doctor-patient-links`, `medication-dashboard`) não mudam.
- **Backend novo**: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `backend/.env.example`,
  `backend/src/health/{health.module,health.controller}.ts`, `entrypoint` de migração.
- **Backend alterado**: `backend/src/main.ts` (sem mudança de contrato),
  `backend/src/prescriptions/prescriptions.controller.ts` (guarda da flag nos dois `@Post` com
  `FileInterceptor` e no `GET :id/file`), `backend/src/prescriptions/prescription-file.service.ts` (criação de
  diretório condicionada à flag).
- **Frontend**: `shared/widgets/prescription-form.ts`, `pages/receituario/receituario.ts`,
  `pages/medico/receituario.ts`, o arquivo de ambiente do Angular e um serviço de configuração com signal
  `prescriptionPdfEnabled`.
- **Contrato de API**: **BREAKING** apenas no recorte do PDF — `POST` com anexo passa a `501` e
  `GET /prescriptions/:id/file` passa a `501`. Todo o resto do contrato (`/api/v1`, JWT, roles) é preservado.
- **Banco**: nenhuma migration. `prisma/schema.prisma` fica como está, incluindo `Prescription.fileStoredName`,
  `fileDisplayName`, `fileMimeType` e `fileSize`.
- **Dependências**: nenhuma nova em `package.json`; o runtime passa a depender de Docker e do binário
  `prisma` já presente como devDependency (movido para o estágio de produção da imagem).
