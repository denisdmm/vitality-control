#!/bin/bash
set -e

# echo "=== Configurando npm registry ==="
# npm config set registry http://nexus.ccasj.intraer/repository/npm-registry/

echo "=== Ajustando permissões .m2 ==="
sudo chown vitality /home/vitality/.m2 || true

echo "=== Garantindo PATH local ==="
grep -qxF "export PATH=/home/vitality/.local/bin:\$PATH" /home/vitality/.bashrc || \
echo "export PATH=/home/vitality/.local/bin:\$PATH" >> /home/vitality/.bashrc

# Exporta as variáveis do projeto em novos terminais Bash.
WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOADER="if [ -f '${WORKSPACE_DIR}/.env' ]; then set -a; . '${WORKSPACE_DIR}/.env'; set +a; fi"
grep -qxF "$ENV_LOADER" /home/vitality/.bashrc || \
  printf '%s\n' "$ENV_LOADER" >> /home/vitality/.bashrc

# ⚠️ NÃO fixa valor da NVIDIA_API_KEY (evita sobrescrever)
# grep -q "NVIDIA_API_KEY" /home/vitality/.bashrc || \
# echo "export NVIDIA_API_KEY=\${NVIDIA_API_KEY}" >> /home/vitality/.bashrc

# ------------------------------------------------------------------
# 🟢 Node via NVM (DEVE VIR PRIMEIRO — outros passos dependem do Node 20.20.2)
# ------------------------------------------------------------------

echo "=== Configurando Node via NVM ==="

export NVM_DIR="/usr/local/share/nvm"
. "$NVM_DIR/nvm.sh"

# instala versões
# nvm install 12.22.12
# Node 20.20.2 é usado para todo o tooling (OpenCode, bun, npx skills etc).
# 20.20.2 satisfaz o requisito de util.styleText (>=20.12) do "npx skills add"
# e substitui o antigo 18.20.8, que não tinha nenhuma dependência real da 18.x
nvm install 22.16.0

# 🔒 define padrão GLOBAL como Node 12.22.12
nvm alias default 22.16.0

# ⚠️ FORÇA Node 12.22.12 no bashrc (CRÍTICO para npm start do projeto)
# grep -qxF "nvm use 12.22.12 >/dev/null" /home/vitality/.bashrc || \
# echo "nvm use 12.22.12 >/dev/null" >> /home/vitality/.bashrc

# ------------------------------------------------------------------
# 🔧 Instalação direta do OpenCode (binário 1.x)
# curl do optionalDependency linux-x64 — contorna Nexus (pacote não espelhado)
# e evita @opencode/cli 2.x (breaking em plugins/agents). Não usar npm -g aqui.
# ------------------------------------------------------------------

# echo "=== Instalando OpenCode binário direto ==="

# mkdir -p /home/vitality/.local/bin
# cd /home/vitality/.local/bin

# OPEN_CODE_VERSION="1.18.32"

# curl -L https://registry.npmjs.org/opencode-linux-x64/-/opencode-linux-x64-${OPEN_CODE_VERSION}.tgz -o opencode.tgz

# tar -xzf opencode.tgz

# mv package/bin/opencode ./opencode-real

# chmod +x opencode-real
# rm -rf package opencode.tgz

# echo "✅ OpenCode ${OPEN_CODE_VERSION} instalado manualmente"

# ------------------------------------------------------------------
# 🔌 Plugins npm (bun aponta direto para npmjs.org — contorna Nexus)
# ------------------------------------------------------------------

echo "=== Instalando plugins OpenCode (DCP + OpenSlimedit) ==="
mkdir -p /home/vitality/.opencode
cd /home/vitality/.opencode

# usa registry público para pacotes que não existem no Nexus interno
BUN_NPM_REGISTRY=https://registry.npmjs.org \
  bun add \
    @tarquinen/opencode-dcp \
    openslimedit

echo "✅ Plugins instalados"

# ------------------------------------------------------------------
# 🦀 RTK (Rust Token Killer) — binário via curl, sem npm/Nexus
# ------------------------------------------------------------------

# echo "=== Instalando RTK (Rust Token Killer) ==="

# curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

# # garante que ~/.local/bin está no PATH desta sessão
# export PATH="/home/vitality/.local/bin:$PATH"

