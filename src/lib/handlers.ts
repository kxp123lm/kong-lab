import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { database, type Database } from './db';
import { startSchema, syncSchema, filterSchema, type Period } from './validation';
import { signToken, readToken, passwordMatches } from './security';
import { createSession,syncSession,leaderboard,playerProfile,adminOverview,consumeRate,markBrowserHistory,clearBrowserTests } from './store';
import { safe,json,body,mutation,identity,visitor,attachVisitor,metadata,isAdmin,requireAdmin,isTestDevice,setCookie,HttpError } from './http';

export function createApi(getDatabase: () => Database = database) {
  async function limit(db: Database, key: string, count: number, seconds: number) {
    if (!await consumeRate(db,key,count,seconds)) throw new HttpError(429,'操作过于频繁，请稍后再试');
  }
  return {
    player: (request: Request) => safe(async()=> {
      const id = visitor(request), db = getDatabase();
      await limit(db,'read:'+metadata(request).ipHash,240,60);
      const profile = await playerProfile(db,id);
      // Profile ID is visible to its own browser only; never present in a public board.
      return attachVisitor(json({id,best:profile.best_score,games:profile.games,testDevice:isTestDevice(request,id)}),id);
    }),
    start: (request: Request) => safe(async()=> {
      mutation(request);
      const input = startSchema.parse(await body(request));
      const id = identity(request);
      if (!id) throw new HttpError(409,'玩家身份尚未初始化，请刷新页面后重试');
      const db = getDatabase(), meta = metadata(request);
      await limit(db,'start-ip:'+meta.ipHash,100,600);
      await limit(db,'start:'+id,30,600);
      const session = await createSession(db,{id:randomUUID(),playerId:id,startKey:input.startKey,nickname:input.nickname || '匿名玩家·'+id.slice(0,4),...meta,isTest:isTestDevice(request,id)});
      const remaining = Math.max(1,86400-Math.floor((Date.now()-new Date(session.started_at).getTime())/1000));
      return attachVisitor(json({id:session.id,token:signToken({kind:'game',player:id,sid:session.id},remaining),score:session.score,isTest:session.is_test,startedAt:session.started_at}),id);
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
      return json({authenticated:isAdmin(request),testDevice:id ? isTestDevice(request,id) : false});
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
      setCookie(response,'kl_owner',input.enabled ? signToken({kind:'device',player:id},31536000) : '',input.enabled ? 31536000 : 0);
      return response;
    }),
    history: (request: Request) => safe(async()=> {
      mutation(request);requireAdmin(request);
      const {action} = z.object({action:z.enum(['exclude','clear'])}).strict().parse(await body(request));
      const id = identity(request);
      if (!id) throw new HttpError(400,'当前浏览器没有玩家记录');
      const db = getDatabase();
      const affected = action === 'exclude' ? await markBrowserHistory(db,id) : await clearBrowserTests(db,id);
      return json({ok:true,affected});
    }),
  };
}
export const api = createApi();
