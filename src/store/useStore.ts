import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { leadsService, tasksService, teamService, chatService, notificationsService, mapService } from '../lib/supabase-service';
import { themes } from '../styles/themes';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'closed-won' | 'closed-lost';
export type LeadSource = 'website' | 'referral' | 'cold-call' | 'social-media' | 'mailer' | 'other';
export type PropertyType = 'single-family' | 'multi-family' | 'commercial' | 'land' | 'condo';
export type TimelineType = 'call' | 'email' | 'note' | 'status-change' | 'meeting' | 'task';
export type PresenceStatus = 'online' | 'offline' | 'busy' | 'dnd';
export type TeamRole = 'admin' | 'member' | 'viewer';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';

// ─── Chat Types ──────────────────────────────────────────────────────────────

export type ChannelType = 'direct' | 'group';
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';

export interface ChatReaction {
  emoji: string;
  users: string[];
}

export interface ChatAttachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  size: number;
  duration?: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: MessageType;
  mentions: string[];
  reactions: ChatReaction[];
  replyToId: string | null;
  attachments: ChatAttachment[];
  edited: boolean;
  readBy: string[];
  deleted: boolean;
}

// ─── AI Bot Types ──────────────────────────────────────────────────────────

export interface AIUsage {
  used: number;
  limit: number;
}

export interface AIThread {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  pinned?: boolean;
}

export interface AIBotMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  intent?: string;
  data?: any;
  systemLog?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: ChannelType;
  members: string[];
  description: string;
  avatar: string;
  createdAt: string;
  createdBy: string;
  lastMessageAt: string;
  pinnedMessageIds: string[];
}

// ─── Existing Types ──────────────────────────────────────────────────────────

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  content: string;
  timestamp: string;
  user: string;
  metadata?: Record<string, string>;
}

