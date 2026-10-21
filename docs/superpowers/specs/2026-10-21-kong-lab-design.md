# KONG LAB 实现规格

用户已明确要求自主完成实施，不在设计阶段等待确认。采用新目录和全新远程项目，绝不推送 xiaomin。

Next.js App Router、TypeScript、Node.js 24；CSS 使用集中设计变量。原 Cocos 构建保存在 public/cocos，不重写游戏。游戏桥接从 PlayerInfo.score 的属性写入捕获真实分数；主页面先创建会话，再加载 iframe。重开由父页面创建新会话后重新加载。postMessage 校验 origin、source、随机频道。去掉广告联网与跳转，保留游戏内原有辅助玩法。

Neon HTTP 驱动，参数化 SQL。players 是第一方签名 Cookie 对应的随机 ID；sessions 开局立即插入零分，用 start_key 幂等。服务端生成会话签名令牌，绑定玩家与局次。更新用 GREATEST 保持最高分，结束标记不可逆。客户端四秒节流，持久化待重试队列，隐藏与退出用 keepalive/beacon，服务器成功响应后才清队列。

IP 仅服务器从 @vercel/functions 提取并 HMAC，不持久保存明文 IP；地区只保存国家及省区。玩家统计从游戏表聚合视图计算。排行榜按玩家选最高有效分，不要求已结束；日/周榜按北京时间开局时间过滤，周一开始。并列成绩按最早达到时间及会话 ID 确定顺序。

管理员密码仅在服务器，HttpOnly SameSite Cookie；所有变更验证同源。测试设备由管理员签署独立长期 Cookie，服务器按设备 Cookie 决定 is_test，普通请求不能自行标记。清理只允许当前浏览器已排除的测试局；另提供把当前浏览器旧局标记测试，需管理员明确操作。

分布式 PostgreSQL 限流、请求大小限制、Zod 校验、分数总量及时间增长上限。基础校验不是权威反作弊。缺少数据库显示真实离线状态，玩家可明确选择不参与排行的离线游玩，不生成虚假记录。

首页深色格纹与暖黄游戏视觉，集中作品配置；/game /leaderboard /admin /privacy /credits，响应式与减少动态效果支持。真实项目仅迁移游戏，其余标明筹备中且无虚构演示链接。

验证：真实 PostgreSQL 引擎 PGlite 执行同一迁移和查询，覆盖 A–E、乱序、重复开始、越权、时区、测试隔离；Cocos 模块真实代码执行验证分数；TypeScript、生产构建、资产校验、桌面与手机浏览器验证。Neon 和 Vercel 实测取决于真实凭据，不能以本地结果替代。
