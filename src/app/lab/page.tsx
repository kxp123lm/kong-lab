import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowUpRight,Gamepad2,FlaskConical} from 'lucide-react';
import {ProjectGrid} from '@/components/project-grid';
export const metadata:Metadata={title:'KONG LAB 孔总实验室'};
export default function Lab(){return <div className="container"><section className="lab-intro"><span className="eyebrow">KONG LAB / 孔总实验室</span><h1>给好奇心，留一间实验室<span className="yellow">。</span></h1><p>一些游戏、一些工具，以及奇奇怪怪的想法。</p><Link className="button primary" href="/"><Gamepad2 size={18}/>去玩瓜瓜物语<ArrowUpRight size={17}/></Link><FlaskConical className="lab-intro-icon" size={105}/></section><ProjectGrid/></div>;}
