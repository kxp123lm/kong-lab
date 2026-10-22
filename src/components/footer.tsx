import Link from 'next/link';
export function Footer(){return <footer className="site-footer"><span>© {new Date().getFullYear()} KONG LAB · 孔总实验室</span><div><Link href="/privacy">隐私说明</Link><Link href="/credits">开源与致谢</Link><a href="https://github.com/kxp123lm/kong-lab" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></footer>;}
