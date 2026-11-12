import { ExternalLink, Heart, Trash2 } from 'lucide-react'
import type PhotoSwipe from 'photoswipe'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { RatingBar } from '../../components/RatingBar'
import { publicUrl, stylesById } from '../../content'
import { museumSources, type Artwork } from '../../content/schema'
import { matchKeyArtist } from '../../lib/artists'
import { latestScore, type RatingContext } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'

export interface ViewerOptions {
  /** blind：盲测里放大看图，不显示任何信息 */
  mode?: 'full' | 'blind'
  /** 盲测时图片的替代文字，如“盲测图片 7/24” */
  blindLabel?: string
  /** 在看图器里给单幅评分时记的场景 */
  context?: RatingContext
}

/** 剪贴簿里的一张图（SPEC §4.5） */
export interface ScrapView {
  id: string
  src: string
  width: number
  height: number
  styleName: string
  addedAt: string
}

interface Slide {
  src: string
  width: number
  height: number
  alt: string
  /** 像素画：放大时不做平滑 */
  pixelated?: boolean
}

type ViewerState =
  | { pswp: PhotoSwipe; index: number; kind: 'artworks'; artworks: Artwork[]; options: ViewerOptions }
  | { pswp: PhotoSwipe; index: number; kind: 'scraps'; scraps: ScrapView[]; onDelete: (id: string) => void }

type Content = Omit<Extract<ViewerState, { kind: 'artworks' }>, 'pswp' | 'index'> | Omit<Extract<ViewerState, { kind: 'scraps' }>, 'pswp' | 'index'>

