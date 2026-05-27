# Core rebuild — Terminal GoalPressure

**Data:** 2026-05-27  
**Objetivo:** Um único terminal confiável (`/terminal`) com dados reais, sem ruído experimental.

---

## O que foi removido / ocultado (UI)

| Módulo | Rota | Ação |
|--------|------|------|
| OPS Center | `/ops` | Redirect → `/terminal` |
| Signal Exchange | `/network` | Redirect → `/terminal` |
| Replay Engine | `/replay` | Redirect → `/terminal` |
| Quant (admin) | `/admin/quant` | Redirect → `/terminal` |
| Backtest | `/backtest` | Redirect → `/terminal` |
| Validação pública | `/validation` | Redirect → `/terminal` |
| Research | `/research` | Redirect → `/terminal` |
| Analytics | `/analytics` | Redirect → `/terminal` |
| Feed legado | `/feed` | Redirect → `/terminal` |
| Models | `/models` | Redirect → `/terminal` |

**Painéis removidos do terminal:** Adaptive Learning, Autonomous Alerts strip, Backtesting, Persistence health, Operational persistence, Predictive strip, GPI breakdown, narrativa longa contextual, abas experimentais.

**Nav global (`productCopy`):** apenas Terminal, Minha central, Workspace (+ Admin se aplicável).

---

## O que ficou

| Área | Onde |
|------|------|
| Terminal unificado | `/terminal` |
| Segmentos | Ao vivo · Futuros · Encerrados · Favoritos |
| Cards | `MatchPanelCard`, `MatchListRow`, escudo + bandeira de liga |
| Dados ao vivo | `GET /api/live-matches` (SportMonks in-play) |
| Agenda | `GET /api/terminal/schedule` (fixtures between −1 / +3 dias) |
| Favoritos | `useUserWorkspace` (local + conta) |
| Busca | Filtro por time/liga |
| Telegram (backend) | 1 alerta / jogo / 15 min + cooldown global 90 s, mensagem curta |

---

## O que realmente funciona

| Funcionalidade | Status | Notas |
|----------------|--------|-------|
| Jogos ao vivo | **FUNCIONA** | Com `SPORTMONKS_API_TOKEN` válido |
| Jogos futuros | **PARCIAL** | Schedule SportMonks; stats limitadas até o apito |
| Jogos encerrados | **PARCIAL** | Mesma agenda; placar quando SM envia scores |
| Placar / minuto | **PARCIAL** | Só exibe se `scoreKnown` / minuto na fonte |
| Escanteios / ataques / finalizações | **PARCIAL** | Só em ao vivo e se statistics no include |
| Odds | **PARCIAL** | Quando inplayOdds no tier SportMonks |
| Seed / mock em produção | **DESLIGADO** | `isSeedAllowed()` = false em `NODE_ENV=production` |
| Telegram anti-spam | **FUNCIONA** | Sandbox respeita env; produção com token |

---

## Regras de exibição

1. Métrica sem dado → **não renderiza** (sem número solto).
2. Cartões amarelos → removidos até haver feed de cartões.
3. Card compacto em pré-jogo / encerrado → placar ou horário, sem blocos vazios.

---

## Variáveis críticas (Railway)

- `SPORTMONKS_API_TOKEN` — obrigatório para terminal real
- `GP_SEED_LIVE` — **não** usar em produção
- `TELEGRAM_SANDBOX_MODE=false` em produção para envio real
- `OPS_CENTER_SANDBOX=false`, `NETWORK_ENGINE_SANDBOX=false` (módulos ocultos, mas APIs podem existir)

---

## Arquivos principais alterados

- `components/terminal/sports/GoalPressureSportsTerminal.tsx`
- `hooks/useLiveMatchCenter.ts`, `hooks/useTerminalSchedule.ts`
- `app/api/terminal/schedule/route.ts`, `lib/sportmonks/terminalSchedule.ts`
- `lib/terminal/sportsDisplay.ts`, `components/terminal/sports/MatchPanelCard.tsx`
- `middleware.ts`, `lib/ux/productCopy.ts`
- `lib/data-source/config.ts`, `lib/telegram/*`
