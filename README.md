# KONG LAB · 孔总实验室

《瓜瓜物语》为主体，KONG LAB 作品页为辅助。保留原 Cocos 游戏、人物素材和合成物理，接入真实联网成绩、匿名排行榜及可撤销的测试设备 / IP 排除名单。

**源码仓库：** https://github.com/kxp123lm/kong-lab  
**生产地址：** https://kong-lab.vercel.app （已部署页面；数据库迁移与生产验收进行中，详见测试报告）。

原仓库 `kxp123lm/xiaomin` 与原站 `xiaomin.vercel.app` 从未被本项目修改。

## 快速开始

需要 Node.js **24.x** 和 pnpm **11.25.0**。

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
```

复制 `.env.example` 为 `.env.local`，填写你自己的 Neon 连接字符串与服务端密钥。然后：

```sh
pnpm db:migrate
pnpm dev
```

访问 http://localhost:3000 。不配置数据库也可浏览网站并明确选择离线游玩，联网功能会显示不可用，不会伪造数据。

## 已实现

- `/` 手机水果开始页，`/lab` 响应式中文作品站，集中作品配置：`src/data/projects.ts`。
- `/game`：真实 Cocos 构建资源；无昵称输入、自动开局、IP-001 等递增匿名编号；服务端开局立即保存 0 分；真实 `PlayerInfo.score` 事件桥接。
- 约四秒节流同步、暂停/隐藏/离开补传、keepalive 与 beacon、24 小时待重试日志。每局独立保存待上传值及服务端确认水位，避免多标签覆盖。
- 游戏内覆盖式排行榜（暂停 / 返回原局），兼容 `/leaderboard`：历史、今日、本周 TOP 100；每匿名浏览器最高有效分；未结束局可入榜；我的最高分与排名。
- `/admin`：密码验证、HttpOnly 登录、统计概览、最近记录、日期/地区/分数筛选及分页。
- 数据库设备 / 网络排除规则，支持启停、删除、追溯、恢复、从记录添加、正式 / 测试 / 全部筛选；测试不进入公共排行或普通玩家档案。
- Neon HTTP 驱动、参数化 SQL、唯一键与索引、数据库限流、同源验证、玩家所有权校验、基本刷分异常检测。
- Vercel 官方地理信息接口；IP HMAC-SHA256，应用数据库不保存明文 IP；隐私与开源致谢页面。

## 验证

```sh
pnpm test
pnpm typecheck
pnpm verify:assets
pnpm build
```

34 项自动化测试通过。数据库集成测试使用 **真实 PostgreSQL 引擎 PGlite** 执行同一份迁移与 SQL，不是模拟成绩或内存对象替身。本地浏览器还验证了真实游戏得分 → API → PostgreSQL → 排行榜的完整链路。Neon/Vercel 生产验收仍需真实账号配置。

详见 [管理员使用说明](docs/管理员使用说明.md)、[测试报告](docs/TEST-REPORT.md)、[中文部署说明](docs/DEPLOY.md) 和 [原游戏改造记录](docs/UPSTREAM.md)。

## 目录

```text
src/app/                 页面、布局、API 路由
src/components/          首页、Cocos 容器、排行榜、管理员界面
src/data/projects.ts     可扩展作品配置
src/lib/                 数据查询、验证、Cookie、安全、上传日志
public/cocos/            原游戏引擎、素材、打包脚本、小型桥接
db/*.sql                 增量迁移、数据表、编号、规则与分类统计视图
scripts/                 Neon 初始化、资源完整性校验
tests/                   SQL、API、安全、桥接、并发和重试测试
```

## 统计与隐私边界

匿名玩家按签名浏览器 Cookie 区分，不将 IP 当作具体个人。日榜与周榜按北京时间的**开局时间**筛选，周一开始；同分以最早达到时间排序。普通访客数量指至少开过普通游戏的匿名浏览器，不是网站浏览量。

服务端只接受对应玩家签名 Cookie 和局次令牌；乱序同步不降低分数。最多 24 小时一局，基础上限为 1000 万分及 `300 + 已经过秒数 × 150`，不属于权威商业级反作弊。浏览器可修改自身代码，无法从已构建的单机客户端建立绝对可信的计分证明。

断网或直接关闭网页时，只保证保留**最后一次服务端确认成功**的分数。beacon 入队不代表服务器已确认。不要以本地显示数字代替已保存成绩。

原游戏代码与素材遵循随附 [Mulan PSL v2 许可证](LICENSE)，来源与修改说明在致谢页和 `docs/UPSTREAM.md`。
