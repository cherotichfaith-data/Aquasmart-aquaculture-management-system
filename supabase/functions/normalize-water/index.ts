// normalize-water: Inserts water_quality_measurement rows from parsed Excel data.
// Called by the master normalize function after approval.

import { supabase, corsHeaders, jsonResponse, errorResponse, requireUploadAccess } from '../_shared/supabase.ts';
import { resolveCageId, resolveWqParameter } from '../_shared/resolve.ts';
import { parseDate, parseTime, parseNumber } from '../_shared/parse-time.ts';
import type { WaterQualityRow, NormalizeResult, ParseIssue } from '../_shared/types.ts';

// Column name aliases for water quality spreadsheets
const COL = {
  cage:      ['cage', 'pen', 'system', 'cage id', 'cage name', 'pen id'],
  date:      ['date', 'measurement date', 'date measured'],
  time:      ['time', 'measurement time', 'time measured'],
  parameter: ['parameter', 'parameter name', 'wq parameter', 'measurement'],
  value:     ['value', 'parameter value', 'reading', 'result', 'measurement value'],
  depth:     ['depth', 'water depth', 'depth (m)'],
  location:  ['location', 'location reference', 'position'],
};

function findCol(headers: string[], aliases: string[]): number {
  return headers.findIndex(h =>
    aliases.some(a => h.toLowerCase().trim() === a.toLowerCase())
  );
}

export async function normalizeWaterRows(
  rows: Record<string, unknown>[],
  headers: string[],
  farmId: string,
  rawUploadId: string
): Promise<NormalizeResult> {
  const result: NormalizeResult = { inserted: 0, skipped: 0, errors: [], reviewItems: 0 };

  const ci = {
    cage:      findCol(headers, COL.cage),
    date:      findCol(headers, COL.date),
    time:      findCol(headers, COL.time),
    parameter: findCol(headers, COL.parameter),
    value:     findCol(headers, COL.value),
    depth:     findCol(headers, COL.depth),
    location:  findCol(headers, COL.location),
  };

  const reviewItems: object[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const issues: ParseIssue[] = [];
    const vals = Object.values(row);

    const rawCage      = ci.cage      >= 0 ? vals[ci.cage]      : null;
    const rawDate      = ci.date      >= 0 ? vals[ci.date]      : null;
    const rawTime      = ci.time      >= 0 ? vals[ci.time]      : null;
    const rawParameter = ci.parameter >= 0 ? vals[ci.parameter] : null;
    const rawValue     = ci.value     >= 0 ? vals[ci.value]     : null;
    const rawDepth     = ci.depth     >= 0 ? vals[ci.depth]     : null;
    const rawLocation  = ci.location  >= 0 ? vals[ci.location]  : null;

    // Skip blank rows
    if (!rawCage && !rawDate && !rawParameter && !rawValue) { result.skipped++; continue; }

    // Resolve system
    const systemId = rawCage ? await resolveCageId(String(rawCage), farmId) : null;
    if (!systemId) {
      issues.push({ type: 'unresolved_cage', field: 'cage', value: rawCage, detail: `Cannot resolve cage "${rawCage}" to a known system` });
    }

    // Resolve parameter
    const parameter = rawParameter ? await resolveWqParameter(String(rawParameter)) : null;
    if (!parameter) {
      issues.push({ type: 'unresolved_parameter', field: 'parameter', value: rawParameter, detail: `Unknown WQ parameter "${rawParameter}"` });
    }

    // Parse date
    const date = parseDate(rawDate);
    if (!date) {
      issues.push({ type: 'missing_required', field: 'date', value: rawDate, detail: 'Invalid or missing date' });
    }

    // Parse value
    const paramValue = parseNumber(rawValue);
    if (paramValue === null) {
      issues.push({ type: 'missing_required', field: 'value', value: rawValue, detail: 'Invalid or missing parameter value' });
    }

    if (issues.length > 0) {
      reviewItems.push({
        raw_upload_id: rawUploadId,
        farm_id: farmId,
        table_name: 'water_quality_measurement',
        row_data: row,
        issue_type: issues[0].type,
        issue_detail: issues.map(x => x.detail).join('; '),
      });
      result.reviewItems++;
      result.skipped++;
      continue;
    }

    // Build local_id for deduplication
    const localId = `wq|${farmId}|${systemId}|${date}|${parameter}|${String(rawTime ?? '').trim()}`;

    const wqRow: WaterQualityRow = {
      system_id: systemId!,
      date: date!,
      time: parseTime(rawTime),
      parameter_name: parameter!,
      parameter_value: paramValue!,
      water_depth: parseNumber(rawDepth),
      location_reference: rawLocation ? String(rawLocation).trim() : null,
      local_id: localId,
    };

    const { error } = await supabase
      .from('water_quality_measurement')
      .upsert(wqRow, { onConflict: 'local_id', ignoreDuplicates: true });

    if (error) {
      result.errors.push(`Row ${i + 2}: ${error.message}`);
      result.skipped++;
    } else {
      result.inserted++;
    }
  }

  // Bulk insert review items
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

    // Download file from Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('raw-uploads').download(upload.storage_path);
    if (dlErr || !fileData) return errorResponse('Failed to download file');

    // Mark as normalizing
    await supabase.from('raw_uploads').update({ status: 'normalizing' }).eq('id', raw_upload_id);

    // Parse with xlsx
    const { default: XLSX } = await import('xlsx');
    const buffer = await fileData.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length < 2) return errorResponse('File has no data rows');
    const headers = (data[0] as unknown[]).map(String);
    const rows = data.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r as unknown[])[i]])));

    const result = await normalizeWaterRows(rows, headers, upload.farm_id, raw_upload_id);

    // Update status
    const finalStatus = result.errors.length === 0 ? 'normalized' : 'failed';
    await supabase.from('raw_uploads')
      .update({ status: finalStatus, row_count: rows.length })
      .eq('id', raw_upload_id);

    return jsonResponse(result);
  } catch (e) {
    return errorResponse(String(e), 500);
  }
});
