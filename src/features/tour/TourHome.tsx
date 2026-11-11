import { Link } from 'react-router'
import { Badge, Card, Page, Section } from '../../components/ui'
import { content, familiesById, stylesById, stylesOfFamily } from '../../content'
import { useUserStore } from '../../store/userStore'

export function TourHome() {
  const { state } = useUserStore()
  const visited = new Set(state.progress.visitedStyles)
  const resume = state.progress.tour
  const resumeFamily = resume ? familiesById.get(resume.family) : undefined
  const resumeStyle = resume?.style ? stylesById.get(resume.style) : undefined

  return (
    <Page title="画风地图" subtitle="九个大类，七十多种风格，从古埃及纸草书到今天的扁平插画。">
      {resumeFamily && (
        <Link to={resumeStyle ? `/style/${resumeStyle.id}` : `/tour/${resumeFamily.id}`} className="block">
          <Card className="border-accent/40 bg-accent-soft">
            <div className="text-xs text-accent">继续上次</div>
            <div className="mt-1 font-serif text-lg font-semibold">
              {resumeFamily.nameZh}
              {resumeStyle && ` · ${resumeStyle.nameZh}`}
            </div>
          </Card>
        </Link>
      )}

      <Section title="九个章节" aside={<span className="text-xs text-muted">按历史脉络</span>}>
        <ol className="space-y-3">
          {content.families.map((family) => {
            const styles = stylesOfFamily(family.id)
            const seen = styles.filter((s) => visited.has(s.id)).length
            return (
              <li key={family.id}>
                <Link to={`/tour/${family.id}`} className="block active:opacity-80">
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="font-serif text-2xl leading-none text-muted tabular-nums">{family.order}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-lg font-semibold leading-snug">{family.nameZh}</h3>
                          {styles.length === 0 && <Badge>施工中</Badge>}
                        </div>
                        <div className="text-xs text-muted">{family.nameEn}</div>
                        <p className="mt-2 text-sm leading-relaxed">{family.glance}</p>
                        <div className="mt-2 text-xs text-muted">
                          已上线 {styles.length} / {family.planned} 种
                          {seen > 0 && ` · 看过 ${seen}`}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ol>
      </Section>
    </Page>
  )
}
