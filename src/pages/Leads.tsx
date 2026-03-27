import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, Lead, LeadStatus, calculateDealScore, calculatePriorityScore, generateNextAction, STATUS_LABELS, STATUS_FLOW } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search, Plus, ChevronDown, ChevronRight, Phone, Mail, MapPin,
  DollarSign, Calendar, Edit2, Trash2, X, Check,
  Loader2, PhoneCall, Send,
  Users, Mic, Play, Pause, Square, Bot as Brain,
  Target, Zap, RefreshCw,
  FileText, Camera, Globe, ArrowRight, Volume2, Eye,
  Trash, FileText as ScriptIcon, Folder,
  Share2, UserMinus, ExternalLink
} from 'lucide-react';
import { googleEcosystem } from '../lib/google-ecosystem';
import { CallScriptModal } from '../components/CallScriptModal';
import { BulkEmailModal } from '../components/BulkEmailModal';
import { LeadFormModal } from '../components/LeadFormModal';

const STATUS_BADGE: Record<string, string> = {
  'new': 'bg-[var(--t-info)]/20 text-[var(--t-info)] border-[var(--t-info)]/30',
  'contacted': 'bg-[var(--t-warning)]/20 text-[var(--t-warning)] border-[var(--t-warning)]/30',
  'qualified': 'bg-[var(--t-success)]/20 text-[var(--t-success)] border-[var(--t-success)]/30',
  'negotiating': 'bg-[var(--t-warning)]/20 text-[var(--t-warning)] border-[var(--t-warning)]/30',
  'closed-won': 'bg-[var(--t-success)]/20 text-[var(--t-success)] border-[var(--t-success)]/30',
  'closed-lost': 'bg-[var(--t-error)]/20 text-[var(--t-error)] border-[var(--t-error)]/30',
  'follow-up': 'bg-[var(--t-primary)]/20 text-[var(--t-primary)] border-[var(--t-primary)]/30',
  'not-interested': 'bg-[var(--t-surface-hover)] text-[var(--t-text-muted)] border-[var(--t-border)]',
};

const TIMELINE_ICONS: Record<string, { icon: any; color: string }> = {
  'call': { icon: PhoneCall, color: 'text-[var(--t-info)] bg-[var(--t-info)]/20' },
  'email': { icon: Mail, color: 'text-[var(--t-success)] bg-[var(--t-success)]/20' },
  'note': { icon: FileText, color: 'text-[var(--t-warning)] bg-[var(--t-warning)]/20' },
  'meeting': { icon: Users, color: 'text-[var(--t-primary)] bg-[var(--t-primary)]/20' },
  'status-change': { icon: ArrowRight, color: 'text-[var(--t-warning)] bg-[var(--t-warning)]/20' },
  'task': { icon: Check, color: 'text-[var(--t-success)] bg-[var(--t-success)]/20' },
};

const SOURCE_BADGE: Record<string, string> = {
  'google-sheets': 'bg-[var(--t-success)]/20 text-[var(--t-success)]',
  'homes-com': 'bg-[var(--t-primary-dim)] text-[var(--t-primary)]',
  'pdf': 'bg-[var(--t-error)]/20 text-[var(--t-error)]',
  'smart-paste': 'bg-[var(--t-accent)]/20 text-[var(--t-accent)]',
  'manual': 'bg-[var(--t-surface-hover)] text-[var(--t-text-muted)]',
};



