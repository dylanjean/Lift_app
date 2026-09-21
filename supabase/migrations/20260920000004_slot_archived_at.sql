-- Program editor: slots with logged history can't be hard-deleted (the
-- restrict FK from set_log is intentional), so "remove from program" is a
-- soft archive. Archived slots keep their history in views but disappear
-- from the session screen and rotation.
alter table program_day_exercise add column archived_at timestamptz;
