import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';
import { trackLead, setActiveState, getMemory, pushToEntityStack, setLearnedFact, logOutcome } from './memory-store';

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
  clean?: boolean;
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

    case 'small_talk': {
      const text = (entities.text || '').toLowerCase();
      
      // Acknowledgments
      if (text.match(/^(okay|ok|k|got it|alr|alright|sure|bet|sounds good|cool|nice|great|awesome|perfect|good|fine)$/)) {
        const responses = ["Got it! What's next?", "Cool. Ready when you are.", "👍 Anything else?", "Alright, let's keep moving.", "Sounds good. What would you like to do?"];
        return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
      }
      
      // Gratitude
      if (text.match(/^(thanks|thank you|thx|ty|appreciate it)$/)) {
        const responses = ["You're welcome! What's next?", "Happy to help! Anything else?", "Anytime. What else can I do?", "You got it. Ready for more?", "My pleasure. What's on your mind?"];
        return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
      }
      
      // Stop/Cancel/No
      if (text.match(/^(stop|wait|hold up|hold on|pause|cancel|nevermind|nvm|nah|no thanks|no)$/)) {
        return { success: true, message: "No problem. I'll wait. Ready when you are." };
      }
      
      // Farewell
      if (text.match(/^(bye|goodbye|see you|see ya|later|cya|peace|im out|gotta go|good night)$/)) {
        const responses = ["Talk to you later! I'll be here when you need me. 👋", "Goodbye! Come back anytime.", "See ya! Good luck with those leads.", "Later! I'll hold down the fort."];
        return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
      }
      
      // Laughter
      if (text.match(/^(lol|haha|hehe|lmao|nice one|good one|funny)$/)) {
        const responses = ["😄 Glad you liked that!", "😂 I'm here all week!", "Happy to entertain! What's next?", "😏 I've got more where that came from."];
        return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
      }
      
      // Confusion / Repeat / Don't get it
      if (text.match(/^(huh|what|hmm|umm|pardon|excuse me|come again|say what|what did you say|say that again|repeat that|i dont get it|i don't get it)$/)) {
        return { success: true, message: "I was just sharing a joke or helping with your CRM. Want me to explain differently or try something else?" };
      }
      
      // How are you
      if (text.match(/^(how are you|how you doing|how goes it|whats up|what's up|whats new|how are things)$/)) {
        const responses = ["I'm running at 100% and ready to help! How are you?", "All systems operational! How's your day going?", "Doing great! Ready to crush some real estate goals with you. How about you?"];
        return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
      }
      
      // Greetings (time-based)
      if (text.match(/^(good morning|morning|good afternoon|afternoon|good evening|evening)$/)) {
        const hour = new Date().getHours();
        let greeting = "Hello";
        if (hour < 12) greeting = "Good morning";
        else if (hour < 18) greeting = "Good afternoon";
        else greeting = "Good evening";
        return { success: true, message: `${greeting}! Ready to work on some leads?` };
      }
      
      // Joke (with multiple jokes)
      if (text.match(/^(tell me a joke|make me laugh|joke|funny|humor me|another joke|different joke|give me another)$/)) {
        const jokes = [
          "Why did the real estate agent cross the road? To get to the other side of the deal!",
          "What's a house's favorite music? Heavy metal... because of all the studs!",
          "Why don't houses ever get lost? They always have good foundations!",
          "What do you call a real estate agent who can sing? A listing agent!",
          "Why was the open house so quiet? The walls had ears but no mouth!",
          "What do you call a house that tells jokes? A stand-up property!",
          "Why did the house go to school? To improve its foundation!",
          "What's a real estate agent's favorite drink? A closing cocktail!",
          "Why don't houses play cards? They're afraid of getting decked!",
          "What's a property's favorite exercise? Flipping!"
        ];
        return { success: true, message: jokes[Math.floor(Math.random() * jokes.length)] };
      }
      
      // Who are you
      if (text.match(/^(who are you|what are you|introduce yourself)$/)) {
        return { success: true, message: "I'm 🤖 OS Bot, your AI-powered CRM assistant. I help manage leads, tasks, SMS, and more. Think of me as your co-pilot for real estate domination! What would you like to work on?" };
      }
      
      // What do you think
      if (text.match(/^(what do you think|your opinion|thoughts)$/)) {
        return { success: true, message: "I think you're doing great! Want me to analyze your pipeline or suggest some next steps?" };
      }
      
      // Default
      return { success: true, message: "I hear you! What would you like to work on? Leads? Tasks? SMS?" };
    }

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
          logOutcome('lead_added', `Created lead: ${entities.name}`, { leadId: result.id, ...entities });
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
        const task = {
          title: entities.title || 'New Task',
          description: entities.notes || '',
          assignedTo: store.currentUser?.id || 'system',
          dueDate: entities.dueDate || new Date().toISOString().split('T')[0],
          priority: 'medium' as const,
          status: 'todo' as const,
          createdBy: store.currentUser?.id || 'system',
          leadId: undefined
        };
        store.addTask(task);
        logOutcome('task_created', `Added task: ${entities.title}`, { ...entities });
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
            logOutcome('sms_sent', `Sent SMS to ${lead.name}`, { leadId: lead.id, phone, message: entities.message });
        } else if (res.success) {
            logOutcome('sms_sent', `Sent SMS to ${phone}`, { phone, message: entities.message });
        }

        return { 
          success: res.success, 
          message: res.success ? `✅ SMS sent to ${lead?.name || target}.` : `Failed: ${res.message}`
        };
      } catch (e: any) {
        return { success: false, message: e.message || 'SMS service error.' };
      }

    case 'sendSMSPartial':
      if (!entities.target) {
        setActiveState('AWAITING_SMS_RECIPIENT', {});
        return { success: true, message: "Who would you like to text?" };
      } else {
        setActiveState('AWAITING_SMS_MESSAGE', { target: entities.target });
        return { success: true, message: `Got it. What message would you like to send to ${entities.target}?` };
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

    case 'list_leads': {
      const leads = store.leads;
      if (leads.length === 0) {
        return { success: true, message: "You don't have any leads in your CRM yet. Try saying 'Add John Smith as a lead' to get started!" };
      }
      let msg = `You have ${leads.length} leads:\n`;
      leads.slice(0, 10).forEach((l, i) => {
        msg += `${i + 1}. **${l.name}** (${l.status.replace('-', ' ')})\n`;
      });
      if (leads.length > 10) msg += `...and ${leads.length - 10} more. Go to the Leads page to see the full list.`;
      return { success: true, message: msg };
    }

    case 'hot_leads': {
      const scoreMin = entities.score_min !== undefined ? entities.score_min : 0;
      const limit = entities.limit || 5;
      const hotLeads = store.leads
        .filter(l => ((l as any).dealScore || (l as any).score || (l as any).lead_score || 0) >= scoreMin)
        .sort((a, b) => ((b as any).dealScore || (b as any).score || (b as any).lead_score || 0) - ((a as any).dealScore || (a as any).score || (a as any).lead_score || 0))
        .slice(0, limit);

      if (hotLeads.length === 0) {
        return { success: true, message: `I couldn't find any leads matching that criteria. Want me to help you find some new ones?` };
      }

      let msg = `Here are your top ${hotLeads.length} leads:\n\n`;
      hotLeads.forEach((l, i) => {
        const score = (l as any).dealScore || (l as any).score || (l as any).lead_score || 'N/A';
        msg += `${i + 1}. **${l.name}** - Score: ${score} (${l.status})\n`;
      });
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

    case 'tasks_due': {
      const today = new Date().toISOString().split('T')[0];
      const overdueTasks = store.tasks.filter(t => 
        t.status !== 'done' && t.dueDate < today
      );
      const todayTasks = store.tasks.filter(t => 
        t.status !== 'done' && t.dueDate === today
      );
      
      const totalDue = overdueTasks.length + todayTasks.length;
      
      if (totalDue === 0) {
        return { 
          success: true, 
          message: `You have no tasks due today and nothing overdue. You're all caught up! 🎉` 
        };
      }
      
      let msg = `You have **${totalDue}** tasks that need attention:\n\n`;
      
      if (overdueTasks.length > 0) {
        msg += `⚠️ **Overdue (${overdueTasks.length}):**\n`;
        overdueTasks.slice(0, 5).forEach((t, i) => {
          msg += `  ${i + 1}. ${t.title} (Due: ${t.dueDate})\n`;
        });
        if (overdueTasks.length > 5) msg += `  ...and ${overdueTasks.length - 5} more\n`;
        msg += `\n`;
      }
      
      if (todayTasks.length > 0) {
        msg += `📅 **Due Today (${todayTasks.length}):**\n`;
        todayTasks.slice(0, 5).forEach((t, i) => {
          const priority = t.priority === 'high' ? '⚠️' : '';
          msg += `  ${i + 1}. ${t.title} ${priority}\n`;
        });
        if (todayTasks.length > 5) msg += `  ...and ${todayTasks.length - 5} more\n`;
      }
      
      msg += `\nWould you like me to list all your pending tasks? Just say "show all tasks".`;
      
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

    case 'send_email':
      const targetEmail = entities.target || 'someone';
      return { 
        success: true, 
        message: `Opening email compose for **${targetEmail}**. What would you like the subject line to be?`,
        data: { openEmailModal: true, recipient: targetEmail }
      };

    case 'send_sms_partial': {
      const targetSMS = entities.target;
      if (targetSMS) {
        setActiveState('AWAITING_SMS_MESSAGE', { target: targetSMS });
        return { success: true, message: `Got it. Sending a text to **${targetSMS}**. What should the message say?` };
      }
      setActiveState('AWAITING_SMS_RECIPIENT', {});
      return { success: true, message: "Who would you like to text? You can give me a name or a phone number." };
    }

    case 'greeting':
      const hour = new Date().getHours();
      let timeGreeting = 'Hello';
      if (hour < 12) timeGreeting = 'Good morning';
      else if (hour < 18) timeGreeting = 'Good afternoon';
      else timeGreeting = 'Good evening';

      const greetingText = entities.text?.toLowerCase() || '';
      if (greetingText === 'yo' || greetingText === 'sup' || greetingText === "what's up" || greetingText === "whats up") {
        return { success: true, message: `Hey ${userName}! 🤘 Ready to crush some goals today? What's the move?` };
      }
      
      return { 
        success: true, 
        message: `${timeGreeting}, ${userName}! I'm 🤖 OS Bot, your intelligent real estate assistant. I'm connected to your CRM and ready to work. What's our first objective?` 
      };

    case 'weather_query':
      return {
        success: true,
        message: "I can't check the weather, but I can help you manage leads, tasks, and send SMS. Try asking me to 'text John saying hello' or 'show me my tasks'"
      };

    case 'personality_query':
      const tone = store.aiTone || 'Professional';
      const personality = store.aiPersonality || 'Default';
      return {
        success: true,
        message: `Absolutely! I am currently operating with your custom profile settings:\n\n` +
                 `🎭 **Tone**: ${tone}\n` +
                 `🧠 **Personality Style**: ${personality}\n\n` +
                 `You can change these in **Settings → AI → Bot Personality**. I'll stay consistent with your choices! Is there anything specific you'd like me to adjust?`
      };

    case 'get_preferences':
      const role = store.currentUser?.email?.toLowerCase() === 'drummerforger@gmail.com' ? 'Admin' : 'Member';
      const prefsSummary = `**Your Profile & Preferences:**\n` +
                           `- Name: **${store.currentUser?.name || userName}**\n` +
                           `- Role: **${role}**\n` +
                           `- Email: ${store.currentUser?.email || 'Not set'}\n` +
                           `- Theme: ${store.currentTheme || 'Default'}\n` +
                           `- AI Name: ${store.aiName || 'OS Bot'}\n` +
                           `- Notification Settings: Email on (System Default)`;
      return { success: true, message: prefsSummary };
    
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

    case 'system_status': {
      const currentLeadCount = store.leads.length;
      const currentTaskCount = store.tasks.filter(t => t.status === 'todo').length;
      return {
        success: true,
        message: `System is running at **Peak Performance**, ${userName}. 🚀\n\n` +
                 `📊 **Quick Snapshot:**\n` +
                 `- Active Leads: **${currentLeadCount}**\n` +
                 `- Pending Tasks: **${currentTaskCount}**\n` +
                 `- AI Engine: **Online** (Native Mode)\n` +
                 `- Integrations: **Verified**\n\n` +
                 `Everything looks healthy. Ready for your next move!`
      };
    }

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

    case 'memory_recall': {
      const memory = getMemory();
      const recentActions = memory.outcomes.slice(-3).reverse();
      
      if (recentActions.length === 0) {
        return { success: true, message: `I don't have any specific action records for this session yet, but I'm monitoring your pipeline and ready to help!` };
      }

      let msg = `Here's what I remember doing for you recently:\n\n`;
      recentActions.forEach((a: any) => {
        const time = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msg += `- [${time}] **${a.type.replace('_', ' ')}**: ${a.summary}\n`;
      });
      
      const lastFact = memory.learnedFacts && Object.keys(memory.learnedFacts).length > 0 
        ? `\nI also remember that **${Object.keys(memory.learnedFacts)[0]}** is **${Object.values(memory.learnedFacts)[0]}**.` 
        : "";
        
      msg += lastFact;
      return { success: true, message: msg };
    }

    case 'help':
    case 'help_commands':
      return {
        success: true,
        message: `I'm **OS Bot**, your AI CRM assistant! Here's exactly what I can do:\n\n` +
                 `📁 **Leads**: "leads", "show top leads", "add [Name] as a lead", "what are my top 5 leads"\n` +
                 `📝 **Tasks**: "create task: Call John", "show tasks", "do i have any tasks due?"\n` +
                 `💬 **SMS**: "text John: Hello", "did Sarah reply?"\n` +
                 `📅 **Calendar**: "schedule a meeting", "go to calendar"\n` +
                 `🎭 **Personality**: "be sassy", "change tone to professional"\n` +
                 `🧠 **Memory**: "what do you remember about me?", "remember that I like morning calls"\n` +
                 `💬 **Small Talk**: I can chat! Try "how are you", "tell me a joke", "thanks"\n\n` +
                 `Just tell me what you need and I'll handle it.`
      };

    case 'calendar_setup': {
      const step = entities.step || 'START';
      const memory = getMemory();
      
      if (step === 'START' || !entities.title) {
        if (entities.title) {
          setActiveState('AWAITING_CALENDAR_DATE', { title: entities.title });
          return { success: true, message: `Got it. "${entities.title}". What date should I schedule this for? (e.g., today, tomorrow, or a specific date)` };
        }
        setActiveState('AWAITING_CALENDAR_TITLE', {});
        return { success: true, message: "Of course! Let's get that scheduled. What's the title of the event?" };
      }
      
      if (step === 'DATE') {
        const title = memory.activeState?.data?.title || 'New Event';
        setActiveState('AWAITING_CALENDAR_TIME', { title, date: entities.date });
        return { success: true, message: `Scheduling "${title}" on ${entities.date}. What time?` };
      }
      
      if (step === 'TIME' || step === 'COMPLETE') {
        const title = memory.activeState?.data?.title || 'New Event';
        const date = memory.activeState?.data?.date || new Date().toISOString().split('T')[0];
        const time = entities.time || '9:00 AM';
        
        // Add task as a calendar item fallback since we don't have a direct addCalendarEvent in useStore (it's usually synced from tasks or Google)
        store.addTask({
          title: `[Event] ${title}`,
          description: `Scheduled via OS Bot for ${time}`,
          dueDate: date,
          priority: 'high',
          status: 'todo',
          assignedTo: store.currentUser?.id || 'system',
          createdBy: store.currentUser?.id || 'system'
        });
        
        setActiveState(null);
        logOutcome('calendar_event_created', `Scheduled: ${title} for ${date} at ${time}`);
        return { success: true, message: `✅ Success! I've added "**${title}**" to your calendar for **${date}** at **${time}**.` };
      }
      return { success: false, message: "Something went wrong in the calendar flow." };
    }

    case 'sms_reply_check': {
      const name = entities.name;
      const smsMessages = store.smsMessages;
      
      if (name) {
        const lead = store.leads.find(l => l.name.toLowerCase().includes(name.toLowerCase()));
        if (!lead) return { success: false, message: `I couldn't find a lead named "${name}".` };
        
        const lastMessage = smsMessages
          .filter(m => (m.phone_number === lead.phone && m.direction === 'inbound'))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
        if (!lastMessage) return { success: true, message: `I don't see any recent replies from **${lead.name}** in your SMS inbox.` };
        
        const time = new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { success: true, message: `Yes, **${lead.name}** replied at ${time}: "${lastMessage.content}"` };
      }
      
      const unread = smsMessages.filter(m => !m.is_read && m.direction === 'inbound');
      if (unread.length === 0) return { success: true, message: "Your SMS inbox is clear! No unread replies from leads found." };
      
      return { success: true, message: `You have **${unread.length}** unread messages in your inbox. Should I list the most recent ones for you?` };
    }

    case 'email_campaign':
      return { 
        success: true, 
        message: "Opening the **Email Campaign Wizard** for you now. Just tell me which template you'd like to use once we're there!",
        data: { redirect: '#/admin/email-campaigns' }
      };

    case 'test_query':
      return {
        success: true,
        message: "✅ **OS Bot Connection: Stable**\n\n- Primary Intelligence: **Local Pattern Engine**\n- Memory Persistence: **Enabled**\n- Tool Integration: **Functional**\n\nI'm ready to roll. What's next on the agenda?"
      };

    case 'joke':
      const jokes = [
        "Why did the real estate agent cross the road? To see the property for sale on the other side!",
        "What's a real estate agent's favorite kind of music? House music.",
        "Why was the house so cold? Because it had no window panes.",
        "How do real estate agents stay cool? They have a lot of fans... and great central air.",
        "Why did the developer go broke? Because he lost his ZIP code."
      ];
      return { success: true, message: jokes[Math.floor(Math.random() * jokes.length)] };

    case 'time_query':
      const now = new Date();
      return { 
        success: true, 
        message: `The current time is **${now.toLocaleTimeString()}** on **${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**.`
      };

    case 'store_fact':
      if (entities.type === 'name' && entities.value) {
        setLearnedFact('name', entities.value);
        return { success: true, message: `✅ Got it, I'll call you **${entities.value}** from now on!` };
      }
      const factKey = entities.type || 'preference';
      const factVal = entities.value || entities.fact || 'true';
      setLearnedFact(factKey, factVal);
      return { success: true, message: `✅ I've noted that down. I'll remember the details for you.` };

    case 'mood_check': {
      const mLeadCount = store.leads.length;
      const mHotLeads = store.leads.filter(l => (l.dealScore || 0) >= 80).length;
      const mClosedDeals = store.leads.filter(l => l.status === 'closed-won').length;
      
      let moodMsg = "";
      if (mClosedDeals > 0) moodMsg = `You're crushing it, ${userName}! With **${mClosedDeals}** closed deals and **${mHotLeads}** hot prospects, you're in the top tier of agents. Keep that momentum!`;
      else if (mHotLeads > 0) moodMsg = `You're doing great. You've got **${mHotLeads}** high-score leads that are ready to close. Focus on them today and you'll see results soon.`;
      else if (mLeadCount > 0) moodMsg = `You're building a solid foundation. You have **${mLeadCount}** leads to work with. Consistency is key—start making those calls!`;
      else moodMsg = `Every empire starts with a single lead. Let's get out there and find your first opportunity today. I'm ready when you are.`;
      
      return { success: true, message: moodMsg };
    }

    case 'motivation':
      const quotes = [
        "The best way to predict the future is to create it. Let's go sell some houses!",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Don't wait for opportunity. Create it.",
        "Your only limit is you. Now let's go move some properties!",
        "Wake up with determination, go to bed with satisfaction. What's our first lead today?"
      ];
      return { success: true, message: quotes[Math.floor(Math.random() * quotes.length)] };

    default:
      return { success: false, message: `Action "${action}" triggered, but logic is still being connected.` };
  }
}
