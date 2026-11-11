import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { artworksOfStyle, publicUrl } from '../../content'
import type { Artwork, Style } from '../../content/schema'

/** 作品显示名：有把握的中文名在前，原名在后 */
export function artworkTitle(art: Artwork): string {
  return art.titleZh ? `${art.titleZh}（${art.title}）` : art.title
}

/** 风格页的图廊：两列按原比例排，点开是全屏看图器（Phase 3 换成可缩放的看图器） */
export function Gallery({ style }: { style: Style }) {
  const artworks = artworksOfStyle(style.id)
  const [open, setOpen] = useState<number | null>(null)

  if (style.imageMode === 'external-only') return null
  if (artworks.length === 0) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2" aria-label="图片准备中">
        {[0, 1].map((i) => (
          <div key={i} className="flex aspect-[3/4] items-center justify-center rounded-xl bg-line/60 text-xs text-muted">
            图片准备中
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="mt-5 columns-2 gap-2">
        {artworks.map((art, i) => (
          <figure key={art.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="block w-full overflow-hidden rounded-xl bg-line/60"
              aria-label={`看大图：${artworkTitle(art)}`}
            >
              <img
                src={publicUrl(art.img.thumb)}
                alt={[art.titleZh ?? art.title, art.artist, art.date].filter(Boolean).join('，')}
                loading="lazy"
                width={art.img.width}
                height={art.img.height}
                className="block h-auto w-full"
              />
            </button>
            <figcaption className="mt-1 px-0.5 text-[11px] leading-snug text-muted">
              <span className="line-clamp-2 text-ink/80">{art.titleZh ?? art.title}</span>
              <span className="line-clamp-1">{[art.artist, art.date].filter(Boolean).join(' · ')}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="text-[11px] text-muted">图片均为博物馆开放的公共领域或 CC0 藏品，点开可看出处与许可。</p>
      {open !== null && (
        <Viewer artworks={artworks} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

function Viewer({
  artworks,
  index,
  onIndex,
  onClose,
}: {
  artworks: Artwork[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const art = artworks[index]!
  const closeRef = useRef<HTMLButtonElement>(null)
  const go = useCallback(
    (delta: number) => onIndex((index + delta + artworks.length) % artworks.length),
    [index, artworks.length, onIndex],
  )

  useEffect(() => {
    closeRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [go, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={artworkTitle(art)}
      className="fixed inset-0 z-50 flex flex-col bg-gallery text-white"
    >
      <div className="pt-safe flex items-center justify-between px-2">
        <span className="px-3 text-xs text-white/60">
          {index + 1} / {artworks.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full active:bg-white/10"
          aria-label="关闭"
        >
          <X size={22} aria-hidden />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <img
          key={art.id}
          src={publicUrl(art.img.display)}
          alt={[art.titleZh ?? art.title, art.artist, art.date].filter(Boolean).join('，')}
          width={art.img.width}
          height={art.img.height}
          className="max-h-full max-w-full object-contain"
        />
        {artworks.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 active:bg-black/60"
              aria-label="上一幅"
            >
              <ChevronLeft size={22} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 active:bg-black/60"
              aria-label="下一幅"
            >
              <ChevronRight size={22} aria-hidden />
            </button>
          </>
        )}
      </div>

      <div
        className="max-h-[38vh] overflow-y-auto px-5 pt-3 text-sm"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        <p className="font-serif text-base leading-snug">{art.titleZh ?? art.title}</p>
        {art.titleZh && <p className="mt-0.5 text-xs text-white/60">{art.title}</p>}
        {art.medium && <p className="mt-1 text-xs text-white/70">{art.medium}</p>}
        <p className="mt-2 text-xs leading-relaxed text-white/80">{art.credit}</p>
        <a
          href={art.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-white/80 underline underline-offset-2"
        >
          原始页面
          <ExternalLink size={12} aria-hidden />
        </a>
      </div>
    </div>
  )
}
