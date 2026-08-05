/**
 * Form-video bottom sheet. YouTube URLs render as an embedded
 * youtube-nocookie player (iframe is created only while the sheet is
 * open, so sessions stay light); anything else falls back to an
 * open-in-new-tab link.
 */
export function VideoSheet({
  name,
  videoUrl,
  onClose,
}: {
  name: string
  videoUrl: string
  onClose: () => void
}) {
  const ytId = youtubeId(videoUrl)
  // M&S hosts some videos on Vimeo; player.vimeo.com URLs are already
  // embed URLs (keep any h= hash — unlisted videos need it)
  const vimeo = videoUrl.startsWith('https://player.vimeo.com/')
  const embedSrc = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`
    : vimeo
      ? `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}badge=0`
      : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={`${name} form video`}>
      <button type="button" aria-label="close" onClick={onClose} className="flex-1 bg-black/60" />
      <div className="rounded-t-sm border-t border-raised bg-surface px-4 pt-4 pb-8">
        <p className="mb-3 font-display text-sm font-bold tracking-wide uppercase">{name} — form</p>
        {embedSrc ? (
          <div className="aspect-video w-full overflow-hidden rounded-sm bg-black">
            <iframe
              src={embedSrc}
              title={`${name} form video`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 items-center justify-center rounded-sm border border-raised bg-raised font-display text-sm font-bold text-plate-blue"
          >
            OPEN VIDEO ↗
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-14 w-full rounded-sm border border-raised bg-raised font-display text-sm font-bold text-ink"
        >
          CLOSE
        </button>
      </div>
    </div>
  )
}

/** watch?v=ID, youtu.be/ID, embed/ID, shorts/ID → ID; null for non-YouTube */
export function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return m?.[1] ?? null
}
