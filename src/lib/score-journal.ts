import type { PendingScore } from './sync-queue';
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'|'key'|'length'>;
type Entry=PendingScore&{at:number};
const prefix='kong-score-v2:',acks='kong-ack-v2:';
export function memoryStorage():StorageLike {
  const map=new Map<string,string>();
  return {getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);},key:i=>[...map.keys()][i]??null,get length(){return map.size;}};
}
// Append/update one payload per game; acknowledgements are separate watermarks.
// Readers never replace a writer's pending payload with an old in-memory snapshot.
export class ScoreJournal {
  private busy=false;
  constructor(private storage:StorageLike=memoryStorage()){}
  private read(key:string):any {try{return JSON.parse(this.storage.getItem(key)||'null');}catch{return null;}}
  push(v:PendingScore){
    const old=this.read(prefix+v.token);
    this.storage.setItem(prefix+v.token,JSON.stringify({...v,score:Math.max(old?.score||0,v.score),finished:!!old?.finished||v.finished,at:old?.at||Date.now()}));
  }
  items():PendingScore[]{
    const values:Entry[]=[];
    for(let i=0;i<this.storage.length;i++){
      const key=this.storage.key(i);if(!key?.startsWith(prefix))continue;
      const v=this.read(key);
      if(!v||typeof v.token!=='string'||v.token.length>2048||!Number.isSafeInteger(v.score)||v.score<0||v.score>10000000||typeof v.finished!=='boolean')continue;
      if(!Number.isFinite(v.at)||Date.now()-v.at>=86400000){this.storage.removeItem(key);this.storage.removeItem(acks+v.token);i--;continue;}
      const ack=this.read(acks+v.token);
      if(ack?.terminal || ack && ack.score>=v.score && (!v.finished||ack.finished))continue;
      values.push(v);
    }
    return values.sort((a,b)=>b.at-a.at).slice(0,32).map(({token,score,finished})=>({token,score,finished}));
  }
  ack(v:PendingScore,terminal=false){
    const old=this.read(acks+v.token);
    this.storage.setItem(acks+v.token,JSON.stringify({score:Math.max(old?.score||0,v.score),finished:!!old?.finished||v.finished,terminal:!!old?.terminal||terminal}));
  }
  async flush(send:(v:PendingScore)=>Promise<boolean|'drop'>){
    if(this.busy)return;this.busy=true;
    try{for(const v of this.items()){try{const result=await send(v);if(result===true||result==='drop')this.ack(v,result==='drop');}catch{/* retain for another attempt */}}}finally{this.busy=false;}
  }
}
