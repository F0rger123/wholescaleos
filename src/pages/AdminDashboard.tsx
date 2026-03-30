// @ts-nocheck
import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Shield, Users, Mail, Settings, Ticket, AlertTriangle, BarChart3
} from 'lucide-react';
import AdminPromos from './AdminPromos';

const ADMIN_USER_ID = '9e5845b7-b4af-4a12-9d9e-5eb2f9b88f3d';

export default function AdminDashboard() {
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'emails' | 'promos' | 'settings' | 'analytics'>('users');

  const isAdmin = currentUser?.id === ADMIN_USER_ID;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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

      <div>
        {activeTab === 'users' && (
          <div className="p-12 text-center rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <Users size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--t-text)' }} />
            <h3 className="text-xl font-bold mb-2">User Management</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>View and manage all users across the platform. Update roles, reset passwords, and manage subscriptions.</p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <AlertTriangle size={16} /> Under Construction
            </div>
          </div>
        )}
        
        {activeTab === 'emails' && (
          <div className="p-12 text-center rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <Mail size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--t-text)' }} />
            <h3 className="text-xl font-bold mb-2">Email Campaigns</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Create and blast system-wide announcements to all users or specific segments.</p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <AlertTriangle size={16} /> Under Construction
            </div>
          </div>
        )}
        
        {activeTab === 'promos' && (
          <div>
             <AdminPromos />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-12 text-center rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <BarChart3 size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--t-text)' }} />
            <h3 className="text-xl font-bold mb-2">Platform Analytics</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Global platform metrics, user growth, revenue tracking, and engagement analytics.</p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <AlertTriangle size={16} /> Under Construction
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-12 text-center rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <Settings size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--t-text)' }} />
            <h3 className="text-xl font-bold mb-2">System Settings</h3>
            <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>Configure global platform variables, AI backend integration keys, and billing modes.</p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <AlertTriangle size={16} /> Under Construction
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
