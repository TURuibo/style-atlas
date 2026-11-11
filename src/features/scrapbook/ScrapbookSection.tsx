import { ImagePlus } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import type { Style } from '../../content/schema'
import { scrapsOfStyle, type ScrapItem } from '../../lib/scrapbook'
import { useScrapStore } from '../../store/scrapStore'
import { useViewer, type ScrapView } from '../viewer/useViewer'

/** 某风格的剪贴簿图和缩略图地址，加看图器 */
export function useStyleScraps(style: Style) {
  const init = useScrapStore((s) => s.init)
  const allItems = useScrapStore((s) => s.items)
  const thumbs = useScrapStore((s) => s.thumbs)
  const loadThumbs = useScrapStore((s) => s.loadThumbs)
  const loadDisplays = useScrapStore((s) => s.loadDisplays)
  const remove = useScrapStore((s) => s.remove)
  const viewer = useViewer()
  const items = useMemo(() => scrapsOfStyle(allItems, style.id), [allItems, style.id])

  useEffect(() => {
    void init()
  }, [init])
  useEffect(() => {
    void loadThumbs(items.map((i) => i.id))
  }, [items, loadThumbs])

  const openAt = async (index: number) => {
    const displays = await loadDisplays(items.map((i) => i.id))
    const views: ScrapView[] = items
      .filter((i) => displays[i.id])
      .map((i) => ({ id: i.id, src: displays[i.id]!, width: i.width, height: i.height, styleName: style.nameZh, addedAt: i.addedAt }))
    const target = items[index]
    const start = Math.max(0, views.findIndex((v) => v.id === target?.id))
    viewer.openScraps(views, start, (id) => void remove(id))
  }

  return { items, thumbs, openAt, viewerElement: viewer.element }
}

/** “从相册添加”按钮：多选，逐张缩小后存进本机 */
export function AddScrapButton({ style, label = '从相册添加' }: { style: Style; label?: string }) {
  const add = useScrapStore((s) => s.add)
  const inputId = useId()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = [...files]
    setMessage(null)
    setProgress({ done: 0, total: list.length })
    const { added, failed } = await add(style.id, list, (done, total) => setProgress({ done, total }))
    setProgress(null)
    setMessage(
      failed > 0 ? `存好 ${added} 张，有 ${failed} 张没能读取（可以先截图再加）。` : `存好 ${added} 张，只在这台手机上。`,
    )
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 text-sm active:opacity-70"
      >
        <ImagePlus size={16} aria-hidden className="text-accent" />
        {progress ? `正在处理 ${progress.done}/${progress.total}…` : label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={progress !== null}
        onChange={(e) => {
          void onFiles(e.currentTarget.files)
          e.currentTarget.value = ''
        }}
      />
      {message && (
        <p role="status" className="mt-2 text-xs text-muted">
          {message}
        </p>
      )}
    </div>
  )
}

/** 风格页上的剪贴簿：三列缩略图 + 添加按钮 */
export function ScrapbookGrid({ style }: { style: Style }) {
  const { items, thumbs, openAt, viewerElement } = useStyleScraps(style)
  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          在小红书、Pinterest 或别处看到这种风格的好图，先存到相册，再从这里加进来。图只存在这台手机上，不上传，也不进备份文件。
        </p>
      ) : (
        <ScrapThumbs items={items} thumbs={thumbs} onOpen={(i) => void openAt(i)} />
      )}
      <div className="mt-3">
        <AddScrapButton style={style} label={items.length === 0 ? '从相册添加' : '再加几张'} />
      </div>
      {viewerElement}
    </div>
  )
}

export function ScrapThumbs({
  items,
  thumbs,
  onOpen,
}: {
  items: readonly ScrapItem[]
  thumbs: Readonly<Record<string, string>>
  onOpen: (index: number) => void
}) {
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {items.map((item, i) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(i)}
            className="block aspect-square w-full overflow-hidden rounded-lg bg-line/60"
            aria-label={`看大图：我存的第 ${i + 1} 张`}
          >
            {thumbs[item.id] && <img src={thumbs[item.id]} alt="" className="size-full object-cover" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
