import { useState, useEffect, useRef } from 'react';
import { useStore, Lead, LeadStatus, calculateDealScore, calculatePriorityScore, generateNextAction, STATUS_LABELS, STATUS_FLOW } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { geocodeAddress } from '../lib/geocoding';
import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search, Plus, ChevronDown, ChevronRight, Phone, Mail, MapPin,
  DollarSign, Calendar, Edit2, Trash2, X, Check,
  Sparkles, Loader2, Save, PhoneCall, Send,
  Users, Mic, Play, Pause, Square, Brain,
  Target, Zap, BarChart3,
  FileText, Camera, Navigation, Globe, ArrowRight, Volume2, Eye
} from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  'new': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'contacted': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'qualified': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'negotiating': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'closed-won': 'bg-green-500/20 text-green-300 border-green-500/30',
  'closed-lost': 'bg-red-500/20 text-red-300 border-red-500/30',
  'follow-up': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'not-interested': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const TIMELINE_ICONS: Record<string, { icon: any; color: string }> = {
  'call': { icon: PhoneCall, color: 'text-blue-400 bg-blue-500/20' },
  'email': { icon: Mail, color: 'text-green-400 bg-green-500/20' },
  'note': { icon: FileText, color: 'text-yellow-400 bg-yellow-500/20' },
  'meeting': { icon: Users, color: 'text-purple-400 bg-purple-500/20' },
  'status-change': { icon: ArrowRight, color: 'text-orange-400 bg-orange-500/20' },
  'task': { icon: Check, color: 'text-emerald-400 bg-emerald-500/20' },
};

const SOURCE_BADGE: Record<string, string> = {
  'google-sheets': 'bg-green-500/20 text-green-300',
  'homes-com': 'bg-blue-500/20 text-blue-300',
  'pdf': 'bg-red-500/20 text-red-300',
  'smart-paste': 'bg-purple-500/20 text-purple-300',
  'manual': 'bg-slate-500/20 text-slate-300',
};

interface CustomField { 
  id: string; 
  name: string; 
  field_key: string; 
  field_type: 'text' | 'number'; 
}

