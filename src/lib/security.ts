import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

type Claims = { kind: string; player?: string; sid?: string; exp?: number };
function secret(name: string) {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error('SECURITY_UNCONFIGURED');
  return value;
}
function mac(data: string, key: string) { return createHmac('sha256', key).update(data).digest('base64url'); }
export function signToken(claims: Claims, seconds: number, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(now / 1000) + seconds })).toString('base64url');
  const key = secret('SESSION_SECRET') + (claims.kind === 'admin' ? process.env.ADMIN_PASSWORD : '');
  return `${body}.${mac(body, key)}`;
}
export function readToken(token: string | undefined, kind: string, now = Date.now()): Claims | null {
  try {
    if (!token || token.length > 2048) return null;
    const [body, signature, extra] = token.split('.');
    if (extra || !body || !signature) return null;
    const key = secret('SESSION_SECRET') + (kind === 'admin' ? process.env.ADMIN_PASSWORD : '');
    const a = Buffer.from(signature), b = Buffer.from(mac(body, key));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const value = JSON.parse(Buffer.from(body, 'base64url').toString());
    return value.kind === kind && Number.isSafeInteger(value.exp) && value.exp > now / 1000 ? value : null;
  } catch { return null; }
}
export function normalizeIP(input:string){
  const value=input.trim();const version=isIP(value);
  if(!version)throw new Error('IP 地址格式无效');
  if(version===4)return value;
  const canonical=new URL(`http://[${value}]/`).hostname.slice(1,-1).toLowerCase();
  const mapped=/^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(canonical);
  if(mapped){const a=parseInt(mapped[1],16),b=parseInt(mapped[2],16);return `${a>>8}.${a&255}.${b>>8}.${b&255}`;}
  return canonical;
}
export function hashIP(ip: string) {
  const canonical=isIP(ip.trim()) ? normalizeIP(ip) : ip;
  return createHmac('sha256', secret('IP_HMAC_SECRET')).update(canonical).digest('hex');
}
export function passwordMatches(value: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || configured.length < 12) throw new Error('SECURITY_UNCONFIGURED');
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(value), digest(configured));
}
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.APP_ORIGIN || new URL(request.url).origin;
  return origin === allowed && request.headers.get('sec-fetch-site') !== 'cross-site';
}
