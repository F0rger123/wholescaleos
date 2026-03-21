// ─── Auto-generated Database Types for Supabase ──────────────────────────────
// These types mirror the SQL schema in docs/SUPABASE_SETUP.md
// Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          phone: string | null;
          streak: number;
          task_streak: number;
          longest_streak: number;
          last_login: string | null;
          referral_code: string | null;
          referred_by: string | null;
          settings: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          phone?: string | null;
          streak?: number;
          task_streak?: number;
          longest_streak?: number;
          last_login?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          settings?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          phone?: string | null;
          streak?: number;
          task_streak?: number;
          longest_streak?: number;
          last_login?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          settings?: Record<string, unknown> | null;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string | null;
          invite_code: string | null;
          owner_id: string | null;
          settings: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          invite_code?: string | null;
          owner_id?: string | null;
          settings?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          invite_code?: string | null;
          owner_id?: string | null;
          settings?: Record<string, unknown> | null;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: string;
          status: string;
          custom_status: string | null;
          last_seen: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: string;
          status?: string;
          custom_status?: string | null;
          last_seen?: string | null;
        };
        Update: {
          role?: string;
          status?: string;
          custom_status?: string | null;
          last_seen?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          team_id: string | null;
          created_by: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          lat: number | null;
          lng: number | null;
          property_value: number | null;
          offer_amount: number | null;
          property_type: string | null;
          status: string | null;
          source: string | null;
          import_source: string | null;
          assigned_to: string | null;
          probability: number | null;
          engagement_level: number | null;
          timeline_urgency: number | null;
          competition_level: number | null;
          deal_score: number | null;
          notes: string | null;
          photos: string[] | null;
          last_contact: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          created_by?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          lat?: number | null;
          lng?: number | null;
          property_value?: number | null;
          offer_amount?: number | null;
          property_type?: string | null;
          status?: string | null;
          source?: string | null;
          import_source?: string | null;
          assigned_to?: string | null;
          probability?: number | null;
          engagement_level?: number | null;
          timeline_urgency?: number | null;
          competition_level?: number | null;
          deal_score?: number | null;
          notes?: string | null;
          photos?: string[] | null;
          last_contact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          lat?: number | null;
          lng?: number | null;
          property_value?: number | null;
          offer_amount?: number | null;
          property_type?: string | null;
          status?: string | null;
          source?: string | null;
          import_source?: string | null;
          assigned_to?: string | null;
          probability?: number | null;
          engagement_level?: number | null;
          timeline_urgency?: number | null;
          competition_level?: number | null;
          deal_score?: number | null;
          notes?: string | null;
          photos?: string[] | null;
          last_contact?: string | null;
          updated_at?: string;
        };
      };
      timeline_entries: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string | null;
          type: string | null;
          content: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id?: string | null;
          type?: string | null;
          content?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          type?: string | null;
          content?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
      status_history: {
        Row: {
          id: string;
          lead_id: string;
          from_status: string | null;
          to_status: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          from_status?: string | null;
          to_status?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          from_status?: string | null;
          to_status?: string | null;
          changed_by?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          team_id: string | null;
          assigned_to: string | null;
          created_by: string | null;
          lead_id: string | null;
          title: string | null;
          description: string | null;
          status: string | null;
          priority: string | null;
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          lead_id?: string | null;
          title?: string | null;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          lead_id?: string | null;
          title?: string | null;
          description?: string | null;
          status?: string | null;
          priority?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
        };
      };
      channels: {
        Row: {
          id: string;
          team_id: string | null;
          name: string | null;
          type: string | null;
          description: string | null;
          avatar: string | null;
          created_by: string | null;
          created_at: string;
          last_message_at: string | null;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          name?: string | null;
          type?: string | null;
          description?: string | null;
          avatar?: string | null;
          created_by?: string | null;
          created_at?: string;
          last_message_at?: string | null;
        };
        Update: {
          name?: string | null;
          type?: string | null;
          description?: string | null;
          avatar?: string | null;
          last_message_at?: string | null;
        };
      };
      channel_members: {
        Row: {
          channel_id: string;
          user_id: string;
          last_read: string | null;
        };
        Insert: {
          channel_id: string;
          user_id: string;
          last_read?: string | null;
        };
        Update: {
          last_read?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string | null;
          content: string | null;
          type: string | null;
          mentions: string[] | null;
          reply_to_id: string | null;
          attachments: Record<string, unknown>[] | null;
          edited: boolean;
          deleted: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id?: string | null;
          content?: string | null;
          type?: string | null;
          mentions?: string[] | null;
          reply_to_id?: string | null;
          attachments?: Record<string, unknown>[] | null;
          edited?: boolean;
          deleted?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          content?: string | null;
          type?: string | null;
          mentions?: string[] | null;
          attachments?: Record<string, unknown>[] | null;
          edited?: boolean;
          deleted?: boolean;
          updated_at?: string | null;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          emoji?: string;
        };
      };
      message_read_receipts: {
        Row: {
          message_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          read_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string | null;
          title: string | null;
          message: string | null;
          read: boolean;
          link: string | null;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: string | null;
          title?: string | null;
          message?: string | null;
          read?: boolean;
          link?: string | null;
          data?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          type?: string | null;
          title?: string | null;
          message?: string | null;
          read?: boolean;
          link?: string | null;
          data?: Record<string, unknown> | null;
        };
      };
      import_history: {
        Row: {
          id: string;
          team_id: string | null;
          user_id: string | null;
          source: string | null;
          filename: string | null;
          rows_imported: number | null;
          rows_skipped: number | null;
          rows_duplicated: number | null;
          status: string | null;
          errors: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          user_id?: string | null;
          source?: string | null;
          filename?: string | null;
          rows_imported?: number | null;
          rows_skipped?: number | null;
          rows_duplicated?: number | null;
          status?: string | null;
          errors?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          source?: string | null;
          filename?: string | null;
          rows_imported?: number | null;
          rows_skipped?: number | null;
          rows_duplicated?: number | null;
          status?: string | null;
          errors?: Record<string, unknown> | null;
        };
      };
      coverage_areas: {
        Row: {
          id: string;
          team_id: string | null;
          name: string | null;
          coordinates: number[][] | null;
          color: string | null;
          opacity: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          name?: string | null;
          coordinates?: number[][] | null;
          color?: string | null;
          opacity?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          coordinates?: number[][] | null;
          color?: string | null;
          opacity?: number;
          notes?: string | null;
        };
      };
      buyers: {
        Row: {
          id: string;
          team_id: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          lat: number | null;
          lng: number | null;
          budget_min: number | null;
          budget_max: number | null;
          active: boolean;
          deal_score: number | null;
          notes: string | null;
          criteria: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          lat?: number | null;
          lng?: number | null;
          budget_min?: number | null;
          budget_max?: number | null;
          active?: boolean;
          deal_score?: number | null;
          notes?: string | null;
          criteria?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          lat?: number | null;
          lng?: number | null;
          budget_min?: number | null;
          budget_max?: number | null;
          active?: boolean;
          deal_score?: number | null;
          notes?: string | null;
          criteria?: Record<string, unknown> | null;
        };
      };
      referral_earnings: {
        Row: {
          id: string;
          user_id: string;
          referred_user_id: string;
          amount: number | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          referred_user_id: string;
          amount?: number | null;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number | null;
          status?: string | null;
        };
      };
      access_codes: {
        Row: {
          id: string;
          code: string | null;
          created_by: string | null;
          expires_at: string | null;
          max_uses: number | null;
          uses: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          uses?: number;
          created_at?: string;
        };
        Update: {
          code?: string | null;
          expires_at?: string | null;
          max_uses?: number | null;
          uses?: number;
        };
      };
      sms_messages: {
        Row: {
          id: string;
          user_id: string | null;
          agent_id: string | null;
          phone_number: string;
          direction: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          agent_id?: string | null;
          phone_number: string;
          direction: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          agent_id?: string | null;
          phone_number?: string;
          direction?: string;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      call_recordings: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string | null;
          duration: number | null;
          audio_url: string | null;
          transcription: Record<string, unknown> | null;
          analyzed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id?: string | null;
          duration?: number | null;
          audio_url?: string | null;
          transcription?: Record<string, unknown> | null;
          analyzed?: boolean;
          created_at?: string;
        };
        Update: {
          duration?: number | null;
          audio_url?: string | null;
          transcription?: Record<string, unknown> | null;
          analyzed?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_team_dashboard_stats: {
        Args: { p_team_id: string };
        Returns: {
          total_leads: number;
          active_leads: number;
          pipeline_value: number;
          closed_won: number;
          closed_lost: number;
          avg_deal_score: number;
        }[];
      };
      get_lead_activity_summary: {
        Args: { p_lead_id: string };
        Returns: {
          total_calls: number;
          total_emails: number;
          total_meetings: number;
          total_notes: number;
          last_contact: string;
          days_since_contact: number;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

// ─── Convenience Type Aliases ─────────────────────────────────────────────────

export type Tables = Database['public']['Tables'];
export type DbProfile = Tables['profiles']['Row'];
export type DbProfileInsert = Tables['profiles']['Insert'];
export type DbTeam = Tables['teams']['Row'];
export type DbTeamMember = Tables['team_members']['Row'];
export type DbLead = Tables['leads']['Row'];
export type DbLeadInsert = Tables['leads']['Insert'];
export type DbLeadUpdate = Tables['leads']['Update'];
export type DbTimelineEntry = Tables['timeline_entries']['Row'];
export type DbStatusHistory = Tables['status_history']['Row'];
export type DbTask = Tables['tasks']['Row'];
export type DbTaskInsert = Tables['tasks']['Insert'];
export type DbChannel = Tables['channels']['Row'];
export type DbMessage = Tables['messages']['Row'];
export type DbNotification = Tables['notifications']['Row'];
export type DbImportHistory = Tables['import_history']['Row'];
export type DbCoverageArea = Tables['coverage_areas']['Row'];
export type DbBuyer = Tables['buyers']['Row'];
export type DbCallRecording = Tables['call_recordings']['Row'];
export type DbAccessCode = Tables['access_codes']['Row'];
export type DbSmsMessage = Tables['sms_messages']['Row'];