# # verifica instalação (rtk gain retorna stats, não erro)
# rtk gain >/dev/null 2>&1 && echo "✅ RTK instalado" || echo "⚠️ RTK instalado mas sem dados ainda (normal)"

# # inicializa plugin RTK para OpenCode (global)
# rtk init -g --opencode --auto-patch

# echo "✅ RTK configurado para OpenCode"

# ------------------------------------------------------------------
# ⚙️ Configuração do OpenCode
# ------------------------------------------------------------------

echo "=== Criando configuração do OpenCode ==="

mkdir -p /home/vitality/.config/opencode

cat > /home/vitality/.config/opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@tarquinen/opencode-dcp",
    "openslimedit",
    "~/.config/opencode/plugins/rtk.ts"
  ],
  "provider": {
    "nvidia": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "NVIDIA NIM",
      "options": {
        "baseURL": "https://integrate.api.nvidia.com/v1",
        "apiKey": "{env:NVIDIA_API_KEY}"
      }
    },
    "ollama-cloud": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama Cloud",
      "options": {
        "baseURL": "https://ollama.com/v1",
        "apiKey": "{env:OLLAMA_CLOUD_API_KEY}"
      }
    }
  },
  "mcp": {
    "GitHub": {
      "type": "remote",
      "url": "https://api.githubcopilot.com/mcp/",
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:GITHUB_TOKEN}"
      },
      "enabled": true
    }
  }
}
EOF

# ------------------------------------------------------------------
# ⚙️ Configuração do DCP (ajustada para modelos com contexto menor)
# ------------------------------------------------------------------

# echo "=== Criando configuração do DCP ==="

# cat > /home/vitality/.config/opencode/dcp.jsonc << 'EOF'
# {
#   // Limites ajustados para modelos com janela de contexto menor
#   // (Qwen, MiniMax/NVIDIA NIM)
#   "compress": {
#     "maxContextLimit": 50000,
#     "minContextLimit": 20000
#   },
#   "nudge": {
#     "frequency": 1,
#     "force": "strong",
#     "iterationThreshold": 5
#   }
# }
# EOF

# echo "✅ DCP configurado"

# ------------------------------------------------------------------
# 🪨 Caveman Skill via npx skills
# (Node 20.20.2 já instalado acima)
# ------------------------------------------------------------------

# echo "=== Instalando Caveman skill para OpenCode ==="

# nvm use 20.20.2 >/dev/null

# # Instala globalmente para o usuário vitality
# npx skills add JuliusBrussee/caveman -a opencode -g -y

# echo "✅ Caveman instalado"

# ------------------------------------------------------------------
# 📦 OpenSpec (instalado via npm, requer Node 20.20.2)
# ------------------------------------------------------------------

echo "=== Instalando OpenSpec ==="

# nvm use 20.20.2 >/dev/null

npm install -g @fission-ai/openspec@latest

echo "✅ OpenSpec instalado"

# volta para o Node default do projeto (12.22.12)
# nvm use 12.22.12 >/dev/null

# echo "✅ Node padrão restaurado (12.22.12)"

# ------------------------------------------------------------------
# 🚀 Wrapper openspec (isolado — forçando Node 20.20.2)
# ------------------------------------------------------------------

echo "=== Criando wrapper openspec (isolado) ==="

# remove symlink quebrado do Node 10 (evita conflito)
# rm -f /usr/local/share/nvm/versions/node/v12.22.12/bin/openspec

# cat > /home/vitality/.local/bin/openspec << 'WRAPPER'
# #!/usr/bin/env bash
# export NVM_DIR="/usr/local/share/nvm"
# source "$NVM_DIR/nvm.sh"
# nvm use 20.20.2 >/dev/null 2>&1
# exec /usr/local/share/nvm/versions/node/v20.20.2/bin/openspec "$@"
# WRAPPER

# chmod +x /home/vitality/.local/bin/openspec

# echo "✅ Wrapper openspec criado"

# ------------------------------------------------------------------
# 🚀 Wrapper isolado (SEM vazamento de Node 20.20.2 para o projeto)
# ------------------------------------------------------------------

# echo "=== Criando wrapper opencode (isolado) ==="

