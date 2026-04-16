import { recognizeIntent } from '../intent-engine';

export interface ParsedIntent {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  reasoning: string;
}

/**
 * The Brain of OS Bot's NLU.
 * v13.0: Refactored to use the more robust recognizeIntent engine.
 */
export class NLUEngine {
  /**
   * Main entry point for NLU resolution.
   */
  async resolve(text: string): Promise<ParsedIntent> {
    console.log('[🤖 NLUEngine] Resolving via recognizeIntent:', text);

    const result = await recognizeIntent(text);
    
    if (result) {
      return {
        intent: result.intent.name,
        entities: result.params as Record<string, any>,
        confidence: result.confidence / 100,
        reasoning: result.reasoning || result.matchedBy || "Processed via local core."
      };
    }

    return {
      intent: 'unknown',
      entities: {},
      confidence: 0,
      reasoning: "No intent recognized by local core."
    };
  }

  /**
   * Static wrapper for easy access.
   */
  static async process(text: string, _context: any = {}): Promise<ParsedIntent> {
    const engine = new NLUEngine();
    return engine.resolve(text);
  }
}
