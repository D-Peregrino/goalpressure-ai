-- GoalPressure — fonte dos dados em matches (SportMonks vs seed)
-- Idempotente: seguro rodar mais de uma vez.

alter table public.matches
  add column if not exists source text not null default 'unknown';

create index if not exists matches_source_updated_idx
  on public.matches (source, updated_at desc);

create index if not exists matches_source_live_idx
  on public.matches (source, status, updated_at desc)
  where status in ('LIVE', 'HALFTIME', '1ST_HALF', '2ND_HALF');