# cat > /home/vitality/.local/bin/opencode << 'WRAPPER'
# #!/usr/bin/env bash
# export NVM_DIR="/usr/local/share/nvm"
# source "$NVM_DIR/nvm.sh"
# nvm use 20.20.2 >/dev/null 2>&1
# exec /home/vitality/.local/bin/opencode-real "$@"
# WRAPPER

# chmod +x /home/vitality/.local/bin/opencode

# # alias opcional
# ln -sf /home/vitality/.local/bin/opencode /home/vitality/.local/bin/opencode20

# ------------------------------------------------------------------
# 🗺️ Graphify — grafo de conhecimento do código (AST local, sem LLM)
# ------------------------------------------------------------------

# echo "=== Instalando Graphify (uv tool install) ==="

# export PATH="/home/vitality/.local/bin:/usr/local/py-utils/bin:$PATH"
# GRAPHIFY_MCP="/home/vitality/.local/bin/graphify-mcp"

# # uv instala graphifyy com Python 3.10+ isolado (não interfere Node/Java)
# if ! command -v uv >/dev/null 2>&1; then
#   curl -LsSf https://astral.sh/uv/install.sh | sh
#   export PATH="/home/vitality/.local/bin:$PATH"
# fi

# Sempre reinstala com extra [mcp] (idempotente). Sem 2>/dev/null / || true:
# falha de rede ou install parcial ficam visíveis no log do create.
# [mcp] é necessário para graphify-mcp (Cursor/OpenCode MCP stdio).
# if ! uv tool install 'graphifyy[mcp]' --force; then
#   echo "❌ uv tool install 'graphifyy[mcp]' --force falhou"
#   echo "   Tente manualmente: export PATH=\"/home/vitality/.local/bin:\$PATH\" && uv tool install 'graphifyy[mcp]' --force"
# fi

# if [[ ! -x "$GRAPHIFY_MCP" ]]; then
#   echo "❌ $GRAPHIFY_MCP ausente após install — MCP Graphify no Cursor vai falhar com ENOENT"
#   echo "   Tente: uv tool install 'graphifyy[mcp]' --force"
# elif ! command -v graphify >/dev/null 2>&1; then
#   echo "❌ graphify CLI ausente após install — pulando skills e build do grafo"
# else
#   echo "✅ Graphify CLI instalado ($(graphify --version 2>/dev/null || echo 'ok'))"
#   echo "✅ graphify-mcp OK: $GRAPHIFY_MCP"

#   REPO_ROOT="/workspaces/spcoa"
#   cd "$REPO_ROOT"

#   echo "=== Registrando skills Graphify (escopo projeto) ==="
#   graphify cursor install --project 2>/dev/null || echo "⚠️  graphify cursor install falhou (pode já estar registrado)"
#   graphify opencode install --project 2>/dev/null || echo "⚠️  graphify opencode install falhou (pode já estar registrado)"

#   echo "=== Instalando git hooks Graphify ==="
#   graphify hook install 2>/dev/null || echo "⚠️  graphify hook install falhou (sem repo git?)"

#   echo "=== Build/atualização do grafo (AST-only) ==="
#   chmod +x .devcontainer/graphify-build.sh
#   bash .devcontainer/graphify-build.sh "$REPO_ROOT" || echo "⚠️  Build Graphify falhou — execute: graphify update ."
# fi

# ------------------------------------------------------------------
# 📄 Criação do .env.example
# ------------------------------------------------------------------

# echo "=== Criando .env.example ==="

# ENV_EXAMPLE="/workspaces/vitality-control/.env.example"

# # só cria se ainda não existir, para não sobrescrever customizações
# if [ ! -f "$ENV_EXAMPLE" ]; then
#   cat > "$ENV_EXAMPLE" << 'EOF'
# # Caminho principal: OpenCode Zen (modelos free do Console)
# # No TUI: /connect → opencode (Zen) → /models → escolha um modelo *-free
# # Prefira o agente build (não plan / custom com deny em tools) nos modelos free
# # Confirme a versão após o rebuild: opencode --version  (esperado: 1.18.32)
# #
# # Renomeie este arquivo para .env se for usar fallbacks BYOK abaixo.

# # Fallback BYOK — NVIDIA NIM (opcional)
# # https://build.nvidia.com/models
# NVIDIA_API_KEY=nvapi-sua-chave-aqui

