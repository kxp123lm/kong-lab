import {randomUUID} from 'node:crypto';
import type {Database} from './db';
import {StoreError} from './store';
export async function saveRule(db:Database,r:{kind:'player'|'ip';value:string;label:string;retroactive:boolean}){
 const rows=await db.query(`INSERT INTO exclusion_rules(id,kind,value,label,retroactive) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(kind,value) DO UPDATE SET enabled=true,label=excluded.label,retroactive=excluded.retroactive RETURNING id`,[randomUUID(),r.kind,r.value,r.label,r.retroactive]);
 return rows[0];
}
export async function updateRule(db:Database,id:string,r:{enabled?:boolean;retroactive?:boolean}){
 const rows=await db.query(`UPDATE exclusion_rules SET enabled=COALESCE($2::boolean,enabled),retroactive=COALESCE($3::boolean,retroactive) WHERE id=$1 RETURNING id`,[id,r.enabled??null,r.retroactive??null]);
 if(!rows.length)throw new StoreError(404,'排除规则不存在');
 return rows[0];
}
export async function deleteRule(db:Database,id:string){await db.query('DELETE FROM exclusion_rules WHERE id=$1',[id]);}
export async function listRules(db:Database){
 return db.query(`SELECT r.id,r.kind,r.label,r.enabled,r.retroactive,r.created_at,
 (SELECT count(*)::int FROM sessions s WHERE ((r.kind='player' AND r.value=s.player_id::text) OR(r.kind='ip' AND r.value=s.ip_hash)) AND(r.retroactive OR s.started_at>=r.created_at)) AS matches
 FROM exclusion_rules r ORDER BY r.created_at DESC`);
}
export async function deviceRule(db:Database,playerId:string){return (await db.query("SELECT id,enabled FROM exclusion_rules WHERE kind='player' AND value=$1",[playerId]))[0]||null;}
export async function setDeviceRule(db:Database,playerId:string,enabled:boolean){
 if(enabled)return saveRule(db,{kind:'player',value:playerId,label:'当前测试设备',retroactive:false});
 await db.query("UPDATE exclusion_rules SET enabled=false WHERE kind='player' AND value=$1",[playerId]);
}
