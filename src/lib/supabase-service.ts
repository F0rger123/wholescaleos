/**
 * ─── Supabase Service Layer ───────────────────────────────────────────────────
 *
 * Provides CRUD operations that work with Supabase when configured,
 * and are no-ops in demo mode (local Zustand state only).
 *
 * Usage pattern:
 *   1. Component calls Zustand action (optimistic local update)
 *   2. Zustand action can optionally call service to persist to Supabase
 *   3. If Supabase isn't configured, all calls return gracefully
 *
 * Note: Database types are in ./database.types.ts for reference.
 * Regenerate with: npx supabase gen types typescript --project-id YOUR_ID
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { automationEngine } from './automation-engine';


// ─── Connection Status ────────────────────────────────────────────────────────

export function isConnected(): boolean {
  return isSupabaseConfigured;
}

export function getMode(): 'supabase' | 'demo' {
  return isSupabaseConfigured ? 'supabase' : 'demo';
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    if (!supabase) return { user: null, error: 'Demo mode' };
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    // Profile is auto-created by the handle_new_user() trigger in the database
    // No manual insert needed here
    return { user: data.user, error: error?.message || null };
  },

  async signIn(email: string, password: string) {
    if (!supabase) return { user: null, session: null, error: 'Demo mode' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, session: data.session, error: error?.message || null };
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async resetPassword(email: string) {
    if (!supabase) return { error: 'Demo mode' };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message || null };
  },

  async getSession() {
    if (!supabase) return { session: null };
    const { data } = await supabase.auth.getSession();
    return { session: data.session };
  },

  async getProfile(userId: string) {
    if (!supabase) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    return data;
  },

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    if (!supabase) return;
    await supabase.from('profiles').update(updates).eq('id', userId);
  },

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },
};

// ─── Leads Service ────────────────────────────────────────────────────────────

export const leadsService = {
  async fetchAll(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase
      .from('leads').select('*, timeline_entries(*), status_history(*)')
      .eq('team_id', teamId).order('updated_at', { ascending: false });
    return data || [];
  },

  async create(lead: Record<string, unknown>) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('leads').insert(lead).select().single();
    if (error) {
      console.error('❌ Supabase leadsService.create error:', error);
      throw error;
    }
    
    // Trigger automation engine
    automationEngine.trigger('LEAD_CREATED', data).catch(console.error);
    
    return data;
  },

  async update(id: string, updates: Record<string, unknown>) {
    if (!supabase) return;
    const { error } = await supabase
      .from('leads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('❌ Supabase leadsService.update error:', error);
      throw error;
    }

    // Trigger automation engine if status changed
    if (updates.status) {
      automationEngine.trigger('LEAD_STATUS_CHANGED', { id, status: updates.status, ...updates }).catch(console.error);
    }
    if (updates.deal_score || updates.dealScore) {
       automationEngine.trigger('LEAD_SCORE_HIGH', { id, ...updates }).catch(console.error);
    }
  },

  async remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('❌ Supabase leadsService.remove error:', error);
      throw error;
    }
  },

  async addTimeline(leadId: string, entry: Record<string, any>) {
    if (!supabase) return;
    const dbEntry: any = {
      lead_id: leadId,
      id: entry.id,
      type: entry.type,
      content: entry.content,
      metadata: entry.metadata || {},
      created_at: entry.timestamp || new Date().toISOString()
    };
    
    // Map 'user' to either user_id (if UUID) or user_name
    if (entry.user) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.user);
      if (isUuid) {
        dbEntry.user_id = entry.user;
      } else {
        dbEntry.user_name = entry.user;
      }
    }
    
    const { error } = await supabase.from('timeline_entries').insert(dbEntry);
    if (error) {
      console.error('❌ Supabase leadsService.addTimeline error:', error);
      throw error;
    }
  },

  async addStatusHistory(leadId: string, fromStatus: string | null, toStatus: string, changedBy: string) {
    if (!supabase) return;
    const { error } = await supabase.from('status_history').insert({
      lead_id: leadId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      changed_at: new Date().toISOString()
    });
    if (error) {
      console.error('❌ Supabase leadsService.addStatusHistory error:', error);
      throw error;
    }
  },

  subscribe(teamId: string, callback: (payload: Record<string, unknown>) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const ch = supabase.channel(`leads-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `team_id=eq.${teamId}` }, callback)
      .subscribe();
    return { unsubscribe: () => { supabase!.removeChannel(ch); } };
  },
};

// ─── Tasks Service ────────────────────────────────────────────────────────────

export const tasksService = {
  async fetchAll(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('tasks').select('*').eq('team_id', teamId).order('due_date', { ascending: true });
    return data || [];
  },

  async create(task: Record<string, unknown>) {
    if (!supabase) return null;
    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (error) {
      console.error('❌ Supabase tasksService.create error:', error);
      throw error;
    }
    return data;
  },

  async update(id: string, updates: Record<string, unknown>) {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) {
      console.error('❌ Supabase tasksService.update error:', error);
      throw error;
    }

    // Trigger automation engine if status changed
    if (updates.status) {
      automationEngine.trigger('TASK_STATUS_CHANGED', { id, ...updates }).catch(console.error);
    }
  },

  async remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('❌ Supabase tasksService.remove error:', error);
      throw error;
    }
  },

  async complete(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('❌ Supabase tasksService.complete error:', error);
      throw error;
    }
  },
};

// ─── Team Service ─────────────────────────────────────────────────────────────

export const teamService = {
  async fetchTeam(teamId: string) {
    if (!supabase) return null;
    const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();
    return data;
  },

  async fetchMembers(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('team_members').select('*, profiles(*)').eq('team_id', teamId);
    return data || [];
  },

  async createTeam(name: string, ownerId: string) {
    if (!supabase) return null;
    const code = `WS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { data } = await supabase.from('teams').insert({ name, owner_id: ownerId, invite_code: code }).select().single();
    if (data) {
      await supabase.from('team_members').insert({ team_id: data.id, user_id: ownerId, role: 'admin', status: 'online' });
    }
    return data;
  },

  async joinTeam(inviteCode: string, userId: string) {
    if (!supabase) return { error: 'Demo mode', teamId: null };
    const { data: team } = await supabase.from('teams').select('id').eq('invite_code', inviteCode).single();
    if (!team) return { error: 'Invalid invite code', teamId: null };
    await supabase.from('team_members').insert({ team_id: team.id, user_id: userId, role: 'member', status: 'online' });
    return { error: null, teamId: team.id };
  },

  async updatePresence(teamId: string, userId: string, status: string) {
    if (!supabase) return;
    await supabase.from('team_members').update({ status, last_seen: new Date().toISOString() }).eq('team_id', teamId).eq('user_id', userId);
  },

  async updateRole(teamId: string, userId: string, role: string) {
    if (!supabase) return;
    await supabase.from('team_members').update({ role }).eq('team_id', teamId).eq('user_id', userId);
  },

  async removeMember(teamId: string, userId: string) {
    if (!supabase) return;
    await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
  },

  subscribePresence(teamId: string, callback: (payload: Record<string, unknown>) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const ch = supabase.channel(`presence-${teamId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` }, callback)
      .subscribe();
    return { unsubscribe: () => { supabase!.removeChannel(ch); } };
  },
};

// ─── Chat Service ─────────────────────────────────────────────────────────────

export const chatService = {
  async fetchChannels(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('channels').select('*, channel_members(*)').eq('team_id', teamId).order('last_message_at', { ascending: false });
    return data || [];
  },

  async fetchMessages(channelId: string, limit = 50) {
    if (!supabase) return [];
    const { data } = await supabase.from('messages').select('*, message_reactions(*), message_read_receipts(*)').eq('channel_id', channelId).order('created_at', { ascending: true }).limit(limit);
    return data || [];
  },

async sendMessage(msg: Record<string, unknown>) {
  console.log('📤 chatService.sendMessage called with:', msg);
  
  if (!supabase) {
    console.log('❌ Supabase not configured');
    return null;
  }
  
  try {
    console.log('Attempting to insert into messages table...');
    const { data, error } = await supabase
      .from('messages')
      .insert(msg)
      .select()
      .single();
      
    if (error) {
      console.error('❌ Supabase error in sendMessage:', error);
      return null;
    }
    
    console.log('✅ Message inserted successfully:', data);
    
    if (msg.channel_id) {
      console.log('Updating channel last_message_at for channel:', msg.channel_id);
      const { error: updateError } = await supabase
        .from('channels')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', msg.channel_id);
        
      if (updateError) {
        console.error('❌ Error updating channel:', updateError);
      } else {
        console.log('✅ Channel updated successfully');
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Exception in sendMessage:', error);
    return null;
  }
},

  async editMessage(messageId: string, content: string) {
    if (!supabase) return;
    await supabase.from('messages').update({ content, edited: true, updated_at: new Date().toISOString() }).eq('id', messageId);
  },

  async deleteMessage(messageId: string) {
    if (!supabase) return;
    await supabase.from('messages').update({ deleted: true, content: 'This message was deleted' }).eq('id', messageId);
  },

  async addReaction(messageId: string, userId: string, emoji: string) {
    if (!supabase) return;
    await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
  },

  async removeReaction(messageId: string, userId: string, emoji: string) {
    if (!supabase) return;
    await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
  },

  async markRead(channelId: string, userId: string) {
    if (!supabase) return;
    await supabase.from('channel_members').update({ last_read: new Date().toISOString() }).eq('channel_id', channelId).eq('user_id', userId);
  },

  async createChannel(channel: Record<string, unknown>, members: string[]) {
    if (!supabase) return null;
    const { data } = await supabase.from('channels').insert(channel).select().single();
    if (data && members.length) {
      await supabase.from('channel_members').insert(members.map(uid => ({ channel_id: data.id, user_id: uid })));
    }
    return data;
  },

  subscribeMessages(channelId: string, callback: (payload: Record<string, unknown>) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const ch = supabase.channel(`messages-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, callback)
      .subscribe();
    return { unsubscribe: () => { supabase!.removeChannel(ch); } };
  },
};

// ─── Notifications Service ────────────────────────────────────────────────────

export const notificationsService = {
  async fetchAll(userId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    return data || [];
  },

  async markRead(id: string) {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  async markAllRead(userId: string) {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  },

  async clearAll(userId: string) {
    if (!supabase) return;
    await supabase.from('notifications').delete().eq('user_id', userId);
  },

  async remove(id: string) {
    if (!supabase) return;
    await supabase.from('notifications').delete().eq('id', id);
  },

  async create(notification: Record<string, unknown>) {
    if (!supabase) return;
    await supabase.from('notifications').insert(notification);
  },

  subscribe(userId: string, callback: (payload: Record<string, unknown>) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const ch = supabase.channel(`notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
      .subscribe();
    return { unsubscribe: () => { supabase!.removeChannel(ch); } };
  },
};

// ─── Map / Buyers / Coverage Areas ────────────────────────────────────────────

export const mapService = {
  async fetchCoverageAreas(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('coverage_areas').select('*').eq('team_id', teamId);
    return data || [];
  },
  async createCoverageArea(area: Record<string, unknown>) {
    if (!supabase) return null;
    const { data } = await supabase.from('coverage_areas').insert(area).select().single();
    return data;
  },
  async deleteCoverageArea(id: string) {
    if (!supabase) return;
    await supabase.from('coverage_areas').delete().eq('id', id);
  },
  async fetchBuyers(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('buyers').select('*').eq('team_id', teamId);
    return data || [];
  },
  async createBuyer(buyer: Record<string, unknown>) {
    if (!supabase) return null;
    const { data } = await supabase.from('buyers').insert(buyer).select().single();
    return data;
  },
  async updateBuyer(id: string, updates: Record<string, unknown>) {
    if (!supabase) return;
    await supabase.from('buyers').update(updates).eq('id', id);
  },
  async deleteBuyer(id: string) {
    if (!supabase) return;
    await supabase.from('buyers').delete().eq('id', id);
  },
};

// ─── Import History ───────────────────────────────────────────────────────────

export const importHistoryService = {
  async record(entry: Record<string, unknown>) {
    if (!supabase) return;
    await supabase.from('import_history').insert(entry);
  },
  async fetchAll(teamId: string) {
    if (!supabase) return [];
    const { data } = await supabase.from('import_history').select('*').eq('team_id', teamId).order('created_at', { ascending: false });
    return data || [];
  },
};

// ─── Storage (file uploads) ──────────────────────────────────────────────────

export const storageService = {
  async upload(bucket: string, path: string, file: File) {
    if (!supabase) return null;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { console.error('Upload error:', error); return null; }
    return data.path;
  },
  getPublicUrl(bucket: string, path: string) {
    if (!supabase) return null;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
  async remove(bucket: string, paths: string[]) {
    if (!supabase) return;
    await supabase.storage.from(bucket).remove(paths);
  },
};

// ─── Access Codes ─────────────────────────────────────────────────────────────

export const accessCodeService = {
  async validate(code: string) {
    if (!supabase) return { valid: false, error: 'Demo mode' };
    const { data } = await supabase.from('access_codes').select('*').eq('code', code).single();
    if (!data) return { valid: false, error: 'Invalid code' };
    if (data.max_uses && data.uses >= data.max_uses) return { valid: false, error: 'Max uses reached' };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, error: 'Code expired' };
    await supabase.from('access_codes').update({ uses: data.uses + 1 }).eq('id', data.id);
    return { valid: true, error: null };
  },
  async create(createdBy: string, maxUses: number | null, expiresAt: string | null) {
    if (!supabase) return null;
    const code = `WS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { data } = await supabase.from('access_codes').insert({ code, created_by: createdBy, max_uses: maxUses, expires_at: expiresAt }).select().single();
    return data;
  },
};
// ─── Conversations Service ──────────────────────────────────────────────────
export const conversationService = {
  async saveMessage(userId: string, sessionId: string, role: 'user' | 'assistant', content: string, intent?: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('user_conversations')
      .insert({
        user_id: userId,
        session_id: sessionId,
        role,
        content,
        intent
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase conversationService.saveMessage error:', error);
      return null;
    }
    return data;
  },

  async fetchHistory(userId: string, limit = 20) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Supabase conversationService.fetchHistory error:', error);
      return [];
    }
    // Reverse to return in chronological order
    return (data || []).reverse();
  },

  async clearHistory(userId: string) {
    if (!supabase) return;
    await supabase.from('user_conversations').delete().eq('user_id', userId);
  }
};
