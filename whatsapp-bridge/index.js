import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Starting WhatsApp Bridge...');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox'],
    headless: true
  }
});

client.on('qr', async (qr) => {
  console.log('📢 New QR Code received. Scan it in the app Settings.');
  qrcode.generate(qr, { small: true });
  
  // Save QR to Supabase for the UI to display
  // Note: We assume a single user for this specific local bridge instance
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (users && users[0]) {
    await supabase
      .from('agent_preferences')
      .update({ 
        whatsapp_qr: qr, 
        whatsapp_status: 'waiting_for_scan',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', users[0].id);
  }
});

client.on('ready', async () => {
  console.log('✅ WhatsApp Client is Ready!');
  
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (users && users[0]) {
    await supabase
      .from('agent_preferences')
      .update({ 
        whatsapp_qr: null, 
        whatsapp_status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', users[0].id);
  }
  
  // Start polling for outbound messages
  startOutboundPolling();
});

client.on('message', async (msg) => {
  console.log(`📩 New message from ${msg.from}: ${msg.body}`);
  
  const cleanPhone = msg.from.split('@')[0].replace(/[^\d]/g, '').slice(-10);
  
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (users && users[0]) {
    await supabase.from('sms_messages').insert({
      id: uuidv4(),
      user_id: users[0].id,
      phone_number: cleanPhone,
      content: msg.body,
      direction: 'inbound',
      is_read: false,
      created_at: new Date().toISOString()
    });
  }
});

client.on('disconnected', async (reason) => {
  console.log('🔴 WhatsApp Disconnected:', reason);
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (users && users[0]) {
    await supabase
      .from('agent_preferences')
      .update({ 
        whatsapp_status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', users[0].id);
  }
});

async function startOutboundPolling() {
  console.log('🔍 Listening for outbound WhatsApp messages...');
  
  // Create a Realtime subscription to the sms_messages table for outbound entries with provider 'whatsapp'
  // Or just poll for now for simplicity in this bridge script
  setInterval(async () => {
    const { data: messages, error } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('direction', 'outbound')
      .eq('status', 'pending_whatsapp')
      .limit(5);

    if (error) return;

    for (const msg of messages) {
      try {
        const chatId = `${msg.phone_number.includes('@') ? msg.phone_number : `1${msg.phone_number}@c.us`}`;
        await client.sendMessage(chatId, msg.content);
        console.log(`🚀 Sent WhatsApp to ${msg.phone_number}`);
        
        await supabase
          .from('sms_messages')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', msg.id);
      } catch (err) {
        console.error(`❌ Failed to send to ${msg.phone_number}:`, err.message);
        await supabase
          .from('sms_messages')
          .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
    }
  }, 3000);
}

client.initialize();
