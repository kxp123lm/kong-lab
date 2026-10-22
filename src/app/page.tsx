import {ArrowDownRight,FlaskConical} from 'lucide-react';
import {ProjectGrid} from '@/components/project-grid';
export default function Home(){return <div className="container"><section className="lab-hero"><div className="hero-kicker"><span className="status-dot"/>个人作品与小实验</div><h1>KONG <span>LAB</span></h1><div className="hero-description"><div><h2>孔总实验室</h2><p>一些游戏、一些工具，以及奇奇怪怪的想法。</p></div><FlaskConical size={64} strokeWidth={1}/></div><a className="collection-link" href="#projects">看看作品 <ArrowDownRight size={18}/></a></section><ProjectGrid/></div>;}
