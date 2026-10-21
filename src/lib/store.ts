import type { Database, Row } from './db';
import type { Filters, Period } from './validation';

export class StoreError extends Error { constructor(public status: number, message: string) { super(message); } }
export interface StartInput {
  id: string; playerId: string; startKey: string; nickname: string;
  country: string | null; region: string | null; ipHash: string; isTest: boolean;
}
export async function createSession(db: Database, s: StartInput) {
  const rows = await db.query(`WITH p AS (
    INSERT INTO players(id) VALUES($1) ON CONFLICT(id) DO UPDATE SET id=excluded.id RETURNING id
  ) INSERT INTO sessions(id,player_id,start_key,nickname,country,region,ip_hash,is_test)
    SELECT $2,p.id,$3,$4,$5,$6,$7,$8 FROM p
    ON CONFLICT(player_id,start_key) DO UPDATE SET start_key=excluded.start_key
    RETURNING id,score,started_at,is_test`, [s.playerId,s.id,s.startKey,s.nickname,s.country,s.region,s.ipHash,s.isTest]);
  return rows[0];
}
export async function syncSession(db: Database, s: { id: string; playerId: string; score: number; finished: boolean }) {
  if (!Number.isSafeInteger(s.score) || s.score < 0 || s.score > 10000000) throw new StoreError(400, '分数无效');
  const rows = await db.query(`UPDATE sessions SET
    score=GREATEST(score,$3::int),
    score_at=CASE WHEN $3::int>score THEN now() ELSE score_at END,
    last_sync_at=now(), finished=(finished OR $4::boolean),
    finished_at=CASE WHEN $4::boolean THEN COALESCE(finished_at,now()) ELSE finished_at END
    WHERE id=$1 AND player_id=$2
      AND started_at >= now()-interval '24 hours'
      AND $3::int <= 300 + GREATEST(0,EXTRACT(EPOCH FROM (now()-started_at)))*150
    RETURNING score,finished,last_sync_at`, [s.id,s.playerId,s.score,s.finished]);
  if (!rows.length) throw new StoreError(422, '会话无效、已过期，或分数增长异常');
  return rows[0];
}
export function periodStart(period: Period, now = new Date()): string | null {
  if (period === 'all') return null;
  const china = new Date(now.getTime() + 8 * 3600000);
  const day = new Date(Date.UTC(china.getUTCFullYear(),china.getUTCMonth(),china.getUTCDate()));
  if (period === 'week') day.setUTCDate(day.getUTCDate() - (day.getUTCDay()+6)%7);
  return new Date(day.getTime()-8*3600000).toISOString();
}
export async function leaderboard(db: Database, period: Period, playerId: string | null, now = new Date()) {
  const rows = await db.query(`WITH best AS (
    SELECT DISTINCT ON(player_id) id,player_id,nickname,score,score_at,started_at FROM sessions
    WHERE NOT is_test AND ($1::timestamptz IS NULL OR started_at >= $1::timestamptz)
    ORDER BY player_id,score DESC,score_at ASC,id ASC
  ), ranked AS (
    SELECT *,row_number() OVER(ORDER BY score DESC,score_at ASC,id ASC)::int AS rank FROM best
  ) SELECT
    COALESCE((SELECT json_agg(t ORDER BY rank) FROM (
      SELECT rank,nickname,score,score_at AS date FROM ranked ORDER BY rank LIMIT 100
    ) t),'[]'::json) AS entries,
    (SELECT json_build_object('rank',rank,'score',score) FROM ranked WHERE player_id=$2::uuid) AS me,
    (SELECT count(*)::int FROM ranked) AS total`, [periodStart(period,now),playerId]);
  return { ...rows[0], me: rows[0].me || { rank: null, score: 0 } } as { entries: Row[]; me: {rank: number | null; score: number}; total: number };
}
export async function playerProfile(db: Database, playerId: string) {
  const rows = await db.query('SELECT * FROM player_profiles WHERE player_id=$1',[playerId]);
  return rows[0] || { games: 0, best_score: 0, last_score: 0, first_game_at: null, last_game_at: null };
}
export async function adminOverview(db: Database, f: Filters) {
  const stats = await db.query(`SELECT
    (SELECT count(*)::int FROM sessions WHERE NOT is_test) AS games,
    (SELECT count(*)::int FROM player_profiles) AS players,
    (SELECT count(*)::int FROM sessions WHERE NOT is_test AND started_at >= $1) AS today_games,
    (SELECT count(*)::int FROM player_profiles WHERE first_game_at >= $1) AS today_players,
    (SELECT COALESCE(max(score),0)::int FROM sessions WHERE NOT is_test) AS best`, [periodStart('today')]);
  const params: unknown[] = [f.from ? `${f.from}T00:00:00+08:00` : null, f.to ? `${f.to}T00:00:00+08:00` : null, f.region || null, f.min ?? null, f.max ?? null];
  const where = `WHERE ($1::timestamptz IS NULL OR started_at >= $1::timestamptz)
    AND ($2::timestamptz IS NULL OR started_at < $2::timestamptz + interval '1 day')
    AND ($3::text IS NULL OR country ILIKE '%' || $3 || '%' OR region ILIKE '%' || $3 || '%')
    AND ($4::int IS NULL OR score >= $4::int) AND ($5::int IS NULL OR score <= $5::int)`;
  const records = await db.query(`SELECT id,started_at,player_id,nickname,country,region,score,finished,last_sync_at,is_test,
    count(*) OVER()::int AS total FROM sessions ${where} ORDER BY started_at DESC,id DESC LIMIT 50 OFFSET $6`, [...params,((f.page || 1)-1)*50]);
  return { stats: stats[0], records, total: records[0]?.total || 0 };
}
export async function markBrowserHistory(db: Database, playerId: string) {
  return (await db.query('UPDATE sessions SET is_test=true WHERE player_id=$1 AND NOT is_test RETURNING id',[playerId])).length;
}
export async function clearBrowserTests(db: Database, playerId: string) {
  return (await db.query('DELETE FROM sessions WHERE player_id=$1 AND is_test RETURNING id',[playerId])).length;
}
export async function consumeRate(db: Database, key: string, limit: number, seconds: number, now = Date.now()) {
  const time = new Date(now).toISOString();
  const expiry = new Date(now+seconds*1000).toISOString();
  const rows = await db.query(`INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,$3)
    ON CONFLICT(key) DO UPDATE SET
    hits=CASE WHEN rate_limits.expires_at <= $2::timestamptz THEN 1 ELSE rate_limits.hits+1 END,
    expires_at=CASE WHEN rate_limits.expires_at <= $2::timestamptz THEN $3::timestamptz ELSE rate_limits.expires_at END
    RETURNING hits`,[key,time,expiry]);
  return rows[0].hits <= limit;
}
