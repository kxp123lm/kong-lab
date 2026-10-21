import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SyncQueue } from '../src/lib/sync-queue';

test('failed score sync remains retryable and older acknowledgement cannot erase newer score', async () => {
  const q = new SyncQueue();
  q.push({ token: 'one', score: 50, finished: false });
  const sent = q.items()[0];
  q.push({ token: 'one', score: 80, finished: true });
  q.ack(sent);
  assert.equal(q.items()[0].score, 80);
  await q.flush(async () => { throw new Error('offline'); });
  assert.equal(q.items().length, 1);
  await q.flush(async () => true);
  assert.equal(q.items().length, 0);
});
test('queue retains highest score and completion across unordered events and reload', () => {
  const q = new SyncQueue();
  q.push({ token: 'one', score: 150, finished: true });
  q.push({ token: 'one', score: 20, finished: false });
  q.push({ token: 'two', score: 0, finished: false });
  const restored = new SyncQueue(q.serialize());
  assert.equal(restored.items()[0].score, 150);
  assert.equal(restored.items()[0].finished, true);
  assert.equal(restored.items().length, 2);
});
test('permanent failure is removed while temporary failure remains queued', async () => {
  const q = new SyncQueue();
  q.push({ token: 'expired', score: 150, finished: false });
  q.push({ token: 'offline', score: 30, finished: false });
  await q.flush(async item => item.token === 'expired' ? 'drop' : false);
  assert.equal(q.items().length, 1);
  assert.equal(q.items()[0].token, 'offline');
});