export interface StatusHistoryEntry {
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  timestamp: string;
  changedBy: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: LeadSource;
  propertyAddress: string;
  propertyType: PropertyType;
  estimatedValue: number;
  offerAmount: number;
  lat: number;
  lng: number;
  notes: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  probability: number;
  engagementLevel: number;
  timelineUrgency: number;
  competitionLevel: number;
  importSource?: string;
  photos?: string[];
  timeline: TimelineEntry[];
  statusHistory: StatusHistoryEntry[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  dealsCount: number;
  revenue: number;
  presenceStatus: PresenceStatus;
  lastSeen: string;
  customStatus: string;
  teamRole: TeamRole;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  teamRole: TeamRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  leadId?: string;
}

export interface SMSMessage {
  id: string;
  user_id: string;
  lead_id?: string;
  phone_number: string;
  content: string;
  direction: 'inbound' | 'outbound';
  gmail_message_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface SavedContact {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

export interface TeamConfig {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  createdBy: string;
}

export interface CoverageArea {
  id: string;
  name: string;
  coordinates: [number, number][];
  color: string;
  opacity: number;
  leadCount: number;
  notes: string;
  createdAt: string;
}

export interface BuyerCriteria {
  propertyTypes: PropertyType[];
  bedroomsMin: number;
  bathroomsMin: number;
  sqftMin: number;
  sqftMax: number;
  locationPreferences: string[];
}

export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  lat: number;
  lng: number;
  criteria: BuyerCriteria;
  budgetMin: number;
  budgetMax: number;
  active: boolean;
  dealScore: number;
  notes: string;
  createdAt: string;
}

export interface MapFilters {
  showLeads: boolean;
  showBuyers: boolean;
  showCoverageAreas: boolean;
  showDrivingRoute: boolean;
  leadStatusFilters: Record<LeadStatus, boolean>;
  clusterMarkers: boolean;
}

export interface BuyerCriteriaTemplate {
  id: string;
  name: string;
  criteria: BuyerCriteria;
  budgetMin: number;
  budgetMax: number;
}

export interface MapSettings {
  defaultLat: number;
  defaultLng: number;
  defaultZoom: number;
  clusterRadius: number;
}

// ─── Import Types ────────────────────────────────────────────────────────────

export type ImportSource = 'google-sheets' | 'homes-com' | 'url' | 'pdf' | 'csv' | 'smart-paste';
export type ImportStatus = 'pending' | 'mapping' | 'reviewing' | 'importing' | 'completed' | 'failed';

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

export interface ScrapedPropertyData {
  address?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  listingDate?: string;
  owner?: string;
  images?: string[];
  source: string;
  sourceUrl?: string;
  confidence: Record<string, number>;
  raw: Record<string, string>;
}

export interface ImportHistoryEntry {
  id: string;
  source: ImportSource;
  sourceName: string;
  timestamp: string;
  status: ImportStatus;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  templateUsed?: string;
  errors: string[];
}

export interface DuplicateDetectionSettings {
  enabled: boolean;
  matchFields: ('name' | 'email' | 'phone' | 'address')[];
  action: 'skip' | 'merge' | 'create-new';
}

// Mock data generators for imports
const MOCK_SHEET_DATA: Record<string, string>[][] = [
  [
    { 'Owner Name': 'Thomas Baker', 'Property Address': '2450 Riverside Dr, Austin, TX', 'Phone': '(512) 555-0101', 'Email': 'tbaker@email.com', 'Est. Value': '$340,000', 'Property Type': 'Single Family', 'Status': 'Interested', 'Notes': 'Called from mailer' },
    { 'Owner Name': 'Angela Brooks', 'Property Address': '890 Summit Blvd, Dallas, TX', 'Phone': '(214) 555-0202', 'Email': 'abrooks@email.com', 'Est. Value': '$525,000', 'Property Type': 'Multi-Family', 'Status': 'New', 'Notes': 'Duplex near downtown' },
    { 'Owner Name': 'Carlos Mendez', 'Property Address': '1100 Pecan St, San Antonio, TX', 'Phone': '(210) 555-0303', 'Email': 'cmendez@email.com', 'Est. Value': '$185,000', 'Property Type': 'Condo', 'Status': 'Follow Up', 'Notes': 'Inherited property' },
    { 'Owner Name': 'Rachel Kim', 'Property Address': '3200 Bay Area Blvd, Houston, TX', 'Phone': '(713) 555-0404', 'Email': 'rkim@email.com', 'Est. Value': '$410,000', 'Property Type': 'Single Family', 'Status': 'Interested', 'Notes': 'Relocating, wants fast close' },
    { 'Owner Name': 'Derek Washington', 'Property Address': '750 Legacy Dr, Plano, TX', 'Phone': '(972) 555-0505', 'Email': 'dwash@email.com', 'Est. Value': '$680,000', 'Property Type': 'Single Family', 'Status': 'Hot Lead', 'Notes': 'Pre-foreclosure' },
    { 'Owner Name': 'Michelle Torres', 'Property Address': '4100 Creek Bend, Fort Worth, TX', 'Phone': '(817) 555-0606', 'Email': 'mtorres@email.com', 'Est. Value': '$295,000', 'Property Type': 'Single Family', 'Status': 'New', 'Notes': 'Tax delinquent' },
    { 'Owner Name': 'James O\'Brien', 'Property Address': '55 Congress Pl, Austin, TX', 'Phone': '(512) 555-0707', 'Email': 'jobrien@email.com', 'Est. Value': '$890,000', 'Property Type': 'Commercial', 'Status': 'Qualified', 'Notes': 'Retail space with tenants' },
    { 'Owner Name': 'Sandra Lee', 'Property Address': '1800 Magnolia Ave, Houston, TX', 'Phone': '(713) 555-0808', 'Email': 'slee@email.com', 'Est. Value': '$225,000', 'Property Type': 'Single Family', 'Status': 'Follow Up', 'Notes': 'Vacant, needs rehab' },
    { 'Owner Name': 'Kevin Patterson', 'Property Address': '620 Elm Creek Rd, Round Rock, TX', 'Phone': '(512) 555-0909', 'Email': 'kpatt@email.com', 'Est. Value': '$150,000', 'Property Type': 'Land', 'Status': 'New', 'Notes': '1.5 acres, zoned residential' },
    { 'Owner Name': 'Nicole Foster', 'Property Address': '3700 Turtle Creek Blvd, Dallas, TX', 'Phone': '(214) 555-1010', 'Email': 'nfoster@email.com', 'Est. Value': '$1,150,000', 'Property Type': 'Condo', 'Status': 'Hot Lead', 'Notes': 'Luxury condo, divorce sale' },
  ],
];

const MOCK_SCRAPED_PROPERTIES: ScrapedPropertyData[] = [
  {
    address: '4521 Lakewood Blvd, Dallas, TX 75214', price: 425000, beds: 4, baths: 3, sqft: 2400,
    propertyType: 'Single Family', listingDate: '2024-12-10', owner: 'Patricia Hernandez',
    images: ['house1_front.jpg', 'house1_kitchen.jpg', 'house1_backyard.jpg'],
    source: 'Homes.com', sourceUrl: 'https://www.homes.com/listing/4521-lakewood',
    confidence: { address: 98, price: 95, beds: 99, baths: 99, sqft: 90, owner: 72, propertyType: 88 },
    raw: { 'Page Title': '4521 Lakewood Blvd - $425,000 | Homes.com', 'MLS': '#TX-85201', 'DOM': '15', 'Agent': 'John Smith Realty' },
  },
  {
    address: '1200 Oak Lawn Ave, Dallas, TX 75219', price: 315000, beds: 2, baths: 2, sqft: 1450,
    propertyType: 'Condo', listingDate: '2024-12-05', owner: 'Michael Chen',
    images: ['condo1_exterior.jpg', 'condo1_living.jpg'],
    source: 'Homes.com', sourceUrl: 'https://www.homes.com/listing/1200-oak-lawn',
    confidence: { address: 97, price: 96, beds: 99, baths: 99, sqft: 85, owner: 65, propertyType: 92 },
    raw: { 'Page Title': '1200 Oak Lawn Ave Unit 5B - $315,000', 'MLS': '#TX-85302', 'DOM': '22', 'HOA': '$350/mo' },
  },
  {
    address: '8800 Greenville Ave, Dallas, TX 75231', price: 550000, beds: 3, baths: 2, sqft: 2100,
    propertyType: 'Single Family', listingDate: '2024-12-12', owner: undefined,
    images: ['house2_front.jpg'],
    source: 'Homes.com', sourceUrl: 'https://www.homes.com/listing/8800-greenville',
    confidence: { address: 99, price: 94, beds: 99, baths: 99, sqft: 88, owner: 0, propertyType: 95 },
    raw: { 'Page Title': '8800 Greenville Ave - $550,000', 'MLS': '#TX-85403', 'DOM': '8' },
  },
];

const MOCK_PDF_EXTRACTIONS: ScrapedPropertyData[] = [
  {
    address: '915 Barton Springs Rd, Austin, TX 78704', price: 780000, beds: 5, baths: 4, sqft: 3200,
    propertyType: 'Single Family', owner: 'David & Jennifer Lawson',
    source: 'PDF Upload', confidence: { address: 92, price: 88, beds: 95, baths: 95, sqft: 80, owner: 85, propertyType: 75 },
    raw: { 'Document Type': 'Property Tax Assessment', 'Year': '2024', 'Pages': '3', 'Tax Status': 'Delinquent' },
  },
  {
    address: '2300 S Lamar Blvd, Austin, TX 78704', price: 420000, beds: 3, baths: 2, sqft: 1800,
    propertyType: 'Condo', owner: 'Robert Chang',
    source: 'PDF Upload', confidence: { address: 95, price: 82, beds: 90, baths: 90, sqft: 78, owner: 88, propertyType: 80 },
    raw: { 'Document Type': 'Title Report', 'Year': '2024', 'Pages': '5', 'Lien Status': 'Clear' },
  },
];

// ─── Notification Types ──────────────────────────────────────────────────────

export type NotificationType =
  | 'lead-assigned' | 'status-change' | 'deal-closed'
  | 'task-assigned' | 'task-due' | 'mention'
  | 'call-recorded' | 'team-join' | 'message' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface NotificationSettings {
  newLead: boolean;
  taskDue: boolean;
  smsReceived: boolean;
  appointmentReminder: boolean;
  systemUpdates: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  newLead: true,
  taskDue: true,
  smsReceived: true,
  appointmentReminder: true,
  systemUpdates: true,
  emailNotifications: true,
  smsNotifications: true,
};

// ─── Calculator Types ────────────────────────────────────────────────────────

export type CalculatorType = 'wholesale' | 'fixnflip' | 'rental' | 'brrrr';

export interface CalculatorScenario {
  id: string;
  name: string;
  type: CalculatorType;
  date: string;
  lastModified: string;
  leadId?: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  notes?: string;
}

// ─── AI Types ────────────────────────────────────────────────────────────────

export interface AIUsage {
  used: number;
  limit: number;
  lastReset: string;
}

export type AIPriorityLevel = 'high' | 'medium' | 'low';
export type AIActionType = 'call' | 'email' | 'meeting' | 'follow-up' | 'offer' | 'status-change';

export interface CallTranscription {
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  objections: string[];
  nextSteps: string[];
  keyPoints: string[];
  summary: string;
}

export interface CallRecording {
  id: string;
  leadId: string;
  timestamp: string;
  duration: number;
  audioUrl: string;
  transcription: CallTranscription | null;
  analyzed: boolean;
}

export interface AISuggestion {
  id: string;
  leadId: string;
  type: AIActionType;
  title: string;
  description: string;
  priority: AIPriorityLevel;
  confidence: number;
  createdAt: string;
  actionLabel: string;
}

export const AI_PRIORITY_COLORS: Record<AIPriorityLevel, { bg: string; text: string; border: string; dot: string; label: string }> = {
  high: { bg: 'color-mix(in srgb, var(--t-error) 15%, transparent)', text: 'var(--t-error)', border: 'color-mix(in srgb, var(--t-error) 30%, transparent)', dot: 'var(--t-error)', label: 'High Priority' },
  medium: { bg: 'color-mix(in srgb, var(--t-warning) 15%, transparent)', text: 'var(--t-warning)', border: 'color-mix(in srgb, var(--t-warning) 30%, transparent)', dot: 'var(--t-warning)', label: 'Medium Priority' },
  low: { bg: 'color-mix(in srgb, var(--t-success) 15%, transparent)', text: 'var(--t-success)', border: 'color-mix(in srgb, var(--t-success) 30%, transparent)', dot: 'var(--t-success)', label: 'Low Priority' },
};

// ─── Utilities ───────────────────────────────────────────────────────────────

export function calculateDealScore(lead: Lead): number {
  // Value component: Logarithmic scaling for property value (more sensitive to lower values, capped at $1.5M)
  const valueCap = 1500000;
  const valueScore = Math.min(Math.log10(Math.max(1, lead.estimatedValue)) / Math.log10(valueCap), 1) * 100;
  
  // Probability component: Direct from lead data
  const probScore = lead.probability || 40;
  
  // Engagement component: (Level 1-5)
  const engageScore = ((lead.engagementLevel || 3) - 1) * 25;
  
  // Urgency component: (Level 1-5)
  const urgencyScore = ((lead.timelineUrgency || 3) - 1) * 25;
  
  // Competition component: (Level 1-5, inverted as lower competition is better)
  const competitionScore = (5 - (lead.competitionLevel || 3)) * 25;

  // Weighted Average
  const raw = (
    valueScore * 0.35 + 
    probScore * 0.25 + 
    engageScore * 0.15 + 
    urgencyScore * 0.15 + 
    competitionScore * 0.10
  );

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

export function getScoreColor(score: number) {
  if (score >= 80) return { 
    bg: 'rgba(22, 163, 74, 0.15)', 
    text: '#16A34A', 
    ring: 'box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.4)', 
    bar: '#16A34A', 
    label: 'Elite' 
  };
  if (score >= 60) return { 
    bg: 'rgba(132, 204, 22, 0.15)', 
    text: '#84CC16', 
    ring: 'box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.4)', 
    bar: '#84CC16', 
    label: 'High' 
  };
  if (score >= 40) return { 
    bg: 'rgba(245, 158, 11, 0.15)', 
    text: '#F59E0B', 
    ring: 'box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.4)', 
    bar: '#F59E0B', 
    label: 'Warn' 
  };
  if (score >= 20) return { 
    bg: 'rgba(234, 88, 12, 0.15)', 
    text: '#EA580C', 
    ring: 'box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.4)', 
    bar: '#EA580C', 
    label: 'Cold' 
  };
  return { 
    bg: 'rgba(153, 27, 27, 0.15)', 
    text: '#991B1B', 
    ring: 'box-shadow: 0 0 0 3px rgba(153, 27, 27, 0.4)', 
    bar: '#991B1B', 
    label: 'Dead' 
  };
}

export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getLeadsInArea(leads: Lead[], area: CoverageArea): Lead[] {
  return leads.filter(l => isPointInPolygon([l.lat, l.lng], area.coordinates));
}

// ─── AI Utility Functions ────────────────────────────────────────────────────

export function calculatePriorityScore(lead: Lead): { score: number; level: AIPriorityLevel } {
  if (lead.status === 'closed-won' || lead.status === 'closed-lost') {
    return { score: 0, level: 'low' };
  }

  const dealScore = calculateDealScore(lead);

  const lastContact = lead.timeline
    .filter(t => ['call', 'email', 'meeting'].includes(t.type))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const daysSinceContact = lastContact
    ? Math.floor((Date.now() - new Date(lastContact.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const contactUrgency = Math.min(daysSinceContact * 10, 100);

  const sourceQuality: Record<LeadSource, number> = {
    'referral': 90, 'cold-call': 70, 'website': 65,
    'social-media': 55, 'mailer': 50, 'other': 40,
  };
  const sourceScore = sourceQuality[lead.source];
  const engagementScore = (lead.engagementLevel / 5) * 100;

  const score = Math.round(
    dealScore * 0.40 +
    contactUrgency * 0.25 +
    sourceScore * 0.15 +
    engagementScore * 0.20
  );

  const clamped = Math.min(100, Math.max(0, score));
  const level: AIPriorityLevel = clamped >= 70 ? 'high' : clamped >= 40 ? 'medium' : 'low';
  return { score: clamped, level };
}

export function generateNextAction(lead: Lead): AISuggestion {
  const lastContact = lead.timeline
    .filter(t => ['call', 'email', 'meeting'].includes(t.type))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  const daysSinceContact = lastContact
    ? Math.floor((Date.now() - new Date(lastContact.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const dealScore = calculateDealScore(lead);
  const now = new Date().toISOString();
  const base = { id: uuidv4(), leadId: lead.id, createdAt: now };

  if (lead.status === 'closed-won') {
    return { ...base, type: 'follow-up', title: 'Send thank-you & request referral', description: 'Deal is closed! Send a thank-you note and ask for referrals to build your pipeline.', priority: 'low', confidence: 85, actionLabel: 'Send Email' };
  }
  if (lead.status === 'closed-lost') {
    return { ...base, type: 'email', title: 'Re-engage in 30 days', description: 'Set a reminder to reach out with new market data. Situations change — this lead could reactivate.', priority: 'low', confidence: 60, actionLabel: 'Schedule Reminder' };
  }
  if (daysSinceContact >= 7) {
    return { ...base, type: 'call', title: `Urgent: Call now — ${daysSinceContact} days since last contact`, description: `This lead hasn't been contacted in ${daysSinceContact} days. Risk of going cold. Make a personal call today to re-engage.`, priority: 'high', confidence: 92, actionLabel: 'Log Call' };
  }
  if (daysSinceContact >= 4) {
    return { ...base, type: 'call', title: `Follow up — ${daysSinceContact} days since last contact`, description: 'It\'s been a few days. A quick check-in call will keep momentum going and show you\'re attentive.', priority: 'medium', confidence: 80, actionLabel: 'Log Call' };
  }
  if (lead.status === 'new') {
    return { ...base, type: 'call', title: 'Make initial contact call', description: 'New lead needs first contact ASAP. Introduce yourself, understand their motivation, and set expectations.', priority: 'high', confidence: 95, actionLabel: 'Log Call' };
  }
  if (lead.status === 'negotiating' && dealScore >= 70) {
    return { ...base, type: 'offer', title: 'Send final offer — high close probability', description: `Deal score is ${dealScore}/100. This lead is hot. Present your best offer to close before competition moves in.`, priority: 'high', confidence: 88, actionLabel: 'Send Offer' };
  }
  if (lead.status === 'negotiating') {
    return { ...base, type: 'email', title: 'Send comparable market data', description: 'Strengthen your negotiating position by sharing recent comparable sales that justify your offer price.', priority: 'medium', confidence: 75, actionLabel: 'Send Email' };
  }
  if (lead.status === 'qualified') {
    return { ...base, type: 'meeting', title: 'Schedule property walkthrough', description: 'This lead is qualified. Next step is an on-site visit to assess condition and build rapport with the seller.', priority: 'medium', confidence: 82, actionLabel: 'Schedule Meeting' };
  }
  if (lead.status === 'contacted' && lead.engagementLevel >= 4) {
    return { ...base, type: 'meeting', title: 'High engagement — schedule in-person meeting', description: 'This lead is highly engaged. Move to an in-person meeting to build trust and advance the deal.', priority: 'high', confidence: 85, actionLabel: 'Schedule Meeting' };
  }
  return { ...base, type: 'follow-up', title: 'Send status update email', description: 'Keep the lead warm with a friendly check-in email. Share any new market insights relevant to their property.', priority: 'medium', confidence: 70, actionLabel: 'Send Email' };
}

const MOCK_TRANSCRIPTIONS: CallTranscription[] = [
  {
    text: "Called the property owner to discuss our offer. They expressed interest in selling quickly due to a job relocation. Main concern was whether our cash offer would be competitive with traditional buyers. I walked them through the benefits — no appraisal contingency, flexible closing date, and as-is purchase. They mentioned the roof needs replacement ($12k estimate) which they don't want to deal with. I said we'd factor that in. They want to talk to their accountant about tax implications before committing. Overall very positive conversation — they're motivated and realistic about pricing.",
    sentiment: 'positive',
    objections: ['Concerned about offer competitiveness vs. traditional buyers', 'Wants to consult accountant on tax implications', 'Roof replacement cost factored into expectations'],
    nextSteps: ['Send comparable sales data via email', 'Follow up after accountant meeting (3-5 days)', 'Prepare revised offer factoring roof repair'],
    keyPoints: ['Motivated by job relocation', 'Cash offer benefits resonated', 'Roof needs $12k replacement', 'Wants accountant sign-off', 'Flexible on closing date'],
    summary: 'Very positive call with motivated seller relocating for work. Open to cash offer, main blocker is accountant review on tax implications. Roof repair ($12k) to be factored into final offer. Follow up in 3-5 days.',
  },
  {
    text: "Reached the seller on the second attempt. Initially hesitant, said they've received multiple offers from other investors. I differentiated our approach by emphasizing our track record and ability to close within 14 days. They pushed back on our initial offer, saying it was 15% below what another company offered. However, they admitted the other company has been slow to follow up. I offered to match within 5% and send proof of funds today. They agreed to give us 48 hours to submit a revised offer. Need to move fast on this one.",
    sentiment: 'neutral',
    objections: ['Multiple competing offers', 'Initial offer too low (15% below competition)', 'Skeptical of investor intentions'],
    nextSteps: ['Send proof of funds within 2 hours', 'Prepare revised offer within 5% of competition', 'Submit revised offer within 48 hours', 'Schedule property inspection ASAP'],
    keyPoints: ['Multiple competing offers on property', 'Competition slow to follow up', '48-hour window to submit revised offer', '14-day close capability is a differentiator', 'Proof of funds needed immediately'],
    summary: 'Competitive situation with multiple offers. Seller gave us 48-hour window after we differentiated on closing speed. Need to send proof of funds and revised offer ASAP. Competition is dropping the ball on follow-up — our advantage.',
  },
  {
    text: "Difficult conversation with the property owner. They were upset about a previous investor experience where the deal fell through at closing. Spent most of the call rebuilding trust and explaining how our process is different. They have unrealistic price expectations — asking full retail for a property that needs $40k in repairs. I gently presented the repair estimates and explained the ARV calculation. They got defensive and said they'd think about it. Not optimistic but left the door open for future contact. May need to let this one cool off and revisit in 30 days.",
    sentiment: 'negative',
    objections: ['Bad previous experience with investors', 'Unrealistic price expectations', 'Property needs $40k in repairs but owner in denial', 'Defensive about repair estimates'],
    nextSteps: ['Send detailed repair estimate breakdown via email', 'Set 30-day follow-up reminder', 'Do not push — let them process the information', 'Consider having a different team member reach out'],
    keyPoints: ['Previous deal fell through — trust issues', 'Asking full retail despite needed repairs', '$40k repair estimate', 'Defensive reaction to market analysis', 'Door left open for future contact'],
    summary: 'Challenging call — seller has trust issues from a prior failed deal and unrealistic pricing expectations. Presented repair estimates but met with resistance. Recommend cooling off period of 30 days before re-engaging with a softer approach.',
  },
  {
    text: "Great call with a referral lead. Very warm introduction — the referring attorney had already explained our process. The owner has an inherited property they don't want to manage. No emotional attachment to the property. They want a clean, simple transaction. Discussed our all-cash offer and 21-day closing timeline. They were pleased with both. Main question was about title clearing since there's a potential lien from a contractor. I assured them our title company handles that. Scheduling a walkthrough for this Thursday at 2pm. This one should move fast.",
    sentiment: 'positive',
    objections: ['Potential contractor lien on title', 'Questions about title clearing process'],
    nextSteps: ['Schedule walkthrough for Thursday 2pm', 'Order preliminary title search immediately', 'Prepare offer based on comparable sales', 'Send process overview document'],
    keyPoints: ['Referral from attorney — warm lead', 'Inherited property, no emotional attachment', 'Wants clean, simple transaction', 'All-cash offer well-received', '21-day close acceptable', 'Possible contractor lien to resolve'],
    summary: 'Excellent referral lead — inherited property with no emotional attachment. Owner wants simplicity. Cash offer and 21-day close were well received. Only concern is a possible contractor lien, which our title company will handle. Walkthrough scheduled for Thursday.',
  },
];

export function mockAnalyzeCall(duration: number): CallTranscription {
  const idx = Math.floor(Math.random() * MOCK_TRANSCRIPTIONS.length);
  const template = MOCK_TRANSCRIPTIONS[idx];
  return {
    ...template,
    text: template.text + ` [Call duration: ${Math.floor(duration / 60)}m ${duration % 60}s]`,
  };
}

// ─── Smart Paste Parsing Utilities ───────────────────────────────────────────

export interface ParsedColumn {
  name: string;
  detectedType: 'name' | 'email' | 'phone' | 'address' | 'currency' | 'number' | 'date' | 'url' | 'text';
  confidence: number;
  samples: string[];
}

export interface ParsedPasteResult {
  rows: string[][];
  headers: string[];
  columns: ParsedColumn[];
  delimiter: string;
  rowCount: number;
}

export function parsePastedData(text: string): ParsedPasteResult {
  if (!text.trim()) {
    return { rows: [], headers: [], columns: [], delimiter: ',', rowCount: 0 };
  }

  // Clean up the text - remove extra whitespace, normalize line endings
  const cleanText = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .trim();

  const lines = cleanText.split('\n').filter(l => l.trim().length > 0);
  
  if (lines.length === 0) {
    return { rows: [], headers: [], columns: [], delimiter: ',', rowCount: 0 };
  }

  // Try to detect the delimiter
  let delimiter = detectDelimiterSmart(lines);
  
  // Parse rows based on delimiter
  const allRows: string[][] = [];
  
  for (const line of lines) {
    let cells: string[] = [];
    
    if (delimiter === 'smart') {
      // Smart parsing for unstructured text
      cells = parseUnstructuredText(line);
    } else if (delimiter === ',') {
      // Parse CSV with quote handling
      cells = parseCSVLine(line);
    } else if (delimiter === 'spaces') {
      // Parse by multiple spaces
      cells = line.split(/\s{2,}/).map(c => c.trim());
    } else {
      // Simple delimiter splitting (tab, pipe, semicolon)
      cells = line.split(delimiter).map(c => c.trim());
    }
    
    // If we got only one cell but there are clear multiple fields in the line,
    // try to split by common patterns
    if (cells.length === 1 && cells[0] === line && (line.includes(',') || line.includes('\t') || line.includes('|'))) {
      // Try each delimiter again
      for (const delim of ['\t', ',', '|', ';']) {
        const split = line.split(delim).map(c => c.trim());
        if (split.length > 1) {
          cells = split;
          delimiter = delim;
          break;
        }
      }
    }
    
    // If still only one cell, try natural language parsing
    if (cells.length === 1) {
      cells = parseNaturalLanguage(line);
    }
    
    allRows.push(cells);
  }

  // Normalize row lengths
  const maxCols = Math.max(...allRows.map(r => r.length));
  const normalized = allRows.map(r => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  // Detect if first row is headers
  const hasHeader = detectHeaderSmart(normalized);
  const headers = hasHeader ? normalized[0] : [];
  const dataRows = hasHeader ? normalized.slice(1) : normalized;

  // If we have no data rows, treat first row as data
  if (dataRows.length === 0 && normalized.length > 0) {
    return {
      rows: normalized,
      headers: [],
      columns: detectColumnsFromData(normalized, []),
      delimiter: delimiter === 'smart' ? 'auto' : delimiter,
      rowCount: normalized.length,
    };
  }

  // Detect column types from data rows
  const columns = detectColumnsFromData(dataRows, headers);

  return {
    rows: dataRows,
    headers,
    columns,
    delimiter: delimiter === 'smart' ? 'auto' : delimiter,
    rowCount: dataRows.length,
  };
}

// Smart delimiter detection
function detectDelimiterSmart(lines: string[]): string {
  if (lines.length === 0) return ',';
  
  // Check first few lines
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  
  // Common delimiters to check
  const delimiters = [
    { char: '\t', name: 'tab', regex: /\t/g },
    { char: ',', name: 'comma', regex: /,/g },
    { char: '|', name: 'pipe', regex: /\|/g },
    { char: ';', name: 'semicolon', regex: /;/g },
    { char: ':', name: 'colon', regex: /:/g }
  ];
  
  const scores: Record<string, number> = {};
  
  for (const delim of delimiters) {
    let totalCount = 0;
    let consistentCount = true;
    let prevCount: number | null = null;
    
    for (const line of sampleLines) {
      const count = (line.match(delim.regex) || []).length;
      totalCount += count;
      
      if (prevCount !== null && count !== prevCount && count > 0) {
        consistentCount = false;
      }
      if (count > 0) {
        prevCount = count;
      }
    }
    
    // Score based on count and consistency
    if (totalCount > 0) {
      // Higher score for consistent counts across lines
      scores[delim.char] = totalCount * (consistentCount ? 3 : 1);
    }
  }
  
  // Find best delimiter
  let bestDelim = ',';
  let bestScore = 0;
  
  for (const [delim, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }
  
  // If we found a good delimiter, use it
  if (bestScore > 2) {
    return bestDelim;
  }
  
  // Check for multiple spaces as delimiter
  let spaceLines = 0;
  for (const line of sampleLines) {
    if (/\s{2,}/.test(line)) {
      spaceLines++;
    }
  }
  if (spaceLines >= sampleLines.length / 2) {
    return 'spaces';
  }
  
  return 'smart';
}

// Parse CSV line with quotes
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  
  cells.push(current.trim());
  return cells;
}

// Parse unstructured text intelligently
function parseUnstructuredText(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  
  // Try to detect common patterns in order of specificity
  
  // Pattern 1: Email with name and phone
  // Example: "John Smith <john@email.com> (555) 123-4567"
  const emailNamePattern = /^([^<]+)<([^>]+)>\s*(.*)$/;
  const emailMatch = trimmed.match(emailNamePattern);
  if (emailMatch) {
    const parts = [emailMatch[1].trim(), emailMatch[2].trim(), emailMatch[3].trim()].filter(p => p);
    if (parts.length > 1) return parts;
  }
  
  // Pattern 2: Comma-separated with optional quotes
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }
  
  // Pattern 3: Tab-separated
  if (trimmed.includes('\t')) {
    const parts = trimmed.split('\t').map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }
  
  // Pattern 4: Pipe-separated
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }
  
  // Pattern 5: Multiple spaces as delimiter
  if (/\s{2,}/.test(trimmed)) {
    const parts = trimmed.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }
  
  // Pattern 6: Natural language with key information
  return parseNaturalLanguage(trimmed);
}

// Parse natural language text to extract fields
function parseNaturalLanguage(text: string): string[] {
  const fields: string[] = [];
  
  // Try to extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    fields.push(emailMatch[0]);
    text = text.replace(emailMatch[0], '').trim();
  }
  
  // Try to extract phone number (various formats)
  const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    fields.push(phoneMatch[1]);
    text = text.replace(phoneMatch[1], '').trim();
  }
  
  // Try to extract dollar amount
  const moneyRegex = /\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:k|K|thousand)?/;
  const moneyMatch = text.match(moneyRegex);
  if (moneyMatch) {
    let value = moneyMatch[1];
    if (text.toLowerCase().includes('k') && !value.includes(',')) {
      value = (parseFloat(value.replace(/,/g, '')) * 1000).toString();
    }
    fields.push(`$${value}`);
    text = text.replace(moneyMatch[0], '').trim();
  }
  
  // Try to extract address (number + street name + city/state)
  const addressRegex = /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Court|Ct|Way|Circle|Cir|Parkway|Pkwy|Highway|Hwy)/i;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    fields.push(addressMatch[0].trim());
    text = text.replace(addressMatch[0], '').trim();
  }
  
  // Try to extract name (usually at beginning)
  const nameRegex = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/;
  const nameMatch = text.match(nameRegex);
  if (nameMatch) {
    fields.unshift(nameMatch[1]); // Put name first
    text = text.replace(nameMatch[1], '').trim();
  }
  
  // If we have multiple fields, return them
  if (fields.length > 0) {
    return fields;
  }
  
  // If all else fails, return the whole line
  return [text];
}

// Smart header detection
function detectHeaderSmart(rows: string[][]): boolean {
  if (rows.length < 2) return false;
  
  const firstRow = rows[0];
  const secondRow = rows[1];
  
  let headerScore = 0;
  let dataScore = 0;
  
  for (let i = 0; i < firstRow.length; i++) {
    const header = firstRow[i]?.trim() || '';
    const data = secondRow[i]?.trim() || '';
    
    if (!header && !data) continue;
    
    // Headers are usually:
    // - Short (under 30 chars)
    // - Don't contain numbers
    // - Don't look like emails/phones
    // - Often single words or simple phrases
    if (header.length > 0 && header.length < 30) {
      if (/^[a-zA-Z\s]+$/.test(header) && !/\d/.test(header)) {
        headerScore += 3;
      }
      if (!header.includes('@') && !header.match(/\(?\d{3}\)?/)) {
        headerScore += 2;
      }
      // Check if it looks like a field name (capitalized, no special chars)
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(header)) {
        headerScore += 2;
      }
    }
    
    // Data rows often contain:
    // - Numbers, emails, phones
    // - Longer text
    if (data) {
      if (/\d/.test(data)) dataScore += 1;
      if (data.includes('@')) dataScore += 3;
      if (data.match(/\(?\d{3}\)?/)) dataScore += 3;
      if (data.includes('$')) dataScore += 2;
      if (data.length > 30) dataScore += 1;
    }
  }
  
  return headerScore > dataScore;
}

// Detect column types from data
function detectColumnsFromData(dataRows: string[][], headers: string[]): ParsedColumn[] {
  if (dataRows.length === 0) return [];
  
  const colCount = Math.max(...dataRows.map(r => r.length), headers.length);
  const columns: ParsedColumn[] = [];
  
  for (let col = 0; col < colCount; col++) {
    const values = dataRows.map(r => r[col] || '').filter(v => v.trim().length > 0);
    const { type, confidence } = detectFieldType(values);
    const samples = values.slice(0, 3);
    
    // Use header if available and it looks reasonable
    let name = headers[col] || `Column ${col + 1}`;
    
    // Clean up header names
    if (name) {
      name = name
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Capitalize words
      name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    columns.push({ 
      name, 
      detectedType: type, 
      confidence, 
      samples 
    });
  }
  
  return columns;
}

// Enhanced field type detection
function detectFieldType(values: string[]): { type: ParsedColumn['detectedType']; confidence: number } {
  if (values.length === 0) {
    return { type: 'text', confidence: 0 };
  }

  // Count matches for each type
  const typeMatches: Record<string, number> = {
    email: 0,
    phone: 0,
    currency: 0,
    url: 0,
    date: 0,
    address: 0,
    name: 0,
    number: 0,
    text: 0
  };
  
  // Enhanced regex patterns
  const patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    currency: /^\$?\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?\s*$|^\d+\s*dollars?$/i,
    url: /^https?:\/\/[^\s]+$|^www\.[^\s]+$/,
    date: /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4}$/i,
    address: /^\d+\s+[a-z0-9\s,]+(?:street|st|avenue|ave|boulevard|blvd|drive|dr|road|rd|lane|ln|court|ct|way|circle|cir|parkway|pkwy|highway|hwy)\b/i,
    number: /^\d+(?:\.\d+)?$/,
    name: /^[a-z]+(?:[\s-][a-z]+)*$/i,
  };

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    let matched = false;

