// normalize: Master dispatcher — auto-detects data type and routes to the
// appropriate sub-normalizer. Called after a raw_upload is approved.
//
// Request body: { raw_upload_id: string, data_type?: DataFileType }
// data_type is optional — if omitted, auto-detected from column headers.

import { supabase, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { detectDataType } from '../_shared/resolve.ts';
import { normalizeWaterRows }    from '../normalize-water/index.ts';
import { normalizeFeedingRows }  from '../normalize-feeding/index.ts';
import { normalizeMortalityRows} from '../normalize-mortality/index.ts';
import { normalizeSamplingRows } from '../normalize-sampling/index.ts';
import { normalizeHarvestRows }  from '../normalize-harvest/index.ts';
import { normalizeTransferRows } from '../normalize-transfer/index.ts';
import type { DataFileType, NormalizeResult } from '../_shared/types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { raw_upload_id, data_type: hintType } = body as { raw_upload_id: string; data_type?: DataFileType };

    if (!raw_upload_id) return errorResponse('raw_upload_id required');

    // Load upload record
    const { data: upload, error: upErr } = await supabase
      .from('raw_uploads').select('*').eq('id', raw_upload_id).single();
    if (upErr || !upload) return errorResponse('Upload not found', 404);
    if (upload.status !== 'approved') {
      return errorResponse(`Upload status is "${upload.status}" — must be "approved" before normalizing`);
    }

    // Download file
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('raw-uploads').download(upload.storage_path);
    if (dlErr || !fileData) return errorResponse('Failed to download file from storage');

    // Parse spreadsheet
    const { default: XLSX } = await import('xlsx');
    const buffer = await fileData.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rawData.length < 2) return errorResponse('File appears to be empty (no data rows after header)');

    const headers = (rawData[0] as unknown[]).map(String);
    const rows = rawData.slice(1).map(r =>
      Object.fromEntries(headers.map((h, i) => [h, (r as unknown[])[i]]))
    );

    // Determine data type
    const dataType: DataFileType = (hintType ?? upload.file_type ?? detectDataType(headers)) as DataFileType;

    if (dataType === 'unknown') {
      return errorResponse(
        `Could not detect data type from column headers: [${headers.slice(0, 8).join(', ')}]. ` +
        `Pass data_type explicitly: feeding | mortality | water_quality | sampling | harvest | transfer`
      );
    }

    // Update status
    await supabase.from('raw_uploads')
      .update({ status: 'normalizing', file_type: dataType })
      .eq('id', raw_upload_id);

    // Dispatch
    let result: NormalizeResult;
    const { farm_id, id: uploadId } = upload;

    switch (dataType) {
      case 'water_quality': result = await normalizeWaterRows(rows, headers, farm_id, uploadId);   break;
      case 'feeding':       result = await normalizeFeedingRows(rows, headers, farm_id, uploadId); break;
      case 'mortality':     result = await normalizeMortalityRows(rows, headers, farm_id, uploadId); break;
      case 'sampling':      result = await normalizeSamplingRows(rows, headers, farm_id, uploadId);  break;
      case 'harvest':       result = await normalizeHarvestRows(rows, headers, farm_id, uploadId);   break;
      case 'transfer':      result = await normalizeTransferRows(rows, headers, farm_id, uploadId);  break;
      default:
        await supabase.from('raw_uploads').update({ status: 'failed' }).eq('id', raw_upload_id);
        return errorResponse(`Unsupported data_type: ${dataType}`);
    }

    const finalStatus = result.errors.length > 0 && result.inserted === 0 ? 'failed' : 'normalized';
    await supabase.from('raw_uploads')
      .update({ status: finalStatus, row_count: rows.length })
      .eq('id', raw_upload_id);

    return jsonResponse({
      data_type: dataType,
      rows_total: rows.length,
      ...result,
    });

  } catch (e) {
    console.error('normalize error:', e);
    return errorResponse(String(e), 500);
  }
});
