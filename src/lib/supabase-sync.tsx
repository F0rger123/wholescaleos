/**
 * ─── Supabase Sync Component ──────────────────────────────────────────────────
 *
 * Handles all data synchronization between Supabase and the Zustand store:
 * 1. On mount: finds the user's team, fetches all data, populates the store
 * 2. Sets up real-time subscriptions for leads, messages, tasks, notifications
 * 3. Re-fetches when user changes
 *
 * When Supabase isn't configured (demo mode), this component is a no-op.
 */

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useStore, type Lead, type TeamMember, type Task, type ChatChannel, type ChatMessage, type Buyer, type CoverageArea, type AppNotification, type TimelineEntry, type StatusHistoryEntry } from '../store/useStore';
import { supabase, isSupabaseConfigured } from './supabase';
import { Building2, Loader2, Database, Wifi } from 'lucide-react';

// ─── DB → Store Converters ────────────────────────────────────────────────────

function dbLeadToStore(row: Record<string, unknown>, timeline: TimelineEntry[], statusHistory: StatusHistoryEntry[]): Lead {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || '',
    status: (row.status as Lead['status']) || 'new',
    source: (row.source as Lead['source']) || 'other',
    propertyAddress: (row.address as string) || '',
    propertyType: (row.property_type as Lead['propertyType']) || 'single-family',
    estimatedValue: Number(row.property_value) || 0,
    offerAmount: Number(row.offer_amount) || 0,
    lat: Number(row.lat) || 30.2672,
    lng: Number(row.lng) || -97.7431,
    notes: (row.notes as string) || '',
    assignedTo: (row.assigned_to as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    probability: Number(row.probability) || 50,
    engagementLevel: Number(row.engagement_level) || 3,
    timelineUrgency: Number(row.timeline_urgency) || 3,
    competitionLevel: Number(row.competition_level) || 3,
    importSource: (row.import_source as string) || undefined,
    photos: (row.photos as string[]) || [],
    timeline,
    statusHistory,
  };
}

function dbTeamMemberToStore(row: Record<string, unknown>, profile: Record<string, unknown> | null): TeamMember {
  const name = (profile?.full_name as string) || (profile?.email as string)?.split('@')[0] || 'User';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  return {
    id: (row.user_id as string) || (row.id as string),
    name,
    role: (profile?.role as string) || 'Member',
    email: (profile?.email as string) || '',
    phone: (profile?.phone as string) || '',
    avatar: (profile?.avatar_url as string) || initials,
    dealsCount: 0,
    revenue: 0,
    presenceStatus: ((row.status as string) || 'offline') as TeamMember['presenceStatus'],
    lastSeen: (row.last_seen as string) || new Date().toISOString(),
    customStatus: (row.custom_status as string) || '',
    teamRole: ((row.role as string) || 'member') as TeamMember['teamRole'],
  };
}

function dbTaskToStore(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    description: (row.description as string) || '',
    assignedTo: (row.assigned_to as string) || '',
    dueDate: (row.due_date as string) || '',
    priority: ((row.priority as string) || 'medium') as Task['priority'],
    status: ((row.status as string) || 'todo') as Task['status'],
    createdBy: (row.created_by as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    completedAt: (row.completed_at as string) || null,
    leadId: (row.lead_id as string) || undefined,
  };
}

function dbChannelToStore(row: Record<string, unknown>, memberIds: string[]): ChatChannel {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    type: ((row.type as string) || 'group') as ChatChannel['type'],
    members: memberIds,
    description: (row.description as string) || '',
    avatar: (row.avatar as string) || '💬',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    createdBy: (row.created_by as string) || '',
    lastMessageAt: (row.last_message_at as string) || new Date().toISOString(),
    pinnedMessageIds: [],
  };
}

