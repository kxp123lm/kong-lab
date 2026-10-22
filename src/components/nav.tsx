'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Code2 } from 'lucide-react';
export function Nav() {
  const path = usePathname();
  return <header className="site-header"><div className="nav-inner">
    <Link className="brand" href="/lab" aria-label="KONG LAB 首页"><span className="brand-mark">K<span>↗</span></span><span>KONG<span className="brand-light"> LAB</span><small>孔总实验室</small></span></Link>
    <nav aria-label="主要导航"><Link className={path==='/lab'?'active':''} href="/lab#projects">作品集</Link><Link href="/">瓜瓜物语</Link></nav>
    <a className="github-link" href="https://github.com/kxp123lm" target="_blank" rel="noopener noreferrer"><Code2 size={17}/><span>GitHub</span><ArrowUpRight size={14}/></a>
  </div></header>;
}
