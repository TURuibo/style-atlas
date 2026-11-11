/** 带限速、重试和 User-Agent 的请求（SPEC §8.1 的礼仪要求） */

export const USER_AGENT = 'StyleAtlas/0.1 (+https://github.com/TURuibo/style-atlas)'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 每个主机两次请求之间的最小间隔（毫秒） */
const minGap: Record<string, number> = {
  // Met 文档允许每秒 80 次，但 GitHub 机器上连续请求几十次后会被防火墙拦（HTTP 403），所以放慢
  'collectionapi.metmuseum.org': 1000,
  'images.metmuseum.org': 1000,
  'api.artic.edu': 1100,
  'www.artic.edu': 1100,
  'openaccess-api.clevelandart.org': 400,
  'openaccess-cdn.clevelandart.org': 300,
  'commons.wikimedia.org': 500,
  'upload.wikimedia.org': 1000,
  'www.loc.gov': 3000,
  'tile.loc.gov': 1000,
  'raw.githubusercontent.com': 150,
}

const lastCall = new Map<string, number>()

async function throttle(host: string) {
  const gap = minGap[host] ?? 300
  const wait = (lastCall.get(host) ?? 0) + gap - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall.set(host, Date.now())
}

export async function fetchWithRetry(url: string, accept = '*/*', tries = 3): Promise<Response> {
  const host = new URL(url).host
  let lastError: unknown = new Error(`请求失败：${url}`)
  for (let attempt = 1; attempt <= tries; attempt++) {
    await throttle(host)
    let res: Response
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'AIC-User-Agent': USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(60_000),
      })
    } catch (error) {
      lastError = error
      await sleep(1000 * attempt)
      continue
    }
    if (res.ok) return res
    lastError = new Error(`HTTP ${res.status} ${url}`)
    if ([400, 401, 403, 404, 410].includes(res.status)) break
    if (res.status === 429) {
      // 限流：按 Retry-After 等（最多 60 秒）
      const retryAfter = Number(res.headers.get('retry-after'))
      await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15_000 * attempt, 60_000))
      continue
    }
    await sleep(1500 * attempt)
  }
  throw lastError
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetchWithRetry(url, 'application/json')
  return (await res.json()) as T
}

export async function getText(url: string): Promise<string> {
  const res = await fetchWithRetry(url, 'text/plain,*/*')
  return await res.text()
}

export async function getBuffer(url: string): Promise<Buffer> {
  const res = await fetchWithRetry(url, 'image/*,*/*')
  return Buffer.from(await res.arrayBuffer())
}

/** 去掉维基共享资源元数据里的 HTML 标签 */
export function stripHtml(html: string | undefined): string {
  return (html ?? '')
    // 维基共享资源模板里隐藏的 QuickStatements 片段，如 <span style="display: none;">date QS:P571,...</span>
    .replace(/<(span|div)[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*\b(date|label|title) QS:.*$/, '')
    .trim()
}
