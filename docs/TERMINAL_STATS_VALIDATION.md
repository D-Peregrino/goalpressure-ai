# Validação de estatísticas do Terminal

Este documento descreve como o `/terminal` decide **mostrar ou ocultar** estatísticas vindas da SportMonks.

Implementação: `lib/terminal/validatedStats.ts`

## Tipos aceitos (allowlist)

Somente estes tipos entram no parser. Qualquer `type_id` / `type.name` desconhecido é **ignorado** (não somado, não estimado).

| Campo | Nomes SportMonks (exemplos) | type_id comuns |
|-------|-----------------------------|----------------|
| Posse | Ball Possession | 45 |
| Finalizações | Shots Total | 42 |
| Finalizações no alvo | Shots On Target | 86 |
| Ataques perigosos | Dangerous Attacks | 47, 52, 78 |
| Escanteios | Corners | 34, 58, 84 |
| Cartão amarelo | Yellowcards | 83 |
| Cartão vermelho | Redcards | 87 |

## Tipos bloqueados

- Qualquer estatística fora da allowlist
- Somas genéricas de vários `type_id` no mesmo campo
- `totalAttacks` inferidos a partir de ataques perigosos
- Posse derivada de `Math.max(casa, visitante)` (comportamento antigo)
- Fallback `50%` de posse
- Odds `1.00` nos cards (já filtradas em `watchCardDisplay`)

## Regras matemáticas

### Posse

- Exige **casa e visitante** com valor entre 0 e 100
- Soma casa + visitante deve estar entre **98 e 102**
- Se inválido: **posse oculta** no card e no modal

**Por que bloquear posse > 100% no total?**  
Indica mapeamento errado (dois tipos somados, percentual duplicado ou stat agregada). Ex.: 74% + 50% = 124% → bloqueado.

### Finalizações

- Máximo **60** por time
- Soma dos dois times máximo **80**
- Se violar: finalizações ocultas (ambos os lados no modal)

### Finalizações no alvo

- Não pode ser maior que finalizações totais do mesmo time
- Máximo **60** por time

### Escanteios

- Máximo **30** por time

### Ataques perigosos

- Máximo **150** por time

## Onde é aplicado

- **Cards** (`watchCardDisplay.ts`): chips só com `getSafeTerminalStats()`
- **Modal** (`TerminalMatchDetail.tsx`): linhas da API `validatedTeamStats`
- **API** `GET /api/terminal/match/[fixtureId]`: parse direto do fixture + log em dev

## Mensagem quando não há stats válidas

> Estatísticas detalhadas não disponíveis ou ainda não validadas para esta partida.

## Auditoria em desenvolvimento

Com `NODE_ENV=development`, a API de detalhe do jogo registra no log:

- `type_id`, `type.name`, `participant_id`, `value`, `location`, `period`

Escopo: `[GoalPressure] [terminal-stats-audit]`

## Teste manual sugerido

1. Abrir um jogo ao vivo no `/terminal`
2. Abrir o modal → conferir se posse soma ~100%
3. Conferir que não aparecem finalizações > 60 por time
4. Em dev, inspecionar log da API de match para o payload bruto
