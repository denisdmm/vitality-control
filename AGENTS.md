# Guia do agente — Vitality Control

## Sobre o projeto

VitalityControl (Sistema de Controle e Acompanhamento da Saúde).

- Backend:
- Frontend:
- Persistência: PostgreSQL (prod)
- Auth:
-

O contexto completo do projeto está em `openspec/config.yaml` (fonte da verdade). Este arquivo é um resumo.

## Regras permanentes

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
- Preserve o padrao existente do JHipster, Angular e Spring.
- Nao refatore arquivos fora do escopo pedido.
- Nao reverta alteracoes existentes do usuario.
- Prefira nomes claros a comentarios longos.
- Use ASCII salvo quando o arquivo ja usar acentos ou houver motivo claro.

## Testes e validacao

- Rode o menor teste relevante para a mudanca.
- Para backend, prefira testes especificos com Maven antes de suites completas.
- Para frontend, prefira teste/lint especifico quando possivel.
- Se nao rodar testes, informe isso e o motivo.
- Evite builds completos se uma validacao menor der confianca suficiente.

## Comandos uteis

- Buscar arquivos: `rg --files`
- Buscar texto: `rg "texto"`
- Ler trecho: `sed -n '1,160p' caminho/arquivo`
- Maven wrapper: `./mvnw`
- npm wrapper: `./npmw`

## Ao responder

- Responda em portugues.
- Comece pelo resultado.
- Cite caminhos de arquivos alterados.
- Inclua comandos executados somente quando

## Convenções de arquitetura

## Convenções de teste

Detalhamento completo no bloco `Testing` de `openspec/config.yaml`.

## Comandos de desenvolvimento

## Workflow OpenSpec

-

## Projeto GitLab

## Templates de Issue

## Labels do Time

Tipo — exatamente um por issue:

Estado no board — toda issue nova nasce em `Backlog`:

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
