create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'expert')),
  mode text not null check (mode in ('classic', 'daily')),
  seconds integer not null check (seconds >= 0 and seconds <= 86400),
  moves integer not null check (moves > 0 and moves <= 10000),
  won boolean not null default false,
  seed text,
  created_at timestamptz not null default now()
);

create index if not exists scores_leaderboard_idx
  on public.scores (difficulty, mode, won, seconds asc, created_at desc);

alter table public.scores enable row level security;

create policy "Scores are readable by everyone"
  on public.scores for select
  using (true);

create policy "Players can submit anonymous scores"
  on public.scores for insert
  with check (true);
