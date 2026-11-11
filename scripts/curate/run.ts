/**
 * 挑图管线入口，在 GitHub Actions 里运行（.github/workflows/curate.yml），本地也能跑：npm run curate
 *  1. requests/<id>.json 变了 → 重新抓候选，写 candidates/<id>.json 和 sheets/<id>-<页>.jpg
 *  2. picks/<id>.json 存在 → 下载选中的图，写 public/img/art/ 和 content/artworks.json
 * 可重复运行：请求没变就不重抓，图片已在就不重下。
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Artwork } from '../../src/content/schema'
import { root } from '../lib/load-content'
import { processCandidate } from './images'
import { makeContactSheet } from './sheet'
import { fetchQuery } from './sources'
import type { CandidatesFile, PicksFile, RawCandidate, RequestFile } from './types'
import { SHEET_PAGE_SIZE, artworkIdOf, buildArtwork, chunk, findCandidate, mergeCandidates } from './util'

const curationDir = path.join(root, 'content', 'curation')
const dirs = {
  requests: path.join(curationDir, 'requests'),
  candidates: path.join(curationDir, 'candidates'),
  sheets: path.join(curationDir, 'sheets'),
  picks: path.join(curationDir, 'picks'),
}
const artworksPath = path.join(root, 'content', 'artworks.json')
const publicDir = path.join(root, 'public')

/** 命令行可以只处理几种风格：npx tsx scripts/curate/run.ts picture-books gouache（本地只连得上 GitHub 时用） */
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('-')))
const wanted = (styleId: string) => only.size === 0 || only.has(styleId)

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T
const writeJson = (file: string, data: unknown) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
const listJson = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [])
const hashOf = (data: unknown) => createHash('sha1').update(JSON.stringify(data)).digest('hex').slice(0, 12)

async function refreshCandidates() {
  for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true })
  for (const file of listJson(dirs.requests)) {
    const request = readJson<RequestFile>(path.join(dirs.requests, file))
    if (!wanted(request.styleId)) continue
    const outFile = path.join(dirs.candidates, `${request.styleId}.json`)
    const requestHash = hashOf(request)
    const previous = fs.existsSync(outFile) ? readJson<CandidatesFile>(outFile) : undefined
    if (previous?.requestHash === requestHash) {
      console.log(`[候选] ${request.styleId}：请求没变，跳过`)
      continue
    }
    const notes: string[] = []
    const raw: RawCandidate[] = []
    for (const query of request.queries) {
      try {
        const found = await fetchQuery(query)
        notes.push(`${JSON.stringify(query)} → ${found.length} 条`)
        raw.push(...found)
      } catch (error) {
        notes.push(`${JSON.stringify(query)} → 失败：${String(error).slice(0, 200)}`)
      }
    }
    const candidates = mergeCandidates(previous?.candidates ?? [], raw)

    // 旧的联系表先删掉，再按每页 20 条重新拼
    for (const f of fs.readdirSync(dirs.sheets)) {
      if (f.startsWith(`${request.styleId}-`) && f.endsWith('.jpg')) fs.rmSync(path.join(dirs.sheets, f))
    }
    for (const [i, page] of chunk(candidates, SHEET_PAGE_SIZE).entries()) {
      notes.push(...(await makeContactSheet(page, path.join(dirs.sheets, `${request.styleId}-${i + 1}.jpg`))))
    }
    writeJson(outFile, { styleId: request.styleId, requestHash, fetchedAt: new Date().toISOString(), candidates, notes })
    const added = candidates.length - (previous?.candidates.length ?? 0)
    console.log(`[候选] ${request.styleId}：${candidates.length} 条（新增 ${added}）\n  ${notes.join('\n  ')}`)
  }
}

