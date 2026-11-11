import { Card, Page, Section } from '../../components/ui'
import { content } from '../../content'

const imageSources = [
  { name: '大都会艺术博物馆（The Met）', url: 'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access' },
  { name: '芝加哥艺术博物馆（Art Institute of Chicago）', url: 'https://www.artic.edu/open-access/open-access-images' },
  { name: '克利夫兰艺术博物馆（Cleveland Museum of Art）', url: 'https://www.clevelandart.org/open-access' },
  { name: '维基共享资源（Wikimedia Commons）', url: 'https://commons.wikimedia.org/' },
  { name: '美国国会图书馆（Library of Congress）', url: 'https://www.loc.gov/' },
  { name: 'StoryWeaver / Pratham Books（CC BY 4.0 绘本插画）', url: 'https://storyweaver.org.in/' },
]

export function AboutPage() {
  return (
    <Page back title="关于画风地图">
      <p className="leading-relaxed">
        一个只给自己用的插画风格探索应用：用盲测摸清口味，沿着现代线路从今天的插画往回走，再到九大类里溯源，最后把喜欢的风格变成学画路线和
        AI 出图提示词。
      </p>

      <Section title="图片与版权">
        <Card>
          <ul className="space-y-2 text-sm leading-relaxed">
            <li>历史作品只用博物馆和公共图库明确标为公共领域或 CC0 的。</li>
            <li>当代作品只用作者自己以 CC0、CC BY 或 CC BY-SA 公开的，每张都署名作者、写明许可并链回原页；不用禁止商用或禁止演绎的许可。</li>
            <li>所有图片都经过缩放和格式转换（WebP），没有改动画面内容。</li>
            <li>找不到开放图的当代画风不放图，只给文字讲解和外部看图链接；你可以把自己存的图加进“剪贴簿”，它们只存在你的手机里。</li>
            <li>AI 关键词里只出现 1955 年及以前去世的画家的名字；当代风格只用描述词。</li>
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
          评分、收藏、笔记和剪贴簿的图只存在你这台设备的浏览器里，不上传任何服务器，也没有统计和追踪。换设备请用“数据与备份”导出再导入（剪贴簿的图不在备份里，需要重新加）。
        </p>
      </Section>

      <p className="mt-8 text-xs text-muted">内容版本：{new Date(content.builtAt).toLocaleString('zh-CN')}</p>
    </Page>
  )
}
