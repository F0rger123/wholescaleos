import React from 'react';
import { Building2, Loader2 } from 'lucide-react';

export const DeepSpaceLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060e20] text-[#dee5ff]">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative flex flex-col items-center">
        {/* Logo Container */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-8 animate-astral-hero">
          <Building2 size={40} className="text-white" />
        </div>

        {/* Text Area */}
        <div className="text-center animate-astral-fade-up">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">
            WholeScale <span className="text-indigo-400">OS</span>
          </h2>
          <div className="flex items-center justify-center gap-3 text-indigo-400/60 font-black uppercase tracking-[0.2em] text-[10px]">
            <Loader2 size={12} className="animate-spin" />
            Initializing Foundation
          </div>
        </div>

        {/* Progress Bar (Visual Only) */}
        <div className="w-48 h-1 bg-white/5 rounded-full mt-10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-1/3 animate-loading-shimmer" />
        </div>
      </div>

      <style>{`
        @keyframes loadingShimmer {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 60%; }
          100% { transform: translateX(400%); width: 30%; }
        }
        .animate-loading-shimmer {
          animation: loadingShimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};
