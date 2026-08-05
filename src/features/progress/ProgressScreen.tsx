import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { HelpButton, HelpItem } from '../../components/HelpButton'
import { useSlotPicker, useSlotProgression } from './queries'

type Metric = 'est_1rm' | 'top_weight' | 'volume'
const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'est_1rm', label: 'EST 1RM', unit: 'lb' },
  { key: 'top_weight', label: 'TOP SET', unit: 'lb' },
  { key: 'volume', label: 'VOLUME', unit: 'lb' },
]

export function ProgressScreen() {
  const navigate = useNavigate()
  const picker = useSlotPicker()
  const [dayIdx, setDayIdx] = useState(0)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('est_1rm')

  const day = picker.data?.[dayIdx]
  // default to the day's first slot until one is tapped
  const activeSlotId = slotId ?? day?.slots[0]?.id ?? null
  const series = useSlotProgression(activeSlotId)

  const points = useMemo(
    () =>
      (series.data ?? []).map((r) => ({
        day: r.day,
        value: r[metric],
        performed: r.performed,
        swapped: r.was_swapped ?? false,
      })),
    [series.data, metric],
  )

  if (picker.isPending) return <Shell onBack={() => void navigate('/')} />

  return (
    <Shell onBack={() => void navigate('/')}>
      {/* day tabs */}
      <div className="flex gap-2">
        {picker.data?.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDayIdx(i)
              setSlotId(null)
            }}
            className={`h-11 flex-1 rounded-sm border font-display text-sm font-bold tracking-wide uppercase ${
              i === dayIdx ? 'border-plate-blue text-ink' : 'border-raised text-muted'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* slot chips */}
      <div className="grid grid-cols-2 gap-2">
        {day?.slots.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSlotId(s.id)}
            className={`h-14 rounded-sm border px-2 text-sm leading-tight ${
              s.id === activeSlotId ? 'border-plate-blue bg-raised text-ink' : 'border-raised text-muted'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* metric toggle */}
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`h-11 flex-1 rounded-sm border font-mono text-xs ${
              m.key === metric ? 'border-plate-blue text-ink' : 'border-raised text-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* chart */}
      {points.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          {series.isPending && activeSlotId ? '…' : 'No sets logged for this slot yet.'}
        </p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#232220" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(d: string) => d.slice(5).replace('-', '/')}
                tick={{ fill: '#8A8580', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                axisLine={{ stroke: '#232220' }}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#8A8580', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<PointTooltip />} cursor={{ stroke: '#8A8580', strokeDasharray: '3 3' }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-chart-blue)"
                strokeWidth={2}
                isAnimationActive={false}
                dot={<SwapAwareDot />}
                activeDot={{ r: 5, fill: 'var(--color-chart-blue)', stroke: '#1B1A18', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="font-mono text-xs text-muted">
        <span className="text-plate-yellow">●</span> = performed on a substitute exercise
      </p>

      <HelpButton title="Reading this chart">
        <HelpItem term="EST 1RM">
          estimated one-rep max — the heaviest single lift your best set predicts (Epley formula).
          The cleanest single number for "am I getting stronger".
        </HelpItem>
        <HelpItem term="TOP SET">the heaviest weight you actually lifted that day.</HelpItem>
        <HelpItem term="VOLUME">total pounds moved that day (weight × reps, all sets summed).</HelpItem>
        <HelpItem term="yellow dot">
          that day you did a substitute exercise (equipment was taken), so a dip there isn't lost
          strength. Tap a dot to see what you performed.
        </HelpItem>
      </HelpButton>
    </Shell>
  )
}

/* Recharts injects point props at render; typing loosely is the pragmatic move. */
function SwapAwareDot(props: { cx?: number; cy?: number; payload?: { swapped: boolean } }) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined) return null
  const swapped = payload?.swapped ?? false
  return (
    <circle
      cx={cx}
      cy={cy}
      r={swapped ? 4.5 : 3}
      fill={swapped ? '#E8B923' : 'var(--color-chart-blue)'}
      stroke="#1B1A18"
      strokeWidth={2}
    />
  )
}

function PointTooltip(props: {
  active?: boolean
  payload?: { payload: { day: string; value: number; performed: string; swapped: boolean } }[]
}) {
  const p = props.payload?.[0]?.payload
  if (!props.active || !p) return null
  return (
    <div className="rounded-sm border border-raised bg-raised px-3 py-2 font-mono text-xs">
      <div className="text-muted">{p.day}</div>
      <div className="text-base text-ink">{Math.round(p.value * 10) / 10} lb</div>
      <div className={p.swapped ? 'text-plate-yellow' : 'text-muted'}>
        {p.performed}
        {p.swapped ? ' · SWAPPED' : ''}
      </div>
    </div>
  )
}

function Shell({ children, onBack }: { children?: React.ReactNode; onBack: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pt-4 pb-8 font-sans">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} aria-label="back to today"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-muted">
          ←
        </button>
        <span className="font-display text-sm font-bold tracking-wide uppercase">Progress</span>
        <span className="w-11" aria-hidden />
      </div>
      {children}
    </main>
  )
}
