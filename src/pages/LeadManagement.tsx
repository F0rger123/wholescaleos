import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useStore, 
  STATUS_LABELS, 
  calculateDealScore, 
  getScoreColor,
  generateNextAction,
  type Lead,
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
  Loader2,
  User, // Added
  Edit2, // Added
  Home, // Added
  DollarSign, // Added
  TrendingUp, // Added
  FileCode // Added
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CallScriptModal } from '../components/CallScriptModal';

export default function LeadManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, updateLead, deleteLead, addTimelineEntry, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [noteText, setNoteText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showCallScript, setShowCallScript] = useState(false);

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

  const handleEditToggle = async () => {
    if (isEditing) {
      // Save changes
      if (id) {
        setIsSaving(true);
        try {
          updateLead(id, editedLead);
          addTimelineEntry(id, {
            type: 'note',
            content: 'Lead details updated.',
            timestamp: new Date().toISOString(),
            user: 'You'
          });
          setShowSaveSuccess(true);
          setTimeout(() => setShowSaveSuccess(false), 3000);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSaving(false);
        }
      }
      setIsEditing(false);
    } else {
      setEditedLead({ ...lead });
      setIsEditing(true);
    }
  };

  const handleInputChange = (field: keyof Lead, value: any) => {
    setEditedLead((prev: Partial<Lead>) => ({ ...prev, [field]: value }));
  };

  const score = calculateDealScore(lead);
  const scoreColors = getScoreColor(score);
  const nextAction = generateNextAction(lead);

  const handleUpdateStatus = (newStatus: any) => {
    updateLead(lead.id, { status: newStatus });
    addTimelineEntry(lead.id, {
      type: 'status-change',
      content: `Status updated to ${STATUS_LABELS[newStatus as LeadStatus] || String(newStatus)}`,
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
              className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] hover:text-white transition-all border border-[var(--t-border)]"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-bold hidden sm:inline">Back to Dashboard</span>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-white">{lead.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${scoreColors.bg} ${scoreColors.text}`}>
                  {STATUS_LABELS[lead.status as LeadStatus] || String(lead.status)}
                </span>
                {showSaveSuccess && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 size={12} /> Changes Saved
                  </span>
                )}
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
            <button 
              onClick={() => setShowCallScript(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[var(--t-surface-hover)] text-white rounded-xl font-bold text-sm border border-[var(--t-border)] hover:bg-[var(--t-surface-active)] transition-all"
            >
              <FileCode size={16} className="text-[var(--t-primary)]" /> Generate Script
            </button>
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--t-primary)] text-[var(--t-on-primary)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--t-primary)]/20 hover:brightness-110 active:scale-95 transition-all">
              <Phone size={16} /> Call Lead
            </button>
            <button className="sm:hidden p-2 bg-[var(--t-primary)] text-[var(--t-on-primary)] rounded-xl">
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
                    ? 'bg-[var(--t-primary)] text-[var(--t-on-primary)] shadow-lg' 
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
                    <button className="px-5 py-2.5 bg-[var(--t-primary)] text-[var(--t-on-primary)] rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                      Take Recommended Action
                    </button>
                    <button className="px-5 py-2.5 bg-[var(--t-surface-hover)] text-white border border-[var(--t-border)] rounded-xl text-sm font-bold hover:bg-[var(--t-surface-active)] transition-all">
                      View Alternate Scripts
                    </button>
                  </div>
                </div>

                {/* Editable Lead Details */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <User size={20} className="text-[var(--t-primary)]" />
                      Lead Information
                    </h2>
                    <button 
                      onClick={handleEditToggle}
                      disabled={isSaving}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        isEditing 
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20' 
                          : 'bg-[var(--t-surface-hover)] text-white hover:bg-[var(--t-surface-active)] border border-[var(--t-border)]'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? (
                        <><Loader2 size={16} className="animate-spin" /> Saving...</>
                      ) : isEditing ? (
                        <><Save size={16} /> Save Changes</>
                      ) : (
                        <><Edit2 size={16} /> Edit Details</>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Info Section */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--t-text-muted)] mb-2">Contact Details</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <User size={10} /> Full Name
                          </p>
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editedLead.name || ''}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className="w-full bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--t-primary)]"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-white">{lead.name}</p>
                          )}
                        </div>
                        <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Phone size={10} /> Phone Number
                          </p>
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editedLead.phone || ''}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              className="w-full bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--t-primary)]"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-white">{lead.phone || 'N/A'}</p>
                          )}
                        </div>
                        <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Mail size={10} /> Email Address
                          </p>
                          {isEditing ? (
                            <input 
                              type="email"
                              value={editedLead.email || ''}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              className="w-full bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--t-primary)]"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-white">{lead.email || 'N/A'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Property Info Section */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] uppercase tracking-widest font-black text-[var(--t-text-muted)] mb-2">Property Details</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Home size={10} /> Property Type
                          </p>
                          {isEditing ? (
                            <select 
                              value={editedLead.propertyType || ''}
                              onChange={(e) => handleInputChange('propertyType', e.target.value)}
                              className="w-full bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--t-primary)]"
                            >
                              <option value="Single Family">Single Family</option>
                              <option value="Multi Family">Multi Family</option>
                              <option value="Condo">Condo</option>
                              <option value="Land">Land</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          ) : (
                            <p className="text-sm font-semibold text-white">{lead.propertyType}</p>
                          )}
                        </div>
                        <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Globe size={10} /> Lead Source
                          </p>
                          {isEditing ? (
                            <select 
                              value={editedLead.source || ''}
                              onChange={(e) => handleInputChange('source', e.target.value)}
                              className="w-full bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--t-primary)]"
                            >
                              <option value="bandit-signs">Bandit Signs</option>
                              <option value="personal-relations">Personal Relations</option>
                              <option value="pay-per-lead">Pay Per Lead</option>
                              <option value="doorknocking">Doorknocking</option>
                              <option value="referral">Revenue Share</option>
                              <option value="website">Website</option>
                              <option value="social-media">Social Media</option>
                              <option value="open-house">Open House</option>
                              <option value="fsbo">FSBO</option>
                              <option value="cold-call">Cold Call</option>
                              <option value="email-campaign">Email Campaign</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <p className="text-sm font-semibold text-white capitalize">{(lead.source || 'other').replace('-', ' ')}</p>
                          )}
                        </div>
                        <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <TrendingUp size={10} /> Lead Status
                          </p>
                          {isEditing ? (
                            <select 
                              value={String(editedLead.status || '')}
                              onChange={(e) => handleInputChange('status', e.target.value as LeadStatus)}
                              className="w-full bg-[var(--t-surface-hover)] border border-[var(--t-border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--t-primary)]"
                            >
                              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-sm font-semibold text-white">{STATUS_LABELS[lead.status as keyof typeof STATUS_LABELS] || String(lead.status)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Property Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                      <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1">Beds</p>
                      {isEditing ? (
                        <input type="number" value={editedLead.bedrooms || 0} onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))} className="w-full bg-transparent border-b border-[var(--t-border)] text-white font-bold py-1 focus:outline-none focus:border-[var(--t-primary)]" />
                      ) : (
                        <p className="text-xl font-black text-white">{lead.bedrooms || 0}</p>
                      )}
                    </div>
                    <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                      <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1">Baths</p>
                      {isEditing ? (
                        <input type="number" value={editedLead.bathrooms || 0} step="0.5" onChange={(e) => handleInputChange('bathrooms', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-[var(--t-border)] text-white font-bold py-1 focus:outline-none focus:border-[var(--t-primary)]" />
                      ) : (
                        <p className="text-xl font-black text-white">{lead.bathrooms || 0}</p>
                      )}
                    </div>
                    <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                      <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1">SqFt</p>
                      {isEditing ? (
                        <input type="number" value={editedLead.sqft || 0} onChange={(e) => handleInputChange('sqft', parseInt(e.target.value))} className="w-full bg-transparent border-b border-[var(--t-border)] text-white font-bold py-1 focus:outline-none focus:border-[var(--t-primary)]" />
                      ) : (
                        <p className="text-xl font-black text-white">{lead.sqft?.toLocaleString() || 0}</p>
                      )}
                    </div>
                    <div className="bg-[var(--t-surface)] p-4 rounded-2xl border border-[var(--t-border)]">
                      <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1">Value</p>
                      {isEditing ? (
                        <input type="number" value={editedLead.estimatedValue || 0} onChange={(e) => handleInputChange('estimatedValue', parseInt(e.target.value))} className="w-full bg-transparent border-b border-[var(--t-border)] text-white font-bold py-1 focus:outline-none focus:border-[var(--t-primary)]" />
                      ) : (
                        <p className="text-xl font-black text-[var(--t-success)]">${(lead.estimatedValue || 0).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Property & Deal Details (Original, now only showing non-editable parts or derived values) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--t-text-muted)] border-b border-[var(--t-border)] pb-2 flex items-center gap-2">
                      <Building2 size={16} /> Property Details
                    </h3>
                    <div className="space-y-4">
                      {/* Property Type and Estimated Value are now editable above, keeping Offer Amount and Potential Margin here */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Offer Amount</span>
                        <span className="text-sm font-bold text-[var(--t-success)]">${(lead.offerAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--t-text-muted)]">Potential Margin</span>
                        <span className="text-sm font-black text-white">${((lead.estimatedValue || 0) - (lead.offerAmount || 0)).toLocaleString()}</span>
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
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText size={20} className="text-[var(--t-primary)]" />
                    Property Documents
                  </h3>
                  <label className="px-4 py-2 bg-[var(--t-primary)] text-white rounded-xl font-bold text-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                    <FileText size={16} /> Upload Document
                    <input type="file" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && id) {
                        const newDoc = {
                          id: Math.random().toString(36).substr(2, 9),
                          name: file.name,
                          url: '#', // In a real app, upload to Supabase Storage
                          type: file.type,
                          size: file.size,
                          createdAt: new Date().toISOString()
                        };
                        updateLead(id, { documents: [...(lead.documents || []), newDoc] });
                      }
                    }} />
                  </label>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {(lead.documents || []).length > 0 ? (
                    lead.documents.map((doc) => (
                      <div key={doc.id} className="bg-[var(--t-surface-dim)] p-4 rounded-2xl border border-[var(--t-border)] flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[var(--t-surface-active)] flex items-center justify-center text-[var(--t-text-muted)]">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{doc.name}</p>
                            <p className="text-[10px] text-[var(--t-text-muted)]">
                              {(doc.size / 1024).toFixed(1)} KB â€¢ Added {formatDistanceToNow(new Date(doc.createdAt))} ago
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-[var(--t-text-muted)] hover:text-white hover:bg-[var(--t-surface-hover)] rounded-lg transition-all">
                            <DollarSign size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Delete this document?')) {
                                updateLead(lead.id, { documents: lead.documents.filter(d => d.id !== doc.id) });
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 bg-[var(--t-surface-dim)] rounded-3xl border-2 border-dashed border-[var(--t-border)]">
                      <FileText className="w-16 h-16 text-[var(--t-text-muted)] mx-auto opacity-20 mb-4" />
                      <p className="text-sm text-[var(--t-text-muted)]">No documents uploaded yet.</p>
                      <p className="text-xs text-[var(--t-text-muted)] mt-1">Upload titles, contracts, or inspection reports.</p>
                    </div>
                  )}
                </div>
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
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-3 mb-2">
                   <Share2 className="text-[var(--t-accent)]" size={24} />
                   <h3 className="text-xl font-bold text-white">Pitch & Share Deal</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-[var(--t-surface-dim)] p-6 rounded-3xl border border-[var(--t-border)]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="font-bold text-white">Public Deal Page</p>
                          <p className="text-xs text-[var(--t-text-muted)]">Toggle visibility for potential buyers</p>
                        </div>
                        <button 
                          onClick={() => updateLead(lead.id, { shareEnabled: !lead.shareEnabled })}
                          className={`w-12 h-6 rounded-full relative transition-all ${lead.shareEnabled ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-surface-hover)]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${lead.shareEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-1">Access Password</p>
                          <div className="relative">
                            <Globe className="absolute left-3 top-2.5 text-[var(--t-text-muted)]" size={14} />
                            <input 
                              type="password"
                              placeholder="Set access password..."
                              value={lead.sharePassword || ''}
                              onChange={(e) => updateLead(lead.id, { sharePassword: e.target.value })}
                              className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl pl-9 pr-4 py-2 text-white text-sm outline-none focus:border-[var(--t-primary)]"
                            />
                          </div>
                        </div>

                        <div className="pt-4">
                          <p className="text-[10px] text-[var(--t-text-muted)] font-bold uppercase tracking-widest mb-2">Public Link</p>
                          <div className="flex gap-2">
                             <div className="flex-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-3 py-2 text-[var(--t-text-muted)] text-xs truncate">
                               {window.location.origin}/pitch/{lead.id}
                             </div>
                             <button 
                               onClick={() => {
                                 navigator.clipboard.writeText(`${window.location.origin}/pitch/${lead.id}`);
                                 alert('Link copied!');
                               }}
                               className="px-3 py-2 bg-[var(--t-surface-hover)] text-white border border-[var(--t-border)] rounded-xl hover:bg-[var(--t-surface-active)]"
                             >
                                <Save size={14} />
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[var(--t-accent)]/10 to-transparent border border-[var(--t-accent)]/20 rounded-3xl p-6">
                      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <DollarSign size={16} className="text-[var(--t-accent)]" />
                        Deal Packaging
                      </h4>
                      <p className="text-xs text-[var(--t-text-muted)] mb-6 leading-relaxed">
                        Setting a password ensures only qualified buyers with your access code can view property details.
                      </p>
                      <button className="w-full py-3 bg-[var(--t-accent)] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[var(--t-accent)]/20">
                        Preview Deal Page
                      </button>
                    </div>
                  </div>
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
                    <span className="text-xs font-bold capitalize">{STATUS_LABELS[status as LeadStatus] || String(status)}</span>
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

      {lead && (
        <CallScriptModal
          isOpen={showCallScript}
          onClose={() => setShowCallScript(false)}
          lead={lead}
          agentName={currentUser?.name}
        />
      )}
    </div>
  );
}
