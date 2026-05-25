# Seed operacional — GoalPressure AI

Popula o Supabase com jogos, sinais, alertas, edges, usuários de teste e histórico para validação visual do terminal, minha-central e admin.

## Pré-requisitos

1. Variáveis no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GP_ALLOW_SEED=true
```

2. SQL no Supabase (uma vez):

```bash
# No SQL Editor, execute:
supabase/operational-seed-schema.sql
```

(Opcional: schemas comerciais e runtime já aplicados — `commercial-schema.sql`, `full-initial-schema.sql`.)

## Comandos

```bash
cd frontend

# Popular (idempotente — upsert em matches/signals/users)
npm run seed

# Limpar dados gp-seed-* e repopular
npm run seed:clear
```

## Terminal ao vivo com dados do seed

Sem SportMonks, force o feed a ler do Supabase:

```env
GP_SEED_LIVE=true
```

Reinicie `npm run dev` e abra `/terminal`.

## API (admin logado)

```bash
# Popular
curl -X POST https://seu-dominio/api/dev/seed \
  -H "Cookie: ..." \
  -H "Content-Type: application/json" \
  -d '{"clear": true}'

# Limpar seed
curl -X DELETE https://seu-dominio/api/dev/seed -H "Cookie: ..."
```

## Usuários fake

| E-mail | Plano | Papel |
|--------|-------|--------|
| admin@goalpressure.seed | fundador | admin (alinhe com ADMIN_EMAILS ou use este e-mail) |
| founder@goalpressure.seed | fundador | user |
| free@goalpressure.seed | free | user |
| premium@goalpressure.seed | pro | user |

Senha padrão: `GoalPressure@Seed2026` (ou `SEED_DEFAULT_PASSWORD` no env).

## O que é criado

- **matches** — ao vivo, próximos, finalizados (odds, pressão, xG, cartões, escanteios)
- **signals** — alertas com ROI/acurácia (HIT/MISS/PENDING)
- **signal_dispatches** — entradas EV+
- **live_metrics** — pressão/momentum
- **market_edges** — vantagem de mercado
- **operational_events** — Gol provável, Over aquecendo, etc.
- **ops_logs**, **backtest_results**, **analytics_snapshots**, **leads**
- **profiles**, **subscriptions**, **payments** (usuários seed)

IDs prefixados com `gp-seed-` para limpeza segura.

## Produção

- Não defina `GP_ALLOW_SEED` em produção salvo testes controlados.
- `GP_SEED_LIVE` nunca deve ficar `true` em produção real com SportMonks ativo.
- O seed não altera engines nem polling SportMonks quando `GP_SEED_LIVE` está off.
