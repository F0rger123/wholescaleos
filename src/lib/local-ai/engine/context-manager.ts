import { getMemory } from '../memory-store';
import { addMentionedLead } from '../learning-service';

/**
 * Manages conversation continuity, pronoun resolution, and implicit entity linking.
 */
export class ContextManager {
  
  /**
   * Resolves implicit entities (Pronouns like "him", "it", "that lead").
   */
  static resolveEntities(text: string, currentEntities: Record<string, any>): Record<string, any> {
    const memory = getMemory();
    const lower = text.toLowerCase();
    const updated = { ...currentEntities };

    // 1. Resolve Lead References
    if (/\b(him|her|his|hers|that lead|this lead)\b/i.test(lower)) {
      const lastLead = memory.entityStack.find(e => e.type === 'lead');
      if (lastLead) {
        updated.leadId = lastLead.id;
        if (!updated.name) updated.name = lastLead.name;
      }
    }

    // 2. Resolve Task References
    if (/\b(it|that task|this task)\b/i.test(lower)) {
      const lastTask = memory.entityStack.find(e => e.type === 'task');
      if (lastTask) {
        updated.taskId = lastTask.id;
        if (!updated.title) updated.title = lastTask.name;
      }
    }

    // 3. Temporal Resolution (Handled partly by NLUEngine, but augmented here)
    if (lower.includes('yesterday')) {
      const date = new Date();
      date.setDate(date.setDate(date.getDate() - 1));
      updated.date = date.toISOString().split('T')[0];
    }

    return updated;
  }

  /**
   * Tracks mentioned entities in the persistence layer.
   */
  static async trackMentions(userId: string, sessionId: string, entities: Record<string, any>) {
    if (entities.name) {
      await addMentionedLead(userId, sessionId, entities.name);
    }
  }

  /**
   * Detects if the user is correcting previous input.
   */
  static isCorrection(text: string): boolean {
    const correctionKeywords = ['no wait', 'actually', 'instead', 'correction', 'i meant', 'no, '];
    const lower = text.toLowerCase();
    return correctionKeywords.some(k => lower.startsWith(k) || lower.includes(` ${k} `));
  }
}
