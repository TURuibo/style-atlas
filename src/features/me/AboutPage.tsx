import { Card, Page, Section } from '../../components/ui'
import { content } from '../../content'

const imageSources = [
  { name: '大都会艺术博物馆（The Met）', url: 'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access' },
  { name: '芝加哥艺术博物馆（Art Institute of Chicago）', url: 'https://www.artic.edu/open-access/open-access-images' },
  { name: '克利夫兰艺术博物馆（Cleveland Museum of Art）', url: 'https://www.clevelandart.org/open-access' },
  { name: '维基共享资源（Wikimedia Commons）', url: 'https://commons.wikimedia.org/' },
  { name: '美国国会图书馆（Library of Congress）', url: 'https://www.loc.gov/' },
]

export function AboutPage() {
  return (
    <Page back title="关于画风地图">
      <p className="leading-relaxed">
        一个只给自己用的插画风格探索应用：用盲测摸清口味，跟着导览走过九大类、七十多种风格，再把喜欢的风格变成学画路线和 AI
        出图提示词。
      </p>

      <Section title="图片与版权">
        <Card>
          <ul className="space-y-2 text-sm leading-relaxed">
            <li>应用里的图片只用博物馆和公共图库明确标为公共领域或 CC0 的作品。</li>
            <li>每幅图都写明出处、作者、年代和许可，可以点进原馆网页看高清。</li>
            <li>仍有版权的当代画风不放图，只给文字讲解和外部看图链接。</li>
            <li>AI 关键词里只出现 1955 年及以前去世的画家的名字。</li>
          </ul>
        </Card>
      </Section>

      <Section title="图片来源">
        <ul className="space-y-1.5">
          {imageSources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-4">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="隐私">
        <p className="text-sm leading-relaxed">
          评分、收藏和笔记只存在你这台设备的浏览器里，不上传任何服务器，也没有统计和追踪。换设备请用“数据与备份”导出再导入。
        </p>
      </Section>

      <p className="mt-8 text-xs text-muted">内容版本：{new Date(content.builtAt).toLocaleString('zh-CN')}</p>
    </Page>
  )
}