/** 图片替代文字：作品名，画家，年代（SPEC §4.11） */
export function artworkAlt(art: Artwork): string {
  return [art.titleZh ?? art.title, art.artist, art.date].filter(Boolean).join('，')
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * 看图器（SPEC §4.6）：PhotoSwipe 5 负责双指缩放、双击放大、左右滑换图、下滑关闭；
 * 信息面板用 React 渲染进 PhotoSwipe 的根元素，许可信息始终可见。
 * 打开时压一条历史记录，安卓的返回键先关看图器。剪贴簿的图用同一个看图器，面板换成“我存的图”。
 */
export function useViewer(): {
  open: (artworks: Artwork[], index: number, options?: ViewerOptions) => void
  openScraps: (scraps: ScrapView[], index: number, onDelete: (id: string) => void) => void
  element: ReactNode
} {
  const [state, setState] = useState<ViewerState | null>(null)
  const current = useRef<PhotoSwipe | null>(null)

  const launch = useCallback((slides: Slide[], index: number, blind: boolean, content: Content) => {
    if (current.current || slides.length === 0) return
    void (async () => {
      const [{ default: PhotoSwipeClass }] = await Promise.all([import('photoswipe'), import('photoswipe/style.css')])
      const pswp = new PhotoSwipeClass({
        dataSource: slides,
        index,
        bgOpacity: 1,
        showHideAnimationType: reducedMotion() ? 'none' : 'fade',
        closeOnVerticalDrag: true,
        pinchToClose: true,
        doubleTapAction: 'zoom',
        tapAction: false,
        counter: !blind && slides.length > 1,
        indexIndicatorSep: ' / ',
        // 底部留给信息面板
        paddingFn: (viewport) => ({ top: 52, bottom: blind ? 12 : Math.round(viewport.y * 0.36), left: 0, right: 0 }),
        preload: [1, 2],
        closeTitle: '关闭',
        zoomTitle: '放大',
        arrowPrevTitle: '上一幅',
        arrowNextTitle: '下一幅',
        errorMsg: '图片没能加载',
        mainClass: 'pswp--atlas',
      })

      let closedByBack = false
      const onPop = () => {
        closedByBack = true
        pswp.close()
      }
      window.history.pushState({ atlasViewer: true }, '')
      window.addEventListener('popstate', onPop)

      pswp.on('contentAppend', ({ content: slide }) => {
        if ((slide.data as Slide).pixelated && slide.element) slide.element.dataset.pixelated = ''
      })
      pswp.on('change', () => setState((s) => (s ? { ...s, index: pswp.currIndex } : s)))
      pswp.on('destroy', () => {
        window.removeEventListener('popstate', onPop)
        if (!closedByBack && (window.history.state as { atlasViewer?: boolean } | null)?.atlasViewer) window.history.back()
        current.current = null
        setState(null)
      })
      pswp.init()
      current.current = pswp
      setState({ pswp, index, ...content } as ViewerState)
    })()
  }, [])

  const open = useCallback(
    (artworks: Artwork[], index: number, options: ViewerOptions = {}) => {
      const blind = options.mode === 'blind'
      const slides = artworks.map((a) => ({
        src: publicUrl(a.img.display),
        width: a.img.width,
        height: a.img.height,
        alt: blind ? (options.blindLabel ?? '盲测图片') : artworkAlt(a),
        ...(a.pixelated ? { pixelated: true } : {}),
      }))
      launch(slides, index, blind, { kind: 'artworks', artworks, options })
    },
    [launch],
  )

  const openScraps = useCallback(
    (scraps: ScrapView[], index: number, onDelete: (id: string) => void) => {
      const slides = scraps.map((s) => ({ src: s.src, width: s.width, height: s.height, alt: `我存的图：${s.styleName}` }))
      launch(slides, index, false, { kind: 'scraps', scraps, onDelete })
    },
    [launch],
  )

  // 页面卸载时关掉还开着的看图器
  useEffect(() => () => current.current?.destroy(), [])

  let element: ReactNode = null
  if (state?.pswp.element) {
    let panel: ReactNode = null
    if (state.kind === 'scraps') {
      const scrap = state.scraps[state.index]
      if (scrap)
        panel = (
          <ScrapPanel
            key={scrap.id}
            scrap={scrap}
            onDelete={() => {
              state.onDelete(scrap.id)
              state.pswp.close()
            }}
          />
        )
    } else if (state.options.mode === 'blind') {
      panel = (
        <div className="absolute left-4 top-0 z-10 pt-safe text-xs leading-[44px] text-white/70">
          {state.options.blindLabel ?? '盲测图片'}
        </div>
      )
    } else {
      const art = state.artworks[state.index]
      if (art) panel = <InfoPanel artwork={art} context={state.options.context ?? 'browse'} />
    }
    element = createPortal(panel, state.pswp.element)
  }
  return { open, openScraps, element }
}

/** 作品作者若是所属风格的代表人物，显示中文名和生卒年 */
function keyArtistOf(artwork: Artwork) {
  for (const id of artwork.styleIds) {
    const hit = matchKeyArtist(artwork.artist, stylesById.get(id)?.keyArtists ?? [])
    if (hit) return hit
  }
  return undefined
}

const panelClass = 'absolute inset-x-0 bottom-0 z-10 max-h-[36%] overflow-y-auto bg-black/90 px-4 pt-3 text-white'
const panelStyle = { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)', touchAction: 'pan-y' } as const

function InfoPanel({ artwork, context }: { artwork: Artwork; context: RatingContext }) {
  const score = useUserStore((s) => latestScore(s.state.ratings, 'artwork', artwork.id))
  const favorite = useUserStore((s) => s.state.favorites.includes(artwork.id))
  const rate = useUserStore((s) => s.rate)
  const toggleFavorite = useUserStore((s) => s.toggleFavorite)
  const artist = keyArtistOf(artwork)
  const museum = museumSources.includes(artwork.source)

  return (
    <div className={panelClass} style={panelStyle}>
      <p className="font-serif text-[15px] leading-snug">{artwork.titleZh ?? artwork.title}</p>
      {artwork.titleZh && <p className="text-xs text-white/60">{artwork.title}</p>}
      {artist && (
        <p className="mt-0.5 text-xs text-white/80">
          {artist.zh}
          {artist.life && `（${artist.life}）`}
        </p>
      )}
      {artwork.medium && <p className="mt-0.5 text-xs text-white/60">{artwork.medium}</p>}
      <p className="mt-1.5 text-xs leading-relaxed text-white/85">
        {artwork.credit}
        {artwork.licenseUrl && (
          <>
            {' '}
            <a href={artwork.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              许可原文
            </a>
          </>
        )}
      </p>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => toggleFavorite(artwork.id)}
          aria-pressed={favorite}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs active:bg-white/10"
        >
          <Heart size={16} aria-hidden fill={favorite ? 'currentColor' : 'none'} />
          {favorite ? '已收藏' : '收藏'}
        </button>
        <a
          href={artwork.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs text-white/85 underline underline-offset-2 active:bg-white/10"
        >
          {museum ? '去博物馆网站看高清' : '去来源网站看原图'}
          <ExternalLink size={12} aria-hidden />
        </a>
      </div>
      <RatingBar
        tone="dark"
        compact
        label="给这幅作品评分"
        value={score}
        onRate={(s) => rate('artwork', artwork.id, s, context)}
      />
    </div>
  )
}

/** 剪贴簿的图：只说明来源是你自己，删除要点两次 */
function ScrapPanel({ scrap, onDelete }: { scrap: ScrapView; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className={panelClass} style={panelStyle}>
      <p className="font-serif text-[15px] leading-snug">我存的图 · {scrap.styleName}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/70">
        {new Date(scrap.addedAt).toLocaleDateString('zh-CN')} 加入剪贴簿。只存在这台手机上，不上传，也不在备份文件里。
      </p>
      <button
        type="button"
        onClick={() => (confirming ? onDelete() : setConfirming(true))}
        className="-ml-2 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs text-white/85 active:bg-white/10"
      >
        <Trash2 size={15} aria-hidden />
        {confirming ? '再点一次，确认删除' : '从剪贴簿删除'}
      </button>
    </div>
  )
}
