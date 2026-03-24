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
 * Standardized SMS sending utility with Brevo Email-to-SMS & Gmail Fallback
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
  const gateways = CARRIER_GATEWAYS[carrier] || CARRIER_GATEWAYS['Unknown'] || ['tmomail.net', 'vtext.com'];
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const hardenedMessage = `[id:${randomId}] ${message}`;

  // Step 2: Try Brevo Email Gateway (Primary if configured)
  if (currentUser?.id && isSupabaseConfigured && supabase) {
    try {
      const { data: prefs } = await supabase
        .from('agent_preferences')
        .select('brevo_api_key')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      brevoKey = prefs?.brevo_api_key;

      if (brevoKey) {
        console.log(`[SMS-Brevo-Gateway] Attempting delivery to ${cleanPhone} via ${gateways.join(', ')}...`);
        const client = new BrevoClient({ apiKey: brevoKey });
        const successfulGateways: string[] = [];

        for (const gateway of gateways) {
          const toAddress = `${cleanPhone}@${gateway}`;
          try {
            await client.transactionalEmails.sendTransacEmail({
              subject: ".", // Same as Gmail gateway
              sender: { name: "WholeScale OS", email: "system@wholescale.os" }, // Must be authenticated in Brevo
              to: [{ email: toAddress }],
              textContent: hardenedMessage
            });
            successfulGateways.push(gateway);
            if (carrier !== 'Unknown') break; // Found the right one
          } catch (e: any) {
            console.warn(`[SMS-Brevo] Failed via ${gateway}:`, e.message);
          }
        }

        if (successfulGateways.length > 0) {
          return {
            success: true,
            message: `✅ SMS delivered via Brevo Email to ${cleanPhone}`,
            formattedPhone: cleanPhone,
            gatewaysUsed: successfulGateways
          };
        }
      }
    } catch (err: any) {
      console.warn('[SMS-Brevo] Configuration error, falling back to Gmail:', err.message);
    }
  }

  // Step 3: Fallback to Gmail Gateway (Absolute fallback)
  console.log(`[SMS-Gmail-Fallback] Routing to Gmail for ${cleanPhone}`);
  
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
