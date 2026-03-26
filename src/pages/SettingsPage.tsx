import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { themes } from '../styles/themes';
import {
  Bell, Shield, Palette, Database, Save, Eye, EyeOff,
  Check, Globe, Building, Mail, Phone, MapPin,
  Upload, Download, Trash2, RefreshCw, Smartphone, Lock,
  Monitor, AlertTriangle, Copy, Loader2, MousePointer2,
  Users, UserMinus, Plus, Keyboard,
  HardDrive, Send, Sparkles, ExternalLink, QrCode, Award, 
  Linkedin, Facebook, Instagram, Twitter, Share2
} from 'lucide-react';
import AISettings from './AISettings';
import SMSSettings from './SMSSettings';
import ShortcutSettings from './ShortcutSettings';
import { FileUploader } from '../components/FileUploader';
import { GoogleCalendarService } from '../lib/google-calendar';

const TABS = [
  { id: 'general', label: 'General', icon: Building },
  { id: 'profile', label: 'Public Profile', icon: Award },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'sms', label: 'SMS Messaging', icon: Smartphone },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'backup', label: 'Backup', icon: HardDrive },
  { id: 'data', label: 'Data', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ backgroundColor: 'var(--t-bg)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--t-text)' }}>Settings</h1>
        <p style={{ color: 'var(--t-text-secondary)' }}>Manage your workspace preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--t-primary)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--t-on-primary)' : 'var(--t-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'var(--t-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
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
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'email' && <EmailTab />}
          {activeTab === 'ai' && <AISettings hideHeader />}
          {activeTab === 'sms' && <SMSSettings />}
          {activeTab === 'shortcuts' && <ShortcutSettings />}
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
    companyName: teamConfig?.name || '',
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
        const { data } = await supabase
          .from('teams')
          .select('name, settings')
          .eq('id', teamId)
          .single();
          
        if (data) {
          const s = (data.settings as Record<string, string>) || {};
          setFormData({
            companyName: data.name || teamConfig?.name || '',
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
  }, [teamId, teamConfig]);

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
        } else {
          console.log('✅ Settings saved to Supabase');
          setSaveResult('success');
        }
      } catch (err: any) {
        console.error('Save exception:', err);
        setSaveResult('error');
        setErrorMsg(err.message || 'Unknown error');
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

  const handleReconnectGoogle = () => {
    const url = GoogleCalendarService.getInstance().getAuthUrl();
    window.location.href = url;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>Company Information</h2>

        {/* Save Result Banner */}
        {saveResult === 'success' && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--t-success-dim)', borderColor: 'var(--t-success)', border: '1px solid' }}>
            <Check size={16} style={{ color: 'var(--t-success)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--t-success)' }}>Settings saved successfully!</span>
          </div>
        )}
        {saveResult === 'error' && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--t-error-dim)', borderColor: 'var(--t-error)', border: '1px solid' }}>
            <AlertTriangle size={16} style={{ color: 'var(--t-error)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--t-error)' }}>Save failed: {errorMsg}</span>
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
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
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
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
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
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
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
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
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
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="America/New_York">Eastern</option>
              <option value="America/Chicago">Central</option>
              <option value="America/Denver">Mountain</option>
              <option value="America/Los_Angeles">Pacific</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-2" style={{ color: 'var(--t-text-secondary)' }}>
              <Upload size={14} className="inline mr-1" /> Company Logo
            </label>
            <div className="flex items-start gap-4">
              {formData.logoUrl && (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-[var(--t-border)] shrink-0">
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
              )}
              <FileUploader
                bucket="team-logos"
                onUploadComplete={(url) => updateField('logoUrl', url)}
                label=""
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            style={{
              backgroundColor: saving ? 'var(--t-surface-hover)' : 'var(--t-primary)',
              color: 'var(--t-on-primary)',
            }}
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

      {/* Google Integration Card */}
      {isSupabaseConfigured && (
        <div className="rounded-xl p-6 mt-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Connected Accounts</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--t-text-secondary)' }}>Manage third-party service connections for calendar, tasks, and email sync.</p>
          
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <Globe size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Google Ecosystem</p>
                <p className="text-xs text-[var(--t-text-muted)]">Calendar, Tasks, Gmail, Drive</p>
              </div>
            </div>
            <button
              onClick={handleReconnectGoogle}
              className="px-4 py-2 rounded-lg text-xs font-bold border border-[var(--t-primary)] text-[var(--t-primary)] hover:bg-[var(--t-primary)] hover:text-white transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} />
              Reconnect Google
            </button>
          </div>
          <p className="mt-4 text-[10px] text-[var(--t-text-muted)] italic">
            * Reconnecting will force a fresh permission screen. Ensure you check all boxes (Tasks, Calendar, etc.) to fix 403 errors.
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PROFILE TAB - AGENT PUBLIC PROFILE MANAGEMENT
   ============================================================ */
function ProfileTab() {
  const { currentUser, updateProfile } = useStore();
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [formData, setFormData] = useState({
    bio: currentUser?.bio || '',
    licenseNumber: currentUser?.licenseNumber || '',
    yearsExperience: currentUser?.yearsExperience || 0,
    isPublic: currentUser?.isPublic !== false,
    publicContactEmail: currentUser?.publicContactEmail !== false,
    publicContactPhone: currentUser?.publicContactPhone !== false,
    acceptLeads: currentUser?.acceptLeads !== false,
    specialties: currentUser?.specialties?.join(', ') || '',
    languages: currentUser?.languages?.join(', ') || '',
    serviceAreas: currentUser?.serviceAreas?.join(', ') || '',
    website: currentUser?.website || '',
    socialLinks: {
      facebook: currentUser?.socialLinks?.facebook || '',
      instagram: currentUser?.socialLinks?.instagram || '',
      linkedin: currentUser?.socialLinks?.linkedin || '',
      x: currentUser?.socialLinks?.x || '',
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        bio: formData.bio,
        licenseNumber: formData.licenseNumber,
        yearsExperience: Number(formData.yearsExperience),
        isPublic: formData.isPublic,
        publicContactEmail: formData.publicContactEmail,
        publicContactPhone: formData.publicContactPhone,
        acceptLeads: formData.acceptLeads,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
        languages: formData.languages.split(',').map(s => s.trim()).filter(Boolean),
        serviceAreas: formData.serviceAreas.split(',').map(s => s.trim()).filter(Boolean),
        website: formData.website,
        socialLinks: formData.socialLinks
      });
      setSaveResult('success');
      setTimeout(() => setSaveResult(null), 3000);
    } catch (err) {
      setSaveResult('error');
    } finally {
      setSaving(false);
    }
  };

  const updateSocial = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value }
    }));
  };

  const nameSlug = currentUser?.name.toLowerCase().replace(/\s+/g, '-') || 'agent';
  const publicUrl = `https://wholescaleos.pages.dev/agent/${nameSlug}`;

  return (
    <div className="space-y-6">
      {/* Public Status Card */}
      <div className="rounded-2xl p-6 border transition-all" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
               <QrCode size={32} />
             </div>
             <div>
                <h2 className="text-lg font-bold">Public Presence</h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <Globe size={12} />
                  <span>Your profile is {formData.isPublic ? 'live and public' : 'currently private'}</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div 
              onClick={() => setFormData(p => ({ ...p, isPublic: !p.isPublic }))}
              className="relative w-12 h-6 rounded-full cursor-pointer transition-all"
              style={{ backgroundColor: formData.isPublic ? 'var(--t-primary)' : 'var(--t-border)' }}
             >
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md" style={{ left: formData.isPublic ? '26px' : '4px' }} />
             </div>
             <a 
              href={publicUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-blue-500/50 text-gray-400 hover:text-blue-500 transition-all"
              title="View Public Profile"
             >
                <ExternalLink size={18} />
             </a>
          </div>
        </div>
        
        {formData.isPublic && (
          <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between gap-4">
             <code className="text-[10px] text-blue-400 font-mono truncate mr-auto">{publicUrl}</code>
             <div className="flex items-center gap-4 shrink-0">
               <button 
                onClick={() => { 
                  navigator.clipboard.writeText(publicUrl);
                  alert('Link copied to clipboard!');
                }}
                className="text-[10px] uppercase font-black tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
               >
                 Copy Link
               </button>
               <div className="w-px h-3 bg-blue-500/20" />
               <a 
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase font-black tracking-widest text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
               >
                 Open Profile <ExternalLink size={10} />
               </a>
             </div>
          </div>
        )}
      </div>

      {/* Profile Photo Upload */}
      <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
          <Upload size={16} className="text-blue-500" /> Profile Photo
        </h3>
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] flex items-center justify-center overflow-hidden shrink-0">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[var(--t-text-muted)]">{currentUser?.avatar}</span>
            )}
          </div>
          <div className="flex-1">
            <FileUploader
              bucket="avatars"
              onUploadComplete={(url) => updateProfile({ avatarUrl: url })}
              label="Update your professional headshot"
              className="max-w-sm"
            />
            <p className="text-[10px] text-[var(--t-text-muted)] mt-2 italic">
              Images will be resized and optimized for performance.
            </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bio & Credentials */}
        <div className="rounded-2xl p-6 border space-y-6" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Award size={16} className="text-blue-500" /> Professional Info
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Short Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell your story..."
                className="w-full h-32 px-4 py-3 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">License #</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData(p => ({ ...p, licenseNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Years Exp.</label>
                <input
                  type="number"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData(p => ({ ...p, yearsExperience: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visibility & Tags */}
        <div className="rounded-2xl p-6 border space-y-6" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Globe size={16} className="text-blue-500" /> Tags & Visibility
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Specialties</label>
              <p className="text-[10px] text-gray-600 mb-2">Separate with commas</p>
              <input
                type="text"
                value={formData.specialties}
                onChange={(e) => setFormData(p => ({ ...p, specialties: e.target.value }))}
                placeholder="Residential, Commercial, Luxury..."
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Service Areas</label>
              <p className="text-[10px] text-gray-600 mb-2">Cities or Zip codes</p>
              <input
                type="text"
                value={formData.serviceAreas}
                onChange={(e) => setFormData(p => ({ ...p, serviceAreas: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Personal Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-sm focus:border-blue-500 outline-none"
              />
            </div>
            
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Show Email publicly</span>
                <input 
                  type="checkbox" 
                  checked={formData.publicContactEmail}
                  onChange={e => setFormData(p => ({ ...p, publicContactEmail: e.target.checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Show Phone publicly</span>
                <input 
                  type="checkbox" 
                  checked={formData.publicContactPhone}
                  onChange={e => setFormData(p => ({ ...p, publicContactPhone: e.target.checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-500 font-bold">Enable Lead Capture</span>
                <input 
                  type="checkbox" 
                  checked={formData.acceptLeads}
                  onChange={e => setFormData(p => ({ ...p, acceptLeads: e.target.checked }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="rounded-2xl p-6 border space-y-6" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2">
           <Share2 size={16} className="text-blue-500" /> Social Links
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Facebook size={14} className="absolute left-3 top-3.5 text-blue-500" />
            <input
              type="text"
              value={formData.socialLinks.facebook}
              onChange={(e) => updateSocial('facebook', e.target.value)}
              placeholder="Facebook URL"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-xs"
            />
          </div>
          <div className="relative">
            <Instagram size={14} className="absolute left-3 top-3.5 text-pink-500" />
            <input
              type="text"
              value={formData.socialLinks.instagram}
              onChange={(e) => updateSocial('instagram', e.target.value)}
              placeholder="Instagram URL"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-xs"
            />
          </div>
          <div className="relative">
            <Linkedin size={14} className="absolute left-3 top-3.5 text-blue-700" />
            <input
              type="text"
              value={formData.socialLinks.linkedin}
              onChange={(e) => updateSocial('linkedin', e.target.value)}
              placeholder="LinkedIn URL"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-xs"
            />
          </div>
          <div className="relative">
            <Twitter size={14} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              value={formData.socialLinks.x}
              onChange={(e) => updateSocial('x', e.target.value)}
              placeholder="X URL"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Profile Changes'}
          </button>
          {saveResult === 'success' && (
            <div className="flex items-center gap-2 text-green-500 font-bold text-sm animate-in fade-in slide-in-from-left-2">
              <Check size={18} /> Profile updated
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 italic">Last synced: Just now</p>
      </div>
    </div>
  );
}

/* ============================================================
   APPEARANCE TAB - WITH SUPABASE THEME PERSISTENCE (FIXED)
   ============================================================ */
function AppearanceTab() {
  const { 
    currentTheme, setTheme, 
    showQuickNotes, setShowQuickNotes,
    cursorSettings, setCursorSettings
  } = useStore();
  const [themeSaved, setThemeSaved] = useState(false);

  const handleThemeChange = async (themeId: string) => {
    // Update local state immediately
    setTheme(themeId);

    // Save to Supabase
    if (supabase && isSupabaseConfigured) {
      try {
      const { data } = await (supabase.auth as any).getUser();
const user = data?.user; 

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
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Theme</h2>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Choose your workspace appearance</p>
          </div>
          {themeSaved && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--t-success-dim)', border: '1px solid var(--t-success)' }}>
              <Check size={14} style={{ color: 'var(--t-success)' }} />
              <span className="text-sm" style={{ color: 'var(--t-success)' }}>Theme saved!</span>
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
                  backgroundColor: isActive ? 'var(--t-primary-dim)' : 'var(--t-bg)',
                  border: isActive ? '2px solid var(--t-primary)' : '2px solid var(--t-border)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--t-primary)' }}>
                    <Check size={12} style={{ color: 'var(--t-on-primary)' }} />
                  </div>
                )}
                {/* Mini preview */}
                <div className="rounded-lg overflow-hidden mb-3 h-16 flex" style={{ border: '1px solid var(--t-border)' }}>
                  <div className="w-8" style={{ backgroundColor: theme.colors.surface }} />
                  <div className="flex-1 p-1.5" style={{ backgroundColor: theme.colors.background }}>
                    <div className="h-2 w-12 rounded mb-1" style={{ backgroundColor: theme.colors.primary }} />
                    <div className="h-1.5 w-8 rounded" style={{ backgroundColor: theme.colors.textSecondary + '40' }} />
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

        <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--t-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Interface</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>Customize your workspace tools</p>
          
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--t-surface-dim)', border: '1px solid var(--t-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--t-primary-dim)' }}>
                <Bell className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--t-text)' }}>Quick Notes</p>
                <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Show floating notepad for quick thoughts</p>
              </div>
            </div>
            <button 
              onClick={() => setShowQuickNotes(!showQuickNotes)} 
              className="relative w-10 h-5 rounded-full transition-all duration-200" 
              style={{ backgroundColor: showQuickNotes ? 'var(--t-primary)' : 'var(--t-border)' }}
            >
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: showQuickNotes ? 'translateX(22px)' : 'translateX(2px)' }} />
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Visual Effects</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>Customize interactive cursor effects</p>
            
            <div className="p-6 rounded-xl space-y-6" style={{ backgroundColor: 'var(--t-surface-dim)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--t-primary-dim)' }}>
                    <MousePointer2 className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--t-text)' }}>Cursor Effect</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Enable premium interactive cursor animations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCursorSettings({ enabled: !cursorSettings.enabled })}
                  className="relative w-10 h-5 rounded-full transition-all duration-200" 
                  style={{ backgroundColor: cursorSettings.enabled ? 'var(--t-primary)' : 'var(--t-border)' }}
                >
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: cursorSettings.enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
                </button>
              </div>

              {cursorSettings.enabled && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t" style={{ borderColor: 'var(--t-border)' }}>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium" style={{ color: 'var(--t-text)' }}>Effect Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['glow', 'sparkles', 'spotlight', 'trail', 'none'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setCursorSettings({ type })}
                          className="px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize"
                          style={{
                            backgroundColor: cursorSettings.type === type ? 'var(--t-primary-dim)' : 'transparent',
                            borderColor: cursorSettings.type === type ? 'var(--t-primary)' : 'var(--t-border)',
                            color: cursorSettings.type === type ? 'var(--t-primary)' : 'var(--t-text-secondary)',
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>Intensity</label>
                        <span className="text-xs" style={{ color: 'var(--t-primary)' }}>{cursorSettings.intensity}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={cursorSettings.intensity} 
                        onChange={(e) => setCursorSettings({ intensity: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>Size</label>
                        <span className="text-xs" style={{ color: 'var(--t-primary)' }}>{cursorSettings.size}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="200" 
                        value={cursorSettings.size} 
                        onChange={(e) => setCursorSettings({ size: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NOTIFICATIONS TAB
   ============================================================ */
function NotificationsTab() {
  const { notificationSettings, updateNotificationSettings } = useStore();
  const [localSettings, setLocalSettings] = useState(notificationSettings);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    setLocalSettings(notificationSettings);
  }, [notificationSettings]);

  const toggle = (key: string) => {
    setLocalSettings(prev => ({ 
      ...prev, 
      [key]: !((prev as any)[key]) 
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    
    try {
      await updateNotificationSettings(localSettings);
      setSaveResult('success');
      setTimeout(() => setSaveResult(null), 3000);
    } catch (e) {
      setSaveResult('error');
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="relative w-10 h-5 rounded-full transition-all duration-200" style={{ backgroundColor: enabled ? 'var(--t-primary)' : 'var(--t-border)' }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200" style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
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
              <ToggleSwitch enabled={(localSettings as any)[key]} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
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
              <ToggleSwitch enabled={(localSettings as any)[key]} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
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
              <ToggleSwitch enabled={(localSettings as any)[key]} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>SMS Reminders</h2>
        <div className="space-y-3">
          {[
            ['smsTaskReminder', 'Task Reminders', 'SMS when a task is due in 1 hour'],
            ['smsAppointmentReminder', 'Appointment Reminders', 'SMS for upcoming appointments'],
          ].map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{desc}</p>
              </div>
              <ToggleSwitch enabled={(localSettings as any)[key]} onToggle={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--t-primary)',
            color: 'var(--t-on-primary)',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Notification Settings'}
        </button>
        {saveResult === 'success' && (
          <span className="text-sm font-medium" style={{ color: 'var(--t-success)' }}>
            <Check size={14} className="inline mr-1" /> All clear! Settings updated.
          </span>
        )}
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
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
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
                  style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2" style={{ color: 'var(--t-text-secondary)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}>
            <Lock size={14} className="inline mr-1" /> Update Password
          </button>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Two-Factor Authentication</h2>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Add extra security to your account</p>
          </div>
          <button
            onClick={() => setTwoFA(!twoFA)}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ backgroundColor: twoFA ? 'var(--t-primary)' : 'var(--t-border)' }}
          >
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ left: twoFA ? '22px' : '2px' }} />
          </button>
        </div>
        {twoFA && (
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>
              <Smartphone size={14} className="inline mr-1" />
              Scan the QR code with your authenticator app to enable 2FA.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Active Sessions</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--t-text-secondary)' }}>Manage your active login sessions</p>
        <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
          <div className="flex items-center gap-3">
            <Monitor size={18} style={{ color: 'var(--t-primary)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--t-text)' }}>Current Session</p>
              <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Active now</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--t-success-dim)', color: 'var(--t-success)' }}>Active</span>
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
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Team Members</h2>
          <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
            {team.length} members
          </span>
        </div>

        <div className="space-y-3">
          {team.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}>
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
                  style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button 
                  onClick={() => removeTeamMember(member.id)} 
                  className="p-1 rounded transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--t-error-dim)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  style={{ color: 'var(--t-error)' }}
                >
                  <UserMinus size={14} style={{ color: 'var(--t-error)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Invite Code</h2>
        <div className="flex items-center gap-3">
          <code className="px-4 py-2 rounded-lg text-lg font-mono tracking-wider" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-primary)' }}>
            {teamConfig?.inviteCode || 'WS-XXXXXX'}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(teamConfig?.inviteCode || ''); alert('Invite code copied!'); }}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={regenerateInviteCode}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ backgroundColor: 'var(--t-surface-hover)', color: 'var(--t-text-secondary)' }}
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
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Email Provider</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>Configure email sending for notifications and campaigns</p>

        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--t-text)' }}>
            <Mail size={14} className="inline mr-1" /> Resend (Recommended)
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--t-text-secondary)' }}>3,000 emails/month free. Set up SMTP in Supabase → Authentication → SMTP Settings</p>
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Host: <code className="px-1 rounded" style={{ backgroundColor: 'var(--t-surface)' }}>smtp.resend.com</code></p>
            <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Port: <code className="px-1 rounded" style={{ backgroundColor: 'var(--t-surface)' }}>465</code></p>
            <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>Username: <code className="px-1 rounded" style={{ backgroundColor: 'var(--t-surface)' }}>resend</code></p>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Send Test Email</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
          <button className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}>
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
  const { 
    leads, tasks, buyers, coverageAreas,
    lastAutoSave, backups, manualSave, saveStatus,
    createBackup, revertToBackup, deleteBackup, exportData
  } = useStore();
  
  const [backupName, setBackupName] = useState('');

  const getTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Auto-save Status */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Data Resilience</h2>
            <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Your data is automatically saved every 5 minutes.</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--t-text-muted)' }}>Last Auto-Saved</p>
            <p className="text-sm font-mono" style={{ color: 'var(--t-primary)' }}>{getTimeAgo(lastAutoSave)}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)]">
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Manual Save</p>
            <p className="text-xs text-[var(--t-text-muted)]">Force a synchronization of all current workspace data.</p>
          </div>
          <button
            onClick={() => manualSave()}
            disabled={saveStatus === 'saving'}
            className="px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
            style={{ 
              backgroundColor: saveStatus === 'success' ? 'var(--t-success-dim)' : 'var(--t-primary)',
              color: saveStatus === 'success' ? 'var(--t-success)' : 'var(--t-on-primary)'
            }}
          >
            {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : saveStatus === 'success' ? <Check size={14} /> : <Save size={14} />}
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Now'}
          </button>
        </div>
      </div>

      {/* Manual Backups */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>System Backups</h2>
        
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Backup name (optional)..."
            className="flex-1 px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
          <button
            onClick={() => {
              createBackup(backupName);
              setBackupName('');
            }}
            className="px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
            style={{ backgroundColor: 'var(--t-surface-hover)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          >
            <Plus size={14} /> Create Backup
          </button>
        </div>

        <div className="space-y-3">
          {backups.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-[var(--t-border)]">
              <p className="text-sm text-[var(--t-text-muted)]">No backups found</p>
            </div>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--t-surface)] border border-[var(--t-border)] flex items-center justify-center text-[var(--t-text-muted)]">
                    <Database size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{backup.name}</p>
                    <p className="text-[10px] text-[var(--t-text-muted)]">{new Date(backup.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => revertToBackup(backup.id)}
                    className="p-2 rounded-lg hover:bg-[var(--t-primary-dim)] text-[var(--t-primary)] transition-colors"
                    title="Restore this backup"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                    title="Delete backup"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export Data */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Data Portability</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--t-text-secondary)' }}>Export all your workspace data to a standardized JSON format for external use.</p>
        
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Leads', count: leads.length },
            { label: 'Tasks', count: tasks.length },
            { label: 'Buyers', count: buyers.length },
            { label: 'Areas', count: coverageAreas.length },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg text-center bg-[var(--t-bg)] border border-[var(--t-border)]">
              <p className="text-lg font-bold" style={{ color: 'var(--t-primary)' }}>{item.count}</p>
              <p className="text-[10px] uppercase tracking-tighter" style={{ color: 'var(--t-text-muted)' }}>{item.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={exportData}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-[var(--t-surface-hover)]"
          style={{ border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
        >
          <Download size={16} /> Export All Data (.json)
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
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-text)' }}>Database Status</h2>
        <div className="flex items-center gap-2 mb-4">
          {isSupabaseConfigured ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--t-success)' }} />
              <span className="text-sm" style={{ color: 'var(--t-success)' }}>Connected to Supabase</span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--t-warning)' }} />
              <span className="text-sm" style={{ color: 'var(--t-warning)' }}>Demo Mode (Local Storage)</span>
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
            <div key={item.label} className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--t-primary)' }}>{item.count}</p>
              <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--t-error)' }}>Danger Zone</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--t-text-secondary)' }}>These actions are irreversible</p>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ color: 'var(--t-error)', border: '1px solid var(--t-error-dim)', backgroundColor: 'transparent' }}>
            <Trash2 size={14} /> Delete All Leads
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ color: 'var(--t-error)', border: '1px solid var(--t-error-dim)', backgroundColor: 'transparent' }}>
            <AlertTriangle size={14} /> Reset Workspace
          </button>
        </div>
      </div>
    </div>
  );
}