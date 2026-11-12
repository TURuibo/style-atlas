import { ArrowRight, ExternalLink as ExternalIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AttributeBars } from '../../components/AttributeBars'
import { RatingBar } from '../../components/RatingBar'
import { Chip, Page } from '../../components/ui'
import { artImgAttrs, artworksOfStyle, chapterLabel, chaptersById, publicUrl, regionName, stylesById, tourChapters } from '../../content'
import type { Style } from '../../content/schema'
import { externalSearchLinks } from '../../lib/links'
import { latestScore } from '../../lib/storage'
import { nextStation } from '../../lib/tour'
import { useUserStore } from '../../store/userStore'
import { NotFound } from '../NotFound'
import { AddScrapButton, useStyleScraps } from '../scrapbook/ScrapbookSection'
import { artworkSrcSet } from '../style/Gallery'
import { artworkAlt, useViewer } from '../viewer/useViewer'

/** 横滑条里一张图的尺寸：按原比例，不超过 56% 屏高、26rem，宽度不超过 85% 屏宽，不留空边 */
const stripItemStyle = (width: number, height: number) => ({
  aspectRatio: `${width} / ${height}`,
  height: `min(56vh, 26rem, calc(85vw * ${height} / ${width}))`,
})

/**
 * 导览的一站（SPEC §4.4）：横滑看作品，名字、地域年代、一句话、三条“怎么看”、评分，
 * “深入了解”去风格页，“下一站”按站序走。没有开放图的风格先显示你剪贴簿里的图，再给外链。
 */
