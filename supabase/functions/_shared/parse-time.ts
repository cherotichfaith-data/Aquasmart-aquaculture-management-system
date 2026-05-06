// Time and date parsers for Excel-exported data
// Handles: HH:MM, HH:MM:SS, AM/PM, Excel decimal fractions, serial date numbers

export function parseTime(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();

  // Already HH:MM:SS or HH:MM
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':');
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const sec = parts[2] ? parts[2].padStart(2, '0') : '00';
    return `${h}:${m}:${sec}`;
  }

  // AM/PM: "8:30 AM", "08:30AM", "8 AM"
  const ampm = s.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = ampm[2] ? parseInt(ampm[2]) : 0;
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  // Excel decimal fraction of a day: 0.5 = 12:00:00
  const num = parseFloat(s);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const totalSec = Math.round(num * 86400);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  return null;
}

export function parseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY (most common in East Africa)
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, mo, y] = dmy;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mo, d, y] = mdy;
    // Disambiguate: if month > 12, it's actually DD/MM
    const moN = parseInt(mo);
    const dN = parseInt(d);
    if (moN > 12 && dN <= 12) {
      return `${y}-${d.padStart(2, '0')}-${mo.padStart(2, '0')}`;
    }
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Excel serial date number (days since 1900-01-01, with leap year bug)
  const num = parseFloat(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    // 25569 = days between 1900-01-01 (Excel epoch) and 1970-01-01 (Unix epoch)
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // Fallback: native Date parse (handles "Jan 15, 2024" etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parseFloat(String(raw).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

export function parseInteger(raw: unknown): number | null {
  const n = parseNumber(raw);
  return n !== null ? Math.round(n) : null;
}
