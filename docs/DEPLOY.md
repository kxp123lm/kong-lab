# 两站维护

# KONG LAB · 孔总实验室

一些游戏、一些工具，以及奇奇怪怪的想法。

正式网址：https://kong-lab.vercel.app 。源码 kxp123lm/kong-lab，生产分支 **main**。

这是独立的个人作品展示网站，只包含主页、隐私和致谢页面。作品在 src/data/projects.ts 维护，第一项瓜瓜物语通过真正的超链接打开 https://xiaomin.vercel.app 。没有游戏引擎、游戏 API 或数据库依赖。

旧 /game、/leaderboard、/admin、/api/*、/cocos/* 通过308跳转至 xiaomin 的相应路径，/lab 跳转本站主页。游戏源码、成绩、排行榜和管理后台统一由 xiaomin 仓库 master 分支维护。

## 开发和自动部署

Node.js 24.x，pnpm 11.25.0。pnpm install --frozen-lockfile 后运行 pnpm dev；pnpm build 验证生产构建，pnpm start 预览。不需要任何环境变量或数据库。

Vercel 原 kong-lab 项目连接本仓库 main，框架 Next.js，根目录留空。推送 main 自动部署到 kong-lab.vercel.app。修改游戏时请到 kxp123lm/xiaomin 的 master，不能把游戏重新复制到本仓库。

## 迁移与备份

迁移前完整游戏版本保存在本仓库标签 backup-game-before-split-20261022（4d1327d）。2022 原游戏保存在 xiaomin 仓库标签 backup-2022-before-guagua-20261022（390ea9a）。历史代码均可通过标签恢复。

Neon kong-lab-db 名称不变，继续保存游戏全部历史记录；游戏后端只部署于 xiaomin。作品站不读取或写入游戏成绩。
