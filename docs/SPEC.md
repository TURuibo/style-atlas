# 画风地图：插画风格探索应用 Spec + Plan

Nov 8, 2026 · @Ruibo Tu

## 一页概览

「画风地图」是只给你自己用的手机网页应用。它先用 3 分钟盲测摸出你的口味，再按 9 大类带你走过 77 种插画风格（从古埃及纸草书到今天的扁平插画），最后给出口味画像、学画路线和 AI 出图提示词。

| 方面 | 决定 |
| --- | --- |
| 三个用途 | 看懂插画（怎么看、为什么长这样、去哪看真迹）；自己学画（工具、技法、临摹练习）；给 AI 出图定风格（英文关键词、专属提示词） |
| 图片 | 只用博物馆开放的公共领域 / CC0 真迹，构建时下载进自己的仓库；有版权的当代画风只给文字讲解和外部搜索链接 |
| 使用方式 | 手机为主、只你一人；纯前端 PWA，可装到主屏幕、离线可看；数据只存本机，可导出备份 |
| 花费 | 不接任何付费 API；托管用 GitHub Pages 免费额度；只消耗你的 Claude 用量 |
| 内容规模 | 9 大类、77 种风格：59 种配真迹图，18 种只给外链。先做 6 种的完整切片，再扩到 24 种 MVP，最后全量 |
| 建造方式 | Claude Code 云端会话，分 7 个阶段；每阶段结束时部署，你在手机上验收后再合并 |

**怎么开工**

1. 在 GitHub 建一个公开的空仓库（建议名 `style-atlas`）。把本文导出为 Markdown 存为 `docs/SPEC.md`，附录里的 CLAUDE.md 草稿存为仓库根目录的 `CLAUDE.md`。
2. 在 Claude Code 网页版新建云环境，网络访问选 Custom，放行 §11 列出的博物馆域名。
3. 在这个仓库上开会话，粘贴 §12 里 Phase 1 的提示词；之后每个阶段一条提示词。

阅读顺序：Spec 在 §1–§10，Plan 在 §11–§13，附录是 CLAUDE.md 草稿、默认决策和以后再做的事。

## 1. 目标、非目标与成功标准

做成的标志：用两周后，你能说出最喜欢的 3 种风格，用画面特征讲清为什么喜欢，并手握一条能出满意图的提示词。

**目标**

- G1 带你走一遍：9 大类 → 77 种风格 → 每种 4–8 幅真迹；可按大类、地域、年代三种方式进入。
- G2 摸清口味：用盲测和导览里的评分，算出你在 5 个画面维度上的偏好，并推荐下一步看什么。
- G3 看懂：每种风格讲清怎么看、为什么长这样、代表人物、去哪看真迹（标注斯德哥尔摩及北欧能看到的）。
- G4 学画：每种风格给工具、技法和一个 15 分钟练习；临摹时可叠网格、转黑白、省眼模糊、分明暗。
- G5 出图：每种风格给英文提示词关键词；根据口味自动拼出你的专属提示词。

**非目标（第一版不做）**

- 账号、云同步、多人使用。
- 任何 AI 接口：不生成图，不做聊天讲解。
- 展示有版权的图片；上传自己的图片。
- 英文或瑞典语界面：界面只用中文，风格名附英文和原文。

**验收标准**

| 类别 | 标准 |
| --- | --- |
| 体验 | 首次盲测 24 张、不超过 4 分钟；从首页到任一风格页不超过 3 次点击 |
| 性能 | 4G 下首屏不超过 2.5 秒；装到主屏后，看过的内容离线可看 |
| 内容 | 每种配图风格至少 4 幅真迹，全部带来源与许可；每种风格都有怎么看、怎么画、提示词三块 |
| 结果 | 评满 40 次后，口味画像至少给出 2 条明确偏好，并能生成 3 种变体的提示词 |

## 2. 使用场景

大多数打开只有 3–5 分钟，所以每个流程都能随时中断、下次接着来；深入学画留给周末。

| 场景 | 时长 | 做什么 | 用到 |
| --- | --- | --- | --- |
| 第一次打开 | 5 分钟 | 盲测 24 张 → 揭晓每张是什么风格 → 看到初步口味 | 盲测、揭晓 |
| 通勤路上 | 3–5 分钟 | 导览走 2–3 站，每站看图、读三句“怎么看”、评分 | 导览、评分 |
| 好奇某地某代 | 5 分钟 | 从地域或时间线进入，看那里、那时有哪些风格 | 探索 |
| 周末学画 | 30–60 分钟 | 选一种喜欢的风格，读“怎么画”，开临摹模式练 15 分钟 | 风格页、临摹辅助 |
| 用 AI 出图前 | 1 分钟 | 填题材，复制专属提示词 | 提示词工坊 |
| 去看展前 | 2 分钟 | 查喜欢的风格在哪里能看真迹，斯德哥尔摩的排前面 | 看展清单 |
| 换手机或清缓存前 | 1 分钟 | 导出备份，在新设备导入 | 数据 |

## 3. 信息架构与核心流程

应用只有 4 个底部标签：导览、探索、盲测、我的。第一次打开走“盲测 → 揭晓 → 导览”，之后每次从“继续上次”开始。

*（图：使用流程 · 首次 4 步，之后循环。原图见 claude.ai 上的文档。）*

盲测去掉名字带来的光环；之后所有评分都进同一个口味模型，推荐再把你带回导览或下一轮盲测。

**底部标签**

| 标签 | 用途 | 里面有什么 |
| --- | --- | --- |
| 导览（首页） | 被带着走 | 继续上次；9 个大类章节，每章若干“站”（风格）；为你推荐 3 种 |
| 探索 | 自己逛 | 三个入口：大类 / 地域 / 年代；搜索中英文风格名和画家 |
| 盲测 | 校准口味 | 不显示名字的看图评分，每轮 12–24 张，结束后揭晓 |
| 我的 | 结果与工具 | 口味画像、推荐、提示词工坊、学画路线、看展清单、收藏、笔记、备份 |

**流程规则**

1. 首次打开：一屏说明（“3 分钟盲测，看看你真正喜欢什么”），可跳过直接进导览。
2. 盲测结束进揭晓页：按大类分组展示刚才的图和你的评分，点任一张进对应风格页。
3. 导览默认按历史脉络排章（§5 的大类顺序），章内按年代排站；可切换为“先看我可能喜欢的”。
4. 任何流程中断后，首页顶部显示“继续：章节名 · 站名”。
5. 评分随处可做：盲测里给每张图评；导览和风格页里给风格评一次，并可收藏单幅图。
6. 评满 15 次，“我的”里出现初步画像；满 40 次标为“较可靠”。

## 4. 逐页需求与验收

每页列“必须有”和一句验收；细节未写到的，按附录“默认决策”处理。

### 4.1 评分组件（全局通用）

- 5 档：讨厌 −2 / 不太喜欢 −1 / 一般 0 / 喜欢 +1 / 超爱 +2，图标加文字，固定在拇指区。
- 手势快捷：左滑 −1，右滑 +1，上滑 +2；另有“跳过”和“撤销上一张”。
- 安卓上轻震反馈；iOS 不支持就省略。

### 4.2 盲测

- 只显示图片，不显示标题、画家、年代；点图可放大。
- 首轮 24 张：每个有图的大类至少 2 张，其余用来平衡 5 个画面维度和题材；同一风格不连续出现。
- 之后每轮 12 张，按 §9 的自适应规则抽样。
- 显示进度（如 7/24），随时可退出，已评的都保存；预加载后 3 张。
- 验收：24 张可在 4 分钟内评完，4G 下翻页无空白等待。

### 4.3 揭晓

- 按大类分组展示本轮的图，每张带你的分数和风格名；顶部一句总结（“你给高分最多的是版画、装饰艺术与海报”）。
- 题材提醒：高分图里同一题材占 60% 以上时，提示“可能你喜欢的是风景题材，而不只是画风”。
- 两个出口：开始导览、看我的口味。

### 4.4 导览（首页 · 章节 · 站）

- 首页：继续卡片；为你推荐 3 种（评满 15 次后出现）；9 个章节卡片，带封面图和进度（已走 3/9）。
- 章节开头：大类一句话、3 条标志特征、覆盖的地域与年代、3 张代表图。
- 一站 = 一种风格：横滑看作品；中英文名、地域和年代标签、一句话、三条“怎么看”；评分；“深入了解”和“下一站”。
- 验收：切站不超过 300 毫秒；进度关掉应用后仍在。

### 4.5 风格页

- 头部：中文名、英文名、原文名；大类、地域、年代标签；你的评分。
- 作品墙：两列缩略图，点开进看图器。
- 内容块（可折叠）：一句话；怎么看；为什么长这样；代表人物；去哪看真迹；怎么画（含 15 分钟练习和“开始练习”按钮）；AI 关键词（点一下复制，另有“复制全部”）；相关风格；我的笔记。
- 只给外链的风格：不显示作品墙，改为“去外面看图”按钮组（Google 图片、Pinterest、Behance、ArtStation、维基百科），带预设关键词；显示该风格的 5 维特征条，告诉你看什么；看完回来仍可评分。
- 验收：77 种风格的内容块一个不缺；复制在 iOS Safari 可用。

