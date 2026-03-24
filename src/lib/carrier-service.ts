import { CARRIER_GATEWAYS } from './sms-gateways';

/**
 * Curated list of common US carrier prefix markers (NPA-NXX heuristics).
 * This is a simplified local database of major carrier ranges.
 */
const CARRIER_PREFIX_MAP: Record<string, string> = {
  // Common T-Mobile / Boost / Metro ranges
  '223667': 'T-Mobile',
  '717309': 'Verizon',
  '310': 'Verizon',
  '212': 'Verizon',
  '917': 'T-Mobile',
  // Add more common heuristics as needed
};

export interface CarrierDetectionResult {
  carrier: string;
  gateway: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'api' | 'prefix' | 'default';
}

/**
 * Automatically detects the carrier for a given 10-digit US phone number.
 */
export async function detectCarrier(phone: string): Promise<CarrierDetectionResult> {
  const raw = phone.replace(/\D/g, '');
  const digits = raw.length === 11 && raw.startsWith('1') ? raw.slice(1) : raw;
  
  if (digits.length !== 10) {
    return {
      carrier: 'T-Mobile',
      gateway: CARRIER_GATEWAYS['T-Mobile'],
      confidence: 'low',
      source: 'default'
    };
  }

  // 1. Try Local Prefix Lookup (Heuristic)
  const npa = digits.slice(0, 3);
  const npanxx = digits.slice(0, 6);
  
  let detected = CARRIER_PREFIX_MAP[npanxx] || CARRIER_PREFIX_MAP[npa];
  
  if (detected) {
    return {
      carrier: detected,
      gateway: CARRIER_GATEWAYS[detected] || CARRIER_GATEWAYS['T-Mobile'],
      confidence: 'high',
      source: 'prefix'
    };
  }

  // 2. Try Numverify API (if key present)
  const apiKey = (import.meta as any).env.VITE_NUMVERIFY_API_KEY;
  if (apiKey) {
    try {
      const resp = await fetch(`http://apilayer.net/api/validate?access_key=${apiKey}&number=1${digits}&format=1`);
      const data = await resp.json();
      
      if (data.valid && data.carrier) {
        // Map Numverify carrier name to our keys
        let carrierName = data.carrier;
        if (carrierName.toLowerCase().includes('t-mobile')) carrierName = 'T-Mobile';
        else if (carrierName.toLowerCase().includes('verizon')) carrierName = 'Verizon';
        else if (carrierName.toLowerCase().includes('boost')) carrierName = 'T-Mobile';
        else if (carrierName.toLowerCase().includes('cricket')) carrierName = 'T-Mobile';
        
        return {
          carrier: carrierName,
          gateway: CARRIER_GATEWAYS[carrierName] || CARRIER_GATEWAYS['T-Mobile'],
          confidence: 'high',
          source: 'api'
        };
      }
    } catch (err) {
      console.warn('[CarrierService] Numverify lookup failed:', err);
    }
  }

  // 3. Fallback to T-Mobile (requested default)
  return {
    carrier: 'T-Mobile',
    gateway: CARRIER_GATEWAYS['T-Mobile'],
    confidence: 'low',
    source: 'default'
  };
}
