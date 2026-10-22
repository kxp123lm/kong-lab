import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { database, type Database } from './db';
import { startSchema, syncSchema, filterSchema, type Period } from './validation';
import { signToken, readToken, passwordMatches,normalizeIP,hashIP } from './security';
import { createSession,syncSession,leaderboard,playerProfile,adminOverview,consumeRate,markBrowserHistory,clearBrowserTests,ensurePlayer,playerCode } from './store';
import {deviceRule,setDeviceRule,listRules,saveRule,updateRule,deleteRule} from './exclusions';
import { safe,json,body,mutation,identity,visitor,attachVisitor,metadata,isAdmin,requireAdmin,setCookie,HttpError } from './http';

export function createApi(getDatabase: () => Database = database) {
  async function limit(db: Database, key: string, count: number, seconds: number) {
    if (!await consumeRate(db,key,count,seconds)) throw new HttpError(429,'操作过于频繁，请稍后再试');
  }
  return {
    player: (request: Request) => safe(async()=> {
      const id = visitor(request), db = getDatabase();
      await limit(db,'read:'+metadata(request).ipHash,240,60);
      const profile = await playerProfile(db,id);
      const player=await ensurePlayer(db,id),rule=await deviceRule(db,id);
      // Profile ID is visible to its own browser only; never present in a public board.
      return attachVisitor(json({id,playerCode:playerCode(player.number),best:profile.best_score,games:profile.games,testDevice:!!rule?.enabled}),id);
    }),
    start: (request: Request) => safe(async()=> {
      mutation(request);
      const input = startSchema.parse(await body(request));
      const id = identity(request);
      if (!id) throw new HttpError(409,'玩家身份尚未初始化，请刷新页面后重试');
      const db = getDatabase(), meta = metadata(request);
      await limit(db,'start-ip:'+meta.ipHash,100,600);
      await limit(db,'start:'+id,30,600);
      const session = await createSession(db,{id:randomUUID(),playerId:id,startKey:input.startKey,nickname:'',...meta,isTest:false});
      const remaining = Math.max(1,86400-Math.floor((Date.now()-new Date(session.started_at).getTime())/1000));
      return attachVisitor(json({id:session.id,token:signToken({kind:'game',player:id,sid:session.id},remaining),score:session.score,isTest:session.is_test,playerCode:session.playerCode,startedAt:session.started_at}),id);
    }),
    sync: (request: Request) => safe(async()=> {
      mutation(request);
      const input = syncSchema.parse(await body(request));
      const id = identity(request), claims = readToken(input.token,'game');
      if (!id || claims?.player !== id || !claims.sid || !z.uuid().safeParse(claims.sid).success) throw new HttpError(403,'游戏会话已失效，请重新开始');
      const db = getDatabase();
      await limit(db,'sync:'+id,90,60);
      return json(await syncSession(db,{id:claims.sid,playerId:id,score:input.score,finished:input.finished}));
    }),
    board: (request: Request) => safe(async()=> {
      const period = new URL(request.url).searchParams.get('period') || 'all';
      if (!['all','today','week'].includes(period)) throw new HttpError(400,'榜单类型无效');
      const db = getDatabase();
      await limit(db,'board:'+metadata(request).ipHash,120,60);
      return json(await leaderboard(db,period as Period,identity(request)));
    }),
    adminState: (request: Request) => safe(async()=> {
      const id = identity(request);
      if(!isAdmin(request))return json({authenticated:false,testDevice:false});
      const rule=id?await deviceRule(getDatabase(),id):null;
      return json({authenticated:true,testDevice:!!rule?.enabled});
    }),
    login: (request: Request) => safe(async()=> {
      mutation(request);
      const input = z.object({password:z.string().max(256)}).strict().parse(await body(request));
      const db = getDatabase();
      await limit(db,'login:'+metadata(request).ipHash,8,900);
      if (!passwordMatches(input.password)) throw new HttpError(401,'密码不正确');
      const id = visitor(request), response = attachVisitor(json({ok:true}),id);
      setCookie(response,'kl_admin',signToken({kind:'admin'},43200),43200);
      return response;
    }),
    logout: (request: Request) => safe(async()=> {
      mutation(request); const response = json({ok:true});setCookie(response,'kl_admin','',0);return response;
    }),
    adminData: (request: Request) => safe(async()=> {
      requireAdmin(request);
      const filters = filterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      return json(await adminOverview(getDatabase(),filters));
    }),
    device: (request: Request) => safe(async()=> {
      mutation(request);requireAdmin(request);
      const input = z.object({enabled:z.boolean()}).strict().parse(await body(request));
      const id = visitor(request), response = attachVisitor(json({ok:true,enabled:input.enabled}),id);
      await setDeviceRule(getDatabase(),id,input.enabled);
      setCookie(response,'kl_owner',input.enabled ? signToken({kind:'device',player:id},31536000) : '',input.enabled ? 31536000 : 0);
      return response;
    }),
    history: (request: Request) => safe(async()=> {
      mutation(request);requireAdmin(request);
      const {action} = z.object({action:z.enum(['exclude','clear','restore'])}).strict().parse(await body(request));
      const id = identity(request);
      if (!id) throw new HttpError(400,'当前浏览器没有玩家记录');
      const db = getDatabase();
      let affected:number;
      if(action==='restore'){
        affected=(await db.query('UPDATE sessions SET is_test=false WHERE player_id=$1 AND is_test RETURNING id',[id])).length;
        await setDeviceRule(db,id,false);
      }else affected=action === 'exclude' ? await markBrowserHistory(db,id) : await clearBrowserTests(db,id);
      return json({ok:true,affected});
    }),
    rules:(request:Request)=>safe(async()=>{
      requireAdmin(request);const id=identity(request),db=getDatabase();
      const p=id?await ensurePlayer(db,id):null;
      return json({rules:await listRules(db),playerCode:p?playerCode(p.number):null,networkAvailable:metadata(request).ipAvailable});
    }),
    changeRule:(request:Request)=>safe(async()=>{
      mutation(request);requireAdmin(request);const db=getDatabase();
      await limit(db,'rules:'+metadata(request).ipHash,60,60);
      const input=z.discriminatedUnion('action',[
        z.object({action:z.literal('current-network'),retroactive:z.boolean().default(false)}).strict(),
        z.object({action:z.literal('add-ip'),ip:z.string().max(64),label:z.string().trim().max(64).default('手动网络规则'),retroactive:z.boolean().default(false)}).strict(),
        z.object({action:z.literal('from-session'),sessionId:z.uuid(),scope:z.enum(['player','ip']),retroactive:z.boolean().default(true)}).strict(),
        z.object({action:z.literal('update'),id:z.uuid(),enabled:z.boolean().optional(),retroactive:z.boolean().optional()}).strict(),
        z.object({action:z.literal('delete'),id:z.uuid()}).strict(),
      ]).parse(await body(request));
      if(input.action==='update'){await updateRule(db,input.id,input);return json({ok:true});}
      if(input.action==='delete'){await deleteRule(db,input.id);return json({ok:true});}
      if(input.action==='current-network'){
        const meta=metadata(request);if(!meta.ipAvailable)throw new HttpError(409,'当前请求无法获得公网 IP，请在正式站点操作或手动添加规则');
        await saveRule(db,{kind:'ip',value:meta.ipHash,label:'当前公网网络',retroactive:input.retroactive});
      }else if(input.action==='add-ip'){
        let ip:string;try{ip=normalizeIP(input.ip);}catch{throw new HttpError(400,'请输入有效的完整 IPv4 或 IPv6 地址');}
        await saveRule(db,{kind:'ip',value:hashIP(ip),label:input.label||'手动网络规则',retroactive:input.retroactive});
      }else{
        const s=(await db.query('SELECT player_id,ip_hash FROM sessions WHERE id=$1',[input.sessionId]))[0];
        if(!s)throw new HttpError(404,'游戏记录不存在');
        await saveRule(db,{kind:input.scope,value:input.scope==='player'?s.player_id:s.ip_hash,label:input.scope==='player'?'从游戏记录排除玩家':'从游戏记录排除网络',retroactive:input.retroactive});
      }
      return json({ok:true});
    }),
  };
}
export const api = createApi();
