'use client';
import Link from 'next/link';
import {Play} from 'lucide-react';
import {OriginalFruit} from './original-fruit';
export function GameHome(){
 return <section className="guagua-home"><div className="guagua-home-content"><div className="fruit-garden"><span className="garden-spark spark-a">✦</span><OriginalFruit className="garden-melon melon-a"/><OriginalFruit className="garden-melon melon-b"/><OriginalFruit className="garden-melon melon-c"/><OriginalFruit kind="orange" className="garden-orange"/><OriginalFruit kind="lemon" className="garden-lemon"/><OriginalFruit kind="grape" className="garden-grape"/><span className="garden-spark spark-b">✧</span><i className="garden-shadow"/></div><div className="guagua-title"><span>GUAGUA STORY</span><h1>瓜瓜物语</h1><i/></div><Link className="guagua-start" href="/game" prefetch={false}><Play size={21} fill="currentColor"/>开始游戏</Link></div><footer className="guagua-home-footer"><Link href="/privacy">隐私说明</Link><Link href="/lab">建设中…… <span>↗</span></Link></footer></section>;
}
