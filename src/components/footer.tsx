import Link from 'next/link';
export function Footer() {
  return <footer className="site-footer"><div><strong>KONG LAB<span className="yellow">.</span></strong><p>保持好奇，持续折腾。</p></div><div className="footer-links"><Link href="/privacy">隐私说明</Link><Link href="/credits">开源与致谢</Link><Link href="/admin">管理入口</Link><span>© {new Date().getFullYear()} 孔总实验室</span></div></footer>;
}
