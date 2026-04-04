import { IntentResult } from './intent-engine';

export function generateResponse(intentResult: IntentResult, executionResult?: any): string {
  const { intent, data } = intentResult;

  // If the execution failed or provided a strict override message
  if (executionResult && executionResult.message && !executionResult.success) {
    return `[⚡ Local AI] Note: ${executionResult.message}`;
  }

  // Predefined templates based on Intent
  switch (intent) {
    case 'create_lead':
      return `[⚡ Local AI] Got it! I've created a new lead for ${data?.name || 'the specified contact'}. You can find them in your pipeline.`;
      
    case 'create_task':
      return `[⚡ Local AI] Task added to your list: "${data?.title || 'New Task'}".`;
      
    case 'navigate':
      return `[⚡ Local AI] Taking you to the ${extractPageName(data?.path)} page now.`;
      
    case 'update_status':
      return `[⚡ Local AI] I've updated the status for ${data?.targetName || 'the lead'} to ${data?.newStatus || 'the new status'}.`;
      
    case 'send_sms':
      // Requires confirmation via task-executor
      if (executionResult?.success) {
         return `[⚡ Local AI] Message sent successfully to ${data?.target || 'the contact'}.`;
      }
      return `[⚡ Local AI] Preparing to send SMS. Checking details...`;
      
    case 'show_hot_leads':
    case 'get_analytics':
    case 'general_response':
      // Fallback for custom rules or injected messages
      if (intentResult.response) {
        return intentResult.response;
      }
      return `[⚡ Local AI] Executed action successfully.`;

    default:
      return `[⚡ Local AI] I'm an offline Local AI. I couldn't fully understand that request, or it requires an internet-connected LLM. Try rephrasing into a direct command like "add lead [name]" or "go to dashboard".`;
  }
}

function extractPageName(path?: string): string {
  if (!path || path === '/') return 'Dashboard';
  const name = path.replace('/', '');
  return name.charAt(0).toUpperCase() + name.slice(1);
}
