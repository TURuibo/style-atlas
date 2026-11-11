# 画风地图 Style Atlas

一个只给自己用的手机网页应用：先盲测摸清口味，再按 9 大类走过 77 种插画风格（跨地域、跨时代），最后得到口味画像、学画路线和 AI 出图提示词。

- 规格与计划：[docs/SPEC.md](docs/SPEC.md)
- 实施决定：[docs/DECISIONS.md](docs/DECISIONS.md)
- 给 Claude 的工作说明：[CLAUDE.md](CLAUDE.md)

## 本地开发

```bash
npm install
npm run dev        # 本地预览
npm test           # 单元测试
npm run validate   # 内容与许可校验
npm run deploy     # 构建并发布到 gh-pages 分支
```

图片全部来自博物馆开放的公共领域 / CC0 藏品，来源与许可写在 `content/artworks.json`，应用里每幅图都显示鸣谢。
