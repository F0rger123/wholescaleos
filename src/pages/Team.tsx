import { useState } from 'react';
import { Users, BarChart2, Calendar as CalendarIcon, LayoutDashboard, Target, Activity } from 'lucide-react';
import { TeamOverviewTab } from '../components/team/TeamOverviewTab';
import { TeamAnalyticsTab } from '../components/team/TeamAnalyticsTab';
import { TeamCalendarTab } from '../components/team/TeamCalendarTab';

type TabType = 'overview' | 'analytics' | 'calendar';

export default function Team() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: LayoutDashboard,
      description: 'Goals & Team'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart2,
      description: 'Performance'
    },
    { 
      id: 'calendar', 
      label: 'Calendar', 
      icon: CalendarIcon,
      description: 'Availability'
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 pb-32">
      {/* Tab Switcher */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Team Hub</h1>
            <p className="text-[var(--t-text-muted)] text-sm font-medium">Coordinate, analyze, and scale your organization.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`group relative p-6 rounded-[2rem] border transition-all duration-500 text-left overflow-hidden ${
                  isActive 
                    ? 'bg-[var(--t-surface)] border-[var(--t-primary)] shadow-2xl shadow-[var(--t-primary)]/10 scale-[1.02]' 
                    : 'bg-[var(--t-surface-dim)] border-[var(--t-border)] hover:bg-[var(--t-surface)] hover:border-[var(--t-primary)]/30 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Background Accent */}
                <div className={`absolute -right-4 -bottom-4 transition-all duration-700 ${isActive ? 'text-[var(--t-primary)] opacity-10 rotate-12 scale-150' : 'text-[var(--t-text-muted)] opacity-5'}`}>
                  <Icon size={120} />
                </div>

                <div className="relative z-10 flex items-center gap-4">
                  <div className={`p-4 rounded-2xl transition-all duration-500 ${isActive ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] group-hover:text-[var(--t-primary)]'}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-black uppercase tracking-tight transition-colors ${isActive ? 'text-[var(--t-text)]' : 'text-[var(--t-text-muted)] group-hover:text-[var(--t-text)]'}`}>
                      {tab.label}
                    </h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-[var(--t-primary)]' : 'text-[var(--t-text-muted)]'}`}>
                      {tab.description}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[var(--t-primary)] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 transition-all duration-500 ease-in-out">
        {activeTab === 'overview' && <TeamOverviewTab />}
        {activeTab === 'analytics' && <TeamAnalyticsTab />}
        {activeTab === 'calendar' && <TeamCalendarTab />}
      </div>
    </div>
  );
}