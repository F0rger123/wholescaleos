import { useStore } from '../../store/useStore';

export interface IdentityProfile {
  name: string;
  role: string;
  tone: 'professional' | 'friendly' | 'bold' | 'concise';
  agentName: string;
}

export function getBotIdentity(): IdentityProfile {
  const state = useStore.getState();
  return {
    name: state.aiName || 'OS Bot',
    role: 'Real Estate Assistant',
    tone: ((state as any).settings?.ai_tone as any) || 'professional',
    agentName: state.currentUser?.email?.split('@')[0] || 'Agent'
  };
}

export function wrapResponse(content: string, responseType: 'success' | 'confirm' | 'error' | 'ask', intentName?: string): string {
  const { tone, agentName } = getBotIdentity();
  
  // Skip prefix for conversational intents like greetings
  if (intentName === 'greeting' || intentName === 'small_talk') {
    return content;
  }

  const prefixes = {
    professional: {
      success: 'Command executed successfully.',
      confirm: 'I have prepared the following action for your review:',
      error: 'I encountered an issue processing your request.',
      ask: 'I require further clarification for this action.'
    },
    friendly: {
      success: `All set for you, ${agentName}!`,
      confirm: `I've got that ready! Take a look:`,
      error: `Oops, something didn't go quite right.`,
      ask: `I'm almost there! Just one more thing:`
    },
    bold: {
      success: 'Mission accomplished.',
      confirm: 'Action ready. Confirm to execute.',
      error: 'System error. Intervention required.',
      ask: 'Missing data. Provide input.'
    },
    concise: {
      success: 'Done.',
      confirm: 'Confirm:',
      error: 'Error.',
      ask: 'Clarify:'
    }
  };

  const p = prefixes[tone] || prefixes.professional;
  const prefix = p[responseType];
  
  return `${prefix}\n\n${content}`;
}
