/**
 * ─── SMS Gateways Source of Truth ──────────────────────────────────────────
 * 
 * Centralized mapping of carriers to their primary SMS email gateways.
 * 
 * NOTE: Most carriers only accept messages addressed to their specific domain.
 * Blasting multiple domains often results in "Address not found" NDRs.
 */

export const CARRIER_GATEWAYS: Record<string, string[]> = {
  'T-Mobile':           ['tmomail.net'],
  'Verizon':            ['vtext.com', 'vzwpix.com'],
  'Boost Mobile':       ['tmomail.net'],
  'Metro by T-Mobile':  ['tmomail.net'],
  'Visible':            ['vtext.com'],
  'Google Fi':          ['msg.fi.google.com'],
  'Unknown':            ['tmomail.net', 'vtext.com'],
};

/**
 * Universal fallback gateway.
 */
export const UNIVERSAL_SMS_GATEWAYS = ['tmomail.net', 'vtext.com'];

/**
 * All known domains for inbound filtering.
 */
export const ALL_GATEWAY_DOMAINS = [
  'vtext.com', 'vzwpix.com',
  'tmomail.net',
  'msg.fi.google.com',
];
