/**
 * 把 content/ 下的 YAML、Markdown 和 JSON 编译成应用读取的 src/content/generated/content.json。
 * 格式错误直接失败；内容规则（图片数量、文字长度、许可等）由 validate.ts 检查。
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadContent, root } from './lib/load-content'

const { bundle, errors, warnings } = loadContent()

for (const warning of warnings) console.warn(`提醒：${warning}`)
if (errors.length > 0 || !bundle) {
  for (const error of errors) console.error(`错误：${error}`)
  process.exit(1)
}

const outDir = path.join(root, 'src', 'content', 'generated')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'content.json'), JSON.stringify(bundle))

const ready = bundle.styles.filter((s) => s.status === 'ready').length
console.log(
  `内容已生成：${bundle.families.length} 个大类，${bundle.styles.length} 种风格（ready ${ready}），${bundle.artworks.length} 幅作品。`,
)
