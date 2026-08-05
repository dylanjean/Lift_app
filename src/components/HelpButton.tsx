import { useState } from 'react'

/**
 * Floating "?" in the bottom corner (owner request) opening a per-screen
 * how-it-works sheet. Content is authored by the host screen.
 */
export function HelpButton({
  title,
  children,
  raised = false,
}: {
  title: string
  children: React.ReactNode
  /** lift above a screen's fixed bottom bar */
  raised?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="how this screen works"
        onClick={() => setOpen(true)}
        className={`fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-raised bg-raised font-mono text-sm text-muted ${
          raised ? 'bottom-44' : 'bottom-6'
        }`}
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
          <button type="button" aria-label="close" onClick={() => setOpen(false)} className="flex-1 bg-black/60" />
          <div className="max-h-[75dvh] overflow-y-auto rounded-t-sm border-t border-raised bg-surface px-5 pt-4 pb-8">
            <p className="mb-3 font-display text-sm font-bold tracking-wide uppercase">{title}</p>
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink">{children}</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 h-14 w-full rounded-sm border border-raised bg-raised font-display text-sm font-bold text-ink"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** one help entry: a bold term + its explanation */
export function HelpItem({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="font-mono text-xs text-plate-white">{term}</span>
      <span className="text-muted"> — {children}</span>
    </p>
  )
}
