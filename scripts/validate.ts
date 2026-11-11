/**
 * 内容与许可校验（SPEC §10.4 第 5 步）。有错误时以非零状态退出，阻止部署。
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadContent, root } from './lib/load-content'
import { checkContent, danglingRelated } from './lib/rules'

const { bundle, errors: loadErrors, warnings: loadWarnings, styleFiles } = loadContent()

if (!bundle) {
  for (const error of loadErrors) console.error(`错误：${error}`)
  process.exit(1)
}

const publicDir = path.join(root, 'public')
const { errors, warnings } = checkContent(bundle, {
  imageExists: (relative) => fs.existsSync(path.join(publicDir, relative)),
  styleFiles,
})

const allErrors = [...loadErrors, ...errors]
const allWarnings = [...loadWarnings, ...warnings]
const dangling = danglingRelated(bundle)

for (const warning of allWarnings) console.warn(`提醒：${warning}`)
if (dangling.length > 0) console.warn(`提醒：相关风格里有 ${dangling.length} 条指向还没写的风格（扩内容时补齐）`)
for (const error of allErrors) console.error(`错误：${error}`)

const ready = bundle.styles.filter((s) => s.status === 'ready').length
console.log(
  `校验完成：${bundle.styles.length} 种风格（ready ${ready}，draft ${bundle.styles.length - ready}），` +
    `${bundle.artworks.length} 幅作品；${allErrors.length} 个错误，${allWarnings.length} 个提醒。`,
)
process.exit(allErrors.length > 0 ? 1 : 0)
