-- ============================================================
-- 0001 init — full schema, RLS, progression view
--
-- Design notes (see CLAUDE.md §2, §4):
--   * set_log carries BOTH the planned slot (program_day_exercise_id)
--     and what was actually performed (exercise_id). substituted_for_id
--     is non-null only when the slot's planned exercise was swapped.
--     This keeps progress attached to the program slot across
--     equipment-unavailable substitutions. Do not simplify.
--   * exercise.user_id IS NULL marks global seed rows readable by
--     everyone; only the service role (seed loader) writes them.
--   * All user tables get RLS scoped to auth.uid() from day one.
--   * auth.uid() is wrapped in (select ...) inside policies so the
--     planner evaluates it once per statement, not per row.
-- ============================================================

-- ---------- exercise ----------

create table exercise (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete cascade,
                 -- null = global seed row
  name           text not null check (length(trim(name)) > 0),
  primary_muscle text,
  equipment      text,
  cues           text
);

create table exercise_alternate (
  exercise_id  uuid not null references exercise (id) on delete cascade,
  alternate_id uuid not null references exercise (id) on delete cascade,
  rank         smallint not null check (rank > 0),
  primary key (exercise_id, alternate_id),
  check (exercise_id <> alternate_id)
);

create index exercise_alternate_alternate_id_idx on exercise_alternate (alternate_id);

-- ---------- program ----------

create table program (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  source_url text,
  weeks      smallint check (weeks > 0)
);

create table program_day (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references program (id) on delete cascade,
  day_index  smallint not null check (day_index >= 0),
  label      text not null,  -- Push / Pull / Legs
  unique (program_id, day_index)
);

create table program_day_exercise (
  id             uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references program_day (id) on delete cascade,
  exercise_id    uuid not null references exercise (id) on delete restrict,
  slot_order     smallint not null check (slot_order >= 0),
  target_sets    smallint not null check (target_sets > 0),
  target_reps    text not null,      -- '8-12', 'AMRAP' — text on purpose
  rest_seconds   integer check (rest_seconds >= 0),
  unique (program_day_id, slot_order)
);

create index program_day_exercise_exercise_id_idx on program_day_exercise (exercise_id);

-- ---------- workout logging ----------

create table workout_session (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  program_day_id uuid not null references program_day (id) on delete restrict,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz check (ended_at >= started_at),
  active_seconds integer check (active_seconds >= 0),
  notes          text
);

create index workout_session_user_started_idx on workout_session (user_id, started_at desc);
create index workout_session_program_day_id_idx on workout_session (program_day_id);

-- One in-flight session per user; finish (or discard) before starting another.
create unique index workout_session_one_active_idx
  on workout_session (user_id) where ended_at is null;

create table set_log (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id              uuid not null references workout_session (id) on delete cascade,
  program_day_exercise_id uuid not null references program_day_exercise (id) on delete restrict,
  exercise_id             uuid not null references exercise (id) on delete restrict,
  substituted_for_id      uuid references exercise (id) on delete restrict,
                          -- planned exercise when swapped; null = performed as planned
  set_index               smallint not null check (set_index > 0),
  weight                  numeric(6,2) not null check (weight >= 0),
  reps                    smallint not null check (reps >= 0),
  rpe                     numeric(3,1) check (rpe between 1 and 10),
  logged_at               timestamptz not null default now(),
  unique (session_id, program_day_exercise_id, set_index),
  -- substituted_for_id records a swap; a row where it equals the performed
  -- exercise would claim a swap to itself
  check (substituted_for_id <> exercise_id)
);

create index set_log_user_logged_idx on set_log (user_id, logged_at desc);
create index set_log_session_id_idx on set_log (session_id);
create index set_log_slot_idx on set_log (program_day_exercise_id);
create index set_log_exercise_id_idx on set_log (exercise_id);
create index set_log_substituted_for_id_idx on set_log (substituted_for_id) where substituted_for_id is not null;

