import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, ListLink, Page, Section } from '../../components/ui'
import { content, eras, erasOfStyle, regionName, stylesOfFamily, stylesOfRegion } from '../../content'
import type { Style } from '../../content/schema'

type Mode = 'family' | 'region' | 'era'

const modes: { id: Mode; label: string }[] = [
  { id: 'family', label: '大类' },
  { id: 'region', label: '地域' },
  { id: 'era', label: '年代' },
]

/** 本地搜索：风格名（中 / 英 / 原文）、画家、关键词。Phase 6 换成模糊搜索。 */
function searchStyles(query: string): Style[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return content.styles.filter((s) => {
    const haystack = [
      s.nameZh,
      s.nameEn,
      s.nameOriginal ?? '',
      s.externalSearch,
      ...s.keyArtists.flatMap((a) => [a.zh, a.original ?? '', a.en ?? '']),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function ExplorePage() {
  const [mode, setMode] = useState<Mode>('family')
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchStyles(query), [query])

  return (
    <Page title="探索" subtitle="按大类、地域或年代自己逛。">
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3">
        <Search size={18} className="text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索风格或画家，如 浮世绘、Hokusai"
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none"
          type="search"
          aria-label="搜索风格或画家"
        />
      </label>

      {query.trim() ? (
        <Section title={`搜索结果 · ${results.length}`}>
          {results.length === 0 ? (
            <p className="text-sm text-muted">没有找到。内容在陆续上线，换个词试试。</p>
          ) : (
            results.map((s) => <StyleRow key={s.id} style={s} />)
          )}
        </Section>
      ) : (
        <>
          <div role="tablist" className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-line/60 p-1">
            {modes.map((m) => (
              <button
                key={m.id}
                role="tab"
                type="button"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`min-h-10 rounded-lg text-sm ${mode === m.id ? 'bg-surface font-medium shadow-sm' : 'text-muted'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'family' && (
            <Section title="九大类">
              {content.families.map((f) => (
                <ListLink
                  key={f.id}
                  to={`/tour/${f.id}`}
                  title={f.nameZh}
                  detail={f.glance}
                  badge={<Badge>{stylesOfFamily(f.id).length}/{f.planned}</Badge>}
                />
              ))}
            </Section>
          )}

          {mode === 'region' && (
            <Section title="十三个地区" aside={<span className="text-xs text-muted">世界地图在 Phase 6</span>}>
              {Object.entries(content.vocab.regions).map(([id, name]) => (
                <ListLink
                  key={id}
                  to={`/explore/region/${id}`}
                  title={name}
                  badge={<Badge>{stylesOfRegion(id).length}</Badge>}
                />
              ))}
            </Section>
          )}

          {mode === 'era' && (
            <Section title="八个时代" aside={<span className="text-xs text-muted">时间线在 Phase 6</span>}>
              {eras.map((e) => (
                <ListLink
                  key={e.id}
                  to={`/explore/era/${e.id}`}
                  title={e.zh}
                  detail={eraRange(e.start, e.end)}
                  badge={<Badge>{content.styles.filter((s) => erasOfStyle(s).some((x) => x.id === e.id)).length}</Badge>}
                />
              ))}
            </Section>
          )}
        </>
      )}
    </Page>
  )
}

function eraRange(start: number, end: number): string {
  if (start <= -5000) return `公元 ${end} 年以前`
  if (end >= 2100) return `${start} 年至今`
  return `${start}–${end}`
}

export function StyleRow({ style }: { style: Style }) {
  return (
    <ListLink
      to={`/style/${style.id}`}
      title={style.nameZh}
      detail={`${style.nameEn} · ${style.regions.map(regionName).join('、')} · ${style.era.label}`}
      badge={style.status === 'draft' ? <Badge>施工中</Badge> : undefined}
    />
  )
}
