# Design

## Context

Estado atual que condiciona a abordagem (motivação em `proposal.md`):

- O backend é executado só por `npm run start:dev -w backend` (Nest em watch, porta 5000). Não existe
  `Dockerfile`, `docker-compose.yml` nem `.dockerignore` no repositório; `.github/workflows/` contém apenas
  `opencode.yml`. O banco é PostgreSQL 16 no Neon, acessado por `DATABASE_URL` — em desenvolvimento através de
  `backend/tunnel.js`, que expõe o Neon em `127.0.0.1:5433`. Não há container de banco em lugar nenhum, e o
  design mantém isso.
- `backend/src/main.ts` aplica o prefixo global `/api/v1` e monta o Swagger em `/api`. `PrismaService` estende
  `PrismaClient` e é injetado via `PrismaModule`. Os guards (`AuthGuard('jwt')`, `RolesGuard`) são aplicados por
  controller, não globalmente — o que torna possível expor o healthcheck público sem affects guard.
- O upload de PDF usa `multer` com `diskStorage` em `recipesDiskStorage()` (nome `${randomUUID()}.pdf`), ligado
  em `PDF_UPLOAD` no controller (`prescriptions.controller.ts`), e `PrescriptionFileService.onModuleInit` chama
  `ensureDir()` para criar `uploads/receitas` na subida. `backend/uploads/receitas` existe no repositório e
  está vazio.
- Restrição do projeto: não há suíte de testes nem lint no backend e no frontend (AGENTS.md). A validação
  disponível é `npm run build -w backend`, `npm run build -w frontend` e verificação manual via
  `http://localhost:5000/api` (Swagger).

## Goals / Non-Goals

**Goals:**

- Um único conjunto de arquivos versionados (`Dockerfile`, `.dockerignore`, `docker-compose.yml`) que reproduz
  o ambiente de produção em uma VPS Linux e também roda em máquina de desenvolvimento.
- A API exposta por proxy com TLS e healthcheck, sem porta aberta no host para o processo Node.
- Schema do banco aplicado no boot da imagem, sem depender de passo manual de deploy.
- Desligar o salvamento de PDF em disco com um interruptor único, preservando o código existente para o
  ticket futuro.

**Non-Goals:**

- Escolher o armazenamento definitivo do PDF (object storage, volume persistente ou banco): este design apenas
  garante que nada seja gravado enquanto não houver decisão.
- Publicar o frontend: a imagem do backend serve apenas `/api/v1` e `/api` (Swagger). O `dist/` do Angular
  continua sendo servido por fora.
- Migração de dados legada do Firestore e qualquer mudança em `prisma/schema.prisma`.
- CI/CD, observabilidade (logs centralizados, métricas, tracing) e política de backup.

## Decisions

### 1. Imagem única multi-stage, sem serviço de build separado

`Dockerfile` na raiz do `backend/`, em dois estágios: o de build executa `npm ci`, `prisma generate` e `nest
build`; o de produção copia `dist/`, `prisma/` e `node_modules` das dependências de produção, define
`NODE_ENV=production`, cria um usuário sem privilégios e roda `node dist/main` com `CMD` em forma exec (para que
o SIGTERM chegue ao Node e o container pare em tempo razoável).

*Alternativa*: imagem única instalando tudo. Descartada — aumenta o tamanho, traz compilador e fontes para
produção e deixa o build lento a cada camada invalidada.

*Detalhe*: `prisma` está hoje em `devDependencies` e o schema precisa ser empacotado porque o entrypoint roda
`prisma migrate deploy`. A alternativa seria baixar o engine via `prisma generate` em runtime, o que exige
internet do container no start; empacotar o binário é mais previsível.

### 2. Compose com dois serviços: `api` e `proxy`

O serviço `api` não publica porta no host (`expose` apenas), define `HEALTHCHECK` contra o healthcheck da API e
`restart: unless-stopped`. O serviço `proxy` (Caddy) é o único com portas `80`/`443` publicadas e usa o
`api` como upstream, com TLS automático para o domínio configurado por variável.

*Alternativa*: Nginx. Caddy foi escolhido por obter certificado Let's Encrypt e redirecionar HTTP→HTTPS sem
configuração manual; Nginx exigiria certificado emitido por passo extra ou `certbot` com timer. O custo é uma
dependência nova na máquina, o que é aceitável na VPS.

*Alternativa*: proxy do sistema host em vez de container. Descartada — exige configuração fora do repositório e
não é reproduzível em outra máquina.

