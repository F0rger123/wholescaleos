import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';
import { trackLead, setActiveState, getMemory, pushToEntityStack, setLearnedFact, trackSentiment } from './memory-store';

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
}

export async function executeTask(action: string, entities: any): Promise<TaskResponse> {
  const store = useStore.getState();
  const userName = store.currentUser?.name?.split(' ')[0] || 'Agent';

  switch (action) {
    case 'navigate':
      const path = entities.path?.toLowerCase();
      const routes: Record<string, string> = {
        'lead': '#/leads',
        'leads': '#/leads',
        'task': '#/tasks',
        'tasks': '#/tasks',
        'calendar': '#/calendar',
        'dashboard': '#/dashboard',
        'settings': '#/settings',
        'inbox': '#/inbox',
        'message': '#/os-messages',
        'messages': '#/os-messages',
        'summary': '#/os-messages',
        'summaries': '#/os-messages',
        'ai': '#/ai-bot',
        'training': '#/ai-training'
      };
      if (routes[path]) {
        window.location.hash = routes[path];
        return { success: true, message: `Navigating to ${path}.` };
      }
      return { success: false, message: `I don't know how to navigate to "${path}".` };

    case 'create_lead':
      try {
        const result = await store.addLead({
          name: entities.name || 'New Opportunity',
          email: entities.email || '',
          phone: entities.phone || '',
          status: 'new',
          source: 'ai_bot',
          propertyAddress: entities.location || '',
          propertyType: 'single-family',
          estimatedValue: 0,
          bedrooms: 0,
          bathrooms: 0,
          sqft: 0,
          offerAmount: 0,
          lat: 30.2672,
          lng: -97.7431,
          notes: `Created via OS Bot.`,
          assignedTo: store.currentUser?.id || 'system',
          probability: 50,
          engagementLevel: 1,
          timelineUrgency: 1,
          competitionLevel: 1,
          documents: [],
        });
        
        if (result.success && result.id) {
          trackLead(result.id, entities.name);
        }

        return { 
          success: result.success, 
          message: result.success ? `✅ Created lead for ${entities.name}.` : 'Failed to create lead.'
        };
      } catch (e) {
        return { success: false, message: 'Lead creation error.' };
      }

    case 'add_task':
      try {
        store.addTask({
          title: entities.title || 'New Task',
          description: entities.notes || '',
          assignedTo: store.currentUser?.id || 'system',
          dueDate: entities.dueDate || new Date().toISOString().split('T')[0],
          priority: 'medium',
          status: 'todo',
          createdBy: store.currentUser?.id || 'system',
          leadId: undefined
        });
        return { success: true, message: `✅ Task "${entities.title}" added.` };
      } catch (e) {
        return { success: false, message: 'Task creation error.' };
      }

    case 'send_sms':
      try {
        let target = entities.target;
        const memory = getMemory();
        
        if (!target && memory.activeState?.type === 'AWAITING_SMS_MESSAGE') {
          target = memory.activeState.data?.target;
        }

        if (!target) return { success: false, message: "Who should I text?" };
        
        const lead = store.leads.find(l => l.name.toLowerCase().includes(target.toLowerCase()));
        const phone = lead?.phone || target;
        
        if (!phone.replace(/\D/g, '').length && !lead) {
            return { success: false, message: `I found ${target}, but they don't have a phone number.` };
        }

        const res = await sendSMS(phone, entities.message);
        if (res.success && lead) {
            pushToEntityStack({ id: lead.id, name: lead.name, type: 'lead' });
            setActiveState(null);
        }

        return { 
          success: res.success, 
          message: res.success ? `✅ SMS sent to ${lead?.name || target}.` : `Failed: ${res.message}`
        };
      } catch (e: any) {
        return { success: false, message: e.message || 'SMS service error.' };
      }

    case 'update_lead_status':
      const leadToUpdate = store.leads.find(l => l.name.toLowerCase().includes(entities.target?.toLowerCase()));
      if (leadToUpdate) {
        store.updateLead(leadToUpdate.id, { status: entities.status });
        pushToEntityStack({ id: leadToUpdate.id, name: leadToUpdate.name, type: 'lead' });
        return { success: true, message: `✅ Marked ${leadToUpdate.name} as ${entities.status}.` };
      }
      return { success: false, message: `I couldn't find a lead named "${entities.target}".` };

    case 'add_note':
      const leadForNote = store.leads.find(l => l.name.toLowerCase().includes(entities.target?.toLowerCase()));
      if (leadForNote) {
        const newNote = `[OS Bot ${new Date().toLocaleDateString()}]: ${entities.note}\n\n${leadForNote.notes || ''}`;
        store.updateLead(leadForNote.id, { notes: newNote });
        pushToEntityStack({ id: leadForNote.id, name: leadForNote.name, type: 'lead' });
        return { success: true, message: `✅ Added note to ${leadForNote.name}'s profile.` };
      }
      return { success: false, message: `I couldn't find a lead named "${entities.target}".` };

    case 'get_lead_info':
      const foundLead = store.leads.find(l => l.name.toLowerCase().includes(entities.name?.toLowerCase()));
      if (foundLead) {
        pushToEntityStack({ id: foundLead.id, name: foundLead.name, type: 'lead' });
        const summary = `Here's what I have on **${foundLead.name}**:\n- 📍 Address: ${foundLead.propertyAddress || 'N/A'}\n- 📊 Status: ${foundLead.status}\n- 🎯 Deal Score: ${foundLead.dealScore || 0}\n- 📞 Phone: ${foundLead.phone || 'None'}`;
        return { success: true, message: summary };
      }
      return { success: false, message: `I don't have any records for "${entities.name}".` };

    case 'lead_query': {
      const leads = store.leads;
      const count = leads.length;
      const hotLeads = leads.filter(l => (l.dealScore || 0) >= 80).length;
      const statusCounts = leads.reduce((acc: any, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {});

      let msg = `You have ${count} leads in your database.`;
      if (hotLeads > 0) msg += ` ${hotLeads} are marked as 'Hot' (score > 80).`;
      if (statusCounts['closed-won']) msg += ` You've closed ${statusCounts['closed-won']} deals!`;
      
      return { success: true, message: msg };
    }

    case 'task_query': {
      const tasks = store.tasks.filter(t => t.status !== 'done');
      const overdue = tasks.filter(t => new Date(t.dueDate) < new Date()).length;
      
      let msg = `You have ${tasks.length} active tasks.`;
      if (overdue > 0) msg += ` ${overdue} are currently overdue! ⚠️`;
      else msg += ` Everything is on track.`;
      
      return { success: true, message: msg };
    }

    case 'set_preference':
      setLearnedFact(entities.key || 'generic', entities.value || 'true');
      return { success: true, message: `✅ Got it. I'll remember that ${entities.key} is ${entities.value}.` };

    case 'small_talk':
      const phrase = entities.text?.toLowerCase() || '';
      if (phrase.includes('test') || phrase.includes('ping')) {
        return { success: true, message: "Beep boop! 🤖 Test received. I'm online, fully functional, and ready to help you dominate the market. What's our next move?" };
      }
      if (phrase.includes('thank') || phrase.includes('thx') || phrase.includes('great') || phrase.includes('nice')) {
        trackSentiment(phrase);
        return { success: true, message: `You're very welcome, ${userName}! Always happy to help. What else is on your mind?` };
      }
      if (phrase.includes('how are you') || phrase.includes('how its going')) {
        return { success: true, message: `I'm functioning at 100% capacity and ready to assist! It's a great day to close some deals. How about you?` };
      }
      if (phrase.includes('bye') || phrase.includes('see you') || phrase.includes('later')) {
        return { success: true, message: `Talk to you later, ${userName}! Have a productive day.` };
      }
      return { success: true, message: `I hear you! Conversation is the key to business growth. How can I help you move forward today?` };

    case 'greeting':
      const hour = new Date().getHours();
      let timeGreeting = 'Hello';
      if (hour < 12) timeGreeting = 'Good morning';
      else if (hour < 18) timeGreeting = 'Good afternoon';
      else timeGreeting = 'Good evening';

      const greetingText = entities.text?.toLowerCase() || '';
      if (greetingText === 'yo') {
        return { success: true, message: `Yo ${userName}! 🤘 Ready to crush some goals today? What's the move?` };
      }
      
      return { 
        success: true, 
        message: `${timeGreeting}, ${userName}! I'm 🤖 OS Bot, your intelligent real estate assistant. I'm connected to your CRM and ready to work. What's our first objective?` 
      };

    case 'capabilities':
      return { 
        success: true, 
        message: `I'm your intelligent OS Bot, ${userName}! 🤖 I'm specialized in helping you manage your CRM data efficiently. Here's exactly what I can do for you:\n\n` +
                 `🎯 **Lead Management**: I can add new leads, update their information, change deal status, or record notes to their profiles.\n` +
                 `💬 **Engagement**: Send SMS to your contacts instantly. Just say "Text John: Checking in!"\n` +
                 `📅 **Organization**: I can check your schedule, create tasks for today or in the future (e.g., "remind me in 3 days"), and aggregate your daily pipeline.\n` +
                 `📊 **Insights**: Ask me about your lead count, overdue tasks, or hot deals.\n` +
                 `🧠 **Learning**: I remember your preferences and facts you tell me so I can better assist you over time.\n\n` +
                 `What would you like to tackle first?`
      };

    case 'help':
      return { 
        success: true, 
        message: "Try these commands:\n- 'Add a note to John: Likes morning calls'\n- 'Mark John as Hot Lead'\n- 'Tell me about Sarah'\n- 'Remember that I prefer dark mode'\n- 'Thanks, bot!'" 
      };

    default:
      return { success: false, message: `Action "${action}" triggered, but logic is still being connected.` };
  }
}
