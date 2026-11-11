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
- **大都会的搜索接口**：`/v1/search` 已于 2026-10-01 停用（返回 410），改用分页的 `/v1.1/search`。GitHub 的机器连续请求几十次后会被大都会的防火墙拦（403），所以每秒最多 1 次。
- **芝加哥的搜索**：把查询放进 `params` JSON 时 `q` 会被忽略，改用方括号参数；按画家筛选时先查画家 id，再用 `artist_ids` 过滤。
- **挑图按作品 id**：`picks/<id>.json` 用 `来源-编号` 指定作品，重抓候选时旧候选保留原编号、新候选接在后面，所以挑图记录不会因为重抓而错位。来源标题、年代、作者字段有误时，在挑图记录里改写（如大都会把“After”“Attributed to”这类限定放在单独的 `artistPrefix` 字段，漏掉就会把仿作记成真迹，现已一并读取；芝加哥把“Iran”放在作者栏，改为佚名）。
- **看图器**：Phase 2 先用一个简单的全屏看图器（深色、左右切换、显示鸣谢与原始页面链接），Phase 3 按 SPEC 换成可缩放的 PhotoSwipe。图廊按原比例两列排，封面排第一。
- **北欧童话的年代**从 1879 年算起（SPEC 写约 1890）：挪威民间故事的插图本 1879 年出版，韦伦斯基奥尔和基特尔森的画是这一风格的起点。
- **去哪看真迹**：斯德哥尔摩和北欧的馆只列在馆方网站或馆藏数据库里核实过的。工笔在斯德哥尔摩东亚博物馆没核实到藏品，按附录 B 先不列。
- **LoC 客户端**已写好，但这次 GitHub 机器访问 loc.gov 被限流（HTTP 429），第 4 批做 WPA 海报时再验证。
- **覆盖报告**里的“作者数（约）”按姓氏粗略去重，佚名不计。
