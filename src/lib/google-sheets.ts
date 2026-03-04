export async function fetchGoogleSheet(sheetId: string): Promise<{ success: boolean; data: Record<string, string>[]; headers: string[]; error?: string }> {
  try {
    const extractedId = extractSheetId(sheetId);
    
    // Use the CSV export method - NO API KEY NEEDED!
    const csvUrl = `https://docs.google.com/spreadsheets/d/${extractedId}/export?format=csv`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      return {
        success: false,
        data: [],
        headers: [],
        error: 'Could not fetch sheet. Make sure it is publicly accessible (File → Share → "Anyone with the link").'
      };
    }
    
    const csvText = await response.text();
    
    // Parse CSV (handles basic cases)
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        data: [],
        headers: [],
        error: 'No data found in the sheet.'
      };
    }
    
    // Parse CSV headers (handles quoted values)
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const rows = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    }).filter(row => Object.values(row).some(v => v.trim() !== ''));
    
    return {
      success: true,
      headers,
      data: rows
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      headers: [],
      error: `Failed to fetch sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Simple CSV parser that handles quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

export function extractSheetId(input: string): string {
  // Handle full URLs
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  
  // Handle direct IDs
  if (input.match(/^[a-zA-Z0-9-_]+$/)) return input;
  
  throw new Error('Invalid Google Sheets URL or ID');
}

export function isGoogleSheetsUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets');
}

export function smartDetectColumns(headers: string[], data: Record<string, string>[]): { sourceColumn: string; targetField: string; confidence: number; sample: string }[] {
  const fieldPatterns: Record<string, RegExp[]> = {
    name: [/^name$/i, /full.?name/i, /owner/i, /contact/i, /client/i, /buyer/i, /seller/i],
    email: [/email/i, /e-?mail/i, /@/i],
    phone: [/phone/i, /cell/i, /mobile/i, /tel/i, /phone.?number/i],
    propertyAddress: [/address/i, /property.?address/i, /street/i, /location/i, /site.?address/i],
    estimatedValue: [/value/i, /price/i, /amount/i, /\$/i, /estimate/i, /sale.?price/i, /list.?price/i],
    propertyType: [/type/i, /property.?type/i, /home.?type/i, /building.?type/i],
    notes: [/note/i, /comment/i, /description/i, /remark/i, /additional.?info/i],
  };

  return headers.map(header => {
    let bestMatch = { field: 'skip', confidence: 0 };
    const headerLower = header.toLowerCase();
    
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(headerLower)) {
          const confidence = pattern.source.includes('^') ? 95 : 85;
          if (confidence > bestMatch.confidence) {
            bestMatch = { field, confidence };
          }
          break;
        }
      }
    }

    let sample = '';
    for (const row of data) {
      if (row[header] && row[header].trim() !== '') {
        sample = row[header];
        break;
      }
    }

    return {
      sourceColumn: header,
      targetField: bestMatch.field,
      confidence: bestMatch.confidence,
      sample: sample.substring(0, 50)
    };
  });
}