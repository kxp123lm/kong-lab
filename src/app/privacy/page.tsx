import type {Metadata} from 'next';
export const metadata:Metadata={title:'隐私说明'};
export default function Privacy(){return <article className="container prose-page"><span className="eyebrow">PRIVACY</span><h1>隐私说明</h1><p>孔总实验室用于展示个人作品，浏览本网站不会创建游戏会话或游戏成绩。</p><p>点击《瓜瓜物语》会前往独立的游戏网站。游戏记录、匿名玩家编号、排行榜与管理后台均由游戏网站提供，详情请阅读<a href="https://xiaomin.vercel.app/privacy">瓜瓜物语隐私说明</a>。</p><p>本站使用 Vercel 托管，服务商可能按其政策处理基础设施访问日志。本站没有加入第三方广告或分析追踪脚本。</p><p className="muted">更新日期：2026 年 10 月 22 日。</p></article>;}
