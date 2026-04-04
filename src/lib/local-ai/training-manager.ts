export interface LocalTrainingRule {
  trigger: string;
  action: string;
  id: string;
}

export const TrainingManager = {
  getRules(): LocalTrainingRule[] {
    try {
      const saved = localStorage.getItem('ai_training_rules');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse training rules', e);
    }
    return [];
  },

  addRule(trigger: string, action: string) {
    const rules = this.getRules();
    const newRule = { trigger: trigger.toLowerCase().trim(), action, id: Date.now().toString() };
    rules.push(newRule);
    this.saveRules(rules);
    return newRule;
  },

  deleteRule(id: string) {
    const rules = this.getRules();
    const filtered = rules.filter(r => r.id !== id);
    this.saveRules(filtered);
  },

  saveRules(rules: LocalTrainingRule[]) {
    localStorage.setItem('ai_training_rules', JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent('ai-settings-updated'));
  },

  exportRules(): string {
    const rules = this.getRules();
    return JSON.stringify(rules, null, 2);
  },

  importRules(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        // Validate array shape
        const valid = parsed.every(p => p.trigger && p.action && p.id);
        if (valid) {
          const current = this.getRules();
          // Merge without exact duplicates (by ID)
          const merged = [...current];
          parsed.forEach(incoming => {
            if (!merged.find(m => m.id === incoming.id)) {
               merged.push(incoming);
            }
          });
          this.saveRules(merged);
          return true;
        }
      }
    } catch (e) {
      console.error('Import training rules failed', e);
    }
    return false;
  }
};
