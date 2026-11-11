import type { ContentBundle, Style } from '../../src/content/schema'
import { textLimits, textWidth } from '../../src/content/text'

export interface RuleContext {
  /** 相对 public/ 的图片路径是否存在 */
  imageExists: (relativePath: string) => boolean
  /** 风格 id → 文件名 */
  styleFiles?: Map<string, string>
}

export interface RuleReport {
  errors: string[]
  warnings: string[]
}

/** 画家名可写进提示词的最晚卒年（SPEC §8.2 第 6 条） */
export const PD_DEATH_YEAR_LIMIT = 1955
/** 配图风格至少要有的作品数（SPEC §8.2 第 4 条） */
export const MIN_ARTWORKS = 4

/** SPEC §10.4 第 5 步的全部内容规则。ready 风格违规记为错误，draft 只记提醒。 */
export function checkContent(bundle: ContentBundle, ctx: RuleContext): RuleReport {
  const errors: string[] = []
  const warnings: string[] = []
  const { vocab } = bundle
  const styleIds = new Set<string>()

  // 大类
  const familyIds = new Set(bundle.families.map((f) => f.id))
  for (const id of Object.keys(vocab.families)) {
    if (!familyIds.has(id)) errors.push(`families.yaml 缺少大类 ${id}`)
  }
  for (const family of bundle.families) {
    if (!(family.id in vocab.families)) errors.push(`families.yaml 里的 ${family.id} 不在 vocab.yaml 中`)
  }
  const orders = bundle.families.map((f) => f.order)
  if (new Set(orders).size !== orders.length) errors.push('families.yaml 的 order 有重复')

  // 作品
  const artworkIds = new Set<string>()
  for (const art of bundle.artworks) {
    if (artworkIds.has(art.id)) errors.push(`作品 id 重复：${art.id}`)
    artworkIds.add(art.id)
    for (const subject of art.subjects) {
      if (!(subject in vocab.subjects)) errors.push(`作品 ${art.id} 的题材 ${subject} 不在 vocab.yaml 中`)
    }
    for (const file of [art.img.thumb, art.img.display]) {
      if (!ctx.imageExists(file)) errors.push(`作品 ${art.id} 缺图片文件 public/${file}`)
    }
    if (!art.credit.trim()) errors.push(`作品 ${art.id} 缺鸣谢文字`)
  }

  for (const style of bundle.styles) {
    const where = `风格 ${style.id}`
    const report = (message: string) => (style.status === 'ready' ? errors : warnings).push(`${where}：${message}`)

    if (styleIds.has(style.id)) errors.push(`风格 id 重复：${style.id}`)
    styleIds.add(style.id)

    const file = ctx.styleFiles?.get(style.id)
    if (file && file !== `${style.id}.md`) errors.push(`${where}：文件名应为 ${style.id}.md（现为 ${file}）`)

    // 词表
    if (!(style.family in vocab.families)) errors.push(`${where}：大类 ${style.family} 不在 vocab.yaml 中`)
    for (const region of style.regions) {
      if (!(region in vocab.regions)) errors.push(`${where}：地区 ${region} 不在 vocab.yaml 中`)
    }
    for (const mood of style.moods) {
      if (!(mood in vocab.moods)) errors.push(`${where}：情绪标签 ${mood} 不在 vocab.yaml 中`)
    }
    for (const medium of style.mediums) {
      if (!(medium in vocab.mediums)) errors.push(`${where}：媒材标签 ${medium} 不在 vocab.yaml 中`)
    }

    // 年代
    if (style.era.end !== null && style.era.end < style.era.start) errors.push(`${where}：年代结束早于开始`)

    // 提示词里的画家名必须是已进入公共领域的画家（硬规则）
    for (const name of style.prompt.artistsPD) {
      const artist = style.keyArtists.find((a) => a.en === name)
      if (!artist) errors.push(`${where}：artistsPD 里的 ${name} 没有对应的 keyArtists[].en`)
      else if (artist.deathYear === undefined) errors.push(`${where}：${name} 缺 deathYear，不能写进提示词`)
      else if (artist.deathYear > PD_DEATH_YEAR_LIMIT)
        errors.push(`${where}：${name} 卒于 ${artist.deathYear}，晚于 ${PD_DEATH_YEAR_LIMIT}，不能写进提示词`)
    }
    if (style.imageMode === 'external-only' && style.prompt.artistsPD.length > 0) {
      errors.push(`${where}：外链风格不应在提示词里写画家名`)
    }

    // 作品数量与封面
    const own = bundle.artworks.filter((a) => a.styleIds.includes(style.id))
    if (style.imageMode !== 'external-only' && own.length < MIN_ARTWORKS) {
      report(`只有 ${own.length} 幅作品，配图风格至少 ${MIN_ARTWORKS} 幅`)
    }
    if (style.imageMode === 'external-only' && own.length > 0) {
      errors.push(`${where}：外链风格不能配图（${own.length} 幅）`)
    }
    if (style.coverArtworkId && !own.some((a) => a.id === style.coverArtworkId)) {
      errors.push(`${where}：封面 ${style.coverArtworkId} 不是这个风格的作品`)
    }

    // 来源
    if (style.sources.length < 2) report(`来源链接只有 ${style.sources.length} 个，至少 2 个`)
    if (style.keyArtists.length === 0) report('缺代表人物')

    // 文字
    checkText(style, report)
  }

  for (const art of bundle.artworks) {
    for (const id of art.styleIds) {
      if (!styleIds.has(id)) errors.push(`作品 ${art.id} 属于不存在的风格 ${id}`)
    }
  }

  return { errors, warnings }
}

function checkText(style: Style, report: (message: string) => void) {
  const { body } = style
  if (!body.oneLiner) report('缺“一句话”')
  else if (textWidth(body.oneLiner) > textLimits.oneLiner)
    report(`“一句话”${textWidth(body.oneLiner)} 字，超过 ${textLimits.oneLiner}`)

  if (body.howToLook.length < textLimits.howToLookMin || body.howToLook.length > textLimits.howToLookMax) {
    report(`“怎么看”有 ${body.howToLook.length} 条，应为 ${textLimits.howToLookMin}–${textLimits.howToLookMax} 条`)
  }
  body.howToLook.forEach((item, i) => {
    if (textWidth(item) > textLimits.howToLookItem)
      report(`“怎么看”第 ${i + 1} 条 ${textWidth(item)} 字，超过 ${textLimits.howToLookItem}`)
  })

  if (!body.background) report('缺“为什么长这样”')
  else if (textWidth(body.background) > textLimits.background)
    report(`“为什么长这样”${textWidth(body.background)} 字，超过 ${textLimits.background}`)

  if (!body.howToDraw) report('缺“怎么画”')
  if (!body.exercise) report('缺“15 分钟练习”')
  else if (textWidth(body.exercise) > textLimits.exercise)
    report(`“15 分钟练习”${textWidth(body.exercise)} 字，超过 ${textLimits.exercise}`)
}

/** 引用了尚未存在的风格的 related 条目，单独列出，方便扩内容时补齐。 */
export function danglingRelated(bundle: ContentBundle): string[] {
  const ids = new Set(bundle.styles.map((s) => s.id))
  const out: string[] = []
  for (const style of bundle.styles) {
    const related = [...style.related.influencedBy, ...style.related.influenced, ...style.related.similar]
    for (const id of related) if (!ids.has(id)) out.push(`${style.id} → ${id}`)
  }
  return out
}
