import { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ChatPreview {
  id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

export function TeamChatPreview() {
  const [messages, setMessages] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRecentChat() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.error('Chat preview load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentChat();
  }, []);

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2].map(i => <div key={i} className="h-12 w-full animate-pulse bg-[var(--t-surface-dim)] rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="py-8 text-center bg-[var(--t-bg)] rounded-2xl border border-dashed border-[var(--t-border)]">
          <MessageSquare size={24} className="mx-auto mb-2 text-[var(--t-text-muted)] opacity-20" />
          <p className="text-[10px] text-[var(--t-text-muted)]">No active chat threads</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3 p-2.5 bg-[var(--t-bg)] rounded-xl border border-[var(--t-border)] hover:border-[var(--t-primary-dim)] transition-all cursor-pointer group" onClick={() => navigate('/chat')}>
                <div className="w-8 h-8 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] text-[10px] font-bold">
                  {m.sender_avatar ? <img src={m.sender_avatar} className="w-full h-full rounded-full object-cover" /> : m.sender_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[var(--t-text)] truncate">{m.sender_name}</p>
                  <p className="text-[10px] text-[var(--t-text-muted)] line-clamp-1">{m.content}</p>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => navigate('/chat')}
            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-[var(--t-primary)] bg-[var(--t-primary-dim)]/10 hover:bg-[var(--t-primary-dim)]/20 rounded-xl transition-all"
          >
            Go to Team Chat <ArrowRight size={12} />
          </button>
        </>
      )}
    </div>
  );
}
