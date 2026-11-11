import { useEffect } from 'react'
import { useParams } from 'react-router'
import { Badge, Card, ListLink, Page, Section } from '../../components/ui'
import { coverOfStyle, familiesById, publicUrl, regionName, stylesOfFamily } from '../../content'
import { useUserStore } from '../../store/userStore'
import { NotFound } from '../NotFound'

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

  return (
    <Page back kicker={`第 ${family.order} 章 · ${family.nameEn}`} title={family.nameZh} subtitle={family.glance}>
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
      </Card>

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
                  to={`/style/${style.id}`}
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