### 3. Healthcheck público que consulta o banco

Novo módulo `backend/src/health/` com `HealthController` exposto em `/health` (resultando em
`GET /api/v1/health`). Não recebe `AuthGuard` nem `RolesGuard`. Faz `SELECT 1` via `PrismaService` com timeout
curto e devolve `200 { status: 'ok', database: 'up' }` ou `503 { status: 'degraded', database: 'down' }` com
mensagem genérica — sem ecoar a mensagem do Prisma, que carrega trecho da `DATABASE_URL`.

O healthcheck do Compose usa `wget`/`node -e` já presente na imagem, sem instalar `curl`. O proxy usa o mesmo
endpoint como verificação de upstream.

*Alternativa*: endpoint `/health` sem tocar o banco (só "processo vivo"). Descartada — não detecta o modo de
falha mais provável na prática (Neon acessível ou não, credencial expirada, tunnel perdido), que é exatamente o
que o healthcheck deve pegar.

### 4. Migrações no boot, com falha abortando a subida

O `ENTRYPOINT` da imagem é um script que roda `prisma migrate deploy` e só executa `node dist/main` com código
de saída zero. Se a migração falhar, o processo termina e o `restart: unless-stopped` do Compose devolve o
container ao estado `unhealthy`/`Exited`, visível em `docker compose ps` e no log — melhor do que subir a API
com schema desatualizado.

*Alternativa*: passo manual `npm run prisma:deploy` no deploy. Descartada — foi justamente a dependência de
ação manual que esta change elimina.

### 5. `CORS_ORIGIN` obrigatório e `backend/.env.example`

`main.ts` passa a exigir `CORS_ORIGIN` (lista separada por vírgula, convertida em allowlist) quando
`NODE_ENV=production`, falhando no boot sem ela; em desenvolvimento o padrão atual (`http://localhost:4300`)
permanece. `backend/.env.example` documenta `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`,
`CORS_ORIGIN` e `PRESCRIPTION_PDF_ENABLED`, com valores de exemplo e sem segredo real.

*Alternativa*: manter `CORS_ORIGIN` opcional. Descartada — em produção a ausência silenciosamente deixaria o
proxy e a API sem origem permitida, com falha de CORS só perceptível no navegador.

### 6. Feature flag `PRESCRIPTION_PDF_ENABLED` (default `false`)

Uma função única de leitura da flag, no módulo de prescrições, decide a disponibilidade do anexo. Com a flag
ausente ou `false`:

- `POST /prescriptions` e `POST /prescriptions/:patientId/prescriptions`: quando há arquivo, a requisição é
  recusada com `501 Not Implemented` e mensagem de recurso indisponível, e **nada** é gravado — nem receita,
  nem arquivo parcial. Sem arquivo, a receita é criada normalmente (comportamento já existente e coberto por
  spec).
- `GET /prescriptions/:id/file`: `501` antes de qualquer acesso ao disco e antes da checagem de posse, para não
  vazar nem exigir consulta ao banco por um recurso ausente.
- `PrescriptionFileService.onModuleInit` deixa de criar `uploads/receitas`; `ensureDir()` só roda quando a
  flag está ligada. `backend/uploads/receitas` vazio segue no repositório para não bagunçar o `.gitignore`.

**Ponto crítico de implementação**: o `FileInterceptor` com `diskStorage` grava o arquivo *antes* do handler
ser executado. Portanto a guarda de 501 precisa acontecer antes do `multer` — subindo o `PDF_UPLOAD` como
interceptor condicional (`UseInterceptors` com array montado por um helper que devolve o interceptor apenas
quando a flag está ligada), em vez de checar a flag dentro do método. Sem isso, um upload com a flag desligada
deixaria arquivo órfão em disco e a receita seria criada sem registro do anexo, que é justamente o estado que
se quer evitar.

Com a flag ligada, nada muda: filtro de PDF, limite de 10 MB, nome opaco, `CleanUploadOnErrorInterceptor`,
colunas `file*` no Prisma e os requisitos vigentes de `prescription-book` passam a valer como estão.

*Alternativas*: remover o código do PDF agora e reintroduzir no ticket futuro. Descartada — churn grande e
perde o filtro/limite/nome opaco já prontos. Manter o upload ativo em ambiente local e desligar só em produção.
Descartada — cria divergência entre ambientes, que é a causa raiz do problema.

