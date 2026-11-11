/** 生成 docs/COVERAGE.md（SPEC §10.4 第 6 步） */
import fs from 'node:fs'
import path from 'node:path'
import { coverageReport } from './lib/coverage'
import { loadContent, root } from './lib/load-content'

const { bundle, errors } = loadContent()
if (!bundle) {
  for (const error of errors) console.error(`错误：${error}`)
  process.exit(1)
}

const publicDir = path.join(root, 'public')
const size = (relative: string) => {
  const file = path.join(publicDir, relative)
  return fs.existsSync(file) ? fs.statSync(file).size : 0
}

const today = new Date().toISOString().slice(0, 10)
fs.writeFileSync(path.join(root, 'docs', 'COVERAGE.md'), coverageReport(bundle, size, today))
console.log('已生成 docs/COVERAGE.md')
