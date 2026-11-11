import type { StyleBody } from './schema'

/** 风格文件正文里的二级标题 → 字段（SPEC §7） */
export const sectionKeys: Record<string, keyof StyleBody> = {
  一句话: 'oneLiner',
  怎么看: 'howToLook',
  为什么长这样: 'background',
  怎么画: 'howToDraw',
  '15 分钟练习': 'exercise',
}

export interface ParsedBody {
  body: StyleBody
  unknownSections: string[]
  missingSections: string[]
}

/** 把风格文件的 Markdown 正文拆成五个字段。纯函数，便于测试。 */
export function parseStyleBody(markdown: string): ParsedBody {
  const body: StyleBody = { oneLiner: '', howToLook: [], background: '', howToDraw: '', exercise: '' }
  const unknownSections: string[] = []
  const seen = new Set<keyof StyleBody>()

  const parts = markdown.split(/^##[ \t]+(.+?)[ \t]*$/m)
  for (let i = 1; i < parts.length; i += 2) {
    const heading = (parts.at(i) ?? '').trim()
    const content = (parts.at(i + 1) ?? '').trim()
    const key = sectionKeys[heading]
    if (!key) {
      unknownSections.push(heading)
      continue
    }
    seen.add(key)
    if (key === 'howToLook') {
      body.howToLook = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .map((line) => line.slice(2).trim())
    } else if (key === 'oneLiner') {
      body.oneLiner = content.replace(/\s*\n\s*/g, '')
    } else {
      body[key] = content
    }
  }

  const missingSections = Object.entries(sectionKeys)
    .filter(([, key]) => !seen.has(key))
    .map(([heading]) => heading)

  return { body, unknownSections, missingSections }
}
