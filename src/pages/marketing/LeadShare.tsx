import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, ChevronLeft, Share2, MapPin, BadgeDollarSign, Calendar, Image as ImageIcon } from 'lucide-react';
import { LeadShareSkeleton } from '../../components/Skeleton';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

export default function LeadShare() {
  const { id } = useParams();
  const { leads } = useStore();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLead() {
      if (!id) return;
      
      // Try store first (if logged in)
      const cached = leads.find(l => l.id === id);
      if (cached) {
        setLead(cached);
        setLoading(false);
        return;
      }

      // Fetch from Supabase for public users
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching lead:', error.message);
          setLoading(false);
          return;
        }

        if (data) {
          // Map DB fields to Lead interface
          setLead({
            id: data.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: data.status,
            source: data.source,
            propertyAddress: data.address,
            propertyType: data.property_type,
            estimatedValue: data.property_value,
            offerAmount: data.offer_amount,
            notes: data.notes,
            createdAt: data.created_at,
            shareDescription: data.share_description,
            sharePrice: data.share_price,
            shareCustomMessage: data.share_custom_message,
            sharePhotoUrl: data.share_photo_url,
          });
        }
      } catch (err) {
        console.error('Failed to fetch lead for sharing:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLead();
  }, [id, leads]);

  if (loading) {
    return <LeadShareSkeleton />;
  }

  if (!lead) {
    return (
      <div className="bg-[#0f172a] min-h-screen text-white flex items-center justify-center pt-20">
        <div className="text-center space-y-6">
           <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
             <ShieldCheck size={40} />
           </div>
           <h1 className="text-2xl font-bold">Lead Not Found</h1>
           <p className="text-gray-400">This share link may have expired or is incorrect.</p>
           <Link to="/" className="inline-block px-8 py-3 rounded-xl bg-blue-600 font-bold">Back to Home</Link>
        </div>
      </div>
    );
  }

  const displayPrice = lead.sharePrice || lead.estimatedValue || 0;
  const displayDescription = lead.shareDescription || lead.notes || "No additional description provided by the agent.";
  const displayMessage = lead.shareCustomMessage || "I thought you might be interested in this property. Let me know if you have any questions!";

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
            <h1 className="text-4xl font-black italic">Property Review</h1>
            <p className="text-xl text-gray-400 max-w-xl mx-auto">
              {lead.propertyAddress}
            </p>
          </div>

          {/* Property Image */}
          <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-white/5 bg-black/20 group">
             {lead.sharePhotoUrl ? (
               <img src={lead.sharePhotoUrl} className="w-full h-full object-cover" alt="Property" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-700">
                  <ImageIcon size={64} />
               </div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
             <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                <div>
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Status</div>
                   <div className="px-3 py-1 rounded-lg bg-blue-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">Exclusive Access</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Listing ID</div>
                   <div className="font-mono text-sm text-white">{lead.id.slice(0, 8)}</div>
                </div>
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 text-blue-400">
                <MapPin size={20} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Property Location</span>
              </div>
              <div className="text-2xl font-bold">{lead.propertyAddress}</div>
              <div className="text-sm text-gray-500">Full analysis report available for download.</div>
            </div>

            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 text-green-400">
                <BadgeDollarSign size={20} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Estimated Value</span>
              </div>
              <div className="text-2xl font-bold">${displayPrice.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Based on recent market analysis.</div>
            </div>
          </div>

          <div className="p-10 rounded-3xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 relative z-10 space-y-4">
             <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                <MessageSquare size={18} /> Note from your agent
             </div>
             <p className="text-lg italic text-gray-300 leading-relaxed font-medium">"{displayMessage}"</p>
          </div>

          <div className="p-8 rounded-3xl bg-blue-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-600/20 relative z-10">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-lg font-black italic uppercase tracking-tighter">Interested in this property?</div>
              <div className="text-sm text-blue-100 italic">Get direct access to the agent in charge.</div>
            </div>
            <button className="px-8 py-4 rounded-xl bg-white text-blue-600 font-black flex items-center gap-2 hover:scale-105 transition-all shadow-xl">
              <MessageSquare size={20} /> Contact Agent
            </button>
          </div>

          <div className="prose prose-invert max-w-none relative z-10 p-2">
             <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 mb-6 border-b border-white/5 pb-4">Agent Description</h3>
             <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{displayDescription}</p>
          </div>

          <div className="text-center pt-8 border-t border-white/5 relative z-10">
             <div className="flex items-center justify-center gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2"><Calendar size={14} /> Shared: {new Date(lead.createdAt).toLocaleDateString()}</div>
                <div className="flex items-center gap-2"><ShieldCheck size={14} /> Secure Link</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
