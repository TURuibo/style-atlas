# 实施决定记录

规格（docs/SPEC.md）没写到、或实施中调整过的地方，按时间顺序记在这里。

## 2026-11-11 · Phase 1

- **构建工具版本**：Vite 8、@vitejs/plugin-react 6、Vitest 5、Tailwind CSS 4、vite-plugin-pwa 2、React 19、React Router 7（Hash 路由）。
- **画家名与卒年**：`keyArtists` 增加 `en` 字段（英文或罗马字名）。`prompt.artistsPD` 里的每个名字必须等于某个 `keyArtists[].en`，且该画家 `deathYear` ≤ 1955，由 validate 检查。
- **风格状态**：风格文件增加 `status: draft | ready`。draft 可以缺图和部分字段，界面上标“施工中”；ready 必须满足 validate 的全部规则。
- **文字长度**：按“显示宽度”算，汉字和全角标点记 1，ASCII 字符记 0.5，空白不计。上限沿用 SPEC §5.6。
- **浮世绘一句话**改为 40 字以内：“江户城市的大众版画：清晰墨线、平涂色块，把美人、名角和名所印成人人买得起的画。”
- **生成内容**：`npm run content:build` 输出到 `src/content/generated/content.json`，不提交进仓库；`build`、`dev`、`test` 前都会先生成。

## 2026-11-11 · Phase 2

- **部署**：按 CLAUDE.md 第 7 条，只用 `npm run deploy` 把 `dist/` 推到 gh-pages。Phase 1 时加过一个自动部署工作流 `deploy.yml`，与这条规则冲突，已删除；`.github/workflows/` 里只剩下载图片用的 `curate.yml`。
- **图片下载通道**：Claude 的云端会话连不上博物馆服务器，抓候选、拼联系表、下载压缩都在 GitHub Actions（`curate.yml`）里跑，结果由机器人提交回 main。本地也能跑：`npm run curate`。
- **挑图文件的位置**：SPEC §10.2 写的是 `curation/<id>.candidates.json` 和 `<id>.picks.json`；实际按类型分子目录：`content/curation/requests/`（去哪找）、`candidates/`（工作流写）、`sheets/`（联系表）、`picks/`（挑中的）、`logs/`（运行记录）。SPEC §10.4 的三个命令合并成一个 `npm run curate`，按文件是否变化决定做哪一步。
- **联系表要提交**：SPEC §13 风险表写“联系表和缓存不提交”，但挑图时 Claude 只能从仓库里读到工作流的产物，所以 `content/curation/sheets/*.jpg` 提交进仓库；每页 20 格，单张约 0.3–1MB。网络缓存靠请求内容的哈希：请求没变就不重抓。
- **作品记录**：`artworks.json` 增加 `sourceSize`（源图尺寸，SPEC §8.2 第 2 条）。`credit` 直接存完整鸣谢文字，格式按 SPEC §8.2 第 3 条：“作品名，作者，年代。馆名，许可。”
- **维基共享资源的图**：预览和下载都用 `iiurlwidth=1600` 的缩略图，不下载原图（有的原图是几十 MB 的 TIFF）。
- **LoC 客户端**：用 loc.gov 的 JSON 接口，逐条读条目的权利声明，只收“No known restrictions”；先为第 4 批的 `wpa-poster` 抓一次候选，验证接口。
