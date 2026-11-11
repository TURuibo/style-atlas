/**
 * 文字“显示宽度”：汉字和全角标点记 1，ASCII 字符记 0.5，空白不计。
 * 用于 SPEC §5.6 的长度上限（见 docs/DECISIONS.md）。
 */
export function textWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    if (/\s/.test(ch)) continue
    width += ch.charCodeAt(0) < 128 ? 0.5 : 1
  }
  return width
}

/** SPEC §5.6 的长度上限 */
export const textLimits = {
  oneLiner: 40,
  howToLookItem: 60,
  howToLookMin: 3,
  howToLookMax: 5,
  background: 250,
  exercise: 120,
} as const
