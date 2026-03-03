// ─── Google Sheets Real Data Fetcher ─────────────────────────────────────────
// Fetches REAL data from a shared Google Sheet (no API key needed).
// The sheet must be shared as "Anyone with the link can view".
//
// Uses Google Visualization API CSV export endpoint which supports CORS.
// ─────────────────────────────────────────────────────────────────────────────

export interface SheetFetchResult {
  success: boolean;
  data: Record<string, string>[];
  headers: string[];
  rowCount: number;
  error?: string;
  sheetTitle?: string;
}

// ─── Extract Sheet ID from URL ───────────────────────────────────────────────
export function extractSheetId(url: string): string | null {
  // Matches: https://docs.google.com/spreadsheets/d/SHEET_ID/...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Matches: https://docs.google.com/spreadsheets/d/e/PUBLISHED_ID/...
  const pubMatch = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (pubMatch) return pubMatch[1];

  // Raw ID pasted
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();

  return null;
}

// ─── Extract GID (sheet tab) from URL ────────────────────────────────────────
export function extractGid(url: string): string {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? match[1] : '0';
}

// ─── Parse CSV handling quoted fields ────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const value = (cells[idx] || '').replace(/^"|"$/g, '');
      if (value) row[header] = value;
    });
    // Only add rows that have at least one non-empty value
    if (Object.values(row).some(v => v.trim().length > 0)) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

