import { sendSMSViaAI } from './src/lib/gemini';

async function test() {
  console.log('Starting SMS Delivery Test...');
  try {
    const result = await sendSMSViaAI('7173096172', 'This is a test message from WholeScale OS AI to verify delivery to 717-309-6172.', 'Verizon MMS');
    console.log('Result:', result);
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

test();
