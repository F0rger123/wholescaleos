import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { themes } from '../styles/themes';
import {
  Bell, Shield, Palette, Database, Save, Eye, EyeOff,
  Check, Globe, Building, Mail, Phone, MapPin,
  Upload, Download, Trash2, RefreshCw, Smartphone, Lock,
  Monitor, AlertTriangle, Copy, Loader2,
  Users, UserMinus,
  HardDrive, Send
} from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General', icon: Building },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'backup', label: 'Backup', icon: HardDrive },
  { id: 'data', label: 'Data', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-text)' }}>Settings</h1>
        <p style={{ color: 'var(--t-text-secondary)' }}>Manage your workspace preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                style={{
                  background: activeTab === tab.id ? 'var(--t-primary)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--t-text-secondary)',
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'email' && <EmailTab />}
          {activeTab === 'backup' && <BackupTab />}
          {activeTab === 'data' && <DataTab />}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GENERAL TAB - WITH DIRECT SUPABASE SAVE
   ============================================================ */
function GeneralTab() {
  const { teamConfig, updateTeamConfig, teamId } = useStore();
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    companyName: teamConfig.name || '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    timezone: 'America/Chicago',
    logoUrl: '',
  });

  // Load settings from Supabase on mount
  useEffect(() => {
    async function loadSettings() {
      if (!supabase || !teamId) return;
      try {
        const { data } = await supabase.from('teams').select('name, settings').eq('id', teamId).single();
        if (data) {
          const s = (data.settings as Record<string, string>) || {};
          setFormData({
            companyName: data.name || teamConfig.name || '',
            companyAddress: s.address || '',
            companyPhone: s.phone || '',
            companyEmail: s.email || '',
            timezone: s.timezone || 'America/Chicago',
            logoUrl: s.logoUrl || '',
          });
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    loadSettings();
  }, [teamId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    setErrorMsg('');

    // Always update local state
    updateTeamConfig({
      ...formData,
      name: formData.companyName,
    });

    // Save to Supabase
    if (supabase && isSupabaseConfigured && teamId) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({
            name: formData.companyName,
            settings: {
              address: formData.companyAddress,
              phone: formData.companyPhone,
              email: formData.companyEmail,
              timezone: formData.timezone,
              logoUrl: formData.logoUrl,
            },
          })
          .eq('id', teamId);

        if (error) {
          console.error('Supabase save error:', error);
          setSaveResult('error');
          setErrorMsg(error.message);
          alert('❌ Save failed: ' + error.message);
        } else {
          console.log('✅ Settings saved to Supabase');
          setSaveResult('success');
          alert('✅ Settings saved successfully!');
        }
      } catch (err: any) {
        console.error('Save exception:', err);
        setSaveResult('error');
        setErrorMsg(err.message || 'Unknown error');
        alert('❌ Save error: ' + (err.message || 'Unknown error'));
      }
    } else {
      // No Supabase — just local save
      setSaveResult('success');
      console.log('Settings saved locally (no Supabase)');
    }

    setSaving(false);
    if (saveResult !== 'error') {
      setTimeout(() => setSaveResult(null), 4000);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>Company Information</h2>

        {/* Save Result Banner */}
        {saveResult === 'success' && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2">
            <Check size={16} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">Settings saved successfully!</span>
          </div>
        )}
        {saveResult === 'error' && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm font-medium">Save failed: {errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--t-text-secondary)' }}>
              <Building size={14} className="inline mr-1" /> Company Name
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--t-text-secondary)' }}>
              <Mail size={14} className="inline mr-1" /> Email
            </label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => updateField('companyEmail', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--t-text-secondary)' }}>
              <MapPin size={14} className="inline mr-1" /> Address
            </label>
            <input
              type="text"
              value={formData.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--t-text-secondary)' }}>
              <Phone size={14} className="inline mr-1" /> Phone
            </label>
            <input
              type="text"
              value={formData.companyPhone}
              onChange={(e) => updateField('companyPhone', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--t-text-secondary)' }}>
              <Globe size={14} className="inline mr-1" /> Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="America/New_York">Eastern</option>
              <option value="America/Chicago">Central</option>
              <option value="America/Denver">Mountain</option>
              <option value="America/Los_Angeles">Pacific</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--t-text-secondary)' }}>
              <Upload size={14} className="inline mr-1" /> Logo URL
            </label>
            <input
              type="text"
              value={formData.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              placeholder="https://..."
              style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all"
            style={{ background: saving ? '#666' : 'var(--t-primary)' }}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APPEARANCE TAB - WITH SUPABASE THEME PERSISTENCE
   ============================================================ */
function AppearanceTab() {
  const { currentTheme, setTheme } = useStore();
  const [themeSaved, setThemeSaved] = useState(false);

  const handleThemeChange = async (themeId: string) => {
    // Update local state immediately
    setTheme(themeId);

    // Save to Supabase
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // First get existing settings
          const { data: profile } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', user.id)
            .single();

          const existingSettings = (profile?.settings as Record<string, unknown>) || {};

          await supabase
            .from('profiles')
            .update({
              settings: { ...existingSettings, theme: themeId },
            })
            .eq('id', user.id);

          console.log('✅ Theme saved to Supabase:', themeId);
        }
      } catch (err) {
        console.error('Failed to save theme:', err);
      }
    }

    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 3000);
  };

  const themeList = Object.entries(themes);

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Theme</h2>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Choose your workspace appearance</p>
          </div>
          {themeSaved && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
              <Check size={14} className="text-green-400" />
              <span className="text-green-400 text-sm">Theme saved!</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {themeList.map(([id, theme]) => {
            const isActive = currentTheme === id;
            return (
              <button
                key={id}
                onClick={() => handleThemeChange(id)}
                className="relative rounded-xl p-4 text-left transition-all"
                style={{
                  background: isActive ? 'var(--t-primary)' + '20' : 'var(--t-bg)',
                  border: isActive ? '2px solid var(--t-primary)' : '2px solid var(--t-border)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--t-primary)' }}>
                    <Check size={12} className="text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="rounded-lg overflow-hidden mb-3 h-16 flex" style={{ border: '1px solid var(--t-border)' }}>
                  <div className="w-8" style={{ background: theme.colors.surface }} />
                  <div className="flex-1 p-1.5" style={{ background: theme.colors.background }}>
                    <div className="h-2 w-12 rounded mb-1" style={{ background: theme.colors.primary }} />
                    <div className="h-1.5 w-8 rounded" style={{ background: theme.colors.textSecondary + '40' }} />
                  </div>
                </div>
                <p className="font-medium text-sm" style={{ color: 'var(--t-text)' }}>{theme.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-secondary)' }}>
                  {theme.colors.background.startsWith('#') && parseInt(theme.colors.background.slice(1, 3), 16) < 128 ? '🌙 Dark' : '☀️ Light'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NOTIFICATIONS TAB
   ============================================================ */
function NotificationsTab() {
  const [settings, setSettings] = useState({
    emailLeadAssigned: true,
    emailDealClosed: true,
    emailTaskDue: true,
    emailMention: true,
    pushNewLead: true,
    pushTaskAssigned: true,
    pushChatMessage: true,
    pushDealUpdate: false,
    digestWeekly: true,
    digestDaily: false,
  });

  const toggle = (key: string) => setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="relative w-10 h-5 rounded-full transition-colors" style={{ background: enabled ? 'var(--t-primary)' : 'var(--t-border)' }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: enabled ? '22px' : '2px' }} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>Email Notifications</h2>
        <div className="space-y-3">
          {[
            ['emailLeadAssigned', 'Lead Assigned', 'When a lead is assigned to you'],
            ['emailDealClosed', 'Deal Closed', 'When a deal is won or lost'],
            ['emailTaskDue', 'Task Due', 'Reminder for upcoming tasks'],
            ['emailMention', '@Mention', 'When someone mentions you in chat'],
          ].map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{desc}</p>
              </div>
              <ToggleSwitch enabled={settings[key as keyof typeof settings] as boolean} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>Push Notifications</h2>
        <div className="space-y-3">
          {[
            ['pushNewLead', 'New Lead', 'When a new lead is added to the team'],
            ['pushTaskAssigned', 'Task Assigned', 'When a task is assigned to you'],
            ['pushChatMessage', 'Chat Message', 'New messages in your channels'],
            ['pushDealUpdate', 'Deal Updates', 'Status changes on your deals'],
          ].map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{desc}</p>
              </div>
              <ToggleSwitch enabled={settings[key as keyof typeof settings] as boolean} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>Digest</h2>
        <div className="space-y-3">
          {[
            ['digestWeekly', 'Weekly Summary', 'Every Monday morning'],
            ['digestDaily', 'Daily Recap', 'End of day summary'],
          ].map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{desc}</p>
              </div>
              <ToggleSwitch enabled={settings[key as keyof typeof settings] as boolean} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SECURITY TAB
   ============================================================ */
function SecurityTab() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [twoFA, setTwoFA] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>Change Password</h2>
        <div className="space-y-3 max-w-md">
          {(['current', 'new', 'confirm'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm mb-1 capitalize" style={{ color: 'var(--t-text-secondary)' }}>{field === 'confirm' ? 'Confirm New' : field} Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords[field]}
                  onChange={(e) => setPasswords(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm pr-10"
                  style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2" style={{ color: 'var(--t-text-secondary)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--t-primary)' }}>
            <Lock size={14} className="inline mr-1" /> Update Password
          </button>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Two-Factor Authentication</h2>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Add extra security to your account</p>
          </div>
          <button
            onClick={() => setTwoFA(!twoFA)}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: twoFA ? 'var(--t-primary)' : 'var(--t-border)' }}
          >
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: twoFA ? '22px' : '2px' }} />
          </button>
        </div>
        {twoFA && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>
              <Smartphone size={14} className="inline mr-1" />
              Scan the QR code with your authenticator app to enable 2FA.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Active Sessions</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--t-text-secondary)' }}>Manage your active login sessions</p>
        <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
          <div className="flex items-center gap-3">
            <Monitor size={18} style={{ color: 'var(--t-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Current Session</p>
              <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Active now</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Active</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TEAM TAB
   ============================================================ */
function TeamTab() {
  const { team, teamConfig, updateMemberRole, removeTeamMember, regenerateInviteCode } = useStore();

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Team Members</h2>
          <span className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--t-primary)' + '20', color: 'var(--t-primary)' }}>
            {team.length} members
          </span>
        </div>

        <div className="space-y-3">
          {team.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--t-primary)' + '30', color: 'var(--t-primary)' }}>
                  {member.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{member.name}</p>
                  <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.teamRole || 'member'}
                  onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button onClick={() => removeTeamMember(member.id)} className="p-1 rounded hover:bg-red-500/20">
                  <UserMinus size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Invite Code</h2>
        <div className="flex items-center gap-3">
          <code className="px-4 py-2 rounded-lg text-lg font-mono tracking-wider" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-primary)' }}>
            {teamConfig.inviteCode}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(teamConfig.inviteCode); alert('Invite code copied!'); }}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--t-primary)' + '20', color: 'var(--t-primary)' }}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={regenerateInviteCode}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ background: 'var(--t-border)', color: 'var(--t-text-secondary)' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--t-text-secondary)' }}>Share this code with team members to join your workspace</p>
      </div>
    </div>
  );
}

/* ============================================================
   EMAIL TAB
   ============================================================ */
function EmailTab() {
  const [testEmail, setTestEmail] = useState('');

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Email Provider</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>Configure email sending for notifications and campaigns</p>

        <div className="p-4 rounded-lg" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--t-text)' }}>
            <Mail size={14} className="inline mr-1" /> Resend (Recommended)
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--t-text-secondary)' }}>3,000 emails/month free. Set up SMTP in Supabase → Authentication → SMTP Settings</p>
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Host: <code className="px-1 rounded" style={{ background: 'var(--t-surface)' }}>smtp.resend.com</code></p>
            <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Port: <code className="px-1 rounded" style={{ background: 'var(--t-surface)' }}>465</code></p>
            <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Username: <code className="px-1 rounded" style={{ background: 'var(--t-surface)' }}>resend</code></p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Send Test Email</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
          <button className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2" style={{ background: 'var(--t-primary)' }}>
            <Send size={14} /> Send Test
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BACKUP TAB
   ============================================================ */
function BackupTab() {
  const { leads, tasks, buyers, coverageAreas, team, teamId } = useStore();
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupResult(null);

    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      teamId,
      data: { leads, tasks, buyers, coverageAreas, team },
      summary: {
        leads: leads.length,
        tasks: tasks.length,
        buyers: buyers.length,
        coverageAreas: coverageAreas.length,
        teamMembers: team.length,
      },
    };

    // Download as JSON
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wholescale-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setBackingUp(false);
    setBackupResult('Backup downloaded successfully!');
    setTimeout(() => setBackupResult(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Backup & Restore</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>Download a backup of all your team's data</p>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            ['Leads', leads.length],
            ['Tasks', tasks.length],
            ['Buyers', buyers.length],
            ['Team', team.length],
          ].map(([label, count]) => (
            <div key={label as string} className="p-3 rounded-lg text-center" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--t-primary)' }}>{count}</p>
              <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{label}</p>
            </div>
          ))}
        </div>

        {backupResult && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2">
            <Check size={16} className="text-green-400" />
            <span className="text-green-400 text-sm">{backupResult}</span>
          </div>
        )}

        <button
          onClick={handleBackup}
          disabled={backingUp}
          className="px-6 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
          style={{ background: 'var(--t-primary)' }}
        >
          {backingUp ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {backingUp ? 'Creating Backup...' : 'Download Backup'}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   DATA TAB
   ============================================================ */
function DataTab() {
  const { leads, tasks, team, buyers } = useStore();

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Database Status</h2>
        <div className="flex items-center gap-2 mb-4">
          {isSupabaseConfigured ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-sm text-green-400">Connected to Supabase</span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-sm text-yellow-400">Demo Mode (Local Storage)</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Leads', count: leads.length },
            { label: 'Tasks', count: tasks.length },
            { label: 'Team', count: team.length },
            { label: 'Buyers', count: buyers.length },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg text-center" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--t-primary)' }}>{item.count}</p>
              <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2 text-red-400">Danger Zone</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>These actions are irreversible</p>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 flex items-center gap-2">
            <Trash2 size={14} /> Delete All Leads
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 flex items-center gap-2">
            <AlertTriangle size={14} /> Reset Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
