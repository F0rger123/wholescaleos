import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { leadsService, tasksService, teamService, chatService, notificationsService, mapService } from '../lib/supabase-service';
import { themes } from '../styles/themes';
import { automationEngine } from '../lib/automation-engine';

const normalizePhone = (p: string) => p.replace(/\D/g, '');

// ——————————————————————————————————————————————————————————————————————————————————————————————————

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'closed-won' | 'closed-lost' | 'contract-in' | 'under-contract' | 'follow-up';

export function isValidStatus(status: unknown): status is LeadStatus {
  return typeof status === 'string' && ['new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost', 'contract-in', 'under-contract', 'follow-up'].includes(status);
}

export function ensureStringStatus(status: unknown): LeadStatus {
  if (isValidStatus(status)) return status;
  return 'new';
}

export type Timeframe = '7d' | '30d' | '90d' | 'all';
export type LeadSource =
  | 'bandit-signs'
  | 'personal-relations'
  | 'pay-per-lead'
  | 'doorknocking'
  | 'referral'
  | 'website'
  | 'social-media'
  | 'open-house'
  | 'fsbo'
  | 'cold-call'
  | 'email-campaign'
  | 'ai_bot'
  | 'other';
export type PropertyType = 'single-family' | 'multi-family' | 'commercial' | 'land' | 'condo';
export type TimelineType = 'call' | 'email' | 'note' | 'status-change' | 'meeting' | 'task';

export interface LeadDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}
export type PresenceStatus = 'online' | 'offline' | 'busy' | 'dnd';
export type TeamRole = 'admin' | 'member' | 'viewer';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'cancelled';

// ——— Chat Types ——————————————————————————————————————————————————————————————————————————————————

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

// ——— AI Bot Types ————————————————————————————————————————————————————————————————————————————————

export interface AIUsage {
  used: number;
  limit: number;
  lastReset: string;
  lastUpdated?: string;
}

export const AI_PLAN_LIMITS: Record<string, number> = {
  'Free': 50,
  'Solo': 500,
  'Pro': 5000,
  'Team': 50000,
  'Agency': 500000
};

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

// ——— Existing Types ———————————————————————————————————————————————————————————————————————————————

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
  city?: string;
  state?: string;
  zip?: string;
  propertyType: string;
  estimatedValue: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  offerAmount: number;
  lat: number;
  lng: number;
  notes: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  lastContact?: string;
  probability: number;
  engagementLevel: number;
  timelineUrgency: number;
  competitionLevel: number;
  importSource?: string;
  photos?: string[];
  carrier?: string;
  lastSoldPrice?: number;
  lastSoldDate?: string;
  estimatedEquity?: number;
  recommendedOffer?: number;
  shareDescription?: string;
  sharePrice?: number;
  shareCustomMessage?: string;
  sharePhotoUrl?: string;
  sharePassword?: string;
  shareEnabled?: boolean;
  documents: LeadDocument[];
  timeline: TimelineEntry[];
  statusHistory: StatusHistoryEntry[];
  dealScore?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  full_name?: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  avatarUrl?: string;
  dealsCount: number;
  revenue: number;
  presenceStatus: PresenceStatus;
  lastSeen: string;
  customStatus: string;
  teamRole: TeamRole;
}

export interface AgentTestimonial {
  id: string;
  author: string;
  role?: string;
  content: string;
  rating: number;
  date: string;
}

export interface AutomatedReportSettings {
  dailySummary: boolean;
  weeklySummary: boolean;
  dealClosed: boolean;
  offerMade: boolean;
  calendarDigest: boolean;
  lastDailySent?: string;
  lastWeeklySent?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  avatarUrl?: string;
  teamRole: TeamRole;
  emailVerified: boolean;
  createdAt: string;
  bio?: string;
  specialties?: string[];
  licenseNumber?: string;
  yearsExperience?: number;
  languages?: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    x?: string;
  };
  serviceAreas?: string[];
  testimonials?: AgentTestimonial[];
  isPublic?: boolean;
  publicContactEmail?: boolean;
  publicContactPhone?: boolean;
  acceptLeads?: boolean;
  website?: string;
  aiCustomInstructions?: string;
  settings?: Record<string, any>;
  stripeCustomerId?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  role?: string;
  referralCode?: string;
  referredBy?: string;
  totalEarnings?: number;
  availableEarnings?: number;
  referralCount?: number;
  user_api_keys?: Record<string, string | string[]>;
  preferred_api_provider?: string;
  api_fallback_enabled?: boolean;
  smart_rotate_enabled?: boolean;
  premium_credits?: number;
  credits_remaining?: number;
  credits_reset_at?: string;
  total_credits_used_today?: number;
  onboarding_ai_choice_seen?: boolean;
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
  email?: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

export interface TeamMilestone {
  id: string;
  type: 'leads' | 'deals' | 'revenue' | 'other';
  target: number;
  current: number;
  label: string;
}

export interface TeamConfig {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  createdBy: string;
  maxSeats: number;
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

export interface CursorSettings {
  type: 'glow' | 'trail' | 'spotlight' | 'sparkles' | 'none';
  color: string;
  size: number;
  enabled: boolean;
  intensity: number;
}

// ——— Import Types ————————————————————————————————————————————————————————————————————————————————

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
  yearBuilt?: number;
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

// ——— Notification Types ———————————————————————————————————————————————————————————————————————————

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
  dndEnabled: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  newLead: true,
  taskDue: true,
  smsReceived: true,
  appointmentReminder: true,
  systemUpdates: true,
  emailNotifications: true,
  smsNotifications: true,
  dndEnabled: false,
};

// ——— Calculator Types —————————————————————————————————————————————————————————————————————————————

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

// ——— AI Types —————————————————————————————————————————————————————————————————————————————————————

// AIUsage interface is now defined at the top of the file

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

// ——— Utilities ————————————————————————————————————————————————————————————————————————————————————

export function calculateDealScore(lead: Lead): number {
  const valueCap = 1500000;
  const valueScore = Math.min(Math.log10(Math.max(1, lead.estimatedValue || 0)) / Math.log10(valueCap), 1) * 100;
  const probScore = lead.probability || 40;
  const engageScore = ((lead.engagementLevel || 3) - 1) * 25;
  const urgencyScore = ((lead.timelineUrgency || 3) - 1) * 25;
  const competitionScore = (5 - (lead.competitionLevel || 3)) * 25;
  
  // Source Weight (High-quality sources boost the score)
  const sourceQuality: Record<string, number> = {
    'personal-relations': 20,
    'referral': 15,
    'fsbo': 10,
    'pay-per-lead': 5,
    'bandit-signs': -5,
  };
  const sourceBoost = sourceQuality[lead.source] || 0;

  const raw = (
    valueScore * 0.35 +
    probScore * 0.20 +
    engageScore * 0.15 +
    urgencyScore * 0.15 +
    competitionScore * 0.10 +
    sourceBoost
  );

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

export function getScoreColor(score: number) {
  if (score >= 80) return {
    bg: 'rgba(21, 128, 61, 0.15)',
    text: '#15803D',
    ring: 'box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.4)',
    bar: '#15803D',
    label: 'Elite'
  };
  if (score >= 60) return {
    bg: 'rgba(77, 124, 15, 0.15)',
    text: '#4D7C0F',
    ring: 'box-shadow: 0 0 0 3px rgba(77, 124, 15, 0.4)',
    bar: '#4D7C0F',
    label: 'High'
  };
  if (score >= 40) return {
    bg: 'rgba(180, 83, 9, 0.15)',
    text: '#B45309',
    ring: 'box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.4)',
    bar: '#B45309',
    label: 'Warn'
  };
  if (score >= 20) return {
    bg: 'rgba(194, 65, 12, 0.15)',
    text: '#C2410C',
    ring: 'box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.4)',
    bar: '#C2410C',
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
  return leads.filter(l => {
    if (l.lat == null || l.lng == null) return false;
    return isPointInPolygon([l.lat, l.lng], area.coordinates);
  });
}

// ——— AI Utility Functions —————————————————————————————————————————————————————————————————————————

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
    'bandit-signs': 60,
    'personal-relations': 95,
    'pay-per-lead': 80,
    'doorknocking': 75,
    'referral': 90,
    'website': 65,
    'social-media': 55,
    'open-house': 70,
    'fsbo': 85,
    'cold-call': 70,
    'email-campaign': 50,
    'ai_bot': 75,
    'other': 40,
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
    return { ...base, type: 'follow-up', title: 'Send thank-you & request Revenue Share', description: 'Deal is closed! Send a thank-you note and ask for Revenue Share partners to build your pipeline.', priority: 'low', confidence: 85, actionLabel: 'Send Email' };
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
    text: "Great call with a Revenue Share lead. Very warm introduction — the referring attorney had already explained our process. The owner has an inherited property they don't want to manage. No emotional attachment to the property. They want a clean, simple transaction. Discussed our all-cash offer and 21-day closing timeline. They were pleased with both. Main question was about title clearing since there's a potential lien from a contractor. I assured them our title company handles that. Scheduling a walkthrough for this Thursday at 2pm. This one should move fast.",
    sentiment: 'positive',
    objections: ['Potential contractor lien on title', 'Questions about title clearing process'],
    nextSteps: ['Schedule walkthrough for Thursday 2pm', 'Order preliminary title search immediately', 'Prepare offer based on comparable sales', 'Send process overview document'],
    keyPoints: ['Revenue Share from attorney — warm lead', 'Inherited property, no emotional attachment', 'Wants clean, simple transaction', 'All-cash offer well-received', '21-day close acceptable', 'Possible contractor lien to resolve'],
    summary: 'Excellent Revenue Share lead — inherited property with no emotional attachment. Owner wants simplicity. Cash offer and 21-day close were well received. Only concern is a possible contractor lien, which our title company will handle. Walkthrough scheduled for Thursday.',
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

// ——— Smart Paste Parsing Utilities ————————————————————————————————————————————————————————————————

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

  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const lines = cleanText.split('\n').filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], headers: [], columns: [], delimiter: ',', rowCount: 0 };
  }

  let delimiter = detectDelimiterSmart(lines);
  const allRows: string[][] = [];

  for (const line of lines) {
    let cells: string[] = [];

    if (delimiter === 'smart') {
      cells = parseUnstructuredText(line);
    } else if (delimiter === ',') {
      cells = parseCSVLine(line);
    } else if (delimiter === 'spaces') {
      cells = line.split(/\s{2,}/).map(c => c.trim());
    } else {
      cells = line.split(delimiter).map(c => c.trim());
    }

    if (cells.length === 1 && cells[0] === line && (line.includes(',') || line.includes('\t') || line.includes('|'))) {
      for (const delim of ['\t', ',', '|', ';']) {
        const split = line.split(delim).map(c => c.trim());
        if (split.length > 1) {
          cells = split;
          delimiter = delim;
          break;
        }
      }
    }

    if (cells.length === 1) {
      cells = parseNaturalLanguage(line);
    }

    allRows.push(cells);
  }

  const maxCols = Math.max(...allRows.map(r => r.length));
  const normalized = allRows.map(r => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  const hasHeader = detectHeaderSmart(normalized);
  const headers = hasHeader ? normalized[0] : [];
  const dataRows = hasHeader ? normalized.slice(1) : normalized;

  if (dataRows.length === 0 && normalized.length > 0) {
    return {
      rows: normalized,
      headers: [],
      columns: detectColumnsFromData(normalized, []),
      delimiter: delimiter === 'smart' ? 'auto' : delimiter,
      rowCount: normalized.length,
    };
  }

  const columns = detectColumnsFromData(dataRows, headers);

  return {
    rows: dataRows,
    headers,
    columns,
    delimiter: delimiter === 'smart' ? 'auto' : delimiter,
    rowCount: dataRows.length,
  };
}

function detectDelimiterSmart(lines: string[]): string {
  if (lines.length === 0) return ',';
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
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

    if (totalCount > 0) {
      scores[delim.char] = totalCount * (consistentCount ? 3 : 1);
    }
  }

  let bestDelim = ',';
  let bestScore = 0;

  for (const [delim, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDelim = delim;
    }
  }

  if (bestScore > 2) {
    return bestDelim;
  }

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

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
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

