import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, 
  Minus, AlertTriangle,
  User, Key
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { processPrompt, hasUserApiKey } from '../lib/gemini';
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
  
  const { currentUser } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [currentUser?.id]);

  // Handle outside toggle events
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClear = () => setMessages([]);
    
    window.addEventListener('toggle-ai-widget', handleToggle);
    window.addEventListener('clear-ai-chat', handleClear);
    
    return () => {
      window.removeEventListener('toggle-ai-widget', handleToggle);
      window.removeEventListener('clear-ai-chat', handleClear);
    };
  }, []);

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
    setLoading(true);

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

  const handleExecuteAction = (intent: string, _data: any) => {
    // In the widget, we might just confirm and tell the user to check the specific page
    // Or we use the same action executors if they are available in gemini.ts
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'ai',
      content: `Confirmed! I'm ${intent.replace('_', ' ')}ing now.`,
      timestamp: new Date().toISOString()
    }]);
  };

  if (hasKey === false && isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-sm text-center">
          <Key className="w-8 h-8 text-brand-400 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Setup Required</h3>
          <p className="text-xs text-slate-400 mb-4">Please configure your AI API key to use the floating assistant.</p>
          <button onClick={() => navigate('/settings/ai')} className="text-xs bg-brand-600 px-4 py-2 rounded-lg text-white font-bold">Configure Now</button>
          <button onClick={() => setIsOpen(false)} className="absolute top-2 right-2 p-1 text-slate-500"><X size={16}/></button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Expanded Chat Window */}
      {isOpen && !isMinimized && (
        <div className="w-80 md:w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto mb-4 animate-in zoom-in-95 duration-200 origin-bottom-right">
          
          {/* Header */}
          <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">{aiName}</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
              >
                <Minus size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50"
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-brand-600' : 'bg-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
                </div>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-brand-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                  
                  {/* Guardrail Confirmation inside Widget */}
                  {msg.intent === 'confirm_action' && msg.data && (
                    <div className="mt-2 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg space-y-2 w-full">
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-tighter flex items-center gap-1">
                        <AlertTriangle size={10} /> Confirmation Required
                      </p>
                      <button
                        onClick={() => handleExecuteAction(msg.data.intent, msg.data)}
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold py-1.5 rounded-md transition-all"
                      >
                        Confirm & Proceed
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-brand-500"
              disabled={loading}
            />
            <button
              disabled={loading || !prompt.trim()}
              className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bubble Button */}
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={`pointer-events-auto p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center group relative ${
          isOpen && !isMinimized ? 'bg-slate-800 text-brand-400 rotate-90' : 'bg-brand-600 text-white hover:shadow-brand-600/20'
        }`}
      >
        {isOpen && !isMinimized ? <X size={24}/> : <Bot size={24} />}
        
        {/* Unread dot or label */}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-slate-900 rounded-full animate-pulse" />
        )}
        
        {/* Tooltip */}
        {!isOpen && (
          <div className="absolute right-full mr-3 whitespace-nowrap bg-slate-900 text-white text-xs px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700 shadow-xl">
            How can I help you, {currentUser?.email?.split('@')[0]}?
          </div>
        )}
      </button>

    </div>
  );
}
