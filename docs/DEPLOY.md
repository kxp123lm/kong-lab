# 免费部署到 Vercel + Neon

当前新仓库：https://github.com/kxp123lm/kong-lab 。本项目与 `xiaomin` 没有部署或数据库关联。**不要在旧 Vercel 项目中替换 Git 仓库，不要更改旧域名。**

## 你需要做的操作

1. 在 Vercel 用自己的账号导入 **kxp123lm/kong-lab**，创建全新项目 `kong-lab`。选择个人免费 Hobby 方案，框架 Next.js，Node.js **24.x**。已有 `vercel.json` 和锁文件，无需改构建命令。
2. 在该**新项目**的 Storage 中连接 Neon 免费数据库，或到 Neon 创建免费 PostgreSQL 项目并复制连接字符串。只选择免费方案；出现付费或升级提示时停止，不用开通。优先选与 Vercel 亚洲部署区接近的可用数据库区。
3. 设置下面的服务端环境变量，在 Neon SQL Editor 执行仓库中的 **`db/001_init.sql`**，然后在 Vercel 点击 Deploy / Redeploy。首选 `kong-lab.vercel.app`；若被占用，选 `kong-lab-kxp123lm` 等可用名字。

若使用终端初始化，可将连接字符串只放 `.env.local` 并执行 `pnpm db:migrate`。不要提交 `.env.local` 或把连接字符串粘进公开 issue。

## 环境变量

| 名称 | 内容 |
|---|---|
| `DATABASE_URL` | Neon 提供的 PostgreSQL URL，带 `sslmode=require`；集成如只生成 `POSTGRES_URL`，把同一值填到 `DATABASE_URL`。 |
| `SESSION_SECRET` | 至少 32 字符，建议随机 32 字节十六进制；用于玩家/游戏/管理员/设备签名。 |
| `IP_HMAC_SECRET` | 另一个独立随机密钥，至少 32 字符，用于匿名化 IP。 |
| `ADMIN_PASSWORD` | 你自己设置的强密码，至少 12 字符。不得使用测试文件中的测试密码。 |
| `APP_ORIGIN` | 最终完整生产来源，如 `https://kong-lab.vercel.app`，不带路径或末尾斜杠；本地留空。 |

每次运行下面命令生成一个新的随机密钥；分别为两个 SECRET 生成，不要共用：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Vercel 环境变量不要添加 `NEXT_PUBLIC_` 前缀。环境变量修改后需要重新部署。

`APP_ORIGIN` 生产值只在 Production 环境设置；Preview 可留空以从当前请求来源判断。访问自定义域名时也需更新该值，统一使用一个正式来源，否则变更 API 会因同源校验返回 403。

## 验收顺序

1. 浏览 `/` 和 `/game` 介绍，Neon `sessions` 应无新增记录。客户端可能调用 `/api/player`，这不会插入玩家或游戏。
2. 点击联网「开始游戏」，Neon 立即出现一条 0 分会话；未创建成功不会装作联网游戏已经开始。
3. 操作真实游戏直到合成得分，等待四秒左右，界面「服务端已确认」与数据库一致。直接关页，再打开排行榜，已同步成绩仍在。
4. `/leaderboard` 查看总榜、日榜、周榜及我的排名。不同浏览器视为不同匿名玩家，Cookie 不可跨域迁移。
5. 用自己设置的密码登录 `/admin`，开启站长设备免统计，**再开始新局**。当前进行中的旧局不会被偷偷改类型；可用「当前浏览器旧游戏排除统计」明确排除。
6. 连续十局测试，普通概览与公共榜不变化。退出管理员后设备标记仍生效；在后台关闭免统计后，新开局恢复普通记录。
7. 在真实手机 Safari / Chrome 验证拖动、松手、暂停、前后台切换和排行榜。最后只读访问旧站确认正常。

可运行的检查 SQL：

```sql
SELECT id, nickname, score, started_at, last_sync_at, finished, is_test
FROM sessions ORDER BY started_at DESC LIMIT 20;

SELECT * FROM player_profiles ORDER BY last_game_at DESC LIMIT 20;
```

## 日常维护与免费额度

站点没有开通付费服务或常驻后台任务。Neon 使用 HTTP，无持久连接池；Vercel Serverless 按请求执行。免费方案的可用性与额度由各服务商决定，不能保证任意流量永远零费用；不要自动升级套餐，按账号控制台的实际免费额度运行。

限流全部存储在 PostgreSQL 中，跨 Function 实例生效：开局每浏览器 30 次/10 分钟、同 IP 匿名标识 100 次/10 分钟，更新每浏览器 90 次/分钟，读榜每 IP 匿名标识 120 次/分钟，登录每 IP 匿名标识 8 次/15 分钟。受共享 NAT 影响多人可能共享 IP 限流，但不会因此被视为同一玩家。

可以定期在 Neon SQL Editor 清理过期限流数据，不影响成绩：

```sql
DELETE FROM rate_limits WHERE expires_at < now() - interval '1 day';
```

游戏记录默认保留支持历史榜；如需清理，先备份并按自己的保留策略执行。后台清理仅能删除**当前已登录管理员浏览器**的已标记测试局，不能随意删除别人的记录。

轮换 `ADMIN_PASSWORD` 会使旧管理员登录失效；轮换 `SESSION_SECRET` 会使全部签名 Cookie / 游戏令牌失效，玩家会成为新的匿名浏览器。轮换 `IP_HMAC_SECRET` 会改变之后的匿名 IP 标识。

## 常见问题

- **503 联网服务不可用：** 检查 Neon 是否连接、表是否初始化、连接字符串/秘密变量是否配置，以及 Vercel 服务端日志。页面不会返回数据库连接字符串，日志也不记录原始错误文本中的秘密。
- **409 玩家身份未初始化：** 确认允许第一方 Cookie，刷新后重新开始。开始流程先建立签名身份再创建局次，以避免丢失响应造成重复游戏。
- **403 来源无效：** 检查 `APP_ORIGIN` 与地址栏来源是否一致。不要关闭同源验证。
- **422 会话或分数异常：** 一局超过 24 小时，或者触发基础分数增长上限。当前局继续可玩，但失效后的成绩不再上传；重新开始一局。
- **未知地区：** 本地没有 Vercel 地理头，生产也可能解析失败，这是正常情况。IP 地理位置不代表具体个人或精确位置。
- **看见 Cocos 3400 sprite 警告：** 原包的 `icon3` 图集矩形超出原纹理边界，本次迁移保留原素材。已验证主游戏、碰撞和计分正常；不要通过更改物理和素材来掩盖警告。

## 当前生产配置阻塞

开发环境没有可用 Vercel/Neon 登录或数据库凭据；没有创建这两个服务的项目、没有配置生产密码、没有部署，也没有开通付费套餐。GitHub 新仓库创建与推送状态以最终交付说明为准。完成前述三步后，才会产生真实新站地址并可执行 Neon/Vercel 生产验收。