function parseUnstructuredText(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const emailNamePattern = /^([^<]+)<([^>]+)>\s*(.*)$/;
  const emailMatch = trimmed.match(emailNamePattern);
  if (emailMatch) {
    const parts = [emailMatch[1].trim(), emailMatch[2].trim(), emailMatch[3].trim()].filter(p => p);
    if (parts.length > 1) return parts;
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }

  if (trimmed.includes('\t')) {
    const parts = trimmed.split('\t').map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }

  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }

  if (/\s{2,}/.test(trimmed)) {
    const parts = trimmed.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
    if (parts.length > 1) return parts;
  }

  return parseNaturalLanguage(trimmed);
}

function parseNaturalLanguage(text: string): string[] {
  const fields: string[] = [];

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    fields.push(emailMatch[0]);
    text = text.replace(emailMatch[0], '').trim();
  }

  const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    fields.push(phoneMatch[1]);
    text = text.replace(phoneMatch[1], '').trim();
  }

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

  const addressRegex = /\d+\s+[A-Za-z\s,]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Court|Ct|Way|Circle|Cir|Parkway|Pkwy|Highway|Hwy)/i;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    fields.push(addressMatch[0].trim());
    text = text.replace(addressMatch[0], '').trim();
  }

  const nameRegex = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/;
  const nameMatch = text.match(nameRegex);
  if (nameMatch) {
    fields.unshift(nameMatch[1]);
    text = text.replace(nameMatch[1], '').trim();
  }

  if (fields.length > 0) {
    return fields;
  }

  return [text];
}

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

    if (header.length > 0 && header.length < 30) {
      if (/^[a-zA-Z\s]+$/.test(header) && !/\d/.test(header)) {
        headerScore += 3;
      }
      if (!header.includes('@') && !header.match(/\(?\d{3}\)?/)) {
        headerScore += 2;
      }
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(header)) {
        headerScore += 2;
      }
    }

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

function detectColumnsFromData(dataRows: string[][], headers: string[]): ParsedColumn[] {
  if (dataRows.length === 0) return [];

  const colCount = Math.max(...dataRows.map(r => r.length), headers.length);
  const columns: ParsedColumn[] = [];

  for (let col = 0; col < colCount; col++) {
    const values = dataRows.map(r => r[col] || '').filter(v => v.trim().length > 0);
    const { type, confidence } = detectFieldType(values);
    const samples = values.slice(0, 3);

    let name = headers[col] || `Column ${col + 1}`;

    if (name) {
      name = name
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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

function detectFieldType(values: string[]): { type: ParsedColumn['detectedType']; confidence: number } {
  if (values.length === 0) {
    return { type: 'text', confidence: 0 };
  }

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

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(trimmed)) {
        typeMatches[type]++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const words = trimmed.split(/\s+/);
      if (words.length >= 2 && words.length <= 4) {
        const capitalizedWords = words.filter(w => /^[A-Z][a-z]*$/.test(w)).length;
        if (capitalizedWords >= words.length - 1) {
          typeMatches.name++;
          continue;
        }
      }

      if (/^\d+\s+[a-zA-Z]/.test(trimmed)) {
        typeMatches.address++;
        continue;
      }

      typeMatches.text++;
    }
  }

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
  'contract-in': ['closed-won', 'closed-lost'],
  'under-contract': ['closed-won', 'closed-lost'],
  'follow-up': ['contacted', 'qualified', 'closed-lost'],
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  'new': 'New',
  'contacted': 'Contacted',
  'qualified': 'Qualified',
  'negotiating': 'Negotiating',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
  'contract-in': 'Contract In',
  'under-contract': 'Under Contract',
  'follow-up': 'Follow-up',
};

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '💯'];

// ——— Default Auth (used by demo login only) ——————————————————————————————————————————————————————

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

export interface ThemePreset {
  id: string;
  name: string;
  themeId: string;
  customColors: Record<string, string>;
  createdAt: string;
}

// ——— Store ————————————————————————————————————————————————————————————————————————————————————————

interface AppState {
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, password: string) => void;
  logout: () => void;
  forgotPassword: (email: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  fetchProfile: (userId: string) => Promise<void>;
  loadLeads: () => Promise<void>;
  clearAuthError: () => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  fetchSubscription: (userId: string) => Promise<void>;
  applyReferralCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  teamId: string | null;
  dataLoaded: boolean;
  isSyncing: boolean;
  setTeamId: (id: string | null) => void;
  setDataLoaded: (loaded: boolean) => void;
  setBulkData: (data: Record<string, unknown>) => void;
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'statusHistory'>) => Promise<{ success: boolean; id?: string; error?: any }>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<{ success: boolean; error?: any }>;
  deleteLead: (id: string) => Promise<{ success: boolean; error?: any }>;
  addTimelineEntry: (leadId: string, entry: Omit<TimelineEntry, 'id'>) => void;
  updateLeadStatus: (leadId: string, newStatus: LeadStatus, changedBy: string) => Promise<{ success: boolean; error?: any }>;
  team: TeamMember[];
  teamConfig: TeamConfig;
  updateMemberStatus: (id: string, status: PresenceStatus) => void;
  setCustomStatus: (id: string, msg: string) => void;
  updateMemberRole: (id: string, role: TeamRole) => void;
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  removeTeamMember: (id: string) => void;
  regenerateInviteCode: () => void;
  updateTeamConfig: (updates: Partial<TeamConfig>) => void;
  transferTeamOwnership: (memberId: string) => void;
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  calculatorScenarios: CalculatorScenario[];
  addCalculatorScenario: (scenario: Omit<CalculatorScenario, 'id' | 'date' | 'lastModified'>) => string;
  updateCalculatorScenario: (id: string, updates: Partial<CalculatorScenario>) => void;
  deleteCalculatorScenario: (id: string) => void;
  getScenariosByLead: (leadId: string) => CalculatorScenario[];
  sidebarOpen: boolean;
  toggleSidebar: () => void;
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
  updateChannel: (channelId: string, updates: Partial<Pick<ChatChannel, 'name' | 'description'>>) => void;
  addChannelMember: (channelId: string, userId: string) => void;
  removeChannelMember: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string) => void;
  callRecordings: CallRecording[];
  addCallRecording: (leadId: string, duration: number) => void;
  analyzeRecording: (recordingId: string) => void;
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
  importLeadsFromData: (data: Array<any>, onProgress?: (current: number, total: number) => void) => Promise<{ imported: number; skipped: number; duplicates: number }>;
  currentTheme: string;
  setTheme: (theme: string) => void;
  customColors: Record<string, string>;
  setCustomColor: (property: string, color: string) => void;
  resetCustomColors: () => void;
  getCurrentColors: () => Record<string, string>;
  themePresets: ThemePreset[];
  saveThemePreset: (name: string) => void;
  deleteThemePreset: (id: string) => void;
  applyThemePreset: (preset: ThemePreset) => void;
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;
  deleteNotification: (id: string) => void;
  loginStreak: number;
  taskStreak: number;
  lastLoginDate: string;
  longestStreak: number;
  memberStreaks: Record<string, { login: number; task: number }>;
  loginStreakHistory: string[];
  incrementLoginStreak: () => void;
  addLeadPhoto: (leadId: string, photoId: string) => void;
  removeLeadPhoto: (leadId: string, photoId: string) => void;
  reorderLeadPhotos: (leadId: string, photos: string[]) => void;
  smsMessages: SMSMessage[];
  setSMSMessages: (messages: SMSMessage[]) => void;
  addSMSMessage: (message: SMSMessage) => void;
  markSMSAsRead: (phoneNumber: string) => void;
  syncSMSUnreadCount: () => Promise<void>;
  showFloatingAIWidget: boolean;
  isAiDocked: boolean;
  setShowFloatingAIWidget: (v: boolean) => void;
  setAiDocked: (v: boolean) => void;
  showGoalsForToday: boolean;
  setShowGoalsForToday: (v: boolean) => void;
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (v: boolean) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  calendarEvents: any[];
  mergedGoogleEvents: any[];
  setCalendarEvents: (events: any[]) => void;
  setMergedGoogleEvents: (events: any[]) => void;
  aiUsage: Record<string, AIUsage>;
  incrementAiUsage: (amount?: number) => Promise<void>;
  setAiUsage: (model: string, used: number, limit?: number) => void;
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
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void;
  smsAutoReplyEnabled: boolean;
  smsAutoReplyMessage: string;
  setSMSAutoReplyEnabled: (v: boolean) => void;
  setSMSAutoReplyMessage: (msg: string) => void;
  contacts: SavedContact[];
  addContact: (contact: Omit<SavedContact, 'id' | 'createdAt'>) => void;
  removeContact: (id: string) => void;
  updateContact: (id: string, updates: Partial<SavedContact>) => void;
  quickNotes: string;
  setQuickNotes: (v: string) => void;
  showQuickNotes: boolean;
  setShowQuickNotes: (v: boolean) => void;
  isQuickNotesOpen: boolean;
  setQuickNotesOpen: (v: boolean) => void;
  isAiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  notesDocked: boolean;
  setNotesDocked: (v: boolean) => void;
  quickNotesSize: 'small' | 'medium' | 'large';
  setQuickNotesSize: (v: 'small' | 'medium' | 'large') => void;
  isQuickNotesCollapsed: boolean;
  setIsQuickNotesCollapsed: (v: boolean) => void;
  searchResults: { leads: Lead[]; tasks: Task[]; sms: SMSMessage[] };
  performSearch: (query: string) => void;
  aiName: string;
  setAiName: (name: string) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  premiumMessagesLeft: number;
  decrementPremiumMessages: () => void;
  aiPersonality: string;
  setAiPersonality: (personality: string) => void;
  aiCustomPrompt: string;
  setAiCustomPrompt: (prompt: string) => void;
  aiTone: string;
  setAiTone: (tone: string) => void;
  isAiFirstUse: boolean;
  setIsAiFirstUse: (v: boolean) => void;
  dashboardLayout: any[];
  setDashboardLayout: (layout: any[]) => void;
  activeLeadModalId: string | null;
  setActiveLeadModalId: (id: string | null) => void;
  cursorSettings: CursorSettings;
  setCursorSettings: (settings: Partial<CursorSettings>) => void;
  history: any[];
  future: any[];
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  clearHistory: () => void;
  lastAutoSave: string | null;
  backups: Array<{ id: string, timestamp: string, name: string, data: any }>;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  manualSave: () => Promise<void>;
  createBackup: (name?: string) => void;
  revertToBackup: (id: string) => void;
  deleteBackup: (id: string) => void;
  exportData: () => void;
  milestones: TeamMilestone[];
  updateMilestone: (id: string, current: number) => void;
  addMilestone: (milestone: Omit<TeamMilestone, 'id'>) => void;
  deleteMilestone: (id: string) => void;
  setMilestones: (milestones: TeamMilestone[]) => void;
  getMemberPrice: (tier: string) => number;
  canAddMember: () => { can: boolean; reason?: string };
  isAutomationRunning: boolean;
  setIsAutomationRunning: (v: boolean) => void;
  sendAutomationSms: (leadId: string, content: string) => Promise<void>;
  sendAutomationEmail: (leadId: string, subject: string, content: string) => Promise<void>;
  preferred_api_provider: string;
  setPreferredApiProvider: (v: string) => void;
  api_fallback_enabled: boolean;
  setApiFallbackEnabled: (v: boolean) => void;
  smart_rotate_enabled: boolean;
  setSmartRotateEnabled: (v: boolean) => void;
  credits_remaining: number;
  setCreditsRemaining: (v: number) => void;
  credits_reset_at: string | null;
  total_credits_used_today: number;
  onboarding_ai_choice_seen: boolean;
  refreshCredits: () => Promise<void>;
  setOnboardingAiChoiceSeen: (v: boolean) => void;
}

const calculateSmartLeadScore = (lead: Partial<Lead>): number => {
  let score = 50;
  const timelineUrgency = lead.timelineUrgency || (lead as any).timeline_urgency;
  if (timelineUrgency === 'high') score += 25;
  if (timelineUrgency === 'medium') score += 10;
  if (timelineUrgency === 'low') score -= 5;
  
  const engagementLevel = lead.engagementLevel || (lead as any).engagement_level;
  if (engagementLevel === 'high') score += 15;
  if (engagementLevel === 'medium') score += 5;
  
  const lastContact = (lead as any).last_contact || lead.lastContact || lead.updatedAt;
  if (lastContact) {
    const daysSince = Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24));
    score -= Math.min(daysSince, 20);
  }
  const val = Number(lead.estimatedValue || 0);
  if (val > 500000) score += 10;
  if (!lead.email) score -= 5;
  if (!lead.phone) score -= 5;
  if (!lead.propertyAddress) score -= 10;
  return Math.min(Math.max(score, 0), 100);

};

