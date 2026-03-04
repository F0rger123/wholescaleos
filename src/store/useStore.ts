\import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'closed-won' | 'closed-lost';
export type LeadSource = 'website' | 'referral' | 'cold-call' | 'social-media' | 'mailer' | 'other';
export type PropertyType = 'single-family' | 'multi-family' | 'commercial' | 'land' | 'condo';
export type TimelineType = 'call' | 'email' | 'note' | 'status-change' | 'meeting' | 'task';
export type AIPriorityLevel = 'high' | 'medium' | 'low';
export type ImportSource = 'google-sheets' | 'homes-com' | 'url' | 'pdf' | 'csv' | 'smart-paste';
export type PresenceStatus = 'online' | 'offline' | 'busy' | 'dnd';

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  content: string;
  timestamp: string;
  user: string;
  metadata?: Record<string, any>;
}

export interface StatusHistoryEntry {
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  timestamp: string;
  changedBy: string;
}

export interface Lead {
  id: string;
  teamId: string;
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: PropertyType;
  estimatedValue: number;
  offerAmount: number;
  status: LeadStatus;
  source: LeadSource;
  importSource?: string;
  probability: number;
  engagementLevel: number;
  timelineUrgency: number;
  competitionLevel: number;
  dealScore: number;
  notes: string;
  photos: string[];
  lat: number;
  lng: number;
  assignedTo: string;
  timeline: TimelineEntry[];
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CoverageArea {
  id: string;
  teamId: string;
  name: string;
  coordinates: number[][][]; // GeoJSON Polygon format
  color: string;
  opacity: number;
  leadCount?: number;
  notes?: string;
  createdAt: string;
}

export interface Buyer {
  id: string;
  teamId: string;
  name: string;
  email: string;
  phone: string;
  lat: number;
  lng: number;
  budgetMin: number;
  budgetMax: number;
  active: boolean;
  dealScore?: number;
  notes?: string;
  criteria?: Record<string, any>;
  createdAt: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  sample: string;
}

export interface ImportTemplate {
  id: string;
  name: string;
  source: ImportSource;
  mappings: ColumnMapping[];
  createdAt: string;
}

export interface ImportHistoryEntry {
  id: string;
  source: ImportSource;
  sourceName: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  templateUsed?: string;
  errors: string[];
}

export interface DuplicateSettings {
  enabled: boolean;
  matchFields: Array<'name' | 'email' | 'phone' | 'address'>;
  action: 'skip' | 'merge' | 'create-new';
}

export interface ScrapedPropertyData {
  address: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  owner?: string;
  listingDate?: string;
  images?: string[];
  source: string;
  sourceUrl?: string;
  confidence: {
    address: number;
    price: number;
    owner: number;
  };
  raw: Record<string, any>;
}

export interface CallRecording {
  id: string;
  leadId: string;
  duration: number;
  timestamp: string;
  audioUrl?: string;
  analyzed: boolean;
  transcription?: {
    text: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    objections: string[];
    nextSteps: string[];
    keyPoints: string[];
    summary: string;
  };
}

export interface ParsedPasteResult {
  rowCount: number;
  columns: {
    name: string;
    detectedType: string;
    confidence: number;
    samples: string[];
  }[];
  rows: string[][];
  delimiter: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<LeadStatus, string> = {
  'new': 'New',
  'contacted': 'Contacted',
  'qualified': 'Qualified',
  'negotiating': 'Negotiating',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
};

export const STATUS_FLOW: Record<LeadStatus, LeadStatus[]> = {
  'new': ['contacted', 'qualified', 'negotiating', 'closed-lost'],
  'contacted': ['qualified', 'negotiating', 'closed-lost'],
  'qualified': ['negotiating', 'closed-won', 'closed-lost'],
  'negotiating': ['closed-won', 'closed-lost'],
  'closed-won': [],
  'closed-lost': ['new', 'contacted', 'qualified', 'negotiating'],
};

export const AI_PRIORITY_COLORS: Record<AIPriorityLevel, { bg: string; text: string; border: string; dot: string; label: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400', label: 'High' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400', label: 'Medium' },
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Low' },
};

export const DETECTED_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  email: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Email' },
  phone: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Phone' },
  address: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Address' },
  name: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Name' },
  price: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Price' },
  date: { bg: 'bg-pink-500/15', text: 'text-pink-400', label: 'Date' },
  zip: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'Zip' },
  text: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Text' },
};

