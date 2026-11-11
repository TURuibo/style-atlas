/** 作品作者 → 风格文件里的代表人物（SPEC §4.6“画家（生卒）”）。纯函数。 */

export interface KeyArtistLike {
  zh: string
  en?: string
  life?: string
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 全名对上，或英文名最后一个词（姓或画号，至少 4 个字母）对上都算；
 * “Attributed to”记作“传”，“After”记作“仿”；“Style of”“Workshop of”等不算本人。
 */
export function matchKeyArtist(artist: string | undefined, keyArtists: readonly KeyArtistLike[]): { zh: string; life?: string } | undefined {
  const name = artist?.toLowerCase().trim()
  if (!name) return undefined
  if (/^(style of|workshop of|circle of|school of|follower of)\b/.test(name)) return undefined
  const qualifier = /^attributed to\b/.test(name) ? '传' : /^after\b/.test(name) ? '仿' : ''
  const hit = keyArtists.find((a) => {
    if (!a.en) return false
    const en = a.en.toLowerCase()
    const last = en.split(/\s+/).at(-1) ?? ''
    return name.includes(en) || (last.length >= 4 && new RegExp(`(^|[^a-z])${escape(last)}([^a-z]|$)`).test(name))
  })
  return hit ? { zh: `${qualifier}${hit.zh}`, ...(hit.life ? { life: hit.life } : {}) } : undefined
}
