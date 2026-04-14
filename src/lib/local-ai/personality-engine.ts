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
    tone: (state.aiTone?.toLowerCase() as any) || 'professional',
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
    sassy: {
      success: `There. Done. Don't say I never did anything for you, ${agentName}.`,
      confirm: `I guess I can do that. If you're sure...`,
      error: `Ugh, even I can't fix that mess.`,
      ask: `I'm not a mind reader. Give me more info.`
    },
    funny: {
      success: `Boop! It's done! I'm basically a magician now.`,
      confirm: `I've got a brilliant plan! Check this out:`,
      error: `Whelp, that's awkward. My circuits are crossed.`,
      ask: `Help me out here! I'm missing a piece of the puzzle.`
    },
    cursing: {
      success: `Finished that shit for you. Anything else?`,
      confirm: `Ready to go. Don't fuck it up.`,
      error: `Goddammit, something broke. Check the logs.`,
      ask: `I need more fucking info before I can do that.`
    },
    concise: {
      success: 'Done.',
      confirm: 'Confirm:',
      error: 'Error.',
      ask: 'Clarify:'
    }
  };

  const p = prefixes[tone as keyof typeof prefixes] || prefixes.professional;
  const prefix = p[responseType as keyof typeof p];
  
  return `${prefix}\n\n${content}`;
}
