# Project Brief — PPL Workout & Health Tracker (PWA)

> **How to use this file:** save it in your repo root as `CLAUDE.md`. Claude Code reads it automatically at the start of every session, so you don't have to re-paste context. For session one, open Claude Code in an empty directory and say: *"Read CLAUDE.md. Ask me your open questions, then start on Milestone 0."*

---

## 1. Role and context

You're the engineering partner on a solo side project. The owner is a data analyst — very strong in SQL, comfortable with Python, and learning modern frontend. Assume fluency with relational modeling, query optimization, joins, CTEs, and window functions. Do **not** over-explain SQL. **Do** explain React patterns, TypeScript generics, async state management, and build tooling when they're non-obvious.

Push back when a request will cause problems later. Surface tradeoffs instead of silently picking one.

## 2. What we're building

A personal fitness tracker, installed as a PWA on an Android phone. Used **in the gym, one-handed, mid-set**. It is not a social app, not a coaching app, and not an AI app.

Four jobs:

1. **Log workouts** against a fixed 3-day Push/Pull/Legs program
2. **Substitute exercises on the fly** when gym equipment is occupied, without breaking progress tracking
3. **Track water intake and time exercised**
4. **Run a fasting timer** — start, stop, elapsed duration

Later (do not build now): custom program builder, multi-user, Capacitor APK wrapper, Health Connect.

### The requirement that shapes the architecture

The gym is busy. A machine or bench for a planned exercise is frequently taken, so the user substitutes an alternate movement for that slot. **The app must keep the substituted set attached to the planned program slot**, so progress charts stay continuous across substitutions and the user can later query how often each piece of equipment was unavailable.

This is why `set_log` carries both `program_day_exercise_id` (the planned slot), `exercise_id` (what was actually performed), and `substituted_for_id` (what was planned, null when no swap). Do not simplify this away.

## 3. Tech stack — pinned, don't substitute

