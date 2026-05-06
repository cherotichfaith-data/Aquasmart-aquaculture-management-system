// File type detection from binary content (magic bytes)
// Used to auto-detect uploaded Excel/CSV files

export type RawFileType = 'xlsx' | 'xls' | 'csv' | 'unknown';

export function detectFileType(buffer: Uint8Array): RawFileType {
  if (buffer.length < 4) return 'unknown';

  // XLSX = ZIP signature: PK\x03\x04
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return 'xlsx';
  }

  // XLS = OLE2 compound document: D0 CF 11 E0
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
    return 'xls';
  }

  // CSV: no magic bytes, try reading as text
  try {
    const sample = new TextDecoder('utf-8', { fatal: true }).decode(buffer.slice(0, 512));
    // CSV-like: contains commas/semicolons/tabs and newlines
    if (/[\r\n]/.test(sample) && /[,;\t]/.test(sample)) return 'csv';
    // Might still be CSV without delimiters (single-column)
    if (/[\r\n]/.test(sample)) return 'csv';
  } catch {
    // Binary content, not text
  }

  return 'unknown';
}

// Normalise a filename extension for use as a hint
export function extensionHint(filename: string): RawFileType {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'xls') return 'xls';
  if (ext === 'csv') return 'csv';
  return 'unknown';
}
