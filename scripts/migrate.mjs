import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('请在 .env.local 或环境中配置 DATABASE_URL');
const source = await readFile(new URL('../db/001_init.sql',import.meta.url),'utf8');
const sql = neon(process.env.DATABASE_URL);
const statements = source.split(';').map(s=>s.trim()).filter(Boolean);
await sql.transaction(statements.map(s=>sql.query(s,[])));
console.log('KONG LAB 数据表、索引和玩家统计视图已初始化。');
