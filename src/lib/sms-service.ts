import { sendEmail } from './email';
import { CARRIER_GATEWAYS } from './sms-gateways';
import { supabase, isSupabaseConfigured } from './supabase';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';

export interface SMSResult {
  success: boolean;
  message: string;
  formattedPhone: string;
  gatewaysUsed: string[];
  error?: string;
}

/**
 * Standardized SMS sending utility with WhatsApp Priority & Hardened Gateway
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

  // Step 2: Check for WhatsApp Priority
  const currentUser = useStore.getState().currentUser;
  if (currentUser?.id && isSupabaseConfigured && supabase) {
    try {
      const { data: prefs } = await supabase
        .from('agent_preferences')
        .select('whatsapp_enabled, whatsapp_status')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      if (prefs?.whatsapp_enabled && prefs.whatsapp_status === 'connected') {
        console.log(`[SMS-WhatsApp] Routing to WhatsApp Bridge for ${cleanPhone}`);
        
        const { error: insertError } = await supabase.from('sms_messages').insert({
          id: uuidv4(),
          user_id: currentUser.id,
          phone_number: cleanPhone,
          content: message,
          direction: 'outbound',
          status: 'pending_whatsapp', // Bridge will pick this up
          is_read: true,
          created_at: new Date().toISOString()
        });

        if (!insertError) {
          return {
            success: true,
            message: `✅ Message queued for WhatsApp delivery to ${cleanPhone}`,
            formattedPhone: cleanPhone,
            gatewaysUsed: ['whatsapp']
          };
        }
        console.error('[SMS-WhatsApp] Failed to queue message:', insertError);
      }
    } catch (err) {}
  }

  // Step 3: Add Anti-Spam Randomization for Gateway
  const randomId = Math.floor(1000 + Math.random() * 9000);
  const hardenedMessage = `[id:${randomId}] ${message}`;

  // Step 4: Get gateways
  const gateways = CARRIER_GATEWAYS[carrier] || CARRIER_GATEWAYS['Unknown'] || ['tmomail.net', 'vtext.com'];
  
  console.log(`[SMS-Hardened] Sending to ${cleanPhone} (${carrier}) using gateways: ${gateways.join(', ')}`);

  let lastError = '';
  const successfulGateways: string[] = [];

  // Step 4: Sequential Delivery with Throttling
  for (const gateway of gateways) {
    const to = `${cleanPhone}@${gateway}`;
    console.log(`[SMS-Hardened] Attempting ${to}...`);
    
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
      message: `✅ SMS delivered to ${cleanPhone} via ${successfulGateways.join(', ')}`,
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
