import { getMemory } from '../memory-store';
import { addMentionedLead, getConversationContext } from '../learning-service';

/**
 * Manages conversation continuity, pronoun resolution, and implicit entity linking.
 */
export class ContextManager {
  
  /**
   * Retrieves the current conversation context including history and active entities.
   */
  static async getContext(userId: string, sessionId: string) {
    const memory = getMemory();
    const history = await getConversationContext(userId, sessionId);
    
    return {
      userId,
      sessionId,
      history,
      lastEntity: memory.entityStack[0] || null,
      currentTime: new Date().toISOString()
    };
  }

  /**
   * Resolves implicit entities (Pronouns like "him", "it", "that lead").
   * v11.0: Supports merged entity resolution for corrections.
   */
  static resolveEntities(text: string, currentEntities: Record<string, any>, previousTurn?: any): Record<string, any> {
    const memory = getMemory();
    const lower = text.toLowerCase();
    const isCorrection = this.isCorrection(text);
    
    // If it's a correction, we merge with previous turn entities but let current ones override
    let updated = isCorrection && previousTurn?.entities 
      ? { ...previousTurn.entities, ...currentEntities } 
      : { ...currentEntities };

    // 1. Resolve Lead References
    if (/\b(him|her|his|hers|that lead|this lead|the guy|the owner|the seller)\b/i.test(lower)) {
      const lastLead = memory.entityStack.find(e => e.type === 'lead');
      if (lastLead) {
        updated.leadId = updated.leadId || lastLead.id;
        if (!updated.name && !updated.target && !updated.address) {
           updated.name = lastLead.name;
           updated.target = lastLead.name;
        }
      }
    }

    // 2. Resolve Task References
    if (/\b(it|that task|this task)\b/i.test(lower)) {
      const lastTask = memory.entityStack.find(e => e.type === 'task');
      if (lastTask) {
        updated.taskId = updated.taskId || lastTask.id;
        if (!updated.title) updated.title = lastTask.name;
      }
    }

    // 3. Temporal Resolution
    if (lower.includes('yesterday')) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      updated.dueDate = date.toISOString().split('T')[0];
    } else if (lower.includes('tomorrow')) {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      updated.dueDate = date.toISOString().split('T')[0];
    }

    return updated;
  }

  /**
   * Tracks mentioned entities in the persistence layer.
   */
  static async trackMentions(userId: string, sessionId: string, entities: Record<string, any>) {
    if (entities.name || entities.target) {
      const name = entities.name || entities.target;
      if (typeof name === 'string') {
        await addMentionedLead(userId, sessionId, name);
      }
    }
  }

  /**
   * Detects if the user is correcting previous input.
   */
  static isCorrection(text: string): boolean {
    const correctionKeywords = ['no wait', 'actually', 'instead', 'correction', 'i meant', 'no, ', 'change it to', 'rather'];
    const lower = text.toLowerCase();
    return correctionKeywords.some(k => lower.startsWith(k) || lower.includes(` ${k} `) || lower.includes(`${k},`));
  }
}
