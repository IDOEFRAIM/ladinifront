// Contrat exposé par /api/admin/recurring/*, miroir de /internal/recurring-admin/* côté backend
// (voir backend/src/ladini/services/recurring_admin/api.py).

export interface NeedRow {
  id: string;
  short_id: string;
  buyer: { name: string | null; phone: string | null };
  product: string;
  quantity: number | null;
  unit: string;
  frequency: string;
  weekly_days: number[];
  status: string;
  starts_at: string | null;
  created_at: string | null;
  next_occurrence: string | null;
  region: string | null;
  occurrence_count: number;
  sourcing_state: string | null;
  last_activity: string | null;
}

export interface NeedsPayload {
  items: NeedRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface AllocationRow {
  id: string;
  producer: string | null;
  producer_id: string;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  converted: boolean;
}

export interface OccurrenceRow {
  id: string;
  date: string | null;
  status: string;
  requested_quantity: number | null;
  unit: string;
  quantity_matched: number | null;
  quantity_confirmed: number | null;
  quantity_delivered: number | null;
  version: number;
  skipped: boolean;
  quantity_overridden: boolean;
  order_group_id: string | null;
  expires_at: string | null;
  allocations: AllocationRow[];
}

export interface OrderRow {
  id: string;
  occurrence_id: string | null;
  occurrence_date: string | null;
  total_amount: number | null;
  status: string;
  payment_status: string;
  delivery_status: string;
  expected_fulfillment_date: string | null;
  cancellation_role: string | null;
  created_at: string | null;
}

export interface Diagnostic {
  kind: string;
  occurrence_id?: string;
  allocation_id?: string;
  order_id?: string;
  producer?: string | null;
  by?: string | null;
  date?: string | null;
  at?: string | null;
}

export interface NeedDetail {
  overview: {
    id: string;
    buyer: { name: string | null; phone: string | null };
    product: string;
    quantity: number | null;
    unit: string;
    frequency: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    paused_until: string | null;
    max_price_per_unit: number | null;
    created_at: string | null;
    updated_at: string | null;
    region: string | null;
  };
  schedule: {
    recurrence_type: string;
    weekly_days: number[];
    excluded_weekdays: number[];
    effective_start_date: string | null;
    first_delivery_date: string | null;
    next_calculated_occurrence: string | null;
    next_materialized_occurrence: string | null;
    lead_time_policy: { current_minimum_start_lead_days: number; applied_at_creation: number | null; note: string };
  };
  occurrences: OccurrenceRow[];
  orders: OrderRow[];
  mutations: { available: boolean; reason: string; need_version: number | null };
  operational_state: { sourcing_state: string | null; diagnostics: Diagnostic[] };
}

export interface RecurringSettings {
  minimum_start_lead_days: number;
  source: 'DEFAULT' | 'DATABASE';
  version: number;
  updated_at: string | null;
  updated_by_id: string | null;
  bounds: { min: number; max: number };
  default: number;
  label: string;
  description: string;
}

export interface SettingsPayload {
  recurring: RecurringSettings;
}
