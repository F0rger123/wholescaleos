import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  processPrompt, 
  hasUserApiKey,
  createTask, 
  updateLeadStatusViaAI, 
  sendSMSViaAI 
} from '../lib/gemini';
import { 
  Bot, User, Send, Target, Sparkles, Check, Trash2, 
  UserPlus, Key, Loader2, AlertTriangle, 
  RefreshCw, Smartphone, Search, X, ArrowDown,
  Plus, MessageSquare, History, ChevronLeft, ChevronRight,
  Mic
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface AIBotMessage {
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
  const { 
    leads, currentUser, 
    aiUsage, incrementAiUsage,
    aiThreads, currentAiThreadId, aiMessages,
    createAiThread, deleteAiThread, setCurrentAiThread,
    updateAiThreadTitle, addAiMessage, clearAiThreadMessages
  } = useStore();
  
  const [debug, setDebug] = useState(false);
  const [currentModel, setCurrentModel] = useState('gemini-2.0-flash');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pendingAction, setPendingAction] = useState<{
    intent: string;
    data: any;
    response: string;
  } | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [aiName, setAiName] = useState('AI Assistant');
  const [rateLimit, setRateLimit] = useState<{ seconds: number; originalPrompt: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Thread Sidebar Search
  const [threadSearch, setThreadSearch] = useState('');

  // Guided Action Wizards State
  const [activeWizard, setActiveWizard] = useState<'lead' | 'sms' | 'task' | null>(null);
  const [wizardData, setWizardData] = useState<any>({});

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Derive messages from current thread
  const messages = (currentAiThreadId ? aiMessages[currentAiThreadId] : []) || [];

  // Clear pending prompt on load (Part 1 Fix)
  useEffect(() => {
    localStorage.removeItem('ai_pending_prompt');
  }, []);

  // Initialize threads if empty
  useEffect(() => {
    if (aiThreads.length === 0) {
      createAiThread('Main Conversation');
    } else if (!currentAiThreadId) {
      setCurrentAiThread(aiThreads[0].id);
    }
  }, [aiThreads, currentAiThreadId]);

  // Load AI personality and model
  const fetchModel = async () => {
    if (!currentUser?.id) return;
    const localModel = localStorage.getItem('user_gemini_model');
    if (localModel) setCurrentModel(localModel);
  };

  const loadPersonality = async () => {
    const localAiName = localStorage.getItem('user_ai_name');
    if (localAiName) setAiName(localAiName);
  };

  useEffect(() => {
    fetchModel();
    loadPersonality();
    const handleSettingsUpdate = () => {
      fetchModel();
      loadPersonality();
      setRateLimit(null);
    };
    window.addEventListener('ai-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('ai-settings-updated', handleSettingsUpdate);
  }, [currentUser]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

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
    const savedExpiry = localStorage.getItem('ai_rate_limit_expiry');
    if (savedExpiry) {
      const expiry = parseInt(savedExpiry);
      const now = Date.now();
      if (expiry > now) {
        setRateLimit({ 
          seconds: Math.ceil((expiry - now) / 1000), 
          originalPrompt: localStorage.getItem('ai_rate_limit_prompt') || '' 
        });
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (rateLimit && rateLimit.seconds > 0) {
      interval = setInterval(() => {
        setRateLimit(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
      }, 1000);
    } else if (rateLimit && rateLimit.seconds <= 0) {
      setRateLimit(null);
      localStorage.removeItem('ai_rate_limit_expiry');
    }
    return () => clearInterval(interval);
  }, [rateLimit?.seconds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDebug(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      if (isNearBottom || messages[messages.length - 1]?.role === 'user') {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (container) {
      setShowScrollButton(container.scrollHeight - container.scrollTop - container.clientHeight > 300);
    }
  };

  const pushMessage = (msg: Omit<AIBotMessage, 'id' | 'timestamp'>) => {
    if (!currentAiThreadId) return;
    addAiMessage(currentAiThreadId, {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    });
  };

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setPrompt(prev => prev + ' ' + transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const text = customPrompt || prompt;
    if (!text.trim() || loading || !currentAiThreadId || !hasKey) return;

    pushMessage({ role: 'user', content: text.trim() });
    setPrompt('');
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await processPrompt(text.trim(), history, currentModel, controller.signal);
      
      if (response.intent === 'rate_limit') {
        const retry = response.data?.retryAfter || 60;
        setRateLimit({ seconds: retry, originalPrompt: text });
        localStorage.setItem('ai_rate_limit_expiry', (Date.now() + retry * 1000).toString());
        pushMessage({ role: 'ai', content: `⚠️ Rate Limit Hit: ${response.response}` });
      } else {
        incrementAiUsage(currentModel);
        let clean = response.response || '';
        if (typeof clean === 'string' && clean.trim().startsWith('{')) {
          try {
            const p = JSON.parse(clean);
            if (p.response) clean = p.response;
          } catch (e) {}
        }

        pushMessage({ 
          role: 'ai', 
          content: clean, 
          intent: response.intent, 
          systemLog: debug ? JSON.stringify(response.data, null, 2) : undefined 
        });

        if (['update_status', 'update_lead', 'delete_lead', 'send_sms'].includes(response.intent)) {
          setPendingAction({ intent: response.intent, data: response.data, response: clean });
          if (response.data?.target) setLeadSearch(response.data.target);
        } else if (response.intent !== 'confirm_action') {
          executeAction(response.intent, response.data, clean);
        }

        if (messages.length <= 2) {
          updateAiThreadTitle(currentAiThreadId, text.substring(0, 30) + (text.length > 30 ? '...' : ''));
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        pushMessage({ role: 'ai', content: "Request cancelled by user.", intent: 'error' });
      } else {
        pushMessage({ role: 'ai', content: "Error communicating with the API.", intent: 'error' });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const executeAction = async (intent: string, data: any, aiResponse: string, confirmedLeadId?: string) => {
    let log = undefined;
    const finalData = confirmedLeadId ? { ...data, leadId: confirmedLeadId } : data;
    try {
      if (intent === 'create_task' && finalData) {
        createTask(finalData);
        log = `System: Created task '${finalData.title}'`;
      } else if (intent === 'update_status' && finalData?.leadId) {
        const res = updateLeadStatusViaAI(finalData.leadId, finalData.newStatus);
        log = `System: ${res.message}`;
      } else if (intent === 'send_sms' && finalData?.message) {
        setLoading(true);
        const res = await sendSMSViaAI(confirmedLeadId || finalData.target, finalData.message);
        log = `System: ${res.message}`;
      }

      pushMessage({ role: 'ai', content: aiResponse || "Action completed.", intent, data: finalData, systemLog: log });
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleTestConnection = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const resp = await processPrompt('ping', [], currentModel);
      pushMessage({ role: 'ai', content: `Test: ${resp.response}`, intent: 'test' });
    } catch (err: any) {
      pushMessage({ role: 'ai', content: `Test failed: ${err.message}`, intent: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (currentAiThreadId) clearAiThreadMessages(currentAiThreadId);
  };

  const quickPrompts = [
    { label: "New Lead", action: () => setActiveWizard('lead'), icon: <UserPlus className="w-3 h-3"/> },
    { label: "Send SMS", action: () => setActiveWizard('sms'), icon: <Smartphone className="w-3 h-3"/> },
    { label: "New Task", action: () => setActiveWizard('task'), icon: <Check className="w-3 h-3"/> },
    { label: "Update Status", prompt: "Mark the lead at 123 Main St as negotiating", icon: <Target className="w-3 h-3"/> },
    { label: "Delete Lead", prompt: "Delete the lead for 123 Main St", icon: <Trash2 className="w-3 h-3"/> },
    { label: "Team Status", prompt: "Who on the team is online right now?", icon: <User className="w-3 h-3"/> }
  ];

  if (hasKey === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] max-w-2xl mx-auto text-center px-4">
        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-500/20">
          <Key size={32} className="text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">AI Assistant Locked</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Configure your Gemini API key in settings to unlock these features.
        </p>
        <button
          onClick={() => navigate('/settings/ai')}
          className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          Setup AI Key Now
        </button>
      </div>
    );
  }

  if (hasKey === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // Calculate time until reset
  const now = new Date();
  const tonight = new Date(now);
  tonight.setHours(24, 0, 0, 0);
  const msRem = tonight.getTime() - now.getTime();
  const hrsRem = Math.floor(msRem / (1000 * 60 * 60));
  const minsRem = Math.floor((msRem % (1000 * 60 * 60)) / (1000 * 60));
  const resetTimer = `${hrsRem}h ${minsRem}m`;

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden">
      {/* Thread Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden relative shrink-0`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History size={16} className="text-brand-400" />
            History
          </h2>
          <button 
            onClick={() => createAiThread()}
            className="p-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg transition-colors"
            title="New Conversation"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3 h-3" />
            <input 
              type="text"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search threads..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-500/50 outline-none placeholder:text-slate-600 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {aiThreads
            .filter(t => t.title.toLowerCase().includes(threadSearch.toLowerCase()))
            .map((t) => (
            <div 
              key={t.id}
              className={`group flex items-center gap-2 p-3 rounded-xl transition-all cursor-pointer ${
                currentAiThreadId === t.id ? 'bg-brand-500/10 text-white' : 'hover:bg-slate-800 text-slate-400'
              }`}
              onClick={() => setCurrentAiThread(t.id)}
            >
              <MessageSquare size={14} className={currentAiThreadId === t.id ? 'text-brand-400' : 'text-slate-500'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{t.title}</p>
                <p className="text-[10px] text-slate-500">{new Date(t.lastMessageAt).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteAiThread(t.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {aiThreads.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-600 italic">No threads yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* Toggle Sidebar Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-[240px] top-1/2 -translate-y-1/2 z-10 w-4 h-12 bg-slate-900 border border-slate-700 border-l-0 rounded-r-lg flex items-center justify-center text-slate-500 hover:text-white transition-all overflow-hidden"
        style={{ left: isSidebarOpen ? '256px' : '0' }}
      >
        {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 p-4" style={{ background: 'var(--t-background)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b shrink-0" style={{ borderColor: 'var(--t-border)', opacity: 0.8 }}>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
              <Sparkles className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
              {currentAiThreadId ? aiThreads.find(t => t.id === currentAiThreadId)?.title || aiName : aiName}
              <div className="ml-2 flex items-center gap-2 px-2 py-1 rounded-lg border" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
                <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Usage</div>
                <div className="text-xs font-bold" style={{ color: 'var(--t-primary)' }}>
                  {aiUsage[currentModel]?.used || 0}/{aiUsage[currentModel]?.limit || (currentModel.includes('pro') ? 10 : 20)}
                </div>
                <div className="group relative">
                  <AlertTriangle className="w-3 h-3 cursor-help" style={{ color: 'var(--t-text-muted)' }} />
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 mt-2 p-3 border rounded-xl text-[10px] w-56 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl leading-relaxed" 
                    style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text-secondary)' }}>
                    <div className="font-bold mb-1 uppercase tracking-wider" style={{ color: 'var(--t-text)' }}>Daily Quota Status</div>
                    <div className="flex justify-between mb-1">
                      <span>Model:</span>
                      <span style={{ color: 'var(--t-text)' }}>{currentModel}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Available:</span>
                      <span style={{ color: 'var(--t-primary)' }}>{aiUsage[currentModel]?.limit || 20}/day</span>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
                      <span style={{ color: 'var(--t-text-muted)' }}>Resets in:</span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--t-text)' }}>{resetTimer}</span>
                    </div>
                  </div>
                </div>
              </div>
            </h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleTestConnection}
              disabled={loading}
              className="text-[10px] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
              style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary-text)' }}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Test
            </button>
            <button 
              onClick={clearHistory}
              className="text-[10px] px-3 py-1.5 rounded-full transition-colors border"
              style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text-secondary)' }}
            >
              Clear
            </button>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto mb-4 rounded-2xl border p-4 space-y-6 relative scroll-smooth"
          style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', opacity: 0.9 }}
        >
          {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
              <Bot size={48} className="mb-4 animate-pulse" style={{ color: 'var(--t-primary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>How can I help you with your real estate OS today?</p>
            </div>
          )}
          {messages.map((msg: AIBotMessage) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" 
                style={{ background: msg.role === 'user' ? 'var(--t-primary)' : 'var(--t-secondary)' }}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              
              {/* Message Body */}
              <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'rounded-tr-none text-white' 
                    : 'border rounded-tl-none'
                }`} style={{ 
                  background: msg.role === 'user' ? 'var(--t-primary)' : 'var(--t-surface)',
                  borderColor: msg.role === 'user' ? 'transparent' : 'var(--t-border)',
                  color: msg.role === 'user' ? 'var(--t-on-primary)' : 'var(--t-text)'
                }}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                </div>
                
                {msg.role === 'ai' && msg.intent && msg.intent !== 'error' && msg.intent !== 'unknown' && msg.intent !== 'ask_question' && (
                  <div className="flex gap-2 items-center mt-2 px-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border" 
                      style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary-text)', borderColor: 'var(--t-primary-dim)' }}>
                      {msg.intent}
                    </span>
                  </div>
                )}
                
                {msg.systemLog && (
                  <div className="mt-2 border rounded-lg p-2 text-xs font-mono w-full text-left"
                    style={{ background: 'var(--t-surface-active)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                    {msg.systemLog}
                  </div>
                )}
                
                <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--t-text-muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Confirmation Guardrail UI */}
                {msg.role === 'ai' && msg.intent === 'confirm_action' && msg.data && (
                  <div className="mt-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Action Confirmation Required
                    </div>
                    <div className="flex gap-2">
                    <button
                        onClick={() => executeAction(msg.data.intent || 'unknown', msg.data, "Confirmed. Proceeding with your request.")}
                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2 rounded-lg transition-all"
                      >
                        Confirm & Execute
                      </button>
                      <button
                        onClick={() => currentAiThreadId && addAiMessage(currentAiThreadId, {
                          id: Date.now().toString(),
                          role: 'ai',
                          content: "Action cancelled.",
                          timestamp: new Date().toISOString()
                        })}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
          
          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="fixed bottom-32 right-8 md:right-[calc(50%-450px)] p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-600/20 transition-all animate-in fade-in slide-in-from-bottom-4 z-40"
              title="Scroll to bottom"
            >
              <ArrowDown size={20} />
            </button>
          )}
        </div>

        {/* Rate Limit Banner */}
        {rateLimit && (
          <div className="mb-4 border rounded-2xl p-4 flex gap-4 items-center animate-in fade-in slide-in-from-bottom-2 shrink-0"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--t-error)' }}>
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>Rate Limit Reached</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--t-text-secondary)' }}>
                You've reached your rate limit for the Gemini API. 
                Retrying in <span className="font-bold" style={{ color: 'var(--t-primary)' }}>{rateLimit.seconds}s</span>...
                <br />
                <span className="text-[10px] mt-1 block">
                  Upgrade your Google Cloud/AI Studio plan for higher limits. 
                  <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" className="ml-1 underline transition-colors" style={{ color: 'var(--t-primary)' }}>
                    Increase Limits
                  </a>
                </span>
              </p>
            </div>
            <button disabled className="px-4 py-2 rounded-xl text-xs opacity-50 flex items-center gap-2" style={{ background: 'var(--t-background)', color: 'var(--t-text-muted)' }}>
              <RefreshCw className="w-3 h-3" /> Cooldown active
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className={`p-4 rounded-2xl border transition-all shrink-0 ${rateLimit && !rateLimit.originalPrompt ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x px-1">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => item.action ? item.action() : item.prompt && setPrompt(item.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap snap-start group"
                  style={{ 
                    background: 'var(--t-background)', 
                    borderColor: 'var(--t-border)', 
                    color: 'var(--t-text-secondary)' 
                  }}
                >
                  <span className="group-hover:scale-110 transition-transform" style={{ color: 'var(--t-primary)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={rateLimit && rateLimit.seconds > 0 ? `Rate limit active... wait ${rateLimit.seconds}s` : (isRecording ? "Listening..." : "Type your message...")}
              className={`flex-1 border rounded-xl pl-4 pr-12 py-3 outline-none resize-none min-h-[50px] max-h-[150px] transition-all scrollbar-thin scrollbar-thumb-slate-700 ${isRecording ? 'shadow-xl' : ''}`}
              style={{ 
                background: 'var(--t-background)', 
                borderColor: isRecording ? 'var(--t-primary)' : 'var(--t-border)', 
                color: 'var(--t-text)',
                // @ts-expect-error custom css prop
                '--tw-shadow': isRecording ? '0 0 15px var(--t-primary-dim)' : 'none'
              }}
              rows={1}
              disabled={loading}
            />
            <button
              type="button"
              onClick={toggleRecording}
              className={`absolute right-16 bottom-[10px] p-2 rounded-lg transition-all ${isRecording ? 'animate-pulse' : 'hover:scale-110'}`}
              style={{ 
                color: isRecording ? 'var(--t-primary)' : 'var(--t-text-muted)',
                background: isRecording ? 'var(--t-primary-dim)' : 'transparent'
              }}
              title={isRecording ? "Stop Recording" : "Voice Typing"}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={loading || !prompt.trim() || !!(rateLimit && rateLimit.seconds > 0)}
              className="w-12 h-12 shrink-0 text-white rounded-xl flex items-center justify-center transition-all group shadow-lg active:scale-95 disabled:opacity-30"
              style={{ background: 'var(--t-primary)' }}
            >
              {loading ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="w-full h-full flex items-center justify-center bg-rose-600 hover:bg-rose-500 rounded-xl transition-all animate-pulse"
                  title="Stop Generating"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              ) : (
                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Lead Selection Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-400" />
                  Confirm Lead for Action
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">Intent: {pendingAction.intent.replace('_', ' ')}</p>
              </div>
              <button 
                onClick={() => { setPendingAction(null); setLoading(false); }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-slate-900/30 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                <input 
                  autoFocus
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none transition-all"
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
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs border border-slate-700">
                        {lead.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">
                          {lead.name || 'Unknown Lead'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{lead.propertyAddress || 'No address'}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                      lead.status === 'new' ? 'bg-blue-500/10 text-blue-400' :
                      lead.status === 'closed-won' ? 'bg-brand-500/10 text-brand-400' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {lead.status}
                    </span>
                  </button>
                ))
              }
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => { setPendingAction(null); setLoading(false); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeAction(pendingAction.intent, pendingAction.data, pendingAction.response)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors text-xs font-bold uppercase tracking-wider"
              >
                Skip Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Action Wizards */}
      {activeWizard === 'lead' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-400" />
                Add New Lead
              </h3>
              <button 
                onClick={() => setActiveWizard(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jessica Taylor"
                  onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Phone</label>
                  <input 
                    type="tel" 
                    placeholder="555-0199"
                    onChange={(e) => setWizardData({ ...wizardData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="jessica@example.com"
                    onChange={(e) => setWizardData({ ...wizardData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Property Address</label>
                <input 
                  type="text" 
                  placeholder="123 Main St, Anytown"
                  onChange={(e) => setWizardData({ ...wizardData, propertyAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex gap-3">
              <button 
                onClick={() => setActiveWizard(null)}
                className="flex-1 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  executeAction('create_lead', wizardData, "I've added the new lead for you.");
                  setActiveWizard(null);
                }}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors text-xs font-bold"
              >
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {activeWizard === 'sms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-brand-400" />
                Send SMS Message
              </h3>
              <button 
                onClick={() => setActiveWizard(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-slate-900/30 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search lead to text..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {leads
                .filter(l => l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch))
                .slice(0, 10)
                .map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => setWizardData({ ...wizardData, leadId: lead.id, leadName: lead.name })}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      wizardData.leadId === lead.id ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-[10px]">
                        {lead.name?.charAt(0) || 'U'}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">{lead.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500">{lead.phone || 'No phone'}</p>
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>

            <div className="p-4 space-y-3 border-t border-slate-800">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Message Content</label>
                <textarea 
                  rows={3}
                  placeholder={`Hi ${wizardData.leadName || 'there'}, ...`}
                  onChange={(e) => setWizardData({ ...wizardData, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveWizard(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  disabled={!wizardData.leadId || !wizardData.message}
                  onClick={() => {
                    executeAction('send_sms', { target: wizardData.leadId, message: wizardData.message }, "I've sent that SMS message for you.");
                    setActiveWizard(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white transition-colors text-xs font-bold"
                >
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeWizard === 'task' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Check className="w-5 h-5 text-brand-400" />
                Schedule New Task
              </h3>
              <button 
                onClick={() => setActiveWizard(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Task Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Call John Smith"
                  onChange={(e) => setWizardData({ ...wizardData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Due Date</label>
                  <input 
                    type="date" 
                    onChange={(e) => setWizardData({ ...wizardData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Priority</label>
                  <select 
                    onChange={(e) => setWizardData({ ...wizardData, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-brand-500/50 outline-none"
                  >
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex gap-3">
              <button 
                onClick={() => setActiveWizard(null)}
                className="flex-1 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  executeAction('create_task', wizardData, "I've scheduled that task for you.");
                  setActiveWizard(null);
                }}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors text-xs font-bold"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {debug && (
        <div className="fixed bottom-24 right-4 z-50 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-[10px] font-mono backdrop-blur-xl shadow-2xl max-w-xs animate-in slide-in-from-right-4">
          <div className="flex items-center gap-2 font-bold mb-3 text-brand-400 uppercase tracking-widest">
            <RefreshCw className="w-3 h-3 animate-spin-slow" /> DEBUG CONSOLE
          </div>
          <div className="space-y-1 text-slate-400">
            <div className="flex justify-between"><span>Thread ID:</span> <span className="text-white truncate max-w-[120px]">{currentAiThreadId}</span></div>
            <div className="flex justify-between"><span>Messages:</span> <span className="text-white">{messages.length}</span></div>
            <div className="flex justify-between"><span>Rate Limit:</span> <span className={rateLimit ? 'text-rose-400' : 'text-emerald-400'}>{rateLimit ? 'ACTIVE' : 'READY'}</span></div>
            <div className="flex justify-between border-t border-slate-800 mt-2 pt-2">
              <button 
                onClick={() => {
                  localStorage.removeItem('ai_threads');
                  localStorage.removeItem('ai_messages_map');
                  window.location.reload();
                }}
                className="text-rose-400 hover:text-rose-300 underline"
              >
                Factory Reset Threads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
