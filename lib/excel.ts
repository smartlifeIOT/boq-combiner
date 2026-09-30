import * as XLSX from 'xlsx-js-style';

import type { Sheet1Row, Sheet2Row, CombinedOutputRow, ProcessingResult, WorkbookData } from '@/types';

// ─── Hardcoded fixed values ──────────────────────────────────────────────────
const FIXED = {
  Budget: 'Smart Tower',
  Contractor: 'Smart Life',
  PO: '10001099',
};

function normalize(v: string): string {
  return v.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findKey(row: Record<string, unknown>, target: string): string | null {
  return Object.keys(row).find((k) => normalize(k) === normalize(target)) ?? null;
}

function getVal(row: Record<string, unknown>, target: string): string {
  const k = findKey(row, target);
  return k ? String(row[k] ?? '').trim() : '';
}

// ─── TAWAL ID detection ──────────────────────────────────────────────────────
export function findTawalIdKey(rows: Sheet1Row[]): string | null {
  if (!rows.length) return null;
  return (
    Object.keys(rows[0]).find((k) => normalize(k) === 'tawal id') ??
    Object.keys(rows[0]).find((k) => normalize(k).includes('tawal')) ??
    null
  );
}

export function extractTawalIds(rows: Sheet1Row[], tawalKey: string): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const val = String(row[tawalKey] ?? '').trim();
    if (val) ids.add(val);
  }
  return [...ids].sort();
}

// ─── Extract available categories from Sheet 2 ───────────────────────────────
export function extractAvailableCategories(sheet2: Sheet2Row[]): string[] {
  if (!sheet2.length) return [];
  const catKey = findKey(sheet2[0] as Record<string, unknown>, 'Categories');
  if (!catKey) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of sheet2) {
    const val = String((row as Record<string, unknown>)[catKey] ?? '').trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push(val);
    }
  }
  return result;
}

// ─── Category matching against Sheet 1 columns ──────────────────────────────
function categoryMatches(category: string, row: Sheet1Row): boolean {
  const cat = normalize(category);

  // ── Special cases ──────────────────────────────────────────────────────────
  if (cat === 'smart lock for new request') {
    return normalize(getVal(row, 'Smart Lock for New Request')) === 'yes' || normalize(getVal(row, 'Smart Lock for New Request')) === 'required';
  }
  if (cat === 'new smart lock cabinets') {
    return getVal(row, 'New Smart Lock Cabinets').toUpperCase().includes('STC ODU');
  }

  // ── Generic fallback: column name = category, value = "required" or "yes" ─
  // Handles: RMS, Multiplexer, Expander, Smart Meter, Fence Lock, ODU Lock, etc.
  const val = normalize(getVal(row, category));
  return val === 'required' || val === 'yes';
}

// ─── Dynamic qty resolution ──────────────────────────────────────────────────
// Derives the Sheet 1 qty column name from the category + item type at runtime.
//
// supply  → tries "{category} qty",  "{category} quantity"
// service → tries "{category} installation", "{category} install"
//
// findKey does a normalized (lowercase + trim) comparison so "Multiplexer Qty",
// "multiplexer qty", "MULTIPLEXER QTY" etc. all resolve correctly.
function resolveQty(
  s1row: Sheet1Row,
  category: string,
  itemType: string,
): string {
  const cat = normalize(category);

  const candidates =
    itemType === 'supply'
      ? [`${cat} qty`, `${cat} quantity`]
      : itemType === 'service'
      ? [`${cat} installation`, `${cat} install`]
      : [];

  for (const candidate of candidates) {
    const key = findKey(s1row as Record<string, unknown>, candidate);
    if (key) return String((s1row as Record<string, unknown>)[key] ?? '').trim();
  }

  return '';
}

// ─── Build output rows ────────────────────────────────────────────────────────
export function processWorkbook(
  data: WorkbookData,
  selectedTawalIds: string[],
  selectedCategories: string[] = []
): ProcessingResult {
  const { sheet1, sheet2 } = data;
  const tawalKey = findTawalIdKey(sheet1);

  // Filter Sheet 1 by selected TAWAL IDs
  let filtered = sheet1;
  if (selectedTawalIds.length && tawalKey) {
    filtered = sheet1.filter((row) =>
      selectedTawalIds.includes(String(row[tawalKey] ?? '').trim())
    );
  }

  // Group Sheet 2 rows by their 'Categories' value
  const sheet2ByCat = new Map<string, Sheet2Row[]>();
  for (const s2row of sheet2) {
    const cat = String(
      (s2row as Record<string, unknown>)[
        findKey(s2row as Record<string, unknown>, 'Categories') ?? ''
      ] ?? ''
    ).trim();
    if (!cat) continue;
    if (!sheet2ByCat.has(cat)) sheet2ByCat.set(cat, []);
    sheet2ByCat.get(cat)!.push(s2row);
  }

  // Determine which categories to process
  const allCategories = [...sheet2ByCat.keys()];
  const categoriesToProcess = selectedCategories.length
    ? allCategories.filter((cat) =>
        selectedCategories.some((sel) => normalize(sel) === normalize(cat))
      )
    : allCategories;

  const outputRows: CombinedOutputRow[] = [];

  for (const s1row of filtered) {
    const tawalId = tawalKey ? String(s1row[tawalKey] ?? '').trim() : '';
    const stcId = getVal(s1row, 'STC ID');
    const project = normalize(String(s1row[findKey(s1row, 'Project') ?? ''] ?? ''));
    const SubProjectName    = normalize(String(s1row[findKey(s1row, 'Subproject') ?? ''] ?? ''));


    for (const cat of categoriesToProcess) {
      if (!categoryMatches(cat, s1row)) continue;

      const s2rows = sheet2ByCat.get(cat) ?? [];
      for (const s2row of s2rows) {
        const s2 = s2row as Record<string, unknown>;
        const description = String(s2[findKey(s2, 'Description') ?? ''] ?? '').trim();
        const uom         = String(s2[findKey(s2, 'UOM') ?? ''] ?? '').trim();
        const price       = String(s2[findKey(s2, 'Price') ?? ''] ?? '');
        const lineNo      = s2[findKey(s2, 'Item') ?? ''] ?? '';
        const itemType    = normalize(String(s2[findKey(s2, 'Type') ?? ''] ?? ''));

        // ── Dynamic: column name built from category name + item type ────────
        const updatedQty = resolveQty(s1row, cat, itemType);

        const parsedQty   = parseFloat(updatedQty) || 0;
        const parsedPrice = parseFloat(price) || 0;
        const totalPrice  = parsedQty * parsedPrice;

        outputRows.push({
          'Budget':         FIXED.Budget,
          'Project':        project,
          'Subproject': SubProjectName,
          'Contractor':     FIXED.Contractor,
          'PO#':            FIXED.PO,
          'Site ID':        tawalId,
          'Site Code':      stcId,
          'Site Name':      '',
          'Item Code':      String(lineNo),
          'Description of': description,
          'Unit':           uom,
          'Updated Qty':    updatedQty || 'N/A',
          'Unit price':     price,
          'Total price':    String(totalPrice),
        });
      }
    }
  }

  return {
    outputRows,
    filteredCount: filtered.length,
    uniqueTawalIds: [...new Set(outputRows.map((r) => r['Site ID'] as string))],
    uniqueCategories: [...new Set(outputRows.map((r) => r['Work type'] as string))],
  };
}

