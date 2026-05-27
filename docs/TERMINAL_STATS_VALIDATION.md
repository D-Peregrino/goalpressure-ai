# Validação de estatísticas do terminal

Implementação: `lib/terminal/sportmonksStatMap.ts` + `lib/terminal/validatedStats.ts`

## type_id oficiais (fixture team statistics)

| Métrica | type_id |
|---------|---------|
| Escanteios | 34 |
| Finalizações | 42 |
| Ataques perigosos | 44 |
| Posse | 45 |
| Cartão vermelho | 83, 85 |
| Cartão amarelo | 84 |
| Finalizações no alvo | 86 |

**Não mapeamos** IDs como 47 (pênaltis), 52 (gols), 78 (desarmes), 84 antigo errado (era yellow, não corners), etc.

## Período (sem somar FT + HT)

Para cada `(participant_id, type_id)`:

1. Prioridade **FULLTIME** / FT
2. Senão **CURRENT**
3. Senão uma única linha fallback (ex. 2º tempo)

Nunca `+=` entre períodos.

## Sanitização

- Posse: soma casa+visitante entre 98–102%
- Finalizações: máx. 60/time, 80 total
- Escanteios: máx. 25 total (esconde se > 25)
- Vermelhos: máx. 3 total (esconde se > 3)
- No alvo ≤ finalizações do mesmo time

## `validateStatConsistency()`

Remove linhas inteiras se:

- `shots_total > 20` e `dangerous_attacks < 5`
- `corners > shots_total`
- `red_cards > yellow_cards + 2`
- Por time: `shots_on_target > shots_total`

## Debug (dev)

`GET /api/terminal/match/[fixtureId]` → console:

```
[terminal-stat-debug] { statistics: [...], parsed, validated }
```

## Confiança

Dado suspeito **não aparece** no modal nem nos chips dos cards (via `getSafeTerminalStats`).
