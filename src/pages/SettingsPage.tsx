import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { themes } from '../styles/themes';
import {
  Bell, Shield, Palette, Database, Save,
  Check, Globe, Building, Mail, Phone, MapPin,
  Upload, Download, Trash2, RefreshCw, Smartphone, Lock,
  Monitor, AlertTriangle, Copy, Loader2, MousePointer2,
  Users, UserMinus, Plus, Keyboard,
  HardDrive, Send, Sparkles, ExternalLink, QrCode, Award, 
  Linkedin, Facebook, Instagram, Twitter, Share2
} from 'lucide-react';
import { SettingsSkeleton } from '../components/Skeleton';
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
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'sms', label: 'SMS Messaging', icon: Smartphone },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'backup', label: 'Backup', icon: HardDrive },
  { id: 'data', label: 'Data', icon: Database },
];



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
    const url = GoogleCalendarService.getInstance().getAuthUrl('/settings');
    window.location.href = url;
  };

  const handleReconnectTasks = () => {
    const url = GoogleCalendarService.getInstance().getTasksAuthUrl('/settings');
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
            className="px-8 py-3 rounded-xl text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-xl relative overflow-hidden group"
            style={{
              background: 'var(--t-primary)',
              color: 'var(--t-on-primary)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant-glow" />
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save Settings
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
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReconnectGoogle}
                className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-[0.1em] border-2 border-[var(--t-primary)] text-[var(--t-primary)] hover:bg-[var(--t-primary)] hover:text-[var(--t-on-primary)] transition-all flex items-center gap-2 shadow-lg shadow-[var(--t-primary-dim)]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <RefreshCw size={14} />
                Reconnect Google
              </button>
              
              <button
                onClick={handleReconnectTasks}
                className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-[0.1em] border-2 border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/10"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Globe size={14} />
                Reconnect with Tasks
              </button>
            </div>
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
   SECURITY TAB - PASSWORD CHANGE + 2FA (SUPABASE MFA)
   ============================================================ */
function SecurityTab() {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passResult, setPassResult] = useState<'success' | 'error' | null>(null);
  const [passError, setPassError] = useState('');

  // 2FA State
  const [mfaStatus, setMfaStatus] = useState<'loading' | 'disabled' | 'enabled'>('loading');
  const [enrolling, setEnrolling] = useState(false);
  const [qrUri, setQrUri] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  const [showMfaStepUp, setShowMfaStepUp] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');

  // Check 2FA status on mount
  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    if (!supabase) { setMfaStatus('disabled'); return; }
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data?.totp?.filter((f: any) => f.status === 'verified') || [];
      setMfaStatus(verified.length > 0 ? 'enabled' : 'disabled');
      if (verified.length > 0) setFactorId(verified[0].id);
    } catch {
      setMfaStatus('disabled');
    }
  };

  const handlePasswordChange = async () => {
    if (newPass !== confirmPass) {
      setPassResult('error');
      setPassError('Passwords do not match');
      return;
    }
    if (newPass.length < 6) {
      setPassResult('error');
      setPassError('Password must be at least 6 characters');
      return;
    }
    setPassLoading(true);
    setPassResult(null);
    try {
      if (!supabase) throw new Error('Not connected to Supabase');
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setPassResult('success');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassResult(null), 4000);
    } catch (err: any) {
      setPassResult('error');
      setPassError(err.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  const handleEnroll2FA = async () => {
    if (!supabase) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      // 1. Clean up any existing unverified factors first to avoid "factor already exists" errors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverified = factors?.totp?.filter((f: any) => f.status === 'unverified') || [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
      if (error) throw error;
      setFactorId(data.id);
      setQrUri(data.totp.uri);
      // Generate QR code image
      const QRCode = (await import('qrcode')).default;
      const img = await QRCode.toDataURL(data.totp.uri, { width: 200, margin: 2 });
      setQrImage(img);
      setEnrolling(true);
    } catch (err: any) {
      setMfaError(err.message || 'Failed to start 2FA enrollment');
    } finally {
      setMfaLoading(false);
    }
  };

  const cancelEnrollment = async () => {
    if (!supabase || !factorId) {
      setEnrolling(false);
      setQrImage('');
      return;
    }
    setMfaLoading(true);
    try {
      await supabase.auth.mfa.unenroll({ factorId });
      setEnrolling(false);
      setQrImage('');
      setFactorId('');
    } catch (err: any) {
      console.error('Failed to cleanup factor:', err);
      setEnrolling(false);
      setQrImage('');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!supabase || !factorId || !verifyCode) return;
    setMfaLoading(true);
    setMfaError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: verifyCode });
      if (verify.error) throw verify.error;
      setMfaStatus('enabled');
      setEnrolling(false);
      setQrImage('');
      setVerifyCode('');
    } catch (err: any) {
      setMfaError(err.message || 'Invalid verification code');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!supabase || !factorId) return;
    
    setMfaLoading(true);
    setMfaError('');
    try {
      // Check AAL level before unenrolling
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      // If not AAL2, we need to "Step Up" via a challenge
      if (aal?.currentLevel !== 'aal2') {
        if (!showMfaStepUp) {
          setShowMfaStepUp(true);
          setMfaLoading(false);
          return;
        }

        // Verify the step-up code
        if (!stepUpCode) {
          throw new Error('Please enter your 2FA code to confirm.');
        }

        const challenge = await supabase.auth.mfa.challenge({ factorId });
        if (challenge.error) throw challenge.error;
        const verify = await supabase.auth.mfa.verify({ 
          factorId, 
          challengeId: challenge.data.id, 
          code: stepUpCode 
        });
        if (verify.error) throw verify.error;
        
        // After verifying, we are now AAL2 in this session
        console.log('[Auth] Step-up successful, proceeding to unenroll');
      }

      if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
        setMfaLoading(false);
        return;
      }

      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      
      setMfaStatus('disabled');
      setFactorId('');
      setShowMfaStepUp(false);
      setStepUpCode('');
    } catch (err: any) {
      console.error('[Auth] Disable 2FA failed:', err);
      setMfaError(err.message || 'Failed to disable 2FA');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--t-text)' }}>
          <Lock size={16} className="inline mr-2" />Change Password
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--t-text-secondary)' }}>Update your account password</p>

        {passResult === 'success' && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--t-success-dim)', border: '1px solid var(--t-success)' }}>
            <Check size={14} style={{ color: 'var(--t-success)' }} />
            <span className="text-sm" style={{ color: 'var(--t-success)' }}>Password updated successfully!</span>
          </div>
        )}
        {passResult === 'error' && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--t-error-dim)', border: '1px solid var(--t-error)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--t-error)' }} />
            <span className="text-sm" style={{ color: 'var(--t-error)' }}>{passError}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--t-text-secondary)' }}>Current Password</label>
            <input
              type="password"
              value={currentPass}
              onChange={e => setCurrentPass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--t-text-secondary)' }}>New Password</label>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--t-text-secondary)' }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={passLoading || !newPass || !confirmPass}
            className="px-6 py-2 rounded-lg text-sm font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[var(--t-primary-dim)]"
            style={{ 
              backgroundColor: 'var(--t-primary)', 
              color: 'var(--t-on-primary)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {passLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {passLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              mfaStatus === 'enabled' ? 'bg-green-500/10 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
              'bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.1)]'
            }`}>
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--t-text)' }}>Two-Factor Authentication</h2>
              <p className="text-xs" style={{ color: 'var(--t-text-secondary)' }}>
                {mfaStatus === 'enabled' ? 'Account currently secured with TOTP factors' : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mfaStatus === 'loading' ? (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--t-text-muted)' }} />
            ) : (
            <label className="relative inline-flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={mfaStatus === 'enabled' || enrolling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      if (mfaStatus === 'disabled') handleEnroll2FA();
                    } else {
                      if (mfaStatus === 'enabled') handleDisable2FA();
                      else if (enrolling) cancelEnrollment();
                    }
                  }}
                  disabled={mfaLoading}
                />
                <div className="w-11 h-6 bg-[var(--t-surface-dim)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--t-primary)]"></div>
                <span className="ms-3 text-[10px] font-black uppercase tracking-widest" style={{ color: mfaStatus === 'enabled' ? 'var(--t-success)' : 'var(--t-text-muted)' }}>
                  {mfaStatus === 'enabled' ? 'Enabled' : enrolling ? 'In Progress' : 'Disabled'}
                </span>
              </label>
            )}
          </div>
        </div>

        {mfaError && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--t-error-dim)', border: '1px solid var(--t-error)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--t-error)' }} />
            <span className="text-sm" style={{ color: 'var(--t-error)' }}>{mfaError}</span>
          </div>
        )}

        {mfaStatus === 'disabled' && !enrolling && !mfaLoading && (
          <div className="p-8 rounded-2xl text-center border border-dashed border-[var(--t-border)] bg-[var(--t-surface-dim)] animate-in fade-in duration-500">
            <div className="w-12 h-12 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center mx-auto mb-4">
              <Shield size={24} className="text-[var(--t-primary)] opacity-40" />
            </div>
            <h3 className="text-lg font-bold text-[var(--t-text)] mb-2">Enhance Account Security</h3>
            <p className="text-xs text-[var(--t-text-secondary)] max-w-xs mx-auto leading-relaxed">
              Enable Two-Factor Authentication using the toggle above to protect your account from unauthorized access.
            </p>
          </div>
        )}

        {enrolling && qrImage && (
          <div className="space-y-6 p-6 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-4">
              <div className="inline-block p-4 rounded-3xl bg-white shadow-2xl">
                <img src={qrImage} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--t-text)]">Scan to Enroll</p>
                <p className="text-[10px] text-[var(--t-text-muted)] mt-1 max-w-[200px] mx-auto">
                  Scan this code with Google Authenticator, Authy, or your preferred 2FA app.
                </p>
              </div>
              <div className="py-2 px-3 rounded-lg bg-[var(--t-surface-dim)] border border-[var(--t-border)] inline-block">
                <code className="text-[9px] font-mono break-all text-[var(--t-text-muted)]">
                  {qrUri.split('secret=')[1]?.split('&')[0] || ''}
                </code>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[var(--t-border)]">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">
                Verification Code
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-xl text-center text-xl font-mono tracking-[0.5em] outline-none transition-all focus:ring-2 focus:ring-[var(--t-primary)]"
                  style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
                />
                <button
                  onClick={handleVerify2FA}
                  disabled={mfaLoading || verifyCode.length !== 6}
                  className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-[var(--t-primary-dim)] disabled:opacity-50"
                  style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
                >
                  {mfaLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                </button>
              </div>
              <button
                onClick={cancelEnrollment}
                className="w-full py-2 text-[10px] font-bold text-[var(--t-text-muted)] hover:text-[var(--t-error)] transition-colors"
              >
                Cancel Setup
              </button>
            </div>
          </div>
        )}

        {mfaStatus === 'enabled' && (
          <div className="space-y-4">
            {showMfaStepUp ? (
              <div className="p-6 rounded-2xl bg-[var(--t-error-dim)] border border-[var(--t-error-dim)] animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[var(--t-error)] text-white">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[var(--t-error)] uppercase tracking-tight">Confirm Deactivation</h4>
                    <p className="text-[10px] text-[var(--t-error)] opacity-80">Enter your 2FA code to disable security protections.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={stepUpCode}
                    onChange={e => setStepUpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1 px-4 py-3 rounded-xl text-center text-xl font-mono tracking-[0.5em] outline-none border border-[var(--t-error)]/20"
                    style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text)' }}
                    autoFocus
                  />
                  <button
                    onClick={handleDisable2FA}
                    disabled={mfaLoading || stepUpCode.length !== 6}
                    className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-[var(--t-error)] text-white shadow-xl shadow-[var(--t-error-dim)]"
                  >
                    {mfaLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
                  </button>
                  <button
                    onClick={() => { setShowMfaStepUp(false); setStepUpCode(''); }}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-8 rounded-2xl border border-[var(--t-border)] bg-[var(--t-surface-dim)]">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield size={28} className="text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-black text-[var(--t-text)]">Account Protected</p>
                  <p className="text-xs text-[var(--t-text-muted)] max-w-xs">
                    Your account is shielded with secondary authentication factors. Use the toggle above to manage deactivation.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Info */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--t-text)' }}>
          <Monitor size={16} className="inline mr-2" />Active Sessions
        </h2>
        <div className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>Current Session</p>
              <p className="text-[10px]" style={{ color: 'var(--t-text-muted)' }}>This browser • {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase text-green-500">Active Now</span>
        </div>
      </div>
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
  const publicUrl = `https://wholescaleos.com/agent/${nameSlug}`;

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
            className="px-8 py-3 rounded-xl text-sm font-black uppercase tracking-[0.1em] shadow-xl shadow-[var(--t-primary-dim)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--t-primary)', 
              color: 'var(--t-on-primary)',
              fontFamily: 'Inter, sans-serif'
            }}
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
    cursorSettings, setCursorSettings,
    themePresets, saveThemePreset, deleteThemePreset, applyThemePreset,
    resetCustomColors
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
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                resetCustomColors();
                setThemeSaved(true);
                setTimeout(() => setThemeSaved(false), 3000);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-[0.05em] transition-all hover:bg-[var(--t-surface-hover)] border border-[var(--t-border)]"
              style={{ color: 'var(--t-text-muted)', fontFamily: 'Inter, sans-serif' }}
            >
              <RefreshCw size={14} /> Reset Colors
            </button>
            {themeSaved && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--t-success-dim)', border: '1px solid var(--t-success)' }}>
                <Check size={14} style={{ color: 'var(--t-success)' }} />
                <span className="text-sm" style={{ color: 'var(--t-success)' }}>Updated!</span>
              </div>
            )}
          </div>
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

        {/* Custom Presets */}
        <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--t-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--t-text)' }}>Custom Presets</h2>
              <p className="text-sm" style={{ color: 'var(--t-text-secondary)' }}>Save and switch between your custom appearance configurations</p>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Preset Name"
                className="px-3 py-1.5 rounded-lg text-sm bg-[var(--t-bg)] border border-[var(--t-border)] text-[var(--t-text)]"
                id="new-preset-name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) {
                      saveThemePreset(val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('new-preset-name') as HTMLInputElement;
                  if (input.value) {
                    saveThemePreset(input.value);
                    input.value = '';
                  }
                }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-[0.05em] shadow-lg shadow-[var(--t-primary-dim)] active:scale-95 transition-all"
                style={{ 
                  backgroundColor: 'var(--t-primary)', 
                  color: 'var(--t-on-primary)',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                <Plus size={16} /> Save New
              </button>
            </div>
          </div>

          {themePresets && themePresets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themePresets.map((preset) => (
                <div 
                  key={preset.id}
                  className="group relative p-4 rounded-xl border transition-all hover:shadow-md"
                  style={{ backgroundColor: 'var(--t-bg)', borderColor: 'var(--t-border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>{preset.name}</span>
                    <button 
                      onClick={() => deleteThemePreset(preset.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--t-surface-dim)] text-[var(--t-text-muted)]">
                      Base: {themes[preset.themeId]?.name || 'Unknown'}
                    </div>
                  </div>
                  <button 
                    onClick={() => applyThemePreset(preset)}
                    className="w-full py-2 rounded-lg border-2 border-[var(--t-primary)] text-[var(--t-primary)] text-xs font-black uppercase tracking-widest hover:bg-[var(--t-primary)] hover:text-[var(--t-on-primary)] transition-all active:scale-95"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Apply Preset
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed text-center" style={{ borderColor: 'var(--t-border)' }}>
              <Palette size={32} className="text-[var(--t-text-muted)] mb-3 opacity-20" />
              <p className="text-sm text-[var(--t-text-muted)]">No custom presets saved yet. Customize your colors and save them as a preset!</p>
            </div>
          )}
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
          className="px-6 py-2 rounded-lg text-sm font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[var(--t-primary-dim)]"
          style={{
            backgroundColor: 'var(--t-primary)',
            color: 'var(--t-on-primary)',
            opacity: saving ? 0.7 : 1,
            fontFamily: 'Inter, sans-serif'
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
          <button 
            className="px-4 py-2 rounded-lg text-sm font-black uppercase tracking-[0.1em] flex items-center gap-2 shadow-lg shadow-[var(--t-primary-dim)]" 
            style={{ 
              backgroundColor: 'var(--t-primary)', 
              color: 'var(--t-on-primary)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
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
            className="px-6 py-2 rounded-lg text-sm font-black uppercase tracking-[0.05em] transition-all flex items-center gap-2 shadow-lg"
            style={{ 
              backgroundColor: saveStatus === 'success' ? 'var(--t-success-dim)' : 'var(--t-primary)',
              color: saveStatus === 'success' ? 'var(--t-success)' : 'var(--t-on-primary)',
              fontFamily: 'Inter, sans-serif'
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
            className="px-6 py-2 rounded-lg text-sm font-black uppercase tracking-[0.05em] flex items-center gap-2 border border-[var(--t-border)] transition-all hover:bg-[var(--t-surface-hover)]"
            style={{ 
              color: 'var(--t-text)',
              fontFamily: 'Inter, sans-serif'
            }}
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
                    <p className="text-[10px] text-[var(--t-text-muted)]">{backup.timestamp ? new Date(backup.timestamp).toLocaleString() : 'Never'}</p>
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

/* ============================================================
   MAIN SETTINGS PAGE COMPONENT
   ============================================================ */
export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
    
    // Premium loading feel
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location.search]);

  const handleTabChange = (tabId: string) => {
    setIsLoading(true);
    setActiveTab(tabId);
    navigate(`/settings?tab=${tabId}`, { replace: true });
    
    // Small delay for smooth transition
    setTimeout(() => setIsLoading(false), 300);
  };

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
                onClick={() => handleTabChange(tab.id)}
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
          {isLoading ? (
            <SettingsSkeleton />
          ) : (
            <>
              {activeTab === 'general' && <GeneralTab />}
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'security' && <SecurityTab />}
              {activeTab === 'appearance' && <AppearanceTab />}
              {activeTab === 'team' && <TeamTab />}
              {activeTab === 'ai' && <AISettings hideHeader />}
              {activeTab === 'sms' && <SMSSettings />}
              {activeTab === 'shortcuts' && <ShortcutSettings />}
              {activeTab === 'backup' && <BackupTab />}
              {activeTab === 'data' && <DataTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}