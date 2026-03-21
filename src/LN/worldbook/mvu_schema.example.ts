import { z } from 'zod';

const RankSchema = z.enum(['Lv.1', 'Lv.2', 'Lv.3', 'Lv.4', 'Lv.5']);
const GaugeSchema = z.object({
  current: z.number(),
  max: z.number().positive(),
});
const AffixSchema = z.object({
  name: z.string().min(1),
  desc: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['buff', 'debuff', 'neutral']).default('neutral'),
  source: z.string().min(1),
  stacks: z.number().int().min(1).optional(),
});

export const MvuStatDataSchema = z.object({
  world: z.object({
    current_time: z.string(),
    current_period: z.enum(['深夜', '夜晚', '清晨', '白天', '黄昏']),
    current_location: z.string(),
    current_cell_id: z.string(),
    current_anchor_id: z.string(),
    todo_digest: z.string(),
    todo_unread_count: z.number().int().min(0),
    todo_due_digest: z.string(),
    todo_overdue_digest: z.string(),
    economy_digest: z.string(),
    local_map_digest: z.string(),
    task_layer_digest: z.string(),
    current_district: z.string(),
    current_site_type: z.string(),
    current_site_id: z.string(),
    current_site_label: z.string(),
    current_faction: z.string(),
    recent_events: z.record(z.string(), z.any()).default({}),
    exchange_rules: z.object({
      same_level_theoretical_rate: z.number(),
      cross_level_loss_rate: z.number(),
      region_modifier: z.record(z.string(), z.any()),
    }),
  }),
  player: z.object({
    name: z.string().min(1),
    display_name: z.string().min(1).optional(),
    gender: z.enum(['male', 'female']),
    region: z.string(),
    faction: z.string(),
    occupation: z.string().optional(),
    identity: z.object({
      citizen_id: z.string().min(1),
      neural_protocol: z.enum(['none', 'beta']),
    }),
    citizen_id: z.string().min(1),
    neural_protocol: z.enum(['none', 'beta']),
    psionic_rank: RankSchema,
    reputation: z.number().min(0).max(120),
    credits: z.number().int().min(0),
    residence: z.object({
      current_residence_id: z.string(),
      current_residence_label: z.string(),
      unlocked_residence_ids: z.array(z.string()).default([]),
    }),
    core_status: z.object({
      hp: GaugeSchema,
      mp: GaugeSchema,
      sanity: GaugeSchema,
      reputation: GaugeSchema,
    }),
    status: z.object({
      hp: GaugeSchema,
      mp: GaugeSchema,
      sanity: GaugeSchema,
      reputation: GaugeSchema,
    }),
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
    psionic: z.object({
      rank: RankSchema,
      density_level: z.number().int().min(1).max(5),
      energy_value: GaugeSchema,
      energy_value_max: z.number().positive(),
      conversion_rate: z.object({
        current: z.number().min(0),
      }).passthrough(),
      recovery_rate: z.object({
        current: z.number().min(0),
      }).passthrough(),
      base_daily_recovery: z.object({
        male: z.number().min(0),
        female: z.number().min(0),
      }),
    }),
    assets: z.object({
      credits: z.number().int().min(0),
      lcoin: z.object({
        lv1: z.number().int().min(0),
        lv2: z.number().int().min(0),
        lv3: z.number().int().min(0),
        lv4: z.number().int().min(0),
        lv5: z.number().int().min(0),
        total: z.number().int().min(0),
      }),
    }),
    chip: z.object({
      beta_equipped: z.boolean(),
      assigned_district: z.string(),
      assigned_x_station_id: z.string(),
      assigned_x_station_label: z.string(),
      assigned_hx_dorm_id: z.string(),
      assigned_hx_dorm_label: z.string(),
      tax_officer_id: z.string(),
      tax_officer_name: z.string(),
      tax_office_address: z.string().optional(),
      tax_rate: z.number(),
      tax_amount: z.number().min(0).optional(),
      tax_arrears: z.number().min(0).optional(),
      switch_cooldown_round: z.number().int().min(0),
    }),
    flags: z.object({
      opening_locked: z.boolean(),
      narration_owner: z.string(),
      allow_auto_opening: z.boolean(),
    }),
    status_tags: z.array(z.string()).default([]),
    core_affixes: z.array(AffixSchema).default([]),
    lingshu_parts: z.array(
      z.object({
        id: z.string().optional(),
        key: z.string(),
        name: z.string(),
        rank: RankSchema,
        level: z.number().int().min(1).max(5),
        lingshu_strength: z.number().min(0),
        strengthProgress: z.number().min(0).max(100).optional(),
        description: z.string().optional(),
        status: z.array(AffixSchema).default([]),
      }),
    ).default([]),
    soul_ledger: z.record(RankSchema, z.number().int().min(0)).default({}),
  }),
});

export type MvuStatData = z.infer<typeof MvuStatDataSchema>;
