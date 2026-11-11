import { describe, expect, it } from 'vitest'
import { matchKeyArtist } from '../src/lib/artists'

const artists = [
  { zh: '阿尔丰斯·穆夏', en: 'Alphonse Mucha', life: '1860–1939' },
  { zh: '仇英', en: 'Qiu Ying', life: '约 1495–1552' },
  { zh: '沈铨', en: 'Shen Quan', life: '1682–1760 年代' },
  { zh: '吕纪', en: 'Lü Ji' },
  { zh: '欧仁·格拉塞', en: 'Eugène Grasset', life: '1841–1917' },
]

describe('作者对应代表人物', () => {
  it('全名或姓对上', () => {
    expect(matchKeyArtist('Alphonse Marie Mucha', artists)).toEqual({ zh: '阿尔丰斯·穆夏', life: '1860–1939' })
    expect(matchKeyArtist('Eugène-Samuel Grasset', artists)?.zh).toBe('欧仁·格拉塞')
    expect(matchKeyArtist('Lü Ji', artists)).toEqual({ zh: '吕纪' })
  })
  it('保留“传”“仿”，画派与风格不算本人', () => {
    expect(matchKeyArtist('Attributed to Qiu Ying', artists)?.zh).toBe('传仇英')
    expect(matchKeyArtist('After Shen Quan (Shen Pin)', artists)?.zh).toBe('仿沈铨')
    expect(matchKeyArtist('Style of Lü Ji 呂紀', artists)).toBeUndefined()
  })
  it('短名不按姓模糊匹配，对不上返回空', () => {
    expect(matchKeyArtist('Ji Yun', artists)).toBeUndefined()
    expect(matchKeyArtist('Unidentified artist', artists)).toBeUndefined()
    expect(matchKeyArtist(undefined, artists)).toBeUndefined()
  })
})
