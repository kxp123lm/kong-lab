import { neon } from '@neondatabase/serverless';

export type Row = Record<string, any>;
export interface Database { query(sql: string, params?: unknown[]): Promise<Row[]> }
let connection: Database | undefined;
export function database(): Database {
  if (connection) return connection;
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) throw new Error('DATABASE_UNAVAILABLE');
  const sql = neon(url, { fetchOptions: { signal: undefined } });
  connection = { query: async (text, params = []) => await sql.query(text, params, { fetchOptions: { signal: AbortSignal.timeout(10000) } }) as Row[] };
  return connection;
}