### 4.6 看图器

- 全屏深色背景；双指缩放、双击放大、左右滑换图、下滑关闭（用 PhotoSwipe 5）。
- 信息面板：作品名、画家（生卒）、年代、材质、馆藏与鸣谢、许可（CC0 或公共领域）、“去博物馆网站看高清”。
- 操作：收藏、单幅评分、临摹。
- 验收：许可信息始终可见；iPhone 和安卓上缩放流畅。

### 4.7 临摹模式

- 叠网格（关 / 3×3 / 4×4 / 8×8）、黑白、省眼（模糊 6px，看大形）、明暗分级（3 或 5 级）、镜像、色板（预先算好的 5 色，点一下复制色号）。
- 15 分钟计时器；支持屏幕常亮的浏览器里保持亮屏；可展开本风格的练习说明。
- 验收：开关可任意组合；1280px 的图明暗分级在中端手机上不超过 0.5 秒。

### 4.8 探索

- 大类：9 张卡片 → 大类页（章节开头 + 全部风格）。
- 地域：MVP 是 13 个地区的卡片列表；Phase 6 换成可点的简化世界地图。地区页按年代排风格。
- 年代：横向滚动时间线，8 个时代段用分段刻度；风格是按大类着色的起止条，可按大类筛选。
- 搜索：本地模糊搜索风格名（中 / 英 / 原文）、画家、关键词。
- 探索进度：看过的风格、地区、时代高亮，显示百分比。
- 验收：时间线在 375px 宽的屏幕上可读；搜索 100 毫秒内出结果。

### 4.9 我的

- 口味画像：5 条两端带名字的光谱条（如“线条 ↔ 块面”），小圆点标出你的位置，把握低时变淡；最爱 5 种风格；偏爱的大类、地域、年代；情绪、媒材、题材标签；收藏作品汇成的“我的色板”；一段模板生成的文字总结。
- 推荐：5 种（4 种按契合度 + 1 种惊喜），每种一句理由（“和你喜欢的浮世绘一样：平涂 + 清晰线条”）。
- 提示词工坊：填题材，出 3 个变体，一键复制、保存（规则见 §9）。
- 学画路线：取最爱 3 种风格，合并材料清单，排出由易到难的 5 个练习，可打勾。
- 看展清单：最爱风格的馆藏，分“斯德哥尔摩 / 瑞典其他 / 北欧 / 世界”四组，链到官网。
- 收藏、笔记各一页。

### 4.10 数据与备份

- 导出 JSON 文件；另有“复制备份文本”作为 iOS 的后备。
- 导入（选文件或粘贴），先预览再选“合并”或“替换”；重置需二次确认。
- 显示：持久存储是否已获准、上次备份日期、评分总数；超过 14 天未备份且新增 20 次评分时，顶部提醒。
- 验收：导出 → 重置 → 导入后，状态完全一致。

### 4.11 全局

- 主题跟随系统深浅色，看图器始终深色。
- 只用系统字体，不加载中文网络字体：标题宋体系（Songti SC / Noto Serif CJK SC），正文黑体系（PingFang SC / Noto Sans CJK SC）。
- 触控目标不小于 44px；尊重“减少动态效果”。
- 图片替代文字为“作品名，画家，年代”；盲测中只写“盲测图片 7/24”，不剧透。
- “添加到主屏幕”引导页，分 iOS Safari 和安卓 Chrome 两套说明。

## 5. 内容体系

内容分“大类 → 风格 → 作品”三层，另有地域、年代两条横轴和 5 个画面维度。大类按画面语言和用途划分，下表顺序就是导览的历史脉络。

### 5.1 九大类

| # | 大类 | 一眼认出 | 风格数 |
| --- | --- | --- | --- |
| 1 | 抄本、细密画与圣像 | 宝石般的颜色、金箔、平面空间、繁复边饰 | 9 |
| 2 | 东亚绘画 | 毛笔线、墨分浓淡、留白、诗书画印一体 | 7 |
| 3 | 版画 | 刻出来的线、平涂色块、强黑白对比 | 9 |
| 4 | 民间艺术 | 朴拙、浓艳、吉祥符号、程式化造型 | 7 |
| 5 | 博物与科学图谱 | 精确观察、白底、分类排布、标注 | 7 |
| 6 | 讽刺画、漫画与连环叙事 | 夸张变形、幽默、分格与对白 | 10 |
| 7 | 书籍与童话插画 | 讲故事、钢笔线加淡彩、梦幻氛围 | 7 |
| 8 | 装饰艺术与海报 | 曲线与图案、平涂、字图一体 | 9 |
| 9 | 现代与当代 | 多元；大多有版权，外链看图 | 12 |

### 5.2 地域（13 个地区）

中国、日本、朝鲜半岛、喜马拉雅、南亚、西亚与中亚（伊朗、奥斯曼、阿拉伯世界）、非洲（埃及、埃塞俄比亚）、西欧、北欧、东欧与俄罗斯、北美、拉丁美洲、全球（当代数字风格）。一种风格可属多个地区。

### 5.3 年代（8 段，分段刻度）

时间线不按真实比例，否则近两百年会挤成一条线。每段宽度如下，段内线性。

| 时代段 | 范围 | 宽度（份） |
| --- | --- | --- |
| 古代 | 公元 500 年以前 | 1 |
| 中世纪 | 500–1400 | 1 |
| 近世早期 | 1400–1750 | 1.5 |
| 启蒙与工业时代 | 1750–1880 | 1.5 |
| 世纪之交 | 1880–1918 | 1.5 |
| 两次大战之间 | 1918–1945 | 1 |
| 战后 | 1945–1980 | 1 |
| 当代 | 1980 至今 | 1 |

### 5.4 五个画面维度

每种风格在每个维度上打 −2 到 +2 分；某幅作品与风格常态差 2 分及以上时，可单独覆盖。口味模型和提示词都建立在这 5 维上。

| 维度 | −2 一端（例子） | +2 一端（例子） |
| --- | --- | --- |
| 线条 ↔ 块面 | 纯靠线（白描、比亚兹莱、丢勒铜版） | 纯靠色块与明暗（泼墨写意、数字厚涂） |
| 平面 ↔ 立体 | 平涂无明暗（浮世绘、古埃及、扁平矢量） | 强光影体积（美国黄金时代油画插画、解剖图、概念美术） |
| 简约 ↔ 繁复 | 大量留白、元素极少（禅画、波兰海报） | 满铺细节（凯尔经、波斯细密画、唐卡、海克尔） |
| 写实 ↔ 风格化 | 观察写生式（植物图谱、奥杜邦） | 夸张或程式化（讽刺画、民画、漫画、扁平矢量） |
| 素雅 ↔ 浓艳 | 单色或低饱和（水墨、蚀刻、白描） | 高饱和宝石色（拉杰普特、迷幻海报、年画） |

### 5.5 标签

- 情绪（风格级）：童趣、宁静、浪漫、神秘暗黑、幽默、庄严神圣、华丽、朴拙。
- 媒材（风格级）：墨、水彩、不透明颜料（水粉 / 蛋彩 / 矿物色）、金箔、木刻、铜版与蚀刻、石版、丝网与孔版、钢笔、油画、数字。
- 题材（作品级）：人物、风景、花鸟动物、叙事场景、装饰图案、宗教、日常生活。用于发现“其实喜欢的是题材”。

### 5.6 写作规范

- 语气像博物馆里懂行的朋友：具体、短句、少术语；术语第一次出现时解释。
- 长度：一句话 ≤ 40 字；怎么看 3–5 条、每条 ≤ 60 字；为什么长这样 ≤ 250 字；15 分钟练习 ≤ 120 字。
- 人名首次出现写作“中文名（原文名，生卒年）”。
- 不确定的事实不写；每种风格至少列 2 个参考链接（博物馆页面、维基百科或大英百科）。
- 宗教与少数群体的传统：讲清原本用途和语境，不猎奇，不用“神秘东方”一类的说法。
- 去哪看真迹：先列 1–3 家世界馆藏，再列斯德哥尔摩和北欧能看到的（必须在馆方网站核实过）。

### 5.7 词表 id（`content/vocab.yaml` 骨架）

风格文件里的大类、地区、时代和标签只能用这里的 id，校验脚本会拦下拼错的。

