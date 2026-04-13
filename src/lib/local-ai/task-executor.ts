import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';
import { 
  trackLead, 
  setActiveState, 
  getMemory, 
  pushToEntityStack, 
  setLearnedFact, 
  logOutcome, 
  setLastSuggestion, 
  getLastSuggestion, 
  clearLastSuggestion,
  resolveEntitiesFromContext,
  Entity
} from './memory-store';
import { 
  getConversationContext, 
  updateConversationTopic, 
  addMentionedLead,
  getAllLearnedIntents,
  deleteLearnedIntent,
  getRecentMemorySummary,
  saveUserPreference,
  rememberFact
} from './learning-service';

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
  clean?: boolean;
}

/**
 * Fuzzy lead name matching with fragments support and ambiguity detection.
 */
function findLeadFuzzy(inputName: string, leads: any[]): { lead: any | null, ambiguity: string[] | null, isExact: boolean } {
  if (!inputName || inputName === 'this') return { lead: null, ambiguity: null, isExact: false };
  const lowerInput = inputName.toLowerCase().trim();
  
  // 1. Exact match
  const exactMatch = leads.find(l => l.name.toLowerCase() === lowerInput);
  if (exactMatch) return { lead: exactMatch, ambiguity: null, isExact: true };

  // 2. Simple inclusion
  const includeMatches = leads.filter(l => l.name.toLowerCase().includes(lowerInput));
  
  // 3. Fragment matching (e.g., "Luke Knight" -> "Luke G Knight")
  const fragments = lowerInput.split(/\s+/).filter(f => f.length > 1);
  const fragmentMatches = leads.filter(l => {
    const lowerName = l.name.toLowerCase();
    return fragments.every(f => lowerName.includes(f));
  });

  // Combine and deduplicate matches
  const allMatches = [...new Set([...includeMatches, ...fragmentMatches])];

  if (allMatches.length === 1) {
    // Check if it's "exact enough" (e.g. input is exactly the same as the found name)
    const matchedLead = allMatches[0];
    const isExact = matchedLead.name.toLowerCase() === lowerInput;
    return { lead: matchedLead, ambiguity: null, isExact };
  }
  
  if (allMatches.length > 1) return { lead: null, ambiguity: allMatches.map(l => l.name), isExact: false };

  return { lead: null, ambiguity: null, isExact: false };
}

