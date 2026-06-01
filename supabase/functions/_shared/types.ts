// Shared TypeScript types for AquaSmart normalization pipeline
// Schema-accurate: uses system_id (bigint), farm_user, farm table names

export type UploadStatus =
  | 'pending_review'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'normalizing'
  | 'normalized'
  | 'failed';

export type DataFileType =
  | 'feeding'
  | 'mortality'
  | 'water_quality'
  | 'sampling'
  | 'harvest'
  | 'transfer'
  | 'stocking'
  | 'unknown';

export type WqParameter =
  | 'pH'
  | 'temperature'
  | 'dissolved_oxygen'
  | 'secchi_disk_depth'
  | 'nitrite'
  | 'nitrate'
  | 'ammonia'
  | 'salinity';

export type FeedingResponse = 1 | 2 | 3 | 4 | 5;

export type HarvestType = 'partial' | 'final';

export type TransferType =
  | 'transfer'
  | 'grading'
  | 'density_thinning'
  | 'broodstock'
  | 'count_check'
  | 'lab_sample'
  | 'training'
  | 'external_out';

export type StockingType = 'empty' | 'already_stocked';

// ────────────────────────────────────────────────────────────────────────────
// Raw upload

export interface RawUpload {
  id: string;
  farm_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: DataFileType | null;
  storage_path: string;
  row_count: number | null;
  status: UploadStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  review_notes: string | null;
  parse_warnings: ParseIssue[] | null;
  uploaded_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Parsing

export interface ParseIssue {
  type:
    | 'unresolved_cage'
    | 'unresolved_feed'
    | 'unresolved_parameter'
    | 'missing_required'
    | 'invalid_value'
    | 'duplicate'
    | 'ambiguous_column'
    | 'skipped_row';
  field?: string;
  value?: unknown;
  detail: string;
  rowIndex?: number;
}

export interface ParsedRow {
  rowIndex: number;
  raw: Record<string, unknown>;
  issues: ParseIssue[];
}

export interface NormalizeResult {
  inserted: number;
  skipped: number;
  errors: string[];
  reviewItems: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Normalized record shapes (matching actual DB columns)

export interface FeedingRow {
  system_id: number;
  feed_type_id: number;
  feeding_amount: number;
  date: string;
  feeding_response: FeedingResponse;
  batch_id?: number | null;
  notes?: string | null;
  local_id?: string | null;
}

export interface MortalityRow {
  system_id: number;
  date: string;
  number_of_fish_mortality: number;
  total_weight_mortality?: number | null;
  abw?: number | null;
  avg_dead_wt_g?: number | null;
  cause: string;
  notes?: string | null;
  farm_id?: string | null;
  batch_id?: number | null;
  local_id?: string | null;
}

export interface WaterQualityRow {
  system_id: number;
  date: string;
  time?: string | null;
  parameter_name: WqParameter;
  parameter_value: number;
  water_depth?: number | null;
  location_reference?: string | null;
  local_id?: string | null;
}

export interface SamplingRow {
  system_id: number;
  date: string;
  number_of_fish_sampling: number;
  total_weight_sampling: number;
  abw: number;
  batch_id?: number | null;
  notes?: string | null;
  local_id?: string | null;
}

export interface HarvestRow {
  system_id: number;
  date: string;
  number_of_fish_harvest: number;
  total_weight_harvest: number;
  abw: number;
  type_of_harvest: HarvestType;
  batch_id?: number | null;
  local_id?: string | null;
}

export interface TransferRow {
  origin_system_id: number;
  target_system_id: number;
  date: string;
  number_of_fish_transfer: number;
  total_weight_transfer: number;
  abw?: number | null;
  transfer_type: TransferType;
  batch_id?: number | null;
  notes?: string | null;
  external_target_name?: string | null;
  local_id?: string | null;
}
