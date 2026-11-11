import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { Badge, Card, Chip, ListLink, Page, Section } from '../../components/ui'
import { artworksById, coverOfStyle, familiesById, formatYear, publicUrl, regionName, stylesOfFamily } from '../../content'
import type { Artwork } from '../../content/schema'
import { useUserStore } from '../../store/userStore'
import { NotFound } from '../NotFound'

/**
 * 章节开头（SPEC §4.4）：大类一句话、3 条标志特征、覆盖的地域与年代、3 张代表图，
 * 下面是按年代排的站。
 */
export function ChapterPage() {
  const { familyId = '' } = useParams()
  const family = familiesById.get(familyId)
  const setTourPosition = useUserStore((s) => s.setTourPosition)
  const visited = useUserStore((s) => s.state.progress.visitedStyles)

  useEffect(() => {
    if (family) setTourPosition(family.id)
  }, [family, setTourPosition])

  if (!family) return <NotFound />
  const styles = stylesOfFamily(family.id)
  const regions = [...new Set(styles.flatMap((s) => s.regions))]
  const start = Math.min(...styles.map((s) => s.era.start))
  const ends = styles.map((s) => s.era.end)
  const end = ends.includes(null) ? null : Math.max(...(ends as number[]))
  // 代表图：大类指定的，不够再用各站封面
  const picks: Artwork[] = [
    ...family.coverArtworkIds.map((id) => artworksById.get(id)).filter((a): a is Artwork => Boolean(a)),
    ...styles.map(coverOfStyle).filter((a): a is Artwork => Boolean(a)),
  ]
  const images = [...new Map(picks.map((a) => [a.id, a])).values()].slice(0, 3)

  return (
    <Page back kicker={`第 ${family.order} 章 · ${family.nameEn}`} title={family.nameZh} subtitle={family.glance}>
      {images.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {images.map((art) => (
            <img
              key={art.id}
              src={publicUrl(art.img.thumb)}
              alt={[art.titleZh ?? art.title, art.artist, art.date].filter(Boolean).join('，')}
              className="aspect-[3/4] w-full rounded-lg bg-line/60 object-cover"
            />
          ))}
        </div>
      )}

      <Card>
        <p className="leading-relaxed">{family.summary}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {family.traits.map((trait) => (
            <li key={trait} className="flex gap-2">
              <span aria-hidden className="text-accent">
                ◆
              </span>
              {trait}
            </li>
          ))}
        </ul>
        {styles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {regions.map((r) => (
              <Chip key={r} to={`/explore/region/${r}`}>
                {regionName(r)}
              </Chip>
            ))}
            <Chip>
              {formatYear(start)}–{end === null ? '今' : formatYear(end)}
            </Chip>
          </div>
        )}
      </Card>

      {styles.length > 0 && (
        <Link
          to={`/tour/${family.id}/${styles[0]!.id}`}
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-accent text-sm font-medium text-paper active:opacity-80"
        >
          从第一站开始
        </Link>
      )}

      <Section title="这一章的站" aside={<span className="text-xs text-muted">按年代</span>}>
        {styles.length === 0 ? (
          <p className="text-sm text-muted">这一章的内容还在准备，计划 {family.planned} 种风格。</p>
        ) : (
          <div>
            {styles.map((style) => {
              const cover = coverOfStyle(style)
              return (
                <ListLink
                  key={style.id}
                  to={`/tour/${family.id}/${style.id}`}
                  title={style.nameZh}
                  detail={`${style.nameEn} · ${style.regions.map(regionName).join('、')} · ${style.era.label}`}
                  badge={
                    <>
                      {style.status === 'draft' && <Badge>施工中</Badge>}
                      {style.imageMode === 'external-only' && <Badge>外链看图</Badge>}
                      {visited.includes(style.id) && <Badge tone="accent">看过</Badge>}
                    </>
                  }
                  leading={
                    cover ? (
                      <img
                        src={publicUrl(cover.img.thumb)}
                        alt=""
                        loading="lazy"
                        className="size-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="size-14 shrink-0 rounded-lg bg-line/70" aria-hidden />
                    )
                  }
                />
              )
            })}
          </div>
        )}
      </Section>
    </Page>
  )
}
