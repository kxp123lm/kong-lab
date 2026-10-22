import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createSession, syncSession, leaderboard, adminOverview, markBrowserHistory, clearBrowserTests, playerProfile, consumeRate } from '../src/lib/store';

const pg = new PGlite();
const db = { query: async (sql: string, params: unknown[] = []) => (await pg.query(sql, params)).rows as Record<string, any>[] };
const player = randomUUID();
const other = randomUUID();
function input(playerId = player, isTest = false) {
  return { id: randomUUID(), playerId, startKey: randomUUID(), nickname: '测试玩家', country: 'CN', region: 'SD', ipHash: 'a'.repeat(64), isTest };
}
before(async () => { for(const file of ['001_init.sql','002_anonymous_exclusions.sql'])await pg.exec(await readFile(new URL('../db/'+file, import.meta.url), 'utf8')); });
beforeEach(async () => { await pg.exec('TRUNCATE sessions, players, rate_limits CASCADE'); });
after(async () => { await pg.close(); });

test('A: reading empty boards and player profile creates no game record', async () => {
  assert.equal((await leaderboard(db, 'all', player)).entries.length, 0);
  assert.equal((await playerProfile(db, player)).games, 0);
  assert.equal((await db.query('SELECT * FROM sessions')).length, 0);
});
test('B: start persists zero immediately and repeated request is idempotent', async () => {
  const start = input();
  const first = await createSession(db, start);
  const retry = await createSession(db, { ...start, id: randomUUID() });
  assert.equal(first.id, retry.id);
  assert.equal((await db.query('SELECT score FROM sessions'))[0].score, 0);
  assert.equal((await playerProfile(db, player)).games, 1);
});
test('C/D: unfinished score participates; out of order delivery never reduces it', async () => {
  const session = await createSession(db, input());
  await syncSession(db, { id: session.id, playerId: player, score: 120, finished: false });
  await syncSession(db, { id: session.id, playerId: player, score: 20, finished: true });
  const board = await leaderboard(db, 'all', player);
  assert.equal(board.entries[0].score, 120);
  assert.equal(board.me.rank, 1);
  assert.equal((await db.query('SELECT finished FROM sessions'))[0].finished, true);
  await syncSession(db, { id: session.id, playerId: player, score: 180, finished: false });
  assert.equal((await leaderboard(db, 'all', player)).me.score, 180);
  assert.equal((await db.query('SELECT finished FROM sessions'))[0].finished, true);
});
test('each player occupies one ranking row', async () => {
  for (const score of [10, 50, 30]) {
    const s = await createSession(db, input());
    await syncSession(db, { id: s.id, playerId: player, score, finished: false });
  }
  const s = await createSession(db, input(other));
  await syncSession(db, { id: s.id, playerId: other, score: 80, finished: false });
  const b = await leaderboard(db, 'all', player);
  assert.equal(b.entries.length, 2);
  assert.equal(b.me.score, 50);
  assert.equal(b.me.rank, 2);
  assert.match(b.entries[0].playerCode,/^IP-\d+$/);
  assert.equal('ip_hash' in b.entries[0], false);
  assert.equal('player_id' in b.entries[0], false);
});
test('current rank is returned even outside the public TOP 100', async () => {
  await createSession(db,input());
  const fixtures=Array.from({length:101},()=>({p:randomUUID(),s:randomUUID(),k:randomUUID()}));
  await db.query(`INSERT INTO players(id) SELECT x.p::uuid FROM json_to_recordset($1::json) AS x(p text,s text,k text)`,[JSON.stringify(fixtures)]);
  await db.query(`INSERT INTO sessions(id,player_id,start_key,nickname,score,ip_hash)
    SELECT x.s::uuid,x.p::uuid,x.k::uuid,'其他玩家',100,$2 FROM json_to_recordset($1::json) AS x(p text,s text,k text)`,[JSON.stringify(fixtures),'b'.repeat(64)]);
  const board=await leaderboard(db,'all',player);
  assert.equal(board.entries.length,100);
  assert.equal(board.total,102);
  assert.equal(board.me.rank,102);
});
test('E: ten admin test games do not change ordinary visitor stats or boards', async () => {
  await createSession(db, input(other));
  const before = await adminOverview(db, {});
  for (let n = 0; n < 10; n++) {
    const s = await createSession(db, input(player, true));
    await syncSession(db, { id: s.id, playerId: player, score: 200, finished: true });
  }
  const after = await adminOverview(db, {});
  assert.deepEqual(after.stats, before.stats);
  assert.equal((await leaderboard(db, 'all', player)).entries.length, 1);
  assert.equal((await leaderboard(db, 'all', player)).me.rank, null);
  assert.equal((await playerProfile(db, player)).games, 0);
});
test('retroactive exclusion and cleanup only affect current browser, restore creates normal records', async () => {
  await createSession(db, input());
  await createSession(db, input(other));
  assert.equal(await markBrowserHistory(db, player), 1);
  assert.equal((await adminOverview(db, {})).stats.games, 1);
  assert.equal(await clearBrowserTests(db, player), 1);
  assert.equal((await db.query('SELECT * FROM sessions'))[0].player_id, other);
  await createSession(db, input(player, false));
  assert.equal((await adminOverview(db, {})).stats.games, 2);
});
test('session ownership and abnormal scores are enforced in database queries', async () => {
  const s = await createSession(db, input());
  await assert.rejects(syncSession(db, { id: s.id, playerId: other, score: 20, finished: false }));
  await assert.rejects(syncSession(db, { id: s.id, playerId: player, score: 9999999, finished: false }));
  assert.equal((await db.query('SELECT score FROM sessions'))[0].score, 0);
});
test('Beijing day and Monday week boundaries are honored', async () => {
  const now = new Date('2026-10-21T00:30:00+08:00');
  const old = await createSession(db, input(other));
  await db.query("UPDATE sessions SET started_at = '2026-10-20T15:59:59Z' WHERE id = $1", [old.id]);
  const today = await createSession(db, input());
  await db.query("UPDATE sessions SET started_at = '2026-10-20T16:00:00Z' WHERE id = $1", [today.id]);
  assert.equal((await leaderboard(db, 'today', player, now)).entries.length, 1);
  assert.equal((await leaderboard(db, 'week', player, now)).entries.length, 2);
});
test('distributed rate limit rejects excess calls and expires buckets', async () => {
  assert.equal(await consumeRate(db, 'test', 2, 60, 1000), true);
  assert.equal(await consumeRate(db, 'test', 2, 60, 1000), true);
  assert.equal(await consumeRate(db, 'test', 2, 60, 1000), false);
  assert.equal(await consumeRate(db, 'test', 2, 60, 61000), true);
});