```yaml
families:
  manuscripts: 抄本、细密画与圣像
  east-asian: 东亚绘画
  printmaking: 版画
  folk: 民间艺术
  natural-history: 博物与科学图谱
  satire-comics: 讽刺画、漫画与连环叙事
  book-fairy: 书籍与童话插画
  decorative-poster: 装饰艺术与海报
  modern: 现代与当代
regions:
  china: 中国
  japan: 日本
  korea: 朝鲜半岛
  himalaya: 喜马拉雅
  south-asia: 南亚
  west-central-asia: 西亚与中亚
  africa: 非洲
  western-europe: 西欧
  nordic: 北欧
  eastern-europe: 东欧与俄罗斯
  north-america: 北美
  latin-america: 拉丁美洲
  global: 全球
eras:              # weight = 时间线上的宽度份数（§5.3）
  ancient: { zh: 古代, end: 500, weight: 1 }
  medieval: { zh: 中世纪, start: 500, end: 1400, weight: 1 }
  early-modern: { zh: 近世早期, start: 1400, end: 1750, weight: 1.5 }
  enlightenment-industrial: { zh: 启蒙与工业时代, start: 1750, end: 1880, weight: 1.5 }
  fin-de-siecle: { zh: 世纪之交, start: 1880, end: 1918, weight: 1.5 }
  interwar: { zh: 两次大战之间, start: 1918, end: 1945, weight: 1 }
  postwar: { zh: 战后, start: 1945, end: 1980, weight: 1 }
  contemporary: { zh: 当代, start: 1980, weight: 1 }
moods: { whimsical: 童趣, serene: 宁静, romantic: 浪漫, dark: 神秘暗黑, humorous: 幽默, sacred: 庄严神圣, opulent: 华丽, naive: 朴拙 }
mediums: { ink: 墨, watercolor: 水彩, opaque: 不透明颜料, gold-leaf: 金箔, woodcut: 木刻, intaglio: 铜版与蚀刻, lithograph: 石版, screenprint: 丝网与孔版, pen: 钢笔, oil: 油画, digital: 数字 }
subjects: { figures: 人物, landscape: 风景, flora-fauna: 花鸟动物, narrative: 叙事场景, ornament: 装饰图案, religious: 宗教, daily-life: 日常生活 }
```

## 6. 风格清单

77 种风格：50 种全部用公共领域真迹，9 种“混合”（以馆方标注为准），18 种只给外链。MVP 的 24 种覆盖全部 9 大类，其中 6 种是最先做的完整切片。图源是建议的检索起点，能否使用以 §8 的规则为准。

图源缩写：Met = 大都会艺术博物馆；AIC = 芝加哥艺术博物馆；CMA = 克利夫兰艺术博物馆；Commons = 维基共享资源；LoC = 美国国会图书馆。

### 6.1 抄本、细密画与圣像

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 古埃及纸草书 Book of the Dead `egyptian-papyrus` | 非洲 · 约前 1550–前 30 | 《亡灵书》纸草卷 | 真迹：Met |  |
| 海岛风格抄本 Insular illumination `insular` | 西欧 · 约 600–900 | 《凯尔经》《林迪斯法恩福音书》 | 真迹：Commons |  |
| 唐卡 Thangka `thangka` | 喜马拉雅 · 约 1100–1900 | 勉唐派、噶玛嘎孜派 | 真迹：Met、CMA、AIC |  |
| 哥特抄本与时祷书 Gothic illumination `gothic-illumination` | 西欧 · 约 1200–1500 | 林堡兄弟《贝里公爵的豪华时祷书》、让·皮塞勒 | 真迹：Met、CMA、Commons | MVP |
| 波斯细密画 Persian miniature `persian-miniature` | 西亚与中亚 · 约 1300–1700 | 贝赫扎德、苏丹·穆罕默德、礼萨·阿巴西；塔赫玛斯普《列王纪》 | 真迹：Met、CMA | 切片 |
| 中美洲古抄本 Mesoamerican codices `mesoamerican-codex` | 拉丁美洲 · 约 1300–1600 | 《博尔吉亚抄本》《门多萨抄本》《佛罗伦萨抄本》 | 真迹：Commons、LoC |  |
| 埃塞俄比亚抄本绘画 Ethiopian manuscript painting `ethiopian` | 非洲 · 约 1400–1900 | 贡德尔风格 | 真迹：Commons（沃尔特斯艺术博物馆）、Met |  |
| 莫卧儿细密画 Mughal painting `mughal` | 南亚 · 约 1560–1850 | 巴萨万、阿布·哈桑、乌斯塔德·曼苏尔；《哈姆扎传》 | 真迹：Met、CMA | MVP |
| 拉杰普特与帕哈里绘画 Rajput & Pahari painting `rajput-pahari` | 南亚 · 约 1600–1850 | 梅瓦尔、基申格尔、康格拉画派；奈恩苏赫 | 真迹：Met、CMA |  |

### 6.2 东亚绘画

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 工笔 Gongbi `gongbi` | 中国 · 约 700–1911 | 周昉、宋徽宗赵佶、院体花鸟 | 真迹：Met、CMA | 切片 |
| 白描 Baimiao `baimiao` | 中国 · 约 1050–1700 | 李公麟、武宗元 | 真迹：Met、Commons |  |
| 绘卷与大和绘 Emaki & Yamato-e `emaki` | 日本 · 约 1100–1600 | 《源氏物语绘卷》《伴大纳言绘词》 | 真迹：Met、CMA、Commons |  |
| 写意与文人画 Literati ink painting `xieyi` | 中国 · 约 1300–1930 | 倪瓚、徐渭、八大山人、石涛、吴昌硕 | 真迹：Met、CMA | MVP |
| 水墨与禅画 Suiboku & Zenga `suiboku-zenga` | 日本 · 约 1400–1900 | 雪舟、白隐慧鹤、仙厐义梵 | 真迹：Met、CMA |  |
| 琳派 Rinpa `rinpa` | 日本 · 约 1600–1940 | 俵屋宗达、尾形光琳、酒井抱一、神坂雪佳 | 真迹：Met、CMA | MVP |
| 朝鲜风俗画 Joseon genre painting `korean-genre` | 朝鲜半岛 · 约 1750–1850 | 金弘道（檀园）、申润福（蕙园） | 真迹：Commons |  |

### 6.3 版画

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 文艺复兴木刻与铜版 Renaissance woodcut & engraving `renaissance-print` | 西欧 · 约 1470–1600 | 丢勒、舍恩高尔、小荷尔拜因；《纽伦堡编年史》 | 真迹：Met、AIC、CMA | MVP |
| 明清版刻与饾版 Ming–Qing woodblock illustration `ming-qing-woodblock` | 中国 · 约 1550–1800 | 陈洪绶《水浒叶子》、胡正言《十竹斋书画谱》、《芥子园画传》 | 真迹：Met、Commons、LoC |  |
| 欧洲蚀刻版画 Etching `etching` | 西欧 · 约 1600–1850 | 卡洛、伦勃朗、皮拉内西、戈雅 | 真迹：Met、AIC、CMA |  |
| 浮世绘 Ukiyo-e `ukiyo-e` | 日本 · 约 1670–1900 | 铃木春信、喜多川歌麿、葛饰北斋、歌川广重、歌川国芳 | 真迹：Met、AIC、CMA | 切片 |
| 木口木刻 Wood engraving `wood-engraving` | 西欧 · 约 1790–1900 | 托马斯·比维克、古斯塔夫·多雷、达尔齐尔兄弟 | 真迹：Met、AIC、Commons | MVP |
| 墨西哥通俗版画 Mexican popular prints `posada` | 拉丁美洲 · 约 1880–1950 | 何塞·瓜达卢佩·波萨达；后来的人民版画工作室 | 混合：Met、AIC |  |
| 表现主义木刻 Expressionist woodcut `expressionist-woodcut` | 西欧 · 约 1905–1930 | 基希纳、凯绥·珂勒惠支 | 混合：Met、AIC、CMA |  |
| 新版画 Shin-hanga `shin-hanga` | 日本 · 约 1915–1960 | 川濑巴水、吉田博、小原古邨 | 混合：AIC、Met |  |
| 新兴木刻运动 Modern Woodcut Movement `chinese-woodcut-movement` | 中国 · 1931–1949 | 鲁迅倡导；李桦、古元 | 外链 |  |

### 6.4 民间艺术

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 木版年画 Nianhua `nianhua` | 中国 · 约 1600–1950 | 杨柳青、桃花坞、杨家埠、朱仙镇、绵竹 | 真迹：Commons、Met | MVP |
| 朝鲜民画 Minhwa `minhwa` | 朝鲜半岛 · 约 1700–1910 | 册架图、虎鹊图、文字图 | 真迹：Met、Commons | MVP |
| 卢布克与埃皮纳勒版画 Lubok & Images d’Épinal `lubok-epinal` | 东欧与俄罗斯、西欧 · 约 1700–1900 | 《老鼠葬猫》；佩勒兰印坊 | 真迹：Commons、LoC |  |
| 宾州德裔花体画 Fraktur `fraktur` | 北美 · 约 1750–1850 | 洗礼证书（Taufschein） | 真迹：Met | MVP |
| 达拉纳民间画 Dalmålning `dalmalning` | 北欧 · 约 1750–1870 | 库尔比茨（kurbits）纹样；海尔辛兰装饰农舍 | 真迹：Commons（待核） |  |
| 卡利加特画 Kalighat painting `kalighat` | 南亚 · 约 1800–1930 | 加尔各答迦梨女神庙一带的画匠 | 真迹：Commons、Met（待核） |  |
| 米提拉画 Mithila (Madhubani) `mithila` | 南亚 · 1960 年代至今 | 西塔·德维、甘加·德维 | 外链 |  |

