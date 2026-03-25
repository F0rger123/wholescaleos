import { processPrompt } from './gemini';

export interface SMSAnalysis {
  summary: string;
  intent: 'interest' | 'question' | 'scheduling' | 'stop' | 'unknown' | 'general';
  extractedInfo: {
    name?: string;
    propertyAddress?: string;
    phone?: string;
    availability?: string;
  };
  suggestedReplies: string[];
}

export async function analyzeSMSConversation(messages: { role: 'user' | 'assistant', content: string }[]): Promise<SMSAnalysis | null> {
  if (messages.length === 0) return null;

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Lead' : 'Agent'}: ${m.content}`)
    .join('\n');

  const prompt = `Analyze the following SMS conversation between a real estate agent and a potential lead. 
Return a JSON object with:
1. "summary": A brief (1-sentence) summary of the latest state of the conversation.
2. "intent": The primary intent of the LATEST message from the Lead. Choose from: "interest", "question", "scheduling", "stop", "unknown", "general".
3. "extractedInfo": An object with any info found: "name", "propertyAddress", "phone", "availability".
4. "suggestedReplies": 2-3 short, professional reply options for the agent to send next.

Conversation:
${conversationText}`;

  try {
    const response = await processPrompt(prompt, { 
      context: 'sms_analysis',
      format: 'json'
    });

    if (response.intent === 'error' || !response.response) {
      console.error('AI Analysis failed:', response.response);
      return null;
    }

    // Since processPrompt returns a conversational response or JSON, 
    // we need to be careful. The system prompt in gemini.ts already tells it to return JSON.
    // If it's already parsed in response.data, use that.
    
    let result: SMSAnalysis;
    try {
      // Sometimes gemini might put it in response.response if it's raw JSON string
      const rawJson = response.response.match(/\{[\s\S]*\}/)?.[0] || response.response;
      result = JSON.parse(rawJson);
    } catch (e) {
      console.error('Failed to parse analysis result:', e, response.response);
      return null;
    }

    return result;
  } catch (err) {
    console.error('Error analyzing SMS:', err);
    return null;
  }
}
