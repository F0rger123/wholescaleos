import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Save, Upload, Trash2, 
  DollarSign, MessageSquare, 
  Globe, Eye, Loader2, Image as ImageIcon
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { storageService } from '../lib/supabase-service';

export default function LeadShareEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { leads, updateLead, currentUser } = useStore();
  const lead = leads.find(l => l.id === id);

  const [form, setForm] = useState({
    shareDescription: '',
    sharePrice: 0,
    shareCustomMessage: '',
    sharePhotoUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm({
        shareDescription: lead.shareDescription || lead.notes || '',
        sharePrice: lead.sharePrice || lead.estimatedValue || 0,
        shareCustomMessage: lead.shareCustomMessage || `Hey! Check out this property I found for you.`,
        sharePhotoUrl: lead.sharePhotoUrl || ''
      });
    }
  }, [lead]);

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Lead not found</p>
          <button onClick={() => navigate('/leads')} className="text-blue-500 font-bold">Back to CRM</button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateLead(lead.id, form);
      navigate('/leads');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    try {
      const path = `leads/${lead.id}/share-photo-${Date.now()}`;
      const uploadedPath = await storageService.upload('leads', path, file);
      if (uploadedPath) {
        const url = storageService.getPublicUrl('leads', uploadedPath);
        if (url) setForm(f => ({ ...f, sharePhotoUrl: url }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/leads')}
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all flex items-center gap-1 text-xs font-bold"
            >
              <ChevronLeft size={20} /> Back to CRM
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div>
              <h1 className="text-lg font-bold">Edit Share Page</h1>
              <p className="text-xs text-gray-500 font-mono">{lead.propertyAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <a 
               href={`/share/${lead.id}`} 
               target="_blank" 
               rel="noopener noreferrer"
               className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold flex items-center gap-2 border border-white/10"
             >
               <Eye size={16} /> Preview
             </a>
             <button
               onClick={handleSave}
               disabled={isSaving}
               className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
             >
               {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
               Save Changes
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-12 grid lg:grid-cols-3 gap-12">
        {/* Editor Sidebar */}
        <div className="lg:col-span-2 space-y-8">
           <section className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">Public Description</label>
              <textarea
                value={form.shareDescription}
                onChange={e => setForm(f => ({ ...f, shareDescription: e.target.value }))}
                placeholder="Describe this property to the client..."
                className="w-full h-48 px-6 py-4 rounded-3xl bg-[#121a2d] border border-white/5 focus:border-blue-500/50 focus:outline-none transition-all text-sm resize-none"
              />
           </section>

           <section className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500">Custom Client Message</label>
              <div className="relative">
                <MessageSquare className="absolute top-4 left-4 text-gray-500" size={18} />
                <textarea
                  value={form.shareCustomMessage}
                  onChange={e => setForm(f => ({ ...f, shareCustomMessage: e.target.value }))}
                  placeholder="Personal note to your client..."
                  className="w-full h-24 pl-12 pr-6 py-4 rounded-3xl bg-[#121a2d] border border-white/5 focus:border-blue-500/50 focus:outline-none transition-all text-sm resize-none"
                />
              </div>
           </section>

           <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Displayed Price</label>
                <div className="relative">
                  <DollarSign className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-500" size={18} />
                  <input
                    type="number"
                    value={form.sharePrice}
                    onChange={e => setForm(f => ({ ...f, sharePrice: Number(e.target.value) }))}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl bg-[#121a2d] border border-white/5 focus:border-blue-500/50 focus:outline-none transition-all text-sm"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Property Photo</label>
                <div className="relative group divide-y divide-white/5 rounded-2xl overflow-hidden border border-white/5 bg-[#121a2d]">
                  <div className="p-4 flex items-center justify-between">
                     <span className="text-xs text-gray-400">Main Display Image</span>
                     <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600/20 transition-all">
                       {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                       <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                     </label>
                  </div>
                  {form.sharePhotoUrl && (
                    <div className="relative h-32 bg-black/20">
                       <img src={form.sharePhotoUrl} className="w-full h-full object-cover" alt="Preview" />
                       <button 
                         onClick={() => setForm(f => ({ ...f, sharePhotoUrl: '' }))}
                         className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-red-400 hover:text-red-300 transition-colors"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  )}
                </div>
              </section>
           </div>
        </div>

        {/* Live Preview Card (Mini) */}
        <div className="space-y-6">
           <label className="text-xs font-black uppercase tracking-widest text-gray-500">Live Card Preview</label>
           <div className="p-6 rounded-[2rem] bg-[#121a2d] border border-blue-500/20 shadow-xl space-y-6 sticky top-28">
              <div className="aspect-video rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center border border-white/5">
                {form.sharePhotoUrl ? (
                  <img src={form.sharePhotoUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <ImageIcon size={32} className="text-gray-700" />
                )}
              </div>
              <div className="space-y-2">
                 <div className="text-lg font-bold truncate">{lead.propertyAddress}</div>
                  <div className="text-blue-500 font-extrabold text-2xl">${(form.sharePrice || 0).toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20">
                 <p className="text-xs text-blue-100 italic line-clamp-2">"{form.shareCustomMessage}"</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest border-t border-white/5 pt-4">
                 <Globe size={12} /> Public Share Active
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
