import { Link } from 'react-router'
import { Card, Page } from '../../components/ui'
import { content } from '../../content'

/** 盲测在 Phase 3 实现；这里先说明开放条件。 */
export const BLIND_FIRST_ROUND = 24

export function BlindPage() {
  const eligible = content.artworks.filter((a) => a.blindEligible).length
  return (
    <Page title="盲测" subtitle="不看名字，只凭第一眼打分，看看你真正喜欢什么。">
      <Card>
        <p className="leading-relaxed">
          盲测需要至少 {BLIND_FIRST_ROUND} 幅来自不同大类的图。现在有 {eligible} 幅，图片上线后这里会自动开放。
        </p>
        <p className="mt-3 text-sm text-muted">在那之前，可以先去导览读一读各个大类。</p>
        <Link to="/" className="mt-4 inline-block text-accent underline underline-offset-4">
          去导览
        </Link>
      </Card>
    </Page>
  )
}
