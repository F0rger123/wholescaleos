import { useState, useEffect } from 'react';
import { Mic, X, Volume2, Square, Bot, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [bars, setBars] = useState<number[]>(new Array(20).fill(20));

  // Simulate voice bars animation
  useEffect(() => {
    if (isListening || isSpeaking) {
      const interval = setInterval(() => {
        setBars(new Array(20).fill(0).map(() => Math.random() * 40 + 10));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setBars(new Array(20).fill(5));
    }
  }, [isListening, isSpeaking]);

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Auto-start listening when opened for that "premium" feel
      setTimeout(() => setIsListening(true), 500);
    } else {
      setIsListening(false);
      setIsSpeaking(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      setIsListening(false);
      // Simulate AI processing and speaking
      setTranscript('How many leads did we get in Dallas this week?');
      setTimeout(() => {
        setIsSpeaking(true);
        setResponse('You received 12 new leads in Dallas, with an average deal score of 78. Would you like me to assign them to your top agents?');
      }, 1000);
    } else {
      setIsListening(true);
      setResponse('');
      setTranscript('');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={toggleAssistant}
        className="fixed bottom-6 right-24 z-[var(--z-popover)] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 active:scale-95"
        style={{ 
          background: 'linear-gradient(135deg, var(--t-primary), var(--t-accent, #8b5cf6))',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)'
        }}
        whileHover={{ rotate: 5 }}
      >
        {isOpen ? <X size={24} /> : <Mic size={24} />}
      </motion.button>

      {/* Assistant UI */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[var(--z-popover)] w-80 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-6 pb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center">
                  <Bot size={18} className="text-[var(--t-primary)]" />
                </div>
                <div>
                  <h3 className="text-sm font-black italic uppercase tracking-tight" style={{ color: 'var(--t-text)' }}>Voice Assistant</h3>
                  <p className="text-[10px] text-[var(--t-primary)] font-bold tracking-widest uppercase">AI Agent Active</p>
                </div>
              </div>
            </div>

            {/* Voice Visualization */}
            <div className="px-6 py-8 flex flex-col items-center justify-center space-y-6">
              <div className="flex items-end gap-1 h-12">
                {bars.map((height, i) => (
                  <motion.div
                    key={i}
                    animate={{ height }}
                    className="w-1.5 rounded-full bg-[var(--t-primary)] opacity-60"
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  />
                ))}
              </div>

              <button
                onClick={handleMicClick}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isListening ? 'bg-[var(--t-error)] scale-110' : 'bg-[var(--t-primary)]'
                }`}
              >
                {isListening ? (
                  <Square size={32} className="text-white fill-white" />
                ) : isSpeaking ? (
                  <Volume2 size={32} className="text-white animate-pulse" />
                ) : (
                  <Mic size={32} className="text-white" />
                )}
              </button>

              <div className="text-center min-h-[60px]">
                {isListening ? (
                  <p className="text-sm font-medium animate-pulse text-[var(--t-primary)]">Listening...</p>
                ) : transcript ? (
                  <div className="space-y-4">
                    <p className="text-xs italic text-[var(--t-text-muted)]">"{transcript}"</p>
                    {response && (
                      <motion.p 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="text-sm font-medium text-[var(--t-text)] leading-relaxed"
                      >
                        {response}
                      </motion.p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--t-text-muted)]">"How many leads did we get today?"<br/>"Draft an offer for 123 Main St"</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[var(--t-surface-hover)] border-t border-[var(--t-border)] flex items-center justify-between">
              <button className="p-2 hover:bg-[var(--t-surface)] rounded-lg text-[var(--t-text-muted)] transition-colors">
                <Settings size={14} />
              </button>
              <div className="flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-[var(--t-success)] animate-pulse" />
                 <span className="text-[10px] font-bold text-[var(--t-text-muted)] uppercase">Encrypted</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

