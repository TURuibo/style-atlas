import { EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Badge, Button, Card, Page, Section } from '../../components/ui'
import { artworksById, content, coverOfStyle, familiesById, publicUrl, stylesById, stylesOfFamily } from '../../content'
import type { Family } from '../../content/schema'
import { activeBlindRound } from '../../lib/storage'
import { chapterProgress } from '../../lib/tour'
import { useUserStore } from '../../store/userStore'

/** 一章的封面：大类指定的封面图，否则用第一种有封面的风格 */
function chapterCover(family: Family) {
  const own = family.coverArtworkIds.map((id) => artworksById.get(id)).find(Boolean)
  if (own) return own
  for (const style of stylesOfFamily(family.id)) {
    const cover = coverOfStyle(style)
    if (cover) return cover
  }
  return undefined
}

/** 首次打开的一屏说明（SPEC §3 流程规则 1），可跳过 */
function Welcome() {
  const markIntroSeen = useUserStore((s) => s.markIntroSeen)
  const navigate = useNavigate()
  return (
    <Page title="画风地图" subtitle="找到你真正喜欢的插画风格。">
      <Card className="mt-2">
        <EyeOff size={28} className="text-accent" aria-hidden />
        <p className="mt-3 font-serif text-xl font-semibold leading-snug">3 分钟盲测，看看你真正喜欢什么</p>
        <p className="mt-2 leading-relaxed text-muted">
          不看名字，只凭第一眼给 24 幅博物馆真迹打分。看完再揭晓每张是什么风格，然后跟着导览慢慢走。
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            variant="primary"
            onClick={() => {
              markIntroSeen()
              navigate('/blind', { state: { autostart: true } })
            }}
          >
            开始盲测
          </Button>
          <Button onClick={markIntroSeen}>先跳过，直接看导览</Button>
        </div>
      </Card>
    </Page>
  )
}

export function TourHome() {
  const ready = useUserStore((s) => s.ready)
  const state = useUserStore((s) => s.state)

  if (!ready) return <Page title="画风地图">{null}</Page>
  const firstTime =
    !state.progress.introSeenAt && state.ratings.length === 0 && state.progress.blindRounds.length === 0
  if (firstTime) return <Welcome />

  const blind = activeBlindRound(state)
  const resume = state.progress.tour
  const resumeFamily = resume ? familiesById.get(resume.family) : undefined
  const resumeStyle = resume?.style ? stylesById.get(resume.style) : undefined

  return (
    <Page title="画风地图" subtitle="九个大类，七十多种风格，从古埃及纸草书到今天的扁平插画。">
      <div className="space-y-2">
        {blind && (
          <Link to="/blind" className="block active:opacity-80">
            <Card className="border-accent/40 bg-accent-soft">
              <div className="text-xs text-accent">继续盲测</div>
              <div className="mt-1 font-serif text-lg font-semibold">
                第 {blind.number} 轮 · {blind.position}/{blind.artworkIds.length}
              </div>
            </Card>
          </Link>
        )}
        {resumeFamily && (
          <Link
            to={resumeStyle ? `/tour/${resumeFamily.id}/${resumeStyle.id}` : `/tour/${resumeFamily.id}`}
            className="block active:opacity-80"
          >
            <Card className="border-accent/40 bg-accent-soft">
              <div className="text-xs text-accent">继续</div>
              <div className="mt-1 font-serif text-lg font-semibold">
                {resumeFamily.nameZh}
                {resumeStyle && ` · ${resumeStyle.nameZh}`}
              </div>
            </Card>
          </Link>
        )}
      </div>

      <Section title="九个章节" aside={<span className="text-xs text-muted">按历史脉络</span>}>
        <ol className="space-y-3">
          {content.families.map((family) => {
            const styles = stylesOfFamily(family.id)
            const { seen, total } = chapterProgress(
              styles.map((s) => s.id),
              state.progress.visitedStyles,
            )
            const cover = chapterCover(family)
            return (
              <li key={family.id}>
                <Link to={`/tour/${family.id}`} className="block active:opacity-80">
                  <Card className="overflow-hidden p-0">
                    <div className="flex">
                      {cover ? (
                        <img
                          src={publicUrl(cover.img.thumb)}
                          alt=""
                          loading="lazy"
                          className="w-24 shrink-0 self-stretch bg-line/60 object-cover"
                        />
                      ) : (
                        <div className="w-24 shrink-0 bg-line/50" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm text-muted tabular-nums">{family.order}</span>
                          <h3 className="font-serif text-lg font-semibold leading-snug">{family.nameZh}</h3>
                          {styles.length === 0 && <Badge>施工中</Badge>}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">{family.glance}</p>
                        <div className="mt-2 text-xs text-muted">
                          {total > 0 ? `已走 ${seen}/${total} 站 · ` : ''}计划 {family.planned} 种
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