// ─── Column validation ────────────────────────────────────────────────────────
const REQUIRED_SHEET1_COLS = ['rms'];
const REQUIRED_SHEET2_COLS = ['type'];

function validateColumns(sheet1: Sheet1Row[], sheet2: Sheet2Row[]): void {
  if (!sheet1.length) throw new Error('Sheet 1 is empty.');
  if (!sheet2.length) throw new Error('Sheet 2 is empty.');

  const sheet1Keys = Object.keys(sheet1[0]).map(normalize);
  const sheet2Keys = Object.keys(sheet2[0]).map(normalize);

  const missingSheet1 = REQUIRED_SHEET1_COLS.filter((col) => !sheet1Keys.includes(col));
  const missingSheet2 = REQUIRED_SHEET2_COLS.filter((col) => !sheet2Keys.includes(col));

  const errors: string[] = [];
  if (missingSheet1.length)
    errors.push(`Sheet 1 is missing column(s): ${missingSheet1.map((c) => `"${c}"`).join(', ')}`);
  if (missingSheet2.length)
    errors.push(`Sheet 2 is missing column(s): ${missingSheet2.map((c) => `"${c}"`).join(', ')}`);

  if (errors.length) throw new Error(errors.join('\n'));
}

// ─── Parse uploaded workbook ──────────────────────────────────────────────────
export function parseWorkbook(buffer: ArrayBuffer): WorkbookData {
  const wb = XLSX.read(buffer, { type: 'array' });
  if (wb.SheetNames.length < 2) {
    throw new Error('Workbook must contain at least 2 sheets.');
  }
  const [sheet1Name, sheet2Name] = wb.SheetNames;
  const sheet1 = XLSX.utils.sheet_to_json<Sheet1Row>(wb.Sheets[sheet1Name], { defval: '' });
  const sheet2 = XLSX.utils.sheet_to_json<Sheet2Row>(wb.Sheets[sheet2Name], { defval: '' });

  validateColumns(sheet1, sheet2);

  return {
    sheet1,
    sheet2,
    sheet1Name,
    sheet2Name,
    allSheetNames: wb.SheetNames,
  };
}

// ─── Build output workbook ────────────────────────────────────────────────────
export function buildOutputWorkbook(
  originalBuffer: ArrayBuffer,
  outputRows: CombinedOutputRow[]
): XLSX.WorkBook {
  const wb = XLSX.read(originalBuffer, { type: 'array' });

  const sheetData = outputRows.length
    ? outputRows
    : [{ Note: 'No rows matched. Check that RMS/Expander/Smart Meter = Required, Smart Lock = Yes, or New Smart Lock Cabinets contains STC ODU.' }];

  const outSheet = XLSX.utils.json_to_sheet(sheetData);

  if (outputRows.length) {
    const range = XLSX.utils.decode_range(outSheet['!ref'] ?? 'A1');

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!outSheet[addr]) continue;
      outSheet[addr].s = {
        font:      { bold: true, color: { rgb: '000000' } },
        fill:      { fgColor: { hex: '#92D050' } },
        alignment: { horizontal: 'center' },
      };
    }

    const colWidths: number[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      let maxLen = 10;
      for (let r = range.s.r; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = outSheet[addr];
        if (!cell) continue;
        const len = String(cell.v ?? '').length;
        if (len > maxLen) maxLen = len;
      }
      colWidths.push(maxLen + 2);
    }
    outSheet['!cols'] = colWidths.map((w) => ({ wch: w }));
  }

  const existingIdx = wb.SheetNames.indexOf('Final Sheet');
  if (existingIdx !== -1) {
    wb.SheetNames.splice(existingIdx, 1);
    delete wb.Sheets['Final Sheet'];
  }

  XLSX.utils.book_append_sheet(wb, outSheet, 'Final Sheet');
  return wb;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
export const OUTPUT_COLUMNS = [
  'Budget', 'SubProject Name', 'Contractor', 'PO#',
  'Site ID', 'Site Code', 'Site Name', 'Work type',
  'Item Code', 'Description of', 'Unit', 'Updated Qty',
  'Unit price', 'Total price',
] as const;