export function StationPage() {
  const { chapterId = '', styleId = '' } = useParams()
  const chapter = chaptersById.get(chapterId)
  const style = stylesById.get(styleId)
  const navigate = useNavigate()
  const visitStyle = useUserStore((s) => s.visitStyle)
  const setTourPosition = useUserStore((s) => s.setTourPosition)
  const score = useUserStore((s) => latestScore(s.state.ratings, 'style', styleId))
  const rate = useUserStore((s) => s.rate)
  const viewer = useViewer()
  const strip = useRef<HTMLDivElement>(null)

  const onChapter = Boolean(chapter && style && chapter.styles.includes(style.id))
  const next = onChapter ? nextStation(tourChapters, { chapter: chapter!.id, style: style!.id }) : null
  const nextStyle = next ? stylesById.get(next.style) : undefined
  const nextChapter = next ? chaptersById.get(next.chapter) : undefined

  useEffect(() => {
    if (!onChapter) return
    visitStyle(style!.id)
    setTourPosition(chapter!.id, style!.id)
    strip.current?.scrollTo({ left: 0 })
  }, [onChapter, style, chapter, visitStyle, setTourPosition])

  // 预加载下一站的前 3 张缩略图，切站时不空白
  useEffect(() => {
    if (!nextStyle) return
    for (const art of artworksOfStyle(nextStyle.id).slice(0, 3)) {
      const img = new Image()
      img.src = publicUrl(art.img.thumb)
    }
  }, [nextStyle])

  if (!chapter || !style || !onChapter) return <NotFound />
  const stationNumber = chapter.styles.indexOf(style.id) + 1
  const artworks = artworksOfStyle(style.id)

  return (
    <Page
      back
      kicker={`${chapterLabel(chapter)} ${chapter.nameZh} · 第 ${stationNumber}/${chapter.styles.length} 站`}
      title={style.nameZh}
      subtitle={[style.nameEn, style.nameOriginal].filter(Boolean).join(' · ')}
    >
      <div className="flex flex-wrap gap-1.5">
        {style.regions.map((r) => (
          <Chip key={r}>{regionName(r)}</Chip>
        ))}
        <Chip>{style.era.label}</Chip>
      </div>

      {artworks.length > 0 ? (
        <div
          ref={strip}
          className="-mx-5 mt-4 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]"
          aria-label="作品，左右滑动"
        >
          {artworks.map((art, i) => (
            <button
              key={art.id}
              type="button"
              onClick={() => viewer.open(artworks, i, { context: 'tour' })}
              className="shrink-0 snap-center overflow-hidden rounded-xl bg-line/60"
              aria-label={`看大图：${art.titleZh ?? art.title}`}
              style={stripItemStyle(art.img.width, art.img.height)}
            >
              <img
                {...artImgAttrs(art)}
                src={publicUrl(art.img.thumb)}
                srcSet={artworkSrcSet(art)}
                sizes="85vw"
                alt={artworkAlt(art)}
                loading={i < 2 ? 'eager' : 'lazy'}
                width={art.img.width}
                height={art.img.height}
                className="block size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <NoImageStation key={style.id} style={style} />
      )}

      {style.body.oneLiner && <p className="mt-4 font-serif text-lg leading-relaxed">{style.body.oneLiner}</p>}

      {style.body.howToLook.length > 0 && (
        <ol className="mt-4 space-y-2.5">
          {style.body.howToLook.slice(0, 3).map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="mt-0.5 font-serif text-sm text-accent tabular-nums">{i + 1}</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6">
        <p className="mb-2 text-sm text-muted">你喜欢这种风格吗？</p>
        <RatingBar label="给这种风格评分" value={score} onRate={(s) => rate('style', style.id, s, 'tour')} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link
          to={`/style/${style.id}`}
          className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface text-sm font-medium active:opacity-80"
        >
          深入了解
        </Link>
        {next && nextStyle ? (
          <button
            type="button"
            onClick={() => navigate(`/tour/${next.chapter}/${next.style}`, { replace: true })}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-accent px-2 text-sm font-medium text-paper active:opacity-80"
          >
            下一站：{nextStyle.nameZh}
            <ArrowRight size={16} aria-hidden />
          </button>
        ) : (
          <Link
            to="/"
            className="flex min-h-12 items-center justify-center rounded-xl bg-accent text-sm font-medium text-paper active:opacity-80"
          >
            走完了，回到导览
          </Link>
        )}
      </div>
      {nextChapter && next && next.chapter !== chapter.id && (
        <p className="mt-2 text-center text-xs text-muted">
          这一{chapter.group === 'modern' ? '段' : '章'}走完了，下一站进入{chapterLabel(nextChapter)} {nextChapter.nameZh}
        </p>
      )}
      {!next && chapter.group === 'modern' && (
        <p className="mt-2 text-center text-xs text-muted">现代线路走完了。想看更早的源头，可以去首页的“溯源”。</p>
      )}
      {viewer.element}
    </Page>
  )
}

/** 没有开放图的站：先放剪贴簿里的图，再给外链和“看图时留意这几点” */
function NoImageStation({ style }: { style: Style }) {
  const { items, thumbs, openAt, viewerElement } = useStyleScraps(style)
  const links = externalSearchLinks(style.externalSearch, { sources: style.sources, name: style.nameZh }, style.externalExtra)

  return (
    <>
      {items.length > 0 && (
        <div className="-mx-5 mt-4 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none]" aria-label="我存的图，左右滑动">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openAt(i)}
              className="shrink-0 snap-center overflow-hidden rounded-xl bg-line/60"
              aria-label={`看大图：我存的第 ${i + 1} 张`}
              style={stripItemStyle(item.width, item.height)}
            >
              {thumbs[item.id] && <img src={thumbs[item.id]} alt="" className="block size-full object-cover" />}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm text-muted">
          {items.length > 0
            ? `上面是你存的 ${items.length} 张。还想多看，就去外面找找：`
            : '这种风格还找不到能放进应用的开放图。去外面看看，喜欢的存到相册，再加进剪贴簿：'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 text-sm active:opacity-70"
            >
              {link.label}
              <ExternalIcon size={14} aria-hidden className="text-muted" />
            </a>
          ))}
        </div>
        <div className="mt-3">
          <AddScrapButton style={style} label={items.length > 0 ? '再加几张' : '加进剪贴簿'} />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted">看图时留意这几点</p>
          <AttributeBars attributes={style.attributes} />
        </div>
      </div>
      {viewerElement}
    </>
  )
}
