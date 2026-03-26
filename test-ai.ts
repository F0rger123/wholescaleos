import { parseIntent } from './src/lib/ai/intent-parser';
import { formatTemplate } from './src/lib/ai/template-engine';

const testInputs = [
  "show hot leads",
  "add task remember to call mom",
  "send text to 5125551234 saying hello",
  "who is online",
  "what's on my calendar",
  "update status for Thomas Baker to qualified",
  "create lead John Doe",
  "show details for Angela Brooks",
  "complete task Call Mom",
  "delete task Call Dad",
  "team assignments"
];

console.log("--- Local AI Intent Parsing Test ---");

testInputs.forEach(input => {
  const result = parseIntent(input);
  if (result) {
    console.log(`Input: "${input}"`);
    console.log(`Intent: ${result.intent.name}`);
    console.log(`Params: ${JSON.stringify(result.params)}`);
    
    // Mock data for template test
    const mockData = { 
      count: 5, 
      list: "Lead A, Lead B, Lead C", 
      description: "remember to call mom",
      number: "5125551234",
      leadName: "Thomas Baker",
      status: "qualified",
      name: "John Doe",
      details: "John Doe info...",
      title: "Call Mom"
    };
    
    const formatted = formatTemplate(result.intent.template, { ...mockData, ...result.params });
    console.log(`Template: "${result.intent.template}"`);
    console.log(`Formatted: "${formatted}"`);
    console.log("-----------------------------------");
  } else {
    console.log(`Input: "${input}" - NO MATCH`);
    console.log("-----------------------------------");
  }
});
