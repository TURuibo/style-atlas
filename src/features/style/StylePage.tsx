import { Check, Copy, ExternalLink as ExternalIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AttributeBars } from '../../components/AttributeBars'
import { Collapsible } from '../../components/Collapsible'
import { RatingBar, scoreLabels } from '../../components/RatingBar'
import { Badge, Button, Card, Chip, Page } from '../../components/ui'
import { familyName, mediumName, moodName, regionName, styleNameZh, stylesById } from '../../content'
import type { Style } from '../../content/schema'
import { copyText } from '../../lib/clipboard'
import { externalSearchLinks, stylePromptLine, type ExternalLink as ExternalLinkItem } from '../../lib/links'
import { latestScore } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'
import { NotFound } from '../NotFound'
import { Gallery } from './Gallery'

export function StylePage() {
  const { styleId = '' } = useParams()
  const style = stylesById.get(styleId)
  const visitStyle = useUserStore((s) => s.visitStyle)
  const setTourPosition = useUserStore((s) => s.setTourPosition)

  useEffect(() => {
    if (!style) return
    visitStyle(style.id)
    setTourPosition(style.family, style.id)
  }, [style, visitStyle, setTourPosition])

  if (!style) return <NotFound />
  return <StyleDetail style={style} />
}

function StyleDetail({ style }: { style: Style }) {
  const state = useUserStore((s) => s.state)
  const rate = useUserStore((s) => s.rate)
  const toggleExercise = useUserStore((s) => s.toggleExercise)
  const myScore = latestScore(state.ratings, 'style', style.id)
  const exerciseDone = state.exercisesDone.includes(style.id)
  const museums = [...style.museums].sort((a, b) => Number(Boolean(b.local)) - Number(Boolean(a.local)))
  const external = style.imageMode === 'external-only'
  const links = externalSearchLinks(style.externalSearch, { sources: style.sources, name: style.nameZh })

  return (
    <Page
      back
      kicker={familyName(style.family)}
      title={style.nameZh}
      subtitle={[style.nameEn, style.nameOriginal].filter(Boolean).join(' · ')}
    >
      <div className="flex flex-wrap gap-1.5">
        {style.regions.map((r) => (
          <Chip key={r} to={`/explore/region/${r}`}>
            {regionName(r)}
          </Chip>
        ))}
        <Chip>{style.era.label}</Chip>
        <Chip to={`/tour/${style.family}`}>{familyName(style.family)}</Chip>
        {myScore !== undefined && <Chip>你的评分：{scoreLabels[myScore]}</Chip>}
      </div>

      {style.status === 'draft' && (
        <p className="mt-4 rounded-xl bg-line/60 px-4 py-3 text-sm text-muted">
          这一站还在施工：图片和部分内容会陆续补上。
        </p>
      )}

      {external ? (
        <Card className="mt-5">
          <p className="text-sm text-muted">这种风格的作品大多还有版权，应用里不放图。去外面看看，回来再打分：</p>
          <ExternalButtons links={links} />
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted">看图时留意这几点</p>
            <AttributeBars attributes={style.attributes} />
          </div>
        </Card>
      ) : (
        <Gallery style={style} />
      )}

      {style.body.oneLiner && <p className="mt-6 font-serif text-lg leading-relaxed">{style.body.oneLiner}</p>}

      <div className="mt-4">
        <p className="mb-2 text-sm text-muted">你喜欢这种风格吗？</p>
        <RatingBar label="给这种风格评分" value={myScore} onRate={(score) => rate('style', style.id, score, 'browse')} />
      </div>

      {style.body.howToLook.length > 0 && (
        <Collapsible title="怎么看" defaultOpen>
          <ol className="space-y-2.5">
            {style.body.howToLook.map((item, i) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 font-serif text-sm text-accent tabular-nums">{i + 1}</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </Collapsible>
      )}

      {style.body.background && (
        <Collapsible title="为什么长这样" defaultOpen>
          <Paragraphs text={style.body.background} />
        </Collapsible>
      )}

      {!external && (
        <Collapsible title="画面特征">
          <AttributeBars attributes={style.attributes} />
        </Collapsible>
      )}

      {style.keyArtists.length > 0 && (
        <Collapsible title="代表人物">
          <ul className="space-y-2">
            {style.keyArtists.map((a) => (
              <li key={a.zh} className="leading-snug">
                <span className="font-medium">{a.zh}</span>
                <span className="text-sm text-muted">
                  {[a.original, a.life].filter(Boolean).length > 0 && `（${[a.original, a.life].filter(Boolean).join('，')}）`}
                </span>
                {a.known && <div className="text-sm text-muted">{a.known}</div>}
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {museums.length > 0 && (
        <Collapsible
          title="去哪看真迹"
          defaultOpen={museums.some((m) => m.local)}
          aside={museums.some((m) => m.local) ? '北欧能看' : undefined}
        >
          <ul className="space-y-2.5">
            {museums.map((m) => (
              <li key={m.name} className="leading-snug">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        {m.name}
                      </a>
                    ) : (
                      m.name
                    )}
                  </span>
                  <span className="text-sm text-muted">{m.city}</span>
                  {m.local && <Badge tone="accent">{localLabel[m.local]}</Badge>}
                </div>
                {m.note && <div className="text-sm text-muted">{m.note}</div>}
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {(style.body.howToDraw || style.body.exercise) && (
        <Collapsible title="怎么画">
          {style.body.howToDraw && <Paragraphs text={style.body.howToDraw} />}
          {style.body.exercise && (
            <Card className="mt-4">
              <div className="mb-1 text-xs text-muted">15 分钟练习</div>
              <p className="leading-relaxed">{style.body.exercise}</p>
              <div className="mt-3">
                <Button variant={exerciseDone ? 'primary' : 'secondary'} onClick={() => toggleExercise(style.id)}>
                  {exerciseDone ? <Check size={16} aria-hidden /> : null}
                  {exerciseDone ? '已练过' : '标记为练过'}
                </Button>
              </div>
            </Card>
          )}
        </Collapsible>
      )}

      <PromptKeywords style={style} includeArtists={state.settings.includeArtistNames} />

      {!external && (
        <Collapsible title="去外面看更多">
          <ExternalButtons links={links} />
        </Collapsible>
      )}

      <Related style={style} />

      <NoteBox styleId={style.id} />

      {(style.moods.length > 0 || style.mediums.length > 0) && (
        <Collapsible title="标签">
          <div className="flex flex-wrap gap-1.5">
            {style.moods.map((m) => (
              <Chip key={m}>{moodName(m)}</Chip>
            ))}
            {style.mediums.map((m) => (
              <Chip key={m}>{mediumName(m)}</Chip>
            ))}
          </div>
        </Collapsible>
      )}

      {style.sources.length > 0 && (
        <Collapsible title="参考来源">
          <ul className="space-y-1 text-sm">
            {style.sources.map((url) => (
              <li key={url} className="truncate">
                <a href={url} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4">
                  {decodeURI(url).replace(/^https?:\/\//, '')}
                </a>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}
    </Page>
  )
}

const localLabel = { stockholm: '斯德哥尔摩', sweden: '瑞典', nordic: '北欧' } as const

function ExternalButtons({ links }: { links: ExternalLinkItem[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm active:opacity-70"
        >
          {link.label}
          <ExternalIcon size={14} aria-hidden className="text-muted" />
        </a>
      ))}
    </div>
  )
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split(/\n\s*\n/).map((para) => {
        const match = para.match(/^([^：\n]{1,6})：([\s\S]*)$/)
        return (
          <p key={para} className="leading-relaxed">
            {match ? (
              <>
                <span className="font-medium">{match[1]}：</span>
                {match[2]}
              </>
            ) : (
              para
            )}
          </p>
        )
      })}
    </div>
  )
}

function PromptKeywords({ style, includeArtists }: { style: Style; includeArtists: boolean }) {
  const [copied, setCopied] = useState<string | null>(null)
  const { prompt } = style

  const copy = async (text: string, key: string) => {
    if (await copyText(text)) {
      setCopied(key)
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500)
    }
  }

  const groups: { label: string; words: string[] }[] = [
    { label: '风格', words: [prompt.style] },
    { label: '媒材与手法', words: prompt.medium },
    { label: '色彩', words: prompt.palette },
    { label: '构图', words: prompt.composition },
    ...(includeArtists && prompt.artistsPD.length > 0 ? [{ label: '画家（已进入公共领域）', words: prompt.artistsPD }] : []),
    { label: '负面词', words: prompt.negative },
  ].filter((g) => g.words.length > 0)

  const all = stylePromptLine(prompt, includeArtists)

  return (
    <Collapsible title="AI 出图关键词">
      <button
        type="button"
        onClick={() => copy(all, '__all')}
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-accent/40 bg-accent-soft px-3 text-sm text-accent"
      >
        {copied === '__all' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
        {copied === '__all' ? '已复制整套' : '复制整套关键词'}
      </button>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-1 text-xs text-muted">{group.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.words.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => copy(word, word)}
                  className="min-h-8 rounded-lg border border-line bg-surface px-2.5 text-left font-mono text-xs active:opacity-70"
                >
                  {copied === word ? '已复制' : word}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  )
}

function Related({ style }: { style: Style }) {
  const rows: { label: string; ids: string[] }[] = [
    { label: '受谁影响', ids: style.related.influencedBy },
    { label: '影响了谁', ids: style.related.influenced },
    { label: '看起来相近', ids: style.related.similar },
  ].filter((r) => r.ids.length > 0)
  if (rows.length === 0) return null
  return (
    <Collapsible title="相关风格" defaultOpen>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3">
            <dt className="w-20 shrink-0 text-sm text-muted">{row.label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {row.ids.map((id) => {
                const other = stylesById.get(id)
                return other ? (
                  <Link key={id} to={`/style/${id}`} className="text-accent underline underline-offset-4">
                    {other.nameZh}
                  </Link>
                ) : (
                  <span key={id} className="text-sm text-muted">
                    {styleNameZh(id)}（待上线）
                  </span>
                )
              })}
            </dd>
          </div>
        ))}
      </dl>
    </Collapsible>
  )
}

function NoteBox({ styleId }: { styleId: string }) {
  const saved = useUserStore((s) => s.state.notes[styleId] ?? '')
  const setNote = useUserStore((s) => s.setNote)
  const [draft, setDraft] = useState(saved)

  useEffect(() => {
    setDraft(saved)
  }, [saved])

  return (
    <Collapsible title="我的笔记" defaultOpen={Boolean(saved)}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== saved && setNote(styleId, draft)}
        rows={3}
        placeholder="我喜欢它的……"
        className="w-full rounded-xl border border-line bg-surface p-3 text-base leading-relaxed outline-none focus:border-accent"
      />
    </Collapsible>
  )
}