function dbMessageToStore(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    channelId: (row.channel_id as string) || '',
    senderId: (row.user_id as string) || '',
    senderName: (row.sender_name as string) || 'User',
    senderAvatar: ((row.sender_name as string) || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    content: (row.content as string) || '',
    timestamp: (row.created_at as string) || new Date().toISOString(),
    type: ((row.type as string) || 'text') as ChatMessage['type'],
    mentions: (row.mentions as string[]) || [],
    reactions: [],
    replyToId: (row.reply_to_id as string) || null,
    attachments: (row.attachments as ChatMessage['attachments']) || [],
    edited: (row.edited as boolean) || false,
    readBy: [(row.user_id as string) || ''],
    deleted: (row.deleted as boolean) || false,
  };
}

function dbBuyerToStore(row: Record<string, unknown>): Buyer {
  const criteria = (row.criteria as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || '',
    lat: Number(row.lat) || 30.27,
    lng: Number(row.lng) || -97.74,
    criteria: {
      propertyTypes: (criteria.propertyTypes as Buyer['criteria']['propertyTypes']) || ['single-family'],
      bedroomsMin: Number(criteria.bedroomsMin) || 2,
      bathroomsMin: Number(criteria.bathroomsMin) || 1,
      sqftMin: Number(criteria.sqftMin) || 1000,
      sqftMax: Number(criteria.sqftMax) || 3000,
      locationPreferences: (criteria.locationPreferences as string[]) || [],
    },
    budgetMin: Number(row.budget_min) || 0,
    budgetMax: Number(row.budget_max) || 0,
    active: row.active !== false,
    dealScore: Number(row.deal_score) || 50,
    notes: (row.notes as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function dbCoverageAreaToStore(row: Record<string, unknown>): CoverageArea {
  let coords: [number, number][] = [];
  try {
    const raw = row.coordinates;
    if (typeof raw === 'string') coords = JSON.parse(raw);
    else if (Array.isArray(raw)) coords = raw as [number, number][];
  } catch { /* empty */ }
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    coordinates: coords,
    color: (row.color as string) || '#3b82f6',
    opacity: Number(row.opacity) || 0.2,
    leadCount: 0,
    notes: (row.notes as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

function dbNotificationToStore(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: (row.type as AppNotification['type']) || 'system',
    title: (row.title as string) || '',
    message: (row.message as string) || '',
    timestamp: (row.created_at as string) || new Date().toISOString(),
    read: (row.read as boolean) || false,
    link: (row.link as string) || undefined,
  };
}

function dbTimelineToStore(row: Record<string, unknown>): TimelineEntry {
  return {
    id: row.id as string,
    type: ((row.type as string) || 'note') as TimelineEntry['type'],
    content: (row.content as string) || '',
    timestamp: (row.created_at as string) || new Date().toISOString(),
    user: (row.user_id as string) || 'System',
    metadata: (row.metadata as Record<string, string>) || undefined,
  };
}

function dbStatusHistoryToStore(row: Record<string, unknown>): StatusHistoryEntry {
  return {
    fromStatus: (row.from_status as StatusHistoryEntry['fromStatus']) || null,
    toStatus: (row.to_status as StatusHistoryEntry['toStatus']) || 'new',
    timestamp: (row.changed_at as string) || new Date().toISOString(),
    changedBy: (row.changed_by as string) || 'System',
  };
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

function SyncLoadingScreen({ status }: { status: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: 'var(--t-bg, #0f172a)' }}>
      <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center shadow-xl shadow-brand-600/20">
        <Building2 size={32} className="text-white" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-white mb-1">Loading WholeScale OS</h2>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">{status}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Wifi size={12} />
          <span>Connected</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-brand-400">
          <Database size={12} />
          <span>Syncing data</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Sync Component ──────────────────────────────────────────────────────

export function SupabaseSync({ children }: { children: ReactNode }) {
  const currentUser = useStore((s) => s.currentUser);
  const dataLoaded = useStore((s) => s.dataLoaded);
  const [syncStatus, setSyncStatus] = useState('Connecting...');
  const [loading, setLoading] = useState(true);
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([]);

  useEffect(() => {
    // Demo mode — no sync needed, data is already in store (seed data)
    if (!isSupabaseConfigured || !supabase || !currentUser) {
      setLoading(false);
      return;
    }

    // Already loaded — don't re-fetch
    if (dataLoaded) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAllData() {
      try {
        const userId = currentUser!.id;

        // ── Step 1: Find user's team ──────────────────────────────────
        setSyncStatus('Finding your team...');
        const { data: teamMemberships } = await supabase!
          .from('team_members')
          .select('team_id, role, status, custom_status, last_seen, teams(*)')
          .eq('user_id', userId);

        if (cancelled) return;

        if (!teamMemberships || teamMemberships.length === 0) {
          console.log('No team found — user may need team setup');
          setLoading(false);
          // Set empty data so the app still works
          useStore.setState({ dataLoaded: true, teamId: null });
          return;
        }

        // If user has multiple teams, prefer the one they joined via invite code
        // (stored in localStorage by the signup flow)
        const preferredTeamId = localStorage.getItem('wholescale-preferred-team');
        let membership = teamMemberships[0];
        if (preferredTeamId) {
          const preferred = teamMemberships.find(m => m.team_id === preferredTeamId);
          if (preferred) {
            membership = preferred;
          }
          // Clean up — only need this for the first load after joining
          // Keep it so refreshes also use the preferred team
        }

        const teamId = membership.team_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teamData = (membership as any).teams as Record<string, unknown>;

        // Update team config
        useStore.setState({
          teamId,
          teamConfig: {
            id: teamId,
            name: (teamData?.name as string) || 'My Team',
            inviteCode: (teamData?.invite_code as string) || 'WS-000000',
            createdAt: (teamData?.created_at as string) || new Date().toISOString(),
            createdBy: (teamData?.owner_id as string) || userId,
          },
        });

        // ── Step 2: Fetch all data in parallel ────────────────────────
        setSyncStatus('Loading leads...');

        const [
          leadsRes, teamMembersRes, tasksRes, channelsRes,
          buyersRes, coverageRes, notifRes, timelineRes, statusHistRes,
        ] = await Promise.all([
          supabase!.from('leads').select('*').eq('team_id', teamId).order('updated_at', { ascending: false }),
          supabase!.from('team_members').select('*, profiles(*)').eq('team_id', teamId),
          supabase!.from('tasks').select('*').eq('team_id', teamId).order('due_date', { ascending: true }),
          supabase!.from('channels').select('*, channel_members(user_id)').eq('team_id', teamId).order('last_message_at', { ascending: false }),
          supabase!.from('buyers').select('*').eq('team_id', teamId),
          supabase!.from('coverage_areas').select('*').eq('team_id', teamId),
          supabase!.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          supabase!.from('timeline_entries').select('*').order('created_at', { ascending: true }),
          supabase!.from('status_history').select('*').order('changed_at', { ascending: true }),
        ]);

        if (cancelled) return;
        setSyncStatus('Processing data...');

        // ── Step 3: Group timeline and status history by lead_id ──────
        const timelineByLead: Record<string, TimelineEntry[]> = {};
        for (const row of (timelineRes.data || [])) {
          const leadId = row.lead_id as string;
          if (!timelineByLead[leadId]) timelineByLead[leadId] = [];
          timelineByLead[leadId].push(dbTimelineToStore(row));
        }

        const statusHistByLead: Record<string, StatusHistoryEntry[]> = {};
        for (const row of (statusHistRes.data || [])) {
          const leadId = row.lead_id as string;
          if (!statusHistByLead[leadId]) statusHistByLead[leadId] = [];
          statusHistByLead[leadId].push(dbStatusHistoryToStore(row));
        }

        // ── Step 4: Convert all data ─────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leads: Lead[] = (leadsRes.data || []).map((row: any) =>
          dbLeadToStore(row, timelineByLead[row.id as string] || [], statusHistByLead[row.id as string] || [])
        );

        // Enrich team members with deal counts from leads
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const team: TeamMember[] = (teamMembersRes.data || []).map((row: any) => {
          const profile = row.profiles || null;
          const member = dbTeamMemberToStore(row, profile);
          // Count deals assigned to this member
          member.dealsCount = leads.filter(l => l.assignedTo === member.name || l.assignedTo === member.id).length;
          member.revenue = leads
            .filter(l => (l.assignedTo === member.name || l.assignedTo === member.id) && l.status === 'closed-won')
            .reduce((sum, l) => sum + l.estimatedValue, 0);
          return member;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasks: Task[] = (tasksRes.data || []).map((row: any) => dbTaskToStore(row));

        // Channels and messages
        const channels: ChatChannel[] = [];
        const messages: Record<string, ChatMessage[]> = {};
        const unreadCounts: Record<string, number> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const chRow of ((channelsRes.data || []) as any[])) {
          const chId = chRow.id as string;
          const memberIds = ((chRow.channel_members as Array<{ user_id: string }>) || []).map(cm => cm.user_id);
          channels.push(dbChannelToStore(chRow, memberIds));

          // Fetch messages for this channel
          const { data: msgData } = await supabase!
            .from('messages')
            .select('*')
            .eq('channel_id', chId)
            .order('created_at', { ascending: true })
            .limit(100);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages[chId] = (msgData || []).map((m: any) => dbMessageToStore(m));
          unreadCounts[chId] = 0;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buyers: Buyer[] = (buyersRes.data || []).map((row: any) => dbBuyerToStore(row));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const coverageAreas: CoverageArea[] = (coverageRes.data || []).map((row: any) => dbCoverageAreaToStore(row));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notifications: AppNotification[] = (notifRes.data || []).map((row: any) => dbNotificationToStore(row));

        if (cancelled) return;

        // ── Step 5: Set all data in store at once ─────────────────────
        setSyncStatus('Ready!');

        useStore.setState({
          dataLoaded: true,
          leads,
          team,
          tasks,
          channels,
          messages,
          unreadCounts,
          currentChannelId: channels[0]?.id || null,
          buyers,
          coverageAreas,
          notifications,
          // Keep other state (theme, streaks, etc.)
        });

        // ── Step 6: Set up real-time subscriptions ────────────────────
        setupRealtimeSubscriptions(teamId, userId);

        // ── Step 7: Update user's presence to online ──────────────────
        await supabase!.from('team_members')
          .update({ status: 'online', last_seen: new Date().toISOString() })
          .eq('team_id', teamId)
          .eq('user_id', userId);

      } catch (err) {
        console.error('SupabaseSync: Error loading data:', err);
        // Still let the app render — it'll just show empty data
        useStore.setState({ dataLoaded: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAllData();

    return () => {
      cancelled = true;
      // Cleanup subscriptions
      for (const sub of subscriptionsRef.current) {
        try { sub.unsubscribe(); } catch { /* ignore */ }
      }
      subscriptionsRef.current = [];
    };
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time subscription setup ────────────────────────────────────────────

  function setupRealtimeSubscriptions(teamId: string, userId: string) {
    if (!supabase) return;

    // Clean up existing subscriptions
    for (const sub of subscriptionsRef.current) {
      try { sub.unsubscribe(); } catch { /* ignore */ }
    }
    subscriptionsRef.current = [];

    // 1. Leads — real-time INSERT/UPDATE/DELETE
    const leadsChannel = supabase.channel(`sync-leads-${teamId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'leads',
        filter: `team_id=eq.${teamId}`,
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const state = useStore.getState();

        if (eventType === 'INSERT' && newRow) {
          // Don't add if we already have it (local optimistic update)
          if (state.leads.find(l => l.id === newRow.id)) return;
          const lead = dbLeadToStore(newRow as Record<string, unknown>, [], []);
          useStore.setState({ leads: [...state.leads, lead] });
        } else if (eventType === 'UPDATE' && newRow) {
          const updated = dbLeadToStore(newRow as Record<string, unknown>,
            state.leads.find(l => l.id === newRow.id)?.timeline || [],
            state.leads.find(l => l.id === newRow.id)?.statusHistory || [],
          );
          useStore.setState({
            leads: state.leads.map(l => l.id === newRow.id ? { ...l, ...updated } : l),
          });
        } else if (eventType === 'DELETE' && oldRow) {
          useStore.setState({ leads: state.leads.filter(l => l.id !== oldRow.id) });
        }
      })
      .subscribe();

    subscriptionsRef.current.push({
      unsubscribe: () => supabase!.removeChannel(leadsChannel),
    });

    // 2. Messages — real-time INSERT
    const messagesChannel = supabase.channel(`sync-messages-${teamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload) => {
        const newRow = payload.new;
        if (!newRow) return;
        const state = useStore.getState();
        const channelId = newRow.channel_id as string;
        const existingMsgs = state.messages[channelId] || [];

        // Don't add if we already have it (local optimistic update)
        if (existingMsgs.find(m => m.id === newRow.id)) return;

        // Don't add if it's from us (already added locally)
        if (newRow.user_id === userId) return;

        const msg = dbMessageToStore(newRow as Record<string, unknown>);
        useStore.setState({
          messages: { ...state.messages, [channelId]: [...existingMsgs, msg] },
          unreadCounts: {
            ...state.unreadCounts,
            [channelId]: (state.unreadCounts[channelId] || 0) + (state.currentChannelId === channelId ? 0 : 1),
          },
        });
      })
      .subscribe();

    subscriptionsRef.current.push({
      unsubscribe: () => supabase!.removeChannel(messagesChannel),
    });

    // 3. Tasks — real-time changes
    const tasksChannel = supabase.channel(`sync-tasks-${teamId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `team_id=eq.${teamId}`,
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const state = useStore.getState();

        if (eventType === 'INSERT' && newRow) {
          if (state.tasks.find(t => t.id === newRow.id)) return;
          useStore.setState({ tasks: [...state.tasks, dbTaskToStore(newRow as Record<string, unknown>)] });
        } else if (eventType === 'UPDATE' && newRow) {
          const updated = dbTaskToStore(newRow as Record<string, unknown>);
          useStore.setState({ tasks: state.tasks.map(t => t.id === newRow.id ? updated : t) });
        } else if (eventType === 'DELETE' && oldRow) {
          useStore.setState({ tasks: state.tasks.filter(t => t.id !== oldRow.id) });
        }
      })
      .subscribe();

    subscriptionsRef.current.push({
      unsubscribe: () => supabase!.removeChannel(tasksChannel),
    });

    // 4. Notifications — real-time INSERT
    const notifChannel = supabase.channel(`sync-notif-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newRow = payload.new;
        if (!newRow) return;
        const state = useStore.getState();
        if (state.notifications.find(n => n.id === newRow.id)) return;
        const notif = dbNotificationToStore(newRow as Record<string, unknown>);
        useStore.setState({ notifications: [notif, ...state.notifications] });
      })
      .subscribe();

    subscriptionsRef.current.push({
      unsubscribe: () => supabase!.removeChannel(notifChannel),
    });

    // 5. Team members — presence updates
    const presenceChannel = supabase.channel(`sync-presence-${teamId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'team_members',
        filter: `team_id=eq.${teamId}`,
      }, (payload) => {
        const newRow = payload.new;
        if (!newRow) return;
        const state = useStore.getState();
        useStore.setState({
          team: state.team.map(m =>
            m.id === newRow.user_id
              ? {
                  ...m,
                  presenceStatus: (newRow.status as TeamMember['presenceStatus']) || m.presenceStatus,
                  customStatus: (newRow.custom_status as string) || m.customStatus,
                  lastSeen: (newRow.last_seen as string) || m.lastSeen,
                }
              : m
          ),
        });
      })
      .subscribe();

    subscriptionsRef.current.push({
      unsubscribe: () => supabase!.removeChannel(presenceChannel),
    });

    // Set user offline on page unload
    const handleBeforeUnload = () => {
      supabase!.from('team_members')
        .update({ status: 'offline', last_seen: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .then(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    subscriptionsRef.current.push({
      unsubscribe: () => window.removeEventListener('beforeunload', handleBeforeUnload),
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // Demo mode — render immediately, seed data is in the store
  if (!isSupabaseConfigured || !supabase) {
    return <>{children}</>;
  }

  // Still loading from Supabase
  if (loading) {
    return <SyncLoadingScreen status={syncStatus} />;
  }

  return <>{children}</>;
}
