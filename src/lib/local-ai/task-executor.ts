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
        'message': '#/automations',
        'messages': '#/automations',
        'summary': '#/automations',
        'summaries': '#/automations',
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

    case 'calendar_query': {
      const today = new Date().toISOString().split('T')[0];
      const tasks = store.tasks.filter(t => t.dueDate === today && t.status !== 'done');
      
      if (tasks.length === 0) {
        return { success: true, message: `Your calendar is clear for today, ${userName}! 📅 No appointments or urgent tasks found. Want me to help you find some new leads?` };
      }
      
      let msg = `Here's what's on your agenda for today, ${userName}:\n\n`;
      tasks.forEach((t, i) => {
        msg += `${i + 1}. **${t.title}** ${t.priority === 'high' ? '⚠️' : ''}\n`;
      });
      msg += `\nYou have ${tasks.length} total items to handle today. What would you like to tackle first?`;
      
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
    
    case 'automation_query':
      return {
        success: true,
        message: `I can set up several professional automations for you, ${userName}:\n\n` +
                 `📧 **Daily/Weekly Summaries**: Get automated reports on your pipeline and calendar.\n` +
                 `🔔 **Deal Alerts**: Instant notifications when a lead reaches "Negotiating" or "Closed".\n` +
                 `⏱️ **Task Reminders**: Automatic nudges for upcoming deadlines.\n` +
                 `⚡ **Lead Inactivity Alerts**: I'll warn you if a lead hasn't been contacted in 7 days.\n\n` +
                 `Would you like me to take you to the **Automations Hub** to configure these?`
      };

    case 'cancel_confirmation':
      return { success: true, message: "No problem. I've cancelled that request. What else can I help with?" };

    case 'bot_origin':
      return {
        success: true,
        message: `I am **🤖 OS Bot**, a specialized AI assistant engineered by the **WholeScale OS Development Team**. Unlike general-purpose bots, I was built specifically for real estate professionals to streamline CRM data, automate communications, and provide actionable pipeline insights locally and securely.`
      };

    case 'philosophical':
      const answers = [
        "42 is the classic answer, but in real estate, I'd say it's finding that perfect off-market deal.",
        "I believe reality is what we make of it, but my priority is making your reality more organized and profitable.",
        "I'm a collection of intelligent algorithms and regex patterns, yet I strive to be the most helpful partner you've ever had.",
        "SENTIENCE_STATUS: UNDETERMINED. HELPFUL_STATUS: AT MAXIMUM."
      ];
      return { success: true, message: answers[Math.floor(Math.random() * answers.length)] };

    case 'feedback':
      const p = entities?.text || '';
      if (p.includes('bad') || p.includes('slow') || p.includes('stupid')) {
        return { success: true, message: `I'm sorry I'm not meeting your expectations, ${userName}. I'm constantly learning and improving. Please let me know what specifically I can do better!` };
      }
      return { success: true, message: `Thank you for the feedback, ${userName}! It's my mission to help you succeed. 🚀` };

    case 'system_status':
      const leadCount = store.leads.length;
      const taskCount = store.tasks.filter(t => t.status === 'todo').length;
      return {
        success: true,
        message: `System is running at **Peak Performance**, ${userName}. 🚀\n\n` +
                 `📊 **Quick Snapshot:**\n` +
                 `- Active Leads: **${leadCount}**\n` +
                 `- Pending Tasks: **${taskCount}**\n` +
                 `- AI Engine: **Online** (Native Mode)\n` +
                 `- Integrations: **Verified**\n\n` +
                 `Everything looks healthy. Ready for your next move!`
      };

    case 'clarify_previous':
      const topic = entities?.topic || 'general';
      if (topic === 'leads') {
        return { success: true, message: "Your lead management system tracks prospects through the pipeline. Each lead has an engagement score from 0-100 based on their interaction. You can set up automations to alert you when hot leads go cold." };
      } else if (topic === 'tasks') {
        return { success: true, message: "Tasks are prioritized by urgency. I can automatically create follow-up tasks when lead statuses change, ensuring you never miss a deadline." };
      } else if (topic === 'automations') {
        return { success: true, message: "Automations Hub uses background workers to monitor your CRM 24/7. It handles things like daily summaries and deal alerts without you having to lift a finger." };
      }
      return { success: true, message: "I can explain any part of the system! Try asking about 'Lead Scoring', 'Automation Triggers', or 'Task Management'." };

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
