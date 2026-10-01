<!-- Exemplo preenchido: docs/exemplos-issues/tech_debt_exemplo.md -->

## Contexto

<!-- Qual parte do código, módulo ou camada está com o problema técnico?
     Uma ou duas frases situando quem lê. Não precisa ser linguagem de negócio. -->

## Qual é o problema hoje?

<!-- Descreva o que está ruim: código duplicado, ausência de testes, acoplamento,
     performance, dependência desatualizada, violação de padrão do time, etc. -->

## Por que isso precisa ser resolvido?

<!-- Qual é o impacto real se não for tratado?
     Ex: dificulta manutenção, causa lentidão, gera risco de bug, bloqueia evolução. -->

## O que deve ser feito?

<!-- Descreva a solução esperada em termos técnicos.
     Seja específico: refatorar X para usar Y, extrair Z para classe própria, etc. -->

## Como validar que está resolvido?

<!-- Qual é o critério técnico de conclusão?
     Ex: cobertura de testes atingida, tempo de resposta abaixo de X ms, zero duplicação no SonarQube. -->

-

## Dependências

<!-- Este ticket depende de outro ou bloqueia algum? Se não houver, apague esta seção. -->

- Depende de: #
- Bloqueia: #

## Fora do escopo

<!-- O que explicitamente NÃO deve ser refatorado neste ticket.
     Evita que a IA saia refatorando o módulo inteiro. -->

-

---

## Classificação

<!-- Preencha antes de salvar. Isso mantém a issue visível no board. -->

**Tipo:**
/label ~"Tech Debt"

**Sprint** — selecione o milestone e o label `Sprint NN` no painel lateral após criar a issue

**Estado inicial** — não alterar, toda issue nasce aqui:
/label ~Backlog
