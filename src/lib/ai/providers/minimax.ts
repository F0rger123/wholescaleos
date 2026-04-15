export async function callMiniMax(input: string, context: any, apiKey: string, signal?: AbortSignal): Promise<string> {
  const model = context.model || 'abab6.5s-chat';
  const url = `https://api.minimax.chat/v1/text/chatcompletion_v2?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal,
      body: JSON.stringify({
        model,
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
      throw new Error(errorData.base_resp?.status_msg || `MiniMax API error: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error('[MiniMax Provider] Error:', error);
    throw error;
  }
}
