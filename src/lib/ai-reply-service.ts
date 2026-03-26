import { processPrompt } from './gemini';

export interface AIAnalysis {
  summary: string;
  intent: string;
  extractedInfo: any;
  suggestedReplies: string[];
}

export async function analyzeConversation(
  messages: { role: 'user' | 'assistant', content: string }[],
  context: 'sms' | 'email' = 'sms'
): Promise<AIAnalysis | null> {
  if (messages.length === 0) return null;

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Client' : 'Agent'}: ${m.content}`)
    .join('\n');

  const prompt = `Analyze the following ${context.toUpperCase()} conversation between a real estate agent and a potential lead. 
Return a JSON object with:
1. "summary": A brief (1-sentence) summary of the latest state of the conversation.
2. "intent": The primary intent of the LATEST message from the Client.
3. "extractedInfo": An object with any info found: "name", "propertyAddress", "phone", "availability".
4. "suggestedReplies": 2-3 short, professional reply options for the agent to send next.

Conversation:
${conversationText}`;

  try {
    const response = await processPrompt(prompt, { 
      context: `${context}_analysis`,
      format: 'json'
    });

    if (response.intent === 'error' || !response.response) {
      console.error('AI Analysis failed:', response.response);
      return null;
    }
    
    let result: AIAnalysis;
    try {
      const rawJson = response.response.match(/\{[\s\S]*\}/)?.[0] || response.response;
      result = JSON.parse(rawJson);
    } catch (e) {
      console.error('Failed to parse analysis result:', e, response.response);
      return null;
    }

    return result;
  } catch (err) {
    console.error(`Error analyzing ${context}:`, err);
    return null;
  }
}
