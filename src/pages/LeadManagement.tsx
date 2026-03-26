import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useStore, 
  STATUS_LABELS, 
  calculateDealScore, 
  getScoreColor,
  generateNextAction,
  type LeadStatus
} from '../store/useStore';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Sparkles,
  Zap,
  Target,
  Activity,
  FileText,
  Camera,
  Share2,
  Save,
  Trash2,
  MessageSquare,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LeadManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, updateLead, deleteLead, addTimelineEntry } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [noteText, setNoteText] = useState('');

  const lead = leads.find(l => l.id === id);

  useEffect(() => {
    if (!lead && leads.length > 0) {
      // If leads are loaded but this ID isn't found, go back
      navigate('/leads');
    }
  }, [lead, leads, navigate]);

  if (!lead) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--t-bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--t-primary)]" />
      </div>
    );
  }

  const score = calculateDealScore(lead);
  const scoreColors = getScoreColor(score);
  const nextAction = generateNextAction(lead);

  const handleUpdateStatus = (newStatus: any) => {
    updateLead(lead.id, { status: newStatus });
    addTimelineEntry(lead.id, {
      type: 'status-change',
      content: `Status updated to ${STATUS_LABELS[newStatus as LeadStatus]}`,
      timestamp: new Date().toISOString(),
      user: 'You'
    });
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addTimelineEntry(lead.id, {
      type: 'note',
      content: noteText,
      timestamp: new Date().toISOString(),
      user: 'You'
    });
    setNoteText('');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'timeline', label: 'Timeline & Activity', icon: Activity },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'share', label: 'Pitch & Share', icon: Share2 },
  ];

  return (
    <div className="min-h-screen bg-[var(--t-bg)] theme-transition">
      {/* Top Header */}
      <div className="bg-[var(--t-surface)] border-b border-[var(--t-border)] sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] hover:text-white transition-all border border-[var(--t-border)]"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-white">{lead.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${scoreColors.bg} ${scoreColors.text}`}>
                  {STATUS_LABELS[lead.status as LeadStatus]}
                </span>
              </div>
              <p className="text-xs text-[var(--t-text-muted)] flex items-center gap-1">
                <MapPin size={12} /> {lead.propertyAddress}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--t-surface-hover)] border border-[var(--t-border)]">
              <div className="text-right">
                <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Deal Score</p>
                <p className={`text-lg font-black leading-none ${scoreColors.text}`}>{score}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-current opacity-20" style={{ color: scoreColors.bar }} />
            </div>
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold text-sm shadow-lg shadow-[var(--t-primary)]/20 hover:brightness-110 active:scale-95 transition-all">
              <Phone size={16} /> Call Lead
            </button>
            <button className="sm:hidden p-2 bg-[var(--t-primary)] text-white rounded-xl">
              <Phone size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex bg-[var(--t-surface)] p-1 rounded-2xl border border-[var(--t-border)] overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-[var(--t-primary)] text-white shadow-lg' 
                    : 'text-[var(--t-text-muted)] hover:text-white hover:bg-[var(--t-surface-hover)]'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl overflow-hidden min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="p-8 space-y-8">
                {/* AI Insight Header */}
                <div className="bg-gradient-to-br from-[var(--t-primary-dim)] to-[var(--t-surface)] border border-[var(--t-primary-border)] rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--t-primary)] opacity-5 blur-3xl -mr-16 -mt-16 group-hover:opacity-10 transition-opacity" />
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-[var(--t-primary)]" size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--t-primary)]">AI recommendation</h3>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">{nextAction.title}</h4>
                  <p className="text-[var(--t-text-muted)] text-sm leading-relaxed mb-6">
                    {nextAction.description || "Based on the lead's current status and engagement level, we recommend reaching out within the next 24 hours to clarify property details."}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button className="px-5 py-2.5 bg-[var(--t-primary)] text-white rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                      Take Recommended Action
                    </button>
                    <button className="px-5 py-2.5 bg-[var(--t-surface-hover)] text-white border border-[var(--t-border)] rounded-xl text-sm font-bold hover:bg-[var(--t-surface-active)] transition-all">
                      View Alternate Scripts
                    </button>
                  </div>
                </div>

                {/* Property & Deal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--t-text-muted)] border-b border-[var(--t-border)] pb-2 flex items-center gap-2">
                      <Building2 size={16} /> Property Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Property Type</span>
                        <span className="text-sm font-bold text-white capitalize">{lead.propertyType}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Estimated Value</span>
                        <span className="text-sm font-bold text-white">${lead.estimatedValue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Offer Amount</span>
                        <span className="text-sm font-bold text-[var(--t-success)]">${lead.offerAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Potential Margin</span>
                        <span className="text-sm font-black text-white">${(lead.estimatedValue - lead.offerAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--t-text-muted)] border-b border-[var(--t-border)] pb-2 flex items-center gap-2">
                       <Zap size={16} /> Deal Metrics
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Engagement</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(v => (
                            <div key={v} className={`w-3 h-1.5 rounded-full ${v <= lead.engagementLevel ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-active)]'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Urgency</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(v => (
                            <div key={v} className={`w-3 h-1.5 rounded-full ${v <= lead.timelineUrgency ? 'bg-[var(--t-warning)]' : 'bg-[var(--t-surface-active)]'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Probability</span>
                        <span className="text-sm font-bold text-white">{lead.probability}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Deal Score</span>
                        <span className={`text-sm font-bold ${scoreColors.text}`}>{score}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Notes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--t-text-muted)] border-b border-[var(--t-border)] pb-2">
                    Internal Notes
                  </h3>
                  <p className="text-sm text-[var(--t-text-muted)] bg-[var(--t-surface-dim)] p-4 rounded-2xl border border-[var(--t-border-subtle)] leading-relaxed italic">
                    {lead.notes || "No internal notes provided for this lead."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="p-8 space-y-8">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <MessageSquare className="absolute left-4 top-4 text-[var(--t-text-muted)]" size={18} />
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Type a note or activity log..."
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--t-input-bg)] border border-[var(--t-border)] text-white text-sm min-h-[100px] outline-none focus:border-[var(--t-primary)] transition-all resize-none"
                    />
                  </div>
                  <button 
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="self-end p-4 rounded-2xl bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary)]/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    <Save size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {lead.timeline.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((item, i) => (
                    <div key={item.id} className="relative pl-8 group">
                      {/* Line */}
                      {i !== lead.timeline.length - 1 && (
                        <div className="absolute left-3 top-6 bottom-[-24px] w-[2px] bg-[var(--t-border)] z-0" />
                      )}
                      
                      {/* Circle Indicator */}
                      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[var(--t-surface)] border-2 border-[var(--t-border)] flex items-center justify-center z-10 group-hover:border-[var(--t-primary)] transition-colors">
                        <div className={`w-2 h-2 rounded-full ${
                          item.type === 'note' ? 'bg-[var(--t-info)]' : 
                          item.type === 'status-change' ? 'bg-[var(--t-warning)]' : 
                          'bg-[var(--t-primary)]'
                        }`} />
                      </div>

                      <div className="bg-[var(--t-surface-dim)] p-4 rounded-2xl border border-[var(--t-border-subtle)] group-hover:border-[var(--t-border-strong)] transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-text-muted)]">
                            {item.type.replace('-', ' ')}
                          </span>
                          <span className="text-[10px] text-[var(--t-text-muted)]">
                            {formatDistanceToNow(new Date(item.timestamp))} ago
                          </span>
                        </div>
                        <p className="text-sm text-[var(--t-text)] leading-relaxed">{item.content}</p>
                        <div className="mt-2 flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-[var(--t-primary-dim)] flex items-center justify-center text-[8px] font-bold text-[var(--t-primary)]">
                             {item.user?.[0] || 'U'}
                           </div>
                           <span className="text-[10px] text-[var(--t-text-muted)]">Logged by {item.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lead.timeline.length === 0 && (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-[var(--t-text-muted)] mx-auto opacity-20 mb-4" />
                      <p className="text-sm text-[var(--t-text-muted)]">No activity logged yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="p-12 text-center">
                <FileText className="w-20 h-20 text-[var(--t-primary)] mx-auto opacity-20 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Document Repository</h3>
                <p className="text-[var(--t-text-muted)] text-sm max-w-sm mx-auto mb-8">
                  Connect Google Drive to store and manage property contracts, titles, and inspection reports.
                </p>
                <button className="px-8 py-3 bg-[var(--t-surface-hover)] text-white border border-[var(--t-border)] rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-[var(--t-surface-active)] transition-all">
                  <Globe size={18} /> Connect Google Drive
                </button>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {lead.photos?.map((photo, i) => (
                    <div key={i} className="aspect-video rounded-2xl bg-[var(--t-surface-active)] border border-[var(--t-border)] relative overflow-hidden group">
                      <img src={photo} alt="Lead property" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="aspect-video rounded-2xl bg-[var(--t-surface-dim)] border-2 border-dashed border-[var(--t-border)] flex flex-col items-center justify-center text-[var(--t-text-muted)] hover:text-white hover:border-[var(--t-primary)] transition-all">
                     <Camera size={24} className="mb-2" />
                     <span className="text-xs font-bold">Add Photo</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'share' && (
              <div className="p-12 text-center">
                <Share2 className="w-20 h-20 text-[var(--t-accent)] mx-auto opacity-20 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Pitch & Share Deal</h3>
                <p className="text-[var(--t-text-muted)] text-sm max-w-sm mx-auto mb-8">
                  Generate a public deal page to share with potential buyers. Control what information is visible.
                </p>
                <div className="bg-[var(--t-surface-dim)] p-6 rounded-3xl border border-[var(--t-border-subtle)] max-w-md mx-auto">
                   <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--t-border)]">
                      <span className="text-sm font-bold text-white">Public Deal Page</span>
                      <div className="w-12 h-6 bg-[var(--t-surface-active)] rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-[var(--t-text-muted)] rounded-full" />
                      </div>
                   </div>
                   <button disabled className="w-full py-3 bg-[var(--t-accent)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                     <Globe size={18} /> Enable Public Link
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Stats & Info */}
        <div className="space-y-6">
          {/* Action Center */}
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--t-text-muted)] mb-5">Lead Contact</h3>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)] border border-[var(--t-primary-border)]">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Email Address</p>
                  <p className="text-sm text-white truncate">{lead.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--t-success)]/10 flex items-center justify-center text-[var(--t-success)] border border-[var(--t-success)]/20">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Phone Number</p>
                  <p className="text-sm text-white">{lead.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--t-info)]/10 flex items-center justify-center text-[var(--t-info)] border border-[var(--t-info)]/20">
                  <Globe size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest">Lead Source</p>
                  <p className="text-sm text-white capitalize">{lead.source}</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="py-2.5 bg-[var(--t-surface-hover)] border border-[var(--t-border)] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--t-surface-active)] transition-all">
                <Mail size={14} /> Email
              </button>
              <button className="py-2.5 bg-[var(--t-surface-hover)] border border-[var(--t-border)] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--t-surface-active)] transition-all">
                <MessageSquare size={14} /> SMS
              </button>
            </div>
          </div>

          {/* Status Progression */}
          <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--t-text-muted)] mb-5">Lead Journey</h3>
            <div className="space-y-2">
              {['new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost'].map((status) => {
                const isCurrent = lead.status === status;
                const isPast = ['new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost'].indexOf(lead.status) > ['new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost'].indexOf(status);
                
                return (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(status)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isCurrent 
                        ? 'bg-[var(--t-primary)]/10 border-[var(--t-primary)] text-white' 
                        : isPast 
                        ? 'bg-[var(--t-surface-hover)] border-[var(--t-border)] text-[var(--t-success)]' 
                        : 'bg-transparent border-[var(--t-border-subtle)] text-[var(--t-text-muted)] hover:border-[var(--t-border)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isCurrent ? 'bg-[var(--t-primary)] text-white' : 
                      isPast ? 'bg-[var(--t-success)] text-white' : 
                      'bg-[var(--t-surface-active)]'
                    }`}>
                      {isPast ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </div>
                    <span className="text-xs font-bold capitalize">{STATUS_LABELS[status as LeadStatus]}</span>
                    {isCurrent && <ChevronRight size={14} className="ml-auto opacity-50" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dangerous Actions */}
          <div className="bg-[var(--t-error)]/5 border border-[var(--t-error)]/20 rounded-3xl p-6">
             <button 
               onClick={() => {
                 if (confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
                   deleteLead(lead.id);
                   navigate('/dashboard');
                 }
               }}
               className="w-full py-3 bg-[var(--t-error)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--t-error)]/20"
             >
               <Trash2 size={18} /> Delete Lead
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
