# Auditoria real — GoalPressure AI (produção)

**Data:** 2026-05-26  
**Escopo:** Código + probes externos + defaults de ambiente  
**Método:** Leitura estática do repositório, inspeção de rotas/APIs, tentativa de probe em `goalpressure.com.br`, validação `npm run typecheck` e `npm run build`.

> **Nota:** Sem acesso ao painel Railway/Supabase de produção nesta auditoria. Tabelas, volumes e logs Telegram “ontem” dependem de credenciais admin — use `/admin/validacao` e `/api/system/health-report` autenticado após deploy.

---

## Resumo executivo

| Área | Veredito |
|------|----------|
| **Terminal / SportMonks** | **PARCIAL** — pipeline real quando `SPORTMONKS_API_TOKEN` válido; seed/demo se token ausente + `GP_SEED_LIVE=true` |
| **Engines core (pressão, GPI, EV, predictive)** | **PARCIAL** — calculam sobre matches reais, persistência depende Supabase + flags |
| **OPS / Network** | **MOCK em dev** — defaults sandbox `true` em dev; **corrigido** para `false` em produção se env não definido |
| **Telegram** | **PARCIAL** — lógica real, envio bloqueado se sandbox; **corrigido** default produção `TELEGRAM_SANDBOX_MODE=false` |
| **Replay** | **PARCIAL** — real se houver snapshots históricos; senão **demo explícito** |
| **Copa 2026** | **MOCK** sem fixtures WC — fallback demo SportMonks; **banner de alerta adicionado** |
| **Billing Stripe** | **PARCIAL / NÃO DEPLOYADO** — código presente no working tree, exige `STRIPE_*` + schema `subscription-stripe-schema.sql` |
| **Produção pública** | **QUEBRADO** — `GET https://goalpressure.com.br/api/health` retornou **HTTP 500** no probe externo |

---

## 1. Fontes de dados reais

### SportMonks

| Item | Status |
|------|--------|
| Token configurado | `SPORTMONKS_API_TOKEN` — obrigatório em prod (`lib/data-source/config.ts`) |
| Endpoint principal in-play | `GET /v3/football/livescores/inplay` (`lib/services/sportmonks.ts`) |
| Includes ativos | Perfil Growth em tiers (`GROWTH_IDEAL_INCLUDES`): participants, scores, state, periods, statistics, inplayOdds, trends, xGFixture, etc. — degradam em tiers se HTTP 422 |
| Copa WC | `fixtures/between`, `fixtures/date`, filtro liga `732` (`lib/copa/sportmonksCopa.ts`) |
| Fallback escondido | **Sim:** cache stale só sem token (`fetchLiveMatchesDirect`); seed se `GP_SEED_LIVE=true` **e** sem token (`/api/live-matches`) |
| Badge UI terminal | `DataSourceBadge` — "DADOS REAIS · SPORTMONKS" vs "Seed dev" |

**Regra produção correta:** com token → **somente SportMonks**, sem seed, sem cache stale em falha (`live-matches/route.ts` L415-417).

### Mock / demo / seed ativos

| Fonte | Quando | Risco |
|-------|--------|-------|
| `GP_SEED_LIVE=true` + sem token | `/api/live-matches` | **Alto** — parece terminal real |
| Copa `demoDataset` | Sem token ou zero fixtures WC | **Médio** — stats/jogos fictícios |
| Replay demo | Sem snapshots DB | **Baixo** — rotulado "Demonstração visual" |
| OPS sandbox | `OPS_CENTER_SANDBOX=true` (dev default) | **Alto** — dados inventados |
| Network sandbox | `NETWORK_ENGINE_SANDBOX=true` (dev default) | **Alto** — operadores/sinais fake |
| Billing mock | Sem `STRIPE_SECRET_KEY` | **Médio** — ativa plano em memória |

---

## 2. Terminal

| Módulo | Status real | Usa dado real? | Problema | Ação | Prioridade |
|--------|-------------|----------------|----------|------|------------|
| Lista de jogos | PARCIAL | Sim, se SportMonks OK | Vazio/erro se token inválido | Validar token Railway + rate limit | P0 |
| Match cards | FUNCIONA | Sim (mapeados de fixture) | Pressão recalculada client-side também | — | P2 |
| Placar/minuto | PARCIAL | Depende includes/state SM | Pode faltar em tier mínimo | Monitorar includes rejeitados | P1 |
| GPI painel | PARCIAL | Sim, sobre matches live | `GPI_ENGINE_SANDBOX` opcional | Confirmar env prod | P1 |
| Pressão ofensiva | FUNCIONA | Sim, engine + stats/events | Fallback inferido se stats ausentes | Documentar confiança | P2 |
| Badge fonte | FUNCIONA | N/A | Seed mostra badge amarelo | — | — |

