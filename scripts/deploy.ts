/**
 * 本地发布（备用）：校验、测试、构建，再把 dist/ 增量提交到 gh-pages 分支。
 * 平时推送到 main 后由 .github/workflows/deploy.yml 自动发布，不需要运行这个脚本。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { root } from './lib/load-content'

const sh = (cmd: string, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' })
const out = (cmd: string, cwd = root) => execSync(cmd, { cwd }).toString().trim()

sh('npm run validate')
sh('npm test')
sh('npm run build')

const dist = path.join(root, 'dist')
fs.writeFileSync(path.join(dist, '.nojekyll'), '')

const remote = out('git remote get-url origin')
const sha = out('git rev-parse --short HEAD')
const tmp = path.join(root, '.deploy-tmp')
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp)

sh('git init -q -b gh-pages', tmp)
sh(`git remote add origin ${remote}`, tmp)
let hasRemoteBranch = true
try {
  // 只取最新一层历史，推送时只上传变化的文件，避免整站重传
  sh('git fetch -q --depth 1 origin gh-pages', tmp)
  sh('git reset -q --soft FETCH_HEAD', tmp)
} catch {
  hasRemoteBranch = false
}

for (const entry of fs.readdirSync(tmp)) {
  if (entry !== '.git') fs.rmSync(path.join(tmp, entry), { recursive: true, force: true })
}
fs.cpSync(dist, tmp, { recursive: true })

sh('git add -A', tmp)
const changed = out('git status --porcelain', tmp)
if (!changed && hasRemoteBranch) {
  console.log('gh-pages 已是最新，无需发布。')
} else {
  sh(`git -c user.name=style-atlas-deploy -c user.email=deploy@users.noreply.github.com commit -q -m "deploy ${sha}"`, tmp)
  sh('git push -q origin gh-pages', tmp)
  console.log(`已发布 ${sha} 到 gh-pages。`)
}
fs.rmSync(tmp, { recursive: true, force: true })