### 6.5 博物与科学图谱

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 伊斯兰科学抄本 Islamic scientific manuscripts `islamic-science` | 西亚与中亚 · 约 950–1600 | 苏菲《恒星之书》、加扎利《精巧机械装置知识之书》、卡兹维尼《造物奇观》 | 真迹：Met、Commons |  |
| 解剖图谱 Anatomical illustration `anatomy` | 西欧 · 1543–1900 | 维萨里《人体构造》、《格氏解剖学》 | 真迹：Commons、Met |  |
| 植物图谱 Botanical illustration `botanical` | 西欧 · 约 1600–1900 | 梅里安、埃雷特、雷杜德、费迪南德·鲍尔 | 真迹：Met、Commons | MVP |
| 日本本草图谱 Japanese natural history `japan-natural-history` | 日本 · 约 1700–1900 | 岩崎灌园《本草图谱》 | 真迹：Commons（日本国立国会图书馆） |  |
| 鸟类图谱 Ornithological illustration `ornithology` | 西欧、北美 · 约 1730–1900 | 奥杜邦《美国鸟类》、古尔德夫妇、爱德华·李尔 | 真迹：Met、Commons |  |
| 中国外销画 Chinese export painting `china-export` | 中国 · 约 1750–1880 | 广州画坊、庭呱（关联昌）；里夫斯藏植物画 | 真迹：Met、Commons |  |
| 海克尔：自然的艺术形态 Haeckel `haeckel` | 西欧 · 1899–1904 | 恩斯特·海克尔《自然界的艺术形态》 | 真迹：Commons |  |

### 6.6 讽刺画、漫画与连环叙事

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 戏画与北斋漫画 Giga & Hokusai Manga `giga-manga` | 日本 · 约 1150–1890 | 《鸟兽戏画》、葛饰北斋《北斋漫画》、河锅晓斋 | 真迹：Met、AIC、Commons |  |
| 英国讽刺画 British satirical prints `british-satire` | 西欧 · 约 1730–1900 | 贺加斯、吉尔雷、罗兰森、克鲁克香克；《笨拙》周刊 | 真迹：Met、LoC | MVP |
| 法国石版讽刺画 French lithographic caricature `daumier` | 西欧 · 约 1830–1900 | 杜米埃、格朗维尔；《喧闹》报 | 真迹：Met、AIC、CMA | MVP |
| 早期连环画 Proto-comics `proto-comics` | 西欧 · 约 1830–1910 | 特普费尔、威廉·布施《马克斯和莫里茨》、克里斯托夫 | 真迹：Commons |  |
| 美国早期报纸漫画 Early newspaper comics `newspaper-comics` | 北美 · 1895–1930 | 奥特考特《黄孩子》、温瑟·麦凯《小尼莫梦乡历险记》、赫里曼《疯狂猫》 | 真迹：Commons、LoC（1931 年前发表的） |  |
| 连环画（小人书）Lianhuanhua `lianhuanhua` | 中国 · 约 1925–1990 | 贺友直《山乡巨变》、刘继卣《武松打虎》、华三川 | 外链 |  |
| 中国现代漫画 Chinese manhua `chinese-manhua` | 中国 · 约 1925–1980 | 丰子恺、张乐平《三毛流浪记》 | 外链 |  |
| 法比漫画与清线 Bande dessinée `bande-dessinee` | 西欧 · 1929 至今 | 埃尔热《丁丁历险记》、墨比斯 | 外链 |  |
| 美式漫画 American comic books `american-comics` | 北美 · 1938 至今 | 超级英雄漫画、独立漫画 | 外链 |  |
| 日本漫画 Manga `manga` | 日本 · 1947 至今 | 手冢治虫及之后的少年、少女、剧画等流派 | 外链 | 切片 |

### 6.7 书籍与童话插画

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 布莱克的彩印诗书 Blake’s illuminated books `blake` | 西欧 · 1789–1827 | 威廉·布莱克《天真与经验之歌》 | 真迹：Met、LoC、Commons |  |
| 维多利亚彩色童书 Victorian toy books `victorian-toy-books` | 西欧 · 约 1865–1915 | 沃尔特·克兰、伦道夫·凯迪克、凯特·格林纳威、比阿特丽克斯·波特；印刷商埃德蒙·埃文斯 | 真迹：Met、Commons、LoC | MVP |
| 美国黄金时代插画 American Golden Age `american-golden-age` | 北美 · 约 1880–1930 | 霍华德·派尔、N. C. 怀斯、杰西·威尔科克斯·史密斯、莱恩德克 | 混合：Met、AIC、Commons |  |
| 北欧童话插画 Nordic fairy-tale illustration `nordic-fairy` | 北欧 · 约 1890–1920 | 约翰·鲍尔《小精灵与山怪之间》（Bland tomtar och troll）、西奥多尔·基特尔森 | 真迹：Commons | 切片 |
| 瑞典家园与童书 Swedish home & picture books `swedish-home` | 北欧 · 约 1895–1950 | 卡尔·拉松《一个家》（Ett hem）、艾尔莎·贝斯科 | 混合：Commons |  |
| 俄罗斯童话插画 Russian fairy-tale illustration `bilibin` | 东欧与俄罗斯 · 约 1899–1930 | 伊万·比利宾、“艺术世界”社 | 真迹：Commons |  |
| 黄金时代童话插画 Golden Age fairy-tale illustration `golden-age-fairy` | 西欧、北欧 · 约 1900–1930 | 亚瑟·拉克姆、埃德蒙·杜拉克、哈利·克拉克、凯·尼尔森 | 混合：Commons、Met | MVP |

### 6.8 装饰艺术与海报

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 工艺美术运动 Arts & Crafts `arts-and-crafts` | 西欧 · 约 1860–1910 | 威廉·莫里斯、伯恩-琼斯；凯姆斯科特出版社《乔叟集》 | 真迹：Met、Commons |  |
| 日本主义 Japonisme `japonisme` | 西欧 · 约 1860–1910 | 惠斯勒、亨利·里维埃《埃菲尔铁塔三十六景》、瓦洛东 | 真迹：Met、AIC |  |
| 美好年代海报 Belle Époque posters `belle-epoque-poster` | 西欧 · 约 1870–1914 | 朱尔·谢雷、图卢兹-劳特累克、斯坦伦《黑猫》 | 真迹：Met、AIC | MVP |
| 唯美主义黑白线描 Aestheticism & Beardsley `beardsley` | 西欧 · 约 1890–1900 | 奥布里·比亚兹莱《莎乐美》插图 | 真迹：Met、AIC、Commons | MVP |
| 新艺术运动 Art Nouveau `art-nouveau` | 西欧、东欧 · 约 1890–1910 | 阿尔丰斯·穆夏、欧仁·格拉塞 | 真迹：Met、AIC、Commons | 切片 |
| 维也纳分离派与青年风格 Secession & Jugendstil `secession` | 西欧 · 约 1897–1918 | 克里姆特、科洛曼·莫泽；《神圣之春》《青年》杂志 | 真迹：Met、Commons |  |
| 月份牌 Shanghai calendar posters `yuefenpai` | 中国 · 约 1910–1940 | 周慕桥、郑曼陀（擦笔水彩）、杭穉英 | 混合：Commons |  |
| 装饰艺术风插画 Art Deco illustration `art-deco` | 西欧 · 约 1910–1939 | 乔治·巴比耶、保罗·伊里贝；《Gazette du Bon Ton》时装版画 | 混合：Met、Commons |  |
| WPA 海报 WPA posters `wpa-poster` | 北美 · 1935–1943 | 美国联邦艺术计划海报部（丝网印刷） | 真迹：LoC |  |

### 6.9 现代与当代

| 风格 | 地域 · 年代 | 代表 | 图源 | 阶段 |
| --- | --- | --- | --- | --- |
| 苏联先锋派 Soviet avant-garde `soviet-avant-garde` | 东欧与俄罗斯 · 1917–1935 | 李西茨基《关于两个方块》、罗德琴科、斯滕伯格兄弟、列别杰夫的童书 | 混合：Commons、Met |  |
| 中世纪现代插画 Mid-century modern `mid-century-modern` | 北美、全球 · 1945–1970 | 玛丽·布莱尔、普罗文森夫妇、吉姆·弗洛拉、查理·哈珀 | 外链 | MVP |
| 波兰海报学派 Polish School of Posters `polish-poster` | 东欧 · 1950–1980 | 亨里克·托马舍夫斯基、扬·莱尼查、斯塔罗维耶斯基 | 外链 |  |
| 当代绘本 Contemporary picture books `picture-books` | 全球 · 1960 至今 | 莫里斯·桑达克、艾瑞·卡尔、陈志勇、几米、斯文·努德奎斯特、伊隆·维克兰 | 外链 |  |
| 迷幻海报 Psychedelic posters `psychedelic` | 北美 · 1965–1972 | 韦斯·威尔逊、维克托·莫斯科索、里克·格里芬 | 外链 |  |
| 观念插画 Conceptual editorial illustration `editorial` | 全球 · 1970 至今 | 让-米歇尔·弗隆、汤米·温格尔、克里斯托夫·尼曼 | 外链 |  |
| 日本动画美术 Anime background art `anime-art` | 日本 · 1980 至今 | 男鹿和雄（吉卜力背景）、新海诚 | 外链 |  |
| 像素艺术 Pixel art `pixel-art` | 全球 · 1980 至今 | eBoy | 外链 |  |
| 数字厚涂与概念美术 Digital painting & concept art `concept-art` | 全球 · 2000 至今 | 克雷格·穆林斯、朱峰 | 外链 |  |
| 孔版印刷风 Risograph aesthetic `risograph` | 全球 · 2005 至今 | 独立出版与 zine | 外链 |  |
| 扁平矢量插画 Flat vector illustration `flat-vector` | 全球 · 2010 至今 | 科技公司的人物插画（“Corporate Memphis”） | 外链 | MVP |
| 国潮插画 Guochao `guochao` | 中国 · 2015 至今 | 敦煌纹样、传统色、新中式 | 外链 |  |

