import { Check, Copy, ExternalLink as ExternalIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { RatingBar } from '../../components/RatingBar'
import { Badge, Button, Card, Chip, Page, Section } from '../../components/ui'
import { artworksOfStyle, familyName, mediumName, moodName, publicUrl, regionName, stylesById } from '../../content'
import type { Style } from '../../content/schema'
import { copyText } from '../../lib/clipboard'
import { externalSearchLinks, stylePromptLine } from '../../lib/links'
import { latestRatings } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'
import { NotFound } from '../NotFound'

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
  const artworks = artworksOfStyle(style.id)
  const myRating = latestRatings(state.ratings).get(`style:${style.id}`)
  const exerciseDone = state.exercisesDone.includes(style.id)
  const museums = [...style.museums].sort((a, b) => Number(Boolean(b.local)) - Number(Boolean(a.local)))

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
      </div>

      {style.status === 'draft' && (
        <p className="mt-4 rounded-xl bg-line/60 px-4 py-3 text-sm text-muted">
          这一站还在施工：图片和部分内容会陆续补上。
        </p>
      )}

      <Gallery style={style} />

      {style.body.oneLiner && <p className="mt-6 font-serif text-lg leading-relaxed">{style.body.oneLiner}</p>}

      {style.body.howToLook.length > 0 && (
        <Section title="怎么看">
          <ol className="space-y-2.5">
            {style.body.howToLook.map((item, i) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 font-serif text-sm text-accent tabular-nums">{i + 1}</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {style.body.background && (
        <Section title="为什么长这样">
          <Paragraphs text={style.body.background} />
        </Section>
      )}

      {style.keyArtists.length > 0 && (
        <Section title="代表人物">
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
        </Section>
      )}

      {museums.length > 0 && (
        <Section title="去哪看真迹">
          <ul className="space-y-2">
            {museums.map((m) => (
              <li key={m.name} className="flex items-baseline gap-2">
                <span className="font-medium">
                  {m.url ? (
                    <a href={m.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      {m.name}
                    </a>
                  ) : (
                    m.name
                  )}
                </span>
                <span className="text-sm text-muted">
                  {m.city}
                  {m.note && ` · ${m.note}`}
                </span>
                {m.local && <Badge tone="accent">北欧可看</Badge>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {style.body.howToDraw && (
        <Section title="怎么画">
          <Paragraphs text={style.body.howToDraw} />
        </Section>
      )}

      {style.body.exercise && (
        <Section title="15 分钟练习">
          <Card>
            <p className="leading-relaxed">{style.body.exercise}</p>
            <div className="mt-3">
              <Button variant={exerciseDone ? 'primary' : 'secondary'} onClick={() => toggleExercise(style.id)}>
                {exerciseDone ? <Check size={16} aria-hidden /> : null}
                {exerciseDone ? '已练过' : '标记为练过'}
              </Button>
            </div>
          </Card>
        </Section>
      )}

      <PromptKeywords style={style} includeArtists={state.settings.includeArtistNames} />

      <Section title={style.imageMode === 'external-only' ? '去外面看图' : '更多图'}>
        {style.imageMode === 'external-only' && (
          <p className="mb-3 text-sm text-muted">这种风格的作品大多还有版权，应用里不放图。看完回来给它打个分。</p>
        )}
        <div className="flex flex-wrap gap-2">
          {externalSearchLinks(style.externalSearch).map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm active:opacity-70"
            >
              {link.label}
              <ExternalIcon size={14} aria-hidden className="text-muted" />
            </a>
          ))}
        </div>
      </Section>

      <Related style={style} />

      <Section title="你喜欢这种风格吗？">
        <RatingBar value={myRating?.score} onRate={(score) => rate('style', style.id, score, 'browse')} />
        {artworks.length === 0 && style.imageMode !== 'external-only' && (
          <p className="mt-2 text-xs text-muted">图片上线后再评会更准。</p>
        )}
      </Section>

      <NoteBox styleId={style.id} />

      {(style.moods.length > 0 || style.mediums.length > 0) && (
        <Section title="标签">
          <div className="flex flex-wrap gap-1.5">
            {style.moods.map((m) => (
              <Chip key={m}>{moodName(m)}</Chip>
            ))}
            {style.mediums.map((m) => (
              <Chip key={m}>{mediumName(m)}</Chip>
            ))}
          </div>
        </Section>
      )}

      {style.sources.length > 0 && (
        <Section title="参考来源">
          <ul className="space-y-1 text-sm">
            {style.sources.map((url) => (
              <li key={url} className="truncate">
                <a href={url} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4">
                  {decodeURI(url).replace(/^https?:\/\//, '')}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  )
}

function Gallery({ style }: { style: Style }) {
  const artworks = artworksOfStyle(style.id)
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
    <div className="mt-5 grid grid-cols-2 gap-2">
      {artworks.map((art) => (
        <a key={art.id} href={publicUrl(art.img.display)} className="block">
          <img
            src={publicUrl(art.img.thumb)}
            alt={[art.titleZh ?? art.title, art.artist, art.date].filter(Boolean).join('，')}
            loading="lazy"
            width={art.img.width}
            height={art.img.height}
            className="aspect-[3/4] w-full rounded-xl bg-line/60 object-cover"
          />
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
    <Section
      title="AI 出图关键词"
      aside={
        <button
          type="button"
          onClick={() => copy(all, '__all')}
          className="inline-flex min-h-9 items-center gap-1 text-sm text-accent"
        >
          {copied === '__all' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied === '__all' ? '已复制' : '复制整套'}
        </button>
      }
    >
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
    </Section>
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
    <Section title="相关风格">
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
                    {id}（待上线）
                  </span>
                )
              })}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
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
    <Section title="我的笔记">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== saved && setNote(styleId, draft)}
        rows={3}
        placeholder="我喜欢它的……"
        className="w-full rounded-xl border border-line bg-surface p-3 text-base leading-relaxed outline-none focus:border-accent"
      />
    </Section>
  )
}