    // Check each pattern
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(trimmed)) {
        typeMatches[type]++;
        matched = true;
        break;
      }
    }

    // If no pattern matched, check if it looks like a name
    if (!matched) {
      const words = trimmed.split(/\s+/);
      // Names are usually 2-4 words, each capitalized or with common prefixes
      if (words.length >= 2 && words.length <= 4) {
        const capitalizedWords = words.filter(w => /^[A-Z][a-z]*$/.test(w)).length;
        if (capitalizedWords >= words.length - 1) {
          typeMatches.name++;
          continue;
        }
      }
      
      // Check if it looks like an address even without keywords
      if (/^\d+\s+[a-zA-Z]/.test(trimmed)) {
        typeMatches.address++;
        continue;
      }
      
      typeMatches.text++;
    }
  }

  // Find the type with the most matches
  let bestType = 'text';
  let bestCount = 0;
  let totalScored = 0;

  for (const [type, count] of Object.entries(typeMatches)) {
    totalScored += count;
    if (count > bestCount) {
      bestCount = count;
      bestType = type;
    }
  }

  // Calculate confidence
  const confidence = totalScored > 0 
    ? Math.round((bestCount / totalScored) * 100)
    : 0;

  return {
    type: bestType as ParsedColumn['detectedType'],
    confidence: Math.min(confidence, 99)
  };
}

