import { describe, expect, it } from 'vitest'
import { externalSearchLinks } from '../src/lib/links'

describe('外链按钮组', () => {
  it('四个看图网站加维基百科，优先用风格文件里的中文维基条目', () => {
    const links = externalSearchLinks('manga page', {
      sources: ['https://en.wikipedia.org/wiki/Manga', 'https://zh.wikipedia.org/wiki/日本漫画'],
      name: '日本漫画',
    })
    expect(links.map((l) => l.label)).toEqual(['Google 图片', 'Pinterest', 'Behance', 'ArtStation', '维基百科'])
    expect(links.at(-1)?.url).toBe('https://zh.wikipedia.org/wiki/日本漫画')
  })
  it('没有维基条目时在中文维基里搜风格名；不传参数就不加', () => {
    expect(externalSearchLinks('x', { sources: [], name: '工笔' }).at(-1)?.url).toBe(
      'https://zh.wikipedia.org/w/index.php?search=%E5%B7%A5%E7%AC%94',
    )
    expect(externalSearchLinks('x').map((l) => l.label)).not.toContain('维基百科')
  })
})
