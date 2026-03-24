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
  'T-Mobile MMS':       ['tmomail.net'],
  'Verizon':            ['vtext.com'],
  'Verizon MMS':        ['vzwpix.com'],
  'Boost Mobile':       ['tmomail.net'],
  'Cricket Wireless':   ['mms.att.net'],           // Cricket often still supports MMS gateway
  'Metro by T-Mobile':  ['tmomail.net'],
  'Visible':            ['vtext.com'],
  'Google Fi':          ['msg.fi.google.com'],
  'U.S. Cellular':      ['email.uscc.net'],
  'Virgin Mobile':      ['vmobl.com'],
};

/**
 * Universal fallback gateway.
 * For US numbers, tmomail.net (T-Mobile) is usually the most permissive 
 * and handles many MVNOs.
 */
export const UNIVERSAL_SMS_GATEWAYS = ['tmomail.net'];

/**
 * All known domains for inbound filtering.
 */
export const ALL_GATEWAY_DOMAINS = [
  'vtext.com', 'vzwpix.com',
  'mms.att.net',
  'tmomail.net',
  'msg.fi.google.com',
  'email.uscc.net',
  'vmobl.com'
];
