import type { AttributeKey } from '../content/schema'

/** 五个画面维度两端的名字（SPEC §5.4） */
export const attributeEnds: Record<AttributeKey, { low: string; high: string }> = {
  lineMass: { low: '线条', high: '块面' },
  flatVolume: { low: '平面', high: '立体' },
  sparseDense: { low: '简约', high: '繁复' },
  naturalStylized: { low: '写实', high: '风格化' },
  mutedVivid: { low: '素雅', high: '浓艳' },
}
