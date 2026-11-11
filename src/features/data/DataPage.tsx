import { useEffect, useRef, useState } from 'react'
import { Button, Card, Page, Section } from '../../components/ui'
import {
  backupFileName,
  makeBackup,
  parseBackup,
  serializeBackup,
  summarize,
  type BackupFile,
} from '../../lib/backup'
import { copyText } from '../../lib/clipboard'
import { isStoragePersisted, latestRatings, requestPersistentStorage } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'

export function DataPage() {
  const state = useUserStore((s) => s.state)
  const saveFailed = useUserStore((s) => s.saveFailed)
  const { markBackedUp, replaceState, mergeIn, reset, flush } = useUserStore.getState()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 4000)
    return () => clearTimeout(t)
  }, [confirmReset])

  const exportFile = () => {
    const now = new Date()
    const blob = new Blob([serializeBackup(makeBackup(state, now))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(now)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    markBackedUp()
    setMessage(`已导出 ${backupFileName(now)}`)
  }

  const copyBackup = async () => {
    const ok = await copyText(serializeBackup(makeBackup(state)))
    if (ok) markBackedUp()
    setMessage(ok ? '备份文本已复制，可以粘贴到备忘录或发给自己。' : '复制失败，请改用导出文件。')
  }

  const readText = (text: string) => {
    const result = parseBackup(text)
    if (result.ok) {
      setPending(result.backup)
      setMessage(null)
    } else {
      setPending(null)
      setMessage(result.error)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    readText(await file.text())
    if (fileInput.current) fileInput.current.value = ''
  }

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!pending) return
    if (mode === 'merge') mergeIn(pending.data)
    else replaceState(pending.data)
    await flush()
    setPending(null)
    setPasteOpen(false)
    setPasteText('')
    setMessage(mode === 'merge' ? '已合并导入。' : '已用备份替换当前数据。')
  }

  const askPersist = async () => {
    const result = await requestPersistentStorage()
    setPersisted(result)
    setMessage(
      result === true
        ? '浏览器已同意持久保存。'
        : result === false
          ? '浏览器没有同意。加到主屏幕后通常会更稳。'
          : '这个浏览器不支持持久保存申请。',
    )
  }

  const doReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    reset()
    await flush()
    setConfirmReset(false)
    setMessage('已清空本机数据。')
  }

  const summary = pending ? summarize(pending) : null

  return (
    <Page back title="数据与备份" subtitle="评分和笔记只存在这台设备的浏览器里。">
      {message && (
        <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {message}
        </p>
      )}
      {saveFailed && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          最近一次保存失败了。可能是浏览器禁止了存储（例如无痕模式），请尽快导出备份。
        </p>
      )}

      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">评分</dt>
          <dd>{latestRatings(state.ratings).size} 项（共 {state.ratings.length} 次）</dd>
          <dt className="text-muted">收藏</dt>
          <dd>{state.favorites.length} 幅</dd>
          <dt className="text-muted">笔记</dt>
          <dd>{Object.keys(state.notes).length} 条</dd>
          <dt className="text-muted">上次备份</dt>
          <dd>{state.lastBackupAt ? new Date(state.lastBackupAt).toLocaleString('zh-CN') : '还没有备份过'}</dd>
          <dt className="text-muted">持久保存</dt>
          <dd>{persisted === true ? '已获准' : persisted === false ? '未获准' : '浏览器不支持或未知'}</dd>
        </dl>
        {persisted !== true && (
          <div className="mt-3">
            <Button onClick={askPersist}>申请持久保存</Button>
          </div>
        )}
      </Card>

      <Section title="备份">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportFile}>
            导出备份文件
          </Button>
          <Button onClick={copyBackup}>复制备份文本</Button>
        </div>
      </Section>

      <Section title="导入">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fileInput.current?.click()}>从文件导入</Button>
          <Button onClick={() => setPasteOpen((v) => !v)}>粘贴备份文本</Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {pasteOpen && (
          <div className="mt-3 space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder="把备份文本粘贴到这里"
              className="w-full rounded-xl border border-line bg-surface p-3 font-mono text-xs outline-none focus:border-accent"
            />
            <Button onClick={() => readText(pasteText)} disabled={!pasteText.trim()}>
              读取
            </Button>
          </div>
        )}
        {summary && (
          <Card className="mt-3">
            <p className="text-sm leading-relaxed">
              备份导出于 {new Date(summary.exportedAt).toLocaleString('zh-CN')}：{summary.ratings} 次评分、{summary.favorites}{' '}
              个收藏、{summary.notes} 条笔记、{summary.prompts} 条提示词。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void applyImport('merge')}>
                合并到当前数据
              </Button>
              <Button onClick={() => void applyImport('replace')}>替换当前数据</Button>
              <Button onClick={() => setPending(null)}>取消</Button>
            </div>
          </Card>
        )}
      </Section>

      <Section title="重置">
        <p className="mb-3 text-sm text-muted">清空这台设备上的全部评分、收藏和笔记。建议先导出备份。</p>
        <Button variant="danger" onClick={() => void doReset()}>
          {confirmReset ? '确定清空？再点一次' : '清空本机数据'}
        </Button>
      </Section>
    </Page>
  )
}