export const DETECTED_TYPE_TO_TARGET: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'propertyAddress',
  currency: 'estimatedValue',
  url: 'skip',
  date: 'skip',
  number: 'skip',
  text: 'notes',
};

export const DETECTED_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  name: { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', label: 'Name' },
  email: { bg: 'color-mix(in srgb, var(--t-info) 15%, transparent)', text: 'var(--t-info)', label: 'Email' },
  phone: { bg: 'var(--t-success-dim)', text: 'var(--t-success)', label: 'Phone' },
  address: { bg: 'color-mix(in srgb, var(--t-purple) 15%, transparent)', text: 'var(--t-purple)', label: 'Address' },
  currency: { bg: 'color-mix(in srgb, var(--t-emerald) 15%, transparent)', text: 'var(--t-emerald)', label: 'Currency' },
  number: { bg: 'color-mix(in srgb, var(--t-orange) 15%, transparent)', text: 'var(--t-orange)', label: 'Number' },
  date: { bg: 'color-mix(in srgb, var(--t-pink) 15%, transparent)', text: 'var(--t-pink)', label: 'Date' },
  url: { bg: 'color-mix(in srgb, var(--t-indigo) 15%, transparent)', text: 'var(--t-indigo)', label: 'URL' },
  text: { bg: 'var(--t-surface-hover)', text: 'var(--t-text-muted)', label: 'Text' },
};

