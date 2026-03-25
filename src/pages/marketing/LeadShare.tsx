import { useParams, Link } from 'react-router-dom';
import { MessageSquare, ShieldCheck, ChevronLeft, Share2, MapPin, BadgeDollarSign, Calendar } from 'lucide-react';

export default function LeadShare() {
  const { id } = useParams();

  return (
    <div className="bg-[#0f172a] min-h-screen text-white pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Home
        </Link>

        <div className="p-12 rounded-[2.5rem] bg-[#121a2d] border border-blue-500/20 shadow-2xl space-y-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5"><Share2 size={120} /></div>
          
          <div className="relative z-10 space-y-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-600/20 flex items-center justify-center text-blue-500 mx-auto mb-6">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-4xl font-black italic">Lead Information Sharing</h1>
            <p className="text-xl text-gray-400 max-w-xl mx-auto">
              You are viewing a secure lead share for ID: <span className="text-blue-500 font-mono">{id}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 text-blue-400">
                <MapPin size={20} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Property Location</span>
              </div>
              <div className="text-2xl font-bold">[Property Address - Placeholder]</div>
              <div className="text-sm text-gray-500">Full details available upon request.</div>
            </div>

            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 text-green-400">
                <BadgeDollarSign size={20} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Estimated Value</span>
              </div>
              <div className="text-2xl font-bold">$[Price - Placeholder]</div>
              <div className="text-sm text-gray-500">Based on recent market analysis.</div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-blue-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-600/20 relative z-10">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-lg font-black">Interested in this property?</div>
              <div className="text-sm text-blue-100 italic">Get direct access to the agent in charge.</div>
            </div>
            <button className="px-8 py-4 rounded-xl bg-white text-blue-600 font-black flex items-center gap-2 hover:scale-105 transition-all">
              <MessageSquare size={20} /> Contact Agent
            </button>
          </div>

          <div className="text-center pt-8 border-t border-white/5 relative z-10">
             <div className="flex items-center justify-center gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2"><Calendar size={14} /> Shared: {new Date().toLocaleDateString()}</div>
                <div className="flex items-center gap-2"><ShieldCheck size={14} /> Secure Link</div>
             </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-600 space-y-4">
           <h2 className="text-xl font-bold text-gray-400 italic">Lead Details Coming Soon</h2>
           <p className="text-sm max-w-md mx-auto">
             This agent is currently preparing the full documentation for this specific lead. 
             Please check back shortly or contact the agent directly using the button above.
           </p>
        </div>
      </div>
    </div>
  );
}
