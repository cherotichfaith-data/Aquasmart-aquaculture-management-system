// Canonical resolution helpers for already-normalized production imports.
// Uses per-invocation in-memory cache to minimise DB round-trips.

import { supabase } from './supabase.ts'
import type { WqParameter, FeedingResponse } from './types.ts';

const cageCache = new Map<string, number | null>();
const feedCache = new Map<string, { id: number | null; isNonFeeding: boolean }>();
const wqCache = new Map<string, WqParameter | null>();

const WQ_CANONICAL: WqParameter[] = [
  'pH', 'temperature', 'dissolved_oxygen', 'secchi_disk_depth',
  'nitrite', 'nitrate', 'ammonia', 'salinity',
];

/**
 * Returns a system_id for the given system name and farm.
 * Historical cage labels must be normalized before calling this resolver.
 */
export async function resolveCageId(alias: string, farmId: string): Promise<number | null> {
  const normalizedName = String(alias ?? '').trim();
  const key = `${farmId}|${normalizedName.toLowerCase()}`;
  if (cageCache.has(key)) return cageCache.get(key)!;

  const { data } = await supabase
    .from('system')
    .select('id')
    .eq('farm_id', farmId)
    .ilike('name', normalizedName)
    .maybeSingle();

  const result = data?.id ?? null;
  cageCache.set(key, result);
  return result;
}

/**
 * Returns { id, isNonFeeding } for a normalized feed label.
 * Non-feeding rows can still be represented without a feed_type row.
 */
export async function resolveFeedTypeId(
  alias: string
): Promise<{ id: number | null; isNonFeeding: boolean }> {
  const normalizedLabel = String(alias ?? '').trim();
  const key = normalizedLabel.toLowerCase();
  if (feedCache.has(key)) return feedCache.get(key)!;

  const noFeed = /^(no\s*feed|none|not\s*fed|0)$/i.test(normalizedLabel);
  if (noFeed) {
    const result = { id: null, isNonFeeding: true };
    feedCache.set(key, result);
    return result;
  }

  const { data } = await supabase
    .from('feed_type')
    .select('id')
    .or(
      [
        `feed_line.ilike.${normalizedLabel}`,
        `feed_category.ilike.${normalizedLabel}`,
        `feed_pellet_size.ilike.${normalizedLabel}`,
      ].join(','),
    )
    .limit(1)
    .maybeSingle();

  const result = { id: (data?.id as number | null) ?? null, isNonFeeding: false };
  feedCache.set(key, result);
  return result;
}

/**
 * Maps a normalized parameter name string to a canonical water_quality_parameters enum value.
 */
export async function resolveWqParameter(alias: string): Promise<WqParameter | null> {
  const normalizedName = String(alias ?? '').trim();
  const key = normalizedName.toLowerCase();
  if (wqCache.has(key)) return wqCache.get(key)!;

  const canonical = WQ_CANONICAL.find((value) => value.toLowerCase() === key) ?? null;
  wqCache.set(key, canonical);
  return canonical;
}

const FEEDING_RESPONSE_MAP: Record<string, FeedingResponse> = {
  'excellent': 5, 'very good': 4, 'very_good': 4,
  'good': 3, 'ok': 3, 'okay': 3, 'ideal': 3, 'ideal appetite': 3,
  'fair': 2, 'poor': 2, 'low': 2, 'low appetite': 2,
  'bad': 1, 'not responding': 1, 'not_responding': 1,
  'no response': 1, 'nr': 1,
};

export function normalizeFeedingResponse(raw: unknown): FeedingResponse {
  if (!raw) return 3;
  const key = String(raw).toLowerCase().trim();
  const numeric = Number(key);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
    return numeric as FeedingResponse;
  }
  return FEEDING_RESPONSE_MAP[key] ?? 3;
}

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
