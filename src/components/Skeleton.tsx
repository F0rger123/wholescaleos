import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  circle = false 
}) => {
  return (
    <div 
      className={`skeleton-base ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

export function SMSInboxSkeleton() {
  return (
    <div className="flex h-[calc(100vh-140px)] rounded-2xl border overflow-hidden animate-pulse" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)', borderColor: 'var(--t-border)' }}>
      {/* Conversations List */}
      <div className="w-80 border-r flex flex-col shrink-0" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)', borderColor: 'var(--t-border)' }}>
        <div className="p-4 border-b space-y-4" style={{ borderColor: 'var(--t-border)' }}>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Chat Area */}
      <div className="flex-1 bg-black/5 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--t-border)' }}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex-1 p-8 space-y-8">
          <div className="flex justify-start">
            <Skeleton className="h-12 w-64 rounded-2xl rounded-tl-none" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-72 rounded-2xl rounded-tr-none" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-24 w-80 rounded-2xl rounded-tl-none" />
          </div>
        </div>
        <div className="p-4 border-t" style={{ borderColor: 'var(--t-border)' }}>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function EmailInboxSkeleton() {
  return (
    <div className="flex h-full bg-[var(--t-bg)] overflow-hidden animate-pulse">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-[var(--t-border)] bg-[var(--t-surface-dim)]/50 flex flex-col shrink-0 p-4 space-y-6">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 4, 5].map(i => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <div className="pt-6 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* List Pane */}
      <div className="w-80 xl:w-96 border-r border-[var(--t-border)] bg-[var(--t-surface)]/30 flex flex-col">
        <div className="p-4 border-b border-[var(--t-border)] flex justify-between items-center">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="p-3">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full opacity-50" />
            </div>
          ))}
        </div>
      </div>

      {/* Detail Pane */}
      <div className="flex-1 bg-[var(--t-bg)] p-8 flex flex-col items-center justify-center text-center space-y-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    </div>
  );
}

export const SkeletonTitle = ({ className = "" }) => (
  <Skeleton className={`h-8 w-1/3 mb-4 ${className}`} />
);

export const SkeletonText = ({ lines = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonCard = ({ className = "" }) => (
  <div className={`p-6 space-y-4 rounded-3xl border border-[var(--t-border)] bg-[var(--t-surface)] ${className}`}>
    <div className="flex items-center gap-4">
      <Skeleton circle width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton width="40%" height={16} />
        <Skeleton width="20%" height={12} />
      </div>
    </div>
    <SkeletonText lines={2} />
  </div>
);

export const CalendarSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-8">
      <Skeleton width={200} height={40} />
      <div className="flex gap-2">
        <Skeleton width={100} height={40} />
        <Skeleton width={100} height={40} />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-px bg-[var(--t-border)] rounded-2xl overflow-hidden border border-[var(--t-border)]">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-32 bg-[var(--t-surface)] p-2">
          <Skeleton width={24} height={24} circle className="mb-2" />
          <div className="space-y-1">
            <Skeleton width="60%" height={10} />
            <Skeleton width="40%" height={10} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AIBotSkeleton = () => (
  <div className="flex flex-col h-full bg-[var(--t-bg)] border border-[var(--t-border)] rounded-2xl overflow-hidden shadow-2xl">
    <div className="p-4 border-b border-[var(--t-border)] flex items-center gap-3 bg-[var(--t-surface)]">
      <Skeleton circle width={40} height={40} />
      <div className="flex-1">
        <Skeleton width={120} height={14} className="mb-2" />
        <Skeleton width={80} height={10} />
      </div>
    </div>
    <div className="flex-1 p-4 space-y-6 overflow-hidden">
      <div className="flex gap-3">
        <Skeleton circle width={32} height={32} />
        <div className="space-y-2 flex-1">
          <Skeleton width="70%" height={32} className="rounded-2xl rounded-tl-none" />
          <Skeleton width="40%" height={24} className="rounded-2xl rounded-tl-none" />
        </div>
      </div>
      <div className="flex flex-row-reverse gap-3">
        <div className="space-y-2 flex-1 flex flex-col items-end">
          <Skeleton width="60%" height={40} className="rounded-2xl rounded-tr-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton circle width={32} height={32} />
        <div className="space-y-2 flex-1">
          <Skeleton width="50%" height={32} className="rounded-2xl rounded-tl-none" />
        </div>
      </div>
    </div>
    <div className="p-4 border-t border-[var(--t-border)] bg-[var(--t-surface)]">
      <Skeleton width="100%" height={48} className="rounded-xl" />
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="space-y-6 animate-astral-hero">
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton width="200px" height="32px" />
        <Skeleton width="300px" height="16px" className="opacity-40" />
      </div>
      <div className="flex gap-3">
        <Skeleton width="180px" height="40px" className="rounded-xl" />
        <Skeleton width="120px" height="40px" className="rounded-xl" />
      </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton width="24px" height="24px" className="rounded-lg" />
            <Skeleton width="80px" height="12px" />
          </div>
          <Skeleton width="100px" height="28px" />
        </div>
      ))}
    </div>

    {/* Charts Grid */}
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton width="180px" height="20px" />
            <Skeleton width="240px" height="12px" className="opacity-40" />
          </div>
        </div>
        <Skeleton width="100%" height="300px" className="rounded-xl" />
      </div>
      <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6">
        <Skeleton width="150px" height="20px" className="mb-4" />
        <Skeleton width="100%" height="250px" className="rounded-full mx-auto max-w-[200px]" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between">
              <Skeleton width="100px" height="10px" />
              <Skeleton width="40px" height="10px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);



export function LeadsSkeleton() {
  return (
    <div className="crm-container py-12 animate-pulse space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2 w-full md:w-auto">
          <Skeleton className="h-10 flex-1 md:w-64 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
      
      <div className="flex gap-4 items-center overflow-x-auto pb-2">
        <Skeleton className="h-10 w-24 rounded-xl shrink-0" />
        <Skeleton className="h-10 w-24 rounded-xl shrink-0" />
        <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
        <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-10 w-36 rounded-xl shrink-0" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="p-6 rounded-2xl border" style={{ borderColor: 'var(--t-border)', backgroundColor: 'var(--t-surface)' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksSkeleton() {
  return (
    <div className="crm-container py-12 animate-pulse space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 rounded-2xl border space-y-3" style={{ borderColor: 'var(--t-border)', backgroundColor: 'var(--t-surface)' }}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="p-6 rounded-2xl border flex gap-4" style={{ borderColor: 'var(--t-primary-dim)', backgroundColor: 'var(--t-surface-dim)' }}>
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-2xl border flex items-center gap-4" style={{ borderColor: 'var(--t-border)', backgroundColor: 'var(--t-surface)' }}>
              <Skeleton className="h-6 w-6 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LeadDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--t-bg)] animate-pulse">
      <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 space-y-8">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 space-y-6">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 space-y-4">
            <Skeleton className="h-4 w-24" />
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportSkeleton() {
  return (
    <div className="crm-container py-12 animate-pulse space-y-8">
      <div className="text-center space-y-4 mb-12">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-5 w-96 mx-auto opacity-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 space-y-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full opacity-50" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-[var(--t-border)] bg-[var(--t-surface-dim)] flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border-b border-[var(--t-border)] flex gap-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="crm-container py-12 animate-pulse space-y-12">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-10">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="flex-1 space-y-4 text-center md:text-left">
          <Skeleton className="h-10 w-64 mx-auto md:mx-0" />
          <Skeleton className="h-6 w-96 mx-auto md:mx-0 opacity-50" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 space-y-6">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="crm-container py-12 animate-pulse space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-64 opacity-50" />
      </div>

      <div className="flex gap-4 border-b border-[var(--t-border)] pb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-10 w-32 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 space-y-6">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-8 space-y-6">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="crm-container py-12 animate-pulse space-y-8">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 rounded-3xl border space-y-4" style={{ borderColor: 'var(--t-border)', backgroundColor: 'var(--t-surface)' }}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 rounded-[3rem] border space-y-6" style={{ borderColor: 'var(--t-border)', backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)' }}>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-[3rem] border space-y-4" style={{ borderColor: 'var(--t-border)', backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)' }}>
              <Skeleton className="h-6 w-32" />
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
            <div className="p-8 rounded-[3rem] border space-y-4" style={{ borderColor: 'var(--t-border)', backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)' }}>
              <Skeleton className="h-6 w-32" />
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="p-8 rounded-[3rem] border space-y-6" style={{ borderColor: 'var(--t-border)', backgroundColor: 'rgba(var(--t-surface-rgb), 0.4)' }}>
            <Skeleton className="h-6 w-32" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4">
                  <Skeleton circle className="h-10 w-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3 opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadShareSkeleton() {
  return (
    <div className="bg-[#0f172a] min-h-screen text-white pt-32 pb-20 animate-pulse">
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-6 w-32 mb-8 bg-white/5 rounded-lg" />
        <div className="p-12 rounded-[2.5rem] bg-[#121a2d] border border-blue-500/20 shadow-2xl space-y-10 relative overflow-hidden">
          <div className="space-y-6 text-center">
            <div className="h-20 w-20 mx-auto mb-6 bg-white/5 rounded-3xl" />
            <div className="h-10 w-64 mx-auto bg-white/5 rounded-xl" />
            <div className="h-6 w-96 mx-auto bg-white/5 rounded-lg opacity-50" />
          </div>
          <div className="h-[400px] w-full bg-white/5 rounded-[2rem]" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-32 w-full bg-white/5 rounded-3xl" />
            <div className="h-32 w-full bg-white/5 rounded-3xl" />
          </div>
          <div className="h-32 w-full bg-white/5 rounded-3xl opacity-50" />
        </div>
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--t-bg)] flex items-center justify-center p-6 animate-pulse">
      <div className="w-full max-w-lg space-y-10">
        <div className="flex justify-center">
          <div className="h-12 w-48 bg-white/5 rounded-xl" />
        </div>
        <div className="bg-[var(--t-surface)]/80 backdrop-blur-sm border border-[var(--t-border)] rounded-3xl p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full mx-auto bg-white/5" />
          <div className="space-y-3">
            <div className="h-6 w-48 mx-auto bg-white/5 rounded-lg" />
            <div className="h-4 w-64 mx-auto bg-white/5 rounded-lg opacity-50" />
          </div>
          <div className="h-40 w-full bg-white/5 rounded-2xl" />
          <div className="h-14 w-full bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
