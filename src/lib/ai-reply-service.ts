export interface AIAnalysis {
  summary: string;
  intent: string;
  extractedInfo: any;
  suggestedReplies: string[];
}

const TEMPLATES: Record<string, string[]> = {
  pricing: [
    "I'd be happy to provide a fair cash offer for your property. When would be a good time to discuss the details?",
    "We typically look at recent sales in the area to determine our offer. Are you looking for a quick closing?",
    "I've done some preliminary research on your property. Our cash offers are competitive and we cover all closing costs. Interested in a number?"
  ],
  condition: [
    "We buy properties in as-is condition, so you don't need to worry about any repairs or cleanouts. Does that sound like it would work for you?",
    "Regardless of the property's condition, we are interested. What are the major repairs needed, if any?",
    "No repairs needed on your end! We take care of everything. Would you like to schedule a quick 5-minute walkthrough?"
  ],
  greeting: [
    "Hi there! This is Alex from WholeScale. I'm following up on your property inquiry. How can I best help you today?",
    "Hello! I saw you were interested in a cash offer for your property. Is it still available?",
    "Thanks for reaching out! I'm the local acquisitions manager here. What's the best way for us to connect?"
  ],
  timing: [
    "We can close as quickly as 7 days, or on a timeline that works best for you. What is your ideal closing date?",
    "Are you looking to sell immediately, or are you just exploring your options at this stage?",
    "We pride ourselves on being flexible. If you need to stay in the home for a few weeks after closing, we can make that happen."
  ],
  default: [
    "Thank you for reaching out! I'd love to learn more about your property and how we can help. What's the best way to move forward?",
    "I received your message and would like to schedule a brief call to discuss next steps. Does tomorrow morning work for you?",
    "Great hearing from you. I'm reviewing the details now. In the meantime, do you have a target price in mind?"
  ]
};

export async function analyzeConversation(
  messages: { role: 'user' | 'assistant', content: string }[],
  _context: 'sms' | 'email' = 'sms'
): Promise<AIAnalysis | null> {
  if (messages.length === 0) return null;

  // Local AI Logic (No API Credits)
  const lastMessage = messages[messages.length - 1].content.toLowerCase();
  
  let category = 'default';
  if (lastMessage.includes('price') || lastMessage.includes('offer') || lastMessage.includes('worth') || lastMessage.includes('much')) {
    category = 'pricing';
  } else if (lastMessage.includes('repair') || lastMessage.includes('fix') || lastMessage.includes('condition') || lastMessage.includes('wrong')) {
    category = 'condition';
  } else if (lastMessage.includes('when') || lastMessage.includes('soon') || lastMessage.includes('time') || lastMessage.includes('close')) {
    category = 'timing';
  } else if (lastMessage.includes('hi') || lastMessage.includes('hello') || lastMessage.includes('hey')) {
    category = 'greeting';
  }

  // Simulate "thinking" for 800ms to make it feel like AI
  await new Promise(r => setTimeout(r, 800));

  const replies = TEMPLATES[category] || TEMPLATES.default;
  
  return {
    summary: `Client is asking about ${category}.`,
    intent: category,
    extractedInfo: {},
    suggestedReplies: [...replies].sort(() => Math.random() - 0.5).slice(0, 3)
  };
}
