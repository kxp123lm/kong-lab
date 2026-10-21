export interface PendingScore { token: string; score: number; finished: boolean }
type Queued = PendingScore & { at: number };
export class SyncQueue {
  private pending = new Map<string, Queued>();
  private busy = false;
  constructor(serialized?: string | null) {
    if (!serialized) return;
    try {
      const values: Queued[] = JSON.parse(serialized);
      if (!Array.isArray(values)) return;
      for (const v of values.slice(-32)) if (typeof v.token === 'string' && v.token.length <= 2048 && Number.isSafeInteger(v.score) && v.score >= 0 && v.score <= 10000000 && typeof v.finished === 'boolean' && Date.now()-v.at < 86400000) this.pending.set(v.token,v);
    } catch { /* damaged local cache does not interrupt the game */ }
  }
  push(value: PendingScore) {
    const old = this.pending.get(value.token);
    this.pending.set(value.token,{ token:value.token, score:Math.max(old?.score || 0,value.score), finished:!!old?.finished || value.finished, at:old?.at || Date.now() });
    if (this.pending.size > 32) this.pending.delete(this.pending.keys().next().value!);
  }
  items(): PendingScore[] { return [...this.pending.values()].map(({token,score,finished})=>({token,score,finished})); }
  ack(value: PendingScore) {
    const current = this.pending.get(value.token);
    if (current && current.score <= value.score && (!current.finished || value.finished)) this.pending.delete(value.token);
  }
  serialize() { return JSON.stringify([...this.pending.values()]); }
  async flush(send: (value: PendingScore) => Promise<boolean | 'drop'>, changed?: () => void) {
    if (this.busy) return;
    this.busy = true;
    try { for (const item of this.items()) {
      try { const result = await send(item); if (result === true || result === 'drop') { this.ack(item); changed?.(); } }
      catch { /* retain until acknowledged or expired */ }
    } } finally { this.busy = false; }
  }
}