---

## 3. Engines (uma a uma)

| Engine | Ativa? | Dado real? | Grava? | Exibe? | Impacto decisão | Veredito |
|--------|--------|------------|--------|--------|-----------------|----------|
| **Pressure Engine** | Sim (`livePressureWorker`) | Sim | Sim (`live_pressure_snapshots` se Supabase) | Terminal | Sim | **PARCIAL** |
| **EV Engine** | Sim (pipeline live) | Sim (odds se premium feed) | `live_ev_signals` | Terminal/Ops | Sim | **PARCIAL** |
| **OPS Engine** | Sim | Sim se sandbox off | `operational_insights` | `/ops` | Sim | **MOCK** se sandbox (fix prod default) |
| **Predictive Engine** | `PREDICTIVE_ENGINE_ENABLED` default true | Sim | `predictive_history` | Strip terminal | Parcial | **PARCIAL** |
| **Adaptive Learning** | `ADAPTIVE_LEARNING_ENABLED` default true | Sim | perfis/tabelas learning | Painel terminal | Background | **PARCIAL** |
| **Backtesting** | enabled default true | Histórico DB | Resultados API | `/backtest` | Análise | **PARCIAL** |
| **GPI** | `GPI_ENGINE_ENABLED` default true | Sim | Snapshot memória + histórico | Terminal/Copa | Sim | **PARCIAL** |
| **Autonomous Alerts** | enabled default true | Sim | `autonomous_decisions` / alerts | Painel + Telegram | Sim | **PARCIAL** (sandbox env separado) |
| **Replay** | Sim | DB snapshots | Lê DB | `/replay` | Estudo | **PARCIAL** (+ demo) |
| **Workspace Smart** | Sim | Live + perfil user | `user_operational_*` | `/workspace` | UX | **PARCIAL** |
| **Signal Exchange / Network** | enabled default true | **Não** se sandbox | Dev store | `/network` | Social | **MOCK** (fix prod default) |
| **OPS Center** | enabled default true | **Não** se sandbox | Logs | `/ops` | Operacional | **MOCK** (fix prod default) |

---

## 4. Telegram

| Pergunta | Resposta |
|----------|----------|
| Quando dispara sozinho? | Runtime polling 15s → `processLiveEngineBatch` → `signalDispatcher` / `autonomousAlertEngine` / `telegramLiveEngine` |
| Regra | Cooldown por fixture, prioridade alerta, roteamento `telegram_destinations`, min level `AUTONOMOUS_MIN_ALERT_LEVEL` |
| Sandbox | Se `TELEGRAM_SANDBOX_MODE=true` → **não envia**, só log (`telegramClient.ts`) |
| Default antigo | **true se env vazio** → tudo “sandbox” silencioso |
| **Fix aplicado** | Produção: default **false** (envio real se token+chat ok); dev: default true |
| Logs admin | `/admin/telegram`, tabela `telegram_dispatch_logs` |
| Ontem / cooldowns | **Requer query Supabase** — não disponível nesta auditoria |

---

## 5. Supabase (esperado vs validação)

### Tabelas críticas (schemas em `supabase/`)

| Tabela | Propósito | Como validar |
|--------|-----------|--------------|
| `matches`, `signals` | Runtime live | `/admin/validacao` |
| `live_pressure_snapshots` | Pressão | probe em validação |
| `live_ev_signals` | EV | idem |
| `operational_insights` | OPS | idem |
| `live_signal_dispatches` | Telegram | idem |
| `autonomous_decisions` | Alertas autônomos | idem |
| `user_subscriptions`, `subscription_plans` | Billing Stripe | **Aplicar** `subscription-stripe-schema.sql` |
| `copa_leads` | Funil Copa | `copa-leads-schema.sql` |
| `telegram_destinations` | Roteamento TG | schema telegram |

**Ação P0:** Rodar **Aplicar schemas** em `/admin/validacao` ou `POST /api/admin/apply-schemas` e confirmar zero `failed`.

---

## 6. Variáveis Railway (checklist)

| Variável | Esperado prod | Efeito se ausente/errado |
|----------|---------------|---------------------------|
| `SPORTMONKS_API_TOKEN` | **Obrigatório** | Terminal vazio / erro MISSING_TOKEN |
| `SUPABASE_URL` + `SERVICE_ROLE` | **Recomendado** | Sem persistência, auth frágil |
| `NEXT_PUBLIC_SUPABASE_*` | **Obrigatório** | Login quebrado |
| `TELEGRAM_SANDBOX_MODE` | `false` p/ envio real | Default prod agora **false** se unset |
| `TELEGRAM_BOT_TOKEN` / `CHAT_ID` | Se TG ativo | OFFLINE |
| `OPS_CENTER_SANDBOX` | `false` | Default prod agora **false** |
| `NETWORK_ENGINE_SANDBOX` | `false` | Default prod agora **false** |
| `GP_SEED_LIVE` | **`false`** | Se true sem token → **seed como live** |
| `STRIPE_SECRET_KEY` + prices | Para billing | Mock checkout |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | Assinatura não sincroniza |
| `GP_AUTO_START_RUNTIME` | `true` | Polling live para |

