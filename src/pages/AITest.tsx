import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  processPrompt, 
  createTask, 
  updateLeadStatusViaAI, 
  createLeadViaAI, 
  updateLeadViaAI, 
  deleteLeadViaAI 
} from '../lib/gemini';
import { Bot, User, Send, Target, Sparkles, Check, Trash2, UserPlus } from 'lucide-react';

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
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
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
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
    // Auto scroll to bottom smoothly
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim() || loading) return;

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
      
      let systemLog = undefined;
      
      if (response.intent === 'redirect_setup') {
        setTimeout(() => navigate('/settings/ai'), 1500);
      }
      
      // Execute UI commands silently behind the scenes
      if (response.intent === 'create_task' && response.data) {
        createTask(response.data);
        systemLog = `System: Created task '${response.data.title}'`;
      } else if (response.intent === 'update_status' && response.data?.leadId && response.data?.newStatus) {
        const result = updateLeadStatusViaAI(response.data.leadId, response.data.newStatus);
        systemLog = `System: ${result.message}`;
      } else if (response.intent === 'create_lead' && response.data) {
        const result = createLeadViaAI(response.data);
        systemLog = `System: ${result.message}`;
      } else if (response.intent === 'update_lead' && response.data?.leadId) {
        const result = updateLeadViaAI(response.data.leadId, response.data);
        systemLog = `System: ${result.message}`;
      } else if (response.intent === 'delete_lead' && response.data?.leadId) {
        const result = deleteLeadViaAI(response.data.leadId);
        systemLog = `System: ${result.message}`;
      }
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.response || "I couldn't process that request.",
        timestamp: new Date().toISOString(),
        intent: response.intent,
        data: response.data,
        systemLog
      };
      
      setMessages(prev => [...prev, aiMessage]);
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
      setLoading(false);
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
    { label: "Team Status", prompt: "Who on the team is online right now?", icon: <User className="w-3 h-3"/> }
  ];

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

      {/* Input Area */}
      <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x mb-2 px-1">
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSubmit(undefined, item.prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-brand-500/20 text-slate-300 hover:text-brand-300 text-xs rounded-full border border-slate-700 transition-colors whitespace-nowrap snap-start"
            >
              <span className="text-brand-400">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-200 resize-none min-h-[50px] max-h-[150px]"
            rows={1}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-12 h-12 shrink-0 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:bg-slate-700 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
