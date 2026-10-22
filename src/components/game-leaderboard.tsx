'use client';
import {useEffect,useRef,useState} from 'react';
import {X,Trophy,RefreshCw} from 'lucide-react';
import {request,loadPlayer,dateText} from '@/lib/client';
type Board={entries:{rank:number;playerCode:string;score:number;date:string}[];me:{rank:number|null;score:number};total:number};
export function GameLeaderboard({playerCode,score,best,onClose}:{playerCode:string;score:number;best:number|null;onClose:()=>void}){
 const [period,setPeriod]=useState('all'),[data,setData]=useState<Board|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0),[highest,setHighest]=useState(best);
 const dialog=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const targets=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]');if(!targets?.length)return;
    const first=targets[0],last=targets[targets.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
 },[onClose]);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setData(null);
  void Promise.all([request<Board>('/api/leaderboard?period='+period),loadPlayer()]).then(([board,p])=>{if(active){setData(board);setHighest(p.best);}}).catch(e=>{if(active)setError(e.message||'排行榜暂时无法连接');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[period,refresh]);
 return <div className="game-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={dialog} className="game-ranking" role="dialog" aria-modal="true" aria-labelledby="ranking-title"><header><div><Trophy size={23}/><h2 id="ranking-title">瓜瓜排行榜</h2></div><button className="game-icon-button" onClick={onClose} aria-label="关闭排行榜"><X size={21}/></button></header><div className="ranking-player"><span>我的编号<strong>{playerCode}</strong></span><span>当前分数<strong>{score}</strong></span><span>历史最高<strong>{highest===null?'—':Math.max(highest,best||0)}</strong></span></div><div className="ranking-tabs">{[['all','历史总榜'],['today','今日榜'],['week','本周榜']].map(([id,label])=><button className={period===id?'active':''} onClick={()=>setPeriod(id)} key={id}>{label}</button>)}<button aria-label="刷新榜单" disabled={loading} onClick={()=>setRefresh(refresh+1)}><RefreshCw size={15}/></button></div><div className="ranking-scroll">{loading?<div className="ranking-empty">正在读取成绩…</div>:error?<div className="ranking-empty" role="alert"><p>{error}</p><button onClick={()=>setRefresh(refresh+1)}>重新连接</button></div>:!data?.entries.length?<div className="ranking-empty"><Trophy size={35}/><p>还没有记录，等你留下第一分。</p></div>:<table><thead><tr><th>排名</th><th>玩家编号</th><th>最高分</th><th>时间</th></tr></thead><tbody>{data.entries.map(r=><tr key={r.rank} className={r.playerCode===playerCode?'mine':''}><td>{r.rank<=3?['🥇','🥈','🥉'][r.rank-1]:r.rank}</td><td>{r.playerCode}{r.playerCode===playerCode&&<small>我</small>}</td><td>{r.score}</td><td>{dateText(r.date)}</td></tr>)}</tbody></table>}</div><footer><span>我的排名：{data?.me.rank?'#'+data.me.rank:'暂无排名'}</span><span>查看期间游戏已暂停</span></footer></div></div>;
}
