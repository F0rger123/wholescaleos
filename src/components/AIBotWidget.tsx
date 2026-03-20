import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, 
  Minus,
  User, Key, Mic,
  Layout as LayoutIcon
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ConfirmModal } from './ConfirmModal';
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
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  intent?: string;
  data?: any;
}

export function AIBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [aiName, setAiName] = useState('AI Assistant');
  // const [isDragging, setIsDragging] = useState(false);
  // const [position, setPosition] = useState({ x: 20, y: 20 }); // Bottom-right offsets
  
  const { currentUser, showFloatingAIWidget } = useStore();
  const [isDocked, setIsDocked] = useState(false);
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

    const onMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('ai_widget_position', JSON.stringify(position));
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
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (data?.settings?.ai_name) setAiName(data.settings.ai_name);
        
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
            content: `Hi there! I'm ${data?.settings?.ai_name || 'AI Assistant'}. How can I help you on the ${location.pathname.split('/').pop() || 'dashboard'} today?`,
            timestamp: new Date().toISOString()
          }]);
        }
      }
    }
    loadPrefs();

    window.addEventListener('ai-settings-updated', loadPrefs);
    return () => window.removeEventListener('ai-settings-updated', loadPrefs);
  }, [currentUser?.id]);

  // Handle outside toggle events
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClear = () => setMessages([]);
    const handleUndock = () => {
      setIsDocked(false);
      setIsOpen(true);
      setIsMinimized(false);
    };
    
    window.addEventListener('toggle-ai-widget', handleToggle);
    window.addEventListener('clear-ai-chat', handleClear);
    window.addEventListener('undock-ai-widget', handleUndock);
    
    return () => {
      window.removeEventListener('toggle-ai-widget', handleToggle);
      window.removeEventListener('clear-ai-chat', handleClear);
      window.removeEventListener('undock-ai-widget', handleUndock);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || loading || !hasKey) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    const textToSubmit = prompt;
    setPrompt('');
    setLoading(true); // Prevent duplicates

    try {
      const response = await processPrompt(textToSubmit, { 
        page: location.pathname,
        currentTime: new Date().toISOString()
      });

      if (response.intent === 'redirect_setup') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: "I need your Gemini API key to work. Redirecting you to settings...",
          timestamp: new Date().toISOString()
        }]);
        setTimeout(() => navigate('/settings/ai'), 1500);
      } else if (response.intent === 'confirm_action' && response.data) {
        // Trigger modal immediately for confirm_action instead of inline
        setConfirmModal({
          isOpen: true,
          title: 'Confirm AI Action',
          message: response.response,
          onConfirm: () => handleExecuteAction(response.data.intent || 'send_sms', response.data)
        });
        // Still add the message so user sees the context
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: response.intent,
          data: response.data
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: response.intent,
          data: response.data
        }]);
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
      } else if (intent === 'send_sms' && (data?.target || data?.leadId) && data?.message) {
        setLoading(true);
        result = await sendSMSViaAI(data.target || data.leadId, data.message, data.targetCarrier);
        setLoading(false);
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: result?.message || "Action successfully completed.",
        timestamp: new Date().toISOString(),
        intent: intent
      }]);
    } catch (err) {
      console.error('Widget action failed:', err);
      setLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: "Sorry, I couldn't complete that action. Please check your settings and try again.",
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
          <button onClick={() => setIsOpen(false)} className="absolute top-2 right-2 p-1 text-[var(--t-text-muted)]"><X size={16}/></button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-[10000] flex flex-col items-end pointer-events-none"
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
                onClick={() => setIsDocked(true)}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors group"
                title="Dock to side"
              >
                <LayoutIcon size={16} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]" />
              </button>
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors group"
              >
                <Minus size={16} className="text-[var(--t-text-muted)] group-hover:text-white" />
              </button>

            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ background: 'var(--t-background)' }}
          >
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
                  </div>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
