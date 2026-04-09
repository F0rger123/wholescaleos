import { useState, useEffect } from 'react';
import { 
  Mail, Phone, FileText, CheckCircle2, 
  MessageSquare, Zap, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  user_name: string;
  created_at: string;
  metadata?: any;
}

interface TimelineData {
  id: string;
  type: string;
  content: string;
  user_name?: string;
  created_at: string;
  metadata?: any;
}

interface LogData {
  id: string;
  action: string;
  component: string;
  created_at: string;
  details?: any;
}

export function TeamActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        // Fetch from timeline_entries (lead interactions)
        const { data: timeline, error: tError } = await supabase
          .from('timeline_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (tError) throw tError;

        // Fetch from system_logs (platform actions)
        const { data: logs, error: lError } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (lError) throw lError;

        // Combine and sort
        const combined = [
          ...(timeline as unknown as TimelineData[] || []).map((t) => ({
            id: t.id,
            type: t.type,
            content: t.content,
            user_name: t.user_name || 'System',
            created_at: t.created_at,
            metadata: t.metadata
          })),
          ...(logs as unknown as LogData[] || []).map((l) => ({
            id: l.id,
            type: 'system',
            content: `${l.action}: ${l.component}`,
            user_name: 'Admin',
            created_at: l.created_at,
            metadata: l.details
          }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

        setActivities(combined);
      } catch (err) {
        console.error('Activity feed load error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivity();
    
    // Subscribe to real-time updates if needed (omitted for brevity in initial stabilization)
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={14} />;
      case 'email': return <Mail size={14} />;
      case 'note': return <FileText size={14} />;
      case 'status-change': return <RefreshCcw size={14} />;
      case 'task': return <CheckCircle2 size={14} />;
      case 'system': return <Zap size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'call': return 'text-blue-500 bg-blue-500/10';
      case 'email': return 'text-purple-500 bg-purple-500/10';
      case 'status-change': return 'text-orange-500 bg-orange-500/10';
      case 'system': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-[var(--t-primary)] bg-[var(--t-primary-dim)]';
    }
  };

  if (isLoading) return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i: number) => (
        <div key={i} className="h-16 w-full animate-pulse bg-[var(--t-surface-dim)] rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="py-12 text-center">
          <Clock size={32} className="mx-auto mb-3 text-[var(--t-text-muted)] opacity-20" />
          <p className="text-xs text-[var(--t-text-muted)]">No recent activity</p>
        </div>
      ) : (
        activities.map((act) => (
          <div key={act.id} className="flex gap-3 group">
            <div className={`mt-1 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${getColor(act.type)}`}>
              {getIcon(act.type)}
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <p className="text-xs font-bold text-[var(--t-text)] truncate">{act.user_name}</p>
                  <span className="text-[10px] text-[var(--t-text-muted)] whitespace-nowrap">
                    {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                  </span>
               </div>
               <p className="text-[11px] text-[var(--t-text-muted)] line-clamp-1 group-hover:line-clamp-none transition-all">
                  {act.content}
               </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function RefreshCcw({ size, ...props }: { size: number; [key: string]: any }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>;
}
