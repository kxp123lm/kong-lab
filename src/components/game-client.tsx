'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Home,Play,Pause,RotateCcw,Trophy,WifiOff} from 'lucide-react';
import {request,loadPlayer} from '@/lib/client';
import {ScoreJournal} from '@/lib/score-journal';
import type {PendingScore} from '@/lib/sync-queue';
import {GameLeaderboard} from './game-leaderboard';

type Run={id:string;token:string|null;channel:string;isTest:boolean;playerCode?:string};
export function GameClient(){
 const [run,setRun]=useState<Run|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [score,setScore]=useState(0),[saved,setSaved]=useState(0),[best,setBest]=useState<number|null>(null),[code,setCode]=useState('连接中');
 const [status,setStatus]=useState('正在创建游戏…'),[paused,setPaused]=useState(false),[ended,setEnded]=useState(false),[ready,setReady]=useState(false),[ranking,setRanking]=useState(false);
 const frame=useRef<HTMLIFrameElement>(null),current=useRef<Run|null>(null),scoreRef=useRef(0),endedRef=useRef(false),lock=useRef(false),startKey=useRef<string|null>(null),autoStarted=useRef(false);
 const pausedRef=useRef(false),rankingRef=useRef(false),restorePaused=useRef(false),queue=useRef(new ScoreJournal());
 const flush=useCallback(async()=>{
  await queue.current.flush(async(item:PendingScore)=>{
   try{
    const response=await fetch('/api/sessions/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),keepalive:true,signal:AbortSignal.timeout(8000)});
    if(response.ok){const data=await response.json();if(current.current?.token===item.token){setSaved(s=>Math.max(s,data.score));setStatus('已保存');}return true;}
    const permanent=[400,403,422].includes(response.status);
    if(current.current?.token===item.token)setStatus(permanent?'本局上传已失效':'等待网络重试');return permanent?'drop':false;
   }catch{if(current.current?.token===item.token)setStatus('等待网络重试');return false;}
  });
 },[]);
 const capture=useCallback((finished=false)=>{
  const r=current.current;if(!r?.token)return;
  try{queue.current.push({token:r.token,score:scoreRef.current,finished:finished||endedRef.current});}catch{setStatus('本地缓存不可用');}
 },[]);
 const post=useCallback((type:string)=>{const r=current.current;if(r)frame.current?.contentWindow?.postMessage({source:'kong-parent',type,channel:r.channel},location.origin);},[]);
 useEffect(()=>{
  try{localStorage.setItem('kong-cache-check','1');localStorage.removeItem('kong-cache-check');queue.current=new ScoreJournal(localStorage);}catch{}
  void flush();const timer=setInterval(()=>void flush(),4000);
  const final=()=>{capture();for(const item of queue.current.items())try{navigator.sendBeacon('/api/sessions/sync',new Blob([JSON.stringify(item)],{type:'application/json'}));}catch{}};
  const visibility=()=>{if(document.hidden){post('pause');pausedRef.current=true;setPaused(true);if(rankingRef.current)restorePaused.current=true;capture();void flush();final();}};
  const online=()=>void flush();
  window.addEventListener('pagehide',final);document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online);
  return()=>{final();void flush();clearInterval(timer);window.removeEventListener('pagehide',final);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online);};
 },[capture,flush,post]);
 const start=useCallback(async(offline=false)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');capture(endedRef.current);void flush();
  try{
   let next:Run;
   if(offline){next={id:crypto.randomUUID(),token:null,channel:crypto.randomUUID(),isTest:false};setCode('离线玩家');}
   else{
    const profile=await loadPlayer();setBest(profile.best);setCode(profile.playerCode);
    if(!startKey.current){try{startKey.current=sessionStorage.getItem('kong-start-key');}catch{}startKey.current ||= crypto.randomUUID();}
    try{sessionStorage.setItem('kong-start-key',startKey.current);}catch{}
    const data=await request('/api/sessions/start',{startKey:startKey.current});next={...data,channel:crypto.randomUUID()};
   }
   startKey.current=null;try{sessionStorage.removeItem('kong-start-key');}catch{}
   current.current=next;scoreRef.current=0;endedRef.current=false;pausedRef.current=false;rankingRef.current=false;
   setRun(next);setScore(0);setSaved(0);setReady(false);setEnded(false);setPaused(false);setRanking(false);setStatus(next.token?'已保存':'离线游玩，不上传成绩');
  }catch(e){setError(e instanceof Error?e.message:'联网服务暂不可用');}
  finally{lock.current=false;setBusy(false);}
 },[capture,flush]);
 useEffect(()=>{
  const listener=(e:MessageEvent)=>{
   const r=current.current,d=e.data;
   if(!r||e.origin!==location.origin||e.source!==frame.current?.contentWindow||!d||d.source!=='kong-cocos'||d.channel!==r.channel)return;
   if(!Number.isSafeInteger(d.score)||d.score<0||d.score>10000000)return;
   scoreRef.current=Math.max(scoreRef.current,d.score);setScore(scoreRef.current);
   if(d.type==='ready'){setReady(true);if(pausedRef.current||rankingRef.current)post('pause');return;}
   if(d.type==='score'){capture();if(r.token)setStatus('等待同步');}
   if(d.type==='paused'){capture();void flush();}
   if(d.type==='finished'||d.type==='restart'){endedRef.current=true;setEnded(true);capture(true);void flush();if(d.type==='restart')void start(!r.token);}
  };
  window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener);
 },[capture,flush,post,start]);
 useEffect(()=>{if(!autoStarted.current){autoStarted.current=true;void start();}},[start]);
 function togglePause(){const next=!pausedRef.current;pausedRef.current=next;setPaused(next);post(next?'pause':'resume');if(next){capture();void flush();}}
 function openRanking(){restorePaused.current=pausedRef.current;rankingRef.current=true;setRanking(true);post('pause');capture();void flush();}
 const closeRanking=useCallback(()=>{rankingRef.current=false;setRanking(false);if(!restorePaused.current&&!document.hidden&&!endedRef.current){pausedRef.current=false;setPaused(false);post('resume');}},[post]);
 return <section className="guagua-play" aria-label="瓜瓜物语游戏"><div className="play-stage">
  {run&&<iframe key={run.channel} ref={frame} title="瓜瓜物语游戏画布" src={`/cocos/index.html#channel=${run.channel}`} sandbox="allow-scripts allow-same-origin" allow="autoplay"/>}
  {(!run||!ready)&&!error&&<div className="play-loading" role="status"><div className="loading-melon">🍉</div><p>{run?'正在载入游戏…':'正在连接游戏…'}</p></div>}
  <div className="floating-controls"><Link className="game-icon-button" href="/" aria-label="返回游戏首页"><Home size={17}/></Link><button className="game-icon-button" disabled={!ready||ended} onClick={togglePause} aria-label={paused?'继续游戏':'暂停游戏'}>{paused?<Play size={17}/>:<Pause size={17}/>}</button><button className="game-icon-button" disabled={!ready} onClick={openRanking} aria-label="打开排行榜"><Trophy size={18}/></button></div>
  {paused&&!ranking&&!ended&&ready&&<div className="pause-screen"><Pause size={35}/><h2>休息一下</h2><button className="guagua-start" onClick={togglePause}><Play size={18}/>继续游戏</button></div>}
  {ended&&<div className="guagua-result"><span>本局 <strong>{score}</strong> 分</span><button onClick={()=>void start(!run?.token)} disabled={busy}><RotateCcw size={17}/>{busy?'准备中…':'再来一局'}</button></div>}
  {error&&<div className="play-error" role="alert"><WifiOff size={30}/><h2>暂时没有连上</h2><p>{error}</p><button className="guagua-start" disabled={busy} onClick={()=>void start()}>重新连接</button><button className="offline-choice" disabled={busy} onClick={()=>void start(true)}>先离线玩一局（成绩不上传）</button><Link href="/">返回首页</Link></div>}
  {run&&ready&&<span className={`game-sync-dot ${status==='已保存'?'saved':''}`} title={`${code} · ${status} · 服务端确认 ${saved} 分`} aria-label={`${code}，${status}，已保存 ${saved} 分`}>{run.isTest?'测试局':run.token?'●':'离线'}</span>}
  {ranking&&<GameLeaderboard playerCode={code} score={score} best={run?.isTest?best:Math.max(best||0,saved)} onClose={closeRanking}/>}
 </div></section>;
}
