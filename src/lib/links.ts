/** 外部看图链接（SPEC §4.5）：只放搜索链接，不嵌入别人的图。 */
export interface ExternalLink {
  label: string
  url: string
}

export function externalSearchLinks(query: string): ExternalLink[] {
  const q = encodeURIComponent(query)
  return [
    { label: 'Google 图片', url: `https://www.google.com/search?tbm=isch&q=${q}` },
    { label: 'Pinterest', url: `https://www.pinterest.com/search/pins/?q=${q}` },
    { label: 'Behance', url: `https://www.behance.net/search/projects?search=${q}` },
    { label: 'ArtStation', url: `https://www.artstation.com/search?sort_by=relevance&query=${q}` },
  ]
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
