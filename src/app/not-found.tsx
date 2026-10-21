import Link from 'next/link';
export default function NotFound(){return <div className="container empty-state"><span className="eyebrow">ERROR / 404</span><h1>这间实验室还没开门。</h1><p>页面可能搬家了，回首页看看其他实验吧。</p><Link href="/" className="button primary">回到实验室</Link></div>;}
