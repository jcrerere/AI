import { z } from 'zod';

const RankSchema = z.enum(['Lv.1', 'Lv.2', 'Lv.3', 'Lv.4', 'Lv.5']);
const StatusEntrySchema = z.object({
  name: z.string().min(1),
  desc: z.string().min(1),
  type: z.enum(['buff', 'debuff', 'neutral']),
  source: z.string().min(1),
});

export const MvuStatDataSchema = z.object({
  world: z.object({
    current_time: z.string(),
    current_location: z.string(),
    recent_events: z.record(z.any()).default({}),
  }),
  player: z.object({
    gender: z.enum(['male', 'female']),
    psionic_rank: RankSchema,
    credits: z.number().int().min(0),
    reputation: z.number().min(0).max(120),
    six_dim: z.object({
      力量: z.number().min(1).max(99),
      敏捷: z.number().min(1).max(99),
      体质: z.number().min(1).max(99),
      感知: z.number().min(1).max(99),
      意志: z.number().min(1).max(99),
      魅力: z.number().min(1).max(99),
      free_points: z.number().int().min(0),
      cap: z.number().int().min(1).max(999),
    }),
    core_status: z.array(StatusEntrySchema).default([]),
    lingshu_parts: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        level: RankSchema,
        lingshu_strength: z.number().min(0),
        status: z.array(StatusEntrySchema).default([]),
      }),
    ),
  }),
});

export type MvuStatData = z.infer<typeof MvuStatDataSchema>;
