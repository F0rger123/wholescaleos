export async function callOpenAI(input: string, context: any, apiKey: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are OS Bot, a real estate CRM assistant. Personality: ${context.personality || 'professional'}. Recent context: ${JSON.stringify(context.recentMessages || [])}` 
          },
          { role: 'user', content: input }
        ],
        temperature: 0.2,
        max_tokens: 512
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || `OpenAI API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error('[OpenAI Provider] Error:', error);
    throw error;
  }
}
