import { sendEmail } from './email';
import { CARRIER_GATEWAYS } from './sms-gateways';

export interface SMSResult {
  success: boolean;
  message: string;
  formattedPhone: string;
  gatewaysUsed: string[];
  error?: string;
}

/**
 * Standardized SMS sending utility with hardened Gmail Gateway
 */
export async function sendSMS(
  phoneNumber: string,
  message: string,
  carrier: string = 'Unknown'
): Promise<SMSResult> {
  // Step 1: Clean phone number
  const cleanPhone = phoneNumber.replace(/[^\d]/g, '').replace(/^1/, '').slice(-10);
  
  if (cleanPhone.length !== 10) {
    return {
      success: false,
      message: 'Invalid phone number format.',
      formattedPhone: phoneNumber,
      gatewaysUsed: []
    };
  }

  // Step 2: Add Anti-Spam Randomization for Gateway
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const hardenedMessage = `[id:${randomId}] ${message}`;

  // Step 3: Get gateways
  const gateways = CARRIER_GATEWAYS[carrier] || CARRIER_GATEWAYS['Unknown'] || ['tmomail.net', 'vtext.com'];
  
  console.log(`[SMS-Gmail] Sending to ${cleanPhone} (${carrier}) using gateways: ${gateways.join(', ')}`);

  let lastError = '';
  const successfulGateways: string[] = [];

  // Step 4: Sequential Delivery with Throttling
  for (const gateway of gateways) {
    const to = `${cleanPhone}@${gateway}`;
    console.log(`[SMS-Gmail] Attempting ${to}...`);
    
    try {
      // Use "." as default subject via email.ts logic
      const res = await sendEmail({ to, subject: '.', text: hardenedMessage });
      if (res.success) {
        successfulGateways.push(gateway);
        // If we found the right carrier, stop trying others
        if (carrier !== 'Unknown') break;
      } else {
        lastError = res.error || 'Gateway error';
      }
    } catch (e: any) {
      lastError = e.message;
      console.warn(`[SMS] Failed via ${gateway}:`, e.message);
    }
    
    // 1-second delay between attempts to avoid rate-limiting
    if (gateway !== gateways[gateways.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (successfulGateways.length > 0) {
    return {
      success: true,
      message: `✅ SMS delivered via ${successfulGateways.join(', ')}`,
      formattedPhone: cleanPhone,
      gatewaysUsed: successfulGateways
    };
  }
  
  return {
    success: false,
    message: `All gateways failed. Last error: ${lastError}`,
    formattedPhone: cleanPhone,
    gatewaysUsed: [],
    error: lastError
  };
}
