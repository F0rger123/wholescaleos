import { BaseHandler } from './base-handler';
import { TaskResponse } from '../task-executor';
import { useStore } from '../../../store/useStore';
import { getMemory, clearLastSuggestion, getLastSuggestion } from '../memory-store';
import { getRecentMemorySummary } from '../learning-service';

/**
 * Handles all system-level AI actions: Small talk, navigation, help, and memory.
 * - system_action: { "action": "navigate|help|small_talk|memory_recall|time_query", "path": "leads|tasks|calendar|dashboard|settings", "text": "..." }
 */
export class SystemHandler extends BaseHandler {
  intent = 'system_action'; // Handles manifold system intents

  async execute(params: any): Promise<TaskResponse> {
    const { action, text, path } = params;

    switch (action) {
      case 'small_talk':
        return this.handleSmallTalk(text || params.prompt || '');
      case 'navigate':
        return this.handleNavigation(path);
      case 'help':
        return this.handleHelp();
      case 'memory_recall':
        return this.handleMemoryRecall();
      case 'time_query':
        return this.handleTimeQuery();
      default:
        // Default to small talk if action is ambiguous
        return this.handleSmallTalk(text || params.prompt || '');
    }
  }

  private async handleSmallTalk(text: string): Promise<TaskResponse> {
    const lower = text.toLowerCase();

    // Affirmation handling (transferred from TaskExecutor)
    if (/^(yes|yeah|y|yep|yup|ya|yah|sure|do it|proceed|exactly|correct)$/i.test(lower)) {
      const suggestion = getLastSuggestion();
      if (suggestion) {
        clearLastSuggestion();
        // Since we are in a handler, we might need TaskExecutor to re-execute
        // But for now, we'll return the intent to chain it.
        return {
          success: true,
          message: "Confirmed. Executing that now.",
          nextIntent: { name: suggestion.action, params: suggestion.params }
        };
      }
    }

    // Gratitude
    if (/thanks|thank you|thx|ty|appreciate/i.test(lower)) {
      return this.wrapSuccess("You're very welcome! Always happy to help you crush it.");
    }

    // Jokes
    if (/joke|laugh/i.test(lower)) {
      const jokes = [
        "Why did the real estate agent cross the road? To get to the other side of the deal!",
        "What's a house's favorite music? Heavy metal… because of all the studs!",
        "What do you call a real estate agent who can sing? A listing agent!"
      ];
      return this.wrapSuccess(jokes[Math.floor(Math.random() * jokes.length)]);
    }

    // Default friendly acknowledgment
    return this.wrapSuccess("I hear you! Just tell me how I can help your pipeline today.");
  }

  private handleNavigation(path: string): TaskResponse {
    const routes: Record<string, string> = {
      'leads': '#/leads',
      'tasks': '#/tasks',
      'calendar': '#/calendar',
      'dashboard': '#/dashboard',
      'settings': '#/settings',
      'inbox': '#/inbox'
    };

    const target = routes[path?.toLowerCase()] || routes.dashboard;
    window.location.hash = target;
    return this.wrapSuccess(`Navigating you to ${path || 'the dashboard'}...`);
  }

  private handleHelp(): TaskResponse {
    const helpText = `I'm 🤖 **OS Bot**, your real estate co-pilot! Here's what I can do:
- 🏘️ **Leads**: "Show my leads", "Add [Name] as a lead", "Compare Luke and Jane"
- ✅ **Tasks**: "List my tasks", "Remind me to call Luke tomorrow"
- 💬 **SMS**: "Text Luke: Hello", "Message the owner of 123 Pine St"
- 📊 **Intelligence**: "Analyze this property", "Any suggestions for my pipeline?"
- 🧠 **Memory**: "Remember that Luke prefers text only"`;

    return this.wrapSuccess(helpText);
  }

  private async handleMemoryRecall(): Promise<TaskResponse> {
    const store = useStore.getState();
    const summary = await getRecentMemorySummary(store.currentUser?.id || 'system');
    const facts = getMemory().learnedFacts || {};
    const factList = Object.entries(facts).map(([k, v]) => `- **${k}:** ${v}`).join('\n');

    return this.wrapSuccess(`### What I Know\n\n**Activity:** ${summary}\n\n**Facts:**\n${factList || 'None yet.'}`);
  }

  private handleTimeQuery(): TaskResponse {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return this.wrapSuccess(`The current time is **${timeStr}** on **${dateStr}**.`);
  }
}
