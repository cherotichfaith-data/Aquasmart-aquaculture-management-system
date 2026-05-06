// Alias resolution helpers — cage names → system_id, feed names → feed_type_id,
// WQ parameter names → canonical enum value
// Uses per-invocation in-memory cache to minimise DB round-trips.

import { supabase } from './supabase.ts'
import type { WqParameter, FeedingResponse } from './types.ts';

// ─── Per-invocation caches ────────────────────────────────────────────────────
const cageCache = new Map<string, number | null>();
const feedCache = new Map<string, { id: number | null; isNonFeeding: boolean }>();
const wqCache   = new Map<string, WqParameter | null>();

const WQ_CANONICAL: WqParameter[] = [
  'pH', 'temperature', 'dissolved_oxygen', 'secchi_disk_depth',
  'nitrite', 'nitrate', 'ammonia', 'salinity',
];

// ─── Cage / system resolver ───────────────────────────────────────────────────

/**
 * Returns a system_id for the given alias and farm.
 * Strategy: exact name match → alias table lookup.
 */
export async function resolveCageId(alias: string, farmId: string): Promise<number | null> {
  const key = `${farmId}|${alias}`;
  if (cageCache.has(key)) return cageCache.get(key)!;

  // 1. Exact case-insensitive match on system.name
  const { data: direct } = await supabase
    .from('system')
    .select('id')
    .eq('farm_id', farmId)
    .ilike('name', alias)
    .maybeSingle();

  if (direct?.id) {
    cageCache.set(key, direct.id);
    return direct.id;
  }

  // 2. Alias table lookup
  const { data: aliased } = await supabase
    .from('cage_id_aliases')
    .select('system_id')
    .eq('alias', alias)
    .eq('farm_id', farmId)
    .maybeSingle();

  const result = aliased?.system_id ?? null;
  cageCache.set(key, result);
  return result;
}

// ─── Feed type resolver ───────────────────────────────────────────────────────

/**
 * Returns { id, isNonFeeding } for a raw feed alias string.
 * isNonFeeding = true means the row should be recorded as a zero-feed event.
 */
export async function resolveFeedTypeId(
  alias: string
): Promise<{ id: number | null; isNonFeeding: boolean }> {
  if (feedCache.has(alias)) return feedCache.get(alias)!;

  const { data } = await supabase
    .from('feed_type_aliases')
    .select('feed_type_id, is_non_feeding')
    .eq('alias', alias)
    .maybeSingle();

  const result = data
    ? { id: data.feed_type_id as number | null, isNonFeeding: Boolean(data.is_non_feeding) }
    : { id: null, isNonFeeding: false };

  feedCache.set(alias, result);
  return result;
}

// ─── WQ parameter resolver ────────────────────────────────────────────────────

/**
 * Maps a raw parameter name string to a canonical water_quality_parameters enum value.
 */
export async function resolveWqParameter(alias: string): Promise<WqParameter | null> {
  if (wqCache.has(alias)) return wqCache.get(alias)!;

  // Direct canonical match (case-sensitive)
  if ((WQ_CANONICAL as string[]).includes(alias)) {
    wqCache.set(alias, alias as WqParameter);
    return alias as WqParameter;
  }

  const { data } = await supabase
    .from('wq_parameter_aliases')
    .select('canonical_name')
    .eq('alias', alias)
    .maybeSingle();

  const result = (data?.canonical_name as WqParameter) ?? null;
  wqCache.set(alias, result);
  return result;
}

// ─── Feeding response normalizer ──────────────────────────────────────────────

const FEEDING_RESPONSE_MAP: Record<string, FeedingResponse> = {
  'excellent': 'excellent', 'very good': 'very_good', 'very_good': 'very_good',
  'good': 'good', 'ok': 'ok', 'okay': 'ok', 'fair': 'fair',
  'poor': 'poor', 'bad': 'bad', 'not responding': 'not responding',
  'no response': 'not responding', 'nr': 'not responding',
};

export function normalizeFeedingResponse(raw: unknown): FeedingResponse {
  if (!raw) return 'ok';
  const key = String(raw).toLowerCase().trim();
  return FEEDING_RESPONSE_MAP[key] ?? 'ok';
}

// ─── Column header detector ───────────────────────────────────────────────────

/**
 * Given spreadsheet column headers, guesses the data file type.
 */
export function detectDataType(headers: string[]): string {
  const h = headers.map(s => s.toLowerCase().trim());
  const has = (kw: string) => h.some(c => c.includes(kw));

  if (has('parameter') || has('dissolved') || has('secchi') || has('ph')) return 'water_quality';
  if (has('mortality') || has('dead') || has('death')) return 'mortality';
  if (has('feed') && (has('amount') || has('kg') || has('response'))) return 'feeding';
  if (has('sampling') || has('abw') || has('avg weight')) return 'sampling';
  if (has('harvest')) return 'harvest';
  if (has('transfer') || has('origin') || has('target')) return 'transfer';
  if (has('stocking') || has('stock')) return 'stocking';
  return 'unknown';
}