export function generateInviteCode(): string {
  return `WS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: 'var(--t-success)',
  offline: 'var(--t-text-muted)',
  busy: 'var(--t-error)',
  dnd: 'var(--t-warning)',
};

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  busy: 'Busy',
  dnd: 'Do Not Disturb',
};

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; dot: string }> = {
  low: { bg: 'var(--t-surface-hover)', text: 'var(--t-text-muted)', dot: 'var(--t-text-muted)' },
  medium: { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)', dot: 'var(--t-primary)' },
  high: { bg: 'color-mix(in srgb, var(--t-warning) 15%, transparent)', text: 'var(--t-warning)', dot: 'var(--t-warning)' },
  urgent: { bg: 'var(--t-error-dim)', text: 'var(--t-error)', dot: 'var(--t-error)' },
};

export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  'todo': { bg: 'var(--t-surface-hover)', text: 'var(--t-text-muted)' },
  'in-progress': { bg: 'var(--t-primary-dim)', text: 'var(--t-primary)' },
  'done': { bg: 'var(--t-success-dim)', text: 'var(--t-success)' },
  'cancelled': { bg: 'var(--t-error-dim)', text: 'var(--t-error)' },
};

export const STATUS_FLOW: Record<LeadStatus, LeadStatus[]> = {
  'new': ['contacted', 'closed-lost'],
  'contacted': ['qualified', 'closed-lost'],
  'qualified': ['negotiating', 'contacted', 'closed-lost'],
  'negotiating': ['closed-won', 'closed-lost', 'qualified'],
  'closed-won': [],
  'closed-lost': ['new'],
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  'new': 'New',
  'contacted': 'Contacted',
  'qualified': 'Qualified',
  'negotiating': 'Negotiating',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
};

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💯'];

// ─── Default Auth (used by demo login only) ──────────────────────────────────

const defaultUser: UserProfile = {
  id: uuidv4(),
  name: 'Alex Morgan',
  email: 'alex@wholescale.io',
  phone: '(555) 000-1234',
  avatar: 'AM',
  teamRole: 'admin',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const defaultTeamConfig: TeamConfig = {
  id: uuidv4(),
  name: 'My Team',
  inviteCode: 'WS-000000',
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: defaultUser.id,
};

// ─── Store ───────────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, password: string) => void;
  logout: () => void;
  forgotPassword: (email: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearAuthError: () => void;

  // Sync
  teamId: string | null;
  dataLoaded: boolean;
  setTeamId: (id: string | null) => void;
  setDataLoaded: (loaded: boolean) => void;
  setBulkData: (data: Record<string, unknown>) => void;

  // Leads
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'statusHistory'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addTimelineEntry: (leadId: string, entry: Omit<TimelineEntry, 'id'>) => void;
  updateLeadStatus: (leadId: string, newStatus: LeadStatus, changedBy: string) => void;

  // Team
  team: TeamMember[];
  teamConfig: TeamConfig;
  updateMemberStatus: (id: string, status: PresenceStatus) => void;
  setCustomStatus: (id: string, msg: string) => void;
  updateMemberRole: (id: string, role: TeamRole) => void;
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  removeTeamMember: (id: string) => void;
  regenerateInviteCode: () => void;
  updateTeamConfig: (updates: Partial<TeamConfig>) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;

  // Calculator Scenarios
  calculatorScenarios: CalculatorScenario[];
  addCalculatorScenario: (scenario: Omit<CalculatorScenario, 'id' | 'date' | 'lastModified'>) => string;
  updateCalculatorScenario: (id: string, updates: Partial<CalculatorScenario>) => void;
  deleteCalculatorScenario: (id: string) => void;
  getScenariosByLead: (leadId: string) => CalculatorScenario[];

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Map
  buyers: Buyer[];
  coverageAreas: CoverageArea[];
  mapFilters: MapFilters;
  mapSettings: MapSettings;
  buyerTemplates: BuyerCriteriaTemplate[];
  pendingDrawMode: boolean;
  addBuyer: (buyer: Omit<Buyer, 'id' | 'createdAt'>) => void;
  updateBuyer: (id: string, updates: Partial<Buyer>) => void;
  deleteBuyer: (id: string) => void;
  addCoverageArea: (area: Omit<CoverageArea, 'id' | 'createdAt'>) => void;
  updateCoverageArea: (id: string, updates: Partial<CoverageArea>) => void;
  deleteCoverageArea: (id: string) => void;
  toggleMapFilter: (key: 'showLeads' | 'showBuyers' | 'showCoverageAreas' | 'showDrivingRoute' | 'clusterMarkers') => void;
  toggleLeadStatusFilter: (status: LeadStatus) => void;
  addBuyerTemplate: (template: Omit<BuyerCriteriaTemplate, 'id'>) => void;
  deleteBuyerTemplate: (id: string) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setPendingDrawMode: (v: boolean) => void;

  // Chat
  channels: ChatChannel[];
  messages: Record<string, ChatMessage[]>;
  currentChannelId: string | null;
  typingUsers: Record<string, string[]>;
  chatSearchQuery: string;
  unreadCounts: Record<string, number> & { sms: number };

  setCurrentChannel: (channelId: string) => void;
  sendMessage: (channelId: string, content: string, type?: MessageType, mentions?: string[], replyToId?: string | null, attachments?: ChatAttachment[]) => void;
  editMessage: (channelId: string, messageId: string, newContent: string) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  addReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  removeReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  createChannel: (name: string, type: ChannelType, members: string[], description?: string) => string;
  deleteChannel: (channelId: string) => void;
  markChannelRead: (channelId: string) => void;
  setTypingUser: (channelId: string, userId: string) => void;
  clearTypingUser: (channelId: string, userId: string) => void;
  setChatSearchQuery: (query: string) => void;
  searchMessages: (query: string) => ChatMessage[];
  getTotalUnread: () => number;

  // NEW: Channel Management Functions
  updateChannel: (channelId: string, updates: Partial<Pick<ChatChannel, 'name' | 'description'>>) => void;
  addChannelMember: (channelId: string, userId: string) => void;
  removeChannelMember: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string) => void;

  // AI
  callRecordings: CallRecording[];
  addCallRecording: (leadId: string, duration: number) => void;
  analyzeRecording: (recordingId: string) => void;

  // Import
  importTemplates: ImportTemplate[];
  importHistory: ImportHistoryEntry[];
  duplicateSettings: DuplicateDetectionSettings;
  addImportTemplate: (template: Omit<ImportTemplate, 'id' | 'createdAt'>) => void;
  deleteImportTemplate: (id: string) => void;
  addImportHistory: (entry: Omit<ImportHistoryEntry, 'id' | 'timestamp'>) => void;
  updateDuplicateSettings: (settings: Partial<DuplicateDetectionSettings>) => void;
  getMockSheetData: () => Record<string, string>[];
  getMockScrapedProperty: (url: string) => ScrapedPropertyData;
  getMockPdfExtraction: () => ScrapedPropertyData[];
  importLeadsFromData: (data: Array<{
    name: string; email?: string; phone?: string; address?: string;
    value?: number; propertyType?: PropertyType; source?: LeadSource; notes?: string;
  }>) => number;

  // Theme
  currentTheme: string;
  setTheme: (theme: string) => void;

  // NEW: Custom Theme Colors
  customColors: Record<string, string>;
  setCustomColor: (property: string, color: string) => void;
  resetCustomColors: () => void;
  getCurrentColors: () => Record<string, string>;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  deleteNotification: (id: string) => void;

  // Streaks
  loginStreak: number;
  taskStreak: number;
  lastLoginDate: string;
  longestStreak: number;
  memberStreaks: Record<string, { login: number; task: number }>;
  incrementLoginStreak: () => void;

  // Lead Photos
  addLeadPhoto: (leadId: string, photoId: string) => void;
  removeLeadPhoto: (leadId: string, photoId: string) => void;
  reorderLeadPhotos: (leadId: string, photos: string[]) => void;

  // SMS
  smsMessages: SMSMessage[];
  setSMSMessages: (messages: SMSMessage[]) => void;
  addSMSMessage: (message: SMSMessage) => void;
  markSMSAsRead: (phoneNumber: string) => void;
  
  // Floating AI Widget
  showFloatingAIWidget: boolean;
  setShowFloatingAIWidget: (v: boolean) => void;

  // Keyboard Shortcuts
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (v: boolean) => void;

  // AI Usage Tracking
  aiUsage: Record<string, AIUsage>;
  incrementAiUsage: (model: string) => void;
  setAiUsage: (model: string, used: number, limit?: number) => void;

  // AI Threads
  aiThreads: AIThread[];
  currentAiThreadId: string | null;
  aiMessages: Record<string, AIBotMessage[]>;
  createAiThread: (title?: string) => string;
  deleteAiThread: (id: string) => void;
  setCurrentAiThread: (id: string) => void;
  updateAiThreadTitle: (id: string, title: string) => void;
  toggleAiThreadPin: (id: string) => void;
  addAiMessage: (threadId: string, message: AIBotMessage) => void;
  clearAiThreadMessages: (threadId: string) => void;

  // Notification Settings
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;

  // SMS Auto-Reply
  smsAutoReplyEnabled: boolean;
  smsAutoReplyMessage: string;
  setSMSAutoReplyEnabled: (v: boolean) => void;
  setSMSAutoReplyMessage: (msg: string) => void;

  // Saved Contacts (SMS)
  contacts: SavedContact[];
  addContact: (contact: Omit<SavedContact, 'id' | 'createdAt'>) => void;
  removeContact: (id: string) => void;
  updateContact: (id: string, updates: Partial<SavedContact>) => void;

  // Quick Notes
  quickNotes: string;
  setQuickNotes: (v: string) => void;
  showQuickNotes: boolean;
  setShowQuickNotes: (v: boolean) => void;

  // Search
  searchResults: {
    leads: Lead[];
    tasks: Task[];
    sms: SMSMessage[];
  };
  performSearch: (query: string) => void;

  // AI Bot Name & Model
  aiName: string;
  setAiName: (name: string) => void;
  aiModel: string;
  setAiModel: (model: string) => void;

  // Global Lead Modal State
  activeLeadModalId: string | null;
  setActiveLeadModalId: (id: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────
  isAuthenticated: false,
  currentUser: null,
  smsMessages: [],
  authLoading: false,
  authError: null,
  showFloatingAIWidget: false,
  activeLeadModalId: null,
  setActiveLeadModalId: (id) => set({ activeLeadModalId: id }),
  shortcutsEnabled: (typeof window !== 'undefined' && localStorage.getItem('wholescale-shortcuts-enabled') !== 'false'),
  aiUsage: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ai_usage_map');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  })(),
  aiThreads: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ai_threads');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  })(),
  currentAiThreadId: typeof window !== 'undefined' ? localStorage.getItem('current_ai_thread_id') : null,
  aiMessages: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ai_messages_map');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  })(),

  notificationSettings: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('wholescale-notification-settings');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return defaultNotificationSettings;
  })(),

  smsAutoReplyEnabled: typeof window !== 'undefined' ? localStorage.getItem('sms-auto-reply-enabled') === 'true' : false,
  smsAutoReplyMessage: typeof window !== 'undefined' ? localStorage.getItem('sms-auto-reply-message') || "I'm with a client right now but will get back to you soon!" : "I'm with a client right now but will get back to you soon!",

  contacts: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sms_contacts');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  })(),

  quickNotes: typeof window !== 'undefined' ? localStorage.getItem('tasks_quick_notes') || '' : '',
  showQuickNotes: typeof window !== 'undefined' ? localStorage.getItem('show_quick_notes') === 'true' : false,

  setShowQuickNotes: (v: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('show_quick_notes', v.toString());
    }
    set({ showQuickNotes: v });
  },

  login: (email, _password) =>
    set(() => {
      if (!email.includes('@')) return { authError: 'Invalid email address' };
      return {
        isAuthenticated: true,
        currentUser: { ...defaultUser, email },
        authLoading: false,
        authError: null,
      };
    }),

  signup: (name, email, _password) =>
    set(() => {
      if (!email.includes('@')) return { authError: 'Invalid email address' };
      if (name.length < 2) return { authError: 'Name must be at least 2 characters' };
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      return {
        isAuthenticated: true,
        currentUser: {
          ...defaultUser, id: uuidv4(), name, email, avatar: initials,
          emailVerified: false, createdAt: new Date().toISOString(),
        },
        authError: null,
      };
    }),

  logout: () => set({
    isAuthenticated: false,
    currentUser: null,
    // Reset all data on logout so next login loads fresh from Supabase
    leads: [],
    team: [],
    tasks: [],
    channels: [],
    messages: {},
    buyers: [],
    coverageAreas: [],
    notifications: [],
    callRecordings: [],
    smsMessages: [],
    unreadCounts: { sms: 0 },
    chatSearchQuery: '',
    currentChannelId: null,
    dataLoaded: false,
    teamId: null,
  }),
  forgotPassword: () => set({ authError: null }),
  updateProfile: (updates) =>
    set((s) => {
      if (!s.currentUser) return {};
      const newUser = { ...s.currentUser, ...updates };
      if (updates.name) {
        newUser.avatar = updates.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      }
      return { currentUser: newUser };
    }),
  clearAuthError: () => set({ authError: null }),

  updateNotificationSettings: (updates) => set((s) => {
    const newSettings = { ...s.notificationSettings, ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-notification-settings', JSON.stringify(newSettings));
    }
    return { notificationSettings: newSettings };
  }),

  setSMSAutoReplyEnabled: (v: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sms-auto-reply-enabled', v.toString());
    }
    set({ smsAutoReplyEnabled: v });
  },

  setSMSAutoReplyMessage: (msg: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sms-auto-reply-message', msg);
    }
    set({ smsAutoReplyMessage: msg });
  },

  // ── Sync ──────────────────────────────────────────────────
  teamId: null,
  dataLoaded: false,
  setTeamId: (id) => set({ teamId: id }),
  setDataLoaded: (loaded) => set({ dataLoaded: loaded }),
  setBulkData: (data) => set(data as Partial<AppState>),

  // Search
  searchResults: { leads: [], tasks: [], sms: [] },
  performSearch: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) {
      set({ searchResults: { leads: [], tasks: [], sms: [] } });
      return;
    }

    const { leads, tasks, smsMessages } = get();
    
    set({ 
      searchResults: {
        leads: leads.filter(l => 
          (l.name && l.name.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.propertyAddress && l.propertyAddress.toLowerCase().includes(q))
        ),
        tasks: tasks.filter(t => 
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
        ),
        sms: smsMessages.filter(m => 
          (m.content && m.content.toLowerCase().includes(q)) ||
          (m.phone_number && m.phone_number.includes(q))
        )
      }
    });
  },

  // ── Leads (empty — loaded from Supabase) ──────────────────
  leads: [],

  addLead: (lead) => {
    const now = new Date().toISOString();
    const newId = uuidv4();
    const newLead = {
      ...lead, id: newId, createdAt: now, updatedAt: now,
      timeline: [{ id: uuidv4(), type: 'note' as TimelineType, content: 'Lead created.', timestamp: now, user: 'System' }],
      statusHistory: [{ fromStatus: null, toStatus: lead.status, timestamp: now, changedBy: 'System' }],
    };
    set((s) => ({ leads: [...s.leads, newLead] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      leadsService.create({
        id: newId, team_id: teamId, name: lead.name, email: lead.email, phone: lead.phone,
        address: lead.propertyAddress, property_type: lead.propertyType, property_value: lead.estimatedValue,
        offer_amount: lead.offerAmount, status: lead.status, source: lead.source, notes: lead.notes,
        lat: lead.lat, lng: lead.lng, assigned_to: lead.assignedTo,
        probability: lead.probability, engagement_level: lead.engagementLevel,
        timeline_urgency: lead.timelineUrgency, competition_level: lead.competitionLevel,
        import_source: lead.importSource || null, photos: lead.photos || [],
      }).catch(() => {});
    }

    // Trigger Notification
    const { notificationSettings, addNotification } = get();
    if (notificationSettings.newLead) {
      addNotification({
        type: 'lead-assigned',
        title: 'New Lead Added',
        message: `${lead.name} has been added to your pipeline.`,
        link: '/leads'
      });
    }
  },

  updateLead: (id, updates) => {
    set((s) => ({
      leads: s.leads.map((l) => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l),
    }));
    if (isSupabaseConfigured) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.propertyAddress !== undefined) dbUpdates.address = updates.propertyAddress;
      if (updates.propertyType !== undefined) dbUpdates.property_type = updates.propertyType;
      if (updates.estimatedValue !== undefined) dbUpdates.property_value = updates.estimatedValue;
      if (updates.offerAmount !== undefined) dbUpdates.offer_amount = updates.offerAmount;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
      if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
      if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
      if (updates.probability !== undefined) dbUpdates.probability = updates.probability;
      if (updates.engagementLevel !== undefined) dbUpdates.engagement_level = updates.engagementLevel;
      if (updates.timelineUrgency !== undefined) dbUpdates.timeline_urgency = updates.timelineUrgency;
      if (updates.competitionLevel !== undefined) dbUpdates.competition_level = updates.competitionLevel;
      if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
      if (Object.keys(dbUpdates).length > 0) leadsService.update(id, dbUpdates).catch(() => {});
    }
  },

  deleteLead: (id) => {
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }));
    if (isSupabaseConfigured && supabase) leadsService.remove(id).catch(() => {});
  },

  addTimelineEntry: (leadId, entry) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, timeline: [...l.timeline, { ...entry, id: uuidv4() }], updatedAt: new Date().toISOString() }
          : l
      ),
    })),

  updateLeadStatus: (leadId, newStatus, changedBy) =>
    set((s) => {
      const now = new Date().toISOString();
      const updatedLeads = s.leads.map((l) => {
        if (l.id !== leadId || l.status === newStatus) return l;
        const oldStatus = l.status;
        return {
          ...l,
          status: newStatus,
          updatedAt: now,
          statusHistory: [...l.statusHistory, { 
            fromStatus: oldStatus, 
            toStatus: newStatus, 
            timestamp: now, 
            changedBy 
          }],
          timeline: [...l.timeline, {
            id: uuidv4(),
            type: 'status-change' as TimelineType,
            content: `Status changed from ${STATUS_LABELS[oldStatus]} to ${STATUS_LABELS[newStatus]}`,
            timestamp: now,
            user: changedBy,
            metadata: { from: oldStatus, to: newStatus },
          }],
        };
      });

      if (isSupabaseConfigured && supabase) {
        leadsService.update(leadId, { 
          status: newStatus,
          updated_at: now
        }).catch((error) => {
          console.error('❌ Failed to save status change to Supabase:', error);
        });
      }

      return { leads: updatedLeads };
    }),

  // ── Team (empty — loaded from Supabase) ───────────────────
  team: [],
  teamConfig: defaultTeamConfig,

  updateMemberStatus: (id, status) => {
    set((s) => ({
      team: s.team.map((m) => m.id === id ? {
        ...m, presenceStatus: status,
        lastSeen: status === 'offline' ? new Date().toISOString() : m.lastSeen,
      } : m),
    }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      teamService.updatePresence(teamId, id, status).catch(() => {});
    }
  },

  setCustomStatus: (id, msg) =>
    set((s) => ({ team: s.team.map((m) => m.id === id ? { ...m, customStatus: msg } : m) })),

  updateMemberRole: (id, role) => {
    set((s) => ({ team: s.team.map((m) => m.id === id ? { ...m, teamRole: role } : m) }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      teamService.updateRole(teamId, id, role).catch(() => {});
    }
  },

  addTeamMember: (member) =>
    set((s) => ({ team: [...s.team, { ...member, id: uuidv4() }] })),

  removeTeamMember: (id) => {
    set((s) => ({ team: s.team.filter((m) => m.id !== id) }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      teamService.removeMember(teamId, id).catch(() => {});
    }
  },

  regenerateInviteCode: () => {
    const newCode = generateInviteCode();
    set((s) => ({ teamConfig: { ...s.teamConfig, inviteCode: newCode } }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      supabase
        .from('teams')
        .update({ invite_code: newCode })
        .eq('id', teamId)
        .then(({ error }) => {
          if (error) console.error('Failed to update invite code:', error);
        });
    }
  },

  updateTeamConfig: (updates) => {
    set((s) => ({ teamConfig: { ...s.teamConfig, ...updates } }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.inviteCode !== undefined) dbUpdates.invite_code = updates.inviteCode;
      if (Object.keys(dbUpdates).length > 0) {
        supabase
          .from('teams')
          .update(dbUpdates)
          .eq('id', teamId)
          .then(({ error }) => {
            if (error) console.error('Failed to update team:', error);
          });
      }
    }
  },

  // ── Tasks (empty — loaded from Supabase) ──────────────────
  tasks: [],

  addTask: (task) => {
    const newId = uuidv4();
    const now = new Date().toISOString();
    set((s) => ({ tasks: [...s.tasks, { ...task, id: newId, createdAt: now, completedAt: null }] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      tasksService.create({
        id: newId, team_id: teamId, title: task.title, description: task.description,
        assigned_to: task.assignedTo || null, created_by: task.createdBy || null,
        lead_id: task.leadId || null, status: task.status, priority: task.priority,
        due_date: task.dueDate || null,
      }).catch(() => {});
    }

    // Trigger Notification
    const { notificationSettings, addNotification } = get();
    if (notificationSettings.taskDue) {
      addNotification({
        type: 'task-assigned',
        title: 'New Task Created',
        message: `Task: ${task.title}`,
        link: '/tasks'
      });
    }
  },

  updateTask: (id, updates) => {
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
    if (isSupabaseConfigured && supabase) {
      const dbUp: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUp.title = updates.title;
      if (updates.description !== undefined) dbUp.description = updates.description;
      if (updates.status !== undefined) dbUp.status = updates.status;
      if (updates.priority !== undefined) dbUp.priority = updates.priority;
      if (updates.dueDate !== undefined) dbUp.due_date = updates.dueDate;
      if (Object.keys(dbUp).length > 0) tasksService.update(id, dbUp).catch(() => {});
    }
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    if (isSupabaseConfigured && supabase) tasksService.remove(id).catch(() => {});
  },

  completeTask: (id) => {
    const now = new Date().toISOString();
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: 'done' as TaskStatus, completedAt: now } : t) }));
    if (isSupabaseConfigured && supabase) tasksService.complete(id).catch(() => {});
  },

  // ── Calculator Scenarios ─────────────────────────────────
  calculatorScenarios: (() => {
    try {
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('wholescale-calculator-scenarios') || '[]');
      }
      return [];
    } catch {
      return [];
    }
  })(),

  addCalculatorScenario: (scenario) => {
    const now = new Date().toISOString();
    const newScenario = {
      ...scenario,
      id: uuidv4(),
      date: now,
      lastModified: now,
    };
    
    set((state) => {
      const updated = [newScenario, ...state.calculatorScenarios];
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-calculator-scenarios', JSON.stringify(updated));
      }
      return { calculatorScenarios: updated };
    });

    if (scenario.leadId) {
      const lead = get().leads.find(l => l.id === scenario.leadId);
      if (lead) {
        get().addTimelineEntry(scenario.leadId, {
          type: 'note',
          content: `📊 Added calculator scenario: ${scenario.name || scenario.type}`,
          timestamp: now,
          user: 'System',
          metadata: { scenarioId: newScenario.id, scenarioType: scenario.type }
        });
      }
    }

    return newScenario.id;
  },

  updateCalculatorScenario: (id, updates) => {
    set((state) => {
      const updated = state.calculatorScenarios.map(s =>
        s.id === id ? { ...s, ...updates, lastModified: new Date().toISOString() } : s
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-calculator-scenarios', JSON.stringify(updated));
      }
      return { calculatorScenarios: updated };
    });
  },

  deleteCalculatorScenario: (id) => {
    set((state) => {
      const updated = state.calculatorScenarios.filter(s => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-calculator-scenarios', JSON.stringify(updated));
      }
      return { calculatorScenarios: updated };
    });
  },

  getScenariosByLead: (leadId) => {
    return get().calculatorScenarios.filter(s => s.leadId === leadId);
  },

  // ── UI ────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Map (empty — loaded from Supabase) ────────────────────
  buyers: [],
  coverageAreas: [],
  buyerTemplates: [],
  pendingDrawMode: false,

  mapFilters: {
    showLeads: true, showBuyers: true, showCoverageAreas: true, showDrivingRoute: false,
    clusterMarkers: false,
    leadStatusFilters: { 'new': true, 'contacted': true, 'qualified': true, 'negotiating': true, 'closed-won': true, 'closed-lost': true },
  },

  mapSettings: { defaultLat: 30.2672, defaultLng: -97.7431, defaultZoom: 6, clusterRadius: 80 },

  addBuyer: (buyer) => {
    const newId = uuidv4();
    set((s) => ({ buyers: [...s.buyers, { ...buyer, id: newId, createdAt: new Date().toISOString() }] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      mapService.createBuyer({
        id: newId, team_id: teamId, name: buyer.name, email: buyer.email, phone: buyer.phone,
        lat: buyer.lat, lng: buyer.lng, budget_min: buyer.budgetMin, budget_max: buyer.budgetMax,
        active: buyer.active, deal_score: buyer.dealScore, notes: buyer.notes, criteria: buyer.criteria,
      }).catch(() => {});
    }
  },
  updateBuyer: (id, updates) => {
    set((s) => ({ buyers: s.buyers.map((b) => b.id === id ? { ...b, ...updates } : b) }));
    if (isSupabaseConfigured && supabase) {
      const db: Record<string, unknown> = {};
      if (updates.name !== undefined) db.name = updates.name;
      if (updates.email !== undefined) db.email = updates.email;
      if (updates.phone !== undefined) db.phone = updates.phone;
      if (updates.lat !== undefined) db.lat = updates.lat;
      if (updates.lng !== undefined) db.lng = updates.lng;
      if (updates.budgetMin !== undefined) db.budget_min = updates.budgetMin;
      if (updates.budgetMax !== undefined) db.budget_max = updates.budgetMax;
      if (updates.active !== undefined) db.active = updates.active;
      if (updates.dealScore !== undefined) db.deal_score = updates.dealScore;
      if (updates.criteria !== undefined) db.criteria = updates.criteria;
      if (updates.notes !== undefined) db.notes = updates.notes;
      if (Object.keys(db).length > 0) mapService.updateBuyer(id, db).catch(() => {});
    }
  },
  deleteBuyer: (id) => {
    set((s) => ({ buyers: s.buyers.filter((b) => b.id !== id) }));
    if (isSupabaseConfigured && supabase) mapService.deleteBuyer(id).catch(() => {});
  },
  addCoverageArea: (area) => {
    const newId = uuidv4();
    set((s) => ({ coverageAreas: [...s.coverageAreas, { ...area, id: newId, createdAt: new Date().toISOString() }] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      mapService.createCoverageArea({
        id: newId, team_id: teamId, name: area.name, coordinates: JSON.stringify(area.coordinates),
        color: area.color, opacity: area.opacity, notes: area.notes,
      }).catch(() => {});
    }
  },
  updateCoverageArea: (id, updates) => set((s) => ({ coverageAreas: s.coverageAreas.map((a) => a.id === id ? { ...a, ...updates } : a) })),
  deleteCoverageArea: (id) => {
    set((s) => ({ coverageAreas: s.coverageAreas.filter((a) => a.id !== id) }));
    if (isSupabaseConfigured && supabase) mapService.deleteCoverageArea(id).catch(() => {});
  },
  toggleMapFilter: (key) => set((s) => ({ mapFilters: { ...s.mapFilters, [key]: !s.mapFilters[key] } })),
  toggleLeadStatusFilter: (status) => set((s) => ({ mapFilters: { ...s.mapFilters, leadStatusFilters: { ...s.mapFilters.leadStatusFilters, [status]: !s.mapFilters.leadStatusFilters[status] } } })),
  addBuyerTemplate: (template) => set((s) => ({ buyerTemplates: [...s.buyerTemplates, { ...template, id: uuidv4() }] })),
  deleteBuyerTemplate: (id) => set((s) => ({ buyerTemplates: s.buyerTemplates.filter((t) => t.id !== id) })),
  updateMapSettings: (settings) => set((s) => ({ mapSettings: { ...s.mapSettings, ...settings } })),
  setPendingDrawMode: (v) => set({ pendingDrawMode: v }),

  // ── Chat (empty — loaded from Supabase) ───────────────────
  channels: [],
  messages: {},
  currentChannelId: null,
  typingUsers: {},
  chatSearchQuery: '',
  unreadCounts: { sms: 0 },

  setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),

  sendMessage: (channelId, content, type = 'text', mentions = [], replyToId = null, attachments = []) => {
    const user = get().currentUser;
    if (!user) {
      console.log('❌ No user, cannot send message');
      return;
    }
    const now = new Date().toISOString();
    const newId = uuidv4();
    const msg: ChatMessage = {
      id: newId, channelId, senderId: user.id,
      senderName: user.name, senderAvatar: user.avatar,
      content, timestamp: now, type,
      mentions, reactions: [], replyToId,
      attachments, edited: false, readBy: [user.id], deleted: false,
    };
    
    console.log('✅ Sending message locally:', { id: newId, channelId, content, user: user.name });
    
    // Update UI immediately
    set((s) => {
      const channelMsgs = [...(s.messages[channelId] || []), msg];
      return {
        messages: { ...s.messages, [channelId]: channelMsgs },
        channels: s.channels.map(ch => ch.id === channelId ? { ...ch, lastMessageAt: now } : ch),
      };
    });
    
    if (isSupabaseConfigured && supabase) {
      console.log('📤 Saving message to Supabase...');
      chatService.sendMessage({
        id: newId, 
        channel_id: channelId, 
        user_id: user.id, 
        sender_name: user.name,
        sender_avatar: user.avatar,
        content, 
        type, 
        mentions, 
        reply_to_id: replyToId, 
        attachments: attachments.length ? attachments : [],
      })
      .then((result) => {
        console.log('✅ Message saved to Supabase successfully:', result);
      })
      .catch((error) => {
        console.error('❌ Failed to save message to Supabase:', error);
      });
    } else {
      console.log('⚠️ Supabase not configured, message only saved locally');
    }
  },

  editMessage: (channelId, messageId, newContent) => {
    set((s) => {
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => m.id === messageId ? { ...m, content: newContent, edited: true } : m),
        },
      };
    });
    if (isSupabaseConfigured && supabase) {
      chatService.editMessage(messageId, newContent).catch(() => {});
    }
  },

  deleteMessage: (channelId, messageId) => {
    set((s) => {
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => m.id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m),
        },
      };
    });
    if (isSupabaseConfigured && supabase) {
      chatService.deleteMessage(messageId).catch(() => {});
    }
  },

  addReaction: (channelId, messageId, emoji, userId) =>
    set((s) => {
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => {
            if (m.id !== messageId) return m;
            const existing = m.reactions.find(r => r.emoji === emoji);
            if (existing) {
              if (existing.users.includes(userId)) return m;
              return {
                ...m,
                reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, users: [...r.users, userId] } : r),
              };
            }
            return { ...m, reactions: [...m.reactions, { emoji, users: [userId] }] };
          }),
        },
      };
    }),

  removeReaction: (channelId, messageId, emoji, userId) =>
    set((s) => {
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => {
            if (m.id !== messageId) return m;
            return {
              ...m,
              reactions: m.reactions
                .map(r => r.emoji === emoji ? { ...r, users: r.users.filter(u => u !== userId) } : r)
                .filter(r => r.users.length > 0),
            };
          }),
        },
      };
    }),

  // Enhanced createChannel with detailed logging
  createChannel: (name, type, members, description = '') => {
    const id = uuidv4();
    const user = get().currentUser;
    const now = new Date().toISOString();
    
    console.log('🎯 Creating channel:', { id, name, type, members, description, userId: user?.id });
    
    const newChannel = {
      id,
      name,
      type,
      members,
      description,
      avatar: type === 'group' ? '💬' : name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      createdAt: now,
      createdBy: user?.id || '',
      lastMessageAt: now,
      pinnedMessageIds: [],
    };
    
    // Update UI immediately
    set((s) => {
      console.log('📝 Updating local state with new channel');
      return {
        channels: [...s.channels, newChannel],
        messages: { ...s.messages, [id]: [] },
        unreadCounts: { ...s.unreadCounts, [id]: 0 },
      };
    });

    // Save to Supabase
    if (isSupabaseConfigured && supabase && user) {
      console.log('💾 Attempting to save channel to Supabase...');
      
      supabase
        .from('channels')
        .insert([{
          id,
          name,
          type,
          members,
          description,
          avatar: newChannel.avatar,
          created_by: user.id,
          last_message_at: now,
          created_at: now,
        }])
        .then(({ data, error }) => {
          if (error) {
            console.error('❌ Failed to save channel to Supabase:', error);
          } else {
            console.log('✅ Channel saved to Supabase successfully:', data);
            
            // Also add channel members
            if (members && members.length > 0 && supabase) {
              console.log('👥 Adding channel members:', members);
              supabase
                .from('channel_members')
                .insert(members.map(userId => ({
                  channel_id: id,
                  user_id: userId,
                }))
                )
                .then(({ data: memberData, error: memberError }) => {
                  if (memberError) {
                    console.error('❌ Failed to save channel members:', memberError);
                  } else {
                    console.log('✅ Channel members saved successfully:', memberData);
                  }
                });
            }
          }
        });
    } else {
      console.log('⚠️ Supabase not configured or user not logged in');
    }

    return id;
  },

deleteChannel: (channelId) => {
  const user = get().currentUser;
  const channel = get().channels.find(ch => ch.id === channelId);
  
  console.log('🗑️ Attempting to delete channel:', { channelId, user: user?.id, isCreator: user?.id === channel?.createdBy });

  // Check if user is creator (only creators should delete)
  if (channel && channel.createdBy !== user?.id) {
    console.error('❌ Only the creator can delete this channel');
    return;
  }

  // Update local state immediately (optimistic update)
  set((s) => {
    const newMsgs = { ...s.messages };
    delete newMsgs[channelId];
    const newUnread = { ...s.unreadCounts };
    delete newUnread[channelId];
    
    const newChannels = s.channels.filter(ch => ch.id !== channelId);
    const newCurrentId = s.currentChannelId === channelId ? (newChannels[0]?.id || null) : s.currentChannelId;
    
    console.log('📝 Updated local state - channel removed');
    
    return {
      channels: newChannels,
      messages: newMsgs,
      unreadCounts: newUnread,
      currentChannelId: newCurrentId,
    };
  });

  // Delete from Supabase
  if (isSupabaseConfigured && supabase) {
    console.log('💾 Sending delete to Supabase...');
    
    supabase
      .from('channels')
      .delete()
      .eq('id', channelId)
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Failed to delete channel from Supabase:', error);
          
          // Revert the local deletion if Supabase fails
          set((s) => {
            const originalChannel = get().channels.find(ch => ch.id === channelId);
            if (!originalChannel) return {};
            
            console.log('🔄 Reverting local deletion');
            
            return {
              channels: [...s.channels, originalChannel],
              currentChannelId: s.currentChannelId === null ? originalChannel.id : s.currentChannelId,
            };
          });
          
          alert('Failed to delete channel. Please try again.');
        } else {
          console.log('✅ Channel deleted successfully from Supabase:', data);
        }
      });
  }
},

  // NEW: Update channel name/description
  updateChannel: (channelId, updates) => {
    // Update local state
    set((s) => ({
      channels: s.channels.map(ch => 
        ch.id === channelId ? { ...ch, ...updates } : ch
      ),
    }));

    // Update Supabase
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('channels')
        .update({
          name: updates.name,
          description: updates.description,
        })
        .eq('id', channelId)
        .then(({ error }) => {
          if (error) {
            console.error('❌ Failed to update channel:', error);
          } else {
            console.log('✅ Channel updated successfully');
          }
        });
    }
  },

  // NEW: Add member to channel
  addChannelMember: (channelId, userId) => {
    const channel = get().channels.find(ch => ch.id === channelId);
    if (!channel) return;

    // Don't add if already a member
    if (channel.members.includes(userId)) return;

    // Update local state
    set((s) => ({
      channels: s.channels.map(ch =>
        ch.id === channelId
          ? { ...ch, members: [...ch.members, userId] }
          : ch
      ),
    }));

    // Add to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('channel_members')
        .insert([{
          channel_id: channelId,
          user_id: userId,
        }])
        .then(({ error }) => {
          if (error) {
            console.error('❌ Failed to add channel member:', error);
          } else {
            console.log('✅ Channel member added successfully');
          }
        });
    }
  },

  // NEW: Remove member from channel
  removeChannelMember: (channelId, userId) => {
    const channel = get().channels.find(ch => ch.id === channelId);
    if (!channel) return;

    // Don't remove the creator
    if (channel.createdBy === userId) {
      console.warn('Cannot remove channel creator');
      return;
    }

    // Update local state
    set((s) => ({
      channels: s.channels.map(ch =>
        ch.id === channelId
          ? { ...ch, members: ch.members.filter(id => id !== userId) }
          : ch
      ),
    }));

    // Remove from Supabase
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('❌ Failed to remove channel member:', error);
          } else {
            console.log('✅ Channel member removed successfully');
          }
        });
    }
  },

  // NEW: Leave channel (for members)
  leaveChannel: (channelId) => {
    const user = get().currentUser;
    const channel = get().channels.find(ch => ch.id === channelId);
    if (!user || !channel) return;

    // Don't allow creator to leave (they must delete or transfer ownership)
    if (channel.createdBy === user.id) {
      console.warn('Creator cannot leave channel. Delete it instead.');
      return;
    }

    // Update local state
    set((s) => ({
      channels: s.channels.filter(ch => ch.id !== channelId),
      currentChannelId: s.currentChannelId === channelId ? (s.channels[0]?.id || null) : s.currentChannelId,
    }));

    // Remove from Supabase
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('❌ Failed to leave channel:', error);
          } else {
            console.log('✅ Left channel successfully');
          }
        });
    }
  },

  markChannelRead: (channelId) =>
    set((s) => {
      const userId = s.currentUser?.id;
      if (!userId) return {};
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => m.readBy.includes(userId) ? m : { ...m, readBy: [...m.readBy, userId] }),
        },
        unreadCounts: { ...s.unreadCounts, [channelId]: 0 },
      };
    }),

  setTypingUser: (channelId, userId) =>
    set((s) => {
      const current = s.typingUsers[channelId] || [];
      if (current.includes(userId)) return {};
      return { typingUsers: { ...s.typingUsers, [channelId]: [...current, userId] } };
    }),

  clearTypingUser: (channelId, userId) =>
    set((s) => {
      const current = s.typingUsers[channelId] || [];
      return { typingUsers: { ...s.typingUsers, [channelId]: current.filter(u => u !== userId) } };
    }),

  setChatSearchQuery: (query) => set({ chatSearchQuery: query }),

  searchMessages: (query) => {
    const { messages } = get();
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const results: ChatMessage[] = [];
    for (const channelMsgs of Object.values(messages)) {
      for (const msg of channelMsgs) {
        if (!msg.deleted && msg.content.toLowerCase().includes(lower)) {
          results.push(msg);
        }
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getTotalUnread: () => {
    const { unreadCounts } = get();
    return Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);
  },

  // ── AI (empty — no mock recordings) ─────────────────────
  callRecordings: [],

  addCallRecording: (leadId, duration) =>
    set((s) => {
      const recording: CallRecording = {
        id: uuidv4(),
        leadId,
        timestamp: new Date().toISOString(),
        duration,
        audioUrl: `#recording-${Date.now()}`,
        transcription: null,
        analyzed: false,
      };
      const now = new Date().toISOString();
      return {
        callRecordings: [...s.callRecordings, recording],
        leads: s.leads.map(l =>
          l.id === leadId
            ? {
                ...l,
                updatedAt: now,
                timeline: [...l.timeline, {
                  id: uuidv4(),
                  type: 'call' as TimelineType,
                  content: `Voice recording captured (${Math.floor(duration / 60)}m ${duration % 60}s). Awaiting AI analysis...`,
                  timestamp: now,
                  user: 'You',
                  metadata: { recordingId: recording.id, hasTranscript: 'false' },
                }],
              }
            : l
        ),
      };
    }),

  analyzeRecording: (recordingId) =>
    set((s) => {
      const recording = s.callRecordings.find(r => r.id === recordingId);
      if (!recording || recording.analyzed) return {};
      const transcription = mockAnalyzeCall(recording.duration);
      const now = new Date().toISOString();
      return {
        callRecordings: s.callRecordings.map(r =>
          r.id === recordingId ? { ...r, transcription, analyzed: true } : r
        ),
        leads: s.leads.map(l =>
          l.id === recording.leadId
            ? {
                ...l,
                updatedAt: now,
                timeline: l.timeline.map(t =>
                  t.metadata?.recordingId === recordingId
                    ? {
                        ...t,
                        content: `📞 Call recorded & analyzed — ${transcription.summary.slice(0, 100)}...`,
                        metadata: { ...t.metadata, recordingId, hasTranscript: 'true' },
                      }
                    : t
                ),
              }
            : l
        ),
      };
    }),

  // ── Theme ────────────────────────────────────────────────
  currentTheme: (typeof window !== 'undefined' && localStorage.getItem('wholescale-theme')) || 'dark',
  setTheme: (theme) => {
    set({ currentTheme: theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-theme', theme);
      
      // Apply theme colors to DOM
      const themeData = themes[theme];
      if (themeData) {
        const root = document.documentElement;
        const customColors = get().customColors;
        
        // Apply base theme colors
        Object.entries(themeData.colors).forEach(([key, value]) => {
          const cssVar = `--t-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          // Override with custom colors if they exist
          if (customColors[key]) {
            root.style.setProperty(cssVar, customColors[key]);
          } else {
            root.style.setProperty(cssVar, value as string);
          }
        });
      }
    }
    if (supabase && isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user && supabase) {
          supabase
            .from('profiles')
            .select('settings')
            .eq('id', data.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile && supabase) {
                const existing = (profile.settings as Record<string, unknown>) || {};
                supabase
                  .from('profiles')
                  .update({ settings: { ...existing, theme } })
                  .eq('id', data.user.id)
                  .then(({ error }) => {
                    if (error) console.error('Failed to save theme:', error);
                    console.log('✅ Theme saved to Supabase:', theme);
                  });
              }
            });
        }
      });
    }
  },

  // NEW: Custom Theme Colors
  customColors: (() => {
    try {
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('wholescale-custom-colors') || '{}');
      }
      return {};
    } catch {
      return {};
    }
  })(),

  setCustomColor: (property, color) => {
    set((state) => {
      const newColors = { ...state.customColors, [property]: color };
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-custom-colors', JSON.stringify(newColors));
      }
      
      // Apply to DOM immediately
      const root = document.documentElement;
      const cssVar = `--t-${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, color);
      
      // Save to Supabase if user is logged in
      const { currentUser } = get();
      if (supabase && isSupabaseConfigured && currentUser) {
        supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .single()
          .then(({ data: profile }) => {
            if (profile && supabase) {
              const existing = (profile.settings as Record<string, unknown>) || {};
              const customSettings = (existing.customColors as Record<string, string>) || {};
              supabase
                .from('profiles')
                .update({ 
                  settings: { 
                    ...existing, 
                    customColors: { ...customSettings, [property]: color } 
                  } 
                })
                .eq('id', currentUser.id)
                .then(({ error }) => {
                  if (error) console.error('Failed to save custom color:', error);
                });
            }
          });
      }
      
      return { customColors: newColors };
    });
  },

  resetCustomColors: () => {
    set((state) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wholescale-custom-colors');
      }
      
      // Reset to theme defaults
      const themeData = themes[state.currentTheme];
      if (themeData && typeof window !== 'undefined') {
        const root = document.documentElement;
        Object.entries(themeData.colors).forEach(([key, value]) => {
          const cssVar = `--t-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(cssVar, value as string);
        });
      }
      
      // Save to Supabase
      const { currentUser } = get();
      if (supabase && isSupabaseConfigured && currentUser) {
        supabase
          .from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .single()
          .then(({ data: profile }) => {
            if (profile && supabase) {
              const existing = (profile.settings as Record<string, unknown>) || {};
              supabase
                .from('profiles')
                .update({ 
                  settings: { ...existing, customColors: {} } 
                })
                .eq('id', currentUser.id)
                .then(({ error }) => {
                  if (error) console.error('Failed to reset custom colors:', error);
                });
            }
          });
      }
      
      return { customColors: {} };
    });
  },

  getCurrentColors: () => {
    const state = get();
    const themeColors = themes[state.currentTheme]?.colors || themes.dark.colors;
    return { ...themeColors, ...state.customColors };
  },

  // ── Notifications (empty — loaded from Supabase) ─────────
  notifications: [],

  addNotification: (notif) => {
    const newId = uuidv4();
    set((s) => ({
      notifications: [
        { ...notif, id: newId, timestamp: new Date().toISOString(), read: false },
        ...s.notifications,
      ],
    }));
    const { currentUser } = get();
    if (isSupabaseConfigured && supabase && currentUser) {
      notificationsService.create({ id: newId, user_id: currentUser.id, type: notif.type, title: notif.title, message: notif.message }).catch(() => {});
    }
  },

  markNotificationRead: (id) => {
    set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    if (isSupabaseConfigured && supabase) notificationsService.markRead(id).catch(() => {});
  },

  markAllNotificationsRead: () => {
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }));
    const { currentUser } = get();
    if (isSupabaseConfigured && supabase && currentUser) notificationsService.markAllRead(currentUser.id).catch(() => {});
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
    const { currentUser } = get();
    if (isSupabaseConfigured && supabase && currentUser) notificationsService.clearAll(currentUser.id).catch(() => {});
  },

  deleteNotification: (id: string) => {
    set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) }));
    if (isSupabaseConfigured && supabase) notificationsService.remove(id).catch(() => {});
  },

  // ── Import ──────────────────────────────────────────────
  importTemplates: [],
  importHistory: [],

  duplicateSettings: {
    enabled: true,
    matchFields: ['email', 'phone', 'address'],
    action: 'skip' as const,
  },

  addImportTemplate: (template) =>
    set((s) => ({
      importTemplates: [...s.importTemplates, { ...template, id: uuidv4(), createdAt: new Date().toISOString() }],
    })),

  deleteImportTemplate: (id) =>
    set((s) => ({ importTemplates: s.importTemplates.filter((t) => t.id !== id) })),

  addImportHistory: (entry) =>
    set((s) => ({
      importHistory: [
        { ...entry, id: uuidv4(), timestamp: new Date().toISOString() },
        ...s.importHistory,
      ],
    })),

  updateDuplicateSettings: (settings) =>
    set((s) => ({ duplicateSettings: { ...s.duplicateSettings, ...settings } })),

  getMockSheetData: () => {
    return MOCK_SHEET_DATA[0];
  },

  getMockScrapedProperty: (_url: string) => {
    const idx = Math.floor(Math.random() * MOCK_SCRAPED_PROPERTIES.length);
    return MOCK_SCRAPED_PROPERTIES[idx];
  },

  getMockPdfExtraction: () => {
    return MOCK_PDF_EXTRACTIONS;
  },

  importLeadsFromData: (data) => {
    const state = get();
    const now = new Date().toISOString();
    let imported = 0;

    const newLeads: Lead[] = [];
    for (const d of data) {
      if (!d.name?.trim() && !d.address?.trim()) continue;

      if (state.duplicateSettings.enabled) {
        const isDuplicate = state.leads.some((l) => {
          return (
            (state.duplicateSettings.matchFields.includes('email') && d.email && l.email === d.email) ||
            (state.duplicateSettings.matchFields.includes('phone') && d.phone && l.phone === d.phone) ||
            (state.duplicateSettings.matchFields.includes('address') && d.address && l.propertyAddress === d.address)
          );
        });
        if (isDuplicate && state.duplicateSettings.action === 'skip') continue;
      }

      const lead: Lead = {
        id: uuidv4(),
        name: d.name || 'Unknown',
        email: d.email || '',
        phone: d.phone || '',
        status: 'new',
        source: d.source || 'other',
        propertyAddress: d.address || '',
        propertyType: d.propertyType || 'single-family',
        estimatedValue: d.value || 0,
        offerAmount: 0,
        lat: 30.2672,
        lng: -97.7431,
        notes: d.notes || '',
        assignedTo: '',
        createdAt: now,
        updatedAt: now,
        probability: 40,
        engagementLevel: 2,
        timelineUrgency: 3,
        competitionLevel: 3,
        importSource: (d as any).importSource || 'import',
        photos: (d as any).photos || [],
        timeline: [{
          id: uuidv4(), type: 'note' as TimelineType,
          content: `Imported via bulk import.${d.notes ? ` Notes: ${d.notes}` : ''}`,
          timestamp: now, user: 'System',
        }],
        statusHistory: [{ fromStatus: null, toStatus: 'new', timestamp: now, changedBy: 'Import' }],
      };
      newLeads.push(lead);
      imported++;
    }

    set((s) => ({ leads: [...s.leads, ...newLeads] }));

    if (supabase && isSupabaseConfigured && get().teamId) {
      const teamId = get().teamId;
      const rows = newLeads.map(lead => ({
        id: lead.id,
        team_id: teamId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address: lead.propertyAddress,
        property_type: lead.propertyType,
        property_value: lead.estimatedValue,
        offer_amount: lead.offerAmount,
        status: lead.status,
        source: lead.source,
        notes: lead.notes,
        lat: lead.lat,
        lng: lead.lng,
        assigned_to: lead.assignedTo || null,
        probability: lead.probability,
        engagement_level: lead.engagementLevel,
        timeline_urgency: lead.timelineUrgency,
        competition_level: lead.competitionLevel,
        import_source: lead.importSource || 'import',
        photos: lead.photos || [],
        created_at: lead.createdAt,
        updated_at: lead.updatedAt,
      }));

      supabase.from('leads').insert(rows).then(({ error }) => {
        if (error) {
          console.error('❌ Failed to save imported leads to Supabase:', error);
        } else {
          console.log(`✅ ${rows.length} imported leads saved to Supabase`);
        }
      });
    }

    return imported;
  },

  // ── Streaks (start at 0) ────────────────────────────────
  loginStreak: 0,
  taskStreak: 0,
  lastLoginDate: new Date().toISOString(),
  longestStreak: 0,
  memberStreaks: {
    '1': { login: 5, task: 12 },
    '2': { login: 3, task: 8 },
    '3': { login: 0, task: 0 },
    '4': { login: 12, task: 45 },
    '5': { login: 1, task: 2 },
  },

  incrementLoginStreak: () =>
    set((s) => {
      const today = new Date().toDateString();
      const lastLogin = new Date(s.lastLoginDate).toDateString();
      if (today === lastLogin) return {};
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastLogin === yesterday ? s.loginStreak + 1 : 1;
      return {
        loginStreak: newStreak,
        lastLoginDate: new Date().toISOString(),
        longestStreak: Math.max(s.longestStreak, newStreak),
      };
    }),

  // ── Lead Photos ─────────────────────────────────────────
  addLeadPhoto: (leadId, photoId) =>
    set((s) => ({
      leads: s.leads.map(l =>
        l.id === leadId
          ? { ...l, photos: [...(l.photos || []), photoId], updatedAt: new Date().toISOString() }
          : l
      ),
    })),

  removeLeadPhoto: (leadId, photoId) =>
    set((s) => ({
      leads: s.leads.map(l =>
        l.id === leadId
          ? { ...l, photos: (l.photos || []).filter(p => p !== photoId), updatedAt: new Date().toISOString() }
          : l
      ),
    })),

  reorderLeadPhotos: (leadId, photos) =>
    set((s) => ({
      leads: s.leads.map(l =>
        l.id === leadId ? { ...l, photos, updatedAt: new Date().toISOString() } : l
      ),
    })),

  // ── SMS ──────────────────────────────────────────────────
  setSMSMessages: (messages) => {
    const unreadCount = messages.filter(m => !m.is_read && m.direction === 'inbound').length;
    set((state: any) => ({ 
      smsMessages: messages,
      unreadCounts: { ...state.unreadCounts, sms: unreadCount }
    }));
  },

  addSMSMessage: (message) => {
    set((state: any) => {
      const exists = state.smsMessages.some((m: any) => m.id === message.id || (m.gmail_message_id && m.gmail_message_id === message.gmail_message_id));
      if (exists) return state;

      const newMessages = [message, ...state.smsMessages];
      const unreadCount = newMessages.filter((m: any) => !m.is_read && m.direction === 'inbound').length;
      return {
        smsMessages: newMessages,
        unreadCounts: { ...state.unreadCounts, sms: unreadCount }
      };
    });
  },

  markSMSAsRead: (phone) => {
    set((state: any) => {
      const nextMessages = state.smsMessages.map((m: any) => 
        m.phone_number === phone && m.direction === 'inbound' ? { ...m, is_read: true } : m
      );
      const unreadCount = nextMessages.filter((m: any) => !m.is_read && m.direction === 'inbound').length;
      return {
        smsMessages: nextMessages,
        unreadCounts: { ...state.unreadCounts, sms: unreadCount }
      };
    });
  },

  setShowFloatingAIWidget: (v) => set({ showFloatingAIWidget: v }),

  setShortcutsEnabled: (v) => {
    set({ shortcutsEnabled: v });
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-shortcuts-enabled', v ? 'true' : 'false');
    }
  },

  incrementAiUsage: (model) => {
    set((s) => {
      const today = new Date().toISOString().split('T')[0];
      const current = s.aiUsage[model] || { used: 0, limit: model.includes('pro') ? 10 : 20, lastReset: today };
      
      const updated = {
        ...current,
        used: current.lastReset === today ? current.used + 1 : 1,
        lastReset: today
      };
      
      const newUsage = { ...s.aiUsage, [model]: updated };
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_usage_map', JSON.stringify(newUsage));
      }
      return { aiUsage: newUsage };
    });
  },

  setAiUsage: (model, used, limit) => {
    set((s) => {
      const today = new Date().toLocaleDateString();
      const current = s.aiUsage[model] || { used: 0, limit: model.includes('pro') ? 10 : 20, lastReset: today };
      
      const updated = {
        ...current,
        used,
        limit: limit || current.limit,
        lastReset: today
      };
      
      const newUsage = { ...s.aiUsage, [model]: updated };
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_usage_map', JSON.stringify(newUsage));
      }
      return { aiUsage: newUsage };
    });
  },

  createAiThread: (title) => {
    const id = uuidv4();
    const newThread: AIThread = {
      id,
      title: title || 'New Conversation',
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    };
    set((s) => {
      const updatedThreads = [newThread, ...s.aiThreads];
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_threads', JSON.stringify(updatedThreads));
        localStorage.setItem('current_ai_thread_id', id);
      }
      return { 
        aiThreads: updatedThreads, 
        currentAiThreadId: id,
        aiMessages: { ...s.aiMessages, [id]: [] }
      };
    });
    return id;
  },

  deleteAiThread: (id) => {
    set((s) => {
      const updatedThreads = s.aiThreads.filter(t => t.id !== id);
      const newMessages = { ...s.aiMessages };
      delete newMessages[id];
      
      let newCurrentId = s.currentAiThreadId;
      if (s.currentAiThreadId === id) {
        newCurrentId = updatedThreads.length > 0 ? updatedThreads[0].id : null;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_threads', JSON.stringify(updatedThreads));
        if (newCurrentId) localStorage.setItem('current_ai_thread_id', newCurrentId);
        else localStorage.removeItem('current_ai_thread_id');
        localStorage.setItem('ai_messages_map', JSON.stringify(newMessages));
      }

      return { 
        aiThreads: updatedThreads, 
        currentAiThreadId: newCurrentId,
        aiMessages: newMessages
      };
    });
  },

  setCurrentAiThread: (id) => {
    set({ currentAiThreadId: id });
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_ai_thread_id', id);
    }
  },

  updateAiThreadTitle: (id, title) => {
    set((s) => {
      const updatedThreads = s.aiThreads.map(t => t.id === id ? { ...t, title } : t);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_threads', JSON.stringify(updatedThreads));
      }
      return { aiThreads: updatedThreads };
    });
  },

  toggleAiThreadPin: (id: string) => {
    set((s) => {
      const updatedThreads = s.aiThreads.map((t: AIThread) => t.id === id ? { ...t, pinned: !t.pinned } : t)
        .sort((a: AIThread, b: AIThread) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_threads', JSON.stringify(updatedThreads));
      }
      return { aiThreads: updatedThreads };
    });
  },

  addAiMessage: (threadId: string, message: AIBotMessage) => {
    set((s) => {
      const threadMessages = s.aiMessages[threadId] || [];
      const updatedMessages = [...threadMessages, message];
      const newMessagesMap = { ...s.aiMessages, [threadId]: updatedMessages };
      
      // Update lastMessageAt for the thread and sort by pinned then date
      const updatedThreads = s.aiThreads.map((t: AIThread) => 
        t.id === threadId ? { ...t, lastMessageAt: new Date().toISOString() } : t
      ).sort((a: AIThread, b: AIThread) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_messages_map', JSON.stringify(newMessagesMap));
        localStorage.setItem('ai_threads', JSON.stringify(updatedThreads));
      }

      return { aiMessages: newMessagesMap, aiThreads: updatedThreads };
    });
  },

  clearAiThreadMessages: (threadId) => {
    set((s) => {
      const newMessagesMap = { ...s.aiMessages, [threadId]: [] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_messages_map', JSON.stringify(newMessagesMap));
      }
      return { aiMessages: newMessagesMap };
    });
  },

  addContact: (contact) => {
    const newContact: SavedContact = {
      ...contact,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    set((state: AppState) => {
      const next = [...state.contacts, newContact];
      if (typeof window !== 'undefined') {
        localStorage.setItem('sms_contacts', JSON.stringify(next));
      }
      return { contacts: next };
    });
  },

  removeContact: (id) => {
    set((state: AppState) => {
      const next = state.contacts.filter((c) => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sms_contacts', JSON.stringify(next));
      }
      return { contacts: next };
    });
  },

  updateContact: (id, updates) => {
    set((state: AppState) => {
      const next = state.contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('sms_contacts', JSON.stringify(next));
      }
      return { contacts: next };
    });
  },

  setQuickNotes: (v: string) => {
    set({ quickNotes: v });
    if (typeof window !== 'undefined') {
      localStorage.setItem('tasks_quick_notes', v);
    }
    
    // Sync to Supabase profile settings
    const { currentUser } = get();
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      supabase.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then(({ data }) => {
          const settings = data?.settings || {};
          if (isSupabaseConfigured && supabase) {
            supabase.from('profiles')
              .update({ settings: { ...settings, quick_notes: v } })
              .eq('id', currentUser.id)
              .then();
          }
        });
    }
  },

  // AI Bot Name
  aiName: typeof window !== 'undefined' ? localStorage.getItem('user_ai_name') || 'OS Bot' : 'OS Bot',
  setAiName: (name) => {
    set({ aiName: name });
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_ai_name', name);
    }
  },

  aiModel: typeof window !== 'undefined' ? localStorage.getItem('user_ai_model') || 'gemini-2.0-flash-lite' : 'gemini-2.0-flash-lite',
  setAiModel: (model) => {
    set({ aiModel: model });
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_ai_model', model);
    }
  },
}));