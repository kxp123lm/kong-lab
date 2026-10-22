import { readFile,readdir } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('请在 .env.local 或环境中配置 DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);
for(const file of (await readdir(new URL('../db/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){
 const source=await readFile(new URL('../db/'+file,import.meta.url),'utf8');
 const statements=source.split(';').map(s=>s.trim()).filter(Boolean);
 await sql.transaction(statements.map(s=>sql.query(s,[])));
 console.log('已执行迁移：'+file);
}
console.log('KONG LAB 数据表、索引和玩家统计视图已初始化。');
