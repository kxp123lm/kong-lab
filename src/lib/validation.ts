import { z } from 'zod';
export const startSchema = z.object({
  startKey: z.uuid(),
  nickname: z.string().trim().max(24).regex(/^[\p{L}\p{N}\p{Zs}_·.\-]*$/u, '昵称只支持文字、数字、空格和 _·.-').default(''),
}).strict();
export const syncSchema = z.object({
  token: z.string().min(20).max(2048),
  score: z.number().int().min(0).max(10000000),
  finished: z.boolean().default(false),
}).strict();
const date = z.string().refine(s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s, '日期无效');
export const filterSchema = z.object({
  from: date.optional(), to: date.optional(),
  region: z.string().trim().max(40).optional(),
  min: z.coerce.number().int().min(0).max(10000000).optional(),
  max: z.coerce.number().int().min(0).max(10000000).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict().refine(v => !v.from || !v.to || v.from <= v.to, '起始日期不能晚于结束日期')
  .refine(v => v.min === undefined || v.max === undefined || v.min <= v.max, '最低分不能高于最高分');
export type Filters = Partial<z.infer<typeof filterSchema>>;
export type Period = 'all' | 'today' | 'week';
