// normalize-sampling: Inserts fish_sampling_weight rows from parsed Excel data.

import { supabase, corsHeaders, jsonResponse, errorResponse, requireUploadAccess } from '../_shared/supabase.ts';
import { resolveCageId } from '../_shared/resolve.ts';
import { parseDate, parseNumber, parseInteger } from '../_shared/parse-time.ts';
import type { SamplingRow, NormalizeResult, ParseIssue } from '../_shared/types.ts';

const COL = {
  cage:        ['cage', 'pen', 'system', 'cage id'],
  date:        ['date', 'sampling date', 'date sampled'],
  count:       ['count', 'number', 'sample size', 'number of fish', 'number_of_fish_sampling', 'fish sampled'],
  totalWeight: ['total weight', 'total weight (g)', 'total_weight_sampling', 'weight (g)', 'total weight g'],
  abw:         ['abw', 'avg weight', 'average weight', 'mean weight', 'avg weight (g)', 'abw (g)'],
  notes:       ['notes', 'remarks', 'comments'],
};

function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.some(a => h.toLowerCase().trim() === a.toLowerCase()));
}

export async function normalizeSamplingRows(
  rows: Record<string, unknown>[],
  headers: string[],
  farmId: string,
  rawUploadId: string
): Promise<NormalizeResult> {
  const result: NormalizeResult = { inserted: 0, skipped: 0, errors: [], reviewItems: 0 };

  const ci = {
    cage:        findCol(headers, COL.cage),
    date:        findCol(headers, COL.date),
    count:       findCol(headers, COL.count),
    totalWeight: findCol(headers, COL.totalWeight),
    abw:         findCol(headers, COL.abw),
    notes:       findCol(headers, COL.notes),
  };

  const reviewItems: object[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const vals = Object.values(row);
    const issues: ParseIssue[] = [];

    const rawCage        = ci.cage        >= 0 ? vals[ci.cage]        : null;
    const rawDate        = ci.date        >= 0 ? vals[ci.date]        : null;
    const rawCount       = ci.count       >= 0 ? vals[ci.count]       : null;
    const rawTotalWeight = ci.totalWeight >= 0 ? vals[ci.totalWeight] : null;
    const rawAbw         = ci.abw         >= 0 ? vals[ci.abw]         : null;
    const rawNotes       = ci.notes       >= 0 ? vals[ci.notes]       : null;

    if (!rawCage && !rawDate && !rawCount) { result.skipped++; continue; }

    const systemId = rawCage ? await resolveCageId(String(rawCage), farmId) : null;
    if (!systemId) issues.push({ type: 'unresolved_cage', field: 'cage', value: rawCage, detail: `Cannot resolve cage "${rawCage}"` });

    const date = parseDate(rawDate);
    if (!date) issues.push({ type: 'missing_required', field: 'date', value: rawDate, detail: 'Invalid or missing date' });

    const count = parseInteger(rawCount);
    if (count === null || count <= 0) issues.push({ type: 'invalid_value', field: 'count', value: rawCount, detail: 'Sample count must be a positive integer' });

    // ABW: can compute from total weight / count if missing
    let abw = parseNumber(rawAbw);
    const totalWeight = parseNumber(rawTotalWeight);

    if (abw === null && totalWeight !== null && count) {
      abw = totalWeight / count;
    }

    if (abw === null) issues.push({ type: 'missing_required', field: 'abw', detail: 'ABW cannot be calculated (missing weight and abw)' });
    if (totalWeight === null) issues.push({ type: 'missing_required', field: 'total_weight', detail: 'Total weight is required' });

    if (issues.length > 0) {
      reviewItems.push({
        raw_upload_id: rawUploadId,
        farm_id: farmId,
        table_name: 'fish_sampling_weight',
        row_data: row,
        issue_type: issues[0].type,
        issue_detail: issues.map(x => x.detail).join('; '),
      });
      result.reviewItems++;
      result.skipped++;
      continue;
    }

    const localId = `samp|${farmId}|${systemId}|${date}`;

    const sampRow: SamplingRow = {
      system_id: systemId!,
      date: date!,
      number_of_fish_sampling: count!,
      total_weight_sampling: totalWeight!,
      abw: abw!,
      notes: rawNotes ? String(rawNotes).trim() : null,
      local_id: localId,
    };

    const { error } = await supabase
      .from('fish_sampling_weight')
      .upsert(sampRow, { onConflict: 'local_id', ignoreDuplicates: true });

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

    const access = await requireUploadAccess(req, raw_upload_id, {
      allowedStatuses: ['approved'],
      writeRoles: ['admin', 'farm_manager', 'system_operator'],
    });
    if (access instanceof Response) return access;

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

    const result = await normalizeSamplingRows(rows, headers, upload.farm_id, raw_upload_id);
    const finalStatus = result.errors.length === 0 ? 'normalized' : 'failed';
    await supabase.from('raw_uploads').update({ status: finalStatus, row_count: rows.length }).eq('id', raw_upload_id);

    return jsonResponse(result);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
