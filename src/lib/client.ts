import { createPlayerInitializer } from './player-initializer';
export async function request<T = any>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url,{
    method:data === undefined ? 'GET' : 'POST',
    headers:data === undefined ? undefined : {'Content-Type':'application/json'},
    body:data === undefined ? undefined : JSON.stringify(data),
    cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '请求失败，请稍后重试');
  return result;
}
const initPlayer=createPlayerInitializer(()=>request('/api/player'));
export function loadPlayer():Promise<any>{
  // A shared origin lock also serializes first-use initialization across tabs.
  return typeof navigator!=='undefined' && navigator.locks
    ? navigator.locks.request('kong-lab-player-init',()=>initPlayer())
    : initPlayer();
}
export function dateText(value: string) {
  return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
}
