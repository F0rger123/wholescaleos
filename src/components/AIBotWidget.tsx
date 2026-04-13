import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, 
  User, Key, Mic, Volume2, VolumeX,
  Layout as LayoutIcon, Loader2,
  MessageSquare, CheckCircle2, FileText
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ConfirmModal } from './ConfirmModal';
import { 
  hasUserApiKey, 
  processPrompt, 
  generatePageInsights, 
  createTask, 
  updateLeadStatusViaAI, 
  createLeadViaAI, 
  updateLeadViaAI, 
  deleteLeadViaAI, 
  sendSMSViaAI 
} from '../lib/gemini';
import { isSupabaseConfigured } from '../lib/supabase';
import { SaveLeadModal } from './SaveLeadModal';
import { RateLimitModal } from './RateLimitModal';
import { voiceService } from '../lib/voice-service';
import { usageTracker, UsageData } from '../lib/usage-tracking';
import { UsageLimitModal } from './UsageLimitModal';
import { 
  recognizeIntent, 
  executeTask, 
  splitMultiIntent, 
  generateResponse, 
  generateUnknownResponse, 
  generateErrorResponse,
  mergeResponses 
} from '../lib/local-ai';
import { callAgentLoop } from '../lib/agent/agent-client';
import { 
  saveMessage, 
  getMemory, 
  syncUserProfile,
  loadHistory
} from '../lib/local-ai/memory-store';
import { AIBotLearningButtons } from './AIBotLearningButtons';
import { saveLearnedIntent } from '../lib/local-ai/learning-service';
import { intents } from '../lib/ai/intents';
import { 
  saveConversationTurn, 
  getConversationContext, 
  updateConversationTopic,
  generateSessionId,
  getUserPreferences
} from '../lib/local-ai/learning-service';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  intent?: string;
  data?: unknown;
  systemLog?: string;
  type?: 'learning-buttons' | 'default';
  originalPhrase?: string;
}

export interface BotResponse {
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
  const [sessionId, setSessionId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
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

  useEffect(() => {
    const initSession = async () => {
      let sessionId = localStorage.getItem('os_bot_session_id');
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('os_bot_session_id', sessionId);
      }
      setSessionId(sessionId);
      
      // Load user preferences
      const userId = currentUser?.id;
      if (userId) {
        const prefs = await getUserPreferences(userId);
        if (prefs?.preferred_name) {
          setUserName(prefs.preferred_name);
        }
      }
    };
    initSession();
  }, [currentUser?.id]);

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

  const [pendingTypoSuggestion, setPendingTypoSuggestion] = useState<{suggestedText: string, keyword: string} | null>(null);

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

