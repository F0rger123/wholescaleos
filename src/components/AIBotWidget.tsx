import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, 
  User, Key, Mic, Volume2, VolumeX,
  Layout as LayoutIcon, Loader2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ConfirmModal } from './ConfirmModal';
import { processPrompt, hasUserApiKey, createTask, updateLeadStatusViaAI, createLeadViaAI, updateLeadViaAI, deleteLeadViaAI, sendSMSViaAI, generatePageInsights } from '../lib/gemini';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SaveLeadModal } from './SaveLeadModal';
import { RateLimitModal } from './RateLimitModal';
import { voiceService } from '../lib/voice-service';
import { usageTracker, UsageData } from '../lib/usage-tracking';
import { UsageLimitModal } from './UsageLimitModal';
import { recognizeIntent, executeTask, wrapResponse, splitMultiIntent } from '../lib/local-ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  intent?: string;
  data?: unknown;
  systemLog?: string;
}

export interface GeminiResponse {
  intent: string;
  response: string;
  data?: unknown;
  systemLog?: string;
}

interface DisambiguationData {
  originalIntent: {
    intent: {
      action: string;
    };
    params: any;
  };
}

export function AIBotWidget() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const { 
    isAiOpen, setAiOpen,
    currentUser, showFloatingAIWidget, incrementAiUsage,
    aiModel, isAiDocked, setAiDocked,
    sidebarOpen
  } = useStore();
  const [speechEnabled, setSpeechEnabled] = useState(() => voiceService.isSpeechEnabled());
  const [isSpeaking, setIsSpeaking] = useState(false);
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
  const [bars, setBars] = useState<number[]>(new Array(20).fill(5));

  // Fetch usage on mount and after every response
  const fetchUsage = async () => {
    try {
      const data = await usageTracker.getUsage();
      setUsage(data);
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  // Simulate voice bars animation
  useEffect(() => {
    if (isRecording || isSpeaking) {
      const interval = setInterval(() => {
        setBars(new Array(20).fill(0).map(() => Math.random() * 40 + 10));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setBars(new Array(20).fill(5));
    }
  }, [isRecording, isSpeaking]);

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
        setAiDocked(true);
        setAiOpen(false);
        setIsMinimized(false);
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
        // Fetch usage data
        await fetchUsage();
        
        await supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .maybeSingle();
        
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
              content: `Hi there! I'm ${aiModel === 'os-bot' ? '🤖 OS Bot' : '✨ Google Gemini'}. How can I help you on the ${location.pathname.split('/').pop() || 'dashboard'} today?`,
              timestamp: new Date().toISOString(),
              systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
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
    const handleToggle = () => setAiOpen(!isAiOpen);
    const handleClear = () => setMessages([]);
    const handleUndock = () => {
      setAiDocked(false);
      setAiOpen(true);
      setIsMinimized(false);
    };
    
    const handleDock = () => {
      setAiDocked(true);
      setAiOpen(false);
    };
    
    window.addEventListener('toggle-ai-widget', handleToggle);
    window.addEventListener('clear-ai-chat', handleClear);
    window.addEventListener('undock-ai-widget', handleUndock);
    window.addEventListener('dock-ai-widget', handleDock);

    // Ctrl+Shift+V shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setAiOpen(!isAiOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('toggle-ai-widget', handleToggle);
      window.removeEventListener('clear-ai-chat', handleClear);
      window.removeEventListener('undock-ai-widget', handleUndock);
      window.removeEventListener('dock-ai-widget', handleDock);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Initialize Voice Service Callbacks
  useEffect(() => {
    voiceService.setCallbacks(
      (transcript) => setPrompt(prev => prev + transcript),
      (isRec) => {
         setIsRecording(isRec);
      },
      (err) => {
         console.warn(err);
      }
    );
  }, []);

  // Use a ref for the prompt so we can submit it inside an effect without staleness
  const promptRef = useRef(prompt);
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  // Handle auto-submit on recording end
  useEffect(() => {
    if (!isRecording && promptRef.current.trim().length > 0 && !loading) {
      const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(dummyEvent);
    }
  }, [isRecording]);

  const toggleRecording = () => {
    voiceService.toggleListening();
  };

  const speak = (text: string) => {
    voiceService.speak(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  useEffect(() => {
    voiceService.toggleMute(!speechEnabled);
  }, [speechEnabled]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiOpen, displayedText]);

  useEffect(() => {
    if (currentUser?.id && messages.length > 0) {
      localStorage.setItem(`ai_widget_history_${currentUser.id}`, JSON.stringify(messages));
    }
  }, [messages, currentUser?.id]);

  // Typing Animation Simulation
  useEffect(() => {
    if (!typingMessageId) return;

    const message = messages.find(m => m.id === typingMessageId);
    if (!message) {
      setTypingMessageId(null);
      return;
    }

    let currentText = '';
    const fullText = message.content;
    let index = 0;

    const timer = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.charAt(index);
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(timer);
        setTypingMessageId(null);
        setDisplayedText('');
      }
    }, 15); // Faster typing speed

    return () => clearInterval(timer);
  }, [typingMessageId, messages]);

  // Proactive Insights based on page
  useEffect(() => {
    if (isAiOpen && !isMinimized && hasKey && !loading) {
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
  }, [location.pathname, isAiOpen, isMinimized, hasKey, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || loading || !hasKey) return;

    // Check Usage Limits
    if (usage && usage.remaining <= 0) {
      setShowUsageModal(true);
      return;
    }

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

      // ── LOCAL RULE-BASED MATCHING (OS BOT 2.0) ───────────────────────────
      const isLocalModel = aiModel === 'os-bot';
      const segments = isLocalModel ? splitMultiIntent(userText) : [userText];

      if (isLocalModel && segments.length > 1) {
        // Multi-Intent Processing
        const taskResults: string[] = [];
        for (const segment of segments) {
          const matched = recognizeIntent(segment);
          if (matched && matched.confidence >= 80) {
            const res = await executeTask(matched.intent.action, matched.params);
            if (res.success && res.message) {
              taskResults.push(res.message);
            }
          }
        }

        if (taskResults.length > 0) {
          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'ai',
            content: taskResults.join('\n\n'),
            timestamp: new Date().toISOString(),
            systemLog: "🤖 OS Bot"
          };
          setMessages(prev => [...prev, aiMsg]);
          setTypingMessageId(aiMsg.id);
          setLoading(false);
          return;
        }
      }

      const matched = recognizeIntent(userText);

      if (matched || isLocalModel) {
        // Increment usage for OS Bot
        await usageTracker.incrementUsage();
        await fetchUsage();

        // Handle Confidence Disambiguation
        if (matched && matched.confidence > 40 && matched.confidence < 80) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: `I think you might want to ${matched.intent.name.replace(/_/g, ' ')}. Is that right?`,
            timestamp: new Date().toISOString(),
            intent: 'disambiguation',
            data: { originalIntent: matched },
            systemLog: "🤖 OS Bot"
          };
          setMessages(prev => [...prev, aiMsg]);
          setTypingMessageId(aiMsg.id);
          setLoading(false);
          return;
        }

        if (matched && matched.confidence >= 80) {
          const res = await executeTask(matched.intent.action, matched.params);
          if (res.success) {
            const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              content: wrapResponse(res.message, 'success'),
              timestamp: new Date().toISOString(),
              intent: matched.intent.name,
              data: res.data,
              systemLog: "🤖 OS Bot"
            };
            setMessages(prev => [...prev, aiMsg]);
            setTypingMessageId(aiMsg.id);
            setLoading(false);
            return;
          }
        }

        // If explicitly set to OS Bot but no intent matched, or intent failed
        if (isLocalModel) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: "I'm not sure how to handle that specific request yet. Try asking for 'help' to see what I can do!",
            timestamp: new Date().toISOString(),
            systemLog: "🤖 OS Bot"
          };
          setMessages(prev => [...prev, aiMsg]);
          setTypingMessageId(aiMsg.id);
          setLoading(false);
          return;
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
          content: response.response || "AI initialization complete.",
          timestamp: new Date().toISOString(),
          systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
        }]);
        setLoading(false);
        return;
      }

      // Increment Usage for AI Model processing
      await usageTracker.incrementUsage();
      await fetchUsage();

      if (response.intent !== 'error' && response.intent !== 'rate_limit' && !response.systemLog?.includes('OS Bot')) {
        incrementAiUsage(aiModel);
      }

      if (response.intent === 'redirect_setup') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: "I need your Gemini API key to work. Redirecting you to settings...",
          timestamp: new Date().toISOString(),
          systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
        }]);
        setTimeout(() => navigate('/settings/ai'), 1500);

      } else if (response.intent === 'confirm_action') {
        const d = response.data || {};
        if (d.intent === 'send_sms' && d.target && d.message) {
          // Open the confirm modal for SMS
          setConfirmModal({
            isOpen: true,
            title: 'Confirm OS Bot Action',
            message: response.response,
            onConfirm: () => handleExecuteAction(d.intent || response.intent, d)
          });
          setMessages(prev => [...prev.slice(0, -1), {
            id: Date.now().toString(),
            role: "ai",
            content: response.response,
            timestamp: new Date().toISOString(),
            systemLog: response.systemLog || (aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini")
          }]);
        } else {
          // Missing info — start SMS session to collect it conversationally
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: response.response,
            timestamp: new Date().toISOString(),
            intent: 'ask_question',
            systemLog: response.systemLog || (aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini")
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
          systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
        }]);
      } else {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: response.intent,
          data: response.data,
          systemLog: response.systemLog || (aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini")
        };
        setMessages(prev => [...prev, aiMsg]);
        setTypingMessageId(aiMsg.id);
        speak(response.response);

        if (response.intent === 'navigate' && response.data?.path) {
          navigate(response.data.path);
        } else if (response.intent === 'multi_action' && response.data?.actions) {
          response.data.actions.forEach((act: { intent: string; data?: any }) => {
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
        content: "I'm not sure how to handle that request yet. Try asking for 'help' to see what I can do!",
        timestamp: new Date().toISOString(),
        systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
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
        if (result?.success) {
          useStore.getState().updateLeadStatus(data.leadId, data.newStatus, currentUser?.id || 'system');
        }
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

      // Increment usage if successful
      await usageTracker.incrementUsage();
      await fetchUsage();

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: result
          ? (result.success ? result.message : `❌ ${result.message}`)
          : 'Action completed.',
        timestamp: new Date().toISOString(),
        intent: intent
      }]);
      
      const speechText = result 
        ? (result.success ? result.message : `Error. ${result.message}`)
        : 'Action completed.';
      speak(speechText);
    } catch (err: any) {
      console.error('Widget action failed:', err);
      setLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: `❌ ${err?.message || "Couldn't complete that action. Please check your Google/SMS settings."}`,
        timestamp: new Date().toISOString(),
        systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
      }]);
    }
  };

  if (!showFloatingAIWidget) return null; 

  if (hasKey === false && isAiOpen) {
    return (
      <div 
        className="fixed z-[var(--z-popover)] animate-in fade-in slide-in-from-bottom-4 pointer-events-none"
        style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
      >
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6 shadow-2xl max-w-sm text-center pointer-events-auto relative">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--t-primary-dim)' }}
          >
            <Key className="w-6 h-6" style={{ color: 'var(--t-primary)' }} />
          </div>
          <h3 className="font-bold mb-2" style={{ color: 'var(--t-text)' }}>Setup Required</h3>
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
      className={`fixed z-[var(--z-loader)] flex items-end pointer-events-none ${
        position.y > window.innerHeight / 2 ? 'flex-col' : 'flex-col-reverse'
      }`}
      style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
    >
      
      {/* Expanded Chat Window */}
      {isAiOpen && !isMinimized && (
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
            className={`p-3 flex items-center justify-between cursor-move ${position.y < 200 ? 'order-last border-t rounded-b-2xl' : 'border-b rounded-t-2xl'}`}
            style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}
            onMouseDown={startDrag}
          >
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setAiDocked(true); setAiOpen(false); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                style={{ background: 'var(--t-primary)' }}
                title="Dock to bookshelf"
              >
                <Bot className="w-4 h-4" style={{ color: 'var(--t-on-primary)' }} />
              </button>
              <div className="flex flex-col">
                <h2 className="text-xs font-black text-[var(--t-text)] leading-none">🤖 OS Bot</h2>
                {usage && (
                  <span className={`text-[9px] font-bold mt-0.5 ${
                    usage.remaining < (usage.limit * 0.1) ? 'text-[var(--t-error)]' : (usage.remaining < (usage.limit * 0.25) ? 'text-[var(--t-warning)]' : 'text-[var(--t-primary)]')
                  }`}>
                    🔋 {usage.remaining} left today
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`p-1.5 rounded-lg transition-colors group ${speechEnabled ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`}
                title={speechEnabled ? "Mute AI Voice" : "Enable AI Voice"}
              >
                {speechEnabled ? (
                  <Volume2 size={16} className={isSpeaking ? 'animate-pulse' : ''} />
                ) : (
                  <VolumeX size={16} />
                )}
              </button>
              <button 
                onClick={() => {
                  setAiDocked(true);
                  setAiOpen(false);
                }}
                className="p-1.5 hover:bg-black/10 rounded-lg transition-colors group"
                title="Dock to top bar"
              >
                <LayoutIcon size={16} className="text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]" />
              </button>
              <button 
                onClick={() => { 
                  setAiDocked(true);
                  setAiOpen(false); 
                }}
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
            className={`flex-1 overflow-y-auto p-4 space-y-4 ${position.y < 200 ? 'order-1' : ''}`}
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
                {/* Voice Visualization Bars */}
                {(isRecording || isSpeaking) && (
                  <div className="flex items-end justify-center gap-1 h-8 mb-4">
                    {bars.map((height, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-[var(--t-primary)] opacity-60 transition-all duration-100"
                        style={{ height: `${height * 0.6}px` }}
                      />
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-4">
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
                  {msg.role === 'user' ? <User className="w-3 h-3" style={{ color: 'var(--t-on-primary)' }} /> : <Bot className="w-3 h-3" style={{ color: 'var(--t-on-primary)' }} />}
                </div>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' ? 'rounded-tr-none' : 'border rounded-tl-none'
                  }`} style={{ 
                    background: msg.role === 'user' ? 'var(--t-primary)' : 'var(--t-surface)',
                    borderColor: msg.role === 'user' ? 'transparent' : 'var(--t-border)',
                    color: msg.role === 'user' ? 'var(--t-on-primary)' : 'var(--t-text)'
                  }}>
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm bg-[var(--t-primary)] text-[var(--t-on-primary)]">
                          {msg.role === 'ai' ? (aiModel === 'os-bot' ? '🤖 OS Bot' : (msg.systemLog || '✨ Gemini')) : 'You'}
                        </span>
                        {msg.systemLog && (
                          <span className="text-[8px] font-bold text-[var(--t-text-muted)] opacity-50 uppercase tracking-widest">
                            {msg.systemLog.replace('🤖 OS Bot', '').replace('✨ Gemini', '').trim()}
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">
                        {typingMessageId === msg.id ? (
                          <>
                             {displayedText}
                             <span className="inline-block w-2 h-5 bg-[var(--t-primary)] ml-1 animate-pulse align-middle" />
                          </>
                        ) : msg.content}
                      </div>
                    </div>
                    
                    {msg.intent === 'disambiguation' && (msg.data as DisambiguationData)?.originalIntent && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            const matched = (msg.data as DisambiguationData).originalIntent;
                            handleExecuteAction(matched.intent.action, matched.params);
                            // Mark as resolved
                            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, intent: 'resolved' } : m));
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold"
                          style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
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

                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--t-secondary)' }}
                >
                  <Bot className="w-3 h-3" style={{ color: 'var(--t-on-primary)' }} />
                </div>
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className={`p-3 border-t flex flex-col gap-2 ${position.y < 200 ? 'order-2 border-t-0' : ''}`}
            style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}
          >
            {/* Removed premium limit display */}
            <div className="flex gap-2 w-full relative">
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
                className="p-2 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Bubble Button */}
      <button 
        onMouseDown={startDrag}
        onClick={(e) => {
          const moved = Math.abs(e.clientX - dragStart.current.x) > 5 || Math.abs(e.clientY - dragStart.current.y) > 5;
          if (moved) return;

          if (isAiDocked) {
            setAiDocked(false);
            setAiOpen(true);
            setIsMinimized(false);
          } else if (isAiOpen) {
            // Slide to Jarvis area (dock)
            setAiDocked(true);
            setAiOpen(false);
          } else {
            setAiOpen(true);
            setIsMinimized(false);
          }
        }}
        className={`pointer-events-auto p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 flex items-center justify-center group relative ${
          isAiOpen && !isMinimized ? 'rotate-90' : 'hover:shadow-lg'
        } ${isAiDocked ? 'scale-75 opacity-50 hover:opacity-100 hover:scale-100' : ''}`}
        style={{ 
          background: (isAiOpen && !isMinimized) || isAiDocked ? 'var(--t-surface-active)' : 'var(--t-primary)',
          color: (isAiOpen && !isMinimized) || isAiDocked ? 'var(--t-primary)' : 'var(--t-on-primary)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          // When docked, we position it near the top (bookshelf area) so it "slides" there
          ...(isAiDocked ? {
            bottom: 'calc(100vh - 110px)', // Move towards header area
            right: sidebarOpen ? '420px' : '320px', // Adjust based on sidebar
            transform: 'scale(0.6) rotate(-10deg)',
            opacity: 0.4,
            zIndex: 1000
          } : {
            zIndex: 1000
          })
        }}
      >
        {isAiDocked ? <LayoutIcon size={24} /> : (isAiOpen && !isMinimized ? <X size={24}/> : <Bot size={24} />)}
        
        {!isAiOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--t-error)] border-2 border-[var(--t-background)] rounded-full animate-pulse" />
        )}
        
        {!isAiOpen && (
          <div className="absolute right-full mr-3 whitespace-nowrap bg-[var(--t-surface)] text-[var(--t-text)] text-xs px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[var(--t-border)] shadow-xl">
            How can I help you, {currentUser?.email?.split('@')[0]}?
          </div>
        )}
      </button>

      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => setShowRateLimitModal(false)}
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
      
      <UsageLimitModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
        tier={usage?.tier || 'Free'}
        limit={usage?.limit || 10}
      />
    </div>
  );
}
