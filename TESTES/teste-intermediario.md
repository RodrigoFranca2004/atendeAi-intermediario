# Teste técnico — Nível Intermediário

## Contexto (fictício)

O protótipo aprovado pela área de produto identificou um problema sério no que já existe: hoje, a function `listAtendimentos` (em `functions/src/index.ts`) recebe o `tenantId` diretamente do que o próprio cliente (front-end) envia, sem checar se quem está chamando realmente pertence àquele tenant. Ou seja, hoje é possível um usuário do Tenant A pedir dados do Tenant B só trocando um valor na chamada — isso é exatamente o tipo de falha de isolamento multi-tenant que não pode existir em produção, ainda mais lidando com dados sensíveis de clientes diferentes. Seu trabalho é corrigir esse problema de raiz e entregar uma funcionalidade nova sobre essa base corrigida.

Você pode (e deve) usar ferramentas de IA generativa (Claude Code ou similar). O que estamos avaliando é sua capacidade de identificar um problema real de arquitetura, tomar decisões técnicas sólidas e usar IA como acelerador — sem abrir mão de rigor em segurança.

## O que fazer

1. **Autenticação com isolamento por tenant.** Use o emulador do Firebase Auth para autenticar usuários de teste, atribuindo um `tenantId` como *custom claim* de cada usuário (crie um script ou documente o passo a passo de como você fez isso). A partir daí:
   - `listAtendimentos`, `createAtendimento` e qualquer outra function que leia/grave `atendimentos` devem **sempre** usar o `tenantId` do token autenticado (`request.auth.token.tenantId`) — nunca um valor que venha solto no payload da chamada.
   - Se não houver usuário autenticado, a chamada deve ser recusada.
2. **Nova function `resumoPorTenant`** (onCall): retorna a contagem de atendimentos por status (`novo`, `pendente`, `resolvido`) do tenant autenticado.
3. **Front-end.** Adapte a tela para autenticar o usuário (pode ser um login simples usando o emulador do Auth, com um usuário de teste fixo) e remova a possibilidade de "trocar de tenant" manualmente — isso não deveria ser possível para um usuário real.
4. **Testes automatizados** cobrindo, no mínimo:
   - Um usuário do tenant A não consegue ver dados do tenant B, mesmo tentando forçar um `tenantId` diferente na chamada.
   - `resumoPorTenant` retorna as contagens corretas para o tenant autenticado.

## O que NÃO é esperado

- Não é necessário um fluxo de cadastro/recuperação de senha completo — um usuário de teste fixo (seedado) é suficiente.
- Não é necessário lidar com múltiplos papéis/permissões dentro de um mesmo tenant (isso é assunto de outro momento).

## Critérios de aceite

- Nenhuma function aceita `tenantId` vindo do cliente para decidir o que retornar — o tenant sempre vem do token autenticado.
- `resumoPorTenant` funciona corretamente.
- Existe pelo menos 1 teste automatizado comprovando que o isolamento entre tenants funciona de verdade (não é só "confiar" que funciona).
- O PR explica, em linguagem simples, que decisão de segurança foi tomada e por quê.
- Segue o processo de entrega descrito no `README.md` (branch, PR, seção "Como usei IA").

## Prazo sugerido

4 a 5 dias corridos a partir do recebimento deste teste, no seu próprio ritmo.