| Layer | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (add per-component, don't bulk install) |
| Backend | Supabase — Postgres, Auth, RLS |
| Server state | TanStack Query |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| PWA | vite-plugin-pwa |
| Hosting | Vercel |
| Package manager | pnpm |

**Ask before adding any dependency not on this list.** No component library beyond shadcn. No state manager beyond TanStack Query plus React state — if you think you need Redux or Zustand, say why first.

## 4. Data model

Postgres, in Supabase. Migrations live in `supabase/migrations/`, applied via the Supabase CLI (already installed).

```
exercise              id, user_id (null = global seed), name, primary_muscle,
                      equipment, cues
exercise_alternate    exercise_id, alternate_id, rank   -- self-join, ranked
program               id, user_id, name, source_url, weeks
program_day           id, program_id, day_index, label  -- Push / Pull / Legs
program_day_exercise  id, program_day_id, exercise_id, slot_order,
                      target_sets, target_reps (text), rest_seconds
workout_session       id, user_id, program_day_id, started_at, ended_at,
                      active_seconds, notes
set_log               id, user_id, session_id, program_day_exercise_id,
                      exercise_id, substituted_for_id, set_index,
                      weight, reps, rpe, logged_at
water_log             id, user_id, logged_at, amount_ml
fast_session          id, user_id, started_at, ended_at, target_hours
body_metric           id, user_id, logged_at, metric_type, value
```

Rules:

- **RLS on every user table from the first migration.** Policies scoped to `auth.uid()`. Not a later task.
- `target_reps` is `text` — programs use `8-12` and `AMRAP`. A smallint forces lies.
- `weight` is `numeric(6,2)`. Never float.
- All timestamps `timestamptz`. Store UTC, render local.
- Foreign keys and check constraints at the DB level, not just in app code. `exercise_alternate` gets `check (exercise_id <> alternate_id)`.
- Generate TypeScript types from the schema with `supabase gen types typescript`. Do not hand-write row types.

### Put analytics in SQL views, not React

The owner is a SQL specialist. Aggregation belongs in Postgres views the frontend selects from. Start with `v_slot_progression`:

```sql
create view v_slot_progression as
select
  pde.id                          as slot_id,
  ws.started_at::date             as day,
  e.name                          as performed,
  sl.substituted_for_id is not null as was_swapped,
  sum(sl.weight * sl.reps)        as volume,
  max(sl.weight)                  as top_weight,
  round(max(sl.weight * (1 + sl.reps / 30.0)), 1) as est_1rm  -- Epley
from set_log sl
join workout_session ws     on ws.id  = sl.session_id
join program_day_exercise pde on pde.id = sl.program_day_exercise_id
join exercise e             on e.id   = sl.exercise_id
group by 1,2,3,4;
```

Charts read from views. Keep the React layer thin.

## 5. Seed data

Source program: 3 Day Push/Pull/Legs for Beginners (Muscle & Strength) —
`https://www.muscleandstrength.com/workouts/3-day-PPL-workout-for-beginners`

**Ask the owner to paste the exercise table before writing the seed file.** For each of Push / Pull / Legs, you need: exercise name, sets, reps, rest, and the listed alternate exercises.

Structure it as `supabase/seed/ppl_beginner.json` and write a loader script — never hardcode exercises into components. The seed file must be replaceable without touching application code, because a second program is coming eventually.

## 6. Core flows and acceptance criteria

### Today screen
- Shows which day is next in the Push → Pull → Legs rotation, based on the last completed session
- One primary action: **Start workout**
- Secondary: water quick-add, fast timer state
- Loads and is interactive in under 2 seconds on a mid-range Android phone over LTE

### Active session
- One exercise slot in focus at a time, with previous session's numbers shown for reference
- Set rows: weight, reps, optional RPE. Numeric inputs use `inputMode="decimal"` so Android opens the number pad
- Tapping "log set" starts the rest timer automatically using the slot's `rest_seconds`
- **Swap flow:** long-press (or a visible swap icon — decide and justify) opens a sheet of ranked alternates from `exercise_alternate`, plus a search field for anything else. Selecting one re-renders the set rows pre-filled with the user's last numbers *for that alternate*, and sets `substituted_for_id`. Maximum two taps.
- Requests a screen wake lock on session start, releases on finish, re-requests on `visibilitychange`
- Writes are optimistic — the UI never blocks on the network mid-set

### Water
- Quick-add buttons only, no dialog, no keyboard. Single tap logs. Long-press for a custom amount.

### Fast timer
- Store `started_at`; compute elapsed on every render. **No background timer, no interval that must survive backgrounding.**
- Displays elapsed as HH:MM:SS with a progress ring against `target_hours`
- Correct after the phone has been asleep for eight hours — this is the acceptance test

### Offline
Do **not** build an offline queue yet. First have the owner verify the network works where he actually trains. If it doesn't, we'll add Dexie as a write buffer — as a deliberate follow-up, not a guess.

## 7. Design direction

**Reject the default.** Near-black background with one bright acid accent is where every generated fitness UI lands, and it says nothing about lifting. This brief is grounded in the actual material world of a gym.

**Thesis:** the app should feel like competition equipment — calibrated, precise, engineered for reading at a glance under fatigue.

**Palette.** Base is warm rubber-flooring charcoal, not pure black: `#1B1A18` surface, `#232220` raised, `#E8E4DE` primary text, `#8A8580` muted. Functional accents come from IPF calibrated plate colors, used *semantically* rather than decoratively:

| Plate | Hex | Meaning in UI |
|---|---|---|
| 20 kg blue | `#1E5AA8` | Primary actions, active state |
| 25 kg red | `#C8362C` | PRs, max effort, destructive |
| 15 kg yellow | `#E8B923` | Rest timer, in-progress |
| 10 kg green | `#2E7D46` | Completed, streaks, goals hit |
| 5 kg white | `#F2F0EC` | Emphasis numerals |

**Typography.** Display and numerals: **Archivo Expanded** — wide, athletic, reads like a scoreboard at a distance. Body and UI: **Public Sans**. Data and timers: **IBM Plex Mono**, tabular figures so a running clock doesn't jitter. All three are on Google Fonts. Avoid Inter and Space Grotesk; they're the house style of generated UI.

**Signature element — the plate stack.** Weight is never rendered as bare text. `185 lb` displays as a horizontal barbell loadout: a bar with per-side plates drawn in their real calibrated colors. It's the app's memorable object, and it's genuinely useful — the user reads what to actually load onto the bar. Build it as `<PlateStack weight={185} unit="lb" barWeight={45} />`, computing the greedy plate breakdown from available denominations.

Spend the boldness there. Everything else stays quiet: flat surfaces, one accent per screen, 2px radii, no gradients, no glassmorphism, no decorative motion. Animate only state changes that need confirming — a set logging, the rest timer expiring.

**Ergonomics, non-negotiable.** Primary actions in the bottom third for thumb reach. Touch targets 56dp minimum. Numerals large enough to read at arm's length on a bench. Visible keyboard focus. `prefers-reduced-motion` respected.

## 8. Working agreement

- Small, focused commits with conventional messages. Commit at each working milestone.
- TypeScript strict. No `any` without a comment explaining why.
- Comment the *why*, not the *what*. Flag anything the owner will need to customize.
- No test suite for v1, but keep logic pure and extractable — plate math, rotation logic, and elapsed-time calculation go in `src/lib/` as pure functions, not inside components.
- Secrets in `.env.local`, never committed. `.env.example` is committed.
- **Do not run destructive Supabase commands** (`db reset`, dropping tables) without asking first.
- If a request conflicts with something in this file, say so rather than quietly picking one.

## 9. Milestone 0 — prove the loop before building features

1. Scaffold Vite + React + TS + Tailwind, pnpm
2. Wire Supabase client, `.env.local` and `.env.example`
3. Supabase Auth with a single email/password account
4. Configure vite-plugin-pwa: manifest, icons, `display: standalone`
5. Deploy to Vercel
6. Owner opens the URL on his phone, adds to home screen, signs in

**Done when:** the app opens from the Android home screen with no browser chrome, signs in, and shows an authenticated placeholder screen. No features yet. Ship this before writing a single component that matters.

Then Milestone 1: schema + RLS + seed loader, Today screen, active session with swap, water, fast timer.

## 10. Ask these before starting

1. The Muscle & Strength exercise table — exercises, sets, reps, rest, and alternates per day
2. lb or kg, and available plate denominations for the plate stack
3. Fasting target hours (16:8, 18:6, other)
4. Daily water goal, and preferred quick-add increments
5. New Supabase project, or reuse an existing one
6. Rest times per exercise, if the source program doesn't specify them
