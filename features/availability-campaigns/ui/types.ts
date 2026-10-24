// ── Contrat exposé par /api/admin/availability-campaigns/* (miroir de /internal/availability-campaigns/* — backend
//    services/availability_campaigns/{api,campaign_service}.py). Les téléphones ne sont JAMAIS renvoyés en clair (4 derniers chiffres seulement).

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type Frequency = 'ONCE' | 'WEEKLY' | 'CUSTOM_DAYS';
export type AudienceKind = 'ALL' | 'KNOWN' | 'NEW';

export interface OfferFilter {
  products?: string[];
  categories?: string[];
  regions?: string[];
  max_offers?: number;
  max_age_hours?: number;
  require_price?: boolean;
}

export interface Audience {
  audience_kind?: AudienceKind;
  regions?: string[];
  include_unknown_region?: boolean;
}

export interface OfferSnapshot {
  product_id: string;
  producer_id?: string;
  name: string;
  unit: string;
  quantity: number | null;
  region: string | null;
  quality_class: string | null;
  price_label: string | null;
  price_status: string | null;
  harvest_date: string | null;
  seen_at: string | null;
}

export interface ExcludedOffer {
  product_id: string;
  name: string;
  reasons: string[];
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  audience: Audience;
  offer_filter: OfferFilter;
  send_at: string | null;
  frequency: Frequency;
  interval_days: number | null;
  response_window_hours: number;
  delivery_date: string | null;
  next_run_at: string | null;
  last_run_key: string | null;
  content_version: number;
  content_hash: string | null;
  preview: { offers?: OfferSnapshot[]; excluded?: ExcludedOffer[]; message?: string | null } | null;
  validated_at: string | null;
  cancelled_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignList {
  items: Campaign[];
}

export interface PreviewPayload {
  campaign_id: string;
  status: CampaignStatus;
  content_version: number;
  offers: OfferSnapshot[];
  excluded: ExcludedOffer[];
  message: string | null;
  content_hash: string | null;
  computed_at: string;
  audience: { recipients: number; skipped: Record<string, number> };
}

export interface Rate {
  value: number | null;
  numerator: string;
  denominator: string;
}

export interface Metrics {
  prepared: number;
  skipped: number;
  failed: number;
  accepted: number;
  delivered: number;
  read: number;
  replied: number;
  interests: Record<string, number>;
  opt_outs_after_send: number;
  rates: { delivery_rate: Rate; reply_rate: Rate };
  notes: string;
}

export interface FailureGroup {
  status: string;
  reason: string | null;
  n: number;
  phone_tails: string[];
}

export interface ResultsPayload {
  metrics: Metrics;
  failures: FailureGroup[];
}

export interface RecipientRow {
  id: string;
  run_key: string;
  phone_tail: string;
  status: string;
  skip_reason: string | null;
  last_error: string | null;
  has_ref: boolean;
  queued_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
}

export interface RecipientsPayload {
  items: RecipientRow[];
}

export interface ConsentImportResult {
  imported: number;
  ignored: { phone_tail: string; reason: string }[];
}

export interface ConsentRequestResult {
  queued: number;
  skipped: { phone_tail: string; reason: string }[];
}
