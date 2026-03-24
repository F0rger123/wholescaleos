import { sendEmail } from './email';
import { CARRIER_GATEWAYS } from './sms-gateways';
import { supabase, isSupabaseConfigured } from './supabase';
import { useStore } from '../store/useStore';
import { BrevoClient } from '@getbrevo/brevo';

export interface SMSResult {
  success: boolean;
  message: string;
  formattedPhone: string;
  gatewaysUsed: string[];
  error?: string;
}

/**
 * Verifies the Brevo API key by sending a test email
 */
export async function testBrevoConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = new BrevoClient({ apiKey });

    const currentUser = useStore.getState().currentUser;
    const email = currentUser?.email || 'test@example.com';

    await client.transactionalEmails.sendTransacEmail({
      subject: "Brevo Connection Test - WholeScale OS",
      htmlContent: "<html><body><h1>It Works!</h1><p>Your Brevo API Key is correctly configured for WholeScale OS.</p></body></html>",
      sender: { name: "WholeScale OS", email: "system@wholescale.os" },
      to: [{ email }]
    });

    return { success: true, message: 'Success! Test email sent via Brevo.' };
  } catch (error: any) {
    console.error('[Brevo-Test] Connection failed:', error);
    return { 
      success: false, 
      message: error.message || 'Connection failed' 
    };
  }
}

/**
 * Standardized SMS sending utility with Brevo Priority & Gmail Fallback
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

  const currentUser = useStore.getState().currentUser;
  let brevoKey: string | null = null;

  // Step 2: Try Brevo First
  if (currentUser?.id && isSupabaseConfigured && supabase) {
    try {
      const { data: prefs } = await supabase
        .from('agent_preferences')
        .select('brevo_api_key')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      brevoKey = prefs?.brevo_api_key;

      if (brevoKey) {
        console.log(`[SMS-Brevo] Attempting delivery to +1${cleanPhone}...`);
        
        const client = new BrevoClient({ apiKey: brevoKey });
        const result = await client.transactionalSms.sendTransacSms({
          sender: "WholeScale",
          recipient: `+1${cleanPhone}`,
          content: message
        });
        
        if (result && (result as any).reference) {
          return {
            success: true,
            message: `✅ SMS delivered via Brevo to ${cleanPhone}`,
            formattedPhone: cleanPhone,
            gatewaysUsed: ['brevo']
          };
        }
      }
    } catch (err: any) {
      console.warn('[SMS-Brevo] Failed, falling back to Gmail:', err.message);
    }
  }

  // Step 3: Fallback to Gmail Gateway
  console.log(`[SMS-Fallback] Routing to Gmail Gateway for ${cleanPhone}`);
  
  // Add Anti-Spam Randomization for Gateway
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const hardenedMessage = `[id:${randomId}] ${message}`;

  // Get gateways
  const gateways = CARRIER_GATEWAYS[carrier] || CARRIER_GATEWAYS['Unknown'] || ['tmomail.net', 'vtext.com'];
  
  let lastError = '';
  const successfulGateways: string[] = [];

  for (const gateway of gateways) {
    const to = `${cleanPhone}@${gateway}`;
    try {
      const res = await sendEmail({ to, subject: '.', text: hardenedMessage });
      if (res.success) {
        successfulGateways.push(gateway);
        if (carrier !== 'Unknown') break;
      } else {
        lastError = res.error || 'Gateway error';
      }
    } catch (e: any) {
      lastError = e.message;
    }
    
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
    message: `All methods failed. Last error: ${lastError}`,
    formattedPhone: cleanPhone,
    gatewaysUsed: [],
    error: lastError
  };
}
