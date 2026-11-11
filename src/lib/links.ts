/** 外部看图链接（SPEC §4.5）：只放搜索链接，不嵌入别人的图。 */
export interface ExternalLink {
  label: string
  url: string
}

/** 按风格追加的站内搜索（风格文件的 externalExtra） */
export type ExtraSite = 'pixiv' | 'zcool' | 'dribbble' | 'xiaohongshu'

const extraSites: Record<ExtraSite, { label: string; url: (q: string) => string }> = {
  pixiv: { label: 'Pixiv', url: (q) => `https://www.pixiv.net/tags/${q}/artworks` },
  zcool: { label: '站酷', url: (q) => `https://www.zcool.com.cn/search/content?word=${q}` },
  dribbble: { label: 'Dribbble', url: (q) => `https://dribbble.com/search/${q}` },
  xiaohongshu: { label: '小红书', url: (q) => `https://www.xiaohongshu.com/search_result?keyword=${q}` },
}

/**
 * 外链按钮组：Google 图片、Pinterest、Behance、ArtStation，再加按风格挑的站（Pixiv、站酷等）和维基百科。
 * 维基百科优先用风格文件里列的条目，没有就在中文维基里搜风格名。
 */
export function externalSearchLinks(
  query: string,
  wiki?: { sources?: readonly string[]; name?: string },
  extra: readonly { site: ExtraSite; q: string }[] = [],
): ExternalLink[] {
  const q = encodeURIComponent(query)
  const links: ExternalLink[] = [
    { label: 'Google 图片', url: `https://www.google.com/search?tbm=isch&q=${q}` },
    { label: 'Pinterest', url: `https://www.pinterest.com/search/pins/?q=${q}` },
    { label: 'Behance', url: `https://www.behance.net/search/projects?search=${q}` },
    { label: 'ArtStation', url: `https://www.artstation.com/search?sort_by=relevance&query=${q}` },
  ]
  for (const { site, q: siteQuery } of extra) {
    const def = extraSites[site]
    links.push({ label: def.label, url: def.url(encodeURIComponent(siteQuery)) })
  }
  if (wiki) {
    const sources = wiki.sources ?? []
    const page =
      sources.find((u) => u.includes('zh.wikipedia.org')) ?? sources.find((u) => /\.wikipedia\.org\//.test(u))
    const url =
      page ?? (wiki.name ? `https://zh.wikipedia.org/w/index.php?search=${encodeURIComponent(wiki.name)}` : undefined)
    if (url) links.push({ label: '维基百科', url })
  }
  return links
}

/** 一种风格的 AI 关键词拼成一行（不含题材），供“复制全部”使用。 */
export function stylePromptLine(prompt: {
  style: string
  medium: string[]
  palette: string[]
  composition: string[]
  artistsPD: string[]
}, includeArtists: boolean): string {
  const parts = [prompt.style, ...prompt.medium, ...prompt.composition]
  if (prompt.palette.length > 0) parts.push(`palette of ${prompt.palette.join(', ')}`)
  if (includeArtists && prompt.artistsPD.length > 0) parts.push(`in the manner of ${prompt.artistsPD.join(' and ')}`)
  return parts.join(', ')
}
