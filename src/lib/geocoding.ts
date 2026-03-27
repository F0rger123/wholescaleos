// ─── Free Geocoding via OpenStreetMap Nominatim ─────────────────────────────
// No API key required. Rate limit: 1 request/second (enforced by this module).
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  confidence: number; // 0-100 based on importance
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100; // >1 second between requests

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

// ─── Single Address Geocoding ────────────────────────────────────────────────
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length < 5) return null;

  try {
    await waitForRateLimit();

    const params = new URLSearchParams({
      q: address.trim(),
      format: 'json',
      limit: '1',
      countrycodes: 'us',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'WholeScaleOS/1.0 (Real Estate CRM)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Geocoding HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn(`Geocoding: no results for "${address}"`);
      return null;
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    // Calculate confidence based on Nominatim's importance score (0-1)
    const importance = parseFloat(result.importance || '0.5');
    const confidence = Math.round(Math.min(importance * 120, 100));

    return {
      lat,
      lng,
      displayName: result.display_name || address,
      confidence,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// ─── Batch Geocoding with Progress ───────────────────────────────────────────
export interface BatchGeocodeProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  current: string;
}

export async function batchGeocode(
  addresses: { id: string; address: string }[],
  onProgress?: (progress: BatchGeocodeProgress) => void,
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>();
  const progress: BatchGeocodeProgress = {
    total: addresses.length,
    completed: 0,
    successful: 0,
    failed: 0,
    current: '',
  };

  for (const { id, address } of addresses) {
    progress.current = address;
    onProgress?.(progress);

    const result = await geocodeAddress(address);
    if (result) {
      results.set(id, result);
      progress.successful++;
    } else {
      progress.failed++;
    }
    progress.completed++;
    onProgress?.({ ...progress });
  }

  return results;
}

// ─── Check if coordinates are "default" (ungeoocded) ─────────────────────────
const DEFAULT_LAT = 30.2672;
const DEFAULT_LNG = -97.7431;

export function isDefaultCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return true;
  // Check if it's exactly the default or very close (imported leads with random offsets)
  return (
    (Math.abs(lat - DEFAULT_LAT) < 0.001 && Math.abs(lng - DEFAULT_LNG) < 0.001) ||
    (lat === 0 && lng === 0) ||
    (lat === DEFAULT_LAT && lng === DEFAULT_LNG)
  );
}

// ─── Check if address looks complete enough for geocoding ────────────────────
export function isGeocodableAddress(address: string): boolean {
  if (!address || address.trim().length < 5) return false;
  // Check for some number + street pattern
  const hasStreetNumber = /\d+\s+\w/.test(address);
  const hasComma = address.includes(',');
  return hasStreetNumber || hasComma;
}

// ─── Build full address string from components ──────────────────────────────
export function buildFullAddress(parts: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const components = [parts.address, parts.city, parts.state, parts.zip].filter(Boolean);
  return components.join(', ');
}