MVP 暂缺非洲、拉丁美洲、喜马拉雅和东欧，全量阶段补齐。凯·尼尔森 1957 年去世，在欧盟 2028 年才进入公共领域，在此之前只给外链。

## 7. 金标准样例：浮世绘

下面是 `content/styles/ukiyo-e.md` 的完整写法：其余 76 种照此格式写，字段定义见 §10。标签、地区、大类都用英文 id，中文名在 `content/vocab.yaml` 里。

```markdown
---
id: ukiyo-e
nameZh: 浮世绘
nameEn: Ukiyo-e
nameOriginal: 浮世絵
family: printmaking
regions: [japan]
era: { start: 1670, end: 1900, label: "约 1670–1900（江户至明治）" }
imageMode: public-domain        # public-domain | mixed | external-only
attributes: { lineMass: -1, flatVolume: -2, sparseDense: 0, naturalStylized: 1, mutedVivid: 1 }
moods: [serene, opulent]
mediums: [woodcut]
keyArtists:
  - { zh: 铃木春信, original: 鈴木春信, life: "约 1725–1770", known: "最早一批多色锦绘", deathYear: 1770 }
  - { zh: 喜多川歌麿, original: 喜多川歌麿, life: "约 1753–1806", known: "美人大首绘", deathYear: 1806 }
  - { zh: 葛饰北斋, original: 葛飾北斎, life: "1760–1849", known: "《富岳三十六景·神奈川冲浪里》", deathYear: 1849 }
  - { zh: 歌川广重, original: 歌川広重, life: "1797–1858", known: "《东海道五十三次》《名所江户百景》", deathYear: 1858 }
  - { zh: 歌川国芳, original: 歌川国芳, life: "1797–1861", known: "武者绘、猫与戏画", deathYear: 1861 }
related:
  influencedBy: [ming-qing-woodblock]
  influenced: [japonisme, art-nouveau, shin-hanga]
  similar: [shin-hanga, minhwa]
museums:
  - { name: 东京国立博物馆, city: 东京 }
  - { name: 太田纪念美术馆, city: 东京, note: 浮世绘专门馆 }
  - { name: 波士顿美术馆, city: 波士顿, note: 日本以外藏量最大的之一 }
  # 斯德哥尔摩：先在 Östasiatiska museet 官网核实有藏或有展，再加
prompt:
  style: "ukiyo-e woodblock print"
  medium: ["Edo-period woodblock print", "flat color areas", "bold black outlines", "bokashi gradient sky", "visible paper texture"]
  palette: ["Prussian blue", "vermilion", "muted ochre", "soft pink"]
  composition: ["asymmetric composition", "dramatic cropping", "high vantage point", "stylized waves and clouds"]
  artistsPD: ["Katsushika Hokusai", "Utagawa Hiroshige", "Kitagawa Utamaro"]
  negative: ["photorealistic", "3D render", "glossy lighting", "lens blur"]
externalSearch: "ukiyo-e woodblock print"
sources:
  - https://en.wikipedia.org/wiki/Ukiyo-e
  - https://zh.wikipedia.org/wiki/浮世繪
---

## 一句话
江户城市的大众版画：清晰的墨线、平涂的色块，把美人、名角和名所印成人人买得起的画。

## 怎么看
- 看轮廓线：一块“主版”只印黑线，像铁丝框住每块颜色，粗细很均匀。
- 看颜色：一种颜色一块版、印一次，几乎没有明暗；天空和水面常有“暈し”（bokashi）渐变，是在版上抹色做出来的。
- 看构图：大胆裁切、前景被画框截断、高视点或极端近景，后来让莫奈、梵高着迷。
- 看蓝色：1830 年前后普鲁士蓝在日本普及，北斋、广重风景里那种透亮的蓝就是它。
- 看文字与印章：标题框、出版商印、审查印都是画面的一部分，构图会给它们留位置。

## 为什么长这样
江户时代（1603–1868）城市繁荣，町人想要买得起的流行图像。“浮世”原指忧患人世，后来转指及时行乐的当下。一张浮世绘是团队作品：版元（出版商）定选题，绘师画稿，雕师刻版，摤师逐色印刷。1765 年前后铃木春信等推出多色“锦绘”，色彩才丰富起来。明治以后照相和石版兴起，浮世绘衰落；但它流到欧洲，催生了日本主义，影响了新艺术运动。

## 怎么画
工具：0.3 和 0.5 针管笔或小楷软笔（勾线）；6 色以内的不透明水彩或广告色（平涂）；宽扁刷和喷壶（做渐变）。数字替代：单线笔刷 + 填色 + 纸纹叠加层。
技法：先定黑线稿，颜色一律平涂不画明暗；用色块的冷暖深浅分前后；渐变只用在天空、水面和地平线。
常见坑：线条粗细变化太大会变成漫画感；颜色太多会失去版画的克制。

## 15 分钟练习
选广重《名所江户百景》中任一幅，开 3×3 网格，只临一个角落：用 0.5 笔勾全部轮廓（5 分钟），用 4 种颜色平涂（7 分钟），最后在天空做一条从深蓝到透明的渐变（3 分钟）。
```

## 8. 图片来源与版权规则

一张图能进应用，必须同时满足三条：来源方明确标为 CC0 或公共领域；记录了来源链接和许可；通过 `npm run validate` 的许可检查。否则一律只给外链。

### 8.1 来源与判定字段

| 来源 | 接口 | 公共领域判定 | 取图 | 礼仪与限速 |
| --- | --- | --- | --- | --- |
| Met | `collectionapi.metmuseum.org`，免 key | `isPublicDomain` 为 true | `primaryImageSmall`；不够大时取 `primaryImage` 再缩小 | 每秒不超过 80 次 |
| AIC | `api.artic.edu`，免 key | `is_public_domain` 为 true | IIIF：`{iiif_url}/{image_id}/full/843,/0/default.jpg`，大图用 1686 宽 | 匿名每分钟 60 次；下载图片间隔 1 秒；请求头带 `AIC-User-Agent` |
| CMA | `openaccess-api.clevelandart.org`，免 key | `share_license_status` 为 CC0（查询加 `cc0` 和 `has_image=1`） | `images.web`（约 1000px），大图用 `images.print` | 文档未写限速，按每秒 1–2 次 |
| Commons | `commons.wikimedia.org` API | 许可为 Public domain 或 CC0，且作者 1955 年及以前去世或为 1900 年前的无名作品 | `imageinfo` 的缩略图（`iiurlwidth=1600`） | User-Agent 写项目名和仓库地址 |
| LoC | `www.loc.gov` JSON API | 权利声明为 No known restrictions，或美国联邦政府作品 | `tile.loc.gov` | 每秒不超过 1 次 |

三家博物馆的标注直接采信；各 API 都有数据全量包（GitHub 上的 JSON/CSV），大批量筛选时优先用全量包，少打接口。

### 8.2 处理规则

1. 构建时下载并存进仓库，运行时不热链博物馆服务器。缩略图 480px 宽（WebP，不超过 60KB），展示图长边 1600px（WebP，不超过 300KB），全部图片控制在 150MB 内。
2. 每幅图在 `content/artworks.json` 记录：来源、原始页面链接、许可、鸣谢文字、下载日期、原图尺寸。
3. 应用里每幅图都能看到鸣谢与许可；“关于”页说明本节规则。鸣谢格式：作品名，作者，年代。馆名，许可。
4. 混合风格只收明确标为公共领域的图；凑不够 4 幅，该风格降为外链，并写进覆盖报告。
5. 外链风格只放搜索链接，不嵌入、不截图、不缓存别人的图。
6. AI 关键词里的画家名只收 1955 年及以前去世的（校验脚本检查 `deathYear`）；当代风格只用描述词。
7. 挑图标准：每种 4–8 幅；至少 3 位不同作者或作坊（若该风格有）；题材不重样；代表作优先；画面完整，避开大面积装裱、画框、色卡；源图长边至少 1200px。每种指定 1 幅封面。
8. 请求头里的联系方式用仓库地址，不写个人邮箱。

## 9. 口味模型、推荐与 AI 提示词生成