export const DETECTED_TYPE_TO_TARGET: Record<string, string> = {
  email: 'email',
  phone: 'phone',
  address: 'propertyAddress',
  name: 'name',
  price: 'estimatedValue',
  date: 'notes',
  zip: 'zip',
  text: 'notes',
};

export const PRESENCE_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-slate-500',
  busy: 'bg-yellow-500',
  dnd: 'bg-red-500',
};

export const PRESENCE_LABELS: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  busy: 'Busy',
  dnd: 'Do Not Disturb',
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export const TASK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  todo: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  done: { bg: 'bg-green-500/20', text: 'text-green-400' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

// ─── Helper Functions ──────────────────────────────────────────────────────

export function calculateDealScore(lead: Partial<Lead>): number {
  const valueCap = 500000;
  const valueScore = Math.min((lead.estimatedValue || 0) / valueCap, 1) * 100;
  const probScore = lead.probability || 50;
  const engageScore = ((lead.engagementLevel || 3) - 1) / 4 * 100;
  const urgencyScore = ((lead.timelineUrgency || 3) - 1) / 4 * 100;
  const compScore = ((5 - (lead.competitionLevel || 3)) / 4) * 100;

  const score = Math.round(
    valueScore * 0.3 +
    probScore * 0.25 +
    engageScore * 0.2 +
    urgencyScore * 0.15 +
    compScore * 0.1
  );

  return Math.max(0, Math.min(100, score));
}

export function getScoreColor(score: number): { bg: string; text: string; ring: string; bar: string; label: string } {
  if (score >= 70) {
    return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      ring: 'ring-emerald-500/30',
      bar: 'bg-emerald-500',
      label: 'Hot'
    };
  }
  if (score >= 40) {
    return {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      ring: 'ring-amber-500/30',
      bar: 'bg-amber-500',
      label: 'Warm'
    };
  }
  return {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    ring: 'ring-red-500/30',
    bar: 'bg-red-500',
    label: 'Cold'
  };
}

