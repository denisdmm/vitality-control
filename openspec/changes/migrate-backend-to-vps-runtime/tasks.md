# Tasks

## 1. Healthcheck público da API

- [ ] 1.1 Criar `backend/src/health/health.module.ts` e `health.controller.ts` com `GET /health` sem `AuthGuard`/`RolesGuard`, consultando `PrismaService` com `SELECT 1` e timeout curto, devolvendo `200` com estado do banco ou `503` com mensagem genérica (sem ecoar erro do Prisma), e registrar o módulo em `AppModule`
- [ ] 1.2 Validar com `npm run build -w backend` e `npm run start:dev -w backend` seguido de `curl -i http://localhost:5000/api/v1/health`, conferindo `200` com o banco no ar
- [ ] 1.3 Validar o caminho `503` apontando `DATABASE_URL` para uma porta sem serviço e repetindo o `curl`, conferindo ausência da mensagem de conexão na resposta
- [ ] 1.4 Documentar o novo recurso em `backend/src/health/health.controller.ts` com decorators `Swagger` (`@ApiOperation`, `@ApiResponse` 200/503) e conferir que ele aparece em `http://localhost:5000/api`

## 2. Imagem de produção do backend

- [ ] 2.1 Mover `prisma` para `dependencies` do `backend/package.json` (o entrypoint precisa do binário em runtime) e rodar `npm install -w backend`, conferindo que `node_modules/.bin/prisma` continua resolvível
- [ ] 2.2 Criar `backend/Dockerfile` multi-stage sobre Node 22: estágio de build com `npm ci`, `npm run prisma:generate` e `npm run build`; estágio de produção copiando `dist/`, `prisma/` e `node_modules` de produção, com `NODE_ENV=production`, usuário sem privilégios e `CMD` em forma exec para `node dist/main`
- [ ] 2.3 Criar `backend/.dockerignore` cobrindo `node_modules`, `dist`, `uploads`, `.env` e arquivos de teste, e validar com `docker build -t vitality-api backend -f backend/Dockerfile` seguido de `docker run --rm vitality-api node -e "console.log('ok')"`
- [ ] 2.4 Validar o processo real com `docker run --rm -e DATABASE_URL=... -e JWT_SECRET=... -p 5000:5000 vitality-api` e `curl -i http://localhost:5000/api/v1/health`, conferindo `200` e usuário de execução sem privilégios

## 3. Composição com proxy reverso

- [ ] 3.1 Criar `docker-compose.yml` com os serviços `api` (sem porta publicada no host, `HEALTHCHECK` contra `/api/v1/health`, `restart: unless-stopped`) e `proxy` (Caddy, portas 80/443, `api` como upstream, domínio por variável), sem container de banco
- [ ] 3.2 Validar a sintaxe com `docker compose config` e a subida com `docker compose up -d`, conferindo em `docker compose ps` que o `api` fica `healthy` e que a porta 5000 do host permanece fechada
- [ ] 3.3 Validar o encaminhamento com `curl -i http://localhost/api/v1/health` pelo proxy (e com HTTPS quando o domínio apontar para a VPS), conferindo que a resposta vem da API
- [ ] 3.4 Comentar no `docker-compose.yml` os pré-requisitos de deploy (DNS do domínio apontando para a VPS e portas 80/443 liberadas) e registrar o comando de deploy/rollback no arquivo

## 4. Migrações e configuração no boot

- [ ] 4.1 Criar o entrypoint da imagem executando `prisma migrate deploy` e só então `node dist/main`, propagando o código de saída quando a migração falha, e usá-lo como `ENTRYPOINT` no `Dockerfile`
- [ ] 4.2 Tornar `CORS_ORIGIN` obrigatório em produção em `backend/src/main.ts` (lista separada por vírgula, allowlist, boot falhando sem ela), mantendo o padrão de desenvolvimento
- [ ] 4.3 Criar `backend/.env.example` com `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CORS_ORIGIN`, `PRESCRIPTION_PDF_ENABLED` e valores de exemplo, sem segredo real, e conferir que `backend/.env` continua fora do versionamento
- [ ] 4.4 Validar a configuração com `npm run build -w backend`, com `npm run start:dev -w backend` sem `CORS_ORIGIN` (deve subir normalmente) e com `NODE_ENV=production` sem a variável (deve falhar citando o nome da variável)
- [ ] 4.5 Validar o entrypoint com `docker compose run --rm api sh -lc "prisma migrate deploy --help"` e com o serviço já em execução, conferindo que o schema do banco fica em dia

## 5. Feature flag do PDF no backend

- [ ] 5.1 Criar a leitura de `PRESCRIPTION_PDF_ENABLED` (default `false`) em um único ponto do módulo `prescriptions`, com comparação explícita de valor verdadeiro
- [ ] 5.2 Em `prescriptions.controller.ts`, montar o `FileInterceptor('file', PDF_UPLOAD)` + `CleanUploadOnErrorInterceptor` de forma condicional à flag, mantendo o `FileInterceptor` fora do `UseInterceptors` estático para que o `multer` não grave nada com a flag apagada
- [ ] 5.3 Adicionar guarda `501` com mensagem de recurso indisponível nos dois `@Post` que recebem arquivo quando há anexo com a flag apagada, garantindo que nenhuma receita, medicamento ou arquivo (nem parcial) seja criado
- [ ] 5.4 Adicionar guarda `501` no `GET :id/file` antes de qualquer acesso a disco ou consulta de posse, e condicionar `ensureDir()` em `PrescriptionFileService.onModuleInit` à flag ligada
- [ ] 5.5 Validar com `npm run start:dev -w backend` e `curl` no Swagger: receita sem anexo cria normalmente; receita com anexo retorna `501`; `GET :id/file` retorna `501`; e `ls backend/uploads/receitas` confirma que nenhum arquivo foi criado
- [ ] 5.6 Reativar `PRESCRIPTION_PDF_ENABLED=true` e revalidar o caminho completo (upload de PDF válido, nome opaco no disco, download autorizado), confirmando que o comportamento anterior está preservado

## 6. UI coerente com a flag

- [ ] 6.1 Adicionar `prescriptionPdfEnabled` ao arquivo de ambiente do Angular e expor a leitura como signal em um serviço de configuração em `frontend/src/app/core/`
- [ ] 6.2 Em `shared/widgets/prescription-form.ts`, ocultar o bloco de upload de PDF e ajustar o texto do modal quando o signal for `false`, mantendo o restante do formulário intacto
- [ ] 6.3 Em `pages/receituario/receituario.ts` e `pages/medico/receituario.ts`, ocultar o nome do arquivo e a ação de download quando o signal for `false`, mantendo a listagem de receitas e medicamentos
- [ ] 6.4 Validar com `npm run build -w frontend` e, com o dev server e a API com a flag apagada, conferir que o formulário de receita não mostra campo de anexo e que o receituário do paciente e do médico não mostra download de PDF

## 7. Verificação de integração

- [ ] 7.1 Subir `docker compose up -d` com `PRESCRIPTION_PDF_ENABLED=false` e conferir, pelo domínio do proxy, que `GET /api/v1/health` responde `200`, o Swagger abre em `/api`, o login funciona e uma receita sem anexo é registrada
- [ ] 7.2 Com a mesma stack, confirmar que uma receita com anexo e o download de PDF respondem `501` e que `docker compose exec api ls uploads/receitas` não mostra arquivos
- [ ] 7.3 Rodar `npm run build` na raiz (backend + frontend) e revisar `git status` confirmando que nenhum `.env`, `node_modules`, `dist` ou upload entrou no diff