口味用一个小的加权岭回归算：把每次评分对应到作品的 5 维分数，回归系数就是你在各维度上的偏好。全部在手机本地计算，不用任何 AI 接口；代码都是纯函数，放在 `src/lib/`，用合成用户做单元测试。

### 9.1 输入

| 来源 | x（5 维分数） | y | 权重 w |
| --- | --- | --- | --- |
| 盲测里给作品评分 | 作品分数，无覆盖则用风格分数 | 评分 ÷ 2 | 1.0 |
| 导览或看图器里给作品评分 | 同上 | 评分 ÷ 2 | 0.8（看得到名字，有光环效应） |
| 给风格评分 | 风格分数 | 评分 ÷ 2 | 1.0 |
| 收藏但未评分 | 作品分数 | 1 | 0.6 |

同一对象多次评分只取最新一次；历史保留在存储里。

### 9.2 偏好计算

先把 x 除以 2（落在 −1 到 1），再减去所有观测的加权平均 x̄；y 减去加权平均 ȳ。然后：

```latex
\beta = (X^\top W X + \lambda I)^{-1} X^\top W (y - \bar{y}), \qquad \lambda = 2
```

- β 的某一维大于 0，表示偏向右端（块面、立体、繁复、风格化、浓艳）；显示时截到 −1 到 1。
- 把握程度按评分次数算（收藏不计）：不到 15 次不出画像，只提示再评几次；15–39 次标“初步”；40 次起标“较可靠”。
- 某一维上观测的加权方差小于 0.1 时，该维显示“这类对比还没看够”。

### 9.3 风格、大类与标签的喜好

- 风格得分 = Σ(w·y) ÷ (Σw + 2)。分母里的 2 把少量评分往 0 拉，避免一两次评分就走极端。
- 大类、地域、年代的得分：其下风格得分按评分次数加权平均。
- 情绪、媒材、题材标签：带该标签的观测按同一公式算。
- 题材偏斜提醒：y 不小于 0.5 的观测里，某题材占 60% 以上且至少 5 次时触发。

### 9.4 推荐

- 对没评过的风格预测：ŷ = ȳ + β · (x\_风格 − x̄)。
- 排序分 = 0.7 × ŷ + 0.2 × 所属大类得分 + 0.1 × 新鲜度（地域或年代还没看过记 1，否则 0）。
- 一次给 5 种：前 4 种按排序分；第 5 种从排序分中段、地域没去过的风格里挑，标“惊喜”。随机数按日期取种子，同一天结果不变。
- 每条推荐配一句理由：取它与你最爱风格之间贡献最大的两维（“和你喜欢的浮世绘一样：平涂 + 清晰线条”）。外链风格也能被推荐，这是把你引向当代画风的桥。

### 9.5 自适应盲测（第二轮起，每轮 12 张）

- 50%：还没评过的风格，优先没去过的地域和年代。
- 30%：预测最喜欢的前 5 种风格里没评过的作品（验证）。
- 20%：把握最低的那一维，两端各取一张（把不确定的维度测清楚）。

### 9.6 文字画像

- 取 |β| 不小于 0.25 的维度，按大小最多 3 条：“你明显偏爱平涂（如浮世绘、民画）”。
- 没有维度过线时：“你的口味很杂食，再测一轮能看得更清楚。”
- 后接最爱的 3 种风格和最爱的大类。模板在 `src/lib/profileText.ts`。

### 9.7 AI 提示词

输入：得分大于 0.3 的前 3 种风格、β、标签喜好、收藏作品的色板。题材由你自填（中英文都行），默认 “a fox in the snow”。

| 变体 | 组成 |
| --- | --- |
| 纯正 | 题材 + 第 1 名的 style + 其 medium 前 3 个 + composition 1 个 + palette 前 3 色 |
| 融合 | 题材 + “a blend of 第 1 名 and 第 2 名” + β 描述词最多 3 个 + 两者 medium 各 1–2 个 + 收藏色板 |
| 关键词版 | 逗号分隔的关键词，适合 Stable Diffusion 一类工具；负面词另起一行 |

β 描述词（|β| 不小于 0.3 才用）：

| 维度 | 偏左 | 偏右 |
| --- | --- | --- |
| 线条 ↔ 块面 | clean ink linework, bold outlines | painterly brushwork, soft edges |
| 平面 ↔ 立体 | flat colors, no shading | volumetric shading, dramatic light |
| 简约 ↔ 繁复 | minimal, generous negative space | intricate details, ornate patterns |
| 写实 ↔ 风格化 | naturalistic, observed detail | stylized, simplified shapes |
| 素雅 ↔ 浓艳 | muted limited palette | vivid saturated colors |

- 负面词：第 1 名风格的 negative，加上 |β| 不小于 0.5 的维度里你不喜欢那一端的描述词（爱平涂就把 “volumetric shading” 放进负面词）。
- 画家名开关默认打开，只从 `artistsPD` 取。
- 每个变体下面一句中文说明它用了什么（“融合了浮世绘与新艺术运动，强调平涂和清晰线条”）。
- 不写死任何出图工具的参数（如画幅比例），你自己加。

## 10. 技术方案

纯静态站点：内容和图片都在构建时准备好，运行时只读静态文件；你的评分只存在手机的 IndexedDB 里；部署到 GitHub Pages。

*（图：架构 · 构建时 5 步，运行时 3 块。原图见 claude.ai 上的文档。）*

博物馆接口只在构建时调用；手机端不依赖任何后端，评分只存在本机。

### 10.1 技术栈

| 用途 | 选择 | 说明 |
| --- | --- | --- |
| 构建 | Vite + React 19 + TypeScript（strict） | 云端环境已预装 Node 22 |
| 样式 | Tailwind CSS | 设计令牌放 CSS 变量，支持深浅色 |
| 路由 | React Router，Hash 模式 | GitHub Pages 不需要服务端回退 |
| 状态与存储 | Zustand + idb-keyval | 整个用户状态存一个对象 |
| 看图 | PhotoSwipe 5 | 移动端缩放手势成熟 |
| 搜索 | MiniSearch | 本地模糊搜索 |
| PWA | vite-plugin-pwa（Workbox） | 预缓存外壳和索引，图片运行时缓存 |
| 校验 | zod | 内容文件和导入的备份都过 schema |
| 内容脚本 | Node + tsx + sharp | 抓取、缩放、取色板、拼联系表 |
| 测试 | Vitest；Playwright（可选） | Playwright 需放行其下载域名（§11） |
| 图标 | lucide-react |  |

### 10.2 仓库结构

```text
style-atlas/
  CLAUDE.md
  docs/SPEC.md            本文
  docs/DECISIONS.md       实施中自行做的决定
  docs/COVERAGE.md        图片覆盖报告（脚本生成）
  content/
    vocab.yaml            大类、地区、时代、标签的 id 与中文名
    families.yaml
    styles/<id>.md        每种风格一个文件（§7 格式）
    artworks.json         选定作品的元数据与许可
    curation/<id>.candidates.json
    curation/<id>.picks.json
  public/img/art/<artworkId>-480.webp
  public/img/art/<artworkId>-1600.webp
  scripts/
    sources/  met.ts aic.ts cma.ts commons.ts loc.ts
    candidates.ts contact-sheet.ts download.ts
    build-content.ts validate.ts coverage.ts deploy.ts
  src/
    app/        路由与外壳
    features/   blind tour explore style viewer study me data
    lib/        taste.ts recommend.ts prompt.ts profileText.ts timeline.ts storage.ts
    content/    构建生成的 JSON，不手改
  tests/  e2e/
```

### 10.3 数据结构

```ts
type Score = -2 | -1 | 0 | 1 | 2;
interface Attributes {            // 每维 -2..2，定义见 §5.4
  lineMass: number; flatVolume: number; sparseDense: number;
  naturalStylized: number; mutedVivid: number;
}
interface Style {
  id: string; nameZh: string; nameEn: string; nameOriginal?: string;
  family: FamilyId; regions: RegionId[];
  era: { start: number; end: number | null; label: string };   // 公元前用负数
  imageMode: 'public-domain' | 'mixed' | 'external-only';
  attributes: Attributes; moods: MoodId[]; mediums: MediumId[];
  keyArtists: { zh: string; original?: string; life?: string; known?: string; deathYear?: number }[];
  related: { influencedBy: string[]; influenced: string[]; similar: string[] };
  museums: { name: string; city: string; note?: string; url?: string;
             local?: 'stockholm' | 'sweden' | 'nordic' }[];
  prompt: { style: string; medium: string[]; palette: string[]; composition: string[];
            artistsPD: string[]; negative: string[] };
  externalSearch: string; sources: string[];
  body: { oneLiner: string; howToLook: string[]; background: string;
          howToDraw: string; exercise: string };          // 来自 Markdown 正文
  artworkIds: string[]; coverArtworkId?: string;
}
interface Artwork {
  id: string;                       // 如 met-45434、aic-24645
  styleIds: string[]; title: string; titleZh?: string;   // titleZh 只在有把握时填
  artist?: string; date: string; medium?: string;
  source: 'met' | 'aic' | 'cma' | 'commons' | 'loc'; sourceUrl: string;
  license: 'CC0' | 'PD'; credit: string; downloadedAt: string;
  img: { thumb: string; display: string; width: number; height: number };
  palette: string[];                // 5 个 HEX，构建时算
  subjects: SubjectId[]; attributes?: Partial<Attributes>;
  blindEligible: boolean;
}
interface UserState {
  schemaVersion: 1;
  ratings: { target: 'artwork' | 'style'; id: string; score: Score;
             context: 'blind' | 'tour' | 'browse'; at: string }[];
  favorites: string[]; notes: Record<string, string>;
  progress: { visitedStyles: string[]; tour?: { family: string; style: string } };
  prompts: { subject: string; text: string; at: string }[];
  exercisesDone: string[];
  settings: { tourOrder: 'history' | 'taste'; includeArtistNames: boolean };
  lastBackupAt?: string;
}
```

