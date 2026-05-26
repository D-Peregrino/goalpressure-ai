# Checklist UX — `/terminal`

Revisão visual e de copy (sem alterar engines, API, Supabase, SportMonks ou banco).

## Idioma (PT-BR)

- [x] Abas: Cotações, Confronto direto, Ao vivo
- [x] Filtros e navegação: Varredura (não Scanner)
- [x] Cotação em vez de Odd nas labels de placar
- [x] Selos operacionais: NEUTRO, ACOMPANHAR, ALERTA, OPORTUNIDADE, EVITAR
- [x] Rodapé: situação da atualização traduzida (`feedStatusLabel`)
- [x] Mercados de aposta humanizados em `marketLabelPt`

## Hierarquia (5 segundos)

- [x] Jogo em destaque com banner no painel principal
- [x] Ordem do card: placar → decisão → campo → leitura → detalhes → indicadores → timeline → métricas finais
- [x] Lista lateral: selo, situação, placar, minuto
- [x] Ordenação por criticidade contextual

## Botões e interação

- [x] Chips de filtro alteram estado visual (`--on`) e filtro
- [x] Navegação superior rola para seção + toast
- [x] Rail lateral: estatísticas, jogos, varredura, configurações, limpar
- [x] Menu mobile abre painel de configurações (janela da timeline)
- [x] Ícones do topo exibem toast “em breve” (sem botão morto)
- [x] Favoritos, alternar lista, expandir modal, fechar painel secundário

## Estados vazios

- [x] Carregando: “Carregando jogos…”
- [x] Sem jogos: mensagem amigável (sem termos de debug)
- [x] Busca sem resultado
- [x] Timeline sem histórico
- [x] Valores inválidos exibidos como “—” (`roundDisplay`, `formatPair`)

## Mobile

- [x] Grid empilhado abaixo de 1100px
- [x] Topbar com nav rolável
- [x] Busca em linha própria no mobile
- [x] Decisão operacional em coluna única (<720px)

## Visual

- [x] Glow/pulse crítico removido do card principal
- [x] Destaque por selo (alerta / oportunidade / highlight)
- [x] Espaçamentos e blocos com título + subtítulo explicativo

## Validação técnica

```bash
cd frontend && npm run typecheck && npm run build
```

## Arquivos principais

| Área | Arquivo |
|------|---------|
| Shell | `frontend/components/terminal/sports/GoalPressureSportsTerminal.tsx` |
| Card | `frontend/components/terminal/sports/MatchPanelCard.tsx` |
| Lista | `frontend/components/terminal/sports/MatchListRow.tsx` |
| Decisão | `frontend/components/terminal/decision/OperationalDecisionPanel.tsx` |
| Estilos | `frontend/app/styles/sports-terminal.css` |
