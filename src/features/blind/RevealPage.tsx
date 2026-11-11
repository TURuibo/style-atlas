import { Link } from 'react-router'
import { scoreLabels } from '../../components/RatingBar'
import { Card, Page, Section } from '../../components/ui'
import { artworksById, content, publicUrl, stylesById, subjectNames } from '../../content'
import { revealGroups, revealSummary, roundScores, subjectHint } from '../../lib/reveal'
import { lastCompletedBlindRound } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'

/** 揭晓（SPEC §4.3）：按大类分组，每张带你的分数和风格名 */
export function RevealPage() {
  const ready = useUserStore((s) => s.ready)
  const state = useUserStore((s) => s.state)
  const round = lastCompletedBlindRound(state)

  if (!ready) return <Page back title="揭晓">{null}</Page>
  if (!round) {
    return (
      <Page back title="揭晓">
        <Card>
          <p>还没有看完的盲测。</p>
          <Link to="/blind" className="mt-3 inline-block text-accent underline underline-offset-4">
            去盲测
          </Link>
        </Card>
      </Page>
    )
  }

  const scores = roundScores(round, state.ratings)
  const groups = revealGroups(round, scores, artworksById, stylesById, content.families)
  const hint = subjectHint(groups, artworksById, subjectNames)
  const rated = scores.size

  return (
    <Page back kicker={`第 ${round.number} 轮 · 评了 ${rated} / ${round.artworkIds.length} 张`} title="揭晓">
      <p className="font-serif text-lg leading-relaxed">{revealSummary(groups)}</p>
      {hint && <p className="mt-2 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{hint}</p>}

      {groups.map((group) => (
        <Section key={group.family.id} title={group.family.nameZh}>
          <ul className="grid grid-cols-3 gap-2">
            {group.items.map((item) => {
              const art = artworksById.get(item.artworkId)!
              const style = stylesById.get(item.styleId)!
              return (
                <li key={item.artworkId}>
                  <Link to={`/style/${style.id}`} className="block active:opacity-80">
                    <img
                      src={publicUrl(art.img.thumb)}
                      alt={[art.titleZh ?? art.title, art.artist, art.date].filter(Boolean).join('，')}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg bg-line/60 object-cover"
                    />
                    <div className="mt-1 text-xs font-medium leading-snug">{style.nameZh}</div>
                    <div className={`text-[11px] ${item.score !== undefined && item.score >= 1 ? 'text-accent' : 'text-muted'}`}>
                      {item.score === undefined ? '跳过' : scoreLabels[item.score]}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      ))}

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Link
          to="/"
          className="flex min-h-12 items-center justify-center rounded-xl bg-accent text-sm font-medium text-paper active:opacity-80"
        >
          开始导览
        </Link>
        <Link
          to="/me"
          className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface text-sm font-medium active:opacity-80"
        >
          看我的口味
        </Link>
      </div>
    </Page>
  )
}
