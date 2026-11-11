import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ArtworkSchema } from '../src/content/schema'
import { processCandidate } from '../scripts/curate/images'
import { kmeansPalette, toHex, type RGB } from '../scripts/curate/palette'
import { makeContactSheet } from '../scripts/curate/sheet'
import {
  isCommonsPublicDomain,
  isLocUnrestricted,
  mapAic,
  mapCma,
  mapCommons,
  mapLoc,
  mapMet,
  type MetObject,
} from '../scripts/curate/sources'
import type { Candidate } from '../scripts/curate/types'
import { artworkIdOf, buildArtwork, chunk, creditOf, dedupe } from '../scripts/curate/util'

const metObject: MetObject = {
  objectID: 45434,
  isPublicDomain: true,
  primaryImage: 'https://images.metmuseum.org/CRDImages/as/original/DP130155.jpg',
  primaryImageSmall: 'https://images.metmuseum.org/CRDImages/as/web-large/DP130155.jpg',
  title: 'Under the Wave off Kanagawa',
  artistDisplayName: 'Katsushika Hokusai',
  objectDate: 'ca. 1830–32',
  medium: 'Polychrome woodblock print; ink and color on paper',
  culture: 'Japan',
  objectURL: 'https://www.metmuseum.org/art/collection/search/45434',
}

describe('色板', () => {
  it('toHex 输出大写六位', () => {
    expect(toHex([255, 0, 16])).toBe('#FF0010')
  })

  it('k-means 按占比从大到小返回主色', () => {
    const pixels: RGB[] = [
      ...Array.from({ length: 60 }, () => [250, 250, 250] as RGB),
      ...Array.from({ length: 30 }, () => [20, 40, 120] as RGB),
      ...Array.from({ length: 10 }, () => [200, 30, 30] as RGB),
    ]
    const palette = kmeansPalette(pixels, 3)
    expect(palette).toEqual(['#FAFAFA', '#142878', '#C81E1E'])
  })

  it('结果可复现，空输入返回空数组', () => {
    const pixels: RGB[] = Array.from({ length: 500 }, (_, i) => [(i * 37) % 256, (i * 91) % 256, (i * 13) % 256])
    expect(kmeansPalette(pixels)).toEqual(kmeansPalette(pixels))
    expect(kmeansPalette(pixels)).toHaveLength(5)
    expect(kmeansPalette([])).toEqual([])
  })
})

