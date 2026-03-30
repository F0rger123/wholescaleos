import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Shield, Users, Mail, Settings, Ticket, BarChart3
} from 'lucide-react';
import AdminPromos from './AdminPromos';
import AdminUserManagement from '../components/admin/AdminUserManagement';
import AdminPlatformAnalytics from '../components/admin/AdminPlatformAnalytics';
import AdminSystemSettings from '../components/admin/AdminSystemSettings';
import AdminEmailCampaigns from '../components/admin/AdminEmailCampaigns';

export default function AdminDashboard() {
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'emails' | 'promos' | 'settings' | 'analytics'>('users');

  const isAdmin = currentUser?.email?.toLowerCase() === 'drummerforger@gmail.com' || 
                  currentUser?.id === '9e5845b7-b4af-4a12-9d9e-5eb2f9b88f3d';
  console.log('[AdminDashboard] currentUser in store:', currentUser, 'IsAdmin:', isAdmin);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] reveal">
        <div className="text-center space-y-4">
          <Shield size={48} className="mx-auto opacity-20" style={{ color: 'var(--t-error)' }} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--t-text)' }}>Access Restricted</h2>
          <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>This area is reserved for system administrators.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'emails', label: 'Email Campaigns', icon: Mail },
    { id: 'promos', label: 'Promo Codes', icon: Ticket },
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 reveal">
      <div className="mb-8">
        <h1 className="text-3xl font-black italic tracking-tight uppercase flex items-center gap-3" style={{ color: 'var(--t-text)' }}>
          <Shield size={28} className="text-purple-500" /> System Admin
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--t-text-secondary)' }}>
          Centralized management for users, billing, emails, and platform settings.
        </p>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto hide-scrollbar" style={{ borderColor: 'var(--t-border)' }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap`}
              style={{
                color: active ? 'var(--t-primary)' : 'var(--t-text-muted)',
                borderColor: active ? 'var(--t-primary)' : 'transparent',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[60vh]">
        {activeTab === 'users' && <AdminUserManagement />}
        {activeTab === 'emails' && <AdminEmailCampaigns />}
        {activeTab === 'promos' && (
          <div>
             <AdminPromos />
          </div>
        )}
        {activeTab === 'analytics' && <AdminPlatformAnalytics />}
        {activeTab === 'settings' && <AdminSystemSettings />}
      </div>
    </div>
  );
}
