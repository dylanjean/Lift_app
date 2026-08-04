-- Per-session rollup for the history screen. Aggregation stays in SQL
-- (CLAUDE.md §4); the client renders rows verbatim.
-- security_invoker so RLS on workout_session/set_log applies through it.
create view v_session_summary
  with (security_invoker = true) as
select
  ws.id                    as session_id,
  ws.started_at,
  ws.ended_at,
  ws.active_seconds,
  pd.label,
  count(sl.id)             as sets,
  coalesce(sum(sl.weight * sl.reps), 0) as volume,
  count(sl.id) filter (where sl.substituted_for_id is not null) as swaps
from workout_session ws
join program_day pd on pd.id = ws.program_day_id
left join set_log sl on sl.session_id = ws.id
where ws.ended_at is not null
group by ws.id, pd.label;
