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
  Mic, Pin, Edit2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ConfirmModal } from '../components/ConfirmModal';

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
    updateAiThreadTitle, toggleAiThreadPin, addAiMessage, clearAiThreadMessages
  } = useStore();
  
  const [debug, setDebug] = useState(false);
  const [currentModel, setCurrentModel] = useState('gemini-1.5-flash');
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

  // Thread Sidebar Search & Editing
  const [threadSearch, setThreadSearch] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    variant?: 'primary' | 'danger';
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
    setLoading(true); // Fix duplicate responses by locking input immediately
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

        if (response.intent === 'confirm_action' && response.data) {
          setConfirmModal({
            isOpen: true,
            title: 'Confirm AI Action',
            message: response.response,
            onConfirm: () => executeAction(response.data.intent || 'unknown', response.data),
            confirmLabel: 'Confirm & Execute',
            variant: 'primary'
          });
        } else if (['update_status', 'update_lead', 'delete_lead', 'send_sms'].includes(response.intent)) {
          console.log(`AI Intent [${response.intent}] flagged for confirmation.`);
          setPendingAction({ intent: response.intent, data: response.data, response: clean });
          if (response.data?.target) setLeadSearch(response.data.target);
        } else {
          // Execute directly if no manual confirmation needed (for basic intents)
          executeAction(response.intent, response.data);
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

  const executeAction = async (intent: string, data: any, confirmedLeadId?: string) => {
    let log = undefined;
    const finalData = confirmedLeadId ? { ...data, leadId: confirmedLeadId } : data;
    try {
      if (intent === 'create_task' && finalData) {
        createTask(finalData);
        log = `System: Created task '${finalData.title}'`;
      } else if (intent === 'update_status' && finalData?.leadId) {
        const res = updateLeadStatusViaAI(finalData.leadId, finalData.newStatus);
        log = `System: ${res.message}`;
      } else if (intent === 'send_sms' && (finalData?.target || finalData?.leadId) && finalData?.message) {
        setLoading(true);
        const res = await sendSMSViaAI(
          confirmedLeadId || finalData.leadId || finalData.target, 
          finalData.message,
          finalData.targetCarrier
        );
        log = `System: ${res.message}`;
        if (!res.success) {
          pushMessage({ role: 'ai', content: `❌ SMS Failed: ${res.message}`, intent: 'error' });
          return;
        }
      }

      // ONLY push a new message if there is a system log to show, 
      // otherwise we already pushed the AI response in handleSendMessage.
      if (log) {
        pushMessage({ role: 'ai', content: log, intent, data: finalData, systemLog: log });
      }
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
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border"
          style={{ background: 'var(--t-primary-dim)', borderColor: 'var(--t-primary-dim)' }}
        >
          <Key size={32} style={{ color: 'var(--t-primary)' }} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">AI Assistant Locked</h2>
        <p className="text-[var(--t-text-muted)] mb-8 leading-relaxed">
          Configure your Gemini API key in settings to unlock these features.
        </p>
        <button
          onClick={() => navigate('/settings/ai')}
          className="text-white font-semibold px-8 py-3 rounded-xl transition-all flex items-center gap-2"
          style={{ background: 'var(--t-primary)' }}
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--t-primary)' }} />
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
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-[var(--t-surface)] border-r border-[var(--t-border)] transition-all duration-300 flex flex-col overflow-hidden relative shrink-0`}
      >
        <div className="p-4 border-b border-[var(--t-border)] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <History size={16} style={{ color: 'var(--t-primary)' }} />
            History
          </h2>
          <button 
            onClick={() => createAiThread()}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
            title="New Conversation"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)] w-3 h-3" />
            <input 
              type="text"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search threads..."
              className="w-full bg-[var(--t-background)] border border-[var(--t-border)] rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white outline-none placeholder:text-[var(--t-text-muted)] transition-all font-mono"
              style={{ 
                // @ts-expect-error custom prop
                '--tw-ring-color': 'var(--t-primary-dim)' 
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {aiThreads
            .filter(t => t.title.toLowerCase().includes(threadSearch.toLowerCase()))
            .map((t) => (
            <div 
              key={t.id}
              className="group flex items-center gap-2 p-3 rounded-xl transition-all cursor-pointer relative"
              style={currentAiThreadId === t.id ? { background: 'var(--t-primary-dim)', color: 'white' } : { color: 'var(--t-text-muted)' }}
              onClick={() => setCurrentAiThread(t.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {t.pinned ? (
                  <Pin size={12} className="shrink-0" style={{ color: 'var(--t-primary)', fill: 'var(--t-primary)' }} />
                ) : (
                  <MessageSquare size={14} style={currentAiThreadId === t.id ? { color: 'var(--t-primary)' } : { color: 'var(--t-text-muted)' }} />
                )}
                
                <div className="flex-1 min-w-0">
                  {editingThreadId === t.id ? (
                    <input
                      autoFocus
                      className="w-full bg-[var(--t-background)] border rounded px-1 py-0.5 text-xs text-white outline-none"
                      style={{ borderColor: 'var(--t-primary-dim)' }}
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        if (editingTitle.trim()) updateAiThreadTitle(t.id, editingTitle.trim());
                        setEditingThreadId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingTitle.trim()) updateAiThreadTitle(t.id, editingTitle.trim());
                          setEditingThreadId(null);
                        }
                        if (e.key === 'Escape') setEditingThreadId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <p className="text-xs font-medium truncate">{t.title}</p>
                      <p className="text-[10px] text-[var(--t-text-muted)]">{new Date(t.lastMessageAt).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleAiThreadPin(t.id); }}
                  className="p-1 transition-colors"
                  style={t.pinned ? { color: 'var(--t-primary)' } : { color: 'var(--t-text-muted)' }}
                  title={t.pinned ? "Unpin" : "Pin"}
                >
                  <Pin size={12} className={t.pinned ? "fill-current" : ""} style={t.pinned ? { fill: 'var(--t-primary)' } : {}} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingThreadId(t.id); setEditingTitle(t.title); }}
                  className="p-1 hover:text-white transition-colors"
                  style={{ color: 'var(--t-text-muted)' }}
                  title="Rename"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setConfirmModal({
                      isOpen: true,
                      title: 'Delete Thread',
                      message: `Are you sure you want to delete "${t.title}"? This action cannot be undone.`,
                      confirmLabel: 'Delete Thread',
                      variant: 'danger',
                      onConfirm: () => deleteAiThread(t.id)
                    });
                  }}
                  className="p-1 hover:text-[var(--t-error)] transition-colors text-[var(--t-text-muted)]"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {aiThreads.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-xs text-[var(--t-text-muted)] italic">No threads yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* Toggle Sidebar Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-[240px] top-1/2 -translate-y-1/2 z-10 w-4 h-12 bg-[var(--t-surface)] border border-[var(--t-border)] border-l-0 rounded-r-lg flex items-center justify-center text-[var(--t-text-muted)] hover:text-white transition-all overflow-hidden"
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


              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--t-primary)' }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-4 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] rounded-tl-none flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[var(--t-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[var(--t-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[var(--t-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
          
          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="fixed bottom-32 right-8 md:right-[calc(50%-450px)] p-3 text-white rounded-full shadow-lg transition-all animate-in fade-in slide-in-from-bottom-4 z-40"
              style={{ 
                background: 'var(--t-primary)',
                // @ts-expect-error custom prop
                '--tw-shadow-color': 'var(--t-primary-dim)'
              }}
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
                  className="w-full h-full flex items-center justify-center bg-[var(--t-error)] hover:bg-[var(--t-error-hover)] rounded-xl transition-all animate-pulse"
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
          <div className="border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="p-4 border-b flex items-center justify-between"
              style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}
            >
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                  Confirm Lead for Action
                </h3>
                <p className="text-[10px] mt-0.5 uppercase tracking-wider font-bold" style={{ color: 'var(--t-text-muted)' }}>Intent: {pendingAction.intent.replace('_', ' ')}</p>
              </div>
              <button 
                onClick={() => { setPendingAction(null); setLoading(false); }}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b" style={{ background: 'var(--t-background)', borderColor: 'var(--t-border)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
                <input 
                  autoFocus
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm transition-all"
                  style={{ 
                    background: 'var(--t-input-bg)', 
                    borderColor: 'var(--t-border)', 
                    color: 'var(--t-text)',
                    // @ts-expect-error custom prop
                    '--tw-ring-color': 'var(--t-primary)'
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ background: 'var(--t-background)' }}>
              {leads
                .filter(l => 
                  (l.name?.toLowerCase().includes(leadSearch.toLowerCase())) || 
                  (l.propertyAddress?.toLowerCase().includes(leadSearch.toLowerCase()))
                )
                .slice(0, 50)
                .map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Confirm Action',
                        message: `Proceed with ${pendingAction.intent.replace('_', ' ')} for ${lead.name || lead.propertyAddress}?`,
                        onConfirm: () => executeAction(pendingAction.intent, pendingAction.data, lead.id),
                        confirmLabel: 'Yes, Proceed'
                      });
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all group"
                    style={{ background: 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border"
                        style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
                      >
                        {lead.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold transition-colors" style={{ color: 'var(--t-text)' }}>
                          {lead.name || 'Unknown Lead'}
                        </p>
                        <p className="text-[10px] truncate max-w-[200px]" style={{ color: 'var(--t-text-muted)' }}>{lead.propertyAddress || 'No address'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full"
                      style={{ 
                        background: lead.status === 'new' ? 'var(--t-primary-dim)' : 
                                   lead.status === 'closed-won' ? 'var(--t-success-dim)' : 'var(--t-surface-hover)',
                        color: lead.status === 'new' ? 'var(--t-primary)' : 
                               lead.status === 'closed-won' ? 'var(--t-success)' : 'var(--t-text-muted)'
                      }}
                    >
                      {lead.status}
                    </span>
                  </button>
                ))
              }
            </div>

            <div className="p-4 border-t flex gap-3" style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}>
              <button 
                onClick={() => { setPendingAction(null); setLoading(false); }}
                className="flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Confirm Action',
                    message: `Proceed with ${pendingAction.intent.replace('_', ' ')} without selecting a lead?`,
                    onConfirm: () => executeAction(pendingAction.intent, pendingAction.data),
                    confirmLabel: 'Yes, Proceed'
                  });
                }}
                className="flex-1 py-2.5 rounded-xl text-white transition-colors text-xs font-bold uppercase tracking-wider"
                style={{ background: 'var(--t-secondary)' }}
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
          <div className="border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                Add New Lead
              </h3>
              <button 
                onClick={() => setActiveWizard(null)}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jessica Taylor"
                  onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                  className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                  style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Phone</label>
                  <input 
                    type="tel" 
                    placeholder="555-0199"
                    onChange={(e) => setWizardData({ ...wizardData, phone: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                    style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Email</label>
                  <input 
                    type="email" 
                    placeholder="jessica@example.com"
                    onChange={(e) => setWizardData({ ...wizardData, email: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                    style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Property Address</label>
                <input 
                  type="text" 
                  placeholder="123 Main St, Anytown"
                  onChange={(e) => setWizardData({ ...wizardData, propertyAddress: e.target.value })}
                  className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                  style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-3" style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}>
              <button 
                onClick={() => setActiveWizard(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold transition-colors"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  executeAction('create_lead', wizardData);
                  setActiveWizard(null);
                }}
                className="flex-1 py-2 rounded-xl text-white transition-colors text-xs font-bold"
                style={{ background: 'var(--t-primary)' }}
              >
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {activeWizard === 'sms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                Send SMS Message
              </h3>
              <button 
                onClick={() => setActiveWizard(null)}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 border-b" style={{ background: 'var(--t-background)', borderColor: 'var(--t-border)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
                <input 
                  type="text"
                  placeholder="Search lead to text..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none"
                  style={{ 
                    background: 'var(--t-input-bg)', 
                    borderColor: 'var(--t-border)', 
                    color: 'var(--t-text)',
                    '--tw-ring-color': 'var(--t-primary)'
                  } as any}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ background: 'var(--t-background)' }}>
              {leads
                .filter(l => l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.phone?.includes(leadSearch))
                .slice(0, 10)
                .map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => setWizardData({ ...wizardData, leadId: lead.id, leadName: lead.name })}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all border"
                    style={{ 
                      background: wizardData.leadId === lead.id ? 'var(--t-primary-dim)' : 'transparent',
                      borderColor: wizardData.leadId === lead.id ? 'var(--t-primary)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px]"
                        style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
                      >
                        {lead.name?.charAt(0) || 'U'}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: 'var(--t-text)' }}>{lead.name || 'Unknown'}</p>
                        <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>{lead.phone || 'No phone'}</p>
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>

            <div className="p-4 space-y-3 border-t" style={{ borderColor: 'var(--t-border)' }}>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Message Content</label>
                <textarea 
                  rows={3}
                  placeholder={`Hi ${wizardData.leadName || 'there'}, ...`}
                  onChange={(e) => setWizardData({ ...wizardData, message: e.target.value })}
                  className="w-full border rounded-xl px-4 py-2 text-sm outline-none resize-none"
                  style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveWizard(null)}
                  className="flex-1 py-2 rounded-xl border text-xs font-bold transition-colors"
                  style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
                >
                  Cancel
                </button>
                <button 
                  disabled={!wizardData.leadId || !wizardData.message}
                  onClick={() => {
                    executeAction('send_sms', { target: wizardData.leadId, message: wizardData.message });
                    setActiveWizard(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-white transition-colors text-xs font-bold disabled:opacity-50"
                  style={{ background: 'var(--t-primary)' }}
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
          <div className="border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--t-border)' }}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Check className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                Schedule New Task
              </h3>
              <button 
                onClick={() => setActiveWizard(null)}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                style={{ color: 'var(--t-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Task Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Call John Smith"
                  onChange={(e) => setWizardData({ ...wizardData, title: e.target.value })}
                  className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                  style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Due Date</label>
                  <input 
                    type="date" 
                    onChange={(e) => setWizardData({ ...wizardData, dueDate: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                    style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold ml-1" style={{ color: 'var(--t-text-muted)' }}>Priority</label>
                  <select 
                    onChange={(e) => setWizardData({ ...wizardData, priority: e.target.value })}
                    className="w-full border rounded-xl px-4 py-2 text-sm outline-none"
                    style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)', '--tw-ring-color': 'var(--t-primary)' } as any}
                  >
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3" style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}>
              <button 
                onClick={() => setActiveWizard(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-bold transition-colors"
                style={{ borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  executeAction('create_task', wizardData);
                  setActiveWizard(null);
                }}
                className="flex-1 py-2 rounded-xl text-white transition-colors text-xs font-bold"
                style={{ background: 'var(--t-primary)' }}
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {debug && (
        <div className="fixed bottom-24 right-4 z-50 p-4 bg-[var(--t-surface)]/90 border border-[var(--t-border)] rounded-2xl text-[10px] font-mono backdrop-blur-xl shadow-2xl max-w-xs animate-in slide-in-from-right-4">
          <div className="flex items-center gap-2 font-bold mb-3 text-[var(--t-primary)] uppercase tracking-widest">
            <RefreshCw className="w-3 h-3 animate-spin-slow" /> DEBUG CONSOLE
          </div>
          <div className="space-y-1 text-[var(--t-text-muted)]">
            <div className="flex justify-between"><span>Thread ID:</span> <span className="text-white truncate max-w-[120px]">{currentAiThreadId}</span></div>
            <div className="flex justify-between"><span>Messages:</span> <span className="text-white">{messages.length}</span></div>
            <div className="flex justify-between"><span>Rate Limit:</span> <span className={rateLimit ? 'text-[var(--t-error)]' : 'text-[var(--t-success)]'}>{rateLimit ? 'ACTIVE' : 'READY'}</span></div>
            <div className="flex justify-between border-t border-[var(--t-border)] mt-2 pt-2">
              <button 
                onClick={() => {
                  localStorage.removeItem('ai_threads');
                  localStorage.removeItem('ai_messages_map');
                  window.location.reload();
                }}
                className="text-[var(--t-error)] hover:text-[var(--t-error-hover)] underline"
              >
                Factory Reset Threads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
