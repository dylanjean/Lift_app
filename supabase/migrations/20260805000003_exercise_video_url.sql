-- Form-video link per exercise (Muscle & Strength / YouTube), shown as an
-- embedded player in the active session. Nullable: not every exercise has
-- a sourced video.
alter table exercise add column video_url text;
