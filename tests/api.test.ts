import { test,before,after,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createApi } from '../src/lib/handlers';
import { signToken } from '../src/lib/security';
process.env.SESSION_SECRET='test-only-api-secret-'.repeat(3);
process.env.IP_HMAC_SECRET='test-only-api-ip-'.repeat(3);
process.env.ADMIN_PASSWORD='test-only-api-password';
const pg=new PGlite();
const api=createApi(()=>({query:async(sql,params=[]) => (await pg.query(sql,params)).rows as any[]}));
const player=randomUUID();
const playerCookie='kl_player='+signToken({kind:'player',player},3600);
const adminCookie='kl_admin='+signToken({kind:'admin'},3600);
function req(path:string,data?:unknown,cookies=playerCookie,origin='https://lab.test'){
 return new Request('https://lab.test'+path,{method:data===undefined?'GET':'POST',headers:{cookie:cookies,origin,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
}
before(async()=>{for(const file of ['001_init.sql','002_anonymous_exclusions.sql'])await pg.exec(await readFile(new URL('../db/'+file,import.meta.url),'utf8'));});
beforeEach(async()=>{await pg.exec('TRUNCATE sessions,players,rate_limits,exclusion_rules CASCADE');});
after(async()=>{await pg.close();});
test('API read-only player/board requests do not create sessions; starts require an initialized identity',async()=>{
 assert.equal((await api.player(req('/api/player'))).status,200);
 assert.equal((await api.board(req('/api/leaderboard'))).status,200);
 assert.equal((await pg.query('SELECT * FROM sessions')).rows.length,0);
 const response=await api.start(req('/api/sessions/start',{startKey:randomUUID(),nickname:''},''));
 assert.equal(response.status,409);
});
test('API rejects cross-site start, browser-supplied admin flag and another browser score update',async()=>{
 const key=randomUUID();
 assert.equal((await api.start(req('/api/sessions/start',{startKey:key,nickname:''},playerCookie,'https://evil.test'))).status,403);
 assert.equal((await api.start(req('/api/sessions/start',{startKey:key,nickname:'',isAdmin:true}))).status,400);
 const start=await (await api.start(req('/api/sessions/start',{startKey:key,nickname:'玩家'}))).json();
 assert.equal(start.score,0);assert.equal(start.isTest,false);
 const other='kl_player='+signToken({kind:'player',player:randomUUID()},3600);
 assert.equal((await api.sync(req('/api/sessions/sync',{token:start.token,score:15,finished:false},other))).status,403);
 assert.equal((await api.sync(req('/api/sessions/sync',{token:start.token,score:15,finished:false}))).status,200);
});
test('only authenticated admin can mark device; signed device survives logout and cannot be forged',async()=>{
 assert.equal((await api.device(req('/api/admin/device',{enabled:true}))).status,401);
 const marker=await api.device(req('/api/admin/device',{enabled:true},playerCookie+'; '+adminCookie));
 assert.equal(marker.status,200);
 const owner=marker.headers.getSetCookie().find(c=>c.startsWith('kl_owner='))!.split(';')[0];
 const start=await (await api.start(req('/api/sessions/start',{startKey:randomUUID(),nickname:''},playerCookie+'; '+owner))).json();
 assert.equal(start.isTest,true);
 const unrelated='kl_player='+signToken({kind:'player',player:randomUUID()},3600);
 const normal=await (await api.start(req('/api/sessions/start',{startKey:randomUUID(),nickname:''},unrelated+'; kl_owner=true'))).json();
 assert.equal(normal.isTest,false);
 assert.equal((await api.adminData(req('/api/admin/data'))).status,401);
});
test('login uses HttpOnly cookie, rejects bad password, and error responses do not expose database secrets',async()=>{
 assert.equal((await api.login(req('/api/admin/login',{password:'incorrect'}))).status,401);
 const ok=await api.login(req('/api/admin/login',{password:'test-only-api-password'}));
 assert.equal(ok.status,200);
 assert.ok(ok.headers.getSetCookie().find(c=>c.startsWith('kl_admin='))?.includes('HttpOnly'));
 const broken=createApi(()=>{throw new Error('postgresql://TOP_SECRET');});
 const failure=await broken.board(req('/api/leaderboard'));
 assert.equal(failure.status,503);
 assert.equal((await failure.text()).includes('TOP_SECRET'),false);
});
test('exclusion APIs require admin and never return raw IP or its full hash',async()=>{
 const data={action:'add-ip',ip:'192.0.2.9',label:'家中网络',retroactive:true};
 assert.equal((await api.changeRule(req('/api/admin/exclusions',data))).status,401);
 assert.equal((await api.changeRule(req('/api/admin/exclusions',{...data,ip:'not-an-ip'},playerCookie+'; '+adminCookie))).status,400);
 assert.equal((await api.changeRule(req('/api/admin/exclusions',data,playerCookie+'; '+adminCookie))).status,200);
 const response=await api.rules(req('/api/admin/exclusions',undefined,playerCookie+'; '+adminCookie));
 const text=await response.text();assert.equal(text.includes('192.0.2.9'),false);
 const rules=JSON.parse(text).rules;assert.equal('value' in rules[0],false);
 const stored=await pg.query('SELECT value FROM exclusion_rules');
 assert.equal((stored.rows[0] as any).value.length,64);
});
test('device rule never grants admin privilege and record exclusion can be reversed without deleting score',async()=>{
 const start=await (await api.start(req('/api/sessions/start',{startKey:randomUUID()}))).json();
 const cookies=playerCookie+'; '+adminCookie;
 assert.equal((await api.changeRule(req('/api/admin/exclusions',{action:'from-session',sessionId:start.id,scope:'player',retroactive:true},cookies))).status,200);
 assert.equal((await (await api.board(req('/api/leaderboard'))).json()).total,0);
 const rule=(await (await api.rules(req('/api/admin/exclusions',undefined,cookies))).json()).rules[0];
 assert.equal((await api.adminData(req('/api/admin/data'))).status,401);
 await api.changeRule(req('/api/admin/exclusions',{action:'update',id:rule.id,enabled:false},cookies));
 assert.equal((await (await api.board(req('/api/leaderboard'))).json()).total,1);
});

test('deleting a device rule restores new games even when the old device cookie remains',async()=>{
 const cookies=playerCookie+'; '+adminCookie;
 const enabled=await api.device(req('/api/admin/device',{enabled:true},cookies));
 const owner=enabled.headers.getSetCookie().find(c=>c.startsWith('kl_owner='))!.split(';')[0];
 const marked=playerCookie+'; '+owner;
 const first=await (await api.start(req('/api/sessions/start',{startKey:randomUUID()},marked))).json();
 assert.equal(first.isTest,true);
 const rule=(await (await api.rules(req('/api/admin/exclusions',undefined,cookies))).json()).rules[0];
 await api.changeRule(req('/api/admin/exclusions',{action:'delete',id:rule.id},cookies));
 const next=await (await api.start(req('/api/sessions/start',{startKey:randomUUID()},marked))).json();
 assert.equal(next.isTest,false);
 assert.equal((await (await api.player(req('/api/player',undefined,marked))).json()).testDevice,false);
 assert.equal((await (await api.board(req('/api/leaderboard'))).json()).total,1);
});
