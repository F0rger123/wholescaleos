import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  processPrompt, 
  hasUserApiKey,
  createTask, 
  updateLeadStatusViaAI, 
  createLeadViaAI, 
  updateLeadViaAI, 
  deleteLeadViaAI,
  sendSMSViaAI 
} from '../lib/gemini';
import { 
  Bot, User, Send, Target, Sparkles, Check, Trash2, 
  UserPlus, Key, Loader2, AlertTriangle, ExternalLink, 
  RefreshCw, Smartphone, Search, X 
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  intent?: string;
  data?: any;
  systemLog?: string;
}

export function AITest() {
  const navigate = useNavigate();
  const leads = useStore(state => state.leads);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    intent: string;
    data: any;
    response: string;
  } | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [rateLimit, setRateLimit] = useState<{ seconds: number; originalPrompt: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: '1',
        role: 'ai',
        content: "Hi! I'm your AI assistant. I can look up leads, manage tasks, update lead statuses, and see who's online on your team. How can I help you today?",
        timestamp: new Date().toISOString()
      }
    ];
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasKey === null) {
      async function checkKey() {
        const keyExists = await hasUserApiKey();
        setHasKey(keyExists);
      }
      checkKey();
    }
  }, [hasKey]);

  useEffect(() => {
    // Check for persisted rate limit on mount
    const savedExpiry = localStorage.getItem('ai_rate_limit_expiry');
    const savedPrompt = localStorage.getItem('ai_rate_limit_prompt');
    if (savedExpiry) {
      const expiry = parseInt(savedExpiry);
      const now = Date.now();
      if (expiry > now) {
        const remaining = Math.ceil((expiry - now) / 1000);
        setRateLimit({ seconds: remaining, originalPrompt: savedPrompt || '' });
      } else {
        localStorage.removeItem('ai_rate_limit_expiry');
        localStorage.removeItem('ai_rate_limit_prompt');
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (rateLimit && rateLimit.seconds > 0) {
      interval = setInterval(() => {
        setRateLimit(prev => {
          if (!prev || prev.seconds <= 0) return null;
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    } else if (rateLimit && rateLimit.seconds <= 0) {
      const p = rateLimit.originalPrompt;
      setRateLimit(null);
      localStorage.removeItem('ai_rate_limit_expiry');
      localStorage.removeItem('ai_rate_limit_prompt');
      if (p) {
        console.log('🔄 Auto-retrying rate limited prompt...');
        handleSubmit(undefined, p);
      }
    }
    return () => clearInterval(interval);
  }, [rateLimit?.seconds]);

  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    // Auto scroll to bottom smoothly
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim() || loading || !hasKey) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSubmit.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await processPrompt(textToSubmit, { 
        page: '/ai-test', 
        userRole: 'admin',
        currentTime: new Date().toISOString()
      });
      
      if (response.intent === 'redirect_setup') {
        setTimeout(() => navigate('/settings/ai'), 1500);
      } else if (response.intent === 'rate_limit') {
        const retrySeconds = response.data?.retryAfter || 60;
        setRateLimit({ seconds: retrySeconds, originalPrompt: textToSubmit });
        const expiry = Date.now() + (retrySeconds * 1000);
        localStorage.setItem('ai_rate_limit_expiry', expiry.toString());
        localStorage.setItem('ai_rate_limit_prompt', textToSubmit);
      }
      
      if (response.intent !== 'rate_limit') {
        const leadIntents = ['update_status', 'update_lead', 'delete_lead', 'send_sms'];
        const needsLead = leadIntents.includes(response.intent);
        
        if (needsLead) {
          setPendingAction({
            intent: response.intent,
            data: response.data,
            response: response.response || ''
          });
          // Pre-populate search with target if available
          if (response.data?.target) setLeadSearch(response.data.target);
          else if (response.data?.leadId) {
            const l = leads.find(lead => lead.id === response.data.leadId);
            if (l) setLeadSearch(l.name || '');
          }
        } else {
          executeAction(response.intent, response.data, response.response);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I encountered an error communicating with the API.",
        timestamp: new Date().toISOString(),
        intent: 'error'
      }]);
    } finally {
      if (!pendingAction) setLoading(false);
    }
  };

  const executeAction = async (intent: string, data: any, aiResponse: string, confirmedLeadId?: string) => {
    let systemLog = undefined;
    const finalData = confirmedLeadId ? { ...data, leadId: confirmedLeadId } : data;

    try {
      if (intent === 'create_task' && finalData) {
        createTask(finalData);
        systemLog = `System: Created task '${finalData.title}'`;
      } else if (intent === 'update_status' && finalData?.leadId && finalData?.newStatus) {
        const result = updateLeadStatusViaAI(finalData.leadId, finalData.newStatus);
        systemLog = `System: ${result.message}`;
      } else if (intent === 'create_lead' && finalData) {
        const result = createLeadViaAI(finalData);
        systemLog = `System: ${result.message}`;
      } else if (intent === 'update_lead' && finalData?.leadId) {
        const result = updateLeadViaAI(finalData.leadId, finalData);
        systemLog = `System: ${result.message}`;
      } else if (intent === 'delete_lead' && finalData?.leadId) {
        const result = deleteLeadViaAI(finalData.leadId);
        systemLog = `System: ${result.message}`;
      } else if (intent === 'send_sms' && (finalData?.target || finalData?.leadId) && finalData?.message) {
        setLoading(true);
        const target = confirmedLeadId || finalData.target;
        const result = await sendSMSViaAI(target, finalData.message);
        systemLog = `System: ${result.message}`;
      }

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        content: aiResponse || "Action completed.",
        timestamp: new Date().toISOString(),
        intent: intent,
        data: finalData,
        systemLog
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('ai_chat_history');
    setMessages([{
      id: Date.now().toString(),
      role: 'ai',
      content: "Chat history cleared. How can I help you today?",
      timestamp: new Date().toISOString()
    }]);
  };

  const quickPrompts = [
    { label: "New Lead", prompt: "Create a new lead for Jessica Taylor at 789 Pine Rd. Cell is 555-8888.", icon: <UserPlus className="w-3 h-3"/> },
    { label: "Update Status", prompt: "Mark the lead at 123 Main St as negotiating", icon: <Target className="w-3 h-3"/> },
    { label: "Create Task", prompt: "Create a task to call Jessica Taylor tomorrow", icon: <Check className="w-3 h-3"/> },
    { label: "Delete Lead", prompt: "Delete the lead for 123 Main St", icon: <Trash2 className="w-3 h-3"/> },
    { label: "Text Lead", prompt: "Text John Smith: I'm running 5 minutes late", icon: <Smartphone className="w-3 h-3"/> },
    { label: "Team Status", prompt: "Who on the team is online right now?", icon: <User className="w-3 h-3"/> }
  ];

  if (hasKey === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] max-w-2xl mx-auto text-center px-4">
        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20">
          <Key className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">AI Assistant Locked</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          To use the AI Assistant, you must first configure your personal Gemini API key in your settings. 
          This ensures you have full control over your AI usage and capabilities.
        </p>
        <button
          onClick={() => navigate('/settings/ai')}
          className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-8 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-600/20 flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Setup AI Key Now
        </button>
      </div>
    );
  }

  if (hasKey === null) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col mx-auto max-w-4xl h-[calc(100vh-73px)] p-4 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-400" />
            AI Assistant
          </h1>
          <p className="text-sm text-slate-400">Conversational interface with context awareness</p>
        </div>
        <button 
          onClick={clearHistory}
          className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors"
        >
          Clear History
        </button>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-4 bg-slate-900/40 rounded-2xl border border-slate-800 p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-brand-600' : 'bg-indigo-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            
            {/* Message Body */}
            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-brand-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              </div>
              
              {msg.role === 'ai' && msg.intent && msg.intent !== 'error' && msg.intent !== 'unknown' && msg.intent !== 'ask_question' && (
                <div className="flex gap-2 items-center mt-2 px-1">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                    {msg.intent}
                  </span>
                </div>
              )}
              
              {msg.systemLog && (
                <div className="mt-2 bg-slate-900 text-slate-400 border border-slate-800 rounded-lg p-2 text-xs font-mono w-full text-left">
                  {msg.systemLog}
                </div>
              )}
              
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-4 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-none flex items-center gap-1.5">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Rate Limit Banner */}
      {rateLimit && (
        <div className="mb-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex gap-4 items-center animate-in fade-in slide-in-from-bottom-2">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Rate Limit Reached</h3>
            <p className="text-xs text-slate-400 mt-1">
              You've reached your rate limit for the Gemini API. 
              Retrying in <span className="text-brand-400 font-bold">{rateLimit.seconds}s</span>...
              <br />
              <span className="text-[10px] mt-1 block">
                Upgrade your Google Cloud/AI Studio plan for higher limits. 
                <a 
                  href="https://ai.google.dev/gemini-api/docs/rate-limits" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 ml-1 inline-flex items-center gap-0.5 underline underline-offset-2"
                >
                  Increase Limits <ExternalLink size={10} />
                </a>
              </span>
            </p>
          </div>
          <button 
            disabled 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl text-xs text-slate-400 opacity-50"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            Queued
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className={`bg-slate-800/50 p-3 rounded-2xl border border-slate-700 transition-all ${rateLimit && !rateLimit.originalPrompt ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x px-1">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(item.prompt);
                  const ta = document.querySelector('textarea');
                  if (ta) {
                    ta.focus();
                    ta.value = item.prompt; // force update for immediate focus
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-brand-500/20 text-slate-300 hover:text-brand-300 text-xs rounded-full border border-slate-700 transition-colors whitespace-nowrap snap-start group"
              >
                <span className="text-brand-400 group-hover:scale-110 transition-transform">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap px-2">
            (click to edit prompt)
          </span>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2 items-end relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={rateLimit && rateLimit.originalPrompt ? "Your message is queued..." : "Type your message..."}
            className={`flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-200 resize-none min-h-[50px] max-h-[150px] transition-all ${rateLimit && rateLimit.originalPrompt ? 'bg-brand-500/5 italic' : ''}`}
            rows={1}
            disabled={loading || !!(rateLimit && rateLimit.originalPrompt)}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim() || !!(rateLimit && rateLimit.originalPrompt)}
            className="w-12 h-12 shrink-0 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors group relative overflow-hidden"
          >
            {rateLimit && rateLimit.originalPrompt ? (
              <RefreshCw className="w-5 h-5 animate-spin text-brand-400" />
            ) : (
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </button>
        </form>
      </div>

      {/* Lead Selection Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-400" />
                  Confirm Lead for Action
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">Intent: {pendingAction.intent.replace('_', ' ')}</p>
              </div>
              <button 
                onClick={() => { setPendingAction(null); setLoading(false); }}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-slate-800/30 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input 
                  autoFocus
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search leads by name or address..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {leads
                .filter(l => 
                  (l.name?.toLowerCase().includes(leadSearch.toLowerCase())) || 
                  (l.propertyAddress?.toLowerCase().includes(leadSearch.toLowerCase()))
                )
                .slice(0, 50)
                .map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => executeAction(pendingAction.intent, pendingAction.data, pendingAction.response, lead.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700 group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm">
                        {lead.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                          {lead.name || 'Unknown Lead'}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{lead.propertyAddress || 'No address'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        lead.status === 'new' ? 'bg-blue-500/10 text-blue-400' :
                        lead.status === 'closed-won' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {lead.status}
                      </span>
                      <p className="text-[10px] text-slate-500">{lead.phone || 'No phone'}</p>
                    </div>
                  </button>
                ))
              }
              {leads.filter(l => 
                  (l.name?.toLowerCase().includes(leadSearch.toLowerCase())) || 
                  (l.propertyAddress?.toLowerCase().includes(leadSearch.toLowerCase()))
                ).length === 0 && (
                <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                  <UserPlus className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No matching leads found.</p>
                  <p className="text-xs text-slate-600 mt-1">Try a different search term or add a new lead.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-800/20 flex gap-3">
              <button 
                onClick={() => { setPendingAction(null); setLoading(false); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeAction(pendingAction.intent, pendingAction.data, pendingAction.response)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors text-sm font-medium"
              >
                Execute Without Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