### 10.4 内容管线

1. `npm run curate:candidates -- <styleId>`：按风格的检索提示查各来源，只留公共领域且有图的，每种存 20–40 条候选。
2. `npm run curate:sheet -- <styleId>`：把候选缩略图拼成带编号的联系表。Claude 打开这一张图挑图，写 `picks.json`（编号、理由、封面、题材、是否适合盲测），不必逐张看。
3. `npm run curate:download -- <styleId>`：下载选中的图，sharp 生成两档 WebP，算 5 色色板，写入 `artworks.json`。
4. `npm run content:build`：Markdown 与 YAML 编译成 JSON；风格索引进主包，风格详情按需加载。
5. `npm run validate`：zod 校验，并检查引用的作品和图片文件都存在、许可只有 CC0 或 PD、`artistsPD` 的卒年都不晚于 1955、配图风格至少 4 幅、外链风格有搜索词、每种至少 2 个来源链接、文字长度不超标。
6. `npm run coverage`：生成 `docs/COVERAGE.md`，列出每种风格的图数、来源和降级情况。

所有脚本可重复运行：已下载的跳过，网络响应缓存在 `.cache/`（不提交）。

### 10.5 存储与备份

- 用户状态写入防抖 500 毫秒；带 `schemaVersion` 和迁移函数。
- 首次完成盲测后调用 `navigator.storage.persist()`，结果显示在数据页。
- iPhone 的 Safari 对没加到主屏的网站，可能在 7 天未访问后清掉存储；所以引导加到主屏，并做备份提醒。
- 导出文件名 `style-atlas-backup-YYYY-MM-DD.json`；导入前先用 zod 校验。

### 10.6 PWA 与性能

- 预缓存应用外壳、风格索引和词表；风格详情用 StaleWhileRevalidate，图片用 CacheFirst（最多 600 张、30 天）。
- 首屏 JS（gzip 后）不超过 200KB；图片懒加载，用 `srcset` 在 480 和 1600 之间选；盲测和导览预加载后 3 张。
- Lighthouse 移动端：性能不低于 85，可访问性不低于 90，可安装。

### 10.7 部署

- GitHub Pages 选“从分支部署”：会话里 `npm run deploy` 构建后把 `dist/` 推到 `gh-pages` 分支（含 `.nojekyll`）。
- 不用 Actions 工作流：云端会话推送 `.github/workflows/` 下的文件曾被 GitHub 拒绝过，推分支则没有这个问题。
- 好处：每阶段结束时你在手机上看到的就是这一阶段的成果，满意再合并 PR。
- Vite 的 `base` 设为 `/<仓库名>/`。

### 10.8 测试

- 单元（Vitest）：口味回归（合成用户“爱平涂、爱浓艳”，β 符号必须对）、收缩、推荐排序、提示词拼装、时间线分段刻度、存储迁移、导出导入往返。
- 内容：`npm run validate` 零错误才能部署。
- 端到端（Playwright，iPhone 13 与 Pixel 7 视口）：盲测 → 揭晓 → 导览一站 → 风格页 → 评分 → 我的 → 导出 → 重置 → 导入。会话里装不上浏览器就跳过，在 DECISIONS.md 记一笔。
- 每阶段截 3–5 张手机视口截图存到 `docs/screenshots/phase-N/`，在 PR 描述里列出。

## 11. 开工前准备（你来做，约 20 分钟）

开工前只有 5 件事，都能在手机上完成；之后每个阶段你只需粘贴一条提示词、在手机上验收、合并 PR。

1. **建仓库**：在 GitHub 新建公开仓库 `style-atlas`，勾选“Add a README”（云端会话需要非空仓库）。用公开仓库是因为免费账户的 GitHub Pages 只支持公开仓库；仓库里没有你的任何个人数据，评分只在你手机上。
2. **放文档**：把本文导出为 Markdown，在仓库网页用 Add file → Upload files 上传为 `docs/SPEC.md`；把附录 A 的内容存为根目录的 `CLAUDE.md`。
3. **授权 GitHub**：在 claude.ai/code 连接 GitHub，并安装 Claude GitHub App、把这个仓库加入授权范围。没装 App 时，会话常常能读不能推。
4. **建云环境**：在 claude.ai/code 的环境选择器里新建环境 `style-atlas`，Network access 选 Custom，勾选 “Also include default list of common package managers”，在 Allowed domains 里一行一个填下面的域名。
5. **开 Pages**（等 Phase 1 第一次部署、出现 `gh-pages` 分支之后）：仓库 Settings → Pages → Source 选 Deploy from a branch，分支 `gh-pages`，目录 `/(root)`。网址是 `https://<你的 GitHub 用户名>.github.io/style-atlas/`。

```text
collectionapi.metmuseum.org
images.metmuseum.org
api.artic.edu
www.artic.edu
openaccess-api.clevelandart.org
openaccess-cdn.clevelandart.org
commons.wikimedia.org
upload.wikimedia.org
*.wikipedia.org
www.wikidata.org
www.loc.gov
tile.loc.gov
cdn.playwright.dev
playwright.download.prss.microsoft.com
```

前 12 个用于取图和核对事实，最后 2 个让 Playwright 能装浏览器做截图测试；GitHub 走单独代理，不用加。写内容的阶段要上各博物馆官网核实“去哪看真迹”，可以临时把环境切到 Full，做完再切回；修改约一分钟内对正在运行的会话生效。

每次开会话：选仓库 `style-atlas` 和环境 `style-atlas`，权限模式选 Auto（没有就选 Accept edits），粘贴 §12 里对应阶段的提示词。会话在云端跑，关掉 App 也不会停。

## 12. 分阶段实施

共 7 个阶段、约 14–16 次会话：先用 6 种风格把整条体验做通（Phase 1–4），再扩内容（Phase 5、7），中间补探索功能（Phase 6）。每个阶段结束都会部署，你在手机上验收后再合并。

*（图：实施路线 · 7 个阶段，约 14–16 次会话。原图见 claude.ai 上的文档。）*

前四个阶段只用 6 种风格，先让整条体验在你手机上跑通；之后只加内容和功能，不动结构。

**通用提示词**（每次只改阶段号或批次）

```text
先读 CLAUDE.md 和 docs/SPEC.md，然后执行 §12 里的 Phase 1。
规则：
- 规格没写到的地方按附录 B 的默认决策处理，记进 docs/DECISIONS.md，不要停下来问我。
- 只用 §8 允许的图片；事实不确定就不写。
- 结束前依次跑 npm test、npm run validate、npm run build、npm run deploy，再推送分支。
- 最后回复：本阶段验收标准逐条的结果、截图位置、需要我手动做的事。
```

### Phase 1 · 骨架与部署（1 次会话）

- 做：Vite + React + TS + Tailwind 初始化；4 个标签页的空壳与路由；深浅色与系统字体；PWA（manifest、图标、离线外壳）；zod schema、`vocab.yaml`、`families.yaml`；`content:build` 与 `validate` 脚本，用 §7 的浮世绘文件跑通；IndexedDB 存储层和数据页（导出、导入、重置）；`npm run deploy`。
- 验收：test、validate、build 全过；`gh-pages` 分支出现；手机能打开、能加到主屏、断网能打开外壳；导出 → 重置 → 导入往返一致。
- 你：开启 Pages（§11 第 5 步），手机打开，合并 PR。

### Phase 2 · 图片管线与 6 种切片内容（1–2 次）

- 做：5 个来源客户端（限速、重试、缓存、请求头）；候选、联系表、下载脚本与色板；为浮世绘、波斯细密画、工笔、新艺术运动、北欧童话各挑 6–8 幅；写这 5 种加日本漫画（外链）的风格文件；生成 COVERAGE.md。
- 验收：每种配图风格至少 6 幅、全部带许可与鸣谢；validate 零错误；图片合计不超过 20MB。
- 你：看 PR 里的联系表截图，哪幅不喜欢就在 PR 评论里说。

### Phase 3 · 核心体验（1–2 次）

- 做：评分组件、盲测、揭晓、导览（首页、章节、站）、风格页（含外链变体）、看图器、进度保存（§4.1–4.6）。
- 验收：端到端流程跑通（或截图记录）；一轮盲测 4 分钟内可评完；切站不超过 300 毫秒。
- 你：在手机上实际用 10 分钟，把不顺手的地方写进 PR 评论。

