# 原游戏审计与最小改造

- 原仓库：https://github.com/kxp123lm/xiaomin ，分支 `master`。
- 迁移基准提交：`390ea9a043883b4444975c16fba3f8c972a677cd`。
- 原站：https://xiaomin.vercel.app 。仅做只读访问，未修改部署、域名或原仓库。
- 许可证：木兰宽松许可证第 2 版，完整原文在根 `LICENSE` 与 `public/cocos/LICENSE`。
- 原 README 保存在 `UPSTREAM-README.md`，没有把原有版权或来源归给 KONG LAB。

## 实际目录

原仓库根含 `index.html`、`main.js`、`src/project.js`、`src/settings.js`、`cocos2d-js-min.js`、`style-mobile.css`、`singleColor.png`、`ads.js`、LICENSE、README；`res` 中 44 个文件，约 1.8 MB。引擎约 3.3 MB，业务包约 259 KB。

`settings.js` 的平台为 `web-mobile`，实际启动场景为 `db://assets/Scene/MainGameScene.fire`。这不是 React 游戏，也不是普通 HTML 文本计分。

## 真实计分路径

打包模块 `fruitData.onBeginContact` 在相同水果碰撞时，把 `fruitNumber + 1` 加到 `PlayerInfo.default.score`，并调用 `MainGameUi.Instance.SetScoreTween`。最大级别合成分支还会加 100。其他原有得分分支（如 `GameFunction`）同样写这个共享值。

`MainGameUi.UpdateScoreLabel` 逐帧插值，显示的是动画中的 `currentScore`，不适合上传。`GameManager.lateUpdate` 复制共享分数，游戏结束时调用 `GameManager.GameOver`。

新 `kong-bridge.js` 在引擎加载业务包之后、场景启动之前，用属性描述符监听 **PlayerInfo.score 的真实写入**。不读截图、不读 DOM 数字、不使用动画插值，也不产生模拟成绩。只发安全频道消息，网络同步放在父页面四秒一次执行。

## 改动范围

1. `main.js` 仅增加一次 `window.KongBridge.install(__require)`。
2. `src/project.js` 的广告服务启动请求改为本地 `cc.director.loadScene(e)`，移除第三方推荐图层加载，禁用六处外链跳转表达式。碰撞、计分、物理和资源配置保留。
3. 新 `index.html` 保留 Canvas、Cocos 启动依赖、原样式与加载占位，移除旧广告/重复设置脚本。没有加载 `ads.js` 或任何第三方广告 SDK。
4. 桥接在场景启动后隐藏失败页的第三方广告/更多游戏按钮；`MainGameUi.adsButton` 实际是原版的水果替换辅助功能，因此保留以免改变玩法。
5. `GameManager.GameOver` 附加结束事件；重开交给父页面，在新的零分会话落库后重新加载同一原版场景，避免重复启动局次。
6. 前后台切换时保持显式暂停，覆盖 Cocos 默认 `EVENT_SHOW` 自动恢复行为，避免暂停遮罩下仍在运行物理。
7. iframe 通信双方验证相同 origin、精确窗口 source、随机局次 channel；iframe 不获得数据库连接或管理员密码。分数接口还需玩家 Cookie 和服务端签名游戏令牌。

## 完整性

`docs/game-assets.json` 记录迁移来源、提交、53 个交付资源的 SHA-256（包括新入口和桥接）。`pnpm verify:assets` 验证这些文件。所有 `res` 文件、Cocos 引擎、设置与原样式完整保留，未覆盖原仓库中的文件。

本次只读验证原仓库本地 `git status --porcelain` 为空，远程 `master` 提交与基准相同。旧站在浏览器里仍加载原游戏画布。

原游戏有 `icon3` sprite 3400 警告，来自原纹理与矩形边界；本次没有替换或修补美术包。实际游戏可运行，真实合成得到的 1 分已通过浏览器 → API → 临时 PostgreSQL → 公共排行链路验证。
