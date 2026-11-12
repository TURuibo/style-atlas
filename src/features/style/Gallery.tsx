import { artImgAttrs, artworksOfStyle, publicUrl } from '../../content'
import type { Artwork, Style } from '../../content/schema'
import type { RatingContext } from '../../lib/storage'
import { artworkAlt, useViewer } from '../viewer/useViewer'

/** 缩略图在 480 和 1600 两档里由浏览器挑（SPEC §10.6） */
export function artworkSrcSet(art: Artwork): string {
  return `${publicUrl(art.img.thumb)} 480w, ${publicUrl(art.img.display)} 1600w`
}

/** 风格页的作品墙：两列按原比例排，封面在前；点开进看图器 */
export function Gallery({ style, context = 'browse' }: { style: Style; context?: RatingContext }) {
  const artworks = artworksOfStyle(style.id)
  const viewer = useViewer()

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
              onClick={() => viewer.open(artworks, i, { context })}
              className="block w-full overflow-hidden rounded-xl bg-line/60"
              aria-label={`看大图：${art.titleZh ?? art.title}`}
            >
              <img
                {...artImgAttrs(art)}
                src={publicUrl(art.img.thumb)}
                srcSet={artworkSrcSet(art)}
                sizes="(max-width: 640px) 46vw, 300px"
                alt={artworkAlt(art)}
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
      {viewer.element}
    </>
  )
}
