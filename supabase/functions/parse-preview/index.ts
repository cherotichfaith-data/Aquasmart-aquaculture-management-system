// parse-preview: Parses a file from Storage and returns a preview with column
// mapping, detected data type, and row-level issues — without inserting any data.
// Also creates normalization_review entries for flagged rows.
// Updates raw_uploads.status from pending_review → in_review.
//
// Request body: { raw_upload_id: string }
// Response:     { headers, preview_rows, detected_type, issues, row_count, warnings }

import { supabase, createUserClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts'
import { resolveCageId, resolveWqParameter, resolveFeedTypeId, detectDataType } from '../_shared/resolve.ts';
import { parseDate, parseTime } from '../_shared/parse-time.ts';
import { detectFileType } from '../_shared/file-detect.ts';
import type { ParseIssue, DataFileType } from '../_shared/types.ts';

const MAX_PREVIEW_ROWS = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { raw_upload_id } = await req.json()
    if (!raw_upload_id) return errorResponse('raw_upload_id required')

    // Use user-context client so RLS ensures they can only see their own farm's uploads
    const userClient = createUserClient(req)
    const { data: upload, error: upErr } = await userClient
      .from('raw_uploads').select('*').eq('id', raw_upload_id).single()
    if (upErr || !upload) return errorResponse('Upload not found', 404)

    if (!['pending_review', 'in_review'].includes(upload.status)) {
      return errorResponse(`Upload is already in status "${upload.status}"`);
    }

    // Download file
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('raw-uploads').download(upload.storage_path);
    if (dlErr || !fileData) return errorResponse('Failed to download file');

    const buffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Detect file type from magic bytes
    const rawFileType = detectFileType(bytes);
    if (rawFileType === 'unknown') {
      return errorResponse('Unsupported file type. Please upload an XLSX, XLS, or CSV file.');
    }

    // Parse with xlsx
    const { default: XLSX } = await import('xlsx');
    let wb: ReturnType<typeof XLSX.read>;
    try {
      wb = XLSX.read(bytes, { type: 'array', cellDates: false });
    } catch (e) {
      return errorResponse(`Failed to parse file: ${e}`);
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const allData: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (allData.length < 2) return errorResponse('File has no data rows (only a header row or completely empty)');

    const headers = (allData[0] as unknown[]).map(h => String(h).trim());
    const allRows = allData.slice(1).map(r =>
      Object.fromEntries(headers.map((h, i) => [h, (r as unknown[])[i]]))
    );
    const previewRows = allRows.slice(0, MAX_PREVIEW_ROWS);

    // Auto-detect data type
    const detectedType: DataFileType = (upload.file_type ?? detectDataType(headers)) as DataFileType;

    // Analyse preview rows for common issues
    const rowIssues: { rowIndex: number; issues: ParseIssue[] }[] = [];
    const unresolvedCages  = new Set<string>();
    const unresolvedFeeds  = new Set<string>();
    const unresolvedParams = new Set<string>();

    // Find key column indices for type-specific checks
    const cageCol      = headers.findIndex(h => /cage|pen|system/i.test(h));
    const dateCol      = headers.findIndex(h => /^date/i.test(h));
    const paramCol     = headers.findIndex(h => /parameter|wq/i.test(h));
    const feedCol      = headers.findIndex(h => /feed/i.test(h));

    for (let i = 0; i < previewRows.length; i++) {
      const vals = Object.values(previewRows[i]);
      const issues: ParseIssue[] = [];

      // Check date
      if (dateCol >= 0) {
        const rawDate = vals[dateCol];
        if (!rawDate || !parseDate(rawDate)) {
          issues.push({ type: 'missing_required', field: 'date', value: rawDate, rowIndex: i + 2, detail: `Row ${i + 2}: unparseable date "${rawDate}"` });
        }
      }

      // Check cage resolution
      if (cageCol >= 0 && upload.farm_id) {
        const rawCage = String(vals[cageCol] ?? '').trim();
        if (rawCage && !unresolvedCages.has(rawCage)) {
          const systemId = await resolveCageId(rawCage, upload.farm_id);
          if (!systemId) {
            unresolvedCages.add(rawCage);
            issues.push({ type: 'unresolved_cage', field: 'cage', value: rawCage, rowIndex: i + 2, detail: `Row ${i + 2}: unknown cage "${rawCage}"` });
          }
        }
      }

      // Check WQ parameter resolution
      if (paramCol >= 0 && detectedType === 'water_quality') {
        const rawParam = String(vals[paramCol] ?? '').trim();
        if (rawParam && !unresolvedParams.has(rawParam)) {
          const canonical = await resolveWqParameter(rawParam);
          if (!canonical) {
            unresolvedParams.add(rawParam);
            issues.push({ type: 'unresolved_parameter', field: 'parameter', value: rawParam, rowIndex: i + 2, detail: `Row ${i + 2}: unknown WQ parameter "${rawParam}"` });
          }
        }
      }

      // Check feed resolution
      if (feedCol >= 0 && detectedType === 'feeding') {
        const rawFeed = String(vals[feedCol] ?? '').trim();
        if (rawFeed && !unresolvedFeeds.has(rawFeed)) {
          const { id, isNonFeeding } = await resolveFeedTypeId(rawFeed);
          if (!id && !isNonFeeding) {
            unresolvedFeeds.add(rawFeed);
            issues.push({ type: 'unresolved_feed', field: 'feed', value: rawFeed, rowIndex: i + 2, detail: `Row ${i + 2}: unknown feed type "${rawFeed}"` });
          }
        }
      }

      if (issues.length > 0) rowIssues.push({ rowIndex: i + 2, issues });
    }

    // Build summary warnings
    const warnings: string[] = [];
    if (unresolvedCages.size > 0) warnings.push(`Unresolved cage names: ${[...unresolvedCages].join(', ')}`);
    if (unresolvedFeeds.size > 0) warnings.push(`Unresolved feed types: ${[...unresolvedFeeds].join(', ')}`);
    if (unresolvedParams.size > 0) warnings.push(`Unresolved WQ parameters: ${[...unresolvedParams].join(', ')}`);
    if (detectedType === 'unknown') warnings.push('Could not auto-detect data type — specify manually before approving');

    // Create review items for flagged rows
    if (rowIssues.length > 0) {
      const reviewPayload = rowIssues.map(({ rowIndex, issues }) => ({
        raw_upload_id,
        farm_id: upload.farm_id,
        table_name: detectedType,
        row_data: previewRows[rowIndex - 2] ?? {},
        issue_type: issues[0].type,
        issue_detail: issues.map(x => x.detail).join('; '),
      }));
      await supabase.from('normalization_review').insert(reviewPayload);
    }

    // Update upload to in_review
    await supabase.from('raw_uploads').update({
      status: 'in_review',
      file_type: detectedType !== 'unknown' ? detectedType : upload.file_type,
      row_count: allRows.length,
      parse_warnings: warnings.length > 0 ? warnings.map(w => ({ detail: w })) : null,
    }).eq('id', raw_upload_id);

    return jsonResponse({
      headers,
      detected_type: detectedType,
      raw_file_type: rawFileType,
      row_count: allRows.length,
      preview_rows: previewRows,
      row_issues: rowIssues,
      warnings,
      unresolved: {
        cages: [...unresolvedCages],
        feeds: [...unresolvedFeeds],
        parameters: [...unresolvedParams],
      },
    });

  } catch (e) {
    console.error('parse-preview error:', e);
    return errorResponse(String(e), 500);
  }
});
