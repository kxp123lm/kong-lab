'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { Trophy, RefreshCw, ArrowUpRight, WifiOff, Flag } from 'lucide-react';
import { request,dateText,loadPlayer } from '@/lib/client';
type Board={entries:{rank:number;nickname:string;score:number;date:string}[];me:{rank:number|null;score:number};total:number};
export function Leaderboard(){
  const generation=useRef(0);
  const [period,setPeriod]=useState('all'),[data,setData]=useState<Board|null>(null),[best,setBest]=useState<number|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
  const load=useCallback(async()=>{
    const ticket=++generation.current;
    setBusy(true);setError('');
    try { const profile=await loadPlayer();const board=await request('/api/leaderboard?period='+period);if(ticket===generation.current){setBest(profile.best);setData(board);} }
    catch(e){if(ticket===generation.current){setData(null);setError(e instanceof Error?e.message:'排行榜暂不可用');}}
    finally{if(ticket===generation.current)setBusy(false);}
  },[period]);
  useEffect(()=>{void load();const timer=setInterval(()=>{if(!document.hidden)void load();},20000);return()=>{generation.current++;clearInterval(timer);};},[load]);
  return <div className="container board-page"><div className="page-heading"><div><span className="eyebrow">THE HIGH SCORES / 排行榜</span><h1>高手，在这里碰头<span className="yellow">.</span></h1><p>一局还没结束，精彩已经上榜。</p></div><Link href="/game" className="button primary">我也来一局<ArrowUpRight size={18}/></Link></div><div className="board-summary"><div><Trophy size={21}/><span>我的历史最高<strong>{best===null?'—':best.toLocaleString()}</strong></span></div><div><Flag size={21}/><span>当前榜单排名<strong>{data?.me.rank?`# ${data.me.rank}`:'暂无排名'}</strong></span></div><div><span>本榜匿名玩家<strong>{data?.total ?? '—'}<small>位</small></strong></span></div></div>
  <section className="panel leaderboard-panel"><div className="board-controls"><div className="filters">{[['all','历史总榜'],['today','今日榜'],['week','本周榜']].map(([id,name])=><button className={period===id?'selected':''} key={id} onClick={()=>{setPeriod(id);setData(null);}}>{name}</button>)}</div><button aria-label="刷新排行榜" className="icon-button" disabled={busy} onClick={()=>void load()}><RefreshCw size={17} className={busy?'spin':''}/></button></div><div className="board-caption"><span>TOP 100 · 每位玩家仅保留最高分</span><span>北京时间 · 周一开始</span></div>
  {error?<div className="empty-state" role="alert"><WifiOff size={38}/><h2>排行榜暂时离线</h2><p>{error}</p><button className="button secondary" onClick={()=>void load()}>重新连接</button></div>:!data?<div className="empty-state" role="status">正在读取真实游戏记录…</div>:data.entries.length===0?<div className="empty-state"><Trophy size={42}/><h2>第一个名字，会是你吗？</h2><p>这个榜单还没有游戏记录。开始一局，留下你的成绩。</p><Link href="/game" className="button primary">去玩一局<ArrowUpRight size={17}/></Link></div>:<div className="table-scroll"><table><thead><tr><th>排名</th><th>玩家</th><th className="align-right">最高分</th><th className="align-right">达到时间</th></tr></thead><tbody>{data.entries.map(row=><tr key={row.rank}><td><span className={`rank rank-${row.rank}`}>{String(row.rank).padStart(2,'0')}</span></td><td><span className="player-avatar">{row.nickname.slice(0,1)}</span>{row.nickname}</td><td className="align-right board-score">{row.score.toLocaleString()}</td><td className="align-right muted">{dateText(row.date)}</td></tr>)}</tbody></table></div>}</section><p className="board-explainer">按每个匿名浏览器的最高有效分排名，无需等到游戏结束。日榜与周榜只统计对应时间内开始的游戏；同分按最早达到的时间排序。更换浏览器或清除 Cookie 会成为新的匿名玩家。榜单每 20 秒自动刷新。</p></div>;
}