async function applyPicks() {
  let artworks: Artwork[] = fs.existsSync(artworksPath) ? readJson<Artwork[]>(artworksPath) : []
  const today = new Date().toISOString().slice(0, 10)

  for (const file of listJson(dirs.picks)) {
    const picks = readJson<PicksFile>(path.join(dirs.picks, file))
    if (!wanted(picks.styleId)) continue
    const candFile = path.join(dirs.candidates, `${picks.styleId}.json`)
    if (!fs.existsSync(candFile)) {
      console.log(`[下载] ${picks.styleId}：还没有候选文件，跳过`)
      continue
    }
    const { candidates } = readJson<CandidatesFile>(candFile)
    const keep = new Set<string>()

    for (const pick of picks.picks) {
      const c = findCandidate(candidates, pick)
      if (!c) {
        // 候选重抓后可能暂时少了这一条（如来源限流），已下载的作品照旧保留
        if (pick.id && artworks.some((a) => a.id === pick.id)) {
          keep.add(pick.id)
          console.log(`[下载] ${picks.styleId}：候选里暂时没有 ${pick.id}，保留已下载的作品`)
        } else console.log(`[下载] ${picks.styleId}：找不到候选 ${pick.id ?? `#${pick.n}`}`)
        continue
      }
      const id = artworkIdOf(c)
      const existing = artworks.find((a) => a.id === id)
      const haveFiles =
        existing !== undefined &&
        [existing.img.thumb, existing.img.display].every((f) => fs.existsSync(path.join(publicDir, f)))

      let image
      if (haveFiles && existing) {
        image = {
          width: existing.img.width,
          height: existing.img.height,
          sourceWidth: existing.sourceSize?.width ?? existing.img.width,
          sourceHeight: existing.sourceSize?.height ?? existing.img.height,
          palette: existing.palette,
        }
      } else {
        try {
          const p = await processCandidate(c, id, publicDir)
          image = {
            width: p.width,
            height: p.height,
            sourceWidth: c.width ?? p.inputWidth,
            sourceHeight: c.height ?? p.inputHeight,
            palette: p.palette,
          }
          const longEdge = Math.max(image.sourceWidth, image.sourceHeight)
          console.log(
            `[下载] ${picks.styleId} #${c.n} → ${id}（源图 ${image.sourceWidth}×${image.sourceHeight}）` +
              (longEdge < 1200 ? ' ⚠ 源图长边不足 1200px' : ''),
          )
        } catch (error) {
          console.log(`[下载] ${picks.styleId} #${c.n} → 失败：${String(error).slice(0, 200)}`)
          continue
        }
      }
      keep.add(id)
      if (pick.cover) console.log(`[封面] ${picks.styleId} → ${id}`)
      const record = buildArtwork({ candidate: c, pick, styleId: picks.styleId, existing, image, today })
      artworks = [...artworks.filter((a) => a.id !== id), record]
    }

    // 不再被选中的作品从这个风格里移除；没有风格的作品连同图片一起删掉
    artworks = artworks.flatMap((a) => {
      if (!a.styleIds.includes(picks.styleId) || keep.has(a.id)) return [a]
      const styleIds = a.styleIds.filter((s) => s !== picks.styleId)
      if (styleIds.length > 0) return [{ ...a, styleIds }]
      for (const f of [a.img.thumb, a.img.display]) fs.rmSync(path.join(publicDir, f), { force: true })
      console.log(`[下载] ${picks.styleId}：移除 ${a.id}`)
      return []
    })
  }

  artworks.sort((a, b) => a.id.localeCompare(b.id))
  writeJson(artworksPath, artworks)
  const bytes = fs.existsSync(path.join(publicDir, 'img', 'art'))
    ? fs
        .readdirSync(path.join(publicDir, 'img', 'art'))
        .reduce((sum, f) => sum + fs.statSync(path.join(publicDir, 'img', 'art', f)).size, 0)
    : 0
  console.log(`[作品] 共 ${artworks.length} 幅，图片合计 ${(bytes / 1024 / 1024).toFixed(1)} MB`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await refreshCandidates()
  await applyPicks()
}
