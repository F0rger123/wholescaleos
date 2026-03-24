const CARRIER_GATEWAYS = {
  'T-Mobile':           ['tmomail.net'],
  'Verizon':            ['vtext.com', 'vzwpix.com'],
  'Boost Mobile':       ['tmomail.net'],
  'Metro by T-Mobile':  ['tmomail.net'],
  'Visible':            ['vtext.com'],
  'Google Fi':          ['msg.fi.google.com'],
  'Unknown':            ['tmomail.net', 'vtext.com'],
};

async function mockSendSMS(target, message, carrier = 'Unknown') {
  const targetPhone = target.replace(/\D/g, '').slice(-10);
  const gateways = CARRIER_GATEWAYS[carrier] || CARRIER_GATEWAYS['Unknown'];
  
  console.log(`\n--- SENDING TO ${targetPhone} (${carrier}) ---`);
  
  for (const gateway of gateways) {
    const targetEmail = `${targetPhone}@${gateway}`;
    const timestampTag = `[id:${Math.floor(Date.now() / 1000).toString().slice(-6)}]`;
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const hardenedMessage = `[id:${randomId}] ${message}`;

    console.log(`[TEST] Attempting: ${targetEmail}`);
    console.log(`[TEST] Subject: ${timestampTag}`);
    console.log(`[TEST] Body: ${hardenedMessage}`);
    
    // Simulate throttle
    if (gateway !== gateways[gateways.length - 1]) console.log('[TEST] Throttling 1s...');
  }
}

console.log('--- TEST 1: KNOWN T-MOBILE (223-667-0555) ---');
mockSendSMS('2236670555', 'Stabilization test.', 'T-Mobile');

setTimeout(() => {
  console.log('\n--- TEST 2: UNKNOWN CARRIER (BLAST MODE) ---');
  mockSendSMS('5551234567', 'Universal test.', 'Unknown');
}, 500);
