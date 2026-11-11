import { SkipForward, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { RatingBar, scoreLabels } from '../../components/RatingBar'
import { artworksById, publicUrl } from '../../content'
import { activeBlindRound, type Score } from '../../lib/storage'
import { classifyGesture } from '../../lib/swipe'
import { useUserStore } from '../../store/userStore'
import { useViewer } from '../viewer/useViewer'

const PRELOAD_AHEAD = 3

/** 安卓上轻震一下；不支持的浏览器（如 iOS Safari）什么也不做 */
function haptic() {
  try {
    navigator.vibrate?.(12)
  } catch {
    // 忽略
  }
}

/**
 * 盲测进行中（SPEC §4.1、§4.2）：只有图，没有任何名字。
 * 底部拇指区评分；左滑 −1、右滑 +1、上滑 +2；可跳过、撤销上一张；点图放大。
 * 全屏覆盖在页面上，盖住底部标签栏，免得误触。
 */
export function BlindSession({ onExit, onFinish }: { onExit: () => void; onFinish: () => void }) {
  const round = useUserStore((s) => activeBlindRound(s.state))
  const rateBlind = useUserStore((s) => s.rateBlind)
  const skipBlind = useUserStore((s) => s.skipBlind)
  const undoBlind = useUserStore((s) => s.undoBlind)
  const [flash, setFlash] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null)
  const preloaded = useRef<HTMLImageElement[]>([])
  const viewer = useViewer()

  const total = round?.artworkIds.length ?? 0
  const position = round?.position ?? 0
  const art = round ? artworksById.get(round.artworkIds[position] ?? '') : undefined
  const label = `盲测图片 ${position + 1}/${total}`

  // 预加载后 3 张
  useEffect(() => {
    if (!round) return
    preloaded.current = round.artworkIds.slice(position + 1, position + 1 + PRELOAD_AHEAD).flatMap((id) => {
      const next = artworksById.get(id)
      if (!next) return []
      const img = new Image()
      img.decoding = 'async'
      img.src = publicUrl(next.img.display)
      return [img]
    })
  }, [round, position])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 700)
    return () => {
      clearTimeout(t)
    }
  }, [flash])

  const rate = (score: Score) => {
    if (!round) return
    haptic()
    setFlash(`${score > 0 ? '+' : ''}${score} ${scoreLabels[score]}`)
    const last = position + 1 >= total
    rateBlind(score)
    if (last) onFinish()
  }
  const skip = () => {
    if (!round) return
    const last = position + 1 >= total
    skipBlind()
    if (last) onFinish()
  }

  // 桌面上也能用键盘：← → ↑ 评分，1–5 对应五档，S 跳过，Z 撤销
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('.pswp')) return
      const keys: Record<string, Score> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 2, '1': -2, '2': -1, '3': 0, '4': 1, '5': 2 }
      const score = keys[e.key]
      if (score !== undefined) {
        e.preventDefault()
        rate(score)
      } else if (e.key === 's' || e.key === 'S') skip()
      else if (e.key === 'z' || e.key === 'Z') undoBlind()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  })

  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return
    start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s || s.id !== e.pointerId || !art) return
    const g = classifyGesture(e.clientX - s.x, e.clientY - s.y, e.timeStamp - s.t)
    if (g.kind === 'rate') rate(g.score)
    else if (g.kind === 'tap') viewer.open([art], 0, { mode: 'blind', blindLabel: label })
  }

  if (!round || !art) return null

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper" role="region" aria-label="盲测">
      <div className="pt-safe">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-3 py-1">
          <button
            type="button"
            onClick={onExit}
            className="flex size-11 items-center justify-center rounded-full text-muted active:bg-line/60"
            aria-label="先停下，下次接着测"
          >
            <X size={22} aria-hidden />
          </button>
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
              <div className="h-full bg-accent" style={{ width: `${(position / total) * 100}%` }} />
            </div>
          </div>
          <span className="w-14 text-right text-sm tabular-nums text-muted" aria-live="polite">
            {position + 1}/{total}
          </span>
        </div>
      </div>

      <div
        className="relative mx-auto flex min-h-0 w-full max-w-xl flex-1 touch-none select-none items-center justify-center px-3"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null
        }}
      >
        {loadedId !== art.id && (
          <span className="absolute text-sm text-muted" aria-hidden>
            图片加载中…
          </span>
        )}
        <img
          key={art.id}
          src={publicUrl(art.img.display)}
          alt={label}
          width={art.img.width}
          height={art.img.height}
          draggable={false}
          onLoad={() => setLoadedId(art.id)}
          className="relative max-h-full max-w-full rounded-lg object-contain shadow-sm"
        />
        {flash && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/80 px-4 py-2 text-sm text-paper"
            aria-hidden
          >
            {flash}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-xl px-3 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        <RatingBar label={`给${label}评分`} onRate={rate} />
        <div className="mt-1.5 flex items-center justify-between text-sm text-muted">
          <button
            type="button"
            onClick={undoBlind}
            disabled={position === 0}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 active:bg-line/60 disabled:opacity-30"
          >
            <Undo2 size={16} aria-hidden />
            撤销上一张
          </button>
          <span className="hidden text-xs sm:inline">← 不太喜欢 · → 喜欢 · ↑ 超爱</span>
          <button
            type="button"
            onClick={skip}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 active:bg-line/60"
          >
            跳过
            <SkipForward size={16} aria-hidden />
          </button>
        </div>
      </div>
      {viewer.element}
    </div>
  )
}