export function calculatePriorityScore(lead: Lead): { score: number; level: AIPriorityLevel } {
  const dealScore = calculateDealScore(lead);
  const lastContact = lead.timeline
    .filter(t => ['call', 'email', 'meeting'].includes(t.type))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const daysSinceContact = lastContact
    ? Math.floor((Date.now() - new Date(lastContact.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  
  const contactUrgency = Math.min(daysSinceContact * 10, 100);
  const sourceQuality: Record<LeadSource, number> = {
    'referral': 90,
    'cold-call': 70,
    'website': 65,
    'social-media': 55,
    'mailer': 50,
    'other': 40,
  };
  const engagementScore = (lead.engagementLevel / 5) * 100;

  const score = Math.round(
    dealScore * 0.4 +
    contactUrgency * 0.25 +
    sourceQuality[lead.source] * 0.15 +
    engagementScore * 0.2
  );

  if (score >= 70) return { score, level: 'high' };
  if (score >= 40) return { score, level: 'medium' };
  return { score, level: 'low' };
}

export function generateNextAction(lead: Lead): {
  type: string;
  title: string;
  description: string;
  priority: AIPriorityLevel;
  confidence: number;
  actionLabel: string;
} {
  const daysInStatus = Math.floor((Date.now() - new Date(lead.statusHistory[lead.statusHistory.length - 1]?.timestamp || lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const lastContact = lead.timeline
    .filter(t => ['call', 'email', 'meeting'].includes(t.type))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const daysSinceContact = lastContact
    ? Math.floor((Date.now() - new Date(lastContact.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const score = calculateDealScore(lead);
  const priority = calculatePriorityScore(lead).level;

  if (lead.status === 'closed-won') {
    return {
      type: 'follow-up',
      title: 'Request a referral',
      description: `Ask ${lead.name} if they know anyone else looking to sell.`,
      priority: 'medium',
      confidence: 85,
      actionLabel: 'Send Message',
    };
  }

  if (lead.status === 'closed-lost') {
    return {
      type: 'follow-up',
      title: 'Re-engage in 30 days',
      description: `Circle back in a month to see if their situation has changed.`,
      priority: 'low',
      confidence: 60,
      actionLabel: 'Add Reminder',
    };
  }

  if (daysSinceContact >= 7) {
    return {
      type: 'call',
      title: 'Urgent follow-up needed',
      description: `It's been ${daysSinceContact} days since last contact. Reconnect now.`,
      priority: 'high',
      confidence: 92,
      actionLabel: 'Call Now',
    };
  }

  if (daysSinceContact >= 4) {
    return {
      type: 'call',
      title: 'Follow-up call',
      description: `Check in with ${lead.name} about their current interest level.`,
      priority: 'medium',
      confidence: 80,
      actionLabel: 'Call Now',
    };
  }

  if (lead.status === 'new') {
    return {
      type: 'call',
      title: 'Initial contact',
      description: `Make first contact with ${lead.name} to introduce yourself.`,
      priority: 'high',
      confidence: 95,
      actionLabel: 'Call Now',
    };
  }

  if (lead.status === 'negotiating' && score >= 70) {
    return {
      type: 'offer',
      title: 'Send final offer',
      description: `Present your best offer to close the deal.`,
      priority: 'high',
      confidence: 88,
      actionLabel: 'Prepare Offer',
    };
  }

  if (lead.status === 'qualified') {
    return {
      type: 'meeting',
      title: 'Schedule walkthrough',
      description: `Arrange a property viewing to move forward.`,
      priority: 'medium',
      confidence: 82,
      actionLabel: 'Schedule',
    };
  }

  return {
    type: 'email',
    title: 'Status update',
    description: `Send a brief update to keep the conversation warm.`,
    priority: 'medium',
    confidence: 70,
    actionLabel: 'Send Email',
  };
}

export function getLeadsInArea(leads: Lead[], area: CoverageArea): Lead[] {
  if (!area.coordinates || area.coordinates.length === 0) return [];
  
  // Simple point-in-polygon check
  return leads.filter(lead => {
    if (!lead.lat || !lead.lng) return false;
    
    // Ray casting algorithm for point in polygon
    const point = [lead.lng, lead.lat]; // GeoJSON uses [lng, lat]
    const polygon = area.coordinates[0]; // Assume first ring
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > point[1]) !== (yj > point[1])) &&
        (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  });
}

// ─── Smart Paste Functions ─────────────────────────────────────────────────

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  
  const delimiters = [
    { char: '\t', score: (firstLine.match(/\t/g) || []).length },
    { char: ',', score: (firstLine.match(/,/g) || []).length },
    { char: '|', score: (firstLine.match(/\|/g) || []).length },
    { char: ';', score: (firstLine.match(/;/g) || []).length },
  ];
  
  const spaceScore = (() => {
    const parts = firstLine.split(/\s+/);
    return parts.length >= 3 ? parts.length * 5 : 0;
  })();
  
  const best = delimiters.reduce((best, curr) => curr.score > best.score ? curr : best);
  
  if (best.score > 0) return best.char;
  if (spaceScore > 0) return ' ';
  return 'none';
}

function parseLine(line: string, delimiter: string): string[] {
  if (delimiter === 'none') return [line];
  
  if (delimiter === ' ') {
    return line.split(/\s+/).filter(cell => cell.length > 0);
  }
  
  const regex = new RegExp(`(?:"([^"]*)"|'([^']*)'|([^${delimiter}]+))`, 'g');
  const matches = line.match(regex);
  
  if (matches) {
    return matches.map(m => m.replace(/^["']|["']$/g, '').trim());
  }
  
  return line.split(delimiter).map(cell => cell.trim());
}

function detectColumnType(samples: string[], header: string): { type: string; score: number } {
  const types = [
    { 
      type: 'email', 
      patterns: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/], 
      weight: 100 
    },
    { 
      type: 'phone', 
      patterns: [/^[\d\s\-\(\)\+\.]{7,20}$/, /^\d{3}[-.]?\d{3}[-.]?\d{4}$/], 
      weight: 90 
    },
    { 
      type: 'address', 
      patterns: [/^\d{1,5}\s/, /\s(st|ave|street|drive|road|ln|lane|blvd|way)\b/i], 
      weight: 80 
    },
    { 
      type: 'name', 
      patterns: [/^[a-zA-Z\s\.]{2,50}$/, /^[A-Z][a-z]+ [A-Z][a-z]+$/], 
      weight: 70 
    },
    { 
      type: 'price', 
      patterns: [/^\$?[\d,]+(\.\d{2})?$/, /^\d{4,}$/], 
      weight: 85 
    },
    { 
      type: 'date', 
      patterns: [/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/, /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i], 
      weight: 75 
    },
    { 
      type: 'zip', 
      patterns: [/^\d{5}$/, /^\d{5}-\d{4}$/], 
      weight: 95 
    },
  ];

  if (samples.length === 0) {
    return { type: 'text', score: 50 };
  }

  const headerLower = header.toLowerCase();
  
  for (const t of types) {
    if (t.type === 'email' && headerLower.includes('email')) return { type: 'email', score: 100 };
    if (t.type === 'phone' && (headerLower.includes('phone') || headerLower.includes('cell') || headerLower.includes('mobile'))) return { type: 'phone', score: 100 };
    if (t.type === 'name' && (headerLower.includes('name') || headerLower.includes('owner') || headerLower.includes('contact'))) return { type: 'name', score: 100 };
    if (t.type === 'address' && (headerLower.includes('address') || headerLower.includes('street') || headerLower.includes('location'))) return { type: 'address', score: 100 };
    if (t.type === 'price' && (headerLower.includes('price') || headerLower.includes('value') || headerLower.includes('amount') || headerLower.includes('$'))) return { type: 'price', score: 100 };
  }

  for (const t of types) {
    if (!t.patterns.length) continue;
    
    let matches = 0;
    for (const sample of samples) {
      for (const pattern of t.patterns) {
        if (pattern.test(sample)) {
          matches++;
          break;
        }
      }
    }
    
    if (matches > 0) {
      const score = Math.round((matches / samples.length) * t.weight);
      return { type: t.type, score };
    }
  }

  return { type: 'text', score: 50 };
}

function calculateConfidence(type: { type: string; score: number }, header: string): number {
  let confidence = type.score;
  
  const headerLower = header.toLowerCase();
  if (type.type === 'email' && headerLower.includes('email')) confidence += 20;
  if (type.type === 'phone' && (headerLower.includes('phone') || headerLower.includes('cell'))) confidence += 20;
  if (type.type === 'name' && (headerLower.includes('name') || headerLower.includes('owner'))) confidence += 20;
  if (type.type === 'address' && (headerLower.includes('address') || headerLower.includes('street'))) confidence += 20;
  if (type.type === 'price' && (headerLower.includes('price') || headerLower.includes('value'))) confidence += 20;
  
  return Math.min(confidence, 100);
}

function detectColumns(rows: string[][]): { name: string; detectedType: string; confidence: number; samples: string[] }[] {
  if (rows.length === 0) return [];
  
  const possibleHeaders = rows[0];
  const dataRows = rows.slice(1);
  
  return possibleHeaders.map((header, colIndex) => {
    const samples = dataRows
      .map(row => row[colIndex] || '')
      .filter(val => val.length > 0)
      .slice(0, 5);
    
    const detectedType = detectColumnType(samples, header);
    const confidence = calculateConfidence(detectedType, header);
    
    return {
      name: header || `Column ${colIndex + 1}`,
      detectedType: detectedType.type,
      confidence,
      samples
    };
  });
}

export function parsePastedData(text: string): ParsedPasteResult {
  const delimiter = detectDelimiter(text);
  
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return {
      rowCount: 0,
      columns: [],
      rows: [],
      delimiter: 'none'
    };
  }

  const parsedRows = lines.map(line => parseLine(line, delimiter));
  const columns = detectColumns(parsedRows);
  
  return {
    rowCount: lines.length,
    columns,
    rows: parsedRows,
    delimiter
  };
}

// ─── Store Types ───────────────────────────────────────────────────────────

interface AppState {
  // Auth state
  user: any | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Team state
  teamId: string | null;
  team: any[];
  teamConfig: {
    name: string;
    inviteCode: string;
    settings: any;
  };
  
  // Data
  leads: Lead[];
  tasks: any[];
  buyers: Buyer[];
  coverageAreas: CoverageArea[];
  callRecordings: CallRecording[];
  
  // Import data
  importTemplates: ImportTemplate[];
  importHistory: ImportHistoryEntry[];
  duplicateSettings: DuplicateSettings;
  
  // UI state
  currentTheme: string;
  sidebarOpen: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveMessage: string | null;
  
  // Auth actions
  setUser: (user: any) => void;
  setSession: (session: any) => void;
  setTeamId: (teamId: string) => void;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, name?: string) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword?: (email: string) => Promise<any>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string; phone?: string }) => Promise<any>;
  incrementLoginStreak: () => Promise<void>;
  
  // Lead actions
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addTimelineEntry: (leadId: string, entry: Partial<TimelineEntry>) => void;
  updateLeadStatus: (leadId: string, newStatus: LeadStatus, changedBy: string) => void;
  
  // Lead photos
  addLeadPhoto: (leadId: string, photoId: string) => void;
  removeLeadPhoto: (leadId: string, photoId: string) => void;
  reorderLeadPhotos: (leadId: string, photos: string[]) => void;
  
  // Call recordings
  addCallRecording: (leadId: string, duration: number) => void;
  analyzeRecording: (recordingId: string) => void;
  
  // Team actions
  updateMemberRole: (memberId: string, role: string) => void;
  removeTeamMember: (memberId: string) => void;
  regenerateInviteCode: () => void;
  updateTeamConfig: (config: Partial<{ name: string; settings: any }>) => void;
  
  // Import actions
  addImportTemplate: (template: Omit<ImportTemplate, 'id' | 'createdAt'>) => void;
  deleteImportTemplate: (id: string) => void;
  addImportHistory: (entry: Omit<ImportHistoryEntry, 'id' | 'timestamp'>) => void;
  updateDuplicateSettings: (settings: Partial<DuplicateSettings>) => void;
  importLeadsFromData: (leads: any[]) => number;
  
  // Mock data generators
  getMockScrapedProperty: (url: string) => ScrapedPropertyData;
  getMockPdfExtraction: () => ScrapedPropertyData[];
  
  // Save status
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error', message?: string) => void;
}

// ─── Initial State ─────────────────────────────────────────────────────────

const initialState = {
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  teamId: null,
  team: [],
  teamConfig: {
    name: 'My Team',
    inviteCode: 'WS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    settings: {},
  },
  leads: [],
  tasks: [],
  buyers: [],
  coverageAreas: [],
  callRecordings: [],
  importTemplates: [],
  importHistory: [],
  duplicateSettings: {
    enabled: true,
    matchFields: ['email', 'phone'],
    action: 'skip',
  },
  currentTheme: 'dark',
  sidebarOpen: true,
  saveStatus: 'idle',
  saveMessage: null,
};

// ─── Store ─────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Auth actions
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setTeamId: (teamId) => set({ teamId }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          set({ 
            user: data.user, 
            session: data.session, 
            isAuthenticated: true,
            isLoading: false 
          });
          
          await get().incrementLoginStreak();
          
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name || '' }
            }
          });
          if (error) throw error;
          set({ isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          set({ 
            user: null, 
            session: null, 
            teamId: null, 
            isAuthenticated: false,
            isLoading: false,
            leads: [],
            tasks: [],
            buyers: [],
            coverageAreas: [],
            callRecordings: []
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resetPassword: async (email) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) throw error;
          set({ isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) throw new Error('No user logged in');

        set({ isLoading: true });
        try {
          // Update auth metadata
          const { data, error } = await supabase.auth.updateUser({
            data: updates
          });
          
          if (error) throw error;
          
          // Also update profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: updates.full_name,
              avatar_url: updates.avatar_url,
              phone: updates.phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (profileError) console.error('Error updating profile table:', profileError);
          
          set({ 
            user: data.user, 
            isLoading: false,
            saveStatus: 'saved',
            saveMessage: 'Profile updated successfully!'
          });
          
          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
          return data;
        } catch (error) {
          set({ 
            isLoading: false,
            saveStatus: 'error',
            saveMessage: `Failed to update profile: ${error.message}`
          });
          throw error;
        }
      },

      incrementLoginStreak: async () => {
        const { user } = get();
        if (!user) return;

        try {
          // Get today's date (YYYY-MM-DD)
          const today = new Date().toISOString().split('T')[0];
          
          // Get current streak data from profiles table
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('streak, last_login, longest_streak')
            .eq('id', user.id)
            .single();
            
          if (fetchError) {
            console.error('Error fetching streak data:', fetchError);
            return;
          }
          
          let newStreak = 1;
          let newLongestStreak = profile?.longest_streak || 1;
          
          // Check if last login was yesterday
          if (profile?.last_login) {
            const lastLogin = new Date(profile.last_login);
            const todayDate = new Date(today);
            
            // Calculate difference in days
            const diffTime = todayDate.getTime() - lastLogin.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              // Consecutive day
              newStreak = (profile?.streak || 0) + 1;
              newLongestStreak = Math.max(newStreak, profile?.longest_streak || 0);
            } else if (diffDays === 0) {
              // Already logged in today, keep same streak
              newStreak = profile?.streak || 1;
              newLongestStreak = profile?.longest_streak || 1;
            } else {
              // Streak broken
              newStreak = 1;
              newLongestStreak = profile?.longest_streak || 1;
            }
          }
          
          // Update profile with new streak data
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              streak: newStreak,
              last_login: today,
              longest_streak: newLongestStreak
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('Error updating streak:', updateError);
          }
        } catch (error) {
          console.error('Error in incrementLoginStreak:', error);
        }
      },

      // Lead actions
      setLeads: (leads) => set({ leads }),

      addLead: async (leadData) => {
        const { teamId } = get();
        if (!teamId) return null;

        set({ saveStatus: 'saving', saveMessage: 'Saving lead...' });

        try {
          const newLead: Lead = {
            id: uuidv4(),
            teamId,
            name: leadData.name || '',
            email: leadData.email || '',
            phone: leadData.phone || '',
            propertyAddress: leadData.propertyAddress || '',
            propertyType: leadData.propertyType || 'single-family',
            estimatedValue: leadData.estimatedValue || 0,
            offerAmount: leadData.offerAmount || 0,
            status: leadData.status || 'new',
            source: leadData.source || 'other',
            importSource: leadData.importSource,
            probability: leadData.probability || 50,
            engagementLevel: leadData.engagementLevel || 3,
            timelineUrgency: leadData.timelineUrgency || 3,
            competitionLevel: leadData.competitionLevel || 3,
            dealScore: calculateDealScore(leadData),
            notes: leadData.notes || '',
            photos: [],
            lat: leadData.lat || 30.2672,
            lng: leadData.lng || -97.7431,
            assignedTo: leadData.assignedTo || '',
            timeline: [],
            statusHistory: [{
              fromStatus: null,
              toStatus: leadData.status || 'new',
              timestamp: new Date().toISOString(),
              changedBy: 'You',
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Save to Supabase
          if (supabase) {
            const { error } = await supabase
              .from('leads')
              .insert([{
                ...newLead,
                team_id: teamId,
              }]);
            
            if (error) {
              console.error('Supabase error:', error);
              set({ saveStatus: 'error', saveMessage: `Failed to save: ${error.message}` });
              return null;
            }
          }

          set(state => ({ 
            leads: [...state.leads, newLead],
            saveStatus: 'saved',
            saveMessage: 'Lead saved successfully!'
          }));

          setTimeout(() => set({ saveStatus: 'idle' }), 3000);
          
          return newLead;
        } catch (error: any) {
          console.error('Failed to save lead:', error);
          set({ saveStatus: 'error', saveMessage: `Failed to save: ${error.message}` });
          return null;
        }
      },

      updateLead: (id, updates) => {
        set(state => ({
          leads: state.leads.map(lead => 
            lead.id === id ? { ...lead, ...updates, updatedAt: new Date().toISOString() } : lead
          )
        }));
      },

      deleteLead: (id) => {
        set(state => ({
          leads: state.leads.filter(lead => lead.id !== id)
        }));
      },

      addTimelineEntry: (leadId, entry) => {
        const newEntry: TimelineEntry = {
          id: uuidv4(),
          type: entry.type as TimelineType,
          content: entry.content || '',
          timestamp: entry.timestamp || new Date().toISOString(),
          user: entry.user || 'You',
          metadata: entry.metadata || {},
        };

        set(state => ({
          leads: state.leads.map(lead =>
            lead.id === leadId
              ? { ...lead, timeline: [...lead.timeline, newEntry] }
              : lead
          )
        }));
      },

      updateLeadStatus: (leadId, newStatus, changedBy) => {
        set(state => ({
          leads: state.leads.map(lead => {
            if (lead.id !== leadId) return lead;
            
            const historyEntry: StatusHistoryEntry = {
              fromStatus: lead.status,
              toStatus: newStatus,
              timestamp: new Date().toISOString(),
              changedBy,
            };

            return {
              ...lead,
              status: newStatus,
              statusHistory: [...lead.statusHistory, historyEntry],
              updatedAt: new Date().toISOString(),
            };
          })
        }));
      },

      // Lead photos
      addLeadPhoto: (leadId, photoId) => {
        set(state => ({
          leads: state.leads.map(lead =>
            lead.id === leadId
              ? { ...lead, photos: [...lead.photos, photoId] }
              : lead
          )
        }));
      },

      removeLeadPhoto: (leadId, photoId) => {
        set(state => ({
          leads: state.leads.map(lead =>
            lead.id === leadId
              ? { ...lead, photos: lead.photos.filter(p => p !== photoId) }
              : lead
          )
        }));
      },

      reorderLeadPhotos: (leadId, photos) => {
        set(state => ({
          leads: state.leads.map(lead =>
            lead.id === leadId ? { ...lead, photos } : lead
          )
        }));
      },

      // Call recordings
      addCallRecording: (leadId, duration) => {
        const newRecording: CallRecording = {
          id: uuidv4(),
          leadId,
          duration,
          timestamp: new Date().toISOString(),
          analyzed: false,
        };

        set(state => ({
          callRecordings: [...state.callRecordings, newRecording]
        }));

        // Add timeline entry
        get().addTimelineEntry(leadId, {
          type: 'call',
          content: `Recorded a ${duration}s call with ${get().leads.find(l => l.id === leadId)?.name || 'lead'}.`,
          timestamp: new Date().toISOString(),
          user: 'You',
          metadata: { recordingId: newRecording.id, hasTranscript: 'false' },
        });
      },

      analyzeRecording: (recordingId) => {
        const recordings = [...get().callRecordings];
        const index = recordings.findIndex(r => r.id === recordingId);
        
        if (index === -1) return;

        // Mock AI analysis
        const recording = recordings[index];
        const sentiments: Array<'positive' | 'neutral' | 'negative'> = ['positive', 'neutral', 'negative'];
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        
        recordings[index] = {
          ...recording,
          analyzed: true,
          transcription: {
            text: "This is a mock transcription of the call. The lead expressed interest in selling their property and mentioned they are motivated to close quickly. They have some concerns about the offer price but are open to negotiation.",
            sentiment,
            objections: ["Price is lower than expected", "Need more time to decide"],
            nextSteps: ["Send updated offer", "Schedule follow-up call next week"],
            keyPoints: ["Motivated seller", "Flexible on timeline", "Has another offer"],
            summary: "Lead is motivated but wants a better price. Good potential for negotiation."
          }
        };

        set({ callRecordings: recordings });

        // Update timeline entry
        const leadId = recording.leadId;
        const lead = get().leads.find(l => l.id === leadId);
        if (lead) {
          const timelineIndex = lead.timeline.findIndex(t => t.metadata?.recordingId === recordingId);
          if (timelineIndex !== -1) {
            const updatedLead = { ...lead };
            updatedLead.timeline[timelineIndex] = {
              ...updatedLead.timeline[timelineIndex],
              metadata: { ...updatedLead.timeline[timelineIndex].metadata, hasTranscript: 'true' }
            };
            
            set(state => ({
              leads: state.leads.map(l => l.id === leadId ? updatedLead : l)
            }));
          }
        }
      },

      // Team actions
      updateMemberRole: (memberId, role) => {
        set(state => ({
          team: state.team.map(member =>
            member.id === memberId ? { ...member, teamRole: role } : member
          )
        }));
      },

      removeTeamMember: (memberId) => {
        set(state => ({
          team: state.team.filter(member => member.id !== memberId)
        }));
      },

      regenerateInviteCode: () => {
        const newCode = 'WS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        set(state => ({
          teamConfig: { ...state.teamConfig, inviteCode: newCode }
        }));
      },

      updateTeamConfig: (config) => {
        set(state => ({
          teamConfig: { ...state.teamConfig, ...config }
        }));
      },

      // Import actions
      addImportTemplate: (template) => {
        const newTemplate: ImportTemplate = {
          id: uuidv4(),
          ...template,
          createdAt: new Date().toISOString(),
        };
        set(state => ({
          importTemplates: [...state.importTemplates, newTemplate]
        }));
      },

      deleteImportTemplate: (id) => {
        set(state => ({
          importTemplates: state.importTemplates.filter(t => t.id !== id)
        }));
      },

      addImportHistory: (entry) => {
        const newEntry: ImportHistoryEntry = {
          id: uuidv4(),
          ...entry,
          timestamp: new Date().toISOString(),
        };
        set(state => ({
          importHistory: [newEntry, ...state.importHistory].slice(0, 50) // Keep last 50
        }));
      },

      updateDuplicateSettings: (settings) => {
        set(state => ({
          duplicateSettings: { ...state.duplicateSettings, ...settings }
        }));
      },

      importLeadsFromData: (leadsToImport) => {
        const { addLead } = get();
        let imported = 0;
        
        for (const lead of leadsToImport) {
          addLead(lead);
          imported++;
        }
        
        return imported;
      },

      // Mock data generators
      getMockScrapedProperty: (url) => {
        const properties = [
          {
            address: '123 Main St, Austin, TX 78701',
            price: 450000,
            beds: 3,
            baths: 2,
            sqft: 2100,
            propertyType: 'Single Family',
            owner: 'John Smith',
            listingDate: '2024-01-15',
            source: 'Homes.com',
            sourceUrl: url,
            confidence: { address: 98, price: 95, owner: 85 },
            raw: { mls: '123456', taxId: 'TX-98765' }
          },
          {
            address: '456 Oak Ave, Dallas, TX 75201',
            price: 620000,
            beds: 4,
            baths: 3,
            sqft: 2800,
            propertyType: 'Single Family',
            owner: 'Jane Doe',
            listingDate: '2024-02-01',
            source: 'Homes.com',
            sourceUrl: url,
            confidence: { address: 98, price: 95, owner: 90 },
            raw: { mls: '789012', taxId: 'TX-54321' }
          },
        ];
        return properties[Math.floor(Math.random() * properties.length)];
      },

      getMockPdfExtraction: () => {
        return [
          {
            address: '789 Pine Rd, Houston, TX 77002',
            price: 385000,
            beds: 3,
            baths: 2,
            sqft: 1950,
            propertyType: 'Single Family',
            owner: 'Robert Johnson',
            source: 'PDF Import',
            confidence: { address: 92, price: 88, owner: 75 },
            raw: { documentType: 'Tax Record', parcelId: 'HOU-12345' }
          },
          {
            address: '321 Cedar Ln, San Antonio, TX 78201',
            price: 295000,
            beds: 2,
            baths: 1.5,
            sqft: 1450,
            propertyType: 'Single Family',
            owner: 'Maria Garcia',
            source: 'PDF Import',
            confidence: { address: 90, price: 85, owner: 80 },
            raw: { documentType: 'Title Report', parcelId: 'SA-67890' }
          },
        ];
      },

      // Save status
      setSaveStatus: (status, message = '') => set({ saveStatus: status, saveMessage: message }),
    }),
    {
      name: 'wholescale-storage',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        sidebarOpen: state.sidebarOpen,
        teamId: state.teamId,
        teamConfig: state.teamConfig,
        importTemplates: state.importTemplates,
        importHistory: state.importHistory,
        duplicateSettings: state.duplicateSettings,
      }),
    }
  )
);