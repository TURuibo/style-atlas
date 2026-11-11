import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import YAML from 'yaml'
import { z } from 'zod'
import {
  ArtworkSchema,
  FamilySchema,
  StyleFrontmatterSchema,
  VocabSchema,
  type ContentBundle,
  type Style,
} from '../../src/content/schema'
import { parseStyleBody } from '../../src/content/parse'

export const root = path.resolve(import.meta.dirname, '..', '..')
export const contentDir = path.join(root, 'content')

export interface LoadResult {
  bundle: ContentBundle | null
  errors: string[]
  warnings: string[]
  /** 风格 id → 文件名，用于检查文件名与 id 一致 */
  styleFiles: Map<string, string>
}

function describe(error: z.ZodError): string {
  return error.issues.map((issue) => `  ${issue.path.join('.') || '(根)'}: ${issue.message}`).join('\n')
}

/** 读入并校验 content/ 下的全部内容，返回合并后的数据包。 */
export function loadContent(): LoadResult {
  const errors: string[] = []
  const warnings: string[] = []
  const styleFiles = new Map<string, string>()

  const vocabResult = VocabSchema.safeParse(YAML.parse(fs.readFileSync(path.join(contentDir, 'vocab.yaml'), 'utf8')))
  if (!vocabResult.success) errors.push(`vocab.yaml 格式错误：\n${describe(vocabResult.error)}`)

  const familiesResult = z
    .array(FamilySchema)
    .safeParse(YAML.parse(fs.readFileSync(path.join(contentDir, 'families.yaml'), 'utf8')))
  if (!familiesResult.success) errors.push(`families.yaml 格式错误：\n${describe(familiesResult.error)}`)

  const artworksResult = z
    .array(ArtworkSchema)
    .safeParse(JSON.parse(fs.readFileSync(path.join(contentDir, 'artworks.json'), 'utf8')))
  if (!artworksResult.success) errors.push(`artworks.json 格式错误：\n${describe(artworksResult.error)}`)

  const styles: Style[] = []
  const stylesDir = path.join(contentDir, 'styles')
  const files = fs.existsSync(stylesDir) ? fs.readdirSync(stylesDir).filter((f) => f.endsWith('.md')).sort() : []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(stylesDir, file), 'utf8')
    const { data, content } = matter(raw)
    const front = StyleFrontmatterSchema.safeParse(data)
    if (!front.success) {
      errors.push(`styles/${file} 的 frontmatter 有误：\n${describe(front.error)}`)
      continue
    }
    const { body, unknownSections, missingSections } = parseStyleBody(content)
    for (const heading of unknownSections) warnings.push(`styles/${file}：不认识的标题“${heading}”，已忽略`)
    if (missingSections.length > 0) {
      const message = `styles/${file}：缺少段落 ${missingSections.join('、')}`
      if (front.data.status === 'ready') errors.push(message)
      else warnings.push(message)
    }
    styles.push({ ...front.data, body })
    styleFiles.set(front.data.id, file)
  }

  if (!vocabResult.success || !familiesResult.success || !artworksResult.success) {
    return { bundle: null, errors, warnings, styleFiles }
  }

  const bundle: ContentBundle = {
    builtAt: new Date().toISOString(),
    vocab: vocabResult.data,
    families: [...familiesResult.data].sort((a, b) => a.order - b.order),
    styles,
    artworks: artworksResult.data,
  }
  return { bundle, errors, warnings, styleFiles }
}
