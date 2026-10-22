import { randomUUID } from 'node:crypto';
import { geolocation, ipAddress } from '@vercel/functions';
import { readToken, signToken, hashIP, isSameOrigin } from './security';
import { StoreError } from './store';
import { ZodError } from 'zod';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function cookie(request: Request, name: string) {
  const part = (request.headers.get('cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));
  try { return part ? decodeURIComponent(part.slice(name.length+1)) : undefined; } catch { return undefined; }
}
export function setCookie(response: Response, name: string, value: string, seconds: number) {
  response.headers.append('set-cookie',`${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}
export function json(value: unknown, status = 200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function safe(action: () => Promise<Response>) {
  try { return await action(); }
  catch (e) {
    if (e instanceof ZodError) return json({error:e.issues[0]?.message || '请求参数无效'},400);
    if (e instanceof HttpError || e instanceof StoreError) return json({error:e.message},e.status);
    const incident = randomUUID().slice(0,8);
    // Never log connection URLs, passwords, IPs or token bodies.
    console.error('KONG LAB service failure',incident,e instanceof Error ? e.name : 'Unknown');
    return json({error:'联网服务暂不可用，请稍后重试。成绩尚未确认保存。',incident},503);
  }
}
export function mutation(request: Request) { if (!isSameOrigin(request)) throw new HttpError(403,'请求来源无效，请从本站操作'); }
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 4096) throw new HttpError(413,'请求过大');
  // Bounded stream, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400,'请求内容为空');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const {value,done} = await reader.read(); if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new HttpError(413,'请求过大'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400,'JSON 格式无效'); }
}
const uuid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
export function identity(request: Request) {
  const claims = readToken(cookie(request,'kl_player'),'player');
  return claims?.player && uuid.test(claims.player) ? claims.player : null;
}
export function visitor(request: Request) { return identity(request) || randomUUID(); }
export function attachVisitor(response: Response, player: string) { setCookie(response,'kl_player',signToken({kind:'player',player},31536000),31536000); return response; }
export function isAdmin(request: Request) { return !!readToken(cookie(request,'kl_admin'),'admin'); }
export function requireAdmin(request: Request) { if (!isAdmin(request)) throw new HttpError(401,'请先登录管理员'); }
export function isTestDevice(request: Request, player: string) {
  return readToken(cookie(request,'kl_owner'),'device')?.player === player;
}
export function metadata(request: Request) {
  const deployed = process.env.VERCEL === '1';
  const geo = deployed ? geolocation(request) : {};
  const ip=deployed?ipAddress(request):undefined;
  return {country:geo.country?.slice(0,8) || null, region:geo.countryRegion?.slice(0,40) || null, ipHash:hashIP(ip || 'unknown'),ipAvailable:!!ip};
}
