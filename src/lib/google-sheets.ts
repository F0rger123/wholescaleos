export interface SheetData {
  headers: string[];
  rows: Record<string, string>[];
  sheetId: string;
  sheetName: string;
}

export async function fetchGoogleSheet(sheetId: string): Promise<{ success: boolean; data: Record<string, string>[]; headers: string[]; error?: string }> {
  try {
    // Extract sheet ID from various URL formats
    const extractedId = extractSheetId(sheetId);
    
    // First, try to get sheet metadata to find the first sheet name
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${extractedId}?key=${import.meta.env.VITE_GOOGLE_API_KEY}`;
    const metadataResponse = await fetch(metadataUrl);
    
    if (!metadataResponse.ok) {
      if (metadataResponse.status === 403) {
        return { 
          success: false, 
          data: [], 
          headers: [],
          error: 'Sheet is not publicly accessible. Please make sure it is shared as "Anyone with the link can view".'
        };
      }
      throw new Error(`Google Sheets API error: ${metadataResponse.statusText}`);
    }
    
    const metadata = await metadataResponse.json();
    
    // Get the first sheet name and its properties
    const sheetName = metadata.sheets?.[0]?.properties?.title || 'Sheet1';
    
    // Get the sheet's grid properties to know the range
    const sheetProperties = metadata.sheets?.[0]?.properties;
    const rowCount = sheetProperties?.gridProperties?.rowCount || 1000;
    const columnCount = sheetProperties?.gridProperties?.columnCount || 26;
    
    // Convert column count to letter range (e.g., 26 -> Z, 27 -> AA)
    const endColumn = columnToLetter(columnCount);
    
    // Use the full range of the sheet
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${extractedId}/values/${sheetName}!A1:${endColumn}${rowCount}?key=${import.meta.env.VITE_GOOGLE_API_KEY}`;
    
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      return { 
        success: false, 
        data: [], 
        headers: [],
        error: 'No data found in the sheet. Make sure it has headers in the first row and data below.'
      };
    }

    // Get headers from first row
    const headers = data.values[0] || [];
    
    // Clean up headers - remove empty ones and trim
    const cleanHeaders = headers.map((h: string, index: number) => {
      if (!h || h.trim() === '') {
        return `Column_${index + 1}`;
      }
      return h.trim();
    });

    // Process the rest as rows
    const rows = data.values.slice(1).map((row: string[]) => {
      const rowData: Record<string, string> = {};
      cleanHeaders.forEach((header: string, index: number) => {
        rowData[header] = row[index] || '';
      });
      return rowData;
    }).filter((row: Record<string, string>) => {
      // Filter out completely empty rows
      return Object.values(row).some(val => val && val.trim() !== '');
    });

    // Log for debugging
    console.log('Google Sheets fetch result:', {
      headers: cleanHeaders,
      rowCount: rows.length,
      sampleRow: rows[0]
    });

    return {
      success: true,
      headers: cleanHeaders,
      data: rows
    };
  } catch (error) {
    console.error('Failed to fetch Google Sheet:', error);
    return { 
      success: false, 
      data: [], 
      headers: [],
      error: `Failed to fetch sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper function to convert column number to letter (1 -> A, 27 -> AA)
function columnToLetter(column: number): string {
  let temp;
  let letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

export function extractSheetId(input: string): string {
  // Handle full URLs
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];
  
  // Handle direct IDs
  if (input.match(/^[a-zA-Z0-9-_]+$/)) return input;
  
  throw new Error('Invalid Google Sheets URL or ID');
}

export function getSheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

export function isGoogleSheetsUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets') || url.includes('sheets.googleapis.com');
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
    
    // Check each pattern
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(headerLower)) {
          // Higher confidence for exact matches
          const confidence = pattern.source.includes('^') ? 95 : 85;
          if (confidence > bestMatch.confidence) {
            bestMatch = { field, confidence };
          }
          break;
        }
      }
    }

    // Get sample data from first non-empty row
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
      sample: sample.substring(0, 50) // Truncate long samples
    };
  });
}