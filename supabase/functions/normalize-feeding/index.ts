// normalize-feeding: Inserts feeding_record rows from parsed Excel data.

import { supabase, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { resolveCageId, resolveFeedTypeId, normalizeFeedingResponse } from '../_shared/resolve.ts';
import { parseDate, parseNumber } from '../_shared/parse-time.ts';
import type { FeedingRow, NormalizeResult, ParseIssue } from '../_shared/types.ts';

const COL = {
  cage:     ['cage', 'pen', 'system', 'cage id', 'cage name', 'pen id'],
  date:     ['date', 'feeding date', 'date fed'],
  feed:     ['feed', 'feed type', 'feed name', 'feed brand', 'diet'],
  amount:   ['amount', 'amount (kg)', 'feeding amount', 'kg fed', 'amount fed', 'feed amount', 'amount_kg'],
  response: ['response', 'feeding response', 'feed response', 'appetite'],
  notes:    ['notes', 'remarks', 'comment', 'comments'],
};

function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex(h =>
    aliases.some(a => h.toLowerCase().trim() === a.toLowerCase())
  );
}

export async function normalizeFeedingRows(
  rows: Record<string, unknown>[],
  headers: string[],
  farmId: string,
  rawUploadId: string
): Promise<NormalizeResult> {
  const result: NormalizeResult = { inserted: 0, skipped: 0, errors: [], reviewItems: 0 };

  const ci = {
    cage:     findCol(headers, COL.cage),
    date:     findCol(headers, COL.date),
    feed:     findCol(headers, COL.feed),
    amount:   findCol(headers, COL.amount),
    response: findCol(headers, COL.response),
    notes:    findCol(headers, COL.notes),
  };

  const reviewItems: object[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const vals = Object.values(row);
    const issues: ParseIssue[] = [];

    const rawCage     = ci.cage     >= 0 ? vals[ci.cage]     : null;
    const rawDate     = ci.date     >= 0 ? vals[ci.date]     : null;
    const rawFeed     = ci.feed     >= 0 ? vals[ci.feed]     : null;
    const rawAmount   = ci.amount   >= 0 ? vals[ci.amount]   : null;
    const rawResponse = ci.response >= 0 ? vals[ci.response] : null;
    const rawNotes    = ci.notes    >= 0 ? vals[ci.notes]    : null;

    if (!rawCage && !rawDate && !rawFeed) { result.skipped++; continue; }

    // Resolve system
    const systemId = rawCage ? await resolveCageId(String(rawCage), farmId) : null;
    if (!systemId) {
      issues.push({ type: 'unresolved_cage', field: 'cage', value: rawCage, detail: `Cannot resolve cage "${rawCage}"` });
    }

    // Resolve feed type
    let feedTypeId: number | null = null;
    let isNonFeeding = false;
    if (rawFeed) {
      const resolved = await resolveFeedTypeId(String(rawFeed).trim());
      feedTypeId = resolved.id;
      isNonFeeding = resolved.isNonFeeding;
      if (!feedTypeId && !isNonFeeding) {
        issues.push({ type: 'unresolved_feed', field: 'feed', value: rawFeed, detail: `Unknown feed type "${rawFeed}"` });
      }
    } else {
      issues.push({ type: 'missing_required', field: 'feed', detail: 'Feed type is required' });
    }

    // Parse date
    const date = parseDate(rawDate);
    if (!date) {
      issues.push({ type: 'missing_required', field: 'date', value: rawDate, detail: 'Invalid or missing date' });
    }

    // Parse amount
    const amount = parseNumber(rawAmount) ?? 0;

    if (issues.length > 0) {
      reviewItems.push({
        raw_upload_id: rawUploadId,
        farm_id: farmId,
        table_name: 'feeding_record',
        row_data: row,
        issue_type: issues[0].type,
        issue_detail: issues.map(x => x.detail).join('; '),
      });
      result.reviewItems++;
      result.skipped++;
      continue;
    }

    // Skip non-feeding events (no DB record needed, just noted)
    if (isNonFeeding) { result.skipped++; continue; }

    const localId = `feed|${farmId}|${systemId}|${date}|${feedTypeId}`;

    const feedRow: FeedingRow = {
      system_id: systemId!,
      feed_type_id: feedTypeId!,
      feeding_amount: amount,
      date: date!,
      feeding_response: normalizeFeedingResponse(rawResponse),
      notes: rawNotes ? String(rawNotes).trim() : null,
      local_id: localId,
    };

    const { error } = await supabase
      .from('feeding_record')
      .upsert(feedRow, { onConflict: 'local_id', ignoreDuplicates: true });

    if (error) {
      result.errors.push(`Row ${i + 2}: ${error.message}`);
      result.skipped++;
    } else {
      result.inserted++;
    }
  }

  if (reviewItems.length > 0) {
    await supabase.from('normalization_review').insert(reviewItems);
  }

  return result;
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { raw_upload_id } = await req.json();
    if (!raw_upload_id) return errorResponse('raw_upload_id required');

    const { data: upload, error: upErr } = await supabase
      .from('raw_uploads').select('*').eq('id', raw_upload_id).single();
    if (upErr || !upload) return errorResponse('Upload not found', 404);
    if (upload.status !== 'approved') return errorResponse(`Upload status is "${upload.status}", must be "approved"`);

    await supabase.from('raw_uploads').update({ status: 'normalizing' }).eq('id', raw_upload_id);

    const { data: fileData, error: dlErr } = await supabase.storage
      .from('raw-uploads').download(upload.storage_path);
    if (dlErr || !fileData) return errorResponse('Failed to download file');

    const { default: XLSX } = await import('xlsx');
    const buffer = await fileData.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length < 2) return errorResponse('File has no data rows');
    const headers = (data[0] as unknown[]).map(String);
    const rows = data.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r as unknown[])[i]])));

    const result = await normalizeFeedingRows(rows, headers, upload.farm_id, raw_upload_id);
    const finalStatus = result.errors.length === 0 ? 'normalized' : 'failed';
    await supabase.from('raw_uploads').update({ status: finalStatus, row_count: rows.length }).eq('id', raw_upload_id);

    return jsonResponse(result);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