      if (isSupabaseConfigured) {
        // Fetch usage data
        await fetchUsage();
        
        // Sync user profile and load history from Supabase
        syncUserProfile(currentUser);
        await loadHistory(currentUser.id);
        
        // Load combined history from memory store after sync
        const memory = getMemory();
        if (memory.history.length > 0) {
          const chatHistory: ChatMessage[] = memory.history.map((m, i) => ({
             id: `hist-${i}-${m.timestamp}`,
             role: m.role === 'assistant' || m.role === 'system' ? 'ai' : 'user',
             content: m.content,
             timestamp: m.timestamp,
             intent: m.intent,
             systemLog: "🤖 OS Bot"
          }));
          setMessages(chatHistory);
        } else {
          setMessages([{
            id: 'welcome',
            role: 'ai',
            content: `Hi there! I'm 🤖 OS Bot. How can I help you on the ${location.pathname.split('/').pop() || 'dashboard'} today?`,
            timestamp: new Date().toISOString(),
            systemLog: "🤖 OS Bot"
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

    // Set initial state immediately to avoid flashing previous text
    setDisplayedText(''); 
    
    const fullText = message.content;
    let currentText = '';
    let index = 0;

    const timer = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.charAt(index);
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(timer);
        setTypingMessageId(null);
      }
    }, 15); // Faster typing speed (15ms)

    return () => {
      clearInterval(timer);
    };
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

  const getContextualResponse = async (input: string): Promise<string | null> => {
    const userId = currentUser?.id;
    if (!userId || !sessionId) return null;
    
    const context = await getConversationContext(userId, sessionId, 3);
    
    // Check for "it" or "that" referring to previous topic
    if (input.toLowerCase().match(/^(it|that|this|those|these)$/)) {
      const lastMessages = context.filter(m => m.role === 'assistant').slice(-1);
      if (lastMessages.length > 0) {
        return `You were asking about ${lastMessages[0].content.substring(0, 100)}... Can you be more specific?`;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || loading || !hasKey) return;

    // Check Usage Limits
    if (usage && usage.remaining <= 0) {
      setShowUsageModal(true);
      return;
    }

    let input = prompt.trim();
    if (input.toLowerCase().match(/^(yes|yeah|yep|yup|sure|ok|okay|proceed|confirm)$/i)) {
      if (pendingTypoSuggestion?.suggestedText) {
        // Reprocess with the suggested text
        input = pendingTypoSuggestion.suggestedText;
        setPendingTypoSuggestion(null);
      }
    }

    const userText = input;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    
    // Save to locally persistent and Supabase memory
    saveMessage('user', userText);
    
    if (sessionId && currentUser?.id) {
      await saveConversationTurn(currentUser.id, sessionId, 'user', userText);
    }
    
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      // Check for contextual follow-up
      const contextual = await getContextualResponse(userText);
      if (contextual) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: contextual,
          timestamp: new Date().toISOString(),
          systemLog: "🤖 OS Bot Context"
        };
        setMessages(prev => [...prev, aiMsg]);
        if (sessionId && currentUser?.id) {
          await saveConversationTurn(currentUser.id, sessionId, 'assistant', contextual);
        }
        setTypingMessageId(aiMsg.id);
        setLoading(false);
        return;
      }
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

      if (isLocalModel) {
        // Multi-Intent Processing
        const multiResults: { intent: any; result: any; segment: string }[] = [];
        for (const segment of segments) {
          try {
            const matched = await recognizeIntent(segment);
            if (matched && matched.confidence >= 80) {
              const res = await executeTask(matched.intent.action, { ...matched.params, sessionId });
              if (res.success) {
                multiResults.push({ intent: matched.intent, result: res, segment });
              }
            }
          } catch (error) {
            console.error('Intent recognition failed for segment:', error);
          }
        }

        if (multiResults.length > 0) {
          const personality = useStore.getState().aiPersonality || 'Default';
          const aiName = useStore.getState().aiName || 'OS Bot';
          const mergedResponse = mergeResponses(multiResults, personality, aiName);
          
          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'ai',
            content: mergedResponse.replace(/^🤖\s*[^:]+:\s*/, ''),
            timestamp: new Date().toISOString(),
            systemLog: `🤖 ${aiName}`
          };
          setMessages(prev => [...prev, aiMsg]);
          setTypingMessageId(aiMsg.id);
          
          if (sessionId && currentUser?.id) {
            await saveConversationTurn(currentUser.id, sessionId, 'assistant', aiMsg.content);
          }
          setLoading(false);
          return;
        }
      }

      let matched = null;
      try {
        matched = await recognizeIntent(userText);
        
        // Topic detection
        if (matched && sessionId && currentUser?.id) {
          if (matched.intent.name.includes('lead')) {
            await updateConversationTopic(currentUser.id, sessionId, 'leads');
          } else if (matched.intent.name.includes('task')) {
            await updateConversationTopic(currentUser.id, sessionId, 'tasks');
          } else if (matched.intent.name.includes('sms')) {
            await updateConversationTopic(currentUser.id, sessionId, 'sms');
          }
        }
      } catch (error) {
        console.error('Intent recognition failed:', error);
        // Fall back to unknown response handling below
      }

      if (matched || isLocalModel) {
        // Increment usage for OS Bot
        await usageTracker.incrementUsage();
        await fetchUsage();

        // ── AGENT LOOP BRIDGE (Week 3) ──────────────────────────────────
        if (matched?.needsAgentLoop && currentUser?.id) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: "I'm analyzing your request and preparing a multi-step plan... 🔄",
            timestamp: new Date().toISOString(),
            systemLog: "🤖 Agent Loop"
          };
          setMessages(prev => [...prev, aiMsg]);
          setTypingMessageId(aiMsg.id);

          try {
            const memory = getMemory();
            const agentResponse = await callAgentLoop(currentUser.id, userText, memory.sessionId);
            
            if (agentResponse.handled && agentResponse.toolCalls) {
              const plans = agentResponse.reasoning || "Confirmed. I'll handle that for you.";
              const planId = (Date.now() + 2).toString();
              
              setMessages(prev => [...prev, {
                id: planId,
                role: 'ai',
                content: plans,
                timestamp: new Date().toISOString(),
                systemLog: "🤖 Agent Reasoning"
              }]);
              setTypingMessageId(planId);

              // Execute tool chain sequentially
              for (const call of agentResponse.toolCalls) {
                const stepMsg = `Executing: ${call.toolName.replace(/_/g, ' ')}...`;
                const stepId = (Date.now() + Math.random()).toString();
                setMessages(prev => [...prev, {
                   id: stepId,
                   role: 'ai',
                   content: stepMsg,
                   timestamp: new Date().toISOString(),
                   systemLog: "🤖 Agent Action"
                }]);
                
                try {
                  const result = await executeTask(call.toolName, { ...call.params, sessionId });
                  setMessages(prev => prev.map(m => 
                    m.id === stepId ? { ...m, content: `${result.message} ✅` } : m
                  ));
                } catch (toolErr: any) {
                  setMessages(prev => prev.map(m => 
                    m.id === stepId ? { ...m, content: `Failed to execute ${call.toolName}: ${toolErr.message} ❌` } : m
                  ));
                }
              }
              
              setLoading(false);
              return;
            } else {
              // Agent loop returned but didn't handle or failed. 
              // We log it and let the local logic below take over using the 'matched' variable.
              console.warn('Agent Loop did not handle request or returned error. Falling back to local.', agentResponse.error);
            }
          } catch (err) {
            console.error('Agent Loop fatal failure, falling back to local:', err);
          }
        }

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
          const res = await executeTask(matched.intent.action, { ...matched.params, sessionId });
          if (res.success) {
            const aiMsg: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'ai',
              content: generateResponse(matched.intent, res, userText),
              timestamp: new Date().toISOString(),
              intent: matched.intent.name,
              data: res.data,
              systemLog: "🤖 OS Bot"
            };

