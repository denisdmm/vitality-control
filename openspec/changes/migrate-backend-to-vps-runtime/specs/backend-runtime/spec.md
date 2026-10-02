# Spec Delta

## Purpose

Descreve como o backend da Central de Vitalidade é empacotado, iniciado, exposto pela rede e verificado
quando roda fora da máquina de desenvolvimento, de forma que a disponibilidade da API e a consistência do banco
não dependam de ação manual de quem administra o servidor.

## ADDED Requirements

### Requirement: Imagem de produção do backend

O sistema SHALL fornecer uma imagem de container que execute a API já compilada a partir do código-fonte do
backend, sem depender de instalação de dependências de desenvolvimento em tempo de execução, e o processo
principal da imagem SHALL rodar com usuário sem privilégios de administrador.

#### Scenario: Build da imagem a partir do código-fonte

- **WHEN** a imagem é construída a partir do código do backend
- **THEN** a imagem contém o artefato compilado da API e apenas as dependências necessárias para executá-la
- **AND** não contém fontes, testes, arquivos de ambiente local nem o conteúdo de qualquer pasta de uploads

#### Scenario: Início do processo principal

- **WHEN** o container é iniciado
- **THEN** a API sobe escutando na porta interna 5000 sob o prefixo `/api/v1`
- **AND** o processo roda com usuário sem privilégios de administrador

#### Scenario: Encerramento do container

- **WHEN** o container recebe pedido de encerramento
- **THEN** o processo principal encerra em tempo razoável após o encerramento das conexões em andamento

### Requirement: Composição da API com proxy reverso

O sistema SHALL fornecer uma composição de containers que execute a API e um proxy reverso, em que a API
NÃO seja exposta publicamente e todo acesso externo passe pelo proxy, e o proxy SHALL responder no domínio
indicado na configuração.

#### Scenario: Subida da composição

- **WHEN** a composição é iniciada em uma máquina Linux
- **THEN** a API e o proxy passam a rodar, e o proxy encaminha as requisições da API para o serviço interno

#### Scenario: Acesso externo ao banco

- **WHEN** a API é inicializada pela composição
- **THEN** ela obtém a conexão do banco exclusivamente pela configuração de ambiente, sem container de banco
  local

#### Scenario: HTTPS no domínio indicado

- **WHEN** o proxy atende no domínio configurado
- **THEN** o acesso é servido com TLS válido para esse domínio
- **AND** a API não aceita conexão direta vinda de fora da máquina, fora do proxy

### Requirement: Verificação pública de saúde da API

O sistema SHALL expor, sob o prefixo global da API, um recurso público de verificação de saúde que não exige
autenticação, que informa o estado da API e do banco de dados, e que responde como indisponível quando o banco
não responde, sem vazar detalhes internos da falha.

#### Scenario: API e banco disponíveis

- **WHEN** a verificação de saúde é solicitada sem credencial e o banco responde
- **THEN** a resposta indica que a API e o banco estão disponíveis

#### Scenario: Banco indisponível

- **WHEN** a verificação de saúde é solicitada e o banco não responde
- **THEN** a resposta indica que a API não está disponível para uso
- **AND** não expõe mensagens de erro do banco nem detalhes de conexão

#### Scenario: Uso da verificação por terceiros

- **WHEN** o proxy ou o orquestrador de containers consulta a verificação de saúde da API
- **THEN** a resposta permite distinguir, pelo status devolvido, se a API está apta a receber tráfego

### Requirement: Migrações aplicadas na inicialização

O sistema SHALL aplicar as migrações de banco pendentes antes de a API passar a aceitar tráfego, e a API
SHALL NOT iniciar quando a aplicação das migrações falha.

#### Scenario: Migrações pendentes na subida

- **WHEN** a API é inicializada e existem migrações ainda não aplicadas
- **THEN** as migrações são aplicadas antes de a API aceitar requisições

#### Scenario: Falha ao aplicar migração

- **WHEN** a aplicação de uma migração falha na inicialização
- **THEN** a API não sobe e o erro é reportado no log de inicialização

### Requirement: Configuração da API por ambiente

O sistema SHALL obter sua configuração do ambiente de execução, incluindo conexão de banco, segredo e validade
do token de autenticação, origem permitida para o navegador e porta, e a origem permitida para o navegador
SHALL ser obrigatória em produção.

#### Scenario: Arranque sem origem permitida para o navegador

- **WHEN** a API é inicializada em produção sem a origem permitida para o navegador configurada
- **THEN** a inicialização falha, informando que a configuração é obrigatória

#### Scenario: Origem não permitida é recusada pelo CORS

- **WHEN** o navegador envia uma requisição de origem diferente da configurada
- **THEN** a resposta não concede acesso à origem não configurada

#### Scenario: Configuração documentada

- **WHEN** se procura a configuração da API no repositório
- **THEN** há um arquivo de exemplo listando as variáveis obrigatórias, sem valores reais de segredo

### Requirement: Não acoplamento de funcionalidades ao disco do container

O sistema SHALL manter os funcionalidades que dependem de armazenamento local inacessíveis enquanto não houver
armazenamento adequado configurado, sem criar diretórios de arquivo na imagem do container.

#### Scenario: Funcionalidade de arquivo sem armazenamento configurado

- **WHEN** a API sobe em container sem armazenamento de arquivo configurado
- **THEN** a funcionalidade que depende desse armazenamento é declarada indisponível
- **AND** nenhum diretório de arquivos é criado pelo processo

#### Scenario: Funcionalidade de arquivo com armazenamento configurado

- **WHEN** a API sobe com o armazenamento de arquivo habilitado
- **THEN** a funcionalidade passa a ser aceita e o diretório de arquivos é preparado
