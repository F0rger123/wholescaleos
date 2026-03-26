import { useStore } from '../../store/useStore';

export interface UserAIPreferences {
  responseStyle: 'concise' | 'detailed' | 'friendly';
  frequentCommands: Record<string, number>;
  shortcuts: Record<string, string>;
  learnedPatterns: Array<{ input: string, correction: string }>;
  training: Record<string, string>;
}

const DEFAULT_PREFERENCES: UserAIPreferences = {
  responseStyle: 'detailed',
  frequentCommands: {},
  shortcuts: {},
  learnedPatterns: [],
  training: {}
};

/**
 * Manages user-specific AI learning and preferences stored in the profiles table's settings column.
 */
export const UserLearningManager = {
  getPreferences(): UserAIPreferences {
    const { currentUser } = useStore.getState();
    const settings = currentUser?.settings as any;
    return settings?.ai_preferences || DEFAULT_PREFERENCES;
  },

  async updatePreferences(updates: Partial<UserAIPreferences>) {
    const { currentUser, updateProfile } = useStore.getState();
    if (!currentUser) return;

    const currentPrefs = this.getPreferences();
    const newPrefs = { ...currentPrefs, ...updates };

    const newSettings = {
      ...(currentUser.settings || {}),
      ai_preferences: newPrefs
    };

    await updateProfile({ settings: newSettings });
  },

  /**
   * Records that a command was used to prioritize it in suggestions later.
   */
  async recordCommandUse(intentName: string) {
    const prefs = this.getPreferences();
    const freq = prefs.frequentCommands || {};
    freq[intentName] = (freq[intentName] || 0) + 1;
    await this.updatePreferences({ frequentCommands: freq });
  },

  /**
   * Learns from a user correction ("not that", "I meant...").
   */
  async learnCorrection(input: string, correction: string) {
    const prefs = this.getPreferences();
    const learned = prefs.learnedPatterns || [];
     learned.push({ input, correction });
    
    // Keep only last 50 corrections
    if (learned.length > 50) learned.shift();
    
    await this.updatePreferences({ learnedPatterns: learned });
  },

  /**
   * Adds a custom shortcut (e.g. "urgent" -> "show leads with score > 90").
   */
  async addShortcut(shortcut: string, command: string) {
    const prefs = this.getPreferences();
    const shortcuts = prefs.shortcuts || {};
    shortcuts[shortcut.toLowerCase()] = command;
    await this.updatePreferences({ shortcuts });
  },

  /**
   * Adds training data (e.g. "Train: X means Y").
   */
  async addTraining(phrase: string, meaning: string) {
    const prefs = this.getPreferences();
    const training = prefs.training || {};
    training[phrase.toLowerCase()] = meaning;
    await this.updatePreferences({ training });
  },

  async setResponseStyle(style: 'concise' | 'detailed' | 'friendly') {
    await this.updatePreferences({ responseStyle: style });
  }
};
