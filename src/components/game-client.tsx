'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, Play, Pause, RotateCcw, Trophy, ShieldCheck, WifiOff, CheckCircle2 } from 'lucide-react';
import { MelonArt } from './melon-art';
import { request,loadPlayer } from '@/lib/client';
import { ScoreJournal } from '@/lib/score-journal';
import type { PendingScore } from '@/lib/sync-queue';

type Run = {id:string;token:string|null;channel:string;isTest:boolean};
export function GameClient() {
  const [nickname,setNickname]=useState('');
  const [run,setRun]=useState<Run|null>(null);
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [score,setScore]=useState(0),[saved,setSaved]=useState(0),[best,setBest]=useState<number|null>(null);
  const [status,setStatus]=useState('等待开始'),[paused,setPaused]=useState(false),[ended,setEnded]=useState(false),[ready,setReady]=useState(false);
  const frame = useRef<HTMLIFrameElement>(null),current=useRef<Run|null>(null),scoreRef=useRef(0),endedRef=useRef(false),lock=useRef(false),startKey=useRef<string|null>(null);
  const queue=useRef(new ScoreJournal());
  const flush=useCallback(async()=>{
    await queue.current.flush(async (item:PendingScore)=>{
      try {
        const res=await fetch('/api/sessions/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),keepalive:true,signal:AbortSignal.timeout(8000)});
        if (res.ok) { const data=await res.json(); if(current.current?.token===item.token){setSaved(s=>Math.max(s,data.score));setStatus('最近同步成功');} return true; }
        const permanent=[400,403,422].includes(res.status);
        if(current.current?.token===item.token) setStatus(permanent?'会话失效，本局后续成绩不再上传':'网络异常，等待重试');
        return permanent?'drop':false;
      }catch{if(current.current?.token===item.token)setStatus('离线中，成绩等待重试');return false;}
    });
  },[]);
  const capture=useCallback((finished=false)=>{
    const r=current.current;if(!r?.token)return;
    try{queue.current.push({token:r.token,score:scoreRef.current,finished:finished||endedRef.current});}catch{setStatus('本地缓存不可用，正在尝试直接同步');}
  },[]);
  const post=useCallback((type:string)=>{const r=current.current;if(r)frame.current?.contentWindow?.postMessage({source:'kong-parent',type,channel:r.channel},location.origin);},[]);
  useEffect(()=>{
    try{localStorage.setItem('kong-cache-check','1');localStorage.removeItem('kong-cache-check');queue.current=new ScoreJournal(localStorage);}catch{}
    void flush();
    loadPlayer().then(p=>setBest(p.best)).catch(()=>setBest(null));
    const tick=setInterval(()=>void flush(),4000);
    const final=()=>{
      capture();
      for(const item of queue.current.items()) {
        // A queued beacon is not an acknowledgement. Keep it for retry after reload.
        try { navigator.sendBeacon('/api/sessions/sync',new Blob([JSON.stringify(item)],{type:'application/json'})); } catch {}
      }
    };
    const visibility=()=>{if(document.hidden){post('pause');setPaused(true);capture();void flush();final();}};
    const online=()=>void flush();
    window.addEventListener('pagehide',final);document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online);
    return()=>{capture();void flush();clearInterval(tick);window.removeEventListener('pagehide',final);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online);};
  },[capture,flush,post]);
  const start=useCallback(async(offline=false)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    capture(endedRef.current);void flush();
    try {
      let next:Run;
      if(offline) next={id:crypto.randomUUID(),token:null,channel:crypto.randomUUID(),isTest:false};
      else {
        // Establish the signed browser cookie before starting, so lost start responses are safe to retry.
        const profile=await loadPlayer();setBest(profile.best);
        if(!startKey.current){try{startKey.current=sessionStorage.getItem('kong-start-key');}catch{}startKey.current ||= crypto.randomUUID();}
        try{sessionStorage.setItem('kong-start-key',startKey.current);}catch{}
        const data=await request('/api/sessions/start',{startKey:startKey.current,nickname});
        next={...data,channel:crypto.randomUUID()};
      }
      startKey.current=null;try{sessionStorage.removeItem('kong-start-key');}catch{}current.current=next;scoreRef.current=0;endedRef.current=false;
      setRun(next);setScore(0);setSaved(0);setReady(false);setEnded(false);setPaused(false);
      setStatus(next.token?'零分会话已保存':'离线游玩 · 不参与排行');
    }catch(e){setError(e instanceof Error?e.message:'无法创建会话');}
    finally{lock.current=false;setBusy(false);}
  },[capture,flush,nickname]);
  useEffect(()=>{
    const listener=(e:MessageEvent)=>{
      const r=current.current,d=e.data;
      if(!r||e.origin!==location.origin||e.source!==frame.current?.contentWindow||!d||d.source!=='kong-cocos'||d.channel!==r.channel)return;
      if(!Number.isSafeInteger(d.score)||d.score<0||d.score>10000000)return;
      scoreRef.current=Math.max(scoreRef.current,d.score);setScore(scoreRef.current);
      if(d.type==='ready'){setReady(true);return;}
      if(d.type==='score'){capture();if(r.token)setStatus('成绩等待同步');}
      if(d.type==='paused'){capture();void flush();}
      if(d.type==='finished'||d.type==='restart'){
        endedRef.current=true;setEnded(true);capture(true);void flush();
      }
    };
    window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
  },[capture,flush]);
  function togglePause(){const next=!paused;setPaused(next);post(next?'pause':'resume');if(next){capture();void flush();}}
  return <div className="container game-page"><Link href="/" className="back-link"><ArrowLeft size={15}/>回到实验室</Link><div className="page-heading"><div><span className="eyebrow">EXPERIMENT 001 / 小游戏</span><h1>合成大西瓜<span className="yellow">.</span></h1><p>小小的合成，大大的上头。</p></div><Link href="/leaderboard" className="button secondary"><Trophy size={17}/>查看排行榜<ArrowUpRight size={16}/></Link></div>
  <div className="game-layout"><section className="game-shell" aria-label="游戏区域"><div className="game-toolbar"><span className="live-label"><i/>{run?'GAME IN PROGRESS':'READY TO PLAY'}</span><span>{run?.isTest?'站长测试局':run?.token?'联网模式':run?'离线模式':'原版 Cocos 玩法'}</span></div>
  {!run?<div className="game-intro"><MelonArt small/><h2>今天，能合成多大？</h2><p>移动、落下、碰撞，再合成。<br/>规则和记忆里一样，快乐也是。</p><label htmlFor="nickname">给自己取个名字 <span>可选</span></label><input id="nickname" maxLength={24} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="留空，做一位神秘玩家" autoComplete="nickname"/><p className="data-notice"><ShieldCheck size={15}/>开始后记录分数、匿名浏览器 ID、粗略地区及 IP 的 HMAC 标识，用于排行和统计。<Link href="/privacy">了解详情</Link></p>{error&&<div className="error-box" role="alert">{error}<p>可重试联网开始，或选择不上传成绩的离线游玩。</p></div>}<button className="button primary full" onClick={()=>void start()} disabled={busy}><Play size={18}/>{busy?'正在创建游戏会话…':'开始游戏'}<ArrowUpRight size={17}/></button><button className="text-button" onClick={()=>void start(true)} disabled={busy}><WifiOff size={14}/>离线玩一局（不保存成绩）</button></div>:<div className="iframe-wrap"><iframe key={run.channel} ref={frame} title="原版合成大西瓜游戏" src={`/cocos/index.html#channel=${run.channel}`} sandbox="allow-scripts allow-same-origin" allow="autoplay"/><div className="frame-loading" hidden={ready}>正在载入原版引擎与素材…</div>{paused&&!ended&&<div className="game-overlay"><Pause size={34}/><h2>休息一下</h2><button className="button primary" onClick={togglePause}><Play size={17}/>继续游戏</button></div>}{ended&&<div className="end-bar"><span>本局成绩 <strong>{score}</strong></span><button className="button primary" disabled={busy} onClick={()=>void start(!run.token)}><RotateCcw size={16}/>{busy?'正在创建…':'再来一局'}</button></div>}</div>}
  </section><aside className="game-aside"><div className="panel score-panel"><span className="eyebrow">YOUR SESSION</span><div className="score-large">{score.toLocaleString()}<span>当前分数</span></div><div className="score-details"><span>我的历史最高</span><strong>{best===null?'暂不可用':Math.max(best,run?.token&&!run.isTest?saved:0).toLocaleString()}</strong></div><div className="sync-status"><CheckCircle2 size={14}/>{status}{run?.token&&<small>服务端已确认：{saved} 分</small>}</div>{run?.isTest&&<p className="data-notice">站长测试局：不进入公共排行和普通访客统计。</p>}{run&&!ended&&<button className="button secondary full" onClick={togglePause} disabled={!ready}>{paused?<Play size={16}/>:<Pause size={16}/>} {paused?'继续游戏':'暂停游戏'}</button>}{error&&run&&<p className="error-box">{error}</p>}</div><div className="panel how-to"><span className="eyebrow">HOW TO PLAY</span><h3>只需要一点手感。</h3><ol><li><span>01</span><p>左右移动，选择落点。<small>手机上用手指拖动。</small></p></li><li><span>02</span><p>松手，让小水果落下。<small>相同的相遇，就会合成。</small></p></li><li><span>03</span><p>别让它们堆得太高。<small>试着打破自己的最高分。</small></p></li></ol></div><p className="aside-note">成绩每约 4 秒同步。退出时会尽力补传，最终以服务端已确认的分数为准。日榜与周榜按北京时间开局时间统计。</p></aside></div></div>;
}
