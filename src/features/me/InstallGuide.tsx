import { Card, Page, Section } from '../../components/ui'

export function InstallGuide() {
  return (
    <Page back title="添加到主屏幕" subtitle="装好后像普通 App 一样打开，看过的内容断网也能看。">
      <Section title="iPhone（Safari）">
        <Card>
          <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>用 Safari 打开画风地图。</li>
            <li>点底部工具栏的“分享”按钮（方框加向上箭头）。</li>
            <li>向下滑，选“添加到主屏幕”，再点“添加”。</li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            为什么要加：Safari 可能会清掉一段时间没打开的网站的数据，加到主屏幕后不受这条限制。
          </p>
        </Card>
      </Section>

      <Section title="安卓（Chrome）">
        <Card>
          <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>用 Chrome 打开画风地图。</li>
            <li>点右上角的三个点。</li>
            <li>选“安装应用”或“添加到主屏幕”。</li>
          </ol>
        </Card>
      </Section>

      <p className="mt-6 text-sm text-muted">装好之后也建议偶尔在“数据与备份”里导出一份备份。</p>
    </Page>
  )
}