---

## 7. Páginas (teste lógico / rotas)

| Rota | Abre? | Dados reais? | Mock? | Paywall? | Notas |
|------|-------|--------------|-------|----------|-------|
| `/` | Sim | N/A | Landing marketing | Não | Copa CTA |
| `/terminal` | Sim | SportMonks | Seed se mal config | Pro (`terminal`) | Badge fonte |
| `/ops` | Sim | Se sandbox off | Sandbox dev | Elite (`ops`) | Banner sandbox |
| `/replay` | Sim | DB snapshots | Demo fallback | Pro | Empty state OK |
| `/workspace` | Sim | Live + user | — | Pro | Requer login |
| `/network` | Sim | Se sandbox off | Sandbox dev | Institutional | |
| `/copa` | Sim | SM ou **demo** | Demo WC | Freemium | **Banner demo** |
| `/admin/validacao` | Sim | Probes reais | — | Admin | **Usar sempre** |
| `/admin/quant` | Sim | DB/GPI | — | Admin | |
| `/admin/telegram` | Sim | Logs reais | Sandbox flag | Admin | |
| `/billing` | Sim* | Stripe | Mock sem keys | — | *No working tree, não mergeado |
| `/admin/assinaturas` | Sim | DB | Dev store | Admin | Métricas Stripe |

---

## 8. Tabela consolidada (módulo → ação)

| Módulo | Status real | Usa dado real? | Problema | Ação necessária | Prioridade |
|--------|-------------|----------------|----------|-----------------|-----------|
| SportMonks feed | PARCIAL | Condicional token | Token/rate limit | Confirmar env Railway + monitor API usage | P0 |
| Terminal live | PARCIAL | Sim c/ token | Erro 500 prod health | Diagnosticar deploy `goalpressure.com.br` | P0 |
| Seed live | MOCK | Não | GP_SEED_LIVE indevido | Garantir `false` em prod | P0 |
| Pressure/GPI/EV | PARCIAL | Sim | Persistência DB | Aplicar schemas + Supabase | P1 |
| OPS Center | MOCK→PARCIAL | Após fix sandbox | Default sandbox true | `OPS_CENTER_SANDBOX=false` prod | P0 |
| Network Exchange | MOCK→PARCIAL | Após fix sandbox | Dados fake | `NETWORK_ENGINE_SANDBOX=false` prod | P1 |
| Telegram | PARCIAL | Sim se sandbox off | Default sandbox | `TELEGRAM_SANDBOX_MODE=false` + destinos | P1 |
| Replay | PARCIAL | DB | Poucos snapshots | Acumular persistência histórica | P2 |
| Copa 2026 | MOCK | Raro (pré-Copa) | Demo como real | Banner + SM WC package | P1 |
| Billing Stripe | NÃO IMPLEMENTADO deploy | N/A | Schema + env + merge | Aplicar schema, configurar Stripe, merge controlado | P2 |
| Health API prod | QUEBRADO | N/A | HTTP 500 | Logs Railway + try/catch adicionado | P0 |
| Supabase schemas | PARCIAL | N/A | Tabelas novas | apply-schemas completo | P0 |

**Status possíveis usados:** FUNCIONA · PARCIAL · MOCK · QUEBRADO · NÃO IMPLEMENTADO

---

## 9. Correções críticas aplicadas nesta auditoria

1. **`lib/env/envBool.ts`** — defaults sandbox **false em produção** para OPS, Network, Telegram (dev permanece seguro).
2. **`CopaDataSourceBanner`** — alerta visível quando fonte ≠ SportMonks.
3. **`OpsCenter`** — banner quando `center.sandbox === true`.
4. **`/api/health`** — try/catch (evita 500 opaco).

**Não incluído neste commit:** módulo billing Stripe (working tree separado — evitar feature nova).

---

## 10. Próximos passos operacionais (sem código)

1. Railway → confirmar `SPORTMONKS_API_TOKEN`, `GP_SEED_LIVE=false`, sandbox flags explícitas.
2. `/admin/validacao` → aplicar todos schemas → screenshot checks verdes.
3. `/admin/telegram` → revisar logs 24h, contagem sandbox vs sent.
4. Probe pós-deploy: `/api/health`, `/api/data-source/status`, `/api/live-matches`.
5. Decidir merge billing Stripe em PR dedicado (fora desta auditoria).

---

## Validação local

```
npm run typecheck  ✅
npm run build      ✅
```