describe('来源映射', () => {
  it('Met：只收公共领域且有图的', () => {
    const c = mapMet(metObject)
    expect(c).toMatchObject({ source: 'met', sourceId: '45434', license: 'CC0', artist: 'Katsushika Hokusai' })
    expect(c?.fullUrl).toContain('/original/')
    expect(mapMet({ ...metObject, isPublicDomain: false })).toBeNull()
    expect(mapMet({ ...metObject, primaryImageSmall: '' })).toBeNull()
  })

  it('AIC：用 IIIF 地址，非公共领域丢弃', () => {
    const a = {
      id: 24645,
      title: 'Under the Wave off Kanagawa',
      artist_display: 'Katsushika Hokusai\nJapanese, 1760-1849',
      date_display: '1830/33',
      image_id: 'abc',
      is_public_domain: true,
      thumbnail: { width: 3000, height: 2000 },
    }
    const c = mapAic(a)
    expect(c?.artist).toBe('Katsushika Hokusai')
    expect(c?.previewUrl).toBe('https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg')
    expect(c?.width).toBe(3000)
    expect(mapAic({ ...a, is_public_domain: false })).toBeNull()
    expect(mapAic({ ...a, image_id: null })).toBeNull()
  })

  it('CMA：只收 CC0', () => {
    const a = {
      id: 1,
      title: 'Lady',
      share_license_status: 'CC0',
      creators: [{ description: 'Utamaro (Japanese, 1753–1806)' }],
      images: {
        web: { url: 'https://openaccess-cdn.clevelandart.org/x_web.jpg', width: '893', height: '1300' },
        print: { url: 'https://openaccess-cdn.clevelandart.org/x_print.jpg', width: '2200', height: '3200' },
      },
    }
    expect(mapCma(a)).toMatchObject({ fullUrl: 'https://openaccess-cdn.clevelandart.org/x_print.jpg', height: 3200 })
    expect(mapCma({ ...a, share_license_status: 'Copyrighted' })).toBeNull()
    expect(mapCma({ ...a, images: null })).toBeNull()
  })

  it('Commons：许可判断与字段清洗', () => {
    expect(isCommonsPublicDomain('Public domain')).toBe(true)
    expect(isCommonsPublicDomain('PD-old-100')).toBe(true)
    expect(isCommonsPublicDomain('CC0')).toBe(true)
    expect(isCommonsPublicDomain('CC BY-SA 4.0')).toBe(false)
    const page = {
      pageid: 77,
      title: 'File:John Bauer 1915.jpg',
      imageinfo: [
        {
          url: 'https://upload.wikimedia.org/a/ab/John_Bauer_1915.jpg',
          thumburl: 'https://upload.wikimedia.org/thumb/a/ab/John_Bauer_1915.jpg/1600px-John_Bauer_1915.jpg',
          width: 3000,
          height: 4000,
          mime: 'image/jpeg',
          descriptionurl: 'https://commons.wikimedia.org/wiki/File:John_Bauer_1915.jpg',
          extmetadata: {
            LicenseShortName: { value: 'Public domain' },
            Artist: { value: '<a href="x">John Bauer</a>' },
            DateTimeOriginal: { value: '1915' },
          },
        },
      ],
    }
    const c = mapCommons(page)
    expect(c).toMatchObject({ source: 'commons', sourceId: '77', artist: 'John Bauer', license: 'PD', title: 'John Bauer 1915' })
    expect(c?.fullUrl).toContain('1600px-')
    const ccBySa = structuredClone(page)
    ccBySa.imageinfo[0]!.extmetadata.LicenseShortName.value = 'CC BY-SA 4.0'
    expect(mapCommons(ccBySa)).toBeNull()
  })

  it('LoC：只收 No known restrictions，选合适尺寸', () => {
    const res = {
      item: {
        id: 'http://www.loc.gov/item/98518393/',
        title: 'See America',
        date: '1936',
        contributor_names: ['Federal Art Project'],
        rights_advisory: ['No known restrictions on publication.'],
      },
      resources: [
        {
          files: [
            [
              { url: 'https://tile.loc.gov/a_150px.jpg', mimetype: 'image/jpeg', width: 150, height: 200 },
              { url: 'https://tile.loc.gov/ar.jpg', mimetype: 'image/jpeg', width: 640, height: 853 },
              { url: 'https://tile.loc.gov/av.jpg', mimetype: 'image/jpeg', width: 1024, height: 1365 },
              { url: 'https://tile.loc.gov/au.tif', mimetype: 'image/tiff', width: 5000, height: 6600 },
            ],
          ],
        },
      ],
    }
    expect(mapLoc(res)).toMatchObject({ sourceId: '98518393', previewUrl: 'https://tile.loc.gov/ar.jpg', fullUrl: 'https://tile.loc.gov/av.jpg' })
    expect(isLocUnrestricted({ rights_advisory: 'Rights status not evaluated.' })).toBe(false)
    expect(mapLoc({ ...res, item: { ...res.item, rights_advisory: ['Publication may be restricted.'] } })).toBeNull()
  })
})

