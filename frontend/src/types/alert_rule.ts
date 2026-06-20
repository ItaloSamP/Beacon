export interface AlertRule {
  id: string;
  pipeline_id: string;
  metric: 'z_score' | 'null_pct' | 'volume_delta_pct';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleCreate {
  metric: 'z_score' | 'null_pct' | 'volume_delta_pct';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  channels?: string[];
  enabled?: boolean;
}

export interface AlertRuleUpdate {
  metric?: 'z_score' | 'null_pct' | 'volume_delta_pct';
  operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold?: number;
  channels?: string[];
  enabled?: boolean;
}