export default function Leads() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const { leads, updateLead, deleteLead, teamId, addTimelineEntry, updateLeadStatus, addCallRecording, analyzeRecording, callRecordings, addLeadPhoto, removeLeadPhoto, currentUser } = store;
  const saveStatus = (store as any).saveStatus || 'idle';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showModal, setShowModal] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);


  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<Record<string, any[]>>({});
  const [fetchingDrive, setFetchingDrive] = useState<Record<string, boolean>>({});

  const fetchDriveFiles = async (leadId: string, query: string) => {
    const { currentUser } = useStore.getState();
    if (!currentUser?.id) return;
    setFetchingDrive(p => ({ ...p, [leadId]: true }));
    try {
      const data = await googleEcosystem.getFiles(currentUser.id, query);
      setDriveFiles(p => ({ ...p, [leadId]: data.files || [] }));
    } catch (err) {
      console.error('Failed to fetch Drive files', err);
    } finally {
      setFetchingDrive(p => ({ ...p, [leadId]: false }));
    }
  };

  // Google Keep state
  const [syncingKeep, setSyncingKeep] = useState<Record<string, boolean>>({});

  const fetchKeepNotes = async (leadId: string) => {
    const { currentUser } = useStore.getState();
    if (!currentUser?.id) return;
    setSyncingKeep(p => ({ ...p, [leadId]: true }));
    try {
      const data = await googleEcosystem.getNotes(currentUser.id);
      const notes = data.notes || [];
      let added = 0;
      notes.forEach((note: any) => {
        const title = note.title || '';
        const bodyValue = note.body?.text?.text || '';
        const contentStr = `[Keep Note] ${title}: ${bodyValue}`.trim();
        const lead = useStore.getState().leads.find(l => l.id === leadId);
        if (lead && !lead.timeline.some(t => t.content === contentStr)) {
          useStore.getState().addTimelineEntry(leadId, {
            type: 'note',
            content: contentStr,
            user: 'Google Keep',
            timestamp: note.createTime || new Date().toISOString()
          });
          added++;
        }
      });
      if (added > 0) alert(`Synced ${added} new Keep notes!`);
    } catch (err) {
      console.error('Failed to sync Keep notes', err);
      alert('Failed to sync Google Keep');
    } finally {
      setSyncingKeep(p => ({ ...p, [leadId]: false }));
    }
  };
  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list'|'kanban'|'card'|'compact'|'map'>('list');
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [folders, setFolders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('lead_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { 'Favorites': [], 'Follow Up Soon': [] };
  });
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const saveFolders = (newFolders: Record<string, string[]>) => {
    setFolders(newFolders);
    localStorage.setItem('lead_folders', JSON.stringify(newFolders));
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.status !== targetStatus) {
      updateLeadStatus(leadId, targetStatus as any, 'Dragged & Dropped');
    }
  };
  const [showScriptLibrary, setShowScriptLibrary] = useState<{ isOpen: boolean; lead: Lead | null }>({ isOpen: false, lead: null });
  const recordingInterval = useRef<any>(null);

  const [noteText, setNoteText] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    // Custom fields are now managed via LeadFormModal
  }, [teamId]);

  useEffect(() => {
    if (id) {
      setExpandedLead(id);
      
      // Auto-open edit modal if ?edit=true is in URL
      const params = new URLSearchParams(window.location.search);
      if (params.get('edit') === 'true') {
        const lead = leads.find(l => l.id === id);
        if (lead) {
          openEdit(lead);
        }
      }
    }
  }, [id, leads]); // Added leads to dependency to ensure it opens once data is loaded

  useEffect(() => {
    if (isRecording) { 
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000); 
    } else { 
      if (recordingInterval.current) clearInterval(recordingInterval.current); 
      setRecordingTime(0); 
    }
    return () => { if (recordingInterval.current) clearInterval(recordingInterval.current); };
  }, [isRecording]);
  
  // Robust escape key listener removed as Modal component handles it

  const getDaysInStatus = (lead: Lead) => {
    const hist = lead.statusHistory;
    const last = hist?.[hist.length - 1];
    const since = last?.timestamp || lead.createdAt;
    return Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
  };

  const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v || 0);
  const fmtDate = (d: string) => { try { return format(new Date(d), 'MMM d, yyyy'); } catch { return 'N/A'; } };
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const scoreBadge = (s: number) => {
    if (s >= 80) return { className: 'border-green-500/40', style: { backgroundColor: 'rgba(0, 128, 0, 0.2)', color: '#00FF00' } };
    if (s >= 60) return { className: 'border-yellow-500/40', style: { backgroundColor: 'rgba(154, 205, 50, 0.2)', color: '#ADFF2F' } };
    if (s >= 40) return { className: 'border-orange-500/40', style: { backgroundColor: 'rgba(255, 165, 0, 0.2)', color: '#FFA500' } };
    if (s >= 20) return { className: 'border-orange-600/40', style: { backgroundColor: 'rgba(255, 69, 0, 0.2)', color: '#FF4500' } };
    return { className: 'border-red-900/40', style: { backgroundColor: 'rgba(139, 0, 0, 0.2)', color: '#FF0000' } };
  };
  const priBadge = (l: string) => l === 'high' ? { c: 'bg-[var(--t-error)]/20 text-[var(--t-error)]', l: 'High' } : l === 'medium' ? { c: 'bg-[var(--t-warning)]/20 text-[var(--t-warning)]', l: 'Medium' } : { c: 'bg-[var(--t-success)]/20 text-[var(--t-success)]', l: 'Low' };

  const filtered = leads
    .filter(l => {
      const q = searchQuery.toLowerCase();
      const ms = !q || (l.name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q) || (l.phone || '').includes(q) || (l.propertyAddress || '').toLowerCase().includes(q);
      const mst = statusFilter === 'all' || l.status === statusFilter;
      const mp = priorityFilter === 'all' || calculatePriorityScore(l).level === priorityFilter;
      const mf = !activeFolder || (folders[activeFolder] || []).includes(l.id);
      return ms && mst && mp && mf;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return calculatePriorityScore(b).score - calculatePriorityScore(a).score;
      if (sortBy === 'score') return calculateDealScore(b) - calculateDealScore(a);
      if (sortBy === 'value') return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

  // NEW: Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedLeads.size === filtered.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filtered.map(l => l.id)));
    }
  };

  const toggleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.size} leads? This action cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      // Delete each selected lead
      for (const leadId of selectedLeads) {
        await deleteLead(leadId);
      }
      setSelectedLeads(new Set());
      alert(`✅ Successfully deleted leads`);
    } catch (error) {
      alert('❌ Failed to delete some leads');
    } finally {
      setBulkDeleting(false);
    }
  };

  const openAdd = () => { 
    setEditingLeadId(null); 
    setShowModal(true); 
  };
  
  const openEdit = (l: Lead) => { 
    setEditingLeadId(l.id); 
    setShowModal(true); 
  };

  // handleSubmit functionality moved to LeadFormModal component

  const handleDel = (id: string) => { 
    if (confirm('Delete this lead?')) { 
      deleteLead(id); 
      if (expandedLead === id) setExpandedLead(null); 
      // Remove from selected if it was selected
      if (selectedLeads.has(id)) {
        const newSelected = new Set(selectedLeads);
        newSelected.delete(id);
        setSelectedLeads(newSelected);
      }
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


  


  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Leads <span className="text-sm font-normal px-2 py-1 rounded-full" style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}>{filtered.length}</span>
            {saveStatus === 'saving' && <span className="text-sm text-[var(--t-info)] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving...</span>}
            {saveStatus === 'saved' && <span className="text-sm text-[var(--t-success)]">✅ Saved</span>}
            {saveStatus === 'error' && <span className="text-sm text-[var(--t-error)]">❌ Failed</span>}
          </h1>
        </div>
        <div className="flex gap-3">

          
          {/* NEW: Bulk actions */}
          {selectedLeads.size > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowBulkEmail(true)} 
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--t-primary)' }}
              >
                <Mail className="w-4 h-4" /> Bulk Email ({selectedLeads.size})
              </button>
              <button 
                onClick={handleBulkDelete} 
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--t-error)' }}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                Delete ({selectedLeads.size})
              </button>
            </div>
          )}
          
          <div className="flex bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:text-white'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:text-white'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'card' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:text-white'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'compact' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:text-white'}`}
            >
              Compact
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-[var(--t-primary)]/20 text-[var(--t-primary)]' : 'text-[var(--t-text-muted)] hover:text-white'}`}
            >
              Map
            </button>
          </div>

          <button 
            onClick={openAdd} 
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
            style={{ background: 'var(--t-primary)' }}
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {/* SEARCH / FILTER / SORT */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Search leads..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none" 
            style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          className="px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg text-white text-sm"
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
          className="px-3 py-2 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-lg text-white text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select 
          value={sortBy} 
          onChange={e => setSortBy(e.target.value)} 
          className="px-3 py-2 border rounded-lg text-sm outline-none"
          style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
        >
          <option value="priority">🧠 AI Priority</option>
          <option value="score">⚡ Deal Score</option>
          <option value="value">💰 Value</option>
          <option value="name">Name</option>
          <option value="updatedAt">Updated</option>
        </select>
      </div>

      {/* FOLDERS TAB */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
        <button 
          onClick={() => setActiveFolder(null)} 
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!activeFolder ? 'bg-[var(--t-primary)] text-white shadow-md' : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/50 hover:text-white'}`}
        >
          All Leads
        </button>
        {Object.entries(folders).map(([fName, fIds]) => (
          <div key={fName} className="relative group flex-shrink-0">
            <button
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--t-primary)'; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--t-border)'; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--t-border)';
                const leadId = e.dataTransfer.getData('leadId');
                if (leadId && !fIds.includes(leadId)) {
                   saveFolders({ ...folders, [fName]: [...fIds, leadId] });
                }
              }}
              onClick={() => setActiveFolder(fName)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeFolder === fName ? 'bg-[var(--t-primary)] text-white shadow-md' : 'bg-[var(--t-surface)] text-[var(--t-text)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/50'}`}
            >
              <Folder className="w-3.5 h-3.5" style={{ color: activeFolder === fName ? 'white' : 'var(--t-primary)' }} />
              {fName} 
              <span className="text-xs opacity-70">({fIds.length})</span>
            </button>
            <button 
              onClick={() => {
                 if (confirm(`Delete folder "${fName}"? Leads will not be deleted.`)) {
                     const newFolders = { ...folders };
                     delete newFolders[fName];
                     saveFolders(newFolders);
                     if (activeFolder === fName) setActiveFolder(null); // Return to default map when currently sorting
                 }
              }}
              className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 rounded-full bg-[var(--t-error)] text-white items-center justify-center text-[10px]"
            >
              <X className="w-2 h-2" />
            </button>
          </div>
        ))}
        {isCreatingFolder ? (
          <div className="flex items-center gap-1 flex-shrink-0 bg-[var(--t-surface)] border border-[var(--t-primary)] rounded-full px-2" style={{ borderColor: 'var(--t-primary)' }}>
             <Folder className="w-3.5 h-3.5 text-[var(--t-primary)]" />
             <input 
               value={newFolderName}
               onChange={e => setNewFolderName(e.target.value)}
               placeholder="Folder name..."
               className="bg-transparent text-sm text-white w-24 outline-none px-1 py-1"
               autoFocus
               onKeyDown={e => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                     if (!folders[newFolderName.trim()]) {
                        saveFolders({ ...folders, [newFolderName.trim()]: [] });
                     }
                     setNewFolderName('');
                     setIsCreatingFolder(false);
                  } else if (e.key === 'Escape') {
                     setIsCreatingFolder(false);
                  }
               }}
               onBlur={() => {
                  if (newFolderName.trim() && !folders[newFolderName.trim()]) {
                     saveFolders({ ...folders, [newFolderName.trim()]: [] });
                  }
                  setNewFolderName('');
                  setIsCreatingFolder(false);
               }}
             />
          </div>
        ) : (
          <button 
            onClick={() => setIsCreatingFolder(true)} 
            className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium border border-dashed border-[var(--t-border)] text-[var(--t-text-muted)] hover:text-[var(--t-primary)] hover:border-[var(--t-primary)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Folder
          </button>
        )}
      </div>

      {/* LEADS LIST */}
      <div className="space-y-3">
        {/* Bulk selection header */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg border" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedLeads.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded focus:ring-1"
                style={{ 
                  background: 'var(--t-input-bg)', 
                  borderColor: 'var(--t-border)', 
                  color: 'var(--t-primary)',
                  '--tw-ring-color': 'var(--t-primary)'
                } as any}
              />
              <span className="text-sm" style={{ color: 'var(--t-text-muted)' }}>
                {selectedLeads.size === 0 
                  ? 'Select all' 
                  : `Selected ${selectedLeads.size} of ${filtered.length}`}
              </span>
            </div>
            {selectedLeads.size > 0 && (
              <button
                onClick={() => setSelectedLeads(new Set())}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[var(--t-surface)]/30 rounded-xl">
            <Target className="w-12 h-12 text-[var(--t-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--t-text-muted)] text-lg">No leads found</p>
            <button 
              onClick={openAdd} 
              className="mt-4 px-4 py-2 text-white rounded-lg"
              style={{ background: 'var(--t-primary)' }}
            >
              Add Your First Lead
            </button>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x">
            {Object.entries(STATUS_LABELS).map(([statusKey, statusName]) => {
              const columnLeads = filtered.filter(l => l.status === statusKey);
              return (
                <div 
                  key={statusKey}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, statusKey)}
                  className="flex-shrink-0 w-[320px] bg-[var(--t-surface-dim)] rounded-xl border border-[var(--t-border)] flex flex-col snap-start"
                >
                  <div className={`p-3 border-b border-[var(--t-border)] font-bold text-sm tracking-wide uppercase flex items-center justify-between ${STATUS_BADGE[statusKey] || 'text-white'}`}>
                    <span>{statusName as string}</span>
                    <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">{columnLeads.length}</span>
                  </div>
                  <div className="p-3 flex flex-col gap-3 min-h-[150px] overflow-y-auto max-h-[70vh]">
                    {columnLeads.map(lead => {
                      const ds = calculateDealScore(lead);
                      const pri = calculatePriorityScore(lead);
                      return (
                        <div 
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => openEdit(lead)}
                          className={`bg-[var(--t-surface)] border border-[var(--t-border)] p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-[var(--t-primary)]/50 transition-all`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white leading-tight pr-2">{lead.name || 'Unnamed'}</h4>
                            <span className="text-xs bg-[var(--t-surface-hover)] p-1 rounded hover:bg-[var(--t-error)]/20 hover:text-[var(--t-error)] transition-colors" onClick={(e) => { e.stopPropagation(); handleDel(lead.id); }}><Trash2 className="w-3 h-3 text-[var(--t-text-muted)]" /></span>
                          </div>
                          <p className="text-xs text-[var(--t-text-muted)] truncate mb-3">{lead.propertyAddress || 'No Address'}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                              {(() => { const sb = scoreBadge(ds); return <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${sb.className}`} style={sb.style}>⚡ {ds}</span>; })()}
                              <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${priBadge(pri.level).c}`}>{priBadge(pri.level).l}</span>
                            </div>
                            <span className="text-xs font-bold text-white">{fmt$(lead.estimatedValue || 0)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(lead => {
              const ds = calculateDealScore(lead);
              const days = getDaysInStatus(lead);
              return (
                <div key={lead.id} className="bg-[var(--t-surface)] border border-[var(--t-border)] p-4 rounded-xl shadow-sm hover:border-[var(--t-primary)]/50 transition-all cursor-pointer relative" onClick={() => openEdit(lead)}>
                  <div className="absolute top-2 right-2">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={(e) => { e.stopPropagation(); toggleSelectLead(lead.id); }}
                      className="w-4 h-4 rounded border focus:ring-1"
                      style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}
                    />
                  </div>
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <h4 className="font-bold text-white leading-tight">{lead.name || 'Unnamed'}</h4>
                  </div>
                  <p className="text-xs text-[var(--t-text-muted)] truncate mb-3">{lead.propertyAddress || 'No Address'}</p>
                  <div className="flex gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border ${STATUS_BADGE[String(lead.status)] || STATUS_BADGE['new']}`}>{STATUS_LABELS[lead.status] || String(lead.status)}</span>
                    {(() => { const sb = scoreBadge(ds); return <span className={`px-2 py-0.5 text-[10px] rounded-full border ${sb.className}`} style={sb.style}>⚡ {ds}</span>; })()}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--t-border)]">
                    <span className="text-xs text-[var(--t-text-muted)]">{days}d active</span>
                    <span className="text-sm font-bold text-white">{fmt$(lead.estimatedValue || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'compact' ? (
          <div className="border border-[var(--t-border)] rounded-xl overflow-hidden bg-[var(--t-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--t-surface-dim)] border-b border-[var(--t-border)] text-[var(--t-text-muted)]">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Score</th>
                    <th className="p-3 font-medium">Address</th>
                    <th className="p-3 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--t-border)]">
                  {filtered.map(lead => {
                    const ds = calculateDealScore(lead);
                    return (
                      <tr key={lead.id} className="hover:bg-[var(--t-surface-hover)] transition-colors cursor-pointer group" onClick={() => openEdit(lead)}>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => toggleSelectLead(lead.id)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--t-primary)' }} />
                        </td>
                        <td className="p-3 font-medium text-white">{lead.name || 'Unnamed'}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 text-[10px] rounded-full border ${STATUS_BADGE[String(lead.status)] || STATUS_BADGE['new']}`}>{STATUS_LABELS[lead.status] || String(lead.status)}</span></td>
                        <td className="p-3 text-[var(--t-text-muted)]">⚡ {ds}</td>
                        <td className="p-3 text-[var(--t-text-muted)] truncate max-w-[200px]">{lead.propertyAddress || 'No Address'}</td>
                        <td className="p-3 font-medium text-white text-right">{fmt$(lead.estimatedValue || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'map' ? (
          <div className="flex flex-col lg:flex-row gap-4 h-[70vh]">
            <div className="w-full lg:w-1/3 flex flex-col gap-3 overflow-y-auto pr-2">
              {filtered.map(lead => {
                return (
                  <div key={lead.id} onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)} className={`p-3 rounded-xl border cursor-pointer transition-all ${expandedLead === lead.id ? 'border-[var(--t-primary)] bg-[var(--t-surface-hover)]' : 'border-[var(--t-border)] bg-[var(--t-surface)]'}`}>
                    <h4 className="font-bold text-white text-sm">{lead.name || 'Unnamed'}</h4>
                    <p className="text-xs text-[var(--t-text-muted)] truncate my-1">{lead.propertyAddress || 'No Address'}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full border ${STATUS_BADGE[String(lead.status)] || ''}`}>{STATUS_LABELS[lead.status] || String(lead.status)}</span>
                      <span className="text-xs font-bold text-white">{fmt$(lead.estimatedValue || 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 bg-[var(--t-surface-dim)] rounded-xl border border-[var(--t-border)] overflow-hidden relative">
              {expandedLead && filtered.find(l => l.id === expandedLead)?.propertyAddress ? (
                <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${encodeURIComponent(filtered.find(l => l.id === expandedLead)!.propertyAddress!)}&t=k&z=19&ie=UTF8&iwloc=&output=embed`} />
              ) : filtered[0]?.propertyAddress ? (
                <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${encodeURIComponent(filtered[0].propertyAddress)}&t=k&z=19&ie=UTF8&iwloc=&output=embed`} />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--t-text-muted)]">Select a lead with an address to view map</div>
              )}
            </div>
          </div>
        ) : filtered.map(lead => {
          const ds = calculateDealScore(lead);
          const pri = calculatePriorityScore(lead);
          const pb = priBadge(pri.level);
          const days = getDaysInStatus(lead);
          const geo = lead.lat && lead.lat !== 30.2672;
          return (
            <div key={lead.id} className="border rounded-xl transition-colors" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.5)', borderColor: 'var(--t-border)' }}>
              <div className="flex items-center gap-3 p-4">
                {/* NEW: Selection checkbox */}
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.id)}
                    onChange={() => toggleSelectLead(lead.id)}
                    className="w-4 h-4 rounded border focus:ring-1"
                    style={{ 
                      background: 'var(--t-input-bg)',
                      borderColor: 'var(--t-border)',
                      color: 'var(--t-primary)',
                      // @ts-expect-error custom prop
                      '--tw-ring-color': 'var(--t-primary)'
                    }}
                  />
                </div>
                
                <div 
                  onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)} 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    {expandedLead === lead.id ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--t-text-muted)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--t-text-muted)' }} />}
                  </div>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg"
                    style={{ background: 'var(--t-gradient)' }}
                  >
                    {(lead.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <span className="font-medium hover:text-[var(--t-primary)] transition-colors" style={{ color: 'var(--t-text)' }}>
                          {lead.name || 'Unnamed'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_BADGE[String(lead.status)] || STATUS_BADGE['new']}`}>
                        {STATUS_LABELS[lead.status] || String(lead.status)}
                      </span>
                      {(() => {
                        const sb = scoreBadge(ds);
                        return <span className={`px-2 py-0.5 text-xs rounded-full border ${sb.className}`} style={sb.style}>⚡ {ds}</span>;
                      })()}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${pb.c}`}>🧠 {pb.l}</span>
                      {lead.importSource && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${SOURCE_BADGE[lead.importSource] || SOURCE_BADGE['manual']}`}>
                          {lead.importSource}
                        </span>
                      )}
                      {lead.photos && lead.photos.length > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--t-success-dim)] text-[var(--t-error)]">📷 {lead.photos.length}</span>
                      )}
                      <span className="text-xs text-[var(--t-text-muted)]">{days}d</span>
                      <span className={`w-2 h-2 rounded-full ${geo ? 'bg-[var(--t-success)]' : 'bg-[var(--t-warning)]'}`} title={geo ? 'Geocoded' : 'Not geocoded'} />
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t-text-muted)' }}>{lead.propertyAddress || 'No address'}</p>
                    <div className="w-24 h-1 bg-[var(--t-surface-subtle)] rounded-full mt-1">
                      <div 
                        className={`h-full rounded-full ${ds >= 70 ? 'bg-[var(--t-success-dim)]' : ds >= 40 ? 'bg-[var(--t-warning)]' : 'bg-[var(--t-error)]'}`} 
                        style={{ width: `${ds}%` }} 
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold" style={{ color: 'var(--t-text)' }}>{fmt$(lead.estimatedValue || 0)}</p>
                    <p className="text-xs" style={{ color: 'var(--t-text-muted)' }}>{lead.propertyType || 'Unknown'}</p>
                  </div>
                </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      onClick={e => { e.stopPropagation(); openEdit(lead); }} 
                      className="p-2 text-[var(--t-text-muted)] hover:bg-[var(--t-surface-subtle)] rounded-lg transition-colors"
                      style={{ 
                        // @ts-expect-error custom prop
                        '--tw-hover-text-color': 'var(--t-primary)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--t-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = ''}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={e => { e.stopPropagation(); handleDel(lead.id); }} 
                      className="p-2 transition-colors rounded-lg"
                      style={{ color: 'var(--t-text-muted)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--t-error)';
                        e.currentTarget.style.backgroundColor = 'var(--t-error-dim)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--t-text-muted)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              {/* EXPANDED DETAIL */}
              {expandedLead === lead.id && (
                <div className="border-t" style={{ borderColor: 'var(--t-border)', backgroundColor: 'rgba(var(--t-surface-rgb), 0.5)' }}>
                  {(() => {
                    const nba = generateNextAction(lead);
                    const recs = callRecordings.filter(r => r.leadId === lead.id);
                    const transitions = (STATUS_FLOW as any)[lead.status] || [];

                    return (
                      <>
                        {/* Next Best Action */}
                        {nba && (
                          <div className="m-4 p-4 border rounded-xl"
                            style={{ 
                              background: 'linear-gradient(to right, var(--t-primary-dim), var(--t-surface))', 
                              borderColor: 'var(--t-primary-dim)' 
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--t-primary-dim)' }}>
                                  <Brain className="w-5 h-5" style={{ color: 'var(--t-primary)' }} />
                                </div>
                                <div>
                                  <h4 className="font-medium" style={{ color: 'var(--t-text)' }}>{nba.title}</h4>
                                  <p className="text-[var(--t-text-muted)] text-sm mt-1">{nba.description}</p>
                                  <span className="text-xs" style={{ color: 'var(--t-primary)' }}>{nba.confidence}% confidence</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => logAct(lead.id, nba.type)} 
                                className="px-3 py-1.5 text-white text-sm rounded-lg flex items-center gap-1 hover:opacity-90 transition-all font-bold"
                                style={{ background: 'var(--t-primary)' }}
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
                            <div key={i} className="p-3 rounded-lg group relative" style={{ backgroundColor: 'var(--t-surface-dim)' }}>
                              <div className="flex items-center justify-between gap-1 text-xs mb-1" style={{ color: 'var(--t-text-muted)' }}>
                                <div className="flex items-center gap-1">
                                  <x.i className="w-3 h-3" />
                                  {x.l}
                                </div>
                                {x.l === 'Email' && lead.email && (
                                  <button 
                                    onClick={() => updateLead(lead.id, { email: '' })}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--t-error-dim)] hover:text-[var(--t-error)] rounded transition-all"
                                    title="Unassign Email"
                                  >
                                    <UserMinus size={10} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm truncate" style={{ color: 'var(--t-text)' }}>{x.v}</p>
                            </div>
                          ))}
                        </div>

                         <div className="px-4 pb-4 flex gap-2">
                            <button 
                              onClick={() => {
                                const url = `${window.location.origin}/#/share/${lead.id}`;
                                navigator.clipboard.writeText(url);
                                alert('Public lead link copied to clipboard!');
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all hover:bg-[var(--t-surface-subtle)] active:scale-95 group"
                              style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                            >
                              <Share2 size={16} className="group-hover:text-blue-500 transition-colors" /> 
                              <span className="text-sm font-bold">Copy Link</span>
                            </button>
                            <button 
                              onClick={() => navigate(`/leads/${lead.id}/share-edit`)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all hover:bg-[var(--t-surface-subtle)] active:scale-95 group text-blue-500"
                              style={{ borderColor: 'var(--t-border)' }}
                            >
                              <ExternalLink size={16} className="group-hover:scale-110 transition-transform" /> 
                              <span className="text-sm font-bold">Edit Share Page</span>
                            </button>
                            <button 
                              onClick={() => navigate(`/leads/${lead.id}/manage`)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all hover:bg-[var(--t-surface-subtle)] active:scale-95 group"
                              style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                            >
                              <Edit2 size={16} className="group-hover:text-blue-500 transition-colors" /> 
                              <span className="text-sm font-bold">Full Edit</span>
                            </button>
                         </div>

                        {/* Dual Maps: Satellite & Street View */}
                        {lead.propertyAddress && (
                          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner border border-[var(--t-border)] bg-[var(--t-surface-dim)] group relative">
                              <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 text-[10px] font-bold rounded z-10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm tracking-wider uppercase pointer-events-none">Satellite</div>
                              <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(lead.propertyAddress)}&t=k&z=20&ie=UTF8&iwloc=&output=embed`}
                              />
                            </div>
                            <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner border border-[var(--t-border)] bg-[var(--t-surface-dim)] group relative">
                              <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 text-[10px] font-bold rounded z-10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm tracking-wider uppercase pointer-events-none">Street View</div>
                              <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?q=&layer=c&cbll=${lead.lat || 30.2672},${lead.lng || -97.7431}&cbp=11,0,0,0,0&output=svembed`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Photos */}
                        {lead.photos && lead.photos.length > 0 && (
                          <div className="px-4 pb-4">
                            <div className="flex gap-2 overflow-x-auto">
                              {lead.photos.map((p, i) => (
                                <div key={i} className="w-20 h-20 rounded-lg flex-shrink-0 flex items-center justify-center relative group" style={{ backgroundColor: 'var(--t-surface-dim)' }}>
                                  <Camera className="w-6 h-6" style={{ color: 'rgba(var(--t-text-rgb), 0.3)' }} />
                                  <button 
                                    onClick={() => removeLeadPhoto(lead.id, p)} 
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--t-error)] rounded-full text-white text-xs hidden group-hover:flex items-center justify-center"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => addLeadPhoto(lead.id, uuidv4())} 
                                className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all"
                                style={{ borderColor: 'var(--t-border)', color: 'rgba(var(--t-text-rgb), 0.3)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--t-text)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(var(--t-text-rgb), 0.3)'}
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* AI Call Script Button */}
                        <div className="px-4 pb-4 border-b border-[var(--t-border)]">
                          <button
                            onClick={() => setShowScriptLibrary({ isOpen: true, lead })}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all hover:scale-[1.01] active:scale-95"
                            style={{ background: 'var(--t-surface-dim)', border: '1px solid var(--t-primary-dim)', color: 'var(--t-primary)' }}
                          >
                            <ScriptIcon className="w-4 h-4" />
                            Open AI Call Script Library
                          </button>
                        </div>



                        {/* Tabs */}
                        <div className="flex border-b px-4" style={{ borderColor: 'var(--t-border)' }}>
                          {['timeline', 'dealScore', 'aiInsights', 'statusHistory', 'googleDrive'].map(t => (
                            <button 
                              key={t} 
                              onClick={() => setActiveTab(t)} 
                              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === t 
                                  ? 'border-b-2' 
                                  : 'border-transparent hover:opacity-80'
                              }`}
                              style={{ 
                                color: activeTab === t ? 'var(--t-primary)' : 'var(--t-text-muted)',
                                borderColor: activeTab === t ? 'var(--t-primary)' : 'transparent'
                              }}
                            >
                              {t === 'timeline' ? '📋 Timeline' : 
                               t === 'dealScore' ? '⚡ Deal Score' : 
                               t === 'aiInsights' ? '🧠 AI Insights' : 
                               t === 'googleDrive' ? '📁 Google Drive' :
                               '📊 Status History'}
                            </button>
                          ))}
                        </div>

                        <div className="p-4">
                          {activeTab === 'timeline' && (
                            <div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                <button 
                                  onClick={() => logAct(lead.id, 'call')} 
                                  className="px-3 py-1.5 border hover:opacity-80 rounded-lg text-sm flex items-center gap-1 transition-all"
                                  style={{ background: 'var(--t-primary-dim)', color: 'var(--t-primary)', borderColor: 'var(--t-primary-dim)' }}
                                >
                                  <PhoneCall className="w-3 h-3" /> Log Call
                                </button>
                                <button 
                                  onClick={() => logAct(lead.id, 'email')} 
                                  className="px-3 py-1.5 bg-[var(--t-success)]/20 text-[var(--t-success)] hover:bg-[var(--t-success)]/30 rounded-lg text-sm flex items-center gap-1"
                                >
                                  <Mail className="w-3 h-3" /> Log Email
                                </button>
                                <button 
                                  onClick={() => logAct(lead.id, 'meeting')} 
                                  className="px-3 py-1.5 bg-[var(--t-accent)]/20 text-[var(--t-accent)] hover:bg-[var(--t-accent)]/30 rounded-lg text-sm flex items-center gap-1"
                                >
                                  <Users className="w-3 h-3" /> Log Meeting
                                </button>
                                {!isRecording ? (
                                  <button 
                                    onClick={startRec} 
                                    className="px-3 py-1.5 bg-[var(--t-error)]/20 text-[var(--t-error)] hover:bg-[var(--t-error)]/30 rounded-lg text-sm flex items-center gap-1"
                                  >
                                    <Mic className="w-3 h-3" /> Record Call
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => stopRec(lead.id)} 
                                    className="px-3 py-1.5 bg-[var(--t-error)] text-white rounded-lg text-sm flex items-center gap-1 animate-pulse"
                                  >
                                    <Square className="w-3 h-3" /> Stop {fmtTime(recordingTime)}
                                  </button>
                                )}
                                <button
                                  onClick={() => fetchKeepNotes(lead.id)}
                                  disabled={syncingKeep[lead.id]}
                                  className="px-3 py-1.5 border hover:opacity-80 rounded-lg text-sm flex items-center gap-1 transition-all ml-auto"
                                  style={{ background: 'var(--t-surface-dim)', color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}
                                >
                                  <RefreshCw className={`w-3 h-3 ${syncingKeep[lead.id] ? 'animate-spin' : ''}`} /> Sync Keep
                                </button>
                              </div>
                              
                              <div className="flex gap-2 mb-4">
                                <input 
                                  value={noteText} 
                                  onChange={e => setNoteText(e.target.value)} 
                                  onKeyDown={e => e.key === 'Enter' && addNote(lead.id)} 
                                  placeholder="Add a note..." 
                                  className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none" 
                                  style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                                />
                                <button 
                                  onClick={() => addNote(lead.id)} 
                                  disabled={!noteText.trim()} 
                                  className="px-3 py-2 disabled:bg-[var(--t-surface-subtle)] text-white rounded-lg transition-colors"
                                  style={{ background: !noteText.trim() ? '' : 'var(--t-primary)' }}
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-3">
                                {(lead.timeline || []).slice().reverse().map((entry) => {
                                  const cfg = TIMELINE_ICONS[entry.type] || TIMELINE_ICONS.note;
                                  const Icon = cfg.icon;
                                  return (
                                    <div key={entry.timestamp + entry.content} className="flex gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-white text-sm">{entry.content}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                                          {entry.user} · {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                                {(!lead.timeline || lead.timeline.length === 0) && (
                                  <p className="text-[var(--t-text-muted)] text-sm text-center py-4">No timeline entries yet</p>
                                )}
                              </div>

                              {recs.length > 0 && (
                                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--t-border)' }}>
                                  <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                                    <Volume2 className="w-4 h-4" /> Recordings
                                  </h4>
                                  {recs.map(r => (
                                    <div key={r.id} className="p-3 rounded-lg mb-2" style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.5)' }}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <button 
                                            onClick={() => setPlayingAudio(playingAudio === r.id ? null : r.id)} 
                                            className="p-1.5 rounded-full text-white"
                                            style={{ background: 'var(--t-primary)' }}
                                          >
                                            {playingAudio === r.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                          </button>
                                          <span className="text-white text-sm">{fmtTime(r.duration)}</span>
                                          <span className="text-[var(--t-text-muted)] text-xs">{fmtDate(r.timestamp)}</span>
                                        </div>
                                        <div>
                                          {r.transcription ? (
                                            <button 
                                              onClick={() => setShowTranscript(showTranscript === r.id ? null : r.id)} 
                                              className="px-2 py-1 bg-[var(--t-success)]/20 text-[var(--t-success)] text-xs rounded flex items-center gap-1"
                                            >
                                              <Eye className="w-3 h-3" /> Transcript
                                            </button>
                                          ) : (
                                            <button 
                                              onClick={() => analyzeRecording(r.id)} 
                                              className="px-2 py-1 bg-[var(--t-accent)]/20 text-[var(--t-accent)] text-xs rounded flex items-center gap-1"
                                            >
                                              <Brain className="w-3 h-3" /> Analyze
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {showTranscript === r.id && r.transcription && (
                                        <div className="mt-3 p-3 rounded-lg space-y-2" style={{ backgroundColor: 'var(--t-surface)' }}>
                                          <span className={`px-2 py-0.5 text-xs rounded ${
                                            r.transcription.sentiment === 'positive' 
                                              ? 'bg-[var(--t-success)]/20 text-[var(--t-success)]' 
                                              : r.transcription.sentiment === 'negative' 
                                              ? 'bg-[var(--t-error-dim)] text-[var(--t-error)]' 
                                              : 'bg-[var(--t-warning)]/20 text-[var(--t-text-muted)]'
                                          }`}>
                                            {r.transcription.sentiment}
                                          </span>
                                          <p className="text-[var(--t-text-muted)] text-sm">{r.transcription.summary}</p>
                                          {r.transcription.keyPoints.map((p: string, i: number) => (
                                            <p key={i} className="text-xs text-[var(--t-text-muted)]">• {p}</p>
                                          ))}
                                          {r.transcription.objections.map((o: string, i: number) => (
                                            <p key={i} className="text-xs text-[var(--t-warning)]">⚠️ {o}</p>
                                          ))}
                                          {r.transcription.nextSteps.map((s: string, i: number) => (
                                            <p key={i} className="text-xs text-[var(--t-success)]">✅ {s}</p>
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
                                  ds >= 70 ? 'border-[var(--t-success)]' : ds >= 40 ? 'border-[var(--t-warning)]' : 'border-[var(--t-error)]'
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
                                      <span className="text-[var(--t-text-muted)]">{f.l}</span>
                                      <span className="text-[var(--t-text-muted)]">{f.w} · {Math.round(f.v)}%</span>
                                    </div>
                                    <div className="h-2 bg-[var(--t-surface-subtle)] rounded-full">
                                      <div className="h-full rounded-full" style={{ width: `${f.v}%`, background: 'var(--t-info)' }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                              {activeTab === 'aiInsights' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                  {/* Strategy Section placeholder */}
                                  <div className="p-5 rounded-2xl border border-[var(--t-primary-dim)] bg-[var(--t-surface-dim)] shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-[var(--t-primary-dim)]/50">
                                          <Brain className="w-5 h-5 text-[var(--t-primary)]" />
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-white text-lg">AI Analyst Insight</h4>
                                          <p className="text-xs text-[var(--t-text-muted)]">Strategic tactical advantage</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-center py-10 border-2 border-dashed border-[var(--t-border)] rounded-2xl bg-[var(--t-surface)]/30">
                                      <Brain className="w-10 h-10 text-[var(--t-text-muted)] mx-auto mb-3 opacity-20" />
                                      <p className="text-[var(--t-text-muted)] text-sm max-w-sm mx-auto">AI Insights are currently being updated. Check back soon for deeper lead motivation analysis.</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                          {/* STATUS HISTORY */}
                          {activeTab === 'statusHistory' && (
                            <div>
                              <div className="mb-4">
                                <h4 className="text-[var(--t-text-muted)] text-sm mb-2">Change Status:</h4>
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
                                    <p className="text-[var(--t-text-muted)] text-sm">No transitions available</p>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-3">
                                {(lead.statusHistory || []).slice().reverse().map((e, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--t-surface-dim)' }}>
                                    <div className="flex items-center gap-2 flex-1">
                                     <span className={`px-2 py-0.5 text-xs rounded-full border ${e.fromStatus ? STATUS_BADGE[e.fromStatus] : STATUS_BADGE['new']}`}>
  {e.fromStatus ? (STATUS_LABELS as any)[e.fromStatus] || e.fromStatus : 'New'}
</span>
                                      <ArrowRight className="w-4 h-4 text-[var(--t-text-muted)]" />
                                      <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_BADGE[e.toStatus] || ''}`}>
                                        {(STATUS_LABELS as any)[e.toStatus] || e.toStatus}
                                      </span>
                                    </div>
                                    <span className="text-xs text-[var(--t-text-muted)]">
                                      {formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}
                                    </span>
                                  </div>
                                ))}
                                {(!lead.statusHistory || lead.statusHistory.length === 0) && (
                                  <p className="text-[var(--t-text-muted)] text-sm text-center py-4">No status changes yet</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* GOOGLE DRIVE FILES */}
                          {activeTab === 'googleDrive' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-[var(--t-surface-subtle)] p-4 rounded-xl border border-[var(--t-border)]">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-white mb-1">Google Drive Files</h4>
                                  <p className="text-xs text-[var(--t-text-muted)]">Find attachments and documents relative to <strong>{lead.propertyAddress || lead.name}</strong></p>
                                </div>
                                <button
                                  onClick={() => fetchDriveFiles(lead.id, lead.propertyAddress || lead.name)}
                                  disabled={fetchingDrive[lead.id]}
                                  className="px-4 py-2 bg-[var(--t-primary)] text-white text-sm font-bold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                  {fetchingDrive[lead.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4" />}
                                  {fetchingDrive[lead.id] ? 'Searching...' : 'Search Drive'}
                                </button>
                              </div>

                              {(driveFiles[lead.id] || []).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {(driveFiles[lead.id] || []).map((file: any) => (
                                    <a 
                                      key={file.id} 
                                      href={`https://drive.google.com/file/d/${file.id}/view`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="flex items-start gap-3 p-3 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] hover:border-[var(--t-primary-dim)] transition-colors group"
                                    >
                                      <div className="p-2 bg-[var(--t-surface-hover)] rounded-lg text-[var(--t-primary)] flex-shrink-0 group-hover:bg-[var(--t-primary-dim)] transition-colors">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-medium text-white truncate w-full pr-2 block">{file.name}</h5>
                                        <p className="text-[10px] text-[var(--t-text-muted)] mt-1 px-1.5 py-0.5 rounded bg-[var(--t-surface-hover)] inline-block uppercase font-medium">{file.mimeType.split('/').pop()?.substring(0,20) || 'FILE'}</p>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-10 border-2 border-dashed border-[var(--t-border)] rounded-2xl bg-[var(--t-surface)]/30">
                                  <Folder className="w-10 h-10 text-[var(--t-text-muted)] mx-auto mb-3 opacity-20" />
                                  <p className="text-[var(--t-text-muted)] text-sm">Hit "Search" to trigger a matching contextual query securely via Google REST</p>
                                </div>
                              )}
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

      {/* New Centralized Lead Form Modal */}
      <LeadFormModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        leadId={editingLeadId} 
      />

      {/* Call Script Modal */}


      {/* CALL SCRIPT LIBRARY MODAL */}
      <CallScriptModal
        isOpen={showScriptLibrary.isOpen}
        onClose={() => setShowScriptLibrary({ isOpen: false, lead: null })}
        lead={showScriptLibrary.lead}
        agentName={currentUser?.name || 'Agent'}
      />
      {/* Bulk Email Modal */}
      {showBulkEmail && (
        <BulkEmailModal
          isOpen={showBulkEmail}
          onClose={() => setShowBulkEmail(false)}
          selectedLeads={leads.filter(l => selectedLeads.has(l.id))}
        />
      )}
    </div>
  );
}
