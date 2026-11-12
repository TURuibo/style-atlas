import { EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Badge, Button, Card, ListLink, Page, Section } from '../../components/ui'
import {
  artImgAttrs,
  artworksById,
  chapterLabel,
  chaptersById,
  coverOfStyle,
  historyChapters,
  modernChapters,
  publicUrl,
  stylesById,
  type Chapter,
} from '../../content'
import { activeBlindRound } from '../../lib/storage'
import { chapterProgress } from '../../lib/tour'
import { useUserStore } from '../../store/userStore'

/** 一章的封面：章节指定的封面图，否则用第一种有封面的风格 */
function chapterCover(chapter: Chapter) {
  const own = chapter.coverArtworkIds.map((id) => artworksById.get(id)).find(Boolean)
  if (own) return own
  for (const id of chapter.styles) {
    const style = stylesById.get(id)
    const cover = style && coverOfStyle(style)
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
          不看名字，只凭第一眼给 24 幅画打分。看完再揭晓每张是什么风格，然后跟着导览慢慢走。
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
  const resumeChapter = resume ? chaptersById.get(resume.family) : undefined
  const resumeStyle = resume?.style ? stylesById.get(resume.style) : undefined
  const visited = state.progress.visitedStyles
  // “现代与当代”大类的风格都已经在现代线路上，溯源里只列另外八类
  const roots = historyChapters.filter((c) => c.id !== 'modern')

  return (
    <Page title="画风地图" subtitle="从今天天天见到的插画出发，往回走，找到你真正喜欢的画风。">
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
        {resumeChapter && (
          <Link
            to={resumeStyle && resumeChapter.styles.includes(resumeStyle.id) ? `/tour/${resumeChapter.id}/${resumeStyle.id}` : `/tour/${resumeChapter.id}`}
            className="block active:opacity-80"
          >
            <Card className="border-accent/40 bg-accent-soft">
              <div className="text-xs text-accent">继续 · {chapterLabel(resumeChapter)}</div>
              <div className="mt-1 font-serif text-lg font-semibold">
                {resumeChapter.nameZh}
                {resumeStyle && resumeChapter.styles.includes(resumeStyle.id) && ` · ${resumeStyle.nameZh}`}
              </div>
            </Card>
          </Link>
        )}
      </div>

      <Section title="现代线路" aside={<span className="text-xs text-muted">从今天往回走</span>}>
        <ol className="space-y-3">
          {modernChapters.map((chapter) => {
            const { seen, total } = chapterProgress(chapter.styles, visited)
            const cover = chapterCover(chapter)
            return (
              <li key={chapter.id}>
                <Link to={`/tour/${chapter.id}`} className="block active:opacity-80">
                  <Card className="overflow-hidden p-0">
                    <div className="flex">
                      {cover ? (
                        <img
                          {...artImgAttrs(cover)}
                          src={publicUrl(cover.img.thumb)}
                          alt=""
                          loading="lazy"
                          className="w-24 shrink-0 self-stretch bg-line/60 object-cover"
                        />
                      ) : (
                        <div
                          className="flex w-24 shrink-0 items-center justify-center bg-accent-soft font-serif text-3xl text-accent/70"
                          aria-hidden
                        >
                          {chapter.number}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm text-muted tabular-nums">{chapter.number}</span>
                          <h3 className="font-serif text-lg font-semibold leading-snug">{chapter.nameZh}</h3>
                          {chapter.styles.length === 0 && <Badge>施工中</Badge>}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">{chapter.glance}</p>
                        <div className="mt-2 text-xs text-muted">
                          {total > 0 ? `已走 ${seen}/${total} 站` : '还没有上线的站'}
                          {chapter.upcoming.length > 0 && ` · 待上线 ${chapter.upcoming.length} 种`}
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

      <Section title="溯源：九大类" aside={<span className="text-xs text-muted">按历史脉络</span>}>
        <p className="mb-2 text-sm leading-relaxed text-muted">
          今天的画风大多能在这里找到祖宗。第九类“现代与当代”的风格都在上面的现代线路里。
        </p>
        <div>
          {roots.map((chapter) => {
            const { seen, total } = chapterProgress(chapter.styles, visited)
            const cover = chapterCover(chapter)
            return (
              <ListLink
                key={chapter.id}
                to={`/tour/${chapter.id}`}
                title={chapter.nameZh}
                detail={`${chapter.glance} · ${total > 0 ? `已走 ${seen}/${total} 站 · ` : ''}计划 ${chapter.planned} 种`}
                leading={
                  cover ? (
                    <img {...artImgAttrs(cover)} src={publicUrl(cover.img.thumb)} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="size-12 shrink-0 rounded-lg bg-line/70" aria-hidden />
                  )
                }
              />
            )
          })}
        </div>
      </Section>
    </Page>
  )
}
