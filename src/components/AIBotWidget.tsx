import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, 
  User, Key, Mic,
  Layout as LayoutIcon, Loader2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ConfirmModal } from './ConfirmModal';
import { processPrompt, hasUserApiKey, createTask, updateLeadStatusViaAI, createLeadViaAI, updateLeadViaAI, deleteLeadViaAI, sendSMSViaAI, generatePageInsights } from '../lib/gemini';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SaveLeadModal } from './SaveLeadModal';
import { RateLimitModal } from './RateLimitModal';
import { parseIntent } from '../lib/ai/intent-parser';
import { actionHandlers } from '../lib/ai/action-handlers';
import { formatTemplate } from '../lib/ai/template-engine';
import { UserLearningManager } from '../lib/ai/user-learning';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  intent?: string;
  data?: any;
  systemLog?: string;
}

export function AIBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  
  const { 
    currentUser, showFloatingAIWidget, incrementAiUsage,
    aiName, aiModel, setAiModel 
  } = useStore();
  const [isDocked, setIsDocked] = useState(() => {
    return localStorage.getItem('ai_widget_docked') === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('ai_widget_position');
    return saved ? JSON.parse(saved) : { x: 24, y: 24 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // SMS Session State — collects target + message without repeat-asking
  const [smsSession, setSmsSession] = useState<{
    active: boolean;
    target?: string;
    message?: string;
    waitingFor: 'target' | 'message' | null;
  }>({ active: false, waitingFor: null });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [saveContactModal, setSaveContactModal] = useState<{
    isOpen: boolean;
    phone: string;
  }>({
    isOpen: false,
    phone: '',
  });

  // Handle Dragging
  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
    // Don't prevent default if it's a click on text/buttons, 
    // but the header is mostly empty space.
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = dragStart.current.x - e.clientX;
      const deltaY = dragStart.current.y - e.clientY;
      
      const newPos = {
        x: Math.max(20, Math.min(window.innerWidth - 60, dragStart.current.posX + deltaX)),
        y: Math.max(20, Math.min(window.innerHeight - 60, dragStart.current.posY + deltaY))
      };
      setPosition(newPos);
    };

    const onMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      localStorage.setItem('ai_widget_position', JSON.stringify(position));
      // If dragged near the top of screen, auto-dock
      if (e.clientY < 80) {
        setIsDocked(true);
        localStorage.setItem('ai_widget_docked', 'true');
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent('dock-ai-widget'));
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, position]);

  // Load preferences
  useEffect(() => {
    async function loadPrefs() {
      if (!currentUser?.id) return;
      
      const keyExists = await hasUserApiKey();
      setHasKey(keyExists);

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        // No longer using local aiName setAiName since it's global
        // if (data?.settings?.ai_name) setAiName(data.settings.ai_name);
        
        // Load chat history if available
        const savedHistory = localStorage.getItem(`ai_widget_history_${currentUser.id}`);
        if (savedHistory) {
          try {
            setMessages(JSON.parse(savedHistory));
          } catch (e) {}
        } else {
          setMessages([{
            id: 'welcome',
            role: 'ai',
            content: `Hi there! I'm ${aiName}. How can I help you on the ${location.pathname.split('/').pop() || 'dashboard'} today?`,
            timestamp: new Date().toISOString()
          }]);
        }
      }
    }
    loadPrefs();

    window.addEventListener('ai-settings-updated', loadPrefs);
    
    // Sync initial docked state
    if (isDocked) {
      window.dispatchEvent(new CustomEvent('dock-ai-widget'));
    }

    return () => window.removeEventListener('ai-settings-updated', loadPrefs);
  }, [currentUser?.id]);

  // Handle outside toggle events
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClear = () => setMessages([]);
    const handleUndock = () => {
      setIsDocked(false);
      localStorage.setItem('ai_widget_docked', 'false');
      setIsOpen(true);
      setIsMinimized(false);
    };
    
    const handleDock = () => {
      setIsDocked(true);
      localStorage.setItem('ai_widget_docked', 'true');
    };
    
    window.addEventListener('toggle-ai-widget', handleToggle);
    window.addEventListener('clear-ai-chat', handleClear);
    window.addEventListener('undock-ai-widget', handleUndock);
    window.addEventListener('dock-ai-widget', handleDock);
    
    return () => {
      window.removeEventListener('toggle-ai-widget', handleToggle);
      window.removeEventListener('clear-ai-chat', handleClear);
      window.removeEventListener('undock-ai-widget', handleUndock);
      window.removeEventListener('dock-ai-widget', handleDock);
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
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
        setPrompt(prev => prev + transcript);
      };

      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (currentUser?.id && messages.length > 0) {
      localStorage.setItem(`ai_widget_history_${currentUser.id}`, JSON.stringify(messages));
    }
  }, [messages, isOpen]);

  // Proactive Insights based on page
  useEffect(() => {
    if (isOpen && !isMinimized && hasKey && !loading) {
      const loadInsights = async () => {
        setInsightsLoading(true);
        try {
          const res = await generatePageInsights(location.pathname);
          setInsights(res);
        } catch (err) {
          console.error("Failed to load insights:", err);
        } finally {
          setInsightsLoading(false);
        }
      };
      loadInsights();
    }
  }, [location.pathname, isOpen, isMinimized, hasKey, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || loading || !hasKey) return;

    const userText = prompt.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      // ── SMS Session: we're waiting for target or message ──────────────────
      if (smsSession.active && smsSession.waitingFor) {
        let updatedSession = { ...smsSession };

        if (smsSession.waitingFor === 'target') {
          updatedSession.target = userText;
          updatedSession.waitingFor = updatedSession.message ? null : 'message';
        } else if (smsSession.waitingFor === 'message') {
          updatedSession.message = userText;
          updatedSession.waitingFor = null;
        }

        // Both collected — ready to confirm
        if (updatedSession.target && updatedSession.message) {
          setSmsSession({ active: false, waitingFor: null });
          const confirmText = `Send this SMS?\n\nTo: ${updatedSession.target}\nMessage: "${updatedSession.message}"`;
          setConfirmModal({
            isOpen: true,
            title: 'Confirm SMS',
            message: confirmText,
            onConfirm: () => handleExecuteAction('send_sms', {
              target: updatedSession.target,
              message: updatedSession.message
            })
          });
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: confirmText,
            timestamp: new Date().toISOString(),
            intent: 'confirm_action'
          }]);
        } else {
          // Still need more info
          setSmsSession(updatedSession);
          const nextAsk = updatedSession.waitingFor === 'message'
            ? `Got it! What message should I send to ${updatedSession.target}?`
            : 'What phone number or lead name should I text?';
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: nextAsk,
            timestamp: new Date().toISOString()
          }]);
        }
        setLoading(false);
        return;
      }

      // ── LOCAL RULE-BASED MATCHING ──────────────────────────────────────────
      const matched = parseIntent(userText);
      if (matched) {
        // Handle Confidence Disambiguation
        if (matched.confidence > 40 && matched.confidence < 80) {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: `I think you might want to ${matched.intent.name.replace(/_/g, ' ')}. Is that right?`,
            timestamp: new Date().toISOString(),
            intent: 'disambiguation',
            data: { originalIntent: matched },
            systemLog: "🤖 Local AI (Low Confidence)"
          }]);
          setLoading(false);
          return;
        }

        const handler = (actionHandlers as any)[matched.intent.action];
        if (handler && matched.confidence >= 80) {
          const res = await handler(matched.params);
          if (res.success) {
            const prefs = UserLearningManager.getPreferences();
            let formatted = formatTemplate(matched.intent.template, res.data);
            
            // Adjust based on style preference
            if (prefs.responseStyle === 'concise') {
              formatted = `Done: ${formatted.split(':').pop()?.trim() || formatted}`;
            } else if (prefs.responseStyle === 'friendly') {
              formatted = `Sure thing! ${formatted}`;
            }

            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              content: formatted,
              timestamp: new Date().toISOString(),
              intent: matched.intent.name,
              data: res.data,
              systemLog: "🤖 Local AI"
            }]);
            setLoading(false);
            return;
          }
        }
      }

      // ── Normal AI processing ──────────────────────────────────────────────
      const response = await processPrompt(userText, { 
        page: location.pathname,
        currentTime: new Date().toISOString()
      }, aiModel);

      if (response.intent === 'rate_limit') {
        setShowRateLimitModal(true);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: 'rate_limit',
          systemLog: "✨ Gemini AI"
        }]);
        setLoading(false);
        return;
      }

      incrementAiUsage(aiModel);

      if (response.intent === 'redirect_setup') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: "I need your Gemini API key to work. Redirecting you to settings...",
          timestamp: new Date().toISOString()
        }]);
        setTimeout(() => navigate('/settings/ai'), 1500);

      } else if (response.intent === 'send_sms' || response.intent === 'confirm_action') {
        const d = response.data || {};
        const hasTarget = !!(d.target || d.leadId || d.phone);
        const hasMessage = !!d.message;

        if (hasTarget && hasMessage) {
          // All info present — show confirm modal immediately
          setConfirmModal({
            isOpen: true,
            title: 'Confirm SMS',
            message: response.response,
            onConfirm: () => handleExecuteAction(d.intent || response.intent, d)
          });
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: response.response,
            timestamp: new Date().toISOString(),
            intent: response.intent,
            data: d,
            systemLog: "✨ Gemini AI"
          }]);
        } else {
          // Missing info — start SMS session to collect it conversationally
          const newSession = {
            active: true,
            target: hasTarget ? (d.target || d.leadId || d.phone) : undefined,
            message: hasMessage ? d.message : undefined,
            waitingFor: hasTarget ? 'message' as const : 'target' as const
          };
          setSmsSession(newSession);

          // Show the AI's message (which should be asking for the missing piece)
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: response.response,
            timestamp: new Date().toISOString(),
            intent: 'ask_question',
            systemLog: "✨ Gemini AI"
          }]);
        }

      } else if (response.intent === 'ask_save_contact') {
        setSaveContactModal({
          isOpen: true,
          phone: response.data?.phone || ''
        });
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: 'ask_save_contact',
          data: response.data,
          systemLog: "✨ Gemini AI"
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: response.intent,
          data: response.data,
          systemLog: "✨ Gemini AI"
        }]);

        if (response.intent === 'navigate' && response.data?.path) {
          navigate(response.data.path);
        } else if (response.intent === 'multi_action' && response.data?.actions) {
          response.data.actions.forEach((act: any) => {
            if (act.intent === 'navigate' && act.data?.path) {
              navigate(act.data.path);
            } else if (act.intent === 'create_task') {
              handleExecuteAction('create_task', act.data);
            }
          });
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I encountered an error. Please check your connection.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (intent: string, data: any) => {
    let result: { success: boolean; message: string } | null = null;
    
    try {
      if (intent === 'create_task') {
        createTask(data);
        result = { success: true, message: `Successfully created task: ${data.title}` };
      } else if (intent === 'update_status' && data?.leadId) {
        result = updateLeadStatusViaAI(data.leadId, data.newStatus);
      } else if (intent === 'create_lead') {
        result = createLeadViaAI(data);
      } else if (intent === 'update_lead' && data?.leadId) {
        result = updateLeadViaAI(data.leadId, data);
      } else if (intent === 'delete_lead' && data?.leadId) {
        result = deleteLeadViaAI(data.leadId);
      } else if (intent === 'send_sms') {
        const target = data?.target || data?.leadId || data?.phone;
        const message = data?.message;
        
        if (!target || !target.toString().trim() || !message) {
          result = { success: false, message: "Missing phone/target or message content for SMS." };
        } else {
          setLoading(true);
          try {
            console.log(`[AIBotWidget] Executing send_sms to ${target}`);
            result = await sendSMSViaAI(target.toString(), message, data?.targetCarrier);
          } catch (smsErr: any) {
            result = { success: false, message: smsErr?.message || 'SMS send failed. Check Google connection in Settings.' };
          } finally {
            setLoading(false);
          }
        }
      } else if (intent === 'confirm_action') {
        const underlyingIntent = data?.intent;
        if (underlyingIntent && underlyingIntent !== 'confirm_action') {
          return handleExecuteAction(underlyingIntent, data);
        } else {
          result = { success: false, message: 'Invalid confirmation target.' };
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: result
          ? (result.success ? result.message : `❌ ${result.message}`)
          : 'Action completed.',
        timestamp: new Date().toISOString(),
        intent: intent
      }]);
    } catch (err: any) {
      console.error('Widget action failed:', err);
      setLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `❌ ${err?.message || "Couldn't complete that action. Please check your Google/SMS settings."}`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  if (!showFloatingAIWidget || isDocked) return null;

  if (hasKey === false && isOpen) {
    return (
      <div 
        className="fixed z-[2000] animate-in fade-in slide-in-from-bottom-4 pointer-events-none"
        style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
      >
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6 shadow-2xl max-w-sm text-center pointer-events-auto relative">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--t-primary-dim)' }}
          >
            <Key className="w-6 h-6" style={{ color: 'var(--t-primary)' }} />
          </div>
          <h3 className="text-white font-bold mb-2">Setup Required</h3>
          <p className="text-[var(--t-text-muted)] mb-4">Please configure your AI API key to use the floating assistant.</p>
          <button 
            onClick={() => navigate('/settings/ai')} 
            className="text-xs px-4 py-2 rounded-lg text-white font-bold"
            style={{ background: 'var(--t-primary)' }}
          >
            Configure Now
          </button>

        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-[99999] flex flex-col items-end pointer-events-none"
      style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
    >
      
      {/* Expanded Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          className={`w-80 md:w-96 h-[500px] border rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto mb-4 animate-in zoom-in-95 duration-200 
            ${position.y > window.innerHeight / 2 ? 'order-last mt-4 mb-0 origin-top-right' : 'mb-4 origin-bottom-right'}`}
          style={{ 
            background: 'var(--t-surface)', 
            borderColor: 'var(--t-border)',
            position: 'absolute',
            bottom: position.y > window.innerHeight / 2 ? 'auto' : '100%',
            top: position.y > window.innerHeight / 2 ? '100%' : 'auto',
            right: 0
          }}
        >
          
          {/* Header */}
          <div 
            className="p-3 border-b flex items-center justify-between cursor-move"
            style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}
            onMouseDown={startDrag}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--t-primary)' }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">{aiName}</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-success)] animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setIsDocked(true);
                  localStorage.setItem('ai_widget_docked', 'true');
                  window.dispatchEvent(new CustomEvent('dock-ai-widget'));
                }}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors group"
                title="Dock to top bar"
              >
                <LayoutIcon size={16} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]" />
              </button>
              <button 
                onClick={() => { setIsOpen(false); }}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors group"
                title="Close"
              >
                <X size={16} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-error)]" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ background: 'var(--t-background)' }}
          >
            {/* Proactive Insights */}
            {insights.length > 0 && (
              <div className="bg-[var(--t-primary)]/5 border border-[var(--t-primary)]/10 rounded-2xl p-3 mb-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--t-primary)] flex items-center gap-1.5">
                    <Bot size={12} /> Proactive Insights
                  </span>
                  {insightsLoading && <Loader2 size={10} className="animate-spin text-[var(--t-primary)]" />}
                </div>
                <div className="space-y-1.5">
                  {insights.map((insight, i) => (
                    <div key={i} className="flex gap-2 items-start text-[11px] text-[var(--t-text)] leading-snug">
                      <div className="w-1 h-1 rounded-full bg-[var(--t-primary)] mt-1.5 shrink-0" />
                      <p>{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" 
                  style={{ background: msg.role === 'user' ? 'var(--t-primary)' : 'var(--t-secondary)' }}>
                  {msg.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
                </div>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' ? 'rounded-tr-none' : 'border rounded-tl-none'
                  }`} style={{ 
                    background: msg.role === 'user' ? 'var(--t-primary)' : 'var(--t-surface)',
                    borderColor: msg.role === 'user' ? 'transparent' : 'var(--t-border)',
                    color: msg.role === 'user' ? 'var(--t-on-primary)' : 'var(--t-text)'
                  }}>
                    {msg.content}
                    
                    {msg.intent === 'disambiguation' && msg.data?.originalIntent && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            const matched = msg.data.originalIntent;
                            handleExecuteAction(matched.intent.action, matched.params);
                            // Mark as resolved
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, intent: 'resolved' } : m));
                          }}
                          className="px-2 py-1 bg-[var(--t-primary)] text-white rounded text-[10px] font-bold"
                        >
                          Yes, do it
                        </button>
                        <button
                          onClick={() => {
                            setMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              role: 'ai',
                              content: "No problem! How can I help then?",
                              timestamp: new Date().toISOString()
                            }]);
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, intent: 'resolved' } : m));
                          }}
                          className="px-2 py-1 bg-[var(--t-surface-hover)] text-[var(--t-text)] border border-[var(--t-border)] rounded text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.role === 'ai' && msg.systemLog && (
                    <div className="flex gap-2 items-center mt-1 px-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" 
                        style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)', borderColor: 'var(--t-border)' }}>
                        {msg.systemLog}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--t-secondary)' }}
                >
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[var(--t-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--t-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--t-text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2"
            style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={isRecording ? "Listening..." : "Ask anything..."}
                className="w-full border rounded-lg pl-3 pr-8 py-2 text-xs outline-none focus:ring-1 transition-all"
                style={{ 
                  background: 'var(--t-background)', 
                  borderColor: isRecording ? 'var(--t-primary)' : 'var(--t-border)', 
                  color: 'var(--t-text)',
                  // @ts-expect-error custom prop
                  '--tw-ring-color': 'var(--t-primary)'
                }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={toggleRecording}
                className={`absolute right-2 top-1/2 -translate-y-1/2 transition-colors ${isRecording ? 'animate-pulse' : ''}`}
                style={{ color: isRecording ? 'var(--t-primary)' : 'var(--t-text-muted)' }}
              >
                <Mic size={14} />
              </button>
            </div>
            <button
              disabled={loading || !prompt.trim()}
              className="p-2 text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: 'var(--t-primary)' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bubble Button */}
      <button 
        onMouseDown={startDrag}
        onClick={(e) => {
          const moved = Math.abs(e.clientX - dragStart.current.x) > 5 || Math.abs(e.clientY - dragStart.current.y) > 5;
          if (moved) return;

          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={`pointer-events-auto p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center group relative ${
          isOpen && !isMinimized ? 'rotate-90' : 'hover:shadow-lg'
        }`}
        style={{ 
          background: isOpen && !isMinimized ? 'var(--t-surface-active)' : 'var(--t-primary)',
          color: isOpen && !isMinimized ? 'var(--t-primary)' : 'white'
        }}
      >
        {isOpen && !isMinimized ? <X size={24}/> : <Bot size={24} />}
        
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--t-error)] border-2 border-[var(--t-background)] rounded-full animate-pulse" />
        )}
        
        {!isOpen && (
          <div className="absolute right-full mr-3 whitespace-nowrap bg-[var(--t-surface)] text-white text-xs px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[var(--t-border)] shadow-xl">
            How can I help you, {currentUser?.email?.split('@')[0]}?
          </div>
        )}
      </button>

      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
        currentModel={aiModel}
        onSwitchModel={(modelId) => {
          setAiModel(modelId);
          setShowRateLimitModal(false);
          window.dispatchEvent(new CustomEvent('ai-settings-updated'));
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <SaveLeadModal
        isOpen={saveContactModal.isOpen}
        phone={saveContactModal.phone}
        onClose={() => setSaveContactModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
