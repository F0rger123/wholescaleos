import { sendEmail } from './email';

// Carrier gateway mapping - verified working domains
const CARRIER_GATEWAYS: Record<string, string[]> = {
  'T-Mobile': ['tmomail.net'],
  'Boost Mobile': ['tmomail.net'],
  'MetroPCS': ['tmomail.net'],
  'Verizon': ['vtext.com', 'vzwpix.com'],
  'AT&T': ['txt.att.net', 'mms.att.net'],
  'Sprint': ['messaging.sprintpcs.com'],
  'Cricket': ['mms.att.net', 'txt.att.net'],
  'Unknown': ['tmomail.net', 'vtext.com', 'txt.att.net'] // fallback
};

export interface SMSResult {
  success: boolean;
  message: string;
  formattedPhone: string;
  gatewaysUsed: string[];
  error?: string;
}

/**
 * Standardized SMS sending utility via Carrier Gateway (Email-to-SMS)
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
  carrier: string = 'Unknown'
): Promise<SMSResult> {
  // Step 1: Clean phone number to 10 digits (no +1, no dashes, no spaces)
  const cleanPhone = phoneNumber.replace(/[^\d]/g, '').replace(/^1/, '').slice(-10);
  
  if (cleanPhone.length !== 10) {
    console.error(`[SMS] Invalid phone number: ${phoneNumber} -> ${cleanPhone}`);
    return {
      success: false,
      message: 'Invalid phone number format. Please provide a 10-digit US number.',
      formattedPhone: phoneNumber,
      gatewaysUsed: []
    };
  }

  // Step 2: Get gateways for this carrier
  const isUnknown = carrier === 'Unknown' || !CARRIER_GATEWAYS[carrier];
  const gateways = CARRIER_GATEWAYS[carrier] || CARRIER_GATEWAYS['Unknown'];
  
  console.log(`[SMS] Sending to ${cleanPhone} (${carrier}) using gateways: ${gateways.join(', ')}`);

  // Step 3: Try gateways. For unknown carriers, we blast all to ensure delivery.
  // For known carriers, we try one by one.
  let lastError = '';
  const successfulGateways: string[] = [];

  if (isUnknown) {
    console.log(`[SMS] Unknown carrier - blasting all gateways: ${gateways.join(', ')}`);
    const results = await Promise.all(gateways.map(async (gateway) => {
      const to = `${cleanPhone}@${gateway}`;
      try {
        const res = await sendEmail({ to, subject: '', text: message });
        return { gateway, success: res.success, error: res.error };
      } catch (e: any) {
        return { gateway, success: false, error: e.message };
      }
    }));
    
    results.forEach(r => {
      if (r.success) successfulGateways.push(r.gateway);
      else lastError = r.error || lastError;
    });

    if (successfulGateways.length > 0) {
      return {
        success: true,
        message: `✅ SMS sent to ${cleanPhone} via ${successfulGateways.join(', ')}`,
        formattedPhone: cleanPhone,
        gatewaysUsed: successfulGateways
      };
    }
  } else {
    for (const gateway of gateways) {
      const to = `${cleanPhone}@${gateway}`;
      console.log(`[SMS] Attempting to send to ${to}`);
      
      try {
        const result = await sendEmail({ to, subject: '', text: message });
        if (result.success) {
          return {
            success: true,
            message: `✅ SMS sent to ${cleanPhone} via ${gateway}`,
            formattedPhone: cleanPhone,
            gatewaysUsed: [gateway]
          };
        }
        lastError = result.error || 'Unknown email error';
      } catch (error: any) {
        lastError = error.message;
        console.error(`[SMS] Failed via ${gateway}:`, error);
      }
    }
  }
  
  return {
    success: false,
    message: `Failed to send SMS after trying all gateways: ${lastError}`,
    formattedPhone: cleanPhone,
    gatewaysUsed: [],
    error: lastError
  };
}
