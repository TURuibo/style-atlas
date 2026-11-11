import { describe, expect, it } from 'vitest'
import { fitWithin, formatBytes, newScrapId, scrapCounts, scrapsOfStyle, type ScrapItem } from '../src/lib/scrapbook'

const item = (id: string, styleId: string, addedAt: string): ScrapItem => ({
  id,
  styleId,
  addedAt,
  width: 100,
  height: 100,
  bytes: 1000,
})

describe('剪贴簿', () => {
  it('等比缩到长边不超过上限，不放大', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1170, 2532, 1600)).toEqual({ width: 739, height: 1600 })
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(5000, 1, 480)).toEqual({ width: 480, height: 1 })
    expect(fitWithin(0, 0, 480)).toEqual({ width: 1, height: 1 })
  })

  it('按风格取图，新加的在前', () => {
    const items = [item('a', 'gouache', '2026-11-01'), item('b', 'pixel-art', '2026-11-02'), item('c', 'gouache', '2026-11-03')]
    expect(scrapsOfStyle(items, 'gouache').map((i) => i.id)).toEqual(['c', 'a'])
    expect(scrapsOfStyle(items, 'manga')).toEqual([])
  })

  it('按风格计数，多的在前，一样多时最近加过的在前', () => {
    const items = [
      item('a', 'gouache', '2026-11-01'),
      item('b', 'pixel-art', '2026-11-05'),
      item('c', 'gouache', '2026-11-03'),
      item('d', 'risograph', '2026-11-04'),
    ]
    expect(scrapCounts(items)).toEqual([
      { styleId: 'gouache', count: 2, latest: '2026-11-03' },
      { styleId: 'pixel-art', count: 1, latest: '2026-11-05' },
      { styleId: 'risograph', count: 1, latest: '2026-11-04' },
    ])
  })

  it('id 以 my- 开头，不会和作品 id 混淆', () => {
    const id = newScrapId(new Date('2026-11-11T12:00:00Z'), () => 0.5)
    expect(id).toMatch(/^my-[0-9a-z]+$/)
    expect(newScrapId(new Date('2026-11-11T12:00:00Z'), () => 0.25)).not.toBe(id)
  })

  it('字节数换成好读的单位', () => {
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(3.4 * 1024 * 1024)).toBe('3.4 MB')
  })
})
