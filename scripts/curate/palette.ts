/** 用 k-means 从像素里取 5 个主色（SPEC §4.7 的色板）。纯函数，结果可复现。 */

export type RGB = [number, number, number]

const dist2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

export function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

/**
 * 初始中心：先把像素量化成 16 级直方图；第一个中心取像素最多的格子，
 * 之后每次取“到已有中心的距离² × 像素数”最大的格子。这样既能分开差别大的颜色，又不被零星杂点带偏。
 */
function seedCenters(pixels: RGB[], k: number): RGB[] {
  const bins = new Map<number, { sum: RGB; n: number }>()
  for (const p of pixels) {
    const key = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4)
    const bin = bins.get(key) ?? { sum: [0, 0, 0] as RGB, n: 0 }
    bin.sum[0] += p[0]
    bin.sum[1] += p[1]
    bin.sum[2] += p[2]
    bin.n += 1
    bins.set(key, bin)
  }
  const seeds = [...bins.values()].map((b) => ({ c: [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n] as RGB, n: b.n }))
  const first = seeds.reduce((best, s) => (s.n > best.n ? s : best))
  const centers: RGB[] = [first.c]
  while (centers.length < k) {
    let best: RGB | null = null
    let bestScore = 0
    for (const s of seeds) {
      const d = Math.min(...centers.map((c) => dist2(s.c, c)))
      if (d * s.n > bestScore) {
        bestScore = d * s.n
        best = s.c
      }
    }
    if (!best) break
    centers.push(best)
  }
  return centers
}

export function kmeansPalette(pixels: RGB[], k = 5, iterations = 12): string[] {
  if (pixels.length === 0) return []
  let centers = seedCenters(pixels, k)
  let sizes = new Array<number>(centers.length).fill(0)

  for (let it = 0; it < iterations; it++) {
    const sums = centers.map(() => [0, 0, 0] as RGB)
    sizes = new Array<number>(centers.length).fill(0)
    for (const p of pixels) {
      let best = 0
      let bestD = Infinity
      centers.forEach((c, i) => {
        const d = dist2(p, c)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      const s = sums.at(best)!
      s[0] += p[0]
      s[1] += p[1]
      s[2] += p[2]
      sizes[best] = (sizes.at(best) ?? 0) + 1
    }
    centers = centers.map((c, i) => {
      const n = sizes.at(i) ?? 0
      const s = sums.at(i)!
      return n > 0 ? ([s[0] / n, s[1] / n, s[2] / n] as RGB) : c
    })
  }

  return centers
    .map((c, i) => ({ c, n: sizes.at(i) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => toHex(x.c))
}