### 7. Frontend lê a flag por valor de ambiente de build

Novo valor `prescriptionPdfEnabled` no arquivo de ambiente do Angular, exposto como signal em um serviço leve
(`core/app-config.ts` ou similar), consumido por `shared/widgets/prescription-form.ts` (esconde o bloco de
upload) e por `pages/receituario/receituario.ts` e `pages/medico/receituario.ts` (escondem o nome do arquivo e
o botão de download).

*Alternativa*: endpoint público de configuração na API, lido no boot do front. Descartada — adiciona superfície
pública e contrato novo (com cache, CORS, etc.) para um interruptor que muda em ritmo de ticket, não de dia.
Custo aceito: alternar a flag exige rebuild do SPA.

### 8. Geração de PDF no cliente permanece intocada

`jspdf`/`html2canvas` em `pages/relatorios`, `pages/pressao-arterial` e `pages/medico/pressao-arterial`
geram PDF no navegador a partir de dados da API e não dependem de arquivo em disco. A flag não as afeta; só o
upload/download de arquivo da receita é desligado.

## Risks / Trade-offs

- **[Requisito do `prisma` em produção]** → mover `prisma` de `devDependencies` para `dependencies` no
  `backend/package.json` (ou duplicar no estágio de produção da imagem); validar com `node dist/main` subindo em
  container local e `docker compose exec api prisma migrate status`.
- **[`CORS_ORIGIN` obrigatório quebra um ambiente existente]** → o `.env.example` e a mensagem de boot cita o nome da variável; o padrão de desenvolvimento permanece, então `npm run start:dev` não muda.
- **[`prisma migrate deploy` no boot com múltiplas réplicas]** → em VPS com um único `api` não há corrida;
  registrar em non-goals que, ao escalar horizontalmente, a migração deve sair do entrypoint.
- **[TLS do Caddy exige dominio com DNS apontando para a VPS e portas 80/443 abertas]** → documentar no
  `docker-compose.yml` como comentario e no `.env.example` (`PROXY_DOMAIN`); para uso local sem dominio,
  documentar o acesso via proxy em `http://localhost`.
- **[Healthcheck com `SELECT 1` adiciona uma query por chamada]** → manter intervalo de 30 s e timeout de 5 s;
  o custo é desprezível frente ao ganho de detectar banco inacessível.
- **[Toggle da flag exige dois deploys (API e SPA)]** → documentado como trade-off aceito; ordem sugerida:
  subir API com a flag desligada primeiro, depois rebuild do SPA.
- **[Mudança de contrato (501) quebra cliente antigo]** → é o comportamento desejado e explícito; o `501`
  com mensagem de recurso indisponível é distinguível de erro de validação para o cliente tratar.

## Migration Plan

1. Merge dos arquivos de runtime e do módulo de health, ambos inertes para o fluxo atual (`Dockerfile`,
   `.dockerignore`, `docker-compose.yml`, `backend/.env.example`, `backend/src/health/`).
2. Publicar a API com `PRESCRIPTION_PDF_ENABLED=false` e `CORS_ORIGIN` apontando para o domínio do proxy;
   confirmar `GET /api/v1/health` em `200` pelo domínio com TLS válido.
3. Rebuild do frontend com `prescriptionPdfEnabled = false` e publicar o `dist/`.
4. Verificar que uma receita **sem** anexo continua sendo registrada e que uma receita **com** anexo recebe
   `501`, sem arquivo criado em `uploads/receitas`.
5. Em outro ambiente (ou depois do ticket do armazenamento), ligar `PRESCRIPTION_PDF_ENABLED=true`, rebuild do
   SPA e revalidar upload/download.

**Rollback**: reverter o container para a imagem anterior e recolocar `PRESCRIPTION_PDF_ENABLED=true` com
rebuild do SPA. O banco não é afetado em nenhum passo (nenhuma migration), e receitas já gravadas permanecem
válidas porque as colunas `file*` continuam no schema.

## Open Questions

- Nome final do dominio e do e-mail de ACME para o certificado do proxy — nao afeta nenhuma spec; e valor
  de ambiente preenchido no deploy.
- Onde o `dist/` do frontend será servido em produção (servidor de arquivos, CDN ou container separado) —
  decisão do ticket de frontend, não desta change.
- Quais URLs de Allowed Origins do CORS além do domínio do proxy (ex.: ambiente de homologação) — lista em
  `CORS_ORIGIN`, ajustável por ambiente.