export const useStore = create<AppState>((set, get) => ({
  calendarEvents: [],
  mergedGoogleEvents: [],
  setCalendarEvents: (events) => set({ calendarEvents: events }),
  setMergedGoogleEvents: (events) => set({ mergedGoogleEvents: events }),
  isAuthenticated: false,
  currentUser: null,
  authLoading: false,
  authError: null,
  showFloatingAIWidget: typeof window !== 'undefined' ? localStorage.getItem('user_show_floating_widget') === 'true' : false,
  showGoalsForToday: typeof window !== 'undefined' ? (localStorage.getItem('user_show_goals_today') !== 'false') : true,
  isAiFirstUse: typeof window !== 'undefined' ? localStorage.getItem('wholescale-ai-first-use') !== 'false' : true,
  setIsAiFirstUse: (v: boolean) => {
    localStorage.setItem('wholescale-ai-first-use', v.toString());
    set({ isAiFirstUse: v });
  },
  setShowFloatingAIWidget: (show: boolean) => {
    localStorage.setItem('user_show_floating_widget', show.toString());
    set({ showFloatingAIWidget: show });
  },
  setShowGoalsForToday: (show: boolean) => {
    localStorage.setItem('user_show_goals_today', show.toString());
    set({ showGoalsForToday: show });
  },
  shortcutsEnabled: typeof window !== 'undefined' ? localStorage.getItem('user_shortcuts_enabled') !== 'false' : true,
  setShortcutsEnabled: (v: boolean) => {
    localStorage.setItem('user_shortcuts_enabled', v.toString());
    set({ shortcutsEnabled: v });
  },
  timeframe: typeof window !== 'undefined' ? (localStorage.getItem('dashboard-timeframe') as Timeframe) || '30d' : '30d',
  setTimeframe: (tf: Timeframe) => {
    localStorage.setItem('dashboard-timeframe', tf);
    set({ timeframe: tf });
  },
  lastLoginDate: new Date().toISOString(),
  loginStreak: 0,
  taskStreak: 0,
  longestStreak: 0,
  memberStreaks: {},
  loginStreakHistory: [],
  activeLeadModalId: null,
  saveStatus: 'idle',
  lastAutoSave: typeof window !== 'undefined' ? localStorage.getItem('wholescale-last-autosave') : null,
  backups: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('wholescale-backups');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) { }
    return [];
  })(),
  smsMessages: [],
  contacts: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sms-contacts');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) { }
    return [];
  })(),
  smsAutoReplyEnabled: typeof window !== 'undefined' ? localStorage.getItem('sms-auto-reply-enabled') === 'true' : false,
  smsAutoReplyMessage: typeof window !== 'undefined' ? localStorage.getItem('sms-auto-reply-message') || 'Thanks for your message! I will get back to you soon.' : 'Thanks for your message! I will get back to you soon.',
  aiName: (typeof window !== 'undefined' ? localStorage.getItem('wholescale-ai-name') : null) || 'OS Bot',
  aiModel: (typeof window !== 'undefined' ? localStorage.getItem('wholescale-ai-model') : null) || 'os-bot',
  premiumMessagesLeft: 99999,
  aiPersonality: (typeof window !== 'undefined' ? localStorage.getItem('wholescale-ai-personality') : null) || 'Professional',
  aiCustomPrompt: (typeof window !== 'undefined' ? localStorage.getItem('wholescale-ai-custom-prompt') : null) || '',
  aiTone: (typeof window !== 'undefined' ? localStorage.getItem('wholescale-ai-tone') : null) || 'Professional',
  preferred_api_provider: (typeof window !== 'undefined' ? (localStorage.getItem('wholescale-preferred-provider') || 'local') : 'local'),
  api_fallback_enabled: (typeof window !== 'undefined' ? (localStorage.getItem('wholescale-api-fallback') !== 'false') : true),
  smart_rotate_enabled: (typeof window !== 'undefined' ? (localStorage.getItem('wholescale-smart-rotate') === 'true') : false),
  credits_remaining: 100,
  credits_reset_at: null,
  total_credits_used_today: 0,
  onboarding_ai_choice_seen: (typeof window !== 'undefined' ? (localStorage.getItem('wholescale-ai-onboarding-seen') === 'true') : false),
  aiUsage: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ai-usage-map');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) { }
    return {};
  })(),
  aiThreads: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ai-threads');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) { }
    return [];
  })(),
  currentAiThreadId: typeof window !== 'undefined' ? localStorage.getItem('current-ai-thread-id') : null,
  isAiDocked: typeof window !== 'undefined' ? localStorage.getItem('ai_widget_docked') === 'true' : false,
  isAiOpen: false,
  setAiOpen: (v: boolean) => set({ isAiOpen: v }),
  setAiDocked: (docked: boolean) => {
    localStorage.setItem('ai_widget_docked', docked.toString());
    set({ isAiDocked: docked });
  },
  aiMessages: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ai-messages-map');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) { }
    return {};
  })(),
  notificationSettings: typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('wholescale-notifications') || 'null') || defaultNotificationSettings) : defaultNotificationSettings,
  quickNotes: typeof window !== 'undefined' ? localStorage.getItem('tasks-quick-notes') || '' : '',
  showQuickNotes: typeof window !== 'undefined' ? localStorage.getItem('tasks-show-quick-notes') === 'true' : false,
  isQuickNotesOpen: false,
  notesDocked: false,
  quickNotesSize: 'medium',
  isQuickNotesCollapsed: false,
  cursorSettings: { type: 'glow', color: 'var(--t-primary)', size: 20, enabled: true, intensity: 0.5 },
  isAutomationRunning: false,
  setIsAutomationRunning: (v: boolean) => set({ isAutomationRunning: v }),
  dashboardLayout: (() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('dashboard-layout');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  })(),
  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        set({ isAuthenticated: true, currentUser: defaultUser });
      }
    } catch (err: any) {
      set({ authError: err.message });
    } finally {
      set({ authLoading: false });
    }
  },
  signup: async (name, email, password) => {
    set({ authLoading: true, authError: null });
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
      } else {
        set({ authError: 'Signup is only available with Supabase configured.' });
      }
    } catch (err: any) {
      set({ authError: err.message });
    } finally {
      set({ authLoading: false });
    }
  },
  logout: async () => {
    // 1. Clear store state immediately to trigger UI guards
    set({
      isAuthenticated: false,
      currentUser: null,
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
      teamId: null
    });

    // 2. Clear all sensitive localStorage keys
    if (typeof window !== 'undefined') {
      const keysToClear = [
        'wholescale-preferred-team',
        'os_bot_session_id',
        'ai-usage-map',
        'ai-threads',
        'ai-messages-map',
        'tasks-quick-notes',
        'sms-contacts',
        'dashboard-layout',
        'current-ai-thread-id',
        'wholescale-last-autosave',
        'ai_widget_docked',
        'wholescale-ai-learned-intents'
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      
      // Also clear any dynamic keys matching prefixes
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wholescale-') || key.startsWith('os_bot_') || key.startsWith('ai-')) {
          localStorage.removeItem(key);
        }
      });
    }

    // 3. Handle Supabase signOut if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  },
  forgotPassword: async (email) => {
    set({ authLoading: true, authError: null });
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      }
    } catch (err: any) {
      set({ authError: err.message });
    } finally {
      set({ authLoading: false });
    }
  },
  updateProfile: async (updates: Partial<UserProfile>) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const newUser = { ...currentUser, ...updates };
    if (updates.name) {
      const nameForAvatar = updates.name || newUser.name || 'User';
      newUser.avatar = nameForAvatar.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    set({ currentUser: newUser });
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle();
        const currentSettings = profile?.settings || {};
        await supabase.from('profiles').update({
          full_name: newUser.name,
          phone: newUser.phone,
          avatar_url: newUser.avatar,
          preferred_api_provider: newUser.preferred_api_provider,
          api_fallback_enabled: newUser.api_fallback_enabled,
          user_api_keys: newUser.user_api_keys,
          settings: {
            ...currentSettings,
            bio: newUser.bio,
            specialties: newUser.specialties,
            license_number: newUser.licenseNumber,
            years_experience: newUser.yearsExperience,
            languages: newUser.languages,
            social_links: newUser.socialLinks,
            service_areas: newUser.serviceAreas,
            testimonials: newUser.testimonials,
            is_public: newUser.isPublic,
            public_contact_email: newUser.publicContactEmail,
            public_contact_phone: newUser.publicContactPhone,
            accept_leads: newUser.acceptLeads,
            website: newUser.website,
            ai_personality: newUser.aiCustomInstructions,
            notifications: get().notificationSettings,
            theme_presets: get().themePresets,
          },
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.id);
      } catch (err) {
        console.error('DEBUG: Failed to sync profile to Supabase:', err);
      }
    }
  },
  fetchProfile: async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    const { currentUser } = get();
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (profile) {
        let teamId = profile.team_id || null;
        const preferredId = typeof window !== 'undefined' ? localStorage.getItem('wholescale-preferred-team') : null;
        
        if (isSupabaseConfigured && supabase) {
          const { data: memberships } = await supabase
            .from('team_members')
            .select('team_id, last_seen')
            .eq('user_id', userId)
            .order('last_seen', { ascending: false });
          
          const validTeamIds = (memberships || []).map((m: any) => m.team_id);
          
          if (preferredId && validTeamIds.includes(preferredId)) {
            teamId = preferredId;
          } else if (validTeamIds.length > 0) {
            // Pick most recent instead of relying on profile.team_id which can be stale
            teamId = validTeamIds[0];
          }
        }
        const tier = profile.subscription_tier || 'Free';
        const planLimit = AI_PLAN_LIMITS[tier] || 50;
        
        // Handle Daily Credit Reset
        const now = new Date();
        const resetAt = profile.credits_reset_at ? new Date(profile.credits_reset_at) : null;
        const isNewDay = !resetAt || resetAt.getDate() !== now.getDate() || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear();
        
        let finalRemaining = profile.credits_remaining;
        let finalUsedToday = profile.total_credits_used_today || 0;
        
        if (isNewDay) {
          finalRemaining = planLimit;
          finalUsedToday = 0;
          
          // Sync reset to Supabase if config is active
          if (currentUser?.id && isSupabaseConfigured && supabase) {
            supabase.from('profiles').update({
              credits_remaining: finalRemaining,
              total_credits_used_today: finalUsedToday,
              credits_reset_at: now.toISOString()
            }).eq('id', currentUser.id).then(({ error }: { error: any }) => {
              if (error) console.error('Failed to sync credit reset:', error);
            });
          }

        } else if (finalRemaining === null || finalRemaining === undefined) {
          finalRemaining = planLimit;
        }

        set((s) => ({ 
          currentUser: s.currentUser ? {
            ...s.currentUser,
            id: profile.id,
            email: profile.email || s.currentUser.email,
            name: profile.full_name || s.currentUser.name,
            avatar: profile.avatar_url || s.currentUser.avatar,
            teamId: teamId || (s.currentUser as any).teamId,
            premium_credits: profile.premium_credits,
            credits_remaining: finalRemaining,
            credits_reset_at: profile.credits_reset_at,
            onboarding_ai_choice_seen: profile.onboarding_ai_choice_seen,
            smart_rotate_enabled: profile.smart_rotate_enabled,
            preferred_api_provider: profile.preferred_api_provider,
            api_fallback_enabled: profile.api_fallback_enabled,
            user_api_keys: profile.user_api_keys,
            subscriptionTier: tier,
            total_credits_used_today: finalUsedToday,
          } : {
            id: profile.id,
            email: profile.email || '',
            name: profile.full_name || '',
            avatar: profile.avatar_url || '',
            teamId: teamId,
            phone: profile.phone || '',
            teamRole: profile.team_role || 'member',
            emailVerified: profile.email_verified || false,
            createdAt: profile.created_at || new Date().toISOString(),
            settings: profile.settings || {},
            stripeCustomerId: profile.stripe_customer_id,
            subscriptionTier: tier,
            subscriptionStatus: profile.subscription_status || 'active',
            referralCode: profile.referral_code,
            referredBy: profile.referred_by,
            totalEarnings: profile.total_earnings || 0,
            availableEarnings: profile.available_earnings || 0,
            premium_credits: profile.premium_credits,
            credits_remaining: finalRemaining,
            credits_reset_at: profile.credits_reset_at,
            onboarding_ai_choice_seen: profile.onboarding_ai_choice_seen,
            smart_rotate_enabled: profile.smart_rotate_enabled,
            preferred_api_provider: profile.preferred_api_provider || 'local',
            api_fallback_enabled: profile.api_fallback_enabled ?? true,
            user_api_keys: profile.user_api_keys || {},
            total_credits_used_today: finalUsedToday,
          },
          teamId: teamId,
          notificationSettings: profile.settings?.notifications || s.notificationSettings,
          themePresets: profile.settings?.theme_presets || s.themePresets,
          currentTheme: profile.settings?.current_theme || s.currentTheme,
          customColors: profile.settings?.custom_colors || s.customColors,
          milestones: profile.settings?.team_milestones || s.milestones,
          preferred_api_provider: profile.preferred_api_provider || 'local',
          api_fallback_enabled: profile.api_fallback_enabled ?? true,
          smart_rotate_enabled: profile.smart_rotate_enabled ?? false,
          credits_remaining: finalRemaining,
          total_credits_used_today: finalUsedToday,
          credits_reset_at: profile.credits_reset_at || null,
          onboarding_ai_choice_seen: profile.onboarding_ai_choice_seen ?? false,
          dataLoaded: true,
        }));
      }
    } catch (err) {
      console.error('DEBUG: Failed to fetch profile:', err);
    }
  },
  loadLeads: async () => {
    let { currentUser, teamId } = get();
    if (!currentUser && isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().fetchProfile(session.user.id);
        const stateAfterProfile = get();
        currentUser = stateAfterProfile.currentUser;
        teamId = stateAfterProfile.teamId;
      }
    }
    if (!teamId && currentUser && isSupabaseConfigured && supabase) {
      await get().fetchProfile(currentUser.id);
      teamId = get().teamId;
    }
    if (!teamId || !isSupabaseConfigured || !supabase) {
      set({ dataLoaded: true, leads: [], tasks: [] });
      return;
    }
    try {
      set({ dataLoaded: false });

      const TIMEOUT_MS = 10000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LOAD_LEADS_TIMEOUT')), TIMEOUT_MS)
      );

      const fetchData = async () => {
        const [leads, tasks] = await Promise.all([
          leadsService.fetchAll(teamId!),
          tasksService.fetchAll(teamId!)
        ]);
        return { leads, tasks };
      };

      let results;
      try {
        results = await Promise.race([fetchData(), timeoutPromise]) as any;
      } catch (err: any) {
        console.warn('[useStore] loadLeads timed out or failed:', err);
        set({ dataLoaded: true });
        return;
      }

      const { leads, tasks } = results;

      const mappedLeads: Lead[] = (leads || []).map((l: any) => ({

        ...l,
        status: ensureStringStatus(l.status),
        propertyAddress: l.address || l.propertyAddress,
        estimatedValue: l.property_value || l.estimatedValue,
        lastSoldPrice: l.last_sold_price || l.lastSoldPrice,
        lastSoldDate: l.last_sold_date || l.lastSoldDate,
        estimatedEquity: l.estimated_equity || l.estimatedEquity,
        recommendedOffer: l.recommended_offer || l.recommendedOffer,
        assignedTo: l.assigned_to || l.assignedTo,
        propertyType: l.property_type || l.propertyType,
        shareEnabled: l.share_enabled || l.shareEnabled,
        sharePassword: l.share_password || l.sharePassword,
        shareDescription: l.share_description || l.shareDescription,
        sharePhotoUrl: l.share_photo_url || l.sharePhotoUrl,
        sharePrice: l.share_price || l.sharePrice,
        shareCustomMessage: l.share_custom_message || l.shareCustomMessage,
        importSource: l.import_source || l.importSource,
        createdAt: l.created_at || l.createdAt,
        updatedAt: l.updated_at || l.updatedAt,
        documents: l.documents || [],
        timeline: (l.timeline_entries || l.timeline || []).map((e: any) => ({
          ...e,
          timestamp: e.created_at || e.timestamp,
          user: e.user_name || e.user || 'System'
        })),
        statusHistory: (l.status_history || l.statusHistory || []).map((h: any) => ({
          ...h,
          fromStatus: h.from_status || h.fromStatus,
          toStatus: h.to_status || h.toStatus,
          timestamp: h.changed_at || h.timestamp,
          changedBy: h.changed_by || h.changedBy
        })),
        dealScore: calculateSmartLeadScore(l)
      }));
      const mappedTasks: Task[] = (tasks || []).map((t: any) => ({
        ...t,
        assignedTo: t.assigned_to || t.assignedTo,
        createdBy: t.created_by || t.createdBy,
        dueDate: t.due_date || t.dueDate,
        completedAt: t.completed_at || t.completedAt,
        createdAt: t.created_at || t.createdAt,
        leadId: t.lead_id || t.leadId,
      }));
      set({ leads: mappedLeads, tasks: mappedTasks, dataLoaded: true });
    } catch (error) {
      set({ dataLoaded: true });
    }
  },
  clearAuthError: () => set({ authError: null }),
  setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
  fetchSubscription: async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, stripe_customer_id')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        set((s) => ({
          currentUser: s.currentUser ? {
            ...s.currentUser,
            subscriptionTier: data.subscription_tier,
            subscriptionStatus: data.subscription_status,
            stripeCustomerId: data.stripe_customer_id
          } : null
        }));
      }
    } catch (err) {
      console.error('DEBUG: Failed to fetch subscription:', err);
    }
  },
  applyReferralCode: async (code: string) => {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Supabase not configured' };
    const { currentUser } = get();
    if (!currentUser) return { success: false, error: 'User not logged in' };
    try {
      const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();
      if (referrerError || !referrer) {
        return { success: false, error: 'Invalid referral code' };
      }
      if (referrer.id === currentUser.id) {
        return { success: false, error: 'You cannot use your own referral code' };
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referred_by: referrer.id })
        .eq('id', currentUser.id);
      if (updateError) throw updateError;
      await supabase.from('referrals').insert({
        referrer_id: referrer.id,
        referred_id: currentUser.id,
        status: 'pending'
      });
      set((s) => ({
        currentUser: s.currentUser ? { ...s.currentUser, referredBy: referrer.id } : null
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  history: [],
  future: [],
  saveToHistory: () => {
    const { history, ...currentSnapshot } = get();
    const { saveToHistory, undo, redo, clearHistory, future, ...serializableState } = currentSnapshot;
    set((s) => ({
      history: [...s.history.slice(-49), JSON.parse(JSON.stringify(serializableState))],
      future: []
    }));
  },
  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const { history: _h, future, saveToHistory, undo, redo, clearHistory, ...current } = get();
    set({
      ...prevState,
      history: newHistory,
      future: [JSON.parse(JSON.stringify(current)), ...future.slice(0, 49)]
    });
  },
  redo: () => {
    const { future } = get();
    if (future.length === 0) return;
    const nextState = future[0];
    const newFuture = future.slice(1);
    const { history, future: _f, saveToHistory, undo, redo, clearHistory, ...current } = get();
    set({
      ...nextState,
      history: [...history.slice(-49), JSON.parse(JSON.stringify(current))],
      future: newFuture
    });
  },
  clearHistory: () => set({ history: [], future: [] }),
  manualSave: async () => {
    const { saveStatus, teamId, loadLeads } = get();
    if (saveStatus === 'saving') return;
    set({ saveStatus: 'saving', isSyncing: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (teamId && isSupabaseConfigured) {
        await loadLeads();
      }
      const now = new Date().toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-last-autosave', now);
      }
      set({ saveStatus: 'success', lastAutoSave: now, isSyncing: false });
      setTimeout(() => set({ saveStatus: 'idle' }), 3000);
    } catch (error) {
      set({ saveStatus: 'error', isSyncing: false });
      setTimeout(() => set({ saveStatus: 'idle' }), 5000);
    }
  },
  createBackup: (name) => {
    const {
      leads, team, tasks, buyers, coverageAreas,
      calculatorScenarios, channels, messages,
      notificationSettings, smsMessages, contacts,
      quickNotes, aiName, aiModel, aiPersonality,
      currentTheme, customColors
    } = get();
    const backupData = {
      leads, team, tasks, buyers, coverageAreas,
      calculatorScenarios, channels, messages,
      notificationSettings, smsMessages, contacts,
      quickNotes, aiName, aiModel, aiPersonality,
      currentTheme, customColors, version: '1.0.0'
    };
    const newBackup = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      name: name || `Backup ${new Date().toLocaleString()}`,
      data: backupData
    };
    set((s: any) => {
      const nextBackups = [newBackup, ...s.backups].slice(0, 10);
      if (typeof window !== 'undefined') localStorage.setItem('wholescale-backups', JSON.stringify(nextBackups));
      return { backups: nextBackups };
    });
  },
  revertToBackup: (id) => {
    const { backups } = get();
    const backup = backups.find(b => b.id === id);
    if (backup) {
      set({ ...backup.data });
    }
  },
  deleteBackup: (id) => {
    set((s: any) => {
      const next = s.backups.filter((b: any) => b.id !== id);
      if (typeof window !== 'undefined') localStorage.setItem('wholescale-backups', JSON.stringify(next));
      return { backups: next };
    });
  },
  exportData: () => {
    const {
      leads, team, tasks, buyers, coverageAreas,
      calculatorScenarios, channels, messages,
      notificationSettings, smsMessages, contacts,
      quickNotes, aiName, aiModel, aiPersonality,
      currentTheme, customColors
    } = get();
    const data = {
      leads, team, tasks, buyers, coverageAreas,
      calculatorScenarios, channels, messages,
      notificationSettings, smsMessages, contacts,
      quickNotes, aiName, aiModel, aiPersonality,
      currentTheme, customColors,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wholescale-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  getMemberPrice: (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'team') return 5;
    if (t === 'solo' || t === 'pro') return 10;
    return 0;
  },
  canAddMember: () => {
    const { currentUser, team } = get();
    const tier = (currentUser?.subscriptionTier || 'Free').toLowerCase();
    const count = team.length;
    if (tier === 'free') {
      return { can: false, reason: 'Free plan does not support team members. Please upgrade to Solo, Pro, or Team.' };
    }
    const limits: Record<string, number> = {
      'solo': 1,
      'pro': 5,
      'team': 20,
      'agency': 9999
    };
    const limit = limits[tier] || 1;
    if (count < limit) {
      return { can: true };
    }
    return { can: false, reason: `You have reached the ${limit} seat limit for your ${tier} plan. Please upgrade or add an extra seat.` };
  },
  setSMSAutoReplyEnabled: async (v: boolean) => {
    if (typeof window !== 'undefined') localStorage.setItem('sms-auto-reply-enabled', v.toString());
    set({ smsAutoReplyEnabled: v });
    const { currentUser } = get();
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('agent_preferences').update({ sms_auto_reply_enabled: v }).eq('user_id', currentUser.id);
      } catch (err) {
        console.error('❌ Failed to sync SMS Auto-Reply preference:', err);
      }
    }
  },
  setSMSAutoReplyMessage: async (msg: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('sms-auto-reply-message', msg);
    set({ smsAutoReplyMessage: msg });
    const { currentUser } = get();
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('agent_preferences').update({ sms_auto_reply_message: msg }).eq('user_id', currentUser.id);
      } catch (err) {
        console.error('❌ Failed to sync SMS Auto-Reply message:', err);
      }
    }
  },
  teamId: null,
  dataLoaded: false,
  isSyncing: false,
  setTeamId: (teamId: string | null) => {
    if (teamId && typeof window !== 'undefined') {
      localStorage.setItem('wholescale-preferred-team', teamId);
    }
    set({ teamId });
    if (teamId) {
      get().loadLeads();
    }
  },
  setDataLoaded: (loaded: boolean) => set({ dataLoaded: loaded }),
  setBulkData: (data: any) => set(data as Partial<AppState>),
  setPreferredApiProvider: (v: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-preferred-provider', v);
    }
    set({ preferred_api_provider: v });
  },
  setApiFallbackEnabled: (v: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-api-fallback', v.toString());
    }
    set({ api_fallback_enabled: v });
  },
  setSmartRotateEnabled: (v: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-smart-rotate', v.toString());
    }
    set({ smart_rotate_enabled: v });
  },
  setCreditsRemaining: (v: number) => set({ credits_remaining: v }),
  refreshCredits: async () => {
    const { currentUser } = get();
    if (!currentUser?.id || !isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', currentUser.id)
        .single();
      
      if (data && !error) {
        set({ credits_remaining: data.credits_remaining });
      }
    } catch (err) {
      console.error('Failed to refresh credits:', err);
    }
  },
  setOnboardingAiChoiceSeen: async (v: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-ai-onboarding-seen', v.toString());
    }
    set({ onboarding_ai_choice_seen: v });
    
    // Sync to Supabase
    const { currentUser } = get();
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ onboarding_ai_choice_seen: v })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('Failed to sync onboarding status to Supabase:', err);
      }
    }
  },
  searchResults: { leads: [], tasks: [], sms: [] },
  performSearch: (query: string) => {
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
  leads: [],
  addLead: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'statusHistory'>) => {
    const { teamId, currentUser } = get();
    get().saveToHistory();
    const now = new Date().toISOString();
    const newId = uuidv4();
    const sanitizedStatus = ensureStringStatus(lead.status);
    const newLead: Lead = {
      ...lead,
      id: newId,
      status: sanitizedStatus,
      createdAt: now,
      updatedAt: now,
      bedrooms: lead.bedrooms || 0,
      bathrooms: lead.bathrooms || 0,
      sqft: lead.sqft || 0,
      source: lead.source || 'other',
      documents: (lead as any).documents || [],
      timeline: [{ id: uuidv4(), type: 'note', content: 'Lead created.', timestamp: now, user: 'System' }],
      statusHistory: [{ fromStatus: null, toStatus: lead.status, timestamp: now, changedBy: 'System' }],
      dealScore: calculateSmartLeadScore(lead),
    };
    set((s) => ({ leads: [...s.leads, newLead] }));
    automationEngine.trigger('LEAD_CREATED', { ...newLead, id: newId });
    if (teamId && isSupabaseConfigured && supabase) {
      try {
        await leadsService.create({
          id: newId,
          team_id: teamId,
          created_by: currentUser?.id,
          name: newLead.name,
          email: newLead.email,
          phone: newLead.phone,
          address: newLead.propertyAddress,
          city: newLead.city,
          state: newLead.state,
          zip: newLead.zip,
          property_type: newLead.propertyType,
          property_value: newLead.estimatedValue,
          bedrooms: newLead.bedrooms,
          bathrooms: newLead.bathrooms,
          sqft: newLead.sqft,
          offer_amount: newLead.offerAmount,
          status: sanitizedStatus,
          source: newLead.source,
          notes: newLead.notes,
          lat: newLead.lat,
          lng: newLead.lng,
          assigned_to: newLead.assignedTo,
          probability: newLead.probability,
          engagement_level: newLead.engagementLevel,
          timeline_urgency: newLead.timelineUrgency,
          competition_level: newLead.competitionLevel,
          photos: newLead.photos,
          carrier: newLead.carrier,
          share_password: newLead.sharePassword,
          share_enabled: newLead.shareEnabled,
          documents: newLead.documents,
          recommended_offer: newLead.recommendedOffer,
          last_sold_price: newLead.lastSoldPrice,
          last_sold_date: newLead.lastSoldDate,
          estimated_equity: newLead.estimatedEquity,
        });
        try {
          const initialTimeline = newLead.timeline[0];
          await leadsService.addTimeline(newId, {
            id: initialTimeline.id,
            type: initialTimeline.type,
            content: initialTimeline.content,
            user: initialTimeline.user,
            timestamp: initialTimeline.timestamp
          });
          const initialHistory = newLead.statusHistory[0];
          await leadsService.addStatusHistory(
            newId, 
            initialHistory.fromStatus, 
            initialHistory.toStatus, 
            initialHistory.changedBy
          );
        } catch (err) {
          console.error('⚠️ Failed to sync initial entries:', err);
        }
        return { success: true, id: newId };
      } catch (error: any) {
        return { success: false, error: error.message || 'Supabase sync failed' };
      }
    }
    return { success: true, id: newId };
  },
  updateLead: async (id: string, updates: Partial<Lead>) => {
    get().saveToHistory();
    const now = new Date().toISOString();
    const sanitizedUpdates = { ...updates };
    if (updates.status !== undefined) {
      sanitizedUpdates.status = ensureStringStatus(updates.status);
    }
    set((s) => ({
      leads: s.leads.map((l) => {
        if (l.id === id) {
          const updatedLead = { ...l, ...sanitizedUpdates, updatedAt: now };
          updatedLead.dealScore = calculateSmartLeadScore(updatedLead);
          return updatedLead;
        }
        return l;
      }),
    }));
    const leadAfterUpdate = get().leads.find(l => l.id === id);
    if (leadAfterUpdate) {
      if ((leadAfterUpdate.dealScore || 0) >= 80) {
        automationEngine.trigger('LEAD_SCORE_HIGH', { ...leadAfterUpdate, deal_score: leadAfterUpdate.dealScore });
      }
      if (updates.status) {
        automationEngine.trigger('LEAD_STATUS_CHANGED', { ...leadAfterUpdate, status: updates.status });
      }
    }
    if (isSupabaseConfigured && supabase) {
      set({ isSyncing: true });
      const dbUpdates: any = { updated_at: now };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.propertyAddress !== undefined) dbUpdates.address = updates.propertyAddress;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.zip !== undefined) dbUpdates.zip = updates.zip;
      if (updates.propertyType !== undefined) dbUpdates.property_type = updates.propertyType;
      if (updates.estimatedValue !== undefined) dbUpdates.property_value = updates.estimatedValue;
      if (updates.bedrooms !== undefined) dbUpdates.bedrooms = updates.bedrooms;
      if (updates.bathrooms !== undefined) dbUpdates.bathrooms = updates.bathrooms;
      if (updates.sqft !== undefined) dbUpdates.sqft = updates.sqft;
      if (updates.offerAmount !== undefined) dbUpdates.offer_amount = updates.offerAmount;
      if (updates.status !== undefined) dbUpdates.status = sanitizedUpdates.status;
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
      if (updates.carrier !== undefined) dbUpdates.carrier = updates.carrier;
      if (updates.sharePassword !== undefined) dbUpdates.share_password = updates.sharePassword;
      if (updates.shareEnabled !== undefined) dbUpdates.share_enabled = updates.shareEnabled;
      if (updates.documents !== undefined) dbUpdates.documents = updates.documents;
      if (updates.recommendedOffer !== undefined) dbUpdates.recommended_offer = updates.recommendedOffer;
      if (updates.lastSoldPrice !== undefined) dbUpdates.last_sold_price = updates.lastSoldPrice;
      if (updates.lastSoldDate !== undefined) dbUpdates.last_sold_date = updates.lastSoldDate;
      if (updates.estimatedEquity !== undefined) dbUpdates.estimated_equity = updates.estimatedEquity;
      leadsService.update(id, dbUpdates)
        .then(() => set({ isSyncing: false }))
        .catch(() => set({ isSyncing: false }));
    }
    return { success: true };
  },
  deleteLead: async (id: string) => {
    get().saveToHistory();
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }));
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('sms_messages').update({ lead_id: null }).eq('lead_id', id);
        await leadsService.remove(id);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    }
    return { success: true };
  },
  addTimelineEntry: async (leadId: string, entry: Omit<TimelineEntry, 'id'>) => {
    const now = new Date().toISOString();
    const newEntry = { ...entry, id: uuidv4(), timestamp: now };
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, timeline: [...l.timeline, newEntry], updatedAt: now }
          : l
      ),
    }));
    if (isSupabaseConfigured && supabase) {
      try {
        await leadsService.addTimeline(leadId, newEntry as any);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    }
    return { success: true };
  },
  updateLeadStatus: async (leadId: string, newStatus: LeadStatus, changedBy: string) => {
    const sanitizedStatus = ensureStringStatus(newStatus);
    const now = new Date().toISOString();
    const { leads } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === sanitizedStatus) return { success: true };
    const oldStatus = lead.status;
    const statusChangeEntry: TimelineEntry = {
      id: uuidv4(),
      type: 'status-change',
      content: `Status changed from ${STATUS_LABELS[oldStatus] || oldStatus} to ${STATUS_LABELS[sanitizedStatus] || sanitizedStatus}`,
      timestamp: now,
      user: changedBy,
      metadata: { from: oldStatus, to: sanitizedStatus },
    };
    const statusHistoryEntry = { 
      fromStatus: oldStatus, 
      toStatus: sanitizedStatus, 
      timestamp: now, 
      changedBy 
    };
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { 
              ...l, 
              status: sanitizedStatus, 
              updatedAt: now,
              statusHistory: [...l.statusHistory, statusHistoryEntry],
              timeline: [...l.timeline, statusChangeEntry]
            }
          : l
      ),
    }));
    const leadAfterStatusUpdate = get().leads.find(l => l.id === leadId);
    if (leadAfterStatusUpdate) {
      automationEngine.trigger('LEAD_STATUS_CHANGED', { ...leadAfterStatusUpdate, id: leadId, status: sanitizedStatus });
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await Promise.all([
          leadsService.update(leadId, { status: newStatus, updated_at: now }),
          leadsService.addStatusHistory(leadId, oldStatus, newStatus, changedBy),
          leadsService.addTimeline(leadId, statusChangeEntry as any)
        ]);
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    }
    return { success: true };
  },
  team: [],
  teamConfig: {
    id: '',
    name: 'WholeScale HQ',
    inviteCode: 'WS-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    maxSeats: 10,
    createdBy: '',
    createdAt: new Date().toISOString(),
  },
  milestones: [
    { id: '1', type: 'leads', target: 50, current: 0, label: 'Lead Generation' },
    { id: '2', type: 'deals', target: 10, current: 0, label: 'Closed Deals' },
    { id: '3', type: 'revenue', target: 500000, current: 0, label: 'Revenue Target' }
  ],
  updateMemberStatus: (id: string, status: PresenceStatus) => {
    set((s: any) => ({
      team: s.team.map((m: any) => m.id === id ? {
        ...m, presenceStatus: status,
        lastSeen: status === 'offline' ? new Date().toISOString() : m.lastSeen,
      } : m),
    }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      teamService.updatePresence(teamId, id, status).catch(() => {});
    }
  },
  setCustomStatus: (id: string, msg: string) =>
    set((s: any) => ({ team: s.team.map((m: any) => m.id === id ? { ...m, customStatus: msg } : m) })),
  updateMemberRole: (id: string, role: TeamRole) => {
    set((s: any) => ({ team: s.team.map((m: any) => m.id === id ? { ...m, teamRole: role } : m) }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      teamService.updateRole(teamId, id, role).catch(() => {});
    }
  },
  addTeamMember: (member: Omit<TeamMember, 'id'>) => {
    get().saveToHistory();
    set((s: any) => ({ team: [...s.team, { ...member, id: uuidv4() }] }));
  },
  removeTeamMember: (id: string) => {
    get().saveToHistory();
    set((s: any) => ({ team: s.team.filter((m: any) => m.id !== id) }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      teamService.removeMember(teamId, id).catch(() => {});
    }
  },
  regenerateInviteCode: () => {
    const newCode = generateInviteCode();
    set((s: any) => ({ teamConfig: { ...s.teamConfig, inviteCode: newCode } }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      supabase
        .from('teams')
        .update({ invite_code: newCode })
        .eq('id', teamId)
        .then(({ error }: any) => {
          if (error) console.error('Failed to update invite code:', error);
        });
    }
  },
  updateTeamConfig: (updates: Partial<TeamConfig>) => {
    set((s: any) => ({ teamConfig: { ...s.teamConfig, ...updates } }));
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
          .then(({ error }: any) => {
            if (error) console.error('Failed to update team:', error);
          });
      }
    }
  },
  tasks: [],
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => {
    get().saveToHistory();
    const newId = uuidv4();
    const now = new Date().toISOString();
    const newTask = { ...task, id: newId, createdAt: now, completedAt: null };
    set((s: any) => ({ tasks: [...s.tasks, newTask] }));
    automationEngine.trigger('TASK_STATUS_CHANGED', { ...newTask, id: newId });
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      tasksService.create({
        id: newId, team_id: teamId, title: task.title, description: task.description,
        assigned_to: task.assignedTo || null, created_by: task.createdBy || null,
        lead_id: task.leadId || null, status: task.status, priority: task.priority,
        due_date: task.dueDate || null,
      }).catch(() => {});
    }
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
  updateTask: (id: string, updates: Partial<Task>) => {
    get().saveToHistory();
    set((s: any) => ({ tasks: s.tasks.map((t: any) => t.id === id ? { ...t, ...updates } : t) }));
    if (updates.status) {
      const task = get().tasks.find(t => t.id === id);
      if (task) {
        automationEngine.trigger('TASK_STATUS_CHANGED', task).then();
      }
    }
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
  deleteTask: (id: string) => {
    get().saveToHistory();
    set((s: any) => ({ tasks: s.tasks.filter((t: any) => t.id !== id) }));
    if (isSupabaseConfigured && supabase) tasksService.remove(id).catch(() => {});
  },
  completeTask: (id: string) => {
    get().saveToHistory();
    const now = new Date().toISOString();
    set((s: any) => ({ tasks: s.tasks.map((t: any) => t.id === id ? { ...t, status: 'done' as TaskStatus, completedAt: now } : t) }));
    const task = get().tasks.find(t => t.id === id);
    if (task) {
      automationEngine.trigger('TASK_STATUS_CHANGED', { ...task, status: 'done' });
    }
    if (isSupabaseConfigured && supabase) tasksService.complete(id).catch(() => {});
  },
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
  addCalculatorScenario: (scenario: any) => {
    const now = new Date().toISOString();
    const newId = uuidv4();
    const newScenario = {
      ...scenario,
      id: newId,
      date: now,
      lastModified: now,
    };
    set((state: any) => {
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
          metadata: { scenarioId: newId, scenarioType: scenario.type }
        });
      }
    }
    return newId;
  },
  updateCalculatorScenario: (id: string, updates: any) => {
    set((state: any) => {
      const updated = state.calculatorScenarios.map((s: any) =>
        s.id === id ? { ...s, ...updates, lastModified: new Date().toISOString() } : s
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-calculator-scenarios', JSON.stringify(updated));
      }
      return { calculatorScenarios: updated };
    });
  },
  deleteCalculatorScenario: (id: string) => {
    set((state: any) => {
      const updated = state.calculatorScenarios.filter((s: any) => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-calculator-scenarios', JSON.stringify(updated));
      }
      return { calculatorScenarios: updated };
    });
  },
  getScenariosByLead: (leadId: string) => {
    return get().calculatorScenarios.filter((s: any) => s.leadId === leadId);
  },
  sidebarOpen: typeof window !== 'undefined' ? localStorage.getItem('wholescale-sidebar-open') !== 'false' : true,
  toggleSidebar: () => set((s: any) => {
    const newState = !s.sidebarOpen;
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-sidebar-open', String(newState));
    }
    return { sidebarOpen: newState };
  }),
  buyers: [],
  coverageAreas: [],
  buyerTemplates: [],
  pendingDrawMode: false,
  mapFilters: {
    showLeads: true, showBuyers: true, showCoverageAreas: true, showDrivingRoute: false,
    clusterMarkers: false,
    leadStatusFilters: { 
      'new': true, 'contacted': true, 'qualified': true, 
      'negotiating': true, 'closed-won': true, 'closed-lost': true,
      'contract-in': true, 'under-contract': true, 'follow-up': true
    },
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
      }).catch(() => { });
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
      if (Object.keys(db).length > 0) mapService.updateBuyer(id, db).catch(() => { });
    }
  },
  deleteBuyer: (id) => {
    set((s) => ({ buyers: s.buyers.filter((b) => b.id !== id) }));
    if (isSupabaseConfigured && supabase) mapService.deleteBuyer(id).catch(() => { });
  },
  addCoverageArea: (area) => {
    const newId = uuidv4();
    set((s) => ({ coverageAreas: [...s.coverageAreas, { ...area, id: newId, createdAt: new Date().toISOString() }] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured && supabase) {
      mapService.createCoverageArea({
        id: newId, team_id: teamId, name: area.name, coordinates: JSON.stringify(area.coordinates),
        color: area.color, opacity: area.opacity, notes: area.notes,
      }).catch(() => { });
    }
  },
  updateCoverageArea: (id, updates) => set((s) => ({ coverageAreas: s.coverageAreas.map((a) => a.id === id ? { ...a, ...updates } : a) })),
  deleteCoverageArea: (id) => {
    set((s) => ({ coverageAreas: s.coverageAreas.filter((a) => a.id !== id) }));
    if (isSupabaseConfigured && supabase) mapService.deleteCoverageArea(id).catch(() => { });
  },
  toggleMapFilter: (key) => set((s) => ({ mapFilters: { ...s.mapFilters, [key]: !s.mapFilters[key] } })),
  toggleLeadStatusFilter: (status) => set((s) => ({ mapFilters: { ...s.mapFilters, leadStatusFilters: { ...s.mapFilters.leadStatusFilters, [status]: !s.mapFilters.leadStatusFilters[status] } } })),
  addBuyerTemplate: (template) => set((s) => ({ buyerTemplates: [...s.buyerTemplates, { ...template, id: uuidv4() }] })),
  deleteBuyerTemplate: (id) => set((s) => ({ buyerTemplates: s.buyerTemplates.filter((t) => t.id !== id) })),
  updateMapSettings: (settings) => set((s) => ({ mapSettings: { ...s.mapSettings, ...settings } })),
  setPendingDrawMode: (v) => set({ pendingDrawMode: v }),
  channels: [],
  messages: {},
  currentChannelId: null,
  typingUsers: {},
  chatSearchQuery: '',
  unreadCounts: { sms: 0 },
  setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),
  sendMessage: (channelId, content, type = 'text', mentions = [], replyToId = null, attachments = []) => {
    const user = get().currentUser;
    if (!user) return;
    const now = new Date().toISOString();
    const newId = uuidv4();
    const msg: ChatMessage = {
      id: newId, channelId, senderId: user.id,
      senderName: user.name, senderAvatar: user.avatar,
      content, timestamp: now, type,
      mentions, reactions: [], replyToId,
      attachments, edited: false, readBy: [user.id], deleted: false,
    };
    set((s) => {
      const channelMsgs = [...(s.messages[channelId] || []), msg];
      return {
        messages: { ...s.messages, [channelId]: channelMsgs },
        channels: s.channels.map(ch => ch.id === channelId ? { ...ch, lastMessageAt: now } : ch),
      };
    });
    if (isSupabaseConfigured && supabase) {
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
      }).catch(() => { });
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
      chatService.editMessage(messageId, newContent).catch(() => { });
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
      chatService.deleteMessage(messageId).catch(() => { });
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
  createChannel: (name, type, members, description = '') => {
    const id = uuidv4();
    const user = get().currentUser;
    const now = new Date().toISOString();
    const newChannel = {
      id,
      name,
      type,
      members,
      description,
      avatar: type === 'group' ? '💬' : (name || 'Ch').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      createdAt: now,
      createdBy: user?.id || '',
      lastMessageAt: now,
      pinnedMessageIds: [],
    };
    set((s) => ({
      channels: [...s.channels, newChannel],
      messages: { ...s.messages, [id]: [] },
      unreadCounts: { ...s.unreadCounts, [id]: 0 },
    }));
    if (isSupabaseConfigured && supabase && user) {
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
        .then(({ error }: any) => {
          if (!error && members && members.length > 0) {
            supabase
              .from('channel_members')
              .insert(members.map(userId => ({ channel_id: id, user_id: userId })))
              .then();
          }
        });
    }
    return id;
  },
  deleteChannel: (channelId) => {
    const user = get().currentUser;
    const channel = get().channels.find(ch => ch.id === channelId);
    if (channel && channel.createdBy !== user?.id) return;
    set((s) => {
      const newMsgs = { ...s.messages };
      delete newMsgs[channelId];
      const newUnread = { ...s.unreadCounts };
      delete newUnread[channelId];
      const newChannels = s.channels.filter(ch => ch.id !== channelId);
      const newCurrentId = s.currentChannelId === channelId ? (newChannels[0]?.id || null) : s.currentChannelId;
      return {
        channels: newChannels,
        messages: newMsgs,
        unreadCounts: newUnread,
        currentChannelId: newCurrentId,
      };
    });
    if (isSupabaseConfigured && supabase) {
      supabase.from('channels').delete().eq('id', channelId).then();
    }
  },
  updateChannel: (channelId, updates) => {
    set((s) => ({
      channels: s.channels.map(ch => ch.id === channelId ? { ...ch, ...updates } : ch),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('channels').update({ name: updates.name, description: updates.description }).eq('id', channelId).then();
    }
  },
  addChannelMember: (channelId, userId) => {
    const channel = get().channels.find(ch => ch.id === channelId);
    if (!channel || channel.members.includes(userId)) return;
    set((s) => ({
      channels: s.channels.map(ch => ch.id === channelId ? { ...ch, members: [...ch.members, userId] } : ch),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('channel_members').insert([{ channel_id: channelId, user_id: userId }]).then();
    }
  },
  removeChannelMember: (channelId, userId) => {
    const channel = get().channels.find(ch => ch.id === channelId);
    if (!channel || channel.createdBy === userId) return;
    set((s) => ({
      channels: s.channels.map(ch => ch.id === channelId ? { ...ch, members: ch.members.filter(id => id !== userId) } : ch),
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', userId).then();
    }
  },
  leaveChannel: (channelId) => {
    const user = get().currentUser;
    const channel = get().channels.find(ch => ch.id === channelId);
    if (!user || !channel || channel.createdBy === user.id) return;
    set((s) => ({
      channels: s.channels.filter(ch => ch.id !== channelId),
      currentChannelId: s.currentChannelId === channelId ? (s.channels[0]?.id || null) : s.currentChannelId,
    }));
    if (isSupabaseConfigured && supabase) {
      supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', user.id).then();
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
  currentTheme: 'moon',
  setTheme: (theme: string) => {
    set({ currentTheme: theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-theme', theme);
      const themeData = themes[theme as keyof typeof themes] || themes['moon'];
      if (themeData) {
        const root = document.documentElement;
        const customColors = get().customColors;
        root.setAttribute('data-theme', theme);

        const toKebab = (str: string) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
        Object.entries(themeData.colors).forEach(([key, value]) => {
          const cssVar = `--t-${toKebab(key)}`;
          if (customColors[key]) root.style.setProperty(cssVar, customColors[key]);
          else root.style.setProperty(cssVar, value as string);
        });
        if (themeData.effects) {
          Object.entries(themeData.effects).forEach(([key, value]) => {
            const cssVar = `--t-${toKebab(key)}`;
            if (value) root.style.setProperty(cssVar, value as string);
          });
        }
      }
    }
  },
  customColors: (() => {
    try {
      if (typeof window !== 'undefined') return JSON.parse(localStorage.getItem('wholescale-custom-colors') || '{}');
      return {};
    } catch { return {}; }
  })(),
  themePresets: (() => {
    try {
      if (typeof window !== 'undefined') return JSON.parse(localStorage.getItem('wholescale-theme-presets') || '[]');
      return [];
    } catch { return []; }
  })(),
  saveThemePreset: (name) => {
    const { currentTheme, customColors, currentUser } = get();
    const newPreset: ThemePreset = {
      id: uuidv4(),
      name,
      themeId: currentTheme,
      customColors: { ...customColors },
      createdAt: new Date().toISOString()
    };
    set((s) => {
      const next = [...s.themePresets, newPreset];
      if (typeof window !== 'undefined') localStorage.setItem('wholescale-theme-presets', JSON.stringify(next));
      if (currentUser?.id && isSupabaseConfigured && supabase) {
        supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle().then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabase.from('profiles').update({ settings: { ...currentSettings, theme_presets: next } }).eq('id', currentUser.id).then();
        });
      }
      return { themePresets: next };
    });
  },
  deleteThemePreset: (id) => {
    const { currentUser } = get();
    set((s) => {
      const next = s.themePresets.filter(p => p.id !== id);
      if (typeof window !== 'undefined') localStorage.setItem('wholescale-theme-presets', JSON.stringify(next));
      if (currentUser?.id && isSupabaseConfigured && supabase) {
        supabase.from('profiles').select('settings').eq('id', currentUser.id).maybeSingle().then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabase.from('profiles').update({ settings: { ...currentSettings, theme_presets: next } }).eq('id', currentUser.id).then();
        });
      }
      return { themePresets: next };
    });
  },
  applyThemePreset: (preset) => {
    const { setTheme } = get();
    set({ customColors: { ...preset.customColors } });
    if (typeof window !== 'undefined') localStorage.setItem('wholescale-custom-colors', JSON.stringify(preset.customColors));
    setTheme(preset.themeId);
  },
  setCustomColor: (property, color) => {
    set((state) => {
      const newColors = { ...state.customColors, [property]: color };
      if (typeof window !== 'undefined') localStorage.setItem('wholescale-custom-colors', JSON.stringify(newColors));
      const root = document.documentElement;
      const cssVar = `--t-${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, color);
      const { currentUser } = get();
      if (supabase && isSupabaseConfigured && currentUser) {
        supabase.from('profiles').select('settings').eq('id', currentUser.id).single().then((res: any) => {
          const profile = res.data;
          if (profile && supabase) {
            const existing = (profile.settings as Record<string, unknown>) || {};
            const customSettings = (existing.customColors as Record<string, string>) || {};
            supabase.from('profiles').update({ settings: { ...existing, customColors: { ...customSettings, [property]: color } } }).eq('id', currentUser.id).then();
          }
        });
      }
      return { customColors: newColors };
    });
  },
  resetCustomColors: () => {
    set((state) => {
      if (typeof window !== 'undefined') localStorage.removeItem('wholescale-custom-colors');
      const themeData = themes[state.currentTheme];
      if (themeData && typeof window !== 'undefined') {
        const root = document.documentElement;
        Object.entries(themeData.colors).forEach(([key, value]) => {
          const cssVar = `--t-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(cssVar, value as string);
        });
      }
      const { currentUser } = get();
      if (supabase && isSupabaseConfigured && currentUser) {
        supabase.from('profiles').select('settings').eq('id', currentUser.id).single().then(({ data: profile }: { data: any }) => {
          if (profile && supabase) {
            const existing = (profile.settings as Record<string, unknown>) || {};
            supabase.from('profiles').update({ settings: { ...existing, customColors: {} } }).eq('id', currentUser.id).then();
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
  notifications: [],
  addNotification: (notif) => {
    const { notificationSettings, notifications } = get();
    if (notificationSettings.dndEnabled) return;
    const tenSecondsAgo = Date.now() - 10000;
    const isDuplicate = notifications.some(n => n.title === notif.title && n.message === notif.message && new Date(n.timestamp).getTime() > tenSecondsAgo);
    if (isDuplicate) return;
    const newId = uuidv4();
    set((s) => ({ notifications: [{ ...notif, id: newId, timestamp: new Date().toISOString(), read: false }, ...s.notifications] }));
    const { currentUser } = get();
    if (isSupabaseConfigured && supabase && currentUser) {
      notificationsService.create({ id: newId, user_id: currentUser.id, type: notif.type, title: notif.title, message: notif.message }).catch(() => { });
    }
  },
  markNotificationRead: (id) => {
    set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    if (isSupabaseConfigured && supabase) notificationsService.markRead(id).catch(() => { });
  },
  markAllNotificationsRead: () => {
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }));
    const { currentUser } = get();
    if (isSupabaseConfigured && supabase && currentUser) notificationsService.markAllRead(currentUser.id).catch(() => { });
  },
  clearAllNotifications: () => {
    set({ notifications: [] });
    const { currentUser } = get();
    if (isSupabaseConfigured && supabase && currentUser) notificationsService.clearAll(currentUser.id).catch(() => { });
  },
  deleteNotification: (id: string) => {
    set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) }));
    if (isSupabaseConfigured && supabase) notificationsService.remove(id).catch(() => { });
  },
  importTemplates: [],
  importHistory: [],
  duplicateSettings: { enabled: true, matchFields: ['email', 'phone', 'address'], action: 'skip' },
  addImportTemplate: (template) => set((s) => ({ importTemplates: [...s.importTemplates, { ...template, id: uuidv4(), createdAt: new Date().toISOString() }] })),
  deleteImportTemplate: (id) => set((s) => ({ importTemplates: s.importTemplates.filter((t) => t.id !== id) })),
  addImportHistory: (entry) => set((s) => ({ importHistory: [{ ...entry, id: uuidv4(), timestamp: new Date().toISOString() }, ...s.importHistory] })),
  updateDuplicateSettings: (settings) => set((s) => ({ duplicateSettings: { ...s.duplicateSettings, ...settings } })),
  getMockSheetData: () => MOCK_SHEET_DATA[0],
  getMockScrapedProperty: (_url: string) => MOCK_SCRAPED_PROPERTIES[Math.floor(Math.random() * MOCK_SCRAPED_PROPERTIES.length)],
  getMockPdfExtraction: () => MOCK_PDF_EXTRACTIONS,
  importLeadsFromData: async (data: any[], onProgress?: (current: number, total: number) => void) => {
    const state = get();
    const now = new Date().toISOString();
    let importedCount = 0, skippedCount = 0, mergedCount = 0;
    const newLeads: Lead[] = [], mergedLeads: Lead[] = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (onProgress && i % 50 === 0) onProgress(i, data.length);
      const leadName = (d.name || '').trim(), leadEmail = (d.email || '').trim(), leadPhone = (d.phone || '').trim(), leadAddress = (d.propertyAddress || d.address || '').trim();
      if (!leadName && !leadAddress) { skippedCount++; continue; }
      let duplicateMatch: Lead | undefined;
      if (state.duplicateSettings.enabled) {
        duplicateMatch = state.leads.find((l: Lead) => (state.duplicateSettings.matchFields.includes('email') && leadEmail && l.email === leadEmail) || (state.duplicateSettings.matchFields.includes('phone') && leadPhone && l.phone === leadPhone) || (state.duplicateSettings.matchFields.includes('address') && leadAddress && l.propertyAddress === leadAddress));
        if (duplicateMatch) {
          if (state.duplicateSettings.action === 'skip') { skippedCount++; continue; }
          else if (state.duplicateSettings.action === 'merge') {
            mergedLeads.push({ ...duplicateMatch, name: leadName || duplicateMatch.name, email: leadEmail || duplicateMatch.email, phone: leadPhone || duplicateMatch.phone, propertyAddress: leadAddress || duplicateMatch.propertyAddress, notes: [duplicateMatch.notes, d.notes].filter(Boolean).join('\n---\nImport merge: '), updatedAt: now });
            mergedCount++; continue;
          }
        }
      }
      newLeads.push({ id: uuidv4(), name: leadName || 'Unknown', email: leadEmail, phone: leadPhone, status: 'new', source: (d.source as LeadSource) || 'other', propertyAddress: leadAddress, propertyType: d.propertyType || 'single-family', estimatedValue: d.estimatedValue || d.value || 0, bedrooms: d.bedrooms || 0, bathrooms: d.bathrooms || 0, sqft: d.sqft || 0, offerAmount: 0, lat: 30.2672, lng: -97.7431, notes: d.notes || '', assignedTo: '', createdAt: now, updatedAt: now, probability: 40, engagementLevel: 2, timelineUrgency: 3, competitionLevel: 3, importSource: d.importSource || 'import', photos: d.photos || [], documents: [], timeline: [{ id: uuidv4(), type: 'note', content: `Imported via bulk import.`, timestamp: now, user: 'System' }], statusHistory: [{ fromStatus: null, toStatus: 'new', timestamp: now, changedBy: 'Import' }] });
      importedCount++;
    }
    set((s: any) => {
      const mergedIds = new Set(mergedLeads.map(m => m.id));
      return { leads: [...s.leads.filter((l: Lead) => !mergedIds.has(l.id)), ...mergedLeads, ...newLeads] };
    });
    if (supabase && isSupabaseConfigured && get().teamId) {
      const teamId = get().teamId;
      if (newLeads.length > 0) {
        const newRows = newLeads.map(lead => ({ id: lead.id, team_id: teamId, name: lead.name, email: lead.email, phone: lead.phone, address: lead.propertyAddress, property_type: lead.propertyType, property_value: lead.estimatedValue, bedrooms: lead.bedrooms, bathrooms: lead.bathrooms, sqft: lead.sqft, offer_amount: lead.offerAmount, status: lead.status, source: lead.source, notes: lead.notes, lat: lead.lat, lng: lead.lng, assigned_to: lead.assignedTo || null, probability: lead.probability, engagement_level: lead.engagementLevel, timeline_urgency: lead.timelineUrgency, competition_level: lead.competitionLevel, import_source: lead.importSource || 'import', photos: lead.photos || [], created_at: lead.createdAt, updated_at: lead.updatedAt }));
        await supabase.from('leads').insert(newRows);
      }
      if (mergedLeads.length > 0) {
        for (const ml of mergedLeads) {
          await supabase.from('leads').update({ name: ml.name, email: ml.email, phone: ml.phone, address: ml.propertyAddress, property_type: ml.propertyType, property_value: ml.estimatedValue, bedrooms: ml.bedrooms, bathrooms: ml.bathrooms, sqft: ml.sqft, notes: ml.notes, updated_at: ml.updatedAt }).eq('id', ml.id);
        }
      }
    }
    return { imported: importedCount + mergedCount, skipped: skippedCount, duplicates: mergedCount + (state.duplicateSettings.action === 'skip' ? skippedCount : 0) };
  },
  incrementLoginStreak: () => set((s: any) => ({ loginStreak: (s.loginStreak || 0) + 1 })),
  addLeadPhoto: (leadId, photo) => set((s: any) => ({ leads: s.leads.map((l: any) => l.id === leadId ? { ...l, photos: [...(l.photos || []), photo] } : l) })),
  removeLeadPhoto: (leadId, photoUrl) => set((s: any) => ({ leads: s.leads.map((l: any) => l.id === leadId ? { ...l, photos: (l.photos || []).filter((p: any) => p !== photoUrl) } : l) })),
  reorderLeadPhotos: (leadId, photos) => set((s: any) => ({ leads: s.leads.map((l: any) => l.id === leadId ? { ...l, photos } : l) })),
  setSMSMessages: (msgs) => set({ smsMessages: msgs }),
  addSMSMessage: (msg) => {
    set((s: any) => ({ smsMessages: [...s.smsMessages, msg] }));
    const lead = get().leads.find(l => l.phone === msg.phone_number);
    automationEngine.trigger('SMS_RECEIVED', { message: msg, phone: msg.phone_number, ...(lead || {}), id: lead?.id });
  },
  markSMSAsRead: (phoneNumber) => set((s: any) => ({ smsMessages: s.smsMessages.map((m: any) => m.phone_number === phoneNumber || normalizePhone(m.phone_number) === normalizePhone(phoneNumber) ? { ...m, is_read: true } : m) })),
  syncSMSUnreadCount: async () => {
    const { currentUser } = get();
    if (!currentUser?.id || !supabase) return;
    try {
      const { count } = await supabase.from('sms_messages').select('*', { count: 'exact', head: true }).eq('is_read', false).eq('direction', 'inbound').or(`user_id.eq.${currentUser.id},agent_id.eq.${currentUser.id}`);
      set((s: any) => ({ unreadCounts: { ...s.unreadCounts, sms: count || 0 } }));
    } catch (err) { console.error(err); }
  },
  incrementAiUsage: async (amount = 1) => {
    const { currentUser, credits_remaining, total_credits_used_today } = get();
    const newRemaining = Math.max(0, (credits_remaining || 0) - amount);
    const newUsedToday = (total_credits_used_today || 0) + amount;
    
    set({ 
      credits_remaining: newRemaining,
      total_credits_used_today: newUsedToday
    });

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ 
            credits_remaining: newRemaining,
            total_credits_used_today: newUsedToday,
            last_ai_usage_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('❌ Failed to sync AI usage to Supabase:', err);
      }
    }
  },
  setAiUsage: (model, used, limit) => {
    set((s) => ({
      aiUsage: {
        ...s.aiUsage,
        [model]: { 
          used, 
          limit: limit || 0, 
          lastReset: s.aiUsage[model]?.lastReset || new Date().toISOString(),
          lastUpdated: new Date().toISOString() 
        }
      }
    }));
    // Also update credits remaining based on usage if applicable
    if (model === 'premium-credits' && limit !== undefined) {
      set({ credits_remaining: limit - used });
    }
  },
  createAiThread: (title) => {
    const id = uuidv4();
    const newThread: AIThread = { id, title: title || 'New Conversation', createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString() };
    set((s) => {
      const updatedThreads = [newThread, ...s.aiThreads];
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-threads', JSON.stringify(updatedThreads));
        localStorage.setItem('current-ai-thread-id', id);
      }
      return { aiThreads: updatedThreads, currentAiThreadId: id, aiMessages: { ...s.aiMessages, [id]: [] } };
    });
    return id;
  },
  deleteAiThread: (id) => {
    set((s) => {
      const updatedThreads = s.aiThreads.filter(t => t.id !== id);
      const newMessages = { ...s.aiMessages };
      delete newMessages[id];
      let newCurrentId = s.currentAiThreadId;
      if (s.currentAiThreadId === id) newCurrentId = updatedThreads.length > 0 ? updatedThreads[0].id : null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-threads', JSON.stringify(updatedThreads));
        if (newCurrentId) localStorage.setItem('current-ai-thread-id', newCurrentId);
        else localStorage.removeItem('current-ai-thread-id');
        localStorage.setItem('ai-messages-map', JSON.stringify(newMessages));
      }
      return { aiThreads: updatedThreads, currentAiThreadId: newCurrentId, aiMessages: newMessages };
    });
  },
  setCurrentAiThread: (id) => {
    set({ currentAiThreadId: id });
    if (typeof window !== 'undefined') localStorage.setItem('current-ai-thread-id', id);
  },
  updateAiThreadTitle: (id, title) => {
    set((s) => {
      const updatedThreads = s.aiThreads.map(t => t.id === id ? { ...t, title } : t);
      if (typeof window !== 'undefined') localStorage.setItem('ai-threads', JSON.stringify(updatedThreads));
      return { aiThreads: updatedThreads };
    });
  },
  toggleAiThreadPin: (id: string) => {
    set((s) => {
      const updatedThreads = s.aiThreads.map((t: AIThread) => t.id === id ? { ...t, pinned: !t.pinned } : t).sort((a: AIThread, b: AIThread) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(); });
      if (typeof window !== 'undefined') localStorage.setItem('ai-threads', JSON.stringify(updatedThreads));
      return { aiThreads: updatedThreads };
    });
  },
  addAiMessage: (threadId: string, message: AIBotMessage) => {
    set((s) => {
      const threadMessages = s.aiMessages[threadId] || [];
      const updatedMessages = [...threadMessages, message];
      const newMessagesMap = { ...s.aiMessages, [threadId]: updatedMessages };
      const updatedThreads = s.aiThreads.map((t: AIThread) => t.id === threadId ? { ...t, lastMessageAt: new Date().toISOString() } : t).sort((a: AIThread, b: AIThread) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(); });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ai-messages-map', JSON.stringify(newMessagesMap));
        localStorage.setItem('ai-threads', JSON.stringify(updatedThreads));
      }
      return { aiMessages: newMessagesMap, aiThreads: updatedThreads };
    });
  },
  clearAiThreadMessages: (threadId) => {
    set((s) => {
      const newMessagesMap = { ...s.aiMessages, [threadId]: [] };
      if (typeof window !== 'undefined') localStorage.setItem('ai-messages-map', JSON.stringify(newMessagesMap));
      return { aiMessages: newMessagesMap };
    });
  },
  addContact: (contact) => {
    const newContact: SavedContact = { ...contact, id: uuidv4(), createdAt: new Date().toISOString() };
    set((state: AppState) => {
      const next = [...state.contacts, newContact];
      if (typeof window !== 'undefined') {
        localStorage.setItem('sms-contacts', JSON.stringify(next));
      }
      return { contacts: next };
    });
  },

  removeContact: (id) => {
    set((state: AppState) => {
      const next = state.contacts.filter((c) => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sms-contacts', JSON.stringify(next));
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
        localStorage.setItem('sms-contacts', JSON.stringify(next));
      }
      return { contacts: next };
    });
  },

  setQuickNotes: (v: string) => {
    set({ quickNotes: v });
    if (typeof window !== 'undefined') {
      localStorage.setItem('tasks-quick-notes', v);
    }
    const { currentUser } = get();
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const s = supabase;
      s.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then(({ data: profile }: { data: any }) => {
          const currentSettings = profile?.settings || {};
          s.from('profiles')
            .update({ settings: { ...currentSettings, quick_notes: v } })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },

  setActiveLeadModalId: (id: string | null) => set({ activeLeadModalId: id }),

  setShowQuickNotes: (v: boolean) => {
    set({ showQuickNotes: v });
    if (typeof window !== 'undefined') {
      localStorage.setItem('tasks-show-quick-notes', v.toString());
    }
  },
  setQuickNotesOpen: (v: boolean) => {
    set({ isQuickNotesOpen: v });
  },
  setNotesDocked: (v: boolean) => {
    set({ notesDocked: v });
  },
  setQuickNotesSize: (v: 'small' | 'medium' | 'large') => {
    set({ quickNotesSize: v });
  },
  setIsQuickNotesCollapsed: (v: boolean) => {
    set({ isQuickNotesCollapsed: v });
  },

  updateNotificationSettings: (updates: Partial<NotificationSettings>) => {
    const { currentUser } = get();
    set((s) => {
      const next = { ...s.notificationSettings, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem('wholescale-notifications', JSON.stringify(next));
      }

      // Sync to Supabase
      if (currentUser?.id && isSupabaseConfigured && supabase) {
        const supabaseClient = supabase;
        supabaseClient.from('profiles')
          .select('settings')
          .eq('id', currentUser.id)
          .maybeSingle()
          .then(({ data: profile }: { data: any }) => {
            const currentSettings = profile?.settings || {};
            supabaseClient.from('profiles')
              .update({ 
                settings: { 
                  ...currentSettings, 
                  notifications: next 
                } 
              })
              .eq('id', currentUser.id)
              .then();
          });
      }

      return { notificationSettings: next };
    });
  },

  setAiName: (name: string) => {
    const { currentUser } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-ai-name', name);
    }
    set({ aiName: name });
    
    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;
      supabaseClient.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then(({ data: profile }: { data: any }) => {
          const currentSettings = profile?.settings || {};
          supabaseClient.from('profiles')
            .update({ settings: { ...currentSettings, ai_name: name } })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },
  decrementPremiumMessages: () => {}, // Limit removed
  setAiModel: (model: string) => {
    const { currentUser } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-ai-model', model);
    }
    set({ aiModel: model });

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;
      supabaseClient.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabaseClient.from('profiles')
            .update({ settings: { ...currentSettings, active_ai_model: model } })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },
  setAiPersonality: (personality: string) => {
    const { currentUser } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-ai-personality', personality);
    }
    set({ aiPersonality: personality });

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;
      supabaseClient.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabaseClient.from('profiles')
            .update({ settings: { ...currentSettings, ai_personality: personality } })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },
  setAiTone: (tone: string) => {
    const { currentUser } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-ai-tone', tone);
    }
    set({ aiTone: tone });

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;
      supabaseClient.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabaseClient.from('profiles')
            .update({ settings: { ...currentSettings, ai_tone: tone } })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },
  setAiCustomPrompt: (prompt: string) => {
    const { currentUser } = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-ai-custom-prompt', prompt);
    }
    set({ aiCustomPrompt: prompt });

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;
      supabaseClient.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabaseClient.from('profiles')
            .update({ settings: { ...currentSettings, ai_custom_prompt: prompt } })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },

  setDashboardLayout: (layout: any[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-layout', JSON.stringify(layout));
    }
    set({ dashboardLayout: layout });
  },

  setCursorSettings: (settings: Partial<CursorSettings>) => {
    set((s: any) => ({ cursorSettings: { ...s.cursorSettings, ...settings } }));
  },

  updateMilestone: (id: string, current: number) => {
    const { currentUser, milestones } = get();
    const next = milestones.map(m => m.id === id ? { ...m, current } : m);
    set({ milestones: next });
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-milestones', JSON.stringify(next));
    }

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;
      supabaseClient.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          supabaseClient.from('profiles')
            .update({ 
              settings: { 
                ...currentSettings, 
                team_milestones: next 
              } 
            })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },

  setMilestones: (milestones: TeamMilestone[]) => {
    set({ milestones });
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-milestones', JSON.stringify(milestones));
    }
  },

  addMilestone: (m: Omit<TeamMilestone, 'id'>) => {
    const { currentUser, milestones } = get();
    const newId = Math.random().toString(36).substr(2, 9);
    const next = [...milestones, { ...m, id: newId }];
    set({ milestones: next });
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-milestones', JSON.stringify(next));
    }

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const s = supabase;
      s.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          s.from('profiles')
            .update({ 
              settings: { 
                ...currentSettings, 
                team_milestones: next 
              } 
            })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },

  deleteMilestone: (id: string) => {
    const { currentUser, milestones } = get();
    const next = milestones.filter(m => m.id !== id);
    set({ milestones: next });
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-milestones', JSON.stringify(next));
    }

    if (currentUser?.id && isSupabaseConfigured && supabase) {
      const s = supabase;
      s.from('profiles')
        .select('settings')
        .eq('id', currentUser.id)
        .maybeSingle()
        .then((res: any) => {
          const profile = res.data;
          const currentSettings = profile?.settings || {};
          s.from('profiles')
            .update({ 
              settings: { 
                ...currentSettings, 
                team_milestones: next 
              } 
            })
            .eq('id', currentUser.id)
            .then();
        });
    }
  },

  transferTeamOwnership: (memberId: string) => {
    const { teamConfig } = get();
    if (teamConfig) {
      set({ teamConfig: { ...teamConfig, createdBy: memberId } });
      // In a real app, we would also update the database here via teamService
    }
  },

  sendAutomationSms: async (leadId, content) => {
    const { currentUser, leads } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !currentUser) return;

    const now = new Date().toISOString();
    const msgId = uuidv4();
    
    const newMsg: SMSMessage = {
      id: msgId,
      user_id: currentUser.id,
      lead_id: leadId,
      phone_number: lead.phone,
      content,
      direction: 'outbound',
      is_read: true,
      created_at: now
    };

    // Add to SMS list
    set((s) => ({ smsMessages: [...s.smsMessages, newMsg] }));

    // Add to Lead Timeline
    const timelineEntry: TimelineEntry = {
      id: uuidv4(),
      type: 'call', // Using 'call' icon for SMS for now or 'note'
      content: `[Automation] SMS Sent: ${content}`,
      timestamp: now,
      user: 'Automation Bot'
    };

    set((s) => ({
      leads: s.leads.map(l => l.id === leadId ? {
        ...l,
        timeline: [timelineEntry, ...(l.timeline || [])]
      } : l)
    }));

    // Sync to Supabase if available
    if (isSupabaseConfigured && supabase) {
      await supabase.from('sms_messages').insert({
        id: msgId,
        user_id: currentUser.id,
        lead_id: leadId,
        phone_number: lead.phone,
        content,
        direction: 'outbound',
        is_read: true,
        created_at: now
      });
      
      await supabase.from('timeline_entries').insert({
        lead_id: leadId,
        type: 'call',
        content: `[Automation] SMS Sent: ${content}`,
        user_name: 'Automation Bot',
        created_at: now
      });
    }
  },

  sendAutomationEmail: async (leadId, subject, content) => {
    const { leads } = get();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const now = new Date().toISOString();
    
    // Add to Lead Timeline
    const timelineEntry: TimelineEntry = {
      id: uuidv4(),
      type: 'email',
      content: `[Automation] Email Sent: ${subject}`,
      timestamp: now,
      user: 'Automation Bot',
      metadata: { body: content }
    };

    set((s) => ({
      leads: s.leads.map(l => l.id === leadId ? {
        ...l,
        timeline: [timelineEntry, ...(l.timeline || [])]
      } : l)
    }));

    // Sync to Supabase if available
    if (isSupabaseConfigured && supabase) {
      await supabase.from('timeline_entries').insert({
        lead_id: leadId,
        type: 'email',
        content: `[Automation] Email Sent: ${subject}`,
        user_name: 'Automation Bot',
        created_at: now,
        metadata: { body: content }
      });
    }
  },
}));
