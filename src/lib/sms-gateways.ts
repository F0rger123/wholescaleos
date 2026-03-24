/**
 * ─── SMS Gateways Source of Truth ──────────────────────────────────────────
 * 
 * Centralized mapping of carriers to their primary SMS email gateways.
 * 
 * NOTE: Most carriers only accept messages addressed to their specific domain.
 * Blasting multiple domains often results in "Address not found" NDRs.
 */

export const CARRIER_GATEWAYS: Record<string, string[]> = {
  'AT&T':               ['txt.att.net'],
  'AT&T MMS':           ['mms.att.net'],
  'Verizon':            ['vtext.com'],
  'Verizon MMS':        ['vzwpix.com'],
  'T-Mobile':           ['tmomail.net'],
  'T-Mobile MMS':       ['tmomail.net'],           // T-Mobile uses tmomail.net for both
  'Sprint':             ['messaging.sprintpcs.com'],
  'Sprint MMS':         ['pm.sprint.com'],
  'Boost Mobile':       ['tmomail.net'],           // Boost runs on T-Mobile network
  'Cricket Wireless':   ['sms.cricketwireless.net'],
  'Metro by T-Mobile':  ['tmomail.net'],
  'Visible':            ['vtext.com'],             // Visible runs on Verizon
  'Google Fi':          ['msg.fi.google.com'],
  'U.S. Cellular':      ['email.uscc.net'],
  'Virgin Mobile':      ['vmobl.com'],
  'Republic Wireless':  ['text.republicwireless.com'],
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
  'txt.att.net', 'mms.att.net',
  'tmomail.net',
  'messaging.sprintpcs.com', 'pm.sprint.com',
  'sms.cricketwireless.net',
  'msg.fi.google.com',
  'text.republicwireless.com',
  'email.uscc.net',
  'vmobl.com'
];
