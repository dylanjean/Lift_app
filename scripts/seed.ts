/**
 * Seed loader — reads supabase/seed/ppl_beginner.json and loads it into
 * the linked Supabase project.
 *
 *   node --env-file=.env.local scripts/seed.ts [--replace] [--file=path]
 *
 * Uses the service role key (bypasses RLS) because global exercise rows
 * have user_id = null, which no authenticated user is allowed to write.
 * The program itself is attached to the project's single auth user.
 *
 * Behavior, chosen for a solo project:
 *   - exercises: inserted if missing by name (global rows only); existing
 *     rows are left untouched so dashboard edits survive reseeding
 *   - alternates: wiped and rewritten for seeded exercises (deterministic)
 *   - program: refuses to overwrite unless --replace; --replace deletes the
 *     program (days/slots cascade) and will fail — by design — if set_log
 *     history references its slots
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

interface SeedExercise {
  name: string
  primary_muscle: string | null
  equipment: string | null
  cues: string | null
  video_url: string | null
}

interface SeedSlot {
  exercise: string
  sets: number
  reps: string
  rest_seconds: number
}

interface SeedFile {
  program: { name: string; source_url: string; weeks: number }
  exercises: SeedExercise[]
  days: { day_index: number; label: string; slots: SeedSlot[] }[]
  alternates: Record<string, string[]>
}

function fail(msg: string): never {
  console.error(`❌ ${msg}`)
  process.exit(1)
}

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url) fail('VITE_SUPABASE_URL missing — run with --env-file=.env.local')
if (!serviceKey)
  fail(
    'SUPABASE_SERVICE_ROLE_KEY missing from .env.local — dashboard → Project Settings → API keys. Never commit it; no VITE_ prefix so it can never reach the client bundle.',
  )

const replace = process.argv.includes('--replace')
const fileArg = process.argv.find((a) => a.startsWith('--file='))
const seedPath = fileArg ? fileArg.slice('--file='.length) : 'supabase/seed/ppl_beginner.json'

const seed: SeedFile = JSON.parse(readFileSync(seedPath, 'utf8'))

// -- validate name references before touching the database ---------------
const names = new Set(seed.exercises.map((e) => e.name))
if (names.size !== seed.exercises.length) fail('duplicate exercise names in seed file')
for (const day of seed.days)
  for (const slot of day.slots)
    if (!names.has(slot.exercise)) fail(`day "${day.label}" references unknown exercise "${slot.exercise}"`)
for (const [base, alts] of Object.entries(seed.alternates)) {
  if (!names.has(base)) fail(`alternates key "${base}" is not a seeded exercise`)
  for (const alt of alts) {
    if (!names.has(alt)) fail(`alternate "${alt}" (of "${base}") is not a seeded exercise`)
    if (alt === base) fail(`"${base}" lists itself as an alternate`)
  }
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

// -- resolve the single app user ----------------------------------------
const { data: usersPage, error: usersErr } = await db.auth.admin.listUsers()
if (usersErr) fail(`listing users: ${usersErr.message}`)
const users = usersPage.users
if (users.length === 0) fail('no auth users exist — create your account first (dashboard → Authentication)')
if (users.length > 1)
  fail(`expected the single app user, found ${users.length}: ${users.map((u) => u.email).join(', ')}`)
const user = users[0]!
console.log(`Seeding for ${user.email}`)

// -- exercises: insert missing global rows ------------------------------
const { data: existing, error: exErr } = await db
  .from('exercise')
  .select('id, name, video_url')
  .is('user_id', null)
if (exErr) fail(`reading exercises: ${exErr.message}`)

const idByName = new Map<string, string>(existing.map((e) => [e.name as string, e.id as string]))
const missing = seed.exercises.filter((e) => !idByName.has(e.name))

if (missing.length > 0) {
  const { data: inserted, error } = await db
    .from('exercise')
    .insert(missing.map((e) => ({ ...e, user_id: null })))
    .select('id, name')
  if (error) fail(`inserting exercises: ${error.message}`)
  for (const e of inserted) idByName.set(e.name as string, e.id as string)
}
console.log(`Exercises: ${missing.length} inserted, ${seed.exercises.length - missing.length} already present`)

const id = (name: string): string => idByName.get(name)! // validated above

// refresh video_url on rows that already existed (seed file is the source
// of truth for videos; cues/muscle stay untouched to preserve owner edits)
const staleVideo = seed.exercises.filter((e) => {
  const row = existing.find((x) => x.name === e.name)
  return row && row.video_url !== e.video_url
})
for (const e of staleVideo) {
  const { error } = await db.from('exercise').update({ video_url: e.video_url }).eq('id', id(e.name))
  if (error) fail(`updating video for "${e.name}": ${error.message}`)
}
if (staleVideo.length > 0) console.log(`Videos: ${staleVideo.length} exercise video links refreshed`)

// -- alternates: rewrite deterministically ------------------------------
const seededIds = seed.exercises.map((e) => id(e.name))
const { error: delAltErr } = await db.from('exercise_alternate').delete().in('exercise_id', seededIds)
if (delAltErr) fail(`clearing alternates: ${delAltErr.message}`)

const altRows = Object.entries(seed.alternates).flatMap(([base, alts]) =>
  alts.map((alt, i) => ({ exercise_id: id(base), alternate_id: id(alt), rank: i + 1 })),
)
const { error: altErr } = await db.from('exercise_alternate').insert(altRows)
if (altErr) fail(`inserting alternates: ${altErr.message}`)
console.log(`Alternates: ${altRows.length} pairs written`)

// -- program ------------------------------------------------------------
const { data: prior, error: priorErr } = await db
  .from('program')
  .select('id')
  .eq('user_id', user.id)
  .eq('name', seed.program.name)
  .maybeSingle()
if (priorErr) fail(`checking for existing program: ${priorErr.message}`)

if (prior) {
  if (!replace) {
    // exercises/alternates/videos above still refreshed — that's the point
    // of a re-run; the program structure itself is only rebuilt on demand
    console.log(`Program "${seed.program.name}" already exists — left untouched (use --replace to rebuild)`)
    console.log('✅ Seed complete')
    process.exit(0)
  }
  const { error } = await db.from('program').delete().eq('id', prior.id)
  if (error)
    fail(
      `deleting existing program: ${error.message}\n` +
        '(set_log history referencing its slots blocks deletion on purpose)',
    )
  console.log('Existing program deleted (--replace)')
}

const { data: program, error: progErr } = await db
  .from('program')
  .insert({ ...seed.program, user_id: user.id })
  .select('id')
  .single()
if (progErr) fail(`inserting program: ${progErr.message}`)

for (const day of seed.days) {
  const { data: dayRow, error: dayErr } = await db
    .from('program_day')
    .insert({ program_id: program.id, day_index: day.day_index, label: day.label })
    .select('id')
    .single()
  if (dayErr) fail(`inserting day "${day.label}": ${dayErr.message}`)

  const { error: slotErr } = await db.from('program_day_exercise').insert(
    day.slots.map((slot, i) => ({
      program_day_id: dayRow.id,
      exercise_id: id(slot.exercise),
      slot_order: i,
      target_sets: slot.sets,
      target_reps: slot.reps,
      rest_seconds: slot.rest_seconds,
    })),
  )
  if (slotErr) fail(`inserting slots for "${day.label}": ${slotErr.message}`)
  console.log(`Day ${day.day_index} ${day.label}: ${day.slots.length} slots`)
}

console.log('✅ Seed complete')
