# 画风地图 Style Atlas

只给一个人用的手机端插画风格探索 PWA。完整规格与计划在 docs/SPEC.md，章节编号以它为准；实施中自行做的决定记在 docs/DECISIONS.md。

## 常用命令
- npm run dev / build / test / typecheck
- npm run e2e             端到端测试（Playwright，iPhone 13 与 Pixel 7 视口，用系统 Chrome）
- npm run content:build   Markdown + YAML 编译为 src/content/generated/content.json
- npm run validate        内容与许可校验，必须零错误
- npm run coverage        生成 docs/COVERAGE.md（Phase 2 起）
- npm run curate          挑图管线：抓候选、拼联系表、下载选中的图（平时由 .github/workflows/curate.yml 在 GitHub 上跑）
- npm run deploy          构建并把 dist/ 推送到 gh-pages 分支

## 硬规则
1. 图片只用来源方标为 CC0 或公共领域的（SPEC §8）；不热链，不嵌入有版权的图。
2. 事实不确定就不写；每种风格至少 2 个来源链接；titleZh 没把握就留空。
3. AI 关键词里的画家名只收 1955 年及以前去世的：`prompt.artistsPD` 里的名字必须对应 `keyArtists[].en`，且该画家 `deathYear` ≤ 1955。
4. 用户数据只存本机 IndexedDB；不加统计、追踪、后端或 AI 接口。
5. 界面中文，术语附英文和原文；写作遵守 SPEC §5.6。
6. 规格没写到的按 SPEC 附录 B 处理，并记入 docs/DECISIONS.md；不要停下来等人回复。
7. 部署只用 npm run deploy（gh-pages 分支）。`.github/workflows/` 里只放下载图片用的工作流；云端会话推送工作流文件可能被 GitHub 拒绝，被拒时把改动写进 docs/ 并请用户在网页上改。
8. 阶段结束前 test、validate、build、deploy 都要通过；回复里逐条报告验收结果。

## 内容约定
- 风格文件 content/styles/<id>.md：frontmatter + 五个二级标题（一句话 / 怎么看 / 为什么长这样 / 怎么画 / 15 分钟练习），格式见 SPEC §7。
- `status: draft` 的风格可以缺图，界面上标“施工中”；`status: ready` 必须满足 validate 的全部规则。
- 大类、地区、时代、标签只能用 content/vocab.yaml 里的 id。

## 代码约定
- TypeScript strict；src/lib 下是纯函数，都有单元测试（tests/）。
- 组件按 src/features/ 分目录；不引入大型 UI 框架。
- 只用系统字体；触控目标不小于 44px；尊重减少动态效果。
- 网络请求带 User-Agent：StyleAtlas/0.1 (+https://github.com/TURuibo/style-atlas)；AIC 另加 AIC-User-Agent。
