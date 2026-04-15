export async function callGemini(input: string, context: any, apiKey: string, signal?: AbortSignal): Promise<string> {
  const systemPrompt = `You are OS Bot, a real estate CRM assistant.
Personality: ${context.personality || 'professional'}
Recent context: ${JSON.stringify(context.recentMessages || [])}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: input }] }],
          generationConfig: { 
            temperature: 0.2, 
            maxOutputTokens: 512,
            topP: 0.8,
            topK: 40
          }
        })
      }
    );
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || `Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error: any) {
    console.error('[Gemini Provider] Error:', error);
    throw error;
  }
}
