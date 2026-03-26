import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mail, Globe, Facebook, Instagram, Linkedin, Twitter, 
  MapPin, Award, Star, 
  Download, QrCode, MessageSquare, ShieldCheck, ExternalLink,
  ChevronLeft, Loader2, Sparkles
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export default function AgentProfile() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    async function fetchAgent() {
      if (!name) return;
      setIsLoading(true);
      setError(null);
      
      try {
        if (!supabase) {
          // Demo fallback
          throw new Error('Supabase not connected');
        }
        // In a real app, we'd query by slug. 
        // For now, we search by name (case insensitive)
        const displayName = name.replace(/-/g, ' ');
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('full_name', displayName)
          .single();

        if (error || !data) {
          // Fallback to searching in current team members
          const store = useStore.getState();
          const found = store.team.find(m => m.name.toLowerCase() === displayName.toLowerCase());
          if (found) {
            setAgent({
                ...found,
                bio: '',
                specialties: [],
                licenseNumber: '',
                yearsExperience: 0,
                socialLinks: {},
                website: '',
                acceptLeads: true,
                testimonials: []
            });
          } else {
             setError('Agent profile not found');
          }
        } else {
          // Map database structure to our profile interface
          const settings = data.settings || {};
          setAgent({
            id: data.id,
            name: data.full_name || data.name,
            email: data.email,
            phone: data.phone,
            avatar: data.avatar,
            avatarUrl: data.avatar_url || settings.avatar_url || settings.avatarUrl || data.avatarUrl,
            bio: settings.bio || data.bio || '',
            specialties: settings.specialties || data.specialties || [],
            licenseNumber: settings.license_number || settings.licenseNumber || '',
            yearsExperience: settings.years_experience || settings.yearsExperience || 0,
            languages: settings.languages || [],
            socialLinks: settings.social_links || settings.socialLinks || {},
            serviceAreas: settings.service_areas || settings.serviceArea || settings.serviceAreas || [],
            testimonials: settings.testimonials || [],
            isPublic: settings.is_public !== false && settings.isPublic !== false,
            publicContactEmail: settings.public_contact_email !== false && settings.publicContactEmail !== false,
            publicContactPhone: settings.public_contact_phone !== false && settings.publicContactPhone !== false,
            acceptLeads: settings.accept_leads !== false && settings.acceptLeads !== false,
            website: settings.website || data.website || ''
          });
        }
      } catch (err) {
        console.error('Error fetching agent:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgent();
  }, [name]);

  const handleContactAgent = (type: 'sms' | 'email') => {
    if (!agent) return;
    
    // In a real scenario, this would open a lead capture modal first
    // For now, we simulate direct contact
    if (type === 'sms' && agent.phone) {
      window.location.href = `sms:${agent.phone}`;
    } else if (type === 'email' && agent.email) {
      window.location.href = `mailto:${agent.email}`;
    }
  };

  const generateVCard = () => {
    if (!agent) return;
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${agent.name}
EMAIL:${agent.email}
TEL:${agent.phone}
NOTE:${agent.bio}
END:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agent.name.replace(/\s+/g, '_')}.vcf`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--t-bg)] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading Agent Profile...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 text-center text-white">
        <div className="p-6 rounded-full bg-blue-500/10 mb-8 animate-pulse text-blue-500">
          <Sparkles className="w-16 h-16" />
        </div>
        <h2 className="text-4xl font-black mb-4 italic tracking-tight">Profile Coming Soon</h2>
        <p className="text-gray-400 mb-10 max-w-sm text-lg">
          This agent is currently polishing their public profile. Please check back shortly for full details.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all flex items-center gap-3 shadow-xl shadow-blue-600/20"
        >
          <ChevronLeft size={20} />
          Back to WholeScale OS
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--t-bg)] text-[var(--t-text)] overflow-x-hidden">
      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2.5rem] p-8 max-w-sm w-full space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-[var(--t-bg)] border border-[var(--t-border)] text-gray-400 hover:text-white transition-all"
            >
              <Sparkles size={16} />
            </button>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Share Profile</h3>
              <p className="text-xs text-gray-500">Scan this code to view Alex's digital business card</p>
            </div>
            <div className="aspect-square rounded-3xl bg-white p-6 shadow-inner flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`} 
                alt="Profile QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="pt-2">
               <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setShowQRModal(false);
                }}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
               >
                 Copy Link
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] transition-all">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 opacity-80" />
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay" />
         
         <div className="absolute inset-0 bg-gradient-to-t from-[var(--t-bg)] to-transparent" />
         
         <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-12">
            <div className="flex flex-col md:flex-row items-end gap-8 reveal">
               <div className="relative group shrink-0">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
                  <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-3xl bg-[var(--t-surface)] overflow-hidden border-4 border-[var(--t-bg)] shadow-2xl">
                    {agent.avatarUrl ? (
                      <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
                    ) : agent.avatar ? (
                      <div className="w-full h-full bg-blue-600 flex items-center justify-center text-4xl md:text-6xl font-bold text-white uppercase">
                        {agent.avatar}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-blue-600 flex items-center justify-center text-4xl md:text-6xl font-bold text-white">
                        {agent.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-green-500 w-6 h-6 rounded-full border-4 border-[var(--t-bg)] shadow-xl" />
               </div>
               
               <div className="flex-1 space-y-4 pb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight">{agent.name}</h1>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                       <ShieldCheck size={12} />
                       Verified Agent
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2"><Award size={18} className="text-blue-500" /> {agent.licenseNumber || 'Licensed Professional'}</div>
                    <div className="flex items-center gap-2"><Star size={18} className="text-yellow-500" /> 4.9/5 Rating</div>
                    <div className="flex items-center gap-2"><MapPin size={18} className="text-red-500" /> {agent.serviceAreas?.[0] || 'Statewide Service'}</div>
                    {agent.website && (
                      <a 
                        href={agent.website.startsWith('http') ? agent.website : `https://${agent.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Globe size={18} /> Official Website
                      </a>
                    )}
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                About Me
                <div className="h-1 w-12 bg-blue-600 rounded-full" />
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                {agent.bio || 'This agent has not yet provided a professional biography. Please contact them directly for more information about their services and expertise.'}
              </p>
            </section>

            <section className="space-y-6">
              <h2 className="text-xl font-bold">Specialties & Expertise</h2>
              <div className="flex flex-wrap gap-3">
                {(agent.specialties?.length ? agent.specialties : ['Licensed Agent', 'Real Estate Professional']).map((specialty: string, i: number) => (
                  <div 
                    key={i} 
                    className="px-4 py-2 rounded-xl bg-[var(--t-surface)] border border-[var(--t-border)] text-sm font-medium hover:border-blue-500 hover:text-blue-500 transition-all cursor-default"
                  >
                    {specialty}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
               <div className="p-6 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-center space-y-2">
                  <div className="text-2xl font-black text-blue-500">{agent.yearsExperience || '—'}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Years Exp</div>
               </div>
               <div className="p-6 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-center space-y-2">
                  <div className="text-2xl font-black text-green-500">120+</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Deals Closed</div>
               </div>
               <div className="p-6 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-center space-y-2">
                  <div className="text-2xl font-black text-purple-500">{agent.languages?.length || '2'}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Languages</div>
               </div>
               <div className="p-6 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-center space-y-2">
                  <div className="text-2xl font-black text-orange-500">100%</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Satisfaction</div>
               </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                What Clients Say
                <div className="flex-1 h-px bg-[var(--t-border)]" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(agent.testimonials?.length ? agent.testimonials : []).map((t: any) => (
                  <div key={t.id} className="p-6 rounded-3xl bg-[var(--t-surface-dim)] border border-[var(--t-border)] space-y-4 hover:border-blue-500/30 transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {[...Array(t.rating)].map((_, i) => <Star key={i} size={14} className="fill-yellow-500 text-yellow-500" />)}
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold">{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-400 italic leading-relaxed">"{t.content}"</p>
                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-black text-blue-500">
                        {t.author[0]}
                      </div>
                      <div className="text-[11px] font-bold text-gray-300">{t.author}</div>
                    </div>
                  </div>
                ))}
                {!agent.testimonials?.length && (
                  <div className="col-span-full p-8 rounded-3xl border-2 border-dashed border-[var(--t-border)] text-center space-y-2">
                    <Star className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-sm text-gray-500 font-medium">No public testimonials available yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* Contact Card */}
            <div className="sticky top-24 space-y-6">
              <div className="p-8 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-2xl space-y-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Get in Touch</h3>
                  <p className="text-xs text-gray-500">{agent.acceptLeads !== false ? 'Available 7 days a week for consultations' : 'Not currently accepting new leads'}</p>
                </div>

                {agent.acceptLeads !== false ? (
                  <div className="space-y-4">
                    <button 
                      onClick={() => handleContactAgent('sms')} 
                      className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-3 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20"
                    >
                      <MessageSquare size={20} />
                      Text {agent.name.split(' ')[0]}
                    </button>
                    <button 
                      onClick={() => handleContactAgent('email')}
                      className="w-full h-16 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-blue-500/50 flex items-center justify-center gap-3 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Mail size={20} />
                      Send Email
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-gray-500/5 border border-gray-500/10 text-center space-y-2">
                     <p className="text-xs text-gray-500 font-medium">Lead capture is temporarily disabled for this profile.</p>
                  </div>
                )}
                
                <div className="pt-8 border-t border-[var(--t-border)] space-y-6">
                  <div className="flex items-center justify-center gap-6">
                    {agent.socialLinks?.facebook && <a href={agent.socialLinks.facebook} className="p-3 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"><Facebook size={20} /></a>}
                    {agent.socialLinks?.instagram && <a href={agent.socialLinks.instagram} className="p-3 rounded-full bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white transition-all"><Instagram size={20} /></a>}
                    {agent.socialLinks?.linkedin && <a href={agent.socialLinks.linkedin} className="p-3 rounded-full bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"><Linkedin size={20} /></a>}
                    {agent.socialLinks?.x && <a href={agent.socialLinks.x} className="p-3 rounded-full bg-gray-600/10 text-gray-400 hover:bg-gray-100 hover:text-black transition-all"><Twitter size={20} /></a>}
                  </div>
                  
                    <button 
                      onClick={generateVCard}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-white transition-all"
                    >
                      <Download size={14} />
                      vCard
                    </button>
                    <button 
                      onClick={() => setShowQRModal(true)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--t-bg)] border border-[var(--t-border)] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-white transition-all"
                    >
                      <QrCode size={14} />
                      QR Code
                    </button>
                </div>
              </div>
              
              {/* Extra Info */}
              <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-blue-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500 text-white"><Globe size={18} /></div>
                  <h4 className="font-bold">Service Areas</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(agent.serviceAreas?.length ? agent.serviceAreas : ['Greater Metro', 'Downtown', 'Suburbs']).map((area: string, i: number) => (
                    <span key={i} className="text-xs text-gray-400 px-3 py-1 rounded-lg bg-black/20 border border-white/5">{area}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer link back to site */}
      <footer className="border-t border-[var(--t-border)] py-12 mt-12 bg-[var(--t-surface-dim)]">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
               WHOLESCALE<span className="text-blue-600">OS</span>
            </div>
            <p className="text-xs text-gray-500">© 2024 Wholesale Real Estate OS. All rights reserved.</p>
            <button 
              onClick={() => navigate('/')}
              className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-2 transition-all underline decoration-blue-500/50 underline-offset-4"
            >
              Powered by WholeScaleOS <ExternalLink size={12} />
            </button>
         </div>
      </footer>
    </div>
  );
}