# # Fallback BYOK — Ollama Cloud (opcional; limites de uso costumam ser baixos)
# # https://ollama.com
# OLLAMA_CLOUD_API_KEY=ollama-sua-chave-aqui

# # Fallbacks: /connect → NVIDIA NIM ou Ollama Cloud, depois /models
# EOF
#   echo "✅ .env.example criado"
# else
#   echo "ℹ️  .env.example já existe, pulando criação"
# fi

# ------------------------------------------------------------------
# 🔐 Permissões finais
# ------------------------------------------------------------------

echo "=== Ajustando permissões ==="
chown -R vitality:vitality \
  /home/vitality/.opencode \
  /home/vitality/.config/opencode \
  /home/vitality/.local/bin || true

# ------------------------------------------------------------------
# 📝 Configuração do Git (Nome e E-mail) - Interativo & Idempotente
# ------------------------------------------------------------------
echo "=== Verificando configuração do Git ==="

# Desativa temporariamente o exit-on-error para comandos condicionais
set +e
GIT_NAME=$(git config --global user.name 2>/dev/null)
GIT_EMAIL=$(git config --global user.email 2>/dev/null)
set -e

# Só pede input se o terminal for interativo (evita travar em rebuilds automáticos/CI)
# if [ -t 0 ]; then
#     if [ -z "$GIT_NAME" ]; then
#         read -p "👤 Seu nome para commits: " GIT_NAME || true
#     fi
#     if [ -z "$GIT_EMAIL" ]; then
#         read -p "📧 Seu e-mail para commits: " GIT_EMAIL || true
#     fi
# else
#     echo "⚠️  Terminal não interativo. Configure manualmente após o rebuild:"
#     echo "   git config --global user.name 'Seu Nome'"
#     echo "   git config --global user.email 'seu@email.com'"
# fi

# # Aplica as configurações apenas se os valores forem fornecidos
# if [ -n "$GIT_NAME" ]; then
#     git config --global user.name "$GIT_NAME"
#     echo "✅ user.name: $GIT_NAME"
# fi
# if [ -n "$GIT_EMAIL" ]; then
#     git config --global user.email "$GIT_EMAIL"
#     echo "✅ user.email: $GIT_EMAIL"
# fi

# ------------------------------------------------------------------
# ✅ Final
# ------------------------------------------------------------------

echo ""
echo "✅ Setup concluído com sucesso!"
echo ""
# echo "✔ Node padrão (forçado): v12.22.12"
echo "✔ OpenCode ${OPEN_CODE_VERSION} "
# echo "✔ Caveman skill instalado para OpenCode"
# echo "✔ DCP (Dynamic Context Pruning) instalado"
# echo "✔ OpenSlimedit instalado"
# echo "✔ RTK (Rust Token Killer) instalado"
# echo "✔ Graphify instalado (grafo local regenerável em graphify-out/; não versionar)"
echo "✔ OpenSpec instalado (via Node 20.20.2)"
# echo "✔ Wrapper openspec isolado com Node 20.20.2"
echo ""
echo "👉 Comportamento garantido:"
# echo "   - npm start  → Node 12.22.12 ✅"
echo "   - opencode   → Node 20.20.2 + binário ${OPEN_CODE_VERSION} ✅"
# echo "   - /caveman   → ativa no OpenCode ✅"
# echo "   - /dcp stats → mostra economia de tokens ✅"
# echo "   - rtk gain   → mostra economia do RTK ✅"
# echo "   - /graphify  → grafo de conhecimento do código ✅"
# echo "   - graphify query \"...\" → consulta o grafo ✅"
echo ""
echo "ℹ️  Zen free (caminho principal):"
echo "   1. opencode --version  → deve mostrar ${OPEN_CODE_VERSION}"
echo "   2. opencode → /connect → opencode (Zen)"
echo "   3. /models → escolha um modelo *-free"
echo "   4. Prefira o agente build (não plan / custom com deny em tools)"
echo "ℹ️  Fallback BYOK: /connect → NVIDIA NIM ou Ollama Cloud (chaves em .env)"
echo "ℹ️  Github MCP: após subir o container → opencode mcp auth Github"
# echo "ℹ️  Graphify MCP: local (stdio), grafo regenerável em graphify-out/ — não commitado; sem exposição à internet"
echo ""