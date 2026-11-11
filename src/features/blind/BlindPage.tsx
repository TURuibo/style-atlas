import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button, Card, Page, Section } from '../../components/ui'
import { content, modernStyleIds, stylesById } from '../../content'
import { blindCandidates, FIRST_ROUND_SIZE, NEXT_ROUND_SIZE, pickFirstRound, pickNextRound } from '../../lib/blind'
import { activeBlindRound, lastCompletedBlindRound, requestPersistentStorage } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'
import { BlindSession } from './BlindSession'

/** 现代专场至少要有的图数和风格数（SPEC §4.2） */
const MODERN_MIN_ARTWORKS = 8
const MODERN_MIN_STYLES = 3

/** 盲测入口（SPEC §4.2）：开始、继续、再来一轮、现代专场；进行中是全屏的 BlindSession */
export function BlindPage() {
  const ready = useUserStore((s) => s.ready)
  const state = useUserStore((s) => s.state)
  const startBlindRound = useUserStore((s) => s.startBlindRound)
  const markIntroSeen = useUserStore((s) => s.markIntroSeen)
  const navigate = useNavigate()
  const location = useLocation()
  const autostart = (location.state as { autostart?: boolean } | null)?.autostart === true
  const [running, setRunning] = useState(false)

  const candidates = useMemo(() => blindCandidates(content.artworks, stylesById), [])
  // 现代专场（SPEC §4.2）：只从现代线路上有图的风格里抽
  const modernCandidates = useMemo(() => candidates.filter((c) => modernStyleIds.has(c.styleId)), [candidates])
  const modernStyleCount = new Set(modernCandidates.map((c) => c.styleId)).size
  const modernOpen = modernCandidates.length >= MODERN_MIN_ARTWORKS && modernStyleCount >= MODERN_MIN_STYLES
  const active = activeBlindRound(state)
  const done = state.progress.blindRounds.filter((r) => r.completedAt)
  const lastDone = lastCompletedBlindRound(state)
  const firstRound = done.length === 0
  const enough = candidates.length >= (firstRound ? FIRST_ROUND_SIZE : NEXT_ROUND_SIZE)

  const begin = () => {
    markIntroSeen()
    if (!activeBlindRound(useUserStore.getState().state)) {
      const shown = state.progress.blindRounds.flatMap((r) => r.artworkIds)
      const ids = firstRound
        ? pickFirstRound(candidates, Math.random)
        : pickNextRound(candidates, shown, Math.random)
      startBlindRound(ids)
    }
    setRunning(true)
  }

  const beginModern = () => {
    markIntroSeen()
    if (!activeBlindRound(useUserStore.getState().state)) {
      const shown = state.progress.blindRounds.filter((r) => r.kind === 'modern').flatMap((r) => r.artworkIds)
      startBlindRound(pickNextRound(modernCandidates, shown, Math.random, NEXT_ROUND_SIZE), 'modern')
    }
    setRunning(true)
  }

  // 从首次说明页点“开始盲测”进来时直接开始
  useEffect(() => {
    if (ready && autostart && enough) {
      navigate('.', { replace: true, state: null })
      begin()
    }
    // begin 每次渲染都是新函数，这里只在条件满足时跑一次
  }, [ready, autostart, enough])

  const finish = () => {
    setRunning(false)
    // 第一次完成盲测后申请持久存储（SPEC §10.5）
    if (firstRound) void requestPersistentStorage()
    navigate('/blind/reveal')
  }

  if (!ready) return <Page title="盲测">{null}</Page>
  if (running && active) return <BlindSession onExit={() => setRunning(false)} onFinish={finish} />

  return (
    <Page title="盲测" subtitle="不看名字，只凭第一眼打分，看看你真正喜欢什么。">
      {active ? (
        <Card>
          <p className="font-serif text-lg font-semibold">
            第 {active.number} 轮还剩 {active.artworkIds.length - active.position} 张
          </p>
          <p className="mt-1 text-sm text-muted">已评的都存好了，从第 {active.position + 1} 张接着来。</p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => setRunning(true)}>
              继续盲测
            </Button>
          </div>
        </Card>
      ) : enough ? (
        <Card>
          <p className="font-serif text-lg font-semibold">
            {firstRound ? `首轮 ${FIRST_ROUND_SIZE} 张，大约 3 分钟` : `再来一轮，${NEXT_ROUND_SIZE} 张`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {firstRound
              ? '图来自博物馆的公共领域藏品和作者公开授权的当代作品，覆盖已上线的各个大类。看完会揭晓每张是什么风格。'
              : '优先出现你在盲测里还没见过的作品。'}
          </p>
          <div className="mt-4">
            <Button variant="primary" onClick={begin}>
              开始盲测
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="leading-relaxed">
            盲测需要至少 {FIRST_ROUND_SIZE} 幅来自不同大类的图。现在有 {candidates.length} 幅，图片上线后这里会自动开放。
          </p>
          <Link to="/" className="mt-3 inline-block text-accent underline underline-offset-4">
            先去导览
          </Link>
        </Card>
      )}

      {!active && (
        <Section title="现代专场">
          <Card>
            {modernOpen ? (
              <>
                <p className="leading-relaxed">
                  只看现代线路上的风格，最多 {NEXT_ROUND_SIZE} 张。现在有图的是 {modernStyleCount} 种、共 {modernCandidates.length} 幅；
                  没有开放图的风格不在里面，可以在导览里看外链、存进剪贴簿。
                </p>
                <div className="mt-4">
                  <Button onClick={beginModern}>开始现代专场</Button>
                </div>
              </>
            ) : (
              <p className="leading-relaxed text-muted">
                现代风格里有图的还不够开一轮：现在 {modernStyleCount} 种、{modernCandidates.length} 幅（至少要 {MODERN_MIN_STYLES} 种、
                {MODERN_MIN_ARTWORKS} 幅）。
              </p>
            )}
          </Card>
        </Section>
      )}

      <Section title="怎么评">
        <ul className="space-y-2 text-sm leading-relaxed">
          <li>点下面的五个按钮，或者直接在图上滑：左滑“不太喜欢”，右滑“喜欢”，上滑“超爱”。</li>
          <li>点一下图可以放大细看；拿不准就“跳过”，点错了就“撤销上一张”。</li>
          <li>随时可以停下，已评的都会保存，下次从停下的地方接着来。</li>
        </ul>
      </Section>

      {lastDone && (
        <Section title="上一轮">
          <Link to="/blind/reveal" className="text-accent underline underline-offset-4">
            看第 {lastDone.number} 轮的揭晓
          </Link>
        </Section>
      )}
    </Page>
  )
}