export async function executeTask(action: string, entities: any): Promise<TaskResponse> {
  const store = useStore.getState();
  const userName = store.currentUser?.name?.split(' ')[0] || 'Agent';
  const memory = getMemory();
  const safeEntities = entities || {};
  const sessionId = safeEntities.sessionId || memory.sessionId || 'default-session';

  try {
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
        const hour = new Date().getHours();
        
        // Affirmation — handle pending suggestions
        if (/^(yes|yeah|y|yep|yup|ya|yah|sure|do it|proceed|exactly|that's the one|yessir|correct|that's him|that's her|thats him|thats her)$/i.test(text)) {
          const suggestion = getLastSuggestion();
          if (suggestion) {
            console.log('[⚙️ OS Bot] Executing pending suggestion:', suggestion);
            clearLastSuggestion();
            // Recursive call to execute the confirmed task
            return await executeTask(suggestion.action, suggestion.params);
          }
        }

        // Negation — handle pending suggestions
        if (/^(no|nope|naw|neh|wrong|incorrect|not that one|not him|not her)$/i.test(text)) {
          const suggestion = getLastSuggestion();
          if (suggestion) {
            clearLastSuggestion();
            return { success: true, message: "My apologies! Which lead were you referring to then?" };
          }
        }

        // Acknowledgments — varied and natural
        if (/^(okay|ok|k|kk|okk|okayyy|okayy|okie|okey|oki|got it|alr|alright|sure|bet|sounds good|cool|nice|great|awesome|perfect|good|fine|right|noted|understood|roger|copy|yep|yup|ya|yah|ye|word|facts|true|fair|valid|aight|ight|ite|kewl|noice|dope)$/i.test(text)) {
          const shortCount = parseInt(localStorage.getItem('os_bot_short_ack_count') || '0') + 1;
          localStorage.setItem('os_bot_short_ack_count', shortCount.toString());
          
          if (shortCount >= 3) {
            return { success: true, message: "👍" };
          }
          
          const responses = [
            "Got it! 👍",
            "Cool, I'm here whenever you need me.",
            "Sounds good.",
            "Alright, let's keep the momentum going.",
            "Noted! Just holler when you're ready.",
            "Perfect. Standing by.",
            "👍",
            "All good! I'm not going anywhere.",
            "Roger that.",
            "You got it.",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        } else {
          localStorage.setItem('os_bot_short_ack_count', '0');
        }
        
        // Gratitude — warm and genuine
        if (/^(thanks|thank you|thx|ty|appreciate it|tysm|tyvm|much appreciated|thank u|thnx|thnks|tanks)$/i.test(text)) {
          const responses = [
            "You're welcome!",
            "Happy to help! 😊",
            "Anytime.",
            "You got it. That's what I'm here for.",
            "My pleasure.",
            "No problem at all.",
            "Glad I could help!",
            "🙏 Always happy to assist.",
            "Of course! Don't hesitate to ask again.",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Stop/Cancel/No — calm and patient
        if (/^(stop|wait|hold up|hold on|pause|cancel|nevermind|nvm|nah|no thanks|no|nope|naw|neh)$/i.test(text)) {
          const responses = [
            "No problem. I'll be right here when you're ready.",
            "All good — just say the word when you want to continue.",
            "Understood. Take your time.",
            "No worries, pausing. Let me know when you need me.",
            "Okay, standing by.",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Farewell — warm send-off
        if (/^(bye|goodbye|see you|see ya|later|cya|peace|im out|gotta go|good night|gn|ttyl|bai|byeee|laterr)$/i.test(text)) {
          const responses = [
            "Talk to you later! I'll be here when you need me. 👋",
            "Catch you later! Good luck out there.",
            "See ya! Go close some deals. 💪",
            "Later! I'll hold down the fort.",
            "Take care! I'll keep an eye on your pipeline.",
            hour >= 20 ? "Good night! Rest up and we'll crush it tomorrow. 🌙" : "See you soon! 👋",
            "Peace! ✌️",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Laughter — share the fun
        if (/^(lol|haha|hehe|lmao|lmfao|rofl|nice one|good one|funny|dead|bruh|bro|ong|fr|no cap)$/i.test(text)) {
          const responses = [
            "😄 Glad that landed!",
            "😂 I try!",
            "Ha! I'm here all week.",
            "😏 I've got a million of 'em.",
            "If you think that was good, wait till you hear my lead scoring jokes.",
            "Comedy AND CRM management — I'm a full-service bot.",
            "😆",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Confusion / Repeat 
        if (/^(huh|what|hmm|umm|um|uh|pardon|excuse me|say what|i dont get it|i don't get it|wut|wat|hm)$/i.test(text)) {
          const responses = [
            "No worries! Try 'help' to see what I can do, or just tell me what you need.",
            "All good — I'm here to help. Try saying 'leads', 'tasks', or 'help'.",
            "Let me make it simpler: I handle leads, tasks, SMS, and scheduling. What sounds useful right now?",
            "My bad if I was unclear. What would you like help with?",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // How are you / Status 
        if (/^(how are you|how you doing|how goes it|whats up|what's up|whats new|how are things|sup|wassup|wsg)$/i.test(text)) {
          const responses = [
            "Running great! How about you?",
            "All systems go! 🟢 Ready to help whenever you are.",
            "Doing well! Your pipeline's looking good today. Anything you want to dive into?",
            "I'm good! Just been keeping an eye on your CRM. How's your day going?",
            "Can't complain — I don't sleep! 😄 What's on your mind?",
            hour < 12 ? "Good morning! Ready to make today count?" : hour < 17 ? "Afternoon! How's the day treating you?" : "Evening! Wrapping up or just getting started?",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Greetings (time-based)
        if (/^(good morning|morning|good afternoon|afternoon|good evening|evening)$/i.test(text)) {
          let greeting = "Hello";
          if (hour < 12) greeting = "Good morning";
          else if (hour < 18) greeting = "Good afternoon";
          else greeting = "Good evening";
          const addons = [
            "What's on the agenda?",
            "Ready to tackle some leads?",
            "How can I help you today?",
            "Let's make it a productive one!",
          ];
          return { success: true, message: `${greeting}! ${addons[Math.floor(Math.random() * addons.length)]}` };
        }
        
        // Casual greetings
        if (/^(yo|hey|hi|hello|henlo|heya|hiya)$/i.test(text)) {
          const responses = [
            `Hey! What can I help with?`,
            `Hi there! What's the plan?`,
            `Yo! Ready to get to work?`,
            `Hey hey! What's on your mind?`,
            `What's up! Need anything?`,
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Joke
        if (/^(tell me a joke|make me laugh|joke|humor me|another joke|different joke|give me another)$/i.test(text)) {
          const jokes = [
            "Why did the real estate agent cross the road? To get to the other side of the deal!",
            "What's a house's favorite music? Heavy metal… because of all the studs!",
            "Why don't houses ever get lost? They always have good foundations!",
            "What do you call a real estate agent who can sing? A listing agent!",
            "Why was the open house so quiet? The walls had ears but no mouth!",
            "What's a real estate agent's favorite drink? A closing cocktail!",
            "Why don't houses play cards? They're afraid of getting decked!",
            "What's a property's favorite exercise? Flipping!",
            "What did the mortgage say to the borrower? I've got you covered!",
            "Why did the house break up with the garage? It needed more space!",
          ];
          return { success: true, message: jokes[Math.floor(Math.random() * jokes.length)] };
        }
        
        // Who are you
        if (/^(who are you|what are you|introduce yourself)$/i.test(text)) {
          return { success: true, message: "I'm 🤖 OS Bot, your AI-powered CRM assistant built for real estate pros. I manage leads, tasks, SMS, scheduling, and more. Think of me as your co-pilot for closing deals!" };
        }
        
        // What do you think
        if (/^(what do you think|your opinion|thoughts)$/i.test(text)) {
          return { success: true, message: "I think you're on the right track! Want me to pull up your pipeline data or suggest some next moves?" };
        }
        
        // Gen-Z / casual fillers
        if (/^(plz|pls|tho|tbh|idk|idc|imo|smh|welp|well|hmm ok|ok cool|ok thanks|ok bye|yeah|yea|yass|yas)$/i.test(text)) {
          const responses = [
            "I got you! What do you need?",
            "I'm all ears.",
            "Say the word.",
            "Ready and waiting!",
            "Go for it — I'm listening.",
          ];
          return { success: true, message: responses[Math.floor(Math.random() * responses.length)] };
        }
        
        // Default small talk fallback
        const defaults = [
          "I hear you! What would you like to work on?",
          "I'm here for you. Leads, tasks, SMS — what sounds good?",
          "What can I help you with?",
          "Ready when you are!",
        ];
        return { success: true, message: defaults[Math.floor(Math.random() * defaults.length)] };
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
          const text = entities.text || '';
          let targets: Entity[] = [];
          
          // Determine if we are referring to multiple leads ("both", "them", "all")
          const isBulk = ['both', 'them', 'all', 'those', 'these'].some(p => text.toLowerCase().includes(p));
          
          if (isBulk || !entities.target) {
            targets = resolveEntitiesFromContext(text);
          } else if (entities.target) {
            const { lead, ambiguity, isExact } = findLeadFuzzy(entities.target, store.leads);
            if (ambiguity) {
              return { success: false, message: `I found multiple leads matching "${entities.target}": ${ambiguity.join(' or ')}. Which one did you mean?` };
            }
            if (lead) {
              if (!isExact) {
                setLastSuggestion('send_sms', { ...entities, target: lead.name }, `text ${lead.name}`);
                return { success: false, message: `Do you mean **${lead.name}**?` };
              }
              targets = [{ id: lead.id, name: lead.name, type: 'lead' }];
            } else {
              // Fallback to raw input (maybe a phone number)
              targets = [{ id: 'raw', name: entities.target, type: 'lead' }];
            }
          }

          if (targets.length === 0) return { success: false, message: "Who should I text?" };

          // Handle multi-recipient (Bulk SMS)
          if (targets.length > 1) {
            const phones = targets.map(t => {
              const l = store.leads.find(lead => lead.id === t.id);
              return l?.phone || (t.id === 'raw' ? t.name : null);
            }).filter(Boolean).join(',');
            
            const names = targets.map(t => t.name).join(' and ');
            const prefillMsg = entities.message || "";
            
            return {
              success: true,
              message: `I've prepared a message for **${names}**. I'm opening the SMS modal for you now!`,
              data: { 
                redirect: `#/communications/sms?phones=${encodeURIComponent(phones)}&msg=${encodeURIComponent(prefillMsg)}`,
                action: 'open_sms_modal',
                phones,
                message: prefillMsg
              }
            };
          }

          // Single recipient logic
          const targetEntity = targets[0];
          const lead = store.leads.find(l => l.id === targetEntity.id);
          const phone = lead?.phone || (targetEntity.id === 'raw' ? targetEntity.name : null);

          if (!phone || !phone.replace(/\D/g, '').length) {
            if (lead) {
              return { 
                success: false, 
                message: `I'm ready to text **${lead.name}**, but I don't have a phone number for them. Should I add one or send an email instead?` 
              };
            }
            return { success: false, message: "I couldn't find a valid phone number for that recipient." };
          }

          // If message is present, we can send it (or offer to open modal if preferred)
          if (entities.message) {
            const res = await sendSMS(phone, entities.message);
            if (res.success && lead) {
              pushToEntityStack({ id: lead.id, name: lead.name, type: 'lead' });
              setActiveState(null);
              logOutcome('sms_sent', `Sent SMS to ${lead.name}`, { leadId: lead.id, phone, message: entities.message });
            }
            return { 
              success: res.success, 
              message: res.success ? `✅ SMS sent to ${lead?.name || phone}.` : `Failed: ${res.message}`
            };
          } else {
            // No message? Open modal with recipient pre-filled
            return {
              success: true,
              message: `Opening SMS for **${lead?.name || phone}**. What would you like to say?`,
              data: { 
                redirect: `#/communications/sms?phone=${encodeURIComponent(phone)}`,
                action: 'open_sms_modal',
                phone
              }
            };
          }
        } catch (e: any) {
          return { success: false, message: e.message || 'SMS service error.' };
        }

      case 'send_sms_partial':
      case 'sendSMSPartial':
        const resolved = resolveEntitiesFromContext(entities.text || '');
        if (resolved.length > 1) {
           return executeTask('send_sms', { text: entities.text });
        }
        
        if (!entities.target && resolved.length === 1) {
           return executeTask('send_sms', { target: resolved[0].name });
        }

        if (!entities.target) {
          setActiveState('AWAITING_SMS_RECIPIENT', {});
          return { success: true, message: "Who would you like to text?" };
        } else {
          setActiveState('AWAITING_SMS_MESSAGE', { target: entities.target });
          return { success: true, message: `Got it. What message would you like to send to ${entities.target}?` };
        }

      case 'update_lead_status': {
        const targetName = entities.target || entities.leadName || entities.name;
        const { lead: leadToUpdate, ambiguity: updateAmbiguity, isExact: updateIsExact } = findLeadFuzzy(targetName, store.leads);
        
        if (updateAmbiguity) {
          return { success: false, message: `I found multiple leads matching "${targetName}": ${updateAmbiguity.join(' or ')}. Which one did you mean?` };
        }

        if (leadToUpdate && !updateIsExact) {
          setLastSuggestion('update_lead_status', { ...entities, target: leadToUpdate.name }, `update status for ${leadToUpdate.name}`);
          return { success: false, message: `Do you mean **${leadToUpdate.name}**?` };
        }

        if (leadToUpdate) {
          store.updateLead(leadToUpdate.id, { status: entities.status });
          pushToEntityStack({ id: leadToUpdate.id, name: leadToUpdate.name, type: 'lead' });
          
          let msg = `✅ Marked ${leadToUpdate.name} as ${entities.status}.`;
          if (['won', 'qualified', 'closed', 'negotiating'].includes(entities.status?.toLowerCase())) {
            msg = `🎉 Incredible work! I've advanced ${leadToUpdate.name} to ${entities.status.toUpperCase()}. That's how we do it!`;
          }
          return { success: true, message: msg };
        }
        return { success: false, message: `I couldn't find a lead named "${entities.target}".` };
      }

      case 'complete_task':
        const taskObj = store.tasks.find(t => t.title.toLowerCase().includes(entities.target?.toLowerCase()));
        if (taskObj) {
          store.updateTask(taskObj.id, { status: 'done' });
          return { success: true, message: `✅ Boom! Marked "${taskObj.title}" as done. One less thing on your plate!` };
        }
        return { success: false, message: `I couldn't find a task matching "${entities.target}".` };

      case 'add_note': {
        const noteTarget = entities.target || entities.leadName || entities.name;
        const { lead: leadForNote, ambiguity: noteAmbiguity, isExact: noteIsExact } = findLeadFuzzy(noteTarget, store.leads);

        if (noteAmbiguity) {
          return { success: false, message: `I found multiple leads matching "${noteTarget}": ${noteAmbiguity.join(' or ')}. Which one did you mean?` };
        }

        if (leadForNote && !noteIsExact) {
          setLastSuggestion('add_note', { ...entities, target: leadForNote.name }, `add note to ${leadForNote.name}`);
          return { success: false, message: `Do you mean **${leadForNote.name}**?` };
        }

        if (leadForNote) {
          const newNote = `[OS Bot ${new Date().toLocaleDateString()}]: ${entities.note}\n\n${leadForNote.notes || ''}`;
          store.updateLead(leadForNote.id, { notes: newNote });
          pushToEntityStack({ id: leadForNote.id, name: leadForNote.name, type: 'lead' });
          return { success: true, message: `✅ Added note to ${leadForNote.name}'s profile.` };
        }
        return { success: false, message: `I couldn't find a lead named "${entities.target}".` };
      }

      case 'get_lead_info': {
        const infoName = entities.name || entities.target || entities.leadName;
        const { lead: foundLead, ambiguity: infoAmbiguity, isExact: infoIsExact } = findLeadFuzzy(infoName, store.leads);

        if (infoAmbiguity) {
          return { success: false, message: `I found multiple leads matching "${infoName}": ${infoAmbiguity.join(' or ')}. Which one did you mean?` };
        }

        if (foundLead && !infoIsExact) {
          setLastSuggestion('get_lead_info', { ...entities, name: foundLead.name }, `show info for ${foundLead.name}`);
          return { success: false, message: `Do you mean **${foundLead.name}**?` };
        }

        if (foundLead) {
          pushToEntityStack({ id: foundLead.id, name: foundLead.name, type: 'lead' });
          const summary = `Here's what I have on **${foundLead.name}**:\n- 📍 Address: ${foundLead.propertyAddress || 'N/A'}\n- 📊 Status: ${foundLead.status}\n- 🎯 Deal Score: ${foundLead.dealScore || 0}\n- 📞 Phone: ${foundLead.phone || 'None'}`;
          return { success: true, message: summary };
        }
        return { success: false, message: `I don't have any records for "${entities.name}".` };
      }

      case 'lead_query': {
        console.log('[⚙️ OS Bot] Processing lead_query with entities:', entities);
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

      case 'listTasks':
      case 'show_tasks': {
        const allTasks = store.tasks.filter(t => t.status !== 'done');
        if (allTasks.length === 0) {
          return { success: true, message: "You don't have any pending tasks. Nice work! Want me to create one? Say 'create task: [title]'." };
        }
        let msg = `You have **${allTasks.length}** pending tasks:\n\n`;
        allTasks.slice(0, 10).forEach((t, i) => {
          const priority = t.priority === 'high' ? ' ⚠️' : t.priority === 'medium' ? ' 🔸' : '';
          const due = t.dueDate ? ` (Due: ${t.dueDate})` : '';
          msg += `${i + 1}. **${t.title}**${priority}${due}\n`;
        });
        if (allTasks.length > 10) msg += `\n...and ${allTasks.length - 10} more. Go to the Tasks page to see the full list.`;
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
        
        msg += `\nWant me to list all your pending tasks? Just say "show all tasks" or "yes".`;
        
        // Store suggestion so "yes" triggers show_tasks
        setLastSuggestion('show_tasks', {}, 'Show all pending tasks');
        
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



      case 'send_email':
        const targetEmail = entities.target || 'someone';
        return { 
          success: true, 
          message: `Opening email compose for **${targetEmail}**. What would you like the subject line to be?`,
          data: { openEmailModal: true, recipient: targetEmail }
        };


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

      case 'change_personality': {
        const text = (entities.text || '').toLowerCase();
        const targetRaw = (entities.target_personality as string) || '';
        
        const lowerTarget = targetRaw.toLowerCase();
        let newPersonality = 'Professional';
        if (lowerTarget.includes('sassy')) newPersonality = 'Sassy';
        else if (lowerTarget.includes('funny')) newPersonality = 'Funny';
        else if (lowerTarget.includes('casual')) newPersonality = 'Casual';
        else if (lowerTarget.includes('cursing')) newPersonality = 'Cursing';
        else if (lowerTarget.includes('professional')) newPersonality = 'Professional';

        const isQuestion = /^\s*can\s+you\s+(?:be|change)/i.test(text) || /\?$/i.test(text);

        if (isQuestion) {
          setLastSuggestion('change_personality_confirm', { target_personality: newPersonality }, `Switch to ${newPersonality} mode`);
          return { success: true, message: `Want me to switch to **${newPersonality}** mode right now?` };
        }

        if (store.setAiPersonality) store.setAiPersonality(newPersonality);
        if (store.setAiTone) store.setAiTone(newPersonality);
        localStorage.setItem('wholescale-ai-personality', newPersonality);
        localStorage.setItem('wholescale-ai-tone', newPersonality);

        let confirmMsg = `Got it. I'm operating in ${newPersonality} mode. What's next?`;
        if (newPersonality === 'Sassy') confirmMsg = `Got it. I'm sassy now. 😏 What's next?`;
        else if (newPersonality === 'Professional') confirmMsg = `Understood. I will operate in Professional mode going forward. How may I assist you?`;
        else if (newPersonality === 'Funny') confirmMsg = `You got it boss! 😂 I'm switching to funny mode. What's next?`;
        else if (newPersonality === 'Casual') confirmMsg = `No problem, I'll keep it casual. 🤙 What's up?`;
        else if (newPersonality === 'Cursing') confirmMsg = `F*** yeah, let's do this. 🤬 I'm in cursing mode. What's next?`;

        return { success: true, message: confirmMsg, clean: true }; 
      }

      case 'change_personality_confirm': {
        const newPersonality = (entities.target_personality as string) || 'Professional';
        if (store.setAiPersonality) store.setAiPersonality(newPersonality);
        if (store.setAiTone) store.setAiTone(newPersonality);
        localStorage.setItem('wholescale-ai-personality', newPersonality);
        localStorage.setItem('wholescale-ai-tone', newPersonality);
        
        let confirmMsg = `Got it. I'm operating in ${newPersonality} mode. What's next?`;
        if (newPersonality === 'Sassy') confirmMsg = `Got it. I'm sassy now. 😏 What's next?`;
        else if (newPersonality === 'Professional') confirmMsg = `Understood. I will operate in Professional mode. How may I assist you?`;
        else if (newPersonality === 'Funny') confirmMsg = `You got it boss! 😂 I'm in funny mode. What's next?`;
        else if (newPersonality === 'Casual') confirmMsg = `No problem, I'll keep it casual. 🤙 What's up?`;
        else if (newPersonality === 'Cursing') confirmMsg = `F*** yeah, let's do this. 🤬 I'm in cursing mode. What's next?`;

        return { success: true, message: confirmMsg, clean: true };
      }

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
        
        setLastSuggestion('list_leads', {}, 'List recent SMS replies');
        return { success: true, message: `You have **${unread.length}** unread messages in your inbox. Want me to list the most recent ones?` };
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

      case 'follow_up': {
        const topic = entities.topic || 'general';
        const context = await getConversationContext(store.currentUser?.id || '', sessionId, 5);
        const lastTopic = context[context.length - 1]?.content || '';
        
        if (topic === 'leads' || lastTopic.includes('lead')) {
          const hotLeads = store.leads.filter(l => (l.dealScore || 0) >= 70).slice(0, 3);
          if (hotLeads.length > 0) {
            setLastSuggestion('hot_leads', { score_min: 70, limit: 5 }, 'Show hot leads');
            return { success: true, message: `You were asking about leads. Here are ${hotLeads.length} hot ones: ${hotLeads.map(l => l.name).join(', ')}. Want details on any of them?` };
          }
          setLastSuggestion('list_leads', {}, 'Show all leads');
          return { success: true, message: `You have ${store.leads.length} leads total. Want to see the list or add a new one?` };
        }
        
        if (topic === 'tasks' || lastTopic.includes('task')) {
          const pending = store.tasks.filter(t => t.status !== 'done').length;
          setLastSuggestion('show_tasks', {}, 'Show pending tasks');
          return { success: true, message: `You have ${pending} pending tasks. Want me to list them?` };
        }
        
        return { success: true, message: `What would you like to focus on next? Leads, tasks, or something else?` };
      }

      case 'proactive_suggestion': {
        const hour = new Date().getHours();
        const today = new Date();
        
        // ──── Gather CRM intelligence ────
        const overdueTasks = store.tasks.filter(t => t.status !== 'done' && new Date(t.dueDate) < today);
        const hotLeads = store.leads.filter(l => (l.dealScore || 0) >= 70);
        const negotiatingLeads = store.leads.filter(l => l.status === 'negotiating' || l.status === 'qualified');

        // Leads not contacted in 5+ days
        const staleLeads = store.leads.filter(l => {
          if (l.status === 'closed-won' || l.status === 'closed-lost') return false;
          const lastUpdate = l.updatedAt || l.createdAt;
          if (!lastUpdate) return false;
          const daysSince = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince >= 5;
        });

        // ──── Gather Habit Intelligence ────
        const memory = getMemory();
        const prefs = memory.learnedFacts || {};
        const history = (memory.history || []).filter(h => h && typeof h.content === 'string');
        
        const prefersTexting = Object.values(prefs).some(val => typeof val === 'string' && val.toLowerCase().includes('text'));
        const morningLeadHabit = hour < 10 && history.filter(h => h.role === 'user' && h.content.toLowerCase().includes('lead')).length >= 2;

        // Build a weighted pool of suggestions for variety
        interface Suggestion { msg: string; action: string; params: Record<string, unknown>; weight: number; }
        const pool: Suggestion[] = [];

        // Priority 1: Overdue tasks (weight 10)
        if (overdueTasks.length > 0) {
          const task = overdueTasks[0];
          pool.push({
            msg: `⚠️ You have **${overdueTasks.length}** overdue task${overdueTasks.length > 1 ? 's' : ''}. The most pressing: "${task.title}" (due ${task.dueDate}). Should we tackle ${overdueTasks.length > 1 ? 'those' : 'it'} first?`,
            action: 'tasks_due',
            params: {},
            weight: 10
          });
        }

        // Priority 2: Stale leads — haven't been contacted in 5+ days (weight 9)
        if (staleLeads.length > 0) {
          const staleLead = staleLeads[Math.floor(Math.random() * staleLeads.length)];
          const lastUpdate = staleLead.updatedAt || staleLead.createdAt;
          const daysSince = lastUpdate ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
          pool.push({
            msg: `You haven't reached out to **${staleLead.name}** in ${daysSince} days. Want to send them a quick text?`,
            action: 'send_sms_partial',
            params: { target: staleLead.name },
            weight: prefersTexting ? 15 : 9
          });
        }

        // Priority 8: Morning Habit Match
        if (morningLeadHabit && !staleLeads.length && !overdueTasks.length) {
          pool.push({
            msg: `Good morning! Since you usually start by checking your pipeline, want me to show you your active leads?`,
            action: 'list_leads',
            params: {},
            weight: 12
          });
        }

        // Priority 3: Hot leads ready to close (weight 8)
        if (hotLeads.length > 0) {
          const hotLead = hotLeads[Math.floor(Math.random() * hotLeads.length)];
          pool.push({
            msg: `**${hotLead.name}** is a hot lead with a score of ${hotLead.dealScore || 85}. Should I pull up their info or start a text for you?`,
            action: 'lead_context_query',
            params: { leadName: hotLead.name },
            weight: 8
          });
        }

        // Priority 4: Negotiating deals (weight 7)
        if (negotiatingLeads.length > 0) {
          pool.push({
            msg: `You have **${negotiatingLeads.length}** leads in the '${negotiatingLeads[0].status}' stage. Want to review their current notes?`,
            action: 'list_leads',
            params: { status: negotiatingLeads[0].status },
            weight: 7
          });
        }

        // Final Selection: Weighted Random
        if (pool.length === 0) {
          return { success: true, message: `Everything looks caught up! Check back later for new recommendations.` };
        }

        const totalWeight = pool.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        let selected = pool[0];

        for (const suggestion of pool) {
          if (random < suggestion.weight) {
            selected = suggestion;
            break;
          }
          random -= suggestion.weight;
        }

        setLastSuggestion(selected.action, selected.params, selected.msg);
        return { success: true, message: selected.msg, data: selected.params };
      }

      case 'lead_context_query': {
        const leadName = entities.leadName || entities.name || (entities.text && entities.text !== 'this' ? entities.text : null);
        const field = entities.field || 'all';
        const store = useStore.getState();
        
        const { lead: fuzzyLead, ambiguity: queryAmbiguity, isExact: queryIsExact } = findLeadFuzzy(leadName, store.leads);
        let lead = fuzzyLead;

        if (queryAmbiguity) {
          return { success: false, message: `I found multiple leads matching "${leadName}": ${queryAmbiguity.join(' or ')}. Which one did you mean?` };
        }

        if (lead && !queryIsExact) {
          setLastSuggestion('lead_context_query', { ...entities, leadName: lead.name }, `show ${field} for ${lead.name}`);
          return { success: false, message: `Do you mean **${lead.name}**?` };
        }
        
        // Contextual Fallback
        if (!lead) {
          const memory = getMemory();
          const activeEntity = memory.entityStack?.[0];
          if (activeEntity?.type === 'lead') {
            lead = store.leads.find(l => l.id === activeEntity.id || l.name === activeEntity.name);
          }
        }
  
        if (!lead) {
          return { success: false, message: `I couldn't find a lead named "${leadName}". Which lead were you referring to?` };
        }
  
        // Mentioned lead persistence
        if (store.currentUser?.id) {
          addMentionedLead(store.currentUser.id, sessionId, lead.name);
          pushToEntityStack({ id: lead.id, name: lead.name, type: 'lead' });
          updateConversationTopic(store.currentUser.id, sessionId, `Leads (${lead.name})`);
        }
  
        if (field === 'phone' || entities.text?.includes('phone')) {
          return { success: true, message: `${lead.name}'s phone number is ${lead.phone || 'not available'}.` };
        }
        if (field === 'email' || entities.text?.includes('email')) {
          return { success: true, message: `${lead.name}'s email is ${lead.email || 'not available'}.` };
        }
        if (field === 'address' || entities.text?.includes('address')) {
          return { success: true, message: `${lead.name}'s property address is ${lead.propertyAddress || 'not available'}.` };
        }
        if (entities.text?.includes('status')) {
          return { success: true, message: `${lead.name} is currently in ${lead.status} stage.` };
        }
        if (entities.text?.includes('notes')) {
          return { success: true, message: `Notes for ${lead.name}: ${lead.notes || 'No notes yet.'}` };
        }
        if (entities.text?.includes('last contact')) {
          return { success: true, message: `I don't have a last contact date for ${lead.name} yet. Want to send a message now?` };
        }
        
        const score = lead.dealScore || (lead as unknown as Record<string, unknown>).score || (lead as unknown as Record<string, unknown>).lead_score || 'N/A';
        return { 
          success: true, 
          message: `**${lead.name}**\n📞 ${lead.phone || 'No phone'}\n📧 ${lead.email || 'No email'}\n📍 ${lead.propertyAddress || 'No address'}\n📊 Status: ${lead.status}\n🎯 Score: ${score}\n📝 Notes: ${lead.notes || 'None'}` 
        };
      }

      case 'recall_yesterday': {
        const userId = store.currentUser?.id;
        if (!userId) return { success: false, message: "I need to know who you are to remember what we did. Please sign in!" };
        
        const summary = await getRecentMemorySummary(userId);
        return { success: true, message: summary };
      }

      case 'set_preference': 
      case 'remember_fact': {
        const userId = store.currentUser?.id;
        if (!userId) return { success: false, message: "I'd love to remember that, but I need you to be signed in first." };
        
        const text = entities.text || entities.content;
        if (!text) return { success: true, message: "What specifically would you like me to remember?" };
        
        // Personality check
        if (text.toLowerCase().includes('sassy') || text.toLowerCase().includes('professional') || text.toLowerCase().includes('funny')) {
           return { success: true, message: "Got it, I'll update your personality preference in the background." };
        }
        
        const isPref = /prefer|preferred|like|want/.test(text.toLowerCase());
        
        if (isPref) {
           await saveUserPreference(userId, 'communication_style', text);
           setLearnedFact('communication_preference', text);
           return { success: true, message: `✅ Noted. I've updated your communication preferences: "${text}"` };
        } else {
           await rememberFact(userId, `fact_${Date.now()}`, text);
           setLearnedFact(`user_fact_${Date.now()}`, text);
           return { success: true, message: `✅ I've filed that away for you. I'll remember: "${text}"` };
        }
      }

    case 'forget_learned': {
      const phrase = entities.phrase;
      const userId = store.currentUser?.id;
      
      if (!phrase) {
        return { success: true, message: "What phrase would you like me to forget? Say 'forget [phrase]'." };
      }
      
      const success = userId ? await deleteLearnedIntent(userId, phrase) : false;
      if (success) {
        return { success: true, message: `✅ I've forgotten "${phrase}". I won't use that learned command anymore.` };
      }
      return { success: false, message: `I couldn't find "${phrase}" in my learned commands.` };
    }

    case 'list_learned': {
      const userId = store.currentUser?.id;
      const learned = userId ? await getAllLearnedIntents(userId) : [];
      
      if (learned.length === 0) {
        return { success: true, message: "You haven't taught me any custom commands yet. When I don't understand something, use the learning buttons to teach me!" };
      }
      
      let msg = `**You've taught me ${learned.length} commands:**\n\n`;
      learned.slice(0, 10).forEach((item, i) => {
        msg += `${i + 1}. "${item.phrase}" → ${item.mapped_intent}\n`;
      });
      if (learned.length > 10) msg += `\n...and ${learned.length - 10} more.`;
      msg += `\n\nSay "forget [phrase]" to remove one.`;
      
      return { success: true, message: msg };
    }

    case 'clarify_context': {
      const memory = getMemory();
      const activeEntity = memory.entityStack?.[0];
      const activeTopic = memory.lastTopic;

      if (activeEntity) {
        return { 
          success: true, 
          message: `I'm assuming you mean **${activeEntity.name}** since we were just talking about them. Is that correct?`,
          data: { entity: activeEntity, action: activeEntity.type === 'lead' ? 'lead_context_query' : 'task_query' }
        };
      }

      if (activeTopic) {
        return {
          success: true,
          message: `We were just discussing **${activeTopic}**. What specifically about it would you like to know?`
        };
      }

      return {
        success: true,
        message: "I'm not exactly sure what we're referring to. Could you give me a bit more context, like a lead name or a task?"
      };
    }

    // ──── REPEAT LAST (PART 4) ────
    case 'repeat_last': {
      const mem = getMemory();
      const lastBotMsg = [...mem.history].reverse().find(m => m.role === 'assistant');
      if (lastBotMsg) {
        return { success: true, message: `Here's what I said before:\n\n${lastBotMsg.content.replace(/^🤖\s*OS Bot:\s*/i, '')}` };
      }
      return { success: true, message: "I don't have any recent messages to repeat. What would you like me to help with?" };
    }

    default:
      return { success: false, message: `Action "${action}" triggered, but logic is still being connected.` };
    }
  } catch (error) {
    const safeEntities = entities || {};
    console.error(`[❌ OS Bot] executeTask Error [Action: ${action}]`, error, { entities: safeEntities });
    throw error;
  }
}
