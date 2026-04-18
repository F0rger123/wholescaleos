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
  <div className={`astral-glass border border-[var(--t-border)] p-6 space-y-4 ${className}`}>
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