-- ---------- water / fasting / body ----------

create table water_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0)
);

create index water_log_user_logged_idx on water_log (user_id, logged_at desc);

create table fast_session (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz check (ended_at >= started_at),
  target_hours numeric(4,1) not null default 16 check (target_hours > 0)
);

create index fast_session_user_started_idx on fast_session (user_id, started_at desc);

-- One running fast per user.
create unique index fast_session_one_active_idx
  on fast_session (user_id) where ended_at is null;

create table body_metric (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at   timestamptz not null default now(),
  metric_type text not null,   -- free text for now ('weight', ...); enum once the set settles
  value       numeric(8,2) not null
);

create index body_metric_user_type_logged_idx on body_metric (user_id, metric_type, logged_at desc);

-- ============================================================
-- RLS
-- ============================================================

alter table exercise             enable row level security;
alter table exercise_alternate   enable row level security;
alter table program              enable row level security;
alter table program_day          enable row level security;
alter table program_day_exercise enable row level security;
alter table workout_session      enable row level security;
alter table set_log              enable row level security;
alter table water_log            enable row level security;
alter table fast_session         enable row level security;
alter table body_metric          enable row level security;

-- exercise: read global seeds + own rows; write only own rows.
create policy "read global and own exercises" on exercise
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "insert own exercises" on exercise
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own exercises" on exercise
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own exercises" on exercise
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- exercise_alternate has no user_id: visibility follows the exercises it
-- links; writes require owning the base exercise. Global seed pairs are
-- inserted by the service role, which bypasses RLS.
create policy "read alternates of visible exercises" on exercise_alternate
  for select to authenticated
  using (
    exists (select 1 from exercise e
            where e.id = exercise_id
              and (e.user_id is null or e.user_id = (select auth.uid())))
    and exists (select 1 from exercise e
                where e.id = alternate_id
                  and (e.user_id is null or e.user_id = (select auth.uid())))
  );

create policy "write alternates for own exercises" on exercise_alternate
  for all to authenticated
  using (exists (select 1 from exercise e
                 where e.id = exercise_id and e.user_id = (select auth.uid())))
  with check (exists (select 1 from exercise e
                      where e.id = exercise_id and e.user_id = (select auth.uid())));

-- program and children: scoped to the owning user via the program row.
create policy "own programs" on program
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own program days" on program_day
  for all to authenticated
  using (exists (select 1 from program p
                 where p.id = program_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from program p
                      where p.id = program_id and p.user_id = (select auth.uid())));

create policy "own program day exercises" on program_day_exercise
  for all to authenticated
  using (exists (select 1 from program_day pd
                 join program p on p.id = pd.program_id
                 where pd.id = program_day_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from program_day pd
                      join program p on p.id = pd.program_id
                      where pd.id = program_day_id and p.user_id = (select auth.uid())));

-- Plain per-user tables.
create policy "own workout sessions" on workout_session
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own set logs" on set_log
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own water logs" on water_log
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own fast sessions" on fast_session
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own body metrics" on body_metric
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Views — analytics live in SQL, charts stay thin (CLAUDE.md §4)
-- ============================================================

-- security_invoker: the view runs with the querying user's permissions,
-- so the RLS policies above apply through it. Without this a view is
-- owner-rights and would leak across users.
create view v_slot_progression
  with (security_invoker = true) as
select
  pde.id                            as slot_id,
  ws.started_at::date               as day,
  e.name                            as performed,
  sl.substituted_for_id is not null as was_swapped,
  sum(sl.weight * sl.reps)          as volume,
  max(sl.weight)                    as top_weight,
  round(max(sl.weight * (1 + sl.reps / 30.0)), 1) as est_1rm  -- Epley
from set_log sl
join workout_session ws       on ws.id  = sl.session_id
join program_day_exercise pde on pde.id = sl.program_day_exercise_id
join exercise e               on e.id   = sl.exercise_id
group by 1, 2, 3, 4;
