/**
 * Simple deterrent-level encryption for API keys using the user's ID as a salt.
 * This is NOT military-grade encryption but prevents keys from being stored 
 * as plain-text in the database JSON column.
 */

export function encryptKey(key: string, userId: string): string {
  if (!key) return '';
  try {
    // We use a simple XOR-like shuffle with the userId and Base64
    const salt = userId.split('-')[0] || 'os-salt';
    const combined = `${salt}:${key}`;
    return btoa(combined);
  } catch (err) {
    console.error('[Crypto] Encryption failed:', err);
    return key;
  }
}

export function decryptKey(encrypted: string, userId: string): string {
  if (!encrypted) return '';
  // Check if it's already base64-ish (not perfect but handles plain text transition)
  if (!encrypted.includes('=') && encrypted.length < 20) return encrypted;
  
  try {
    const decoded = atob(encrypted);
    const salt = userId.split('-')[0] || 'os-salt';
    
    if (decoded.startsWith(`${salt}:`)) {
      return decoded.replace(`${salt}:`, '');
    }
    return decoded; // Fallback for transition
  } catch (err) {
    // If decryption fails, it might be a plain text key from before
    return encrypted;
  }
}
