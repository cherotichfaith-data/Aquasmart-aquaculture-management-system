// normalize-transfer: Inserts fish_transfer rows from parsed Excel data.

import { supabase, corsHeaders, jsonResponse, errorResponse, requireUploadAccess } from '../_shared/supabase.ts';
import { resolveCageId } from '../_shared/resolve.ts';
import { parseDate, parseNumber } from '../_shared/parse-time.ts';
import type { TransferRow, TransferType, NormalizeResult, ParseIssue } from '../_shared/types.ts';

const COL = {
  origin:      ['origin', 'origin cage', 'from cage', 'from', 'source cage', 'origin_system_id'],
  target:      ['target', 'target cage', 'to cage', 'to', 'destination', 'target_system_id'],
  date:        ['date', 'transfer date'],
  count:       ['count', 'number', 'number of fish', 'number_of_fish_transfer', 'fish transferred'],
  totalWeight: ['total weight', 'total weight (kg)', 'total_weight_transfer'],
  abw:         ['abw', 'avg weight', 'average weight'],
  type:        ['type', 'transfer type', 'transfer_type'],
  notes:       ['notes', 'remarks'],
  externalName:['external target', 'external_target_name', 'external destination'],
};

const TRANSFER_TYPE_MAP: Record<string, TransferType> = {
  transfer: 'transfer', grading: 'grading', grade: 'grading',
  density_thinning: 'density_thinning', 'density thinning': 'density_thinning', thinning: 'density_thinning',
  broodstock: 'broodstock', breed: 'broodstock',
  count_check: 'count_check', 'count check': 'count_check', inventory: 'count_check',
  lab_sample: 'lab_sample', 'lab sample': 'lab_sample', lab: 'lab_sample',
  training: 'training', external_out: 'external_out', 'external out': 'external_out', external: 'external_out',
};

function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex(h => aliases.some(a => h.toLowerCase().trim() === a.toLowerCase()));
}

export async function normalizeTransferRows(
  rows: Record<string, unknown>[],
  headers: string[],
  farmId: string,
  rawUploadId: string
): Promise<NormalizeResult> {
  const result: NormalizeResult = { inserted: 0, skipped: 0, errors: [], reviewItems: 0 };

  const ci = {
    origin:      findCol(headers, COL.origin),
    target:      findCol(headers, COL.target),
    date:        findCol(headers, COL.date),
    count:       findCol(headers, COL.count),
    totalWeight: findCol(headers, COL.totalWeight),
    abw:         findCol(headers, COL.abw),
    type:        findCol(headers, COL.type),
    notes:       findCol(headers, COL.notes),
    externalName:findCol(headers, COL.externalName),
  };

  const reviewItems: object[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const vals = Object.values(row);
    const issues: ParseIssue[] = [];

    const rawOrigin      = ci.origin      >= 0 ? vals[ci.origin]      : null;
    const rawTarget      = ci.target      >= 0 ? vals[ci.target]      : null;
    const rawDate        = ci.date        >= 0 ? vals[ci.date]        : null;
    const rawCount       = ci.count       >= 0 ? vals[ci.count]       : null;
    const rawTotalWeight = ci.totalWeight >= 0 ? vals[ci.totalWeight] : null;
    const rawAbw         = ci.abw         >= 0 ? vals[ci.abw]         : null;
    const rawType        = ci.type        >= 0 ? vals[ci.type]        : null;
    const rawNotes       = ci.notes       >= 0 ? vals[ci.notes]       : null;
    const rawExtName     = ci.externalName >= 0 ? vals[ci.externalName] : null;

    if (!rawOrigin && !rawDate && !rawCount) { result.skipped++; continue; }

    const originId = rawOrigin ? await resolveCageId(String(rawOrigin), farmId) : null;
    if (!originId) issues.push({ type: 'unresolved_cage', field: 'origin', value: rawOrigin, detail: `Cannot resolve origin cage "${rawOrigin}"` });

    // Target can be external (external_target_name) or internal
    const isExternal = rawExtName && String(rawExtName).trim() !== '';
    let targetId: number | null = null;
    if (!isExternal) {
      targetId = rawTarget ? await resolveCageId(String(rawTarget), farmId) : null;
      if (!targetId) {
        issues.push({ type: 'unresolved_cage', field: 'target', value: rawTarget, detail: `Cannot resolve target cage "${rawTarget}" — set external_target_name if external` });
      }
    }

    const date = parseDate(rawDate);
    if (!date) issues.push({ type: 'missing_required', field: 'date', value: rawDate, detail: 'Invalid or missing date' });

    const count = parseNumber(rawCount);
    if (count === null || count <= 0) issues.push({ type: 'invalid_value', field: 'count', value: rawCount, detail: 'Transfer count must be positive' });

    const totalWeight = parseNumber(rawTotalWeight);
    if (totalWeight === null) issues.push({ type: 'missing_required', field: 'total_weight', detail: 'Total transfer weight is required' });

    if (issues.length > 0) {
      reviewItems.push({
        raw_upload_id: rawUploadId,
        farm_id: farmId,
        table_name: 'fish_transfer',
        row_data: row,
        issue_type: issues[0].type,
        issue_detail: issues.map(x => x.detail).join('; '),
      });
      result.reviewItems++;
      result.skipped++;
      continue;
    }

    const typeKey = rawType ? String(rawType).toLowerCase().trim() : 'transfer';
    const transferType: TransferType = TRANSFER_TYPE_MAP[typeKey] ?? 'transfer';

    // For external transfers, use a placeholder system_id = origin (same cage, leaving farm)
    const effectiveTargetId = isExternal ? originId! : targetId!;
    const localId = `xfer|${farmId}|${originId}|${effectiveTargetId}|${date}`;

    const transferRow: TransferRow = {
      origin_system_id: originId!,
      target_system_id: effectiveTargetId,
      date: date!,
      number_of_fish_transfer: count!,
      total_weight_transfer: totalWeight!,
      abw: parseNumber(rawAbw),
      transfer_type: isExternal ? 'external_out' : transferType,
      notes: rawNotes ? String(rawNotes).trim() : null,
      external_target_name: isExternal ? String(rawExtName).trim() : null,
      local_id: localId,
    };

    const { error } = await supabase
      .from('fish_transfer')
      .upsert(transferRow, { onConflict: 'local_id', ignoreDuplicates: true });

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

    const result = await normalizeTransferRows(rows, headers, upload.farm_id, raw_upload_id);
    const finalStatus = result.errors.length === 0 ? 'normalized' : 'failed';
    await supabase.from('raw_uploads').update({ status: finalStatus, row_count: rows.length }).eq('id', raw_upload_id);

    return jsonResponse(result);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