export default function Leads() {
  const store = useStore();
  const { leads, addLead, updateLead, deleteLead, teamId, addTimelineEntry, updateLeadStatus, addCallRecording, analyzeRecording, callRecordings, addLeadPhoto, removeLeadPhoto } = store;
  const saveStatus = (store as any).saveStatus || 'idle';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<string | null>(null);
  const [geocodingAll, setGeocodingAll] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const recordingInterval = useRef<any>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', propertyAddress: '',
    propertyType: 'single-family', estimatedValue: '', offerAmount: '',
    status: 'new', notes: '',
    probability: '50', engagementLevel: '3', timelineUrgency: '3', competitionLevel: '3',
  });

  useEffect(() => {
    if (!supabase || !teamId) return;
    
    const loadCustomFields = async () => {
      const { data, error } = await supabase!
        .from('custom_fields')
        .select('*')
        .eq('team_id', teamId)
        .order('display_order');
      
      if (error) {
        console.error('Error loading custom fields:', error);
      } else if (data) {
        setCustomFields(data);
      }
    };
    
    loadCustomFields();
  }, [teamId]);

  useEffect(() => {
    if (isRecording) { 
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000); 
    } else { 
      if (recordingInterval.current) clearInterval(recordingInterval.current); 
      setRecordingTime(0); 
    }
    return () => { if (recordingInterval.current) clearInterval(recordingInterval.current); };
  }, [isRecording]);

  const getDaysInStatus = (lead: Lead) => {
    const hist = lead.statusHistory;
    const last = hist?.[hist.length - 1];
    const since = last?.timestamp || lead.createdAt;
    return Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
  };

  const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0);
  const fmtDate = (d: string) => { try { return format(new Date(d), 'MMM d, yyyy'); } catch { return 'N/A'; } };
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const scoreBadge = (s: number) => s >= 70 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : s >= 40 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40';
  const priBadge = (l: string) => l === 'high' ? { c: 'bg-red-500/20 text-red-300', l: 'High' } : l === 'medium' ? { c: 'bg-amber-500/20 text-amber-300', l: 'Medium' } : { c: 'bg-emerald-500/20 text-emerald-300', l: 'Low' };

  const filtered = leads
    .filter(l => {
      const q = searchQuery.toLowerCase();
      const ms = !q || (l.name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.propertyAddress || '').toLowerCase().includes(q);
      const mst = statusFilter === 'all' || l.status === statusFilter;
      const mp = priorityFilter === 'all' || calculatePriorityScore(l).level === priorityFilter;
      return ms && mst && mp;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return calculatePriorityScore(b).score - calculatePriorityScore(a).score;
      if (sortBy === 'score') return calculateDealScore(b) - calculateDealScore(a);
      if (sortBy === 'value') return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  const openAdd = () => { 
    setEditingLead(null); 
    setFormData({ 
      name: '', email: '', phone: '', propertyAddress: '', 
      propertyType: 'single-family', estimatedValue: '', offerAmount: '', 
      status: 'new', notes: '', 
      probability: '50', engagementLevel: '3', timelineUrgency: '3', competitionLevel: '3' 
    }); 
    setShowModal(true); 
  };
  
  const openEdit = (l: Lead) => { 
    setEditingLead(l); 
    setFormData({ 
      name: l.name || '', 
      email: l.email || '', 
      phone: l.phone || '', 
      propertyAddress: l.propertyAddress || '', 
      propertyType: l.propertyType || 'single-family', 
      estimatedValue: (l.estimatedValue || '').toString(), 
      offerAmount: (l.offerAmount || '').toString(), 
      status: l.status || 'new', 
      notes: l.notes || '', 
      probability: (l.probability || 50).toString(), 
      engagementLevel: (l.engagementLevel || 3).toString(), 
      timelineUrgency: (l.timelineUrgency || 3).toString(), 
      competitionLevel: (l.competitionLevel || 3).toString() 
    }); 
    setShowModal(true); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setSaving(true);
    let lat = 30.2672, lng = -97.7431;
    if (formData.propertyAddress) { 
      const c = await geocodeAddress(formData.propertyAddress); 
      if (c) { lat = c.lat; lng = c.lng; } 
    }
    const d: any = { 
      name: formData.name, 
      email: formData.email, 
      phone: formData.phone, 
      propertyAddress: formData.propertyAddress, 
      propertyType: formData.propertyType, 
      estimatedValue: parseFloat(formData.estimatedValue) || 0, 
      offerAmount: parseFloat(formData.offerAmount) || 0, 
      status: formData.status, 
      notes: formData.notes, 
      lat, lng, 
      source: 'other', 
      assignedTo: '', 
      probability: parseInt(formData.probability), 
      engagementLevel: parseInt(formData.engagementLevel), 
      timelineUrgency: parseInt(formData.timelineUrgency), 
      competitionLevel: parseInt(formData.competitionLevel) 
    };
    if (editingLead) updateLead(editingLead.id, d); else addLead(d);
    setSaving(false); 
    setShowModal(false);
  };

  const handleDel = (id: string) => { 
    if (confirm('Delete this lead?')) { 
      deleteLead(id); 
      if (expandedLead === id) setExpandedLead(null); 
    } 
  };

  const addNote = (lid: string) => { 
    if (!noteText.trim()) return; 
    addTimelineEntry(lid, { 
      type: 'note', 
      content: noteText, 
      timestamp: new Date().toISOString(), 
      user: 'You' 
    }); 
    setNoteText(''); 
  };
  
  const logAct = (lid: string, type: string) => { 
    addTimelineEntry(lid, { 
      type: type as any, 
      content: `${type} logged`, 
      timestamp: new Date().toISOString(), 
      user: 'You' 
    }); 
  };
  
  const startRec = () => setIsRecording(true);
  
  const stopRec = (lid: string) => { 
    setIsRecording(false); 
    addCallRecording(lid, recordingTime); 
  };
  
  const geocodeAll = async () => { 
    setGeocodingAll(true); 
    for (const l of leads.filter(l => l.propertyAddress && (!l.lat || l.lat === 30.2672))) { 
      const c = await geocodeAddress(l.propertyAddress || ''); 
      if (c) updateLead(l.id, { lat: c.lat, lng: c.lng }); 
    } 
    setGeocodingAll(false); 
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Leads <span className="text-sm font-normal px-2 py-1 bg-slate-700 text-slate-300 rounded-full">{filtered.length}</span>
            {saveStatus === 'saving' && <span className="text-sm text-blue-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving...</span>}
            {saveStatus === 'saved' && <span className="text-sm text-green-400">✅ Saved</span>}
            {saveStatus === 'error' && <span className="text-sm text-red-400">❌ Failed</span>}
          </h1>
        </div>
        <div className="flex gap-3">
          {leads.some(l => l.propertyAddress && (!l.lat || l.lat === 30.2672)) && (
            <button 
              onClick={geocodeAll} 
              disabled={geocodingAll} 
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
            >
              {geocodingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />} Geocode All
            </button>
          )}
          <button 
            onClick={openAdd} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* CUSTOM FIELDS */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">Custom Lead Fields</h2>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
              {customFields.length}
            </span>
          </div>
          {!showAddField && (
            <button 
              onClick={() => setShowAddField(true)} 
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg"
            >
              <Plus className="w-3 h-3" /> Add Field
            </button>
          )}
        </div>

        {showAddField && (
          <div className="mb-3 flex items-center gap-2">
            <input 
              value={newFieldName} 
              onChange={e => setNewFieldName(e.target.value)} 
              placeholder="Field name (e.g., Lot Size, ARV, Equity)" 
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm" 
              autoFocus 
            />
            <select 
              value={newFieldType} 
              onChange={e => setNewFieldType(e.target.value as any)} 
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
            <button 
              onClick={async () => {
                if (!newFieldName.trim()) return;
                
                const fieldKey = newFieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                const newField = {
                  id: uuidv4(),
                  name: newFieldName.trim(),
                  field_key: fieldKey,
                  field_type: newFieldType
                };
                
                try {
                  if (supabase && teamId) {
                    const { error } = await supabase
                      .from('custom_fields')
                      .insert([{ 
                        ...newField, 
                        team_id: teamId, 
                        display_order: customFields.length 
                      }]);
                    
                    if (error) {
                      alert(`❌ Failed to save: ${error.message}`);
                      return;
                    }
                  }
                  
                  setCustomFields(p => [...p, newField]);
                  setNewFieldName('');
                  setShowAddField(false);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                  
                } catch (err: any) {
                  alert(`❌ Error: ${err.message}`);
                }
              }} 
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { 
                setShowAddField(false); 
                setNewFieldName(''); 
              }} 
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-xs flex items-center gap-1">
            <Check size={12} />
            Field saved to database!
          </div>
        )}

        {customFields.length === 0 ? (
          <p className="text-slate-400 text-sm">No custom fields yet. Add fields like &quot;Lot Size&quot;, &quot;ARV&quot;, or &quot;Equity&quot;.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customFields.map(f => (
              <span 
                key={f.id} 
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-sm group"
              >
                <span className="text-white">{f.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${
                  f.field_type === 'number' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {f.field_type}
                </span>
                <button 
                  onClick={async () => {
                    if (!confirm(`Delete field "${f.name}"?`)) return;
                    
                    try {
                      if (supabase) {
                        const { error } = await supabase
                          .from('custom_fields')
                          .delete()
                          .eq('id', f.id);
                        
                        if (error) {
                          alert(`❌ Failed to delete: ${error.message}`);
                          return;
                        }
                      }
                      
                      setCustomFields(p => p.filter(field => field.id !== f.id));
                      alert('✅ Field deleted');
                      
                    } catch (err: any) {
                      alert(`❌ Error: ${err.message}`);
                    }
                  }} 
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SEARCH / FILTER / SORT */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search leads..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" 
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="negotiating">Negotiating</option>
          <option value="closed-won">Closed Won</option>
          <option value="closed-lost">Closed Lost</option>
        </select>
        <select 
          value={priorityFilter} 
          onChange={e => setPriorityFilter(e.target.value)} 
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)} 
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        >
          <option value="priority">🧠 AI Priority</option>
          <option value="score">⚡ Deal Score</option>
          <option value="value">💰 Value</option>
          <option value="name">Name</option>
          <option value="updatedAt">Updated</option>
        </select>
      </div>

      {/* LEADS LIST */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-xl">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-lg">No leads found</p>
            <button onClick={openAdd} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Add Your First Lead</button>
          </div>
        ) : filtered.map(lead => {
          const ds = calculateDealScore(lead);
          const pri = calculatePriorityScore(lead);
          const pb = priBadge(pri.level);
          const days = getDaysInStatus(lead);
          const geo = lead.lat && lead.lat !== 30.2672;
          return (
            <div key={lead.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
              {/* LEAD ROW */}
              <div 
                onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)} 
                className="flex items-center gap-3 p-4 cursor-pointer"
              >
                <div className="flex-shrink-0">
                  {expandedLead === lead.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(lead.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{lead.name || 'Unnamed'}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_BADGE[lead.status] || STATUS_BADGE['new']}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${scoreBadge(ds)}`}>⚡ {ds}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${pb.c}`}>🧠 {pb.l}</span>
                    {lead.importSource && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${SOURCE_BADGE[lead.importSource] || SOURCE_BADGE['manual']}`}>
                        {lead.importSource}
                      </span>
                    )}
                    {lead.photos && lead.photos.length > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-teal-500/20 text-teal-300">📷 {lead.photos.length}</span>
                    )}
                    <span className="text-xs text-slate-500">{days}d</span>
                    <span className={`w-2 h-2 rounded-full ${geo ? 'bg-green-400' : 'bg-amber-400'}`} title={geo ? 'Geocoded' : 'Not geocoded'} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{lead.propertyAddress || 'No address'}</p>
                  <div className="w-24 h-1 bg-slate-700 rounded-full mt-1">
                    <div 
                      className={`h-full rounded-full ${ds >= 70 ? 'bg-emerald-500' : ds >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                      style={{ width: `${ds}%` }} 
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-semibold">{fmt$(lead.estimatedValue || 0)}</p>
                  <p className="text-xs text-slate-400">{lead.propertyType || 'Unknown'}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button 
                    onClick={e => { e.stopPropagation(); openEdit(lead); }} 
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={e => { e.stopPropagation(); handleDel(lead.id); }} 
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* EXPANDED DETAIL */}
              {expandedLead === lead.id && (
                <div className="border-t border-slate-700 bg-slate-900/50">
                  {(() => {
                    const nba = generateNextAction(lead);
                    const recs = callRecordings.filter(r => r.leadId === lead.id);
                    const transitions = (STATUS_FLOW as any)[lead.status] || [];

                    return (
                      <>
                        {/* Next Best Action */}
                        {nba && (
                          <div className="m-4 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <Brain className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                  <h4 className="text-white font-medium">{nba.title}</h4>
                                  <p className="text-slate-400 text-sm mt-1">{nba.description}</p>
                                  <span className="text-xs text-blue-400">{nba.confidence}% confidence</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => logAct(lead.id, nba.type)} 
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" /> {nba.actionLabel}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-4 pb-4">
                          {[
                            { i: MapPin, l: 'Address', v: lead.propertyAddress || 'N/A' },
                            { i: Phone, l: 'Phone', v: lead.phone || 'N/A' },
                            { i: Mail, l: 'Email', v: lead.email || 'N/A' },
                            { i: Globe, l: 'Type', v: lead.propertyType || 'N/A' },
                            { i: DollarSign, l: 'Offer', v: fmt$(lead.offerAmount || 0) },
                            { i: Calendar, l: 'Created', v: fmtDate(lead.createdAt) }
                          ].map((x, i) => (
                            <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                                <x.i className="w-3 h-3" />
                                {x.l}
                              </div>
                              <p className="text-white text-sm truncate">{x.v}</p>
                            </div>
                          ))}
                        </div>

                        {/* Photos */}
                        {lead.photos && lead.photos.length > 0 && (
                          <div className="px-4 pb-4">
                            <div className="flex gap-2 overflow-x-auto">
                              {lead.photos.map((p, i) => (
                                <div key={i} className="w-20 h-20 bg-slate-700 rounded-lg flex-shrink-0 flex items-center justify-center relative group">
                                  <Camera className="w-6 h-6 text-slate-500" />
                                  <button 
                                    onClick={() => removeLeadPhoto(lead.id, p)} 
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => addLeadPhoto(lead.id, uuidv4())} 
                                className="w-20 h-20 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Custom Fields */}
                        {customFields.length > 0 && (
                          <div className="mx-4 mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                            <h4 className="text-purple-300 text-sm font-medium mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Custom Fields
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {customFields.map(f => (
                                <div key={f.id}>
                                  <label className="text-xs text-slate-400">{f.name}</label>
                                  <input 
                                    type={f.field_type === 'number' ? 'number' : 'text'} 
                                    value={(customFieldValues[lead.id] || {})[f.field_key] || ''} 
                                    onChange={e => { 
                                      setCustomFieldValues(p => ({ 
                                        ...p, 
                                        [lead.id]: { ...(p[lead.id] || {}), [f.field_key]: e.target.value } 
                                      })); 
                                    }} 
                                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm mt-0.5" 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700 px-4">
                          {['timeline', 'dealScore', 'aiInsights', 'statusHistory'].map(t => (
                            <button 
                              key={t} 
                              onClick={() => setActiveTab(t)} 
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === t 
                                  ? 'text-blue-400 border-blue-400' 
                                  : 'text-slate-400 border-transparent hover:text-slate-300'
                              }`}
                            >
                              {t === 'timeline' ? '📋 Timeline' : 
                               t === 'dealScore' ? '⚡ Deal Score' : 
                               t === 'aiInsights' ? '🧠 AI Insights' : 
                               '📊 Status History'}
                            </button>
                          ))}
                        </div>

                        <div className="p-4">
                          {/* TIMELINE */}
                          {activeTab === 'timeline' && (
                            <div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                <button 
                                  onClick={() => logAct(lead.id, 'call')} 
                                  className="px-3 py-1.5 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded-lg text-sm flex items-center gap-1"
                                >
                                  <PhoneCall className="w-3 h-3" /> Log Call
                                </button>
                                <button 
                                  onClick={() => logAct(lead.id, 'email')} 
                                  className="px-3 py-1.5 bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded-lg text-sm flex items-center gap-1"
                                >
                                  <Mail className="w-3 h-3" /> Log Email
                                </button>
                                <button 
                                  onClick={() => logAct(lead.id, 'meeting')} 
                                  className="px-3 py-1.5 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded-lg text-sm flex items-center gap-1"
                                >
                                  <Users className="w-3 h-3" /> Log Meeting
                                </button>
                                {!isRecording ? (
                                  <button 
                                    onClick={startRec} 
                                    className="px-3 py-1.5 bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded-lg text-sm flex items-center gap-1"
                                  >
                                    <Mic className="w-3 h-3" /> Record Call
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => stopRec(lead.id)} 
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm flex items-center gap-1 animate-pulse"
                                  >
                                    <Square className="w-3 h-3" /> Stop {fmtTime(recordingTime)}
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex gap-2 mb-4">
                                <input 
                                  value={noteText} 
                                  onChange={e => setNoteText(e.target.value)} 
                                  onKeyDown={e => e.key === 'Enter' && addNote(lead.id)} 
                                  placeholder="Add a note..." 
                                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" 
                                />
                                <button 
                                  onClick={() => addNote(lead.id)} 
                                  disabled={!noteText.trim()} 
                                  className="px-3 py-2 bg-blue-600 disabled:bg-slate-700 text-white rounded-lg"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-3">
                                {(lead.timeline || []).slice().reverse().map((entry, i) => {
                                  const cfg = TIMELINE_ICONS[entry.type] || TIMELINE_ICONS.note;
                                  const Icon = cfg.icon;
                                  return (
                                    <div key={i} className="flex gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-white text-sm">{entry.content}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {entry.user} · {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                                {(!lead.timeline || lead.timeline.length === 0) && (
                                  <p className="text-slate-500 text-sm text-center py-4">No timeline entries yet</p>
                                )}
                              </div>

                              {recs.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                  <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                                    <Volume2 className="w-4 h-4" /> Recordings
                                  </h4>
                                  {recs.map(r => (
                                    <div key={r.id} className="p-3 bg-slate-800/50 rounded-lg mb-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <button 
                                            onClick={() => setPlayingAudio(playingAudio === r.id ? null : r.id)} 
                                            className="p-1.5 bg-blue-600 rounded-full text-white"
                                          >
                                            {playingAudio === r.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                          </button>
                                          <span className="text-white text-sm">{fmtTime(r.duration)}</span>
                                          <span className="text-slate-400 text-xs">{fmtDate(r.timestamp)}</span>
                                        </div>
                                        <div>
                                          {r.transcription ? (
                                            <button 
                                              onClick={() => setShowTranscript(showTranscript === r.id ? null : r.id)} 
                                              className="px-2 py-1 bg-emerald-600/20 text-emerald-300 text-xs rounded flex items-center gap-1"
                                            >
                                              <Eye className="w-3 h-3" /> Transcript
                                            </button>
                                          ) : (
                                            <button 
                                              onClick={() => analyzeRecording(r.id)} 
                                              className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded flex items-center gap-1"
                                            >
                                              <Brain className="w-3 h-3" /> Analyze
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {showTranscript === r.id && r.transcription && (
                                        <div className="mt-3 p-3 bg-slate-900 rounded-lg space-y-2">
                                          <span className={`px-2 py-0.5 text-xs rounded ${
                                            r.transcription.sentiment === 'positive' 
                                              ? 'bg-green-500/20 text-green-300' 
                                              : r.transcription.sentiment === 'negative' 
                                              ? 'bg-red-500/20 text-red-300' 
                                              : 'bg-slate-500/20 text-slate-300'
                                          }`}>
                                            {r.transcription.sentiment}
                                          </span>
                                          <p className="text-slate-300 text-sm">{r.transcription.summary}</p>
                                          {r.transcription.keyPoints.map((p: string, i: number) => (
                                            <p key={i} className="text-xs text-slate-300">• {p}</p>
                                          ))}
                                          {r.transcription.objections.map((o: string, i: number) => (
                                            <p key={i} className="text-xs text-amber-300">⚠️ {o}</p>
                                          ))}
                                          {r.transcription.nextSteps.map((s: string, i: number) => (
                                            <p key={i} className="text-xs text-emerald-300">✅ {s}</p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* DEAL SCORE */}
                          {activeTab === 'dealScore' && (
                            <div>
                              <div className="flex items-center justify-center mb-6">
                                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${
                                  ds >= 70 ? 'border-emerald-500' : ds >= 40 ? 'border-amber-500' : 'border-red-500'
                                }`}>
                                  <span className="text-3xl font-bold text-white">{ds}</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {[
                                  { l: 'Property Value', w: '30%', v: Math.min(100, ((lead.estimatedValue || 0) / 1000000) * 100) },
                                  { l: 'Probability', w: '25%', v: lead.probability || 50 },
                                  { l: 'Engagement', w: '20%', v: ((lead.engagementLevel || 3) / 5) * 100 },
                                  { l: 'Urgency', w: '15%', v: ((lead.timelineUrgency || 3) / 5) * 100 },
                                  { l: 'Competition', w: '10%', v: (1 - (lead.competitionLevel || 3) / 5) * 100 }
                                ].map((f, i) => (
                                  <div key={i}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-300">{f.l}</span>
                                      <span className="text-slate-400">{f.w} · {Math.round(f.v)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.v}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI INSIGHTS */}
                          {activeTab === 'aiInsights' && (
                            <div>
                              <div className="flex items-center justify-center mb-6">
                                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${
                                  pri.level === 'high' ? 'border-red-500' : pri.level === 'medium' ? 'border-amber-500' : 'border-emerald-500'
                                }`}>
                                  <div className="text-center">
                                    <span className="text-2xl font-bold text-white">{pri.score}</span>
                                    <p className="text-xs text-slate-400">{pri.level}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3 mb-6">
                                {[
                                  { l: 'Deal Score', w: '40%', v: ds },
                                  { l: 'Contact Urgency', w: '25%', v: Math.max(0, 100 - days * 5) },
                                  { l: 'Source Quality', w: '15%', v: 70 },
                                  { l: 'Engagement', w: '20%', v: ((lead.engagementLevel || 3) / 5) * 100 }
                                ].map((f, i) => (
                                  <div key={i}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-300">{f.l}</span>
                                      <span className="text-slate-400">{f.w}</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full">
                                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${f.v}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  { v: lead.timeline?.length || 0, l: 'Activities' },
                                  { v: recs.length, l: 'Recordings' },
                                  { v: `${days}d`, l: 'In Status' }
                                ].map((s, i) => (
                                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-white">{s.v}</p>
                                    <p className="text-xs text-slate-400">{s.l}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* STATUS HISTORY */}
                          {activeTab === 'statusHistory' && (
                            <div>
                              <div className="mb-4">
                                <h4 className="text-slate-400 text-sm mb-2">Change Status:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {transitions.map((s: string) => (
                                    <button 
                                      key={s} 
                                      onClick={() => updateLeadStatus(lead.id, s as LeadStatus, 'You')} 
                                      className={`px-3 py-1.5 text-sm rounded-lg border ${STATUS_BADGE[s] || ''} hover:opacity-80`}
                                    >
                                      → {(STATUS_LABELS as any)[s] || s}
                                    </button>
                                  ))}
                                  {transitions.length === 0 && (
                                    <p className="text-slate-500 text-sm">No transitions available</p>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-3">
                                {(lead.statusHistory || []).slice().reverse().map((e, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                                    <div className="flex items-center gap-2 flex-1">
                                     <span className={`px-2 py-0.5 text-xs rounded-full border ${e.fromStatus ? STATUS_BADGE[e.fromStatus] : STATUS_BADGE['new']}`}>
  {e.fromStatus ? (STATUS_LABELS as any)[e.fromStatus] || e.fromStatus : 'New'}
</span>
                                      <ArrowRight className="w-4 h-4 text-slate-500" />
                                      <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_BADGE[e.toStatus] || ''}`}>
                                        {(STATUS_LABELS as any)[e.toStatus] || e.toStatus}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                                    </span>
                                  </div>
                                ))}
                                {(!lead.statusHistory || lead.statusHistory.length === 0) && (
                                  <p className="text-slate-500 text-sm text-center py-4">No status changes yet</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Name *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    required 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="closed-won">Closed Won</option>
                    <option value="closed-lost">Closed Lost</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Property Address</label>
                  <input 
                    value={formData.propertyAddress} 
                    onChange={e => setFormData({ ...formData, propertyAddress: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Property Type</label>
                  <select 
                    value={formData.propertyType} 
                    onChange={e => setFormData({ ...formData, propertyType: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="single-family">Single Family</option>
                    <option value="multi-family">Multi Family</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                    <option value="condo">Condo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Estimated Value</label>
                  <input 
                    type="number" 
                    value={formData.estimatedValue} 
                    onChange={e => setFormData({ ...formData, estimatedValue: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Offer Amount</label>
                  <input 
                    type="number" 
                    value={formData.offerAmount} 
                    onChange={e => setFormData({ ...formData, offerAmount: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Notes</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                    rows={3} 
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none" 
                  />
                </div>
              </div>
              
              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Deal Score Parameters
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Probability (0-100)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={formData.probability} 
                      onChange={e => setFormData({ ...formData, probability: e.target.value })} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Engagement (1-5)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="5" 
                      value={formData.engagementLevel} 
                      onChange={e => setFormData({ ...formData, engagementLevel: e.target.value })} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Urgency (1-5)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="5" 
                      value={formData.timelineUrgency} 
                      onChange={e => setFormData({ ...formData, timelineUrgency: e.target.value })} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Competition (1-5)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="5" 
                      value={formData.competitionLevel} 
                      onChange={e => setFormData({ ...formData, competitionLevel: e.target.value })} 
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" 
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-slate-400">Preview:</span>
                  {(() => {
                    const previewScore = calculateDealScore({
                      estimatedValue: parseFloat(formData.estimatedValue) || 0,
                      probability: parseInt(formData.probability) || 50,
                      engagementLevel: parseInt(formData.engagementLevel) || 3,
                      timelineUrgency: parseInt(formData.timelineUrgency) || 3,
                      competitionLevel: parseInt(formData.competitionLevel) || 3
                    } as any);
                    return (
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${scoreBadge(previewScore)}`}>
                        ⚡ {previewScore}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                  {editingLead ? 'Update' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}