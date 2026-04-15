export async function callClaude(input: string, context: any, apiKey: string, signal?: AbortSignal): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'dangerouslyAllowBrowser': 'true'
      },
      signal,
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 512,
        system: `You are OS Bot, a real estate CRM assistant. Personality: ${context.personality || 'professional'}. Recent context: ${JSON.stringify(context.recentMessages || [])}`,
        messages: [{ role: 'user', content: input }],
        temperature: 0.2
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || `Claude API error: ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch (error: any) {
    console.error('[Claude Provider] Error:', error);
    throw error;
  }
}
