# 实施决定记录

规格（docs/SPEC.md）没写到、或实施中调整过的地方，按时间顺序记在这里。

## 2026-11-11 · Phase 1

- **构建工具版本**：Vite 8、@vitejs/plugin-react 6、Vitest 5、Tailwind CSS 4、vite-plugin-pwa 2、React 19、React Router 7（Hash 路由）。
- **画家名与卒年**：`keyArtists` 增加 `en` 字段（英文或罗马字名）。`prompt.artistsPD` 里的每个名字必须等于某个 `keyArtists[].en`，且该画家 `deathYear` ≤ 1955，由 validate 检查。
- **风格状态**：风格文件增加 `status: draft | ready`。draft 可以缺图和部分字段，界面上标“施工中”；ready 必须满足 validate 的全部规则。
- **文字长度**：按“显示宽度”算，汉字和全角标点记 1，ASCII 字符记 0.5，空白不计。上限沿用 SPEC §5.6。
- **浮世绘一句话**改为 40 字以内：“江户城市的大众版画：清晰墨线、平涂色块，把美人、名角和名所印成人人买得起的画。”
- **生成内容**：`npm run content:build` 输出到 `src/content/generated/content.json`，不提交进仓库；`build`、`dev`、`test` 前都会先生成。
