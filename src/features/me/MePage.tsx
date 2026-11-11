import { Card, ListLink, Page, Section } from '../../components/ui'
import { needsBackupReminder } from '../../lib/backup'
import { latestRatings } from '../../lib/storage'
import { useUserStore } from '../../store/userStore'
import { Link } from 'react-router'

/** 画像出现的最少评分次数（SPEC §9.2） */
export const PROFILE_MIN_RATINGS = 15

export function MePage() {
  const state = useUserStore((s) => s.state)
  const ratingCount = latestRatings(state.ratings).size
  const remind = needsBackupReminder(state)

  return (
    <Page title="我的">
      {remind && (
        <Link to="/me/data" className="block">
          <Card className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            有一阵子没备份了。点这里导出一份，换手机或清缓存都不怕。
          </Card>
        </Link>
      )}

      <Section title="口味画像">
        <Card>
          {ratingCount < PROFILE_MIN_RATINGS ? (
            <p className="leading-relaxed">
              已评 {ratingCount} 次。再评 {PROFILE_MIN_RATINGS - ratingCount} 次，这里会出现你的初步口味画像。
            </p>
          ) : (
            <p className="leading-relaxed">已评 {ratingCount} 次。口味画像在下一个版本上线。</p>
          )}
        </Card>
      </Section>

      <Section title="概况">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="评分" value={ratingCount} />
          <Stat label="收藏" value={state.favorites.length} />
          <Stat label="看过的风格" value={state.progress.visitedStyles.length} />
        </div>
      </Section>

      <Section title="设置与帮助">
        <ListLink to="/me/data" title="数据与备份" detail="导出、导入、重置" />
        <ListLink to="/me/install" title="添加到主屏幕" detail="离线可用，数据也更不容易被清掉" />
        <ListLink to="/about" title="关于画风地图" detail="图片来源与版权规则" />
      </Section>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface py-3">
      <div className="font-serif text-2xl tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