### Phase 4 · 口味画像与工具（1 次）

- 做：§9 的全部算法与单元测试；口味光谱条、推荐、提示词工坊、学画路线、看展清单、收藏、笔记；临摹模式；自适应盲测。
- 验收：合成用户测试通过；评 15 次后画像出现；提示词 3 个变体可复制；临摹模式开关可组合。
- 你：评满 40 次后看画像像不像你，不像的地方告诉下一个会话。

### Phase 5 · 扩到 MVP 24 种（3 次，每次一批）

- 第 1 批：gothic-illumination、mughal、xieyi、rinpa、nianhua、minhwa。
- 第 2 批：renaissance-print、wood-engraving、botanical、british-satire、daumier、fraktur。
- 第 3 批：victorian-toy-books、golden-age-fairy、beardsley、belle-epoque-poster、mid-century-modern、flat-vector；顺带写齐 9 个大类的章节开头。
- 每批：候选 → 联系表挑图 → 下载 → 写风格文件 → 核对事实与“去哪看”（可临时切 Full 网络）→ validate。提示词里写“执行 Phase 5 第 1 批”。
- 验收：本批 validate 零错误；COVERAGE.md 里没有未处理的降级。
- 你：每批合并前随机抽 2 种风格读一遍。

### Phase 6 · 地域与时间线（1 次）

- 做：构建时预渲染的简化世界地图（13 个可点区域）；分段刻度的时间线，按大类着色、可筛选；搜索；探索进度。
- 验收：375px 宽屏可用；时间线刻度测试通过；搜索 100 毫秒内出结果。

### Phase 7 · 全量 77 种与打磨（6 次）

- 第 1 批（抄本 6 + 东亚 4）：egyptian-papyrus、insular、thangka、mesoamerican-codex、ethiopian、rajput-pahari、baimiao、emaki、suiboku-zenga、korean-genre。
- 第 2 批（版画 6 + 民间 4）：ming-qing-woodblock、etching、posada、expressionist-woodcut、shin-hanga、chinese-woodcut-movement、lubok-epinal、dalmalning、kalighat、mithila。
- 第 3 批（博物 6 + 讽刺与漫画 7）：islamic-science、anatomy、japan-natural-history、ornithology、china-export、haeckel、giga-manga、proto-comics、newspaper-comics、lianhuanhua、chinese-manhua、bande-dessinee、american-comics。
- 第 4 批（书籍 4 + 装饰 6）：blake、american-golden-age、swedish-home、bilibin、arts-and-crafts、japonisme、secession、yuefenpai、art-deco、wpa-poster。
- 第 5 批（现代 10）：soviet-avant-garde、polish-poster、picture-books、psychedelic、editorial、anime-art、pixel-art、concept-art、risograph、guochao。
- 打磨：Lighthouse、无障碍、离线测试、“关于”页（版权规则）、最终 COVERAGE.md。
- 验收：§1 的验收标准全部达到。

## 13. 风险与对策

最可能卡住进度的是网络和推送权限；最可能误导你的是内容里的事实错误。

| 风险 | 对策 |
| --- | --- |
| 云端会话连不上博物馆接口 | 环境用 Custom 放行 §11 的域名；仍失败就临时切 Full；脚本带缓存，断了可续跑 |
| 会话能读不能推 | 安装 Claude GitHub App 并授权这个仓库；部署走 `gh-pages` 分支，不碰 `.github/workflows/` |
| 版权误判 | 只认来源方标注；每幅图记录许可；Commons 加卒年规则；validate 拦截；有疑问就降为外链 |
| AI 写的内容有事实错误 | 每种风格至少 2 个来源链接；不确定不写；你每批抽查 2 种；错误在 PR 评论或下个会话里指出 |
| iPhone 清掉本地数据 | 加到主屏；`navigator.storage.persist()`；14 天备份提醒；导出文件 |
| 博物馆接口变动或下线 | 图片已存进仓库，运行时不依赖接口；脚本可重跑、可换来源 |
| 口味画像不准 | 收缩与把握程度显示；题材偏斜提醒；自适应盲测补测不确定的维度 |
| 馆藏偏西方（三家主源都在美国） | 亚洲与伊斯兰材料多用 Met、CMA 的亚洲部门和 Commons；盲测按大类配额抽样 |
| 仓库过大 | 两档 WebP 有大小上限，全部图片不超过 150MB；联系表和缓存不提交 |
| Claude 用量消耗大 | 内容阶段最耗用量，已拆成小批；每批结束都可以停，做完的部分已可用 |

## 附录

### A. CLAUDE.md 草稿

存为仓库根目录的 `CLAUDE.md`，每个会话都会先读它。

```markdown
# 画风地图 Style Atlas

只给一个人用的手机端插画风格探索 PWA。完整规格与计划在 docs/SPEC.md，章节编号以它为准。

## 常用命令
- npm run dev / build / test / lint
- npm run content:build   Markdown + YAML 编译为 src/content/*.json
- npm run validate        内容与许可校验，必须零错误
- npm run curate:candidates -- <styleId>，然后 curate:sheet、curate:download
- npm run coverage        生成 docs/COVERAGE.md
- npm run deploy          构建并推送到 gh-pages 分支

## 硬规则
1. 图片只用来源方标为 CC0 或公共领域的（SPEC §8）；不热链，不嵌入有版权的图。
2. 事实不确定就不写；每种风格至少 2 个来源链接；titleZh 没把握就留空。
3. AI 关键词里的画家名只收 1955 年及以前去世的。
4. 用户数据只存本机 IndexedDB；不加统计、追踪、后端或 AI 接口。
5. 界面中文，术语附英文和原文；写作遵守 SPEC §5.6。
6. 规格没写到的按 SPEC 附录 B 处理，记入 docs/DECISIONS.md；不要停下来等人回复。
7. 不提交 .github/workflows/ 下的文件；部署只用 npm run deploy。
8. 阶段结束前 test、validate、build、deploy 都要通过；回复里逐条报告验收结果。

## 代码约定
- TypeScript strict；src/lib 下是纯函数，都有单元测试。
- 组件按 src/features/ 分目录；不引入大型 UI 框架。
- 只用系统字体；触控目标不小于 44px；尊重减少动态效果。
- 网络请求带 User-Agent：StyleAtlas/0.1 (+仓库地址)；AIC 另加 AIC-User-Agent。
```

### B. 默认决策

规格没写到时按下表处理，你想改哪条直接改这里。

| 事项 | 默认 |
| --- | --- |
| 名字 | 画风地图，英文 Style Atlas，仓库 `style-atlas` |
| 视觉 | 克制，让画作做主角：浅色暖灰白底 #F7F5F0，深色 #121212，强调色墨蓝 #1F3A5F（深色模式 #8FB3D9）；看图器始终深色 |
| 评分与盲测 | 5 档；首轮 24 张，之后每轮 12 张 |
| 导览顺序 | 历史脉络；大类内按起始年份 |
| 每种风格的图 | 目标 6 幅，4–8 幅都可接受 |
| 中文作品名 | 有把握才填，否则显示原名 |
| 去哪看真迹 | 核实不了就只列世界级馆藏，不写斯德哥尔摩 |
| 维度打分有争议 | 取更接近该风格代表作的值，在风格文件里注一句 |
| 截图视口 | 390×844（iPhone 13）与 412×915（Pixel 7） |
| 文案语气 | 简短、中性，不用感叹号 |
| 做不了的任务 | 记入 DECISIONS.md 并跳过，最后在回复里列出 |

### C. 以后再做

- 自己的灵感图：本地保存截图并打风格标签，补上当代画风的图。
- 两图二选一的对比模式。
- AI 对照图：同一题材画成多种风格（需要图像 API）。
- AI 讲解员（需要 Claude API）。
- 每日一图提醒、跨设备同步、英文或瑞典语界面。
- 更多地区与风格：东南亚、非洲当代、拉美现代、Webtoon、流行超现实。

## 来源

- [Art Institute of Chicago API 文档](https://api.artic.edu/docs)：限速、AIC-User-Agent、IIIF 取图、`is_public_domain`
- [The Met Collection API](https://metmuseum.github.io/)：免 key、每秒 80 次、`isPublicDomain`
- [Cleveland Museum of Art Open Access API](https://openaccess-api.clevelandart.org/)：`cc0` 与 `has_image` 参数、图片尺寸
- [Claude Code：配置云环境](https://code.claude.com/docs/en/cloud-environments)：网络级别、Custom 白名单、预装工具、GitHub 代理
- [Claude Code：云端快速上手](https://code.claude.com/docs/en/web-quickstart)：需要带 README 的仓库、GitHub App、推分支与 PR
- [GitHub Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：免费账户仅支持公开仓库、站点 1GB
- [云端会话推送 workflow 文件被拒的问题记录](https://claudeissues.com/issue/61189-bug-claude-code-on-the-web-git-push-and-github-mcp-refuse-changes-under-github-w)
