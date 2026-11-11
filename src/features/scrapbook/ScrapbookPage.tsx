import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, ListLink, Page, Section } from '../../components/ui'
import { modernChapters, styleNameZh, stylesById } from '../../content'
import { formatBytes, scrapCounts } from '../../lib/scrapbook'
import { useScrapStore } from '../../store/scrapStore'

/** 我的 → 剪贴簿（SPEC §4.5）：按风格列出存了几张；没存过时给几种适合先找图的风格 */
export function ScrapbookPage() {
  const init = useScrapStore((s) => s.init)
  const ready = useScrapStore((s) => s.ready)
  const items = useScrapStore((s) => s.items)
  const thumbs = useScrapStore((s) => s.thumbs)
  const loadThumbs = useScrapStore((s) => s.loadThumbs)
  const clearAll = useScrapStore((s) => s.clearAll)
  const [confirming, setConfirming] = useState(false)
  const counts = useMemo(() => scrapCounts(items), [items])
  const bytes = items.reduce((sum, i) => sum + i.bytes, 0)

  useEffect(() => {
    void init()
  }, [init])
  // 每种风格取最新一张做封面
  const covers = useMemo(() => {
    const out = new Map<string, string>()
    for (const item of [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt))) {
      if (!out.has(item.styleId)) out.set(item.styleId, item.id)
    }
    return out
  }, [items])
  useEffect(() => {
    void loadThumbs([...covers.values()])
  }, [covers, loadThumbs])

  // 现代线路上还没有开放图的风格，最适合用剪贴簿补
  const suggestions = modernChapters
    .flatMap((c) => c.styles)
    .filter((id) => stylesById.get(id)?.imageMode === 'external-only')

  return (
    <Page back title="剪贴簿" subtitle="你在外面看到、存进相册的好图，按风格放在这里。只存在这台手机上。">
      {!ready ? null : items.length === 0 ? (
        <Card>
          <p className="leading-relaxed">还没存过图。打开一种风格，点“从相册添加”就行。这些风格应用里没有开放图，最需要你补：</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((id) => (
              <Link
                key={id}
                to={`/style/${id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-3.5 text-sm active:opacity-70"
              >
                {styleNameZh(id)}
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <Section title={`${items.length} 张 · ${formatBytes(bytes)}`}>
            <div>
              {counts.map(({ styleId, count }) => {
                const coverId = covers.get(styleId)
                const thumb = coverId ? thumbs[coverId] : undefined
                return (
                  <ListLink
                    key={styleId}
                    to={`/style/${styleId}`}
                    title={styleNameZh(styleId)}
                    detail={`${count} 张`}
                    leading={
                      thumb ? (
                        <img src={thumb} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="size-12 shrink-0 rounded-lg bg-line/70" aria-hidden />
                      )
                    }
                  />
                )
              })}
            </div>
          </Section>
          <Section title="说明">
            <ul className="space-y-2 text-sm leading-relaxed text-muted">
              <li>图在加入时缩到长边 1600 像素，存在这台手机的浏览器里，不上传，也不在“数据与备份”导出的文件里。</li>
              <li>原图还在你的相册里；换手机时需要重新加。</li>
            </ul>
            <button
              type="button"
              onClick={() => (confirming ? void clearAll().then(() => setConfirming(false)) : setConfirming(true))}
              className="mt-4 min-h-11 rounded-full border border-line px-4 text-sm text-red-700 active:opacity-70 dark:text-red-300"
            >
              {confirming ? '再点一次，清空全部剪贴簿' : '清空剪贴簿'}
            </button>
          </Section>
        </>
      )}
    </Page>
  )
}
