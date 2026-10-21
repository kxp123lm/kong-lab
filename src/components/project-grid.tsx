'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Terminal, Plus, Code2 } from 'lucide-react';
import { projects } from '@/data/projects';
export function ProjectGrid() {
  const [category,setCategory] = useState('全部作品');
  return <section id="projects" className="projects-section"><div className="section-top"><div><span className="eyebrow">THE COLLECTION / 作品集</span><h2>把想法变成<span className="yellow">可以玩的东西。</span></h2></div><span className="section-note">小步尝试，持续生长 <ArrowUpRight size={16}/></span></div>
    <div className="filters" aria-label="作品分类">{['全部作品','小游戏','AI 工具','实验项目'].map(c=><button className={category===c?'selected':''} onClick={()=>setCategory(c)} key={c}>{c}{c==='全部作品'&&<span>03</span>}</button>)}</div>
    <div className="project-grid">{projects.filter(p=>category==='全部作品'||p.category===category).map(p=><article className="project-card" key={p.id}>
      <div className={`project-cover ${p.theme}`}>{p.cover ? <img src={p.cover} alt="原版合成大西瓜游戏水果插画" loading="lazy"/> : p.theme==='terminal' ? <div className="code-art"><Terminal size={26}/><code><span>const</span> idea = <b>"what if..."</b><br/><span>await</span> makeItReal(idea)<em>▌</em></code></div> : <div className="experiment-art"><div/><div/><Plus size={32}/></div>}<span className={`status-tag ${p.href?'live':''}`}><i/>{p.status}</span><span className="cover-number">EXPERIMENT / {String(projects.indexOf(p)+1).padStart(3,'0')}</span></div>
      <div className="project-content"><div className="project-meta"><span>{p.category}</span><span>{p.date || 'COMING SOON'}</span></div><h3>{p.name}{p.href&&<ArrowUpRight size={22}/>}</h3><p>{p.description}</p><div className="project-bottom">{p.href?<Link href={p.href}>打开实验 <ArrowRight size={16}/></Link>:<span className="muted">灵感正在孵化中</span>}{p.github&&<a aria-label={`${p.name}原始仓库`} title="原始游戏仓库" href={p.github} target="_blank" rel="noopener noreferrer"><Code2 size={18}/></a>}</div></div>
    </article>)}</div>
  </section>;
}
