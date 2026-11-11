import { Link } from 'react-router'
import { Page } from '../components/ui'

export function NotFound() {
  return (
    <Page back title="没找到这一页">
      <p className="text-muted">可能是链接写错了，或者这部分内容还没上线。</p>
      <Link to="/" className="mt-4 inline-block text-accent underline underline-offset-4">
        回到导览
      </Link>
    </Page>
  )
}
