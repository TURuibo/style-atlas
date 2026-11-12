/**
 * 像素画的处理（DECISIONS 2026-11-12）：
 * 来源图多半是把原始小图按整数倍放大后存的。先找出放大倍数和网格起点，
 * 把图还原成原始像素，再按整数倍放大到展示尺寸，这样每个像素都是同样大小的方块，不会被缩放算法抹糊。
 */

export interface RawImage {
  data: Uint8Array
  width: number
  height: number
  channels: number
}

export interface PixelGrid {
  /** 一个原始像素在来源图里的边长（几个像素）；1 表示没找到整齐的网格 */
  k: number
  ox: number
  oy: number
}

/** 亮度跳变超过这个值才算边缘（0–255）；JPEG 的噪点和色度模糊都在这之下 */
const EDGE_THRESHOLD = 32
/** 至少这么多比例的边缘落在网格线上，才认为找到了网格 */
const ALIGN_RATIO = 0.9
const MIN_EDGES = 200
const MAX_K = 32
/** 还原后的原始图至少这么大，防止把纯色块误判成巨大的像素 */
const MIN_NATIVE = 16

function luma(img: RawImage, x: number, y: number): number {
  const i = (y * img.width + x) * img.channels
  const d = img.data
  if (img.channels < 3) return d[i]!
  return 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!
}

/** 每个位置左（上）侧出现强边缘的次数 */
export function edgeHistograms(img: RawImage): { xs: number[]; ys: number[] } {
  const xs = new Array<number>(img.width).fill(0)
  const ys = new Array<number>(img.height).fill(0)
  for (let y = 0; y < img.height; y++) {
    let prev = luma(img, 0, y)
    for (let x = 1; x < img.width; x++) {
      const cur = luma(img, x, y)
      if (Math.abs(cur - prev) > EDGE_THRESHOLD) xs[x]!++
      prev = cur
    }
  }
  for (let x = 0; x < img.width; x++) {
    let prev = luma(img, x, 0)
    for (let y = 1; y < img.height; y++) {
      const cur = luma(img, x, y)
      if (Math.abs(cur - prev) > EDGE_THRESHOLD) ys[y]!++
      prev = cur
    }
  }
  return { xs, ys }
}

/** 给定倍数 k，找边缘最集中的起点，返回起点和落在网格线上的比例 */
export function bestOffset(hist: readonly number[], k: number): { offset: number; ratio: number } {
  const total = hist.reduce((s, v) => s + v, 0)
  if (total === 0) return { offset: 0, ratio: 0 }
  const sums = new Array<number>(k).fill(0)
  hist.forEach((v, i) => (sums[i % k]! += v))
  let offset = 0
  for (let o = 1; o < k; o++) if (sums[o]! > sums[offset]!) offset = o
  return { offset, ratio: sums[offset]! / total }
}

/** 找原始像素网格：取两个方向都对齐的最大倍数（真正倍数的约数也对齐，倍数的倍数不对齐） */
export function detectPixelGrid(img: RawImage): PixelGrid {
  const { xs, ys } = edgeHistograms(img)
  const totalX = xs.reduce((s, v) => s + v, 0)
  const totalY = ys.reduce((s, v) => s + v, 0)
  if (totalX < MIN_EDGES || totalY < MIN_EDGES) return { k: 1, ox: 0, oy: 0 }
  const maxK = Math.min(MAX_K, Math.floor(img.width / MIN_NATIVE), Math.floor(img.height / MIN_NATIVE))
  for (let k = maxK; k >= 2; k--) {
    const bx = bestOffset(xs, k)
    const by = bestOffset(ys, k)
    if (bx.ratio >= ALIGN_RATIO && by.ratio >= ALIGN_RATIO) return { k, ox: bx.offset, oy: by.offset }
  }
  return { k: 1, ox: 0, oy: 0 }
}

function median(values: number[]): number {
  values.sort((a, b) => a - b)
  return values[values.length >> 1]!
}

/** 按网格还原原始像素：每格取中位数（格子够大时去掉最外一圈，避开 JPEG 在边缘的拖影）；不完整的边格舍去 */
export function downsampleToGrid(img: RawImage, grid: PixelGrid): RawImage {
  const { k, ox, oy } = grid
  if (k <= 1) return img
  const width = Math.floor((img.width - ox) / k)
  const height = Math.floor((img.height - oy) / k)
  const inset = k >= 4 ? 1 : 0
  const out = new Uint8Array(width * height * img.channels)
  for (let cy = 0; cy < height; cy++) {
    for (let cx = 0; cx < width; cx++) {
      const x0 = ox + cx * k
      const y0 = oy + cy * k
      for (let ch = 0; ch < img.channels; ch++) {
        const values: number[] = []
        for (let y = y0 + inset; y < y0 + k - inset; y++)
          for (let x = x0 + inset; x < x0 + k - inset; x++) values.push(img.data[(y * img.width + x) * img.channels + ch]!)
        out[(cy * width + cx) * img.channels + ch] = median(values)
      }
    }
  }
  return { data: out, width, height, channels: img.channels }
}

/** 能放进 maxW×maxH 的最大整数倍；原图已经比框大时返回 0 */
export function integerScale(width: number, height: number, maxW: number, maxH: number): number {
  return Math.max(0, Math.min(Math.floor(maxW / width), Math.floor(maxH / height)))
}

/**
 * 维基共享资源的缩略图地址换成原图地址：像素画要用原图找网格，缩略图已经被重采样过。
 * 不是缩略图地址时返回 undefined。
 */
export function commonsOriginalUrl(url: string): string | undefined {
  const m = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\/([0-9a-f]\/[0-9a-f]{2}\/[^/?]+)\/[^/?]+(?:\?.*)?$/.exec(url)
  return m ? `https://upload.wikimedia.org/wikipedia/commons/${m[1]}` : undefined
}