// ─── Fetch from Google Sheets ────────────────────────────────────────────────
export async function fetchGoogleSheet(url: string): Promise<SheetFetchResult> {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    return {
      success: false,
      data: [],
      headers: [],
      rowCount: 0,
      error: 'Invalid Google Sheets URL. Please paste the full URL from your browser address bar.',
    };
  }

  const gid = extractGid(url);

  // Try multiple endpoints for maximum compatibility
  const endpoints = [
    // Google Visualization API — best CORS support
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    // Direct CSV export
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
    // Published spreadsheet format
    `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&gid=${gid}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        // If 403/404, sheet isn't shared properly
        if (response.status === 403) {
          return {
            success: false,
            data: [],
            headers: [],
            rowCount: 0,
            error: 'Access denied. Make sure the sheet is shared as "Anyone with the link can view". Go to Share → General access → Anyone with the link.',
          };
        }
        if (response.status === 404) {
          return {
            success: false,
            data: [],
            headers: [],
            rowCount: 0,
            error: 'Sheet not found. Check the URL is correct and the sheet still exists.',
          };
        }
        continue; // Try next endpoint
      }

      const text = await response.text();

      // Check if we got HTML instead of CSV (Google sometimes returns login page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        continue; // Try next endpoint
      }

      // Check if it looks like Google's JSON wrapper (not CSV)
      if (text.trim().startsWith('google.visualization.Query.setResponse')) {
        // Parse the JSONP response
        try {
          const jsonStr = text.replace(/^.*setResponse\(/, '').replace(/\);?\s*$/, '');
          const json = JSON.parse(jsonStr);
          if (json.table) {
            const headers = json.table.cols.map((c: { label?: string; id?: string }) => c.label || c.id || '');
            const rows = json.table.rows.map((r: { c: Array<{ v?: string | number | null }> }) => {
              const row: Record<string, string> = {};
              r.c.forEach((cell: { v?: string | number | null }, idx: number) => {
                if (cell && cell.v !== null && cell.v !== undefined) {
                  row[headers[idx]] = String(cell.v);
                }
              });
              return row;
            }).filter((r: Record<string, string>) => Object.values(r).some(v => v.trim().length > 0));

            return {
              success: true,
              data: rows,
              headers: headers.filter((h: string) => h.length > 0),
              rowCount: rows.length,
              sheetTitle: json.table.cols[0]?.label ? 'Google Sheet' : undefined,
            };
          }
        } catch {
          continue; // Try next endpoint
        }
      }

      // Parse as CSV
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0 || rows.length === 0) {
        continue; // Try next endpoint — might not be CSV
      }

      return {
        success: true,
        data: rows,
        headers,
        rowCount: rows.length,
      };
    } catch (err) {
      // AbortError means timeout, TypeError means CORS
      if (err instanceof DOMException && err.name === 'AbortError') {
        continue; // Try next endpoint
      }
      // CORS errors throw TypeError
      if (err instanceof TypeError) {
        continue; // Try next endpoint
      }
      continue;
    }
  }

  // All endpoints failed
  return {
    success: false,
    data: [],
    headers: [],
    rowCount: 0,
    error: 'Could not fetch the sheet. Make sure:\n1. The sheet is shared as "Anyone with the link can view"\n2. The URL is from docs.google.com/spreadsheets\n3. Try using "Smart Paste" instead — copy the data from your sheet and paste it directly.',
  };
}

// ─── Auto-detect column mapping with enhanced patterns ───────────────────────
export interface SmartColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  sample: string;
  detectedPattern: string;
}

const COLUMN_PATTERNS: {
  targetField: string;
  headerPatterns: RegExp;
  dataPatterns?: RegExp;
  priority: number;
}[] = [
  // Name patterns
  { targetField: 'name', headerPatterns: /^(owner|seller|contact|name|full.?name|first.?name|last.?name|client|person|lead.?name|property.?owner)$/i, priority: 90 },
  // Email patterns
  { targetField: 'email', headerPatterns: /^(email|e.?mail|email.?address|contact.?email)$/i, dataPatterns: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, priority: 98 },
  // Phone patterns
  { targetField: 'phone', headerPatterns: /^(phone|tel|telephone|mobile|cell|contact.?phone|phone.?number|cell.?phone)$/i, dataPatterns: /^[\(\+]?\d[\d\s\-\(\)\.]{6,}\d$/, priority: 96 },
  // Address patterns
  { targetField: 'propertyAddress', headerPatterns: /^(address|property.?address|location|street|property|mailing|site.?address|prop.?addr)$/i, dataPatterns: /^\d+\s+[A-Za-z].*(?:St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pl|Cir|Pkwy|Hwy)\b/i, priority: 92 },
  // Value patterns
  { targetField: 'estimatedValue', headerPatterns: /^(value|price|amount|est.?value|estimated|asking|list.?price|arv|market.?value|assessed|worth|sale.?price)$/i, dataPatterns: /^\$[\d,]+/, priority: 88 },
  // Property type patterns
  { targetField: 'propertyType', headerPatterns: /^(type|property.?type|prop.?type|category|class|use.?code|land.?use|zoning)$/i, priority: 82 },
  // Notes patterns
  { targetField: 'notes', headerPatterns: /^(notes?|comment|description|detail|remark|memo|info|additional|motivation|situation)$/i, priority: 75 },
];

export function smartDetectColumns(
  headers: string[],
  sampleRows: Record<string, string>[],
): SmartColumnMapping[] {
  return headers.map(header => {
    // First: try matching by header name
    for (const pattern of COLUMN_PATTERNS) {
      if (pattern.headerPatterns.test(header.trim())) {
        const sample = sampleRows[0]?.[header] || '';
        return {
          sourceColumn: header,
          targetField: pattern.targetField,
          confidence: pattern.priority,
          sample,
          detectedPattern: 'header-match',
        };
      }
    }

    // Second: try matching by data content (analyze first 5 rows)
    const sampleValues = sampleRows.slice(0, 5).map(r => r[header] || '').filter(v => v.trim());

    if (sampleValues.length > 0) {
      for (const pattern of COLUMN_PATTERNS) {
        if (pattern.dataPatterns) {
          const matchCount = sampleValues.filter(v => pattern.dataPatterns!.test(v.trim())).length;
          const matchRatio = matchCount / sampleValues.length;
          if (matchRatio >= 0.6) { // 60% of samples match
            return {
              sourceColumn: header,
              targetField: pattern.targetField,
              confidence: Math.round(matchRatio * pattern.priority),
              sample: sampleValues[0],
              detectedPattern: 'data-match',
            };
          }
        }
      }

      // Check if values look like names (2-3 capitalized words)
      const nameMatchCount = sampleValues.filter(v => {
        const words = v.trim().split(/\s+/);
        return words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z]/.test(w));
      }).length;
      if (nameMatchCount / sampleValues.length >= 0.6) {
        return {
          sourceColumn: header,
          targetField: 'name',
          confidence: 78,
          sample: sampleValues[0],
          detectedPattern: 'name-inference',
        };
      }

      // Check if values look like currency
      const currencyMatchCount = sampleValues.filter(v => /^\$?[\d,]+(\.\d{2})?$/.test(v.trim())).length;
      if (currencyMatchCount / sampleValues.length >= 0.6) {
        return {
          sourceColumn: header,
          targetField: 'estimatedValue',
          confidence: 75,
          sample: sampleValues[0],
          detectedPattern: 'currency-inference',
        };
      }
    }

    // No match — skip
    return {
      sourceColumn: header,
      targetField: 'skip',
      confidence: 0,
      sample: sampleRows[0]?.[header] || '',
      detectedPattern: 'none',
    };
  });
}

// ─── Validate URL is a Google Sheets URL ─────────────────────────────────────
export function isGoogleSheetsUrl(url: string): boolean {
  return /docs\.google\.com\/spreadsheets/.test(url) || /^[a-zA-Z0-9_-]{20,}$/.test(url.trim());
}