describe('候选与作品记录', () => {
  const raw = [mapMet(metObject)!, mapMet(metObject)!, { ...mapMet(metObject)!, sourceId: '1' }]

  it('去重并从 1 编号', () => {
    const c = dedupe(raw)
    expect(c.map((x) => [x.n, x.sourceId])).toEqual([
      [1, '45434'],
      [2, '1'],
    ])
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('作品 id 只含安全字符', () => {
    expect(artworkIdOf({ source: 'loc', sourceId: '2005.123/a b' })).toBe('loc-2005_123_a_b')
  })

  it('鸣谢按“作品名，作者，年代。馆名，许可。”', () => {
    expect(creditOf(dedupe(raw)[0]!)).toBe('Under the Wave off Kanagawa，Katsushika Hokusai，ca. 1830–32。大都会艺术博物馆，CC0。')
    expect(creditOf({ title: 'Folio', date: '', museum: '维基共享资源', license: 'PD' })).toBe('Folio，佚名，年代不详。维基共享资源，公共领域。')
  })

  it('生成的记录通过 ArtworkSchema，并合并已有风格', () => {
    const c = dedupe(raw)[0]!
    const image = { width: 1600, height: 1076, sourceWidth: 5000, sourceHeight: 3362, palette: ['#FFFFFF'] }
    const first = buildArtwork({ candidate: c, pick: { n: 1, subjects: ['landscape'], cover: true }, styleId: 'ukiyo-e', image, today: '2026-11-11' })
    expect(() => ArtworkSchema.parse(first)).not.toThrow()
    expect(first.img.thumb).toBe('img/art/met-45434-480.webp')
    const second = buildArtwork({ candidate: c, pick: { n: 1, subjects: ['landscape'] }, styleId: 'japonisme', existing: first, image, today: '2027-01-01' })
    expect(second.styleIds).toEqual(['ukiyo-e', 'japonisme'])
    expect(second.downloadedAt).toBe('2026-11-11')
  })
})

describe('联系表与下载（本地服务器）', () => {
  let server: http.Server
  let base = ''
  let tmp = ''

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'curate-'))
    // 一张 2400×1600 的渐变测试图
    const width = 2400
    const height = 1600
    const raw = Buffer.alloc(width * height * 3)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3
        raw[i] = (x * 255) / width
        raw[i + 1] = (y * 255) / height
        raw[i + 2] = ((x + y) * 7) % 256
      }
    const jpeg = await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer()
    server = http.createServer((req, res) => {
      if (req.url === '/ok.jpg') {
        res.writeHead(200, { 'content-type': 'image/jpeg' })
        res.end(jpeg)
      } else {
        res.writeHead(404)
        res.end()
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
  })

  afterAll(() => {
    server.close()
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  const candidate = (n: number, file: string): Candidate => ({
    n,
    source: 'met',
    sourceId: String(n),
    title: `Test ${n}`,
    date: '1800',
    sourceUrl: 'https://example.org/',
    previewUrl: `${base}/${file}`,
    fullUrl: `${base}/${file}`,
    license: 'CC0',
    museum: '测试馆',
  })

  it('联系表：失败的预览记下来，图照样拼出来', async () => {
    const out = path.join(tmp, 'sheet.jpg')
    const failures = await makeContactSheet([candidate(1, 'ok.jpg'), candidate(2, 'missing.jpg')], out)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('#2')
    const meta = await sharp(out).metadata()
    expect(meta.width).toBe(5 * 248 + 8)
  }, 30_000)

  it('下载：两档 WebP 在大小上限内，色板 5 色', async () => {
    const result = await processCandidate(candidate(3, 'ok.jpg'), 'met-3', tmp)
    expect(result).toMatchObject({ width: 1600, height: 1067, inputWidth: 2400, inputHeight: 1600 })
    expect(result.palette).toHaveLength(5)
    const display = fs.statSync(path.join(tmp, 'img', 'art', 'met-3-1600.webp')).size
    const thumb = fs.statSync(path.join(tmp, 'img', 'art', 'met-3-480.webp')).size
    expect(display).toBeLessThanOrEqual(300 * 1024)
    expect(thumb).toBeLessThanOrEqual(60 * 1024)
    expect((await sharp(path.join(tmp, 'img', 'art', 'met-3-480.webp')).metadata()).width).toBe(480)
  }, 30_000)
})

describe('查询拼装', () => {
  it('Met 用 v1.1 分页搜索，q 放最后', async () => {
    const { metSearchUrl } = await import('../scripts/curate/sources')
    const url = metSearchUrl({ source: 'met', q: "Riza-yi 'Abbasi", departmentId: 14, artistOrCulture: true }, 1000)
    expect(url.startsWith('https://collectionapi.metmuseum.org/public/collection/v1.1/search?')).toBe(true)
    expect(url).toContain('limit=500')
    expect(url.endsWith(`q=${encodeURIComponent("Riza-yi 'Abbasi")}`)).toBe(true)
  })

  it('AIC 的 params 里带公共领域筛选', async () => {
    const { aicSearchBody } = await import('../scripts/curate/sources')
    const body = aicSearchBody({ source: 'aic', q: 'print', max: 3 }, [{ term: { is_public_domain: true } }], 3)
    expect(body).toMatchObject({ q: 'print', limit: 9, query: { bool: { must: [{ term: { is_public_domain: true } }] } } })
  })

  it('清掉维基共享资源的隐藏片段', async () => {
    const { stripHtml } = await import('../scripts/curate/http')
    expect(stripHtml('1913<span style="display: none;">date QS:P571,+1913-00-00T00:00:00Z/9</span>')).toBe('1913')
    expect(stripHtml('Troll label QS:Lsv,"x"')).toBe('Troll')
  })

  it('挑图时可以改标题和年代', () => {
    const c = dedupe([mapMet(metObject)!])[0]!
    const image = { width: 10, height: 10, sourceWidth: 10, sourceHeight: 10, palette: [] }
    const a = buildArtwork({ candidate: c, pick: { n: 1, subjects: [], title: 'Clean', date: '1913' }, styleId: 's', image, today: 't' })
    expect(a.title).toBe('Clean')
    expect(a.credit).toBe('Clean，Katsushika Hokusai，1913。大都会艺术博物馆，CC0。')
  })
})

describe('候选合并与按 id 挑图', () => {
  it('旧候选保留编号，新的接在后面', async () => {
    const { mergeCandidates, findCandidate } = await import('../scripts/curate/util')
    const base = mapMet(metObject)!
    const first = mergeCandidates([], [base, { ...base, sourceId: '2' }])
    const second = mergeCandidates(first, [{ ...base, sourceId: '3' }, base])
    expect(second.map((c) => [c.n, c.sourceId])).toEqual([
      [1, '45434'],
      [2, '2'],
      [3, '3'],
    ])
    expect(findCandidate(second, { id: 'met-3', subjects: [] })?.n).toBe(3)
    expect(findCandidate(second, { n: 2, subjects: [] })?.sourceId).toBe('2')
    expect(findCandidate(second, { id: 'met-999', n: 1, subjects: [] })).toBeUndefined()
  })
})
