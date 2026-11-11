import { describe, expect, it } from 'vitest'
import { loadContent } from '../scripts/lib/load-content'
import { checkContent } from '../scripts/lib/rules'
import type { ContentBundle, Style } from '../src/content/schema'
import { parseStyleBody } from '../src/content/parse'
import { textWidth } from '../src/content/text'

describe('content', () => {
  const { bundle, errors } = loadContent()

  it('仓库里的内容能通过格式检查', () => {
    expect(errors).toEqual([])
    expect(bundle).not.toBeNull()
  })

  it('九大类齐全且顺序正确', () => {
    expect(bundle?.families.map((f) => f.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(bundle?.families.reduce((sum, f) => sum + f.planned, 0)).toBe(77)
  })

  it('金标准样例（浮世绘）五个段落都解析出来了', () => {
    const ukiyo = bundle?.styles.find((s) => s.id === 'ukiyo-e')
    expect(ukiyo?.body.oneLiner).toMatch(/^江户/)
    expect(ukiyo?.body.howToLook).toHaveLength(5)
    expect(ukiyo?.body.background).toContain('锦绘')
    expect(ukiyo?.body.howToDraw).toContain('技法')
    expect(ukiyo?.body.exercise).toContain('3×3')
  })

  it('仓库内容没有校验错误', () => {
    if (!bundle) throw new Error('no bundle')
    const report = checkContent(bundle, { imageExists: () => true })
    expect(report.errors).toEqual([])
  })
})

describe('parseStyleBody', () => {
  it('识别五个标题，报告缺失和未知标题', () => {
    const md = '## 一句话\n一句\n话\n\n## 怎么看\n- 甲\n- 乙\n\n## 闲话\n随便'
    const { body, missingSections, unknownSections } = parseStyleBody(md)
    expect(body.oneLiner).toBe('一句话')
    expect(body.howToLook).toEqual(['甲', '乙'])
    expect(unknownSections).toEqual(['闲话'])
    expect(missingSections).toEqual(['为什么长这样', '怎么画', '15 分钟练习'])
  })
})

describe('textWidth', () => {
  it('汉字记 1，ASCII 记 0.5，空白不计', () => {
    expect(textWidth('浮世绘')).toBe(3)
    expect(textWidth('ukiyo e')).toBe(3)
    expect(textWidth('看 bokashi')).toBe(4.5)
  })
})

describe('checkContent 规则', () => {
  function bundleWith(style: Partial<Style>): ContentBundle {
    const { bundle } = loadContent()
    if (!bundle) throw new Error('no bundle')
    const base = bundle.styles.find((s) => s.id === 'ukiyo-e')!
    // 其他风格原样保留；去掉浮世绘自己的作品，让“图不够”的规则总能被测到
    return {
      ...bundle,
      styles: bundle.styles.map((s) => (s.id === 'ukiyo-e' ? ({ ...base, ...style } as Style) : s)),
      artworks: bundle.artworks.filter((a) => !a.styleIds.includes('ukiyo-e')),
    }
  }

  it('提示词里不能出现 1955 年以后去世的画家', () => {
    const b = bundleWith({
      keyArtists: [{ zh: '凯·尼尔森', en: 'Kay Nielsen', deathYear: 1957 }],
      prompt: { style: 'x', medium: [], palette: [], composition: [], artistsPD: ['Kay Nielsen'], negative: [] },
    })
    expect(checkContent(b, { imageExists: () => true }).errors.join()).toMatch(/1957/)
  })

  it('ready 风格图不够 4 幅是错误，draft 只提醒', () => {
    const ready = checkContent(bundleWith({ status: 'ready' }), { imageExists: () => true })
    expect(ready.errors.join()).toMatch(/至少 4 幅/)
    const draft = checkContent(bundleWith({ status: 'draft' }), { imageExists: () => true })
    expect(draft.errors).toEqual([])
    expect(draft.warnings.join()).toMatch(/至少 4 幅/)
  })

  it('不认识的地区 id 是错误', () => {
    const b = bundleWith({ regions: ['atlantis'] })
    expect(checkContent(b, { imageExists: () => true }).errors.join()).toMatch(/atlantis/)
  })
})