            if (matched.intent.name === 'typo_suggestion') {
              setMessages(prev => [
                ...prev, 
                aiMsg,
                { id: (Date.now() + 100).toString(), role: 'ai', type: 'learning-buttons', content: '', originalPhrase: userText, timestamp: new Date().toISOString() }
              ]);
            } else {
              setMessages(prev => [...prev, aiMsg]);
            }

            if (sessionId && currentUser?.id) {
              await saveConversationTurn(currentUser.id, sessionId, 'assistant', aiMsg.content);
            }
            setTypingMessageId(aiMsg.id);
            setLoading(false);
            return;
          }
        }

        // If explicitly set to OS Bot but no intent matched, or intent failed
        if (isLocalModel) {
          const response = generateUnknownResponse(userText);
          setMessages(prev => [
            ...prev, 
            { 
              id: (Date.now() + 1).toString(), 
              role: 'ai', 
              content: response, 
              timestamp: new Date().toISOString()
            },
            { 
              id: (Date.now() + 100).toString(), 
              role: 'ai', 
              type: 'learning-buttons',
              content: '',
              originalPhrase: userText,
              timestamp: new Date().toISOString()
            }
          ]);
          if (sessionId && currentUser?.id) {
            await saveConversationTurn(currentUser.id, sessionId, 'assistant', response);
          }
          setTypingMessageId((Date.now() + 1).toString());
          setLoading(false);
          return;
        }
      }

      if (matched && matched.intent.name === 'typo_suggestion') {
        setPendingTypoSuggestion({
          suggestedText: matched.params.suggestedText as string,
          keyword: matched.params.keyword as string
        });
      }

      // ── Normal AI processing (Only if NOT Local Model) ──────────────────
      if (isLocalModel) {
        const response = generateUnknownResponse(userText);
        setMessages(prev => [...prev, 
          { 
            id: (Date.now() + 1).toString(), 
            role: 'ai', 
            content: response, 
            timestamp: new Date().toISOString(),
            systemLog: "🤖 OS Bot"
          },
          { 
            id: (Date.now() + 2).toString(), 
            role: 'ai', 
            content: '', 
            type: 'learning-buttons', 
            originalPhrase: userText,
            timestamp: new Date().toISOString()
          }
        ]);
        if (sessionId && currentUser?.id) {
          await saveConversationTurn(currentUser.id, sessionId, 'assistant', response);
        }
        setTypingMessageId((Date.now() + 1).toString());
        setLoading(false);
        return;
      }

      const response = await processPrompt(userText, { 
        page: location.pathname,
        currentTime: new Date().toISOString()
      }, aiModel);

      if (response.intent === 'rate_limit') {
        setShowRateLimitModal(true);
        const finalId = (Date.now() + 1).toString();
        const content = response.response || "AI initialization complete.";
        setMessages(prev => [...prev, {
          id: finalId,
          role: 'ai',
          content,
          timestamp: new Date().toISOString(),
          systemLog: "🤖 OS Bot"
        }]);
        saveMessage('assistant', content, 'rate_limit');
        setTypingMessageId(finalId);
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
        const finalId = (Date.now() + 1).toString();
        const content = "I need your OS Cloud Key to work. Redirecting you to settings...";
        setMessages(prev => [...prev, {
          id: finalId,
          role: 'ai',
          content,
          timestamp: new Date().toISOString(),
          systemLog: "🤖 OS Bot"
        }]);
        saveMessage('assistant', content, 'redirect_setup');
        setTypingMessageId(finalId);
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
          const finalId = Date.now().toString();
          setMessages(prev => [...prev.slice(0, -1), {
            id: finalId,
            role: "ai",
            content: response.response,
            timestamp: new Date().toISOString(),
            systemLog: response.systemLog || "🤖 OS Bot"
          }]);
          saveMessage('assistant', response.response, 'confirm_action');
          setTypingMessageId(finalId);
        } else {
          // Missing info — start SMS session to collect it conversationally
          const finalId = (Date.now() + 1).toString();
          setMessages(prev => [...prev, {
            id: finalId,
            role: 'ai',
            content: response.response,
            timestamp: new Date().toISOString(),
            intent: 'ask_question',
            systemLog: response.systemLog || "🤖 OS Bot"
          }]);
          saveMessage('assistant', response.response, 'ask_question');
          setTypingMessageId(finalId);
        }

      } else if (response.intent === 'ask_save_contact') {
        setSaveContactModal({
          isOpen: true,
          phone: response.data?.phone || ''
        });
        const finalId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: finalId,
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: 'ask_save_contact',
          data: response.data,
          systemLog: "🤖 OS Bot"
        }]);
        saveMessage('assistant', response.response, 'ask_save_contact');
        setTypingMessageId(finalId);
      } else {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          intent: response.intent,
          data: response.data,
          systemLog: response.systemLog || "🤖 OS Bot"
        };
        setMessages(prev => [...prev, aiMsg]);
        if (sessionId && currentUser?.id) {
          await saveConversationTurn(currentUser.id, sessionId, 'assistant', response.response);
        }
        saveMessage('assistant', response.response, response.intent);
        setTypingMessageId(aiMsg.id);
        speak(response.response);

        if (response.intent === 'navigate' && response.data?.path) {
          navigate(response.data.path);
        } else if (response.intent === 'multi_action' && response.data?.actions) {
          (response.data.actions as any[]).forEach((act: { intent: string; data?: any }) => {
            if (act.intent === 'navigate' && act.data?.path) {
              navigate(act.data.path);
            } else if (act.intent === 'create_task') {
              handleExecuteAction('create_task', act.data);
            }
          });
        }
      }
    } catch (err: any) {
      const errorMsg = generateErrorResponse(err?.message || "An unexpected error occurred.");
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: errorMsg,
        timestamp: new Date().toISOString(),
        systemLog: "🤖 OS Bot"
      }]);
      saveMessage('assistant', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLearnIntent = async (originalPhrase: string, intent: string, params: Record<string, any> = {}) => {
    const userId = currentUser?.id;
    if (!userId) return;
    
    await saveLearnedIntent(userId, originalPhrase, intent, params);
    console.log(`[🤖 OS Bot] Learned: "${originalPhrase}" → ${intent}`);
    
    const intentObj = intents.find(i => i.name === intent);
    if (intentObj) {
      const result = await executeTask(intentObj.action, { ...params });
      const response = generateResponse(intentObj, result, originalPhrase);
      
      const botMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        content: response,
        timestamp: new Date().toISOString(),
        systemLog: "🤖 OS Bot"
      };
      setMessages(prev => [...prev, botMsg]);
      setTypingMessageId(botMsg.id);
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

      const finalId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: finalId,
        role: 'ai',
        content: result
          ? (result.success ? result.message : `❌ ${result.message}`)
          : 'Action completed.',
        timestamp: new Date().toISOString(),
        intent: intent
      }]);
      setTypingMessageId(finalId);
      
      const speechText = result 
        ? (result.success ? result.message : `Error. ${result.message}`)
        : 'Action completed.';
      speak(speechText);
    } catch (err: any) {
      console.error('Widget action failed:', err);
      setLoading(false);
      const errId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: errId,
        role: 'ai',
        content: `❌ ${err?.message || "Couldn't complete that action. Please check your Google/SMS settings."}`,
        timestamp: new Date().toISOString(),
        systemLog: aiModel === 'os-bot' ? "🤖 OS Bot" : "✨ Gemini"
      }]);
      setTypingMessageId(errId);
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
                <h2 className="text-xs font-black text-[var(--t-text)] leading-none">🤖 {userName ? `OS Bot | ${userName}` : 'OS Bot'}</h2>
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

            {messages.map((msg) => {
              if (msg.type === 'learning-buttons') {
                return (
                  <AIBotLearningButtons
                    key={msg.id}
                    originalPhrase={msg.originalPhrase || ''}
                    onSelect={(intent) => handleLearnIntent(msg.originalPhrase || '', intent)}
                    onDismiss={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                  />
                );
              }

              return (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: msg.role === 'user' ? 'var(--t-primary)' : 'var(--t-surface-subtle)' }}>
                    {msg.role === 'user' ? <User className="w-3 h-3" style={{ color: 'var(--t-on-primary)' }} /> : <Bot className="w-3 h-3" style={{ color: 'var(--t-primary)' }} />}
                  </div>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-4 py-3 rounded-[1.5rem] text-xs leading-relaxed shadow-lg ${
                      msg.role === 'user' ? 'rounded-tr-none bg-[var(--t-primary)] text-[var(--t-on-primary)]' : 'border rounded-tl-none bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)]'
                    }`}>
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[var(--t-primary)] text-[var(--t-on-primary)] uppercase tracking-tighter">
                            {msg.role === 'ai' ? '🤖 OS Bot' : 'You'}
                          </span>
                          {msg.systemLog && (
                            <span className="text-[8px] font-bold text-[var(--t-text-muted)] opacity-50 uppercase tracking-widest truncate max-w-[100px]">
                              {msg.systemLog.replace('🤖 OS Bot', '').replace('✨ Gemini', '').trim()}
                            </span>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">
                          {msg.id === typingMessageId ? (
                            <div className="flex flex-col gap-3">
                              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">{displayedText}</div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--t-primary)]/10 rounded-full w-fit border border-[var(--t-primary)]/20 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-bounce [animation-duration:0.8s]" />
                                <span className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:0.8s]" />
                                <span className="w-1.5 h-1.5 bg-[var(--t-primary)] rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:0.8s]" />
                              </div>
                            </div>
                          ) : msg.content}
                        </div>

                        {msg.intent === 'disambiguation' && (msg.data as DisambiguationData)?.originalIntent && (
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => {
                                const matched = (msg.data as DisambiguationData).originalIntent;
                                handleExecuteAction(matched.intent.action, matched.params);
                                setMessages(prev => prev.map(msgItem => msgItem.id === msg.id ? { ...msgItem, intent: 'resolved' } : msgItem));
                              }}
                              className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--t-primary)] text-white hover:scale-105 transition-all shadow-md shadow-[var(--t-primary-dim)]"
                            >
                              Proceed
                            </button>
                            <button
                              onClick={() => {
                                setMessages(prev => [...prev, {
                                  id: Date.now().toString(),
                                  role: 'ai',
                                  content: "No problem! How can I help then?",
                                  timestamp: new Date().toISOString()
                                }]);
                                setMessages(prev => prev.map(msgItem => msgItem.id === msg.id ? { ...msgItem, intent: 'resolved' } : msgItem));
                              }}
                              className="px-4 py-1.5 bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] border border-[var(--t-border)] rounded-xl text-[10px] font-bold"
                            >
                              No
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <div className="w-6 h-6 rounded-full bg-[var(--t-surface-subtle)] border border-[var(--t-border)] flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-[var(--t-primary)]" />
                </div>
                <div className="px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[1.5rem] rounded-tl-none shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[var(--t-border)] text-[var(--t-text-muted)] uppercase tracking-tighter animate-pulse">
                      Thinking...
                    </span>
                  </div>
                  <div className="flex gap-1.5 p-1">
                    <span className="w-2 h-2 bg-[var(--t-primary)] rounded-full animate-bounce [animation-duration:0.6s]" />
                    <span className="w-2 h-2 bg-[var(--t-primary)] rounded-full animate-bounce [animation-delay:0.2s] [animation-duration:0.6s]" />
                    <span className="w-2 h-2 bg-[var(--t-primary)] rounded-full animate-bounce [animation-delay:0.4s] [animation-duration:0.6s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className={`p-3 border-t flex flex-col gap-2 ${position.y < 200 ? 'order-2 border-t-0' : ''}`}
            style={{ background: 'var(--t-surface-hover)', borderColor: 'var(--t-border)' }}
          >
            {/* Quick Actions */}
            <div className="flex gap-2 px-1 pb-1 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-1">
              {(() => {
                const memory = getMemory();
                const activeLead = memory.entityStack.find(e => e.type === 'lead');
                if (!activeLead) return null;

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(`text ${activeLead.name}`);
                        // Small delay to ensure prompt state is updated if needed, 
                        // though in React we should probably call a handler directly.
                        // For now, let's just trigger submit.
                        setTimeout(() => handleSubmit(), 10);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--t-primary-dim)] border border-[var(--t-primary)]/20 text-[var(--t-primary)] text-[10px] font-bold hover:scale-105 transition-all shadow-sm shrink-0"
                    >
                      <MessageSquare size={12} /> SMS {activeLead.name.split(' ')[0]}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(`add task for ${activeLead.name}`);
                        setTimeout(() => handleSubmit(), 10);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] text-[10px] font-bold hover:scale-105 transition-all shadow-sm shrink-0"
                    >
                      <CheckCircle2 size={12} /> Task
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(`add note for ${activeLead.name}`);
                        setTimeout(() => handleSubmit(), 10);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] text-[10px] font-bold hover:scale-105 transition-all shadow-sm shrink-0"
                    >
                      <FileText size={12} /> Note
                    </button>
                  </>
                );
              })()}
            </div>

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
            // Slide to OS Bot area (dock)
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
