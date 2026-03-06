import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { leadsService, tasksService, teamService, chatService, notificationsService, mapService } from '../lib/supabase-service';

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

// ─── AI Types ────────────────────────────────────────────────────────────────

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
  high: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400', label: 'High Priority' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400', label: 'Medium Priority' },
  low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Low Priority' },
};

// ─── Utilities ───────────────────────────────────────────────────────────────

export function calculateDealScore(lead: Lead): number {
  const valueCap = 500000;
  const valueScore = Math.min(lead.estimatedValue / valueCap, 1) * 100;
  const probScore = lead.probability;
  const engageScore = ((lead.engagementLevel - 1) / 4) * 100;
  const urgencyScore = ((lead.timelineUrgency - 1) / 4) * 100;
  const competitionScore = ((5 - lead.competitionLevel) / 4) * 100;
  const raw = valueScore * 0.30 + probScore * 0.25 + engageScore * 0.20 + urgencyScore * 0.15 + competitionScore * 0.10;
  return Math.round(Math.min(Math.max(raw, 0), 100));
}

export function getScoreColor(score: number) {
  if (score >= 70) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/40', bar: 'bg-emerald-500', label: 'Hot' };
  if (score >= 40) return { bg: 'bg-amber-500/15', text: 'text-amber-400', ring: 'ring-amber-500/40', bar: 'bg-amber-500', label: 'Warm' };
  return { bg: 'bg-red-500/15', text: 'text-red-400', ring: 'ring-red-500/40', bar: 'bg-red-500', label: 'Cold' };
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

const PASTE_PATTERNS: Record<string, { regex: RegExp; priority: number }> = {
  email: { regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, priority: 99 },
  phone: { regex: /^[\(\+]?\d[\d\s\-\(\)\.]{6,}\d$/, priority: 95 },
  currency: { regex: /^\$[\d,]+(\.\d{2})?$/, priority: 94 },
  url: { regex: /^https?:\/\/[^\s]+$/, priority: 93 },
  date: { regex: /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$|^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i, priority: 90 },
  address: { regex: /^\d+\s+[A-Za-z].*(?:St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pl|Cir|Pkwy|Hwy|Street|Avenue|Boulevard|Drive|Road|Lane|Court|Circle|Parkway|Highway)\b/i, priority: 88 },
  number: { regex: /^[\d,]+(\.\d+)?$/, priority: 50 },
};

function detectDelimiter(text: string): string {
  const firstLines = text.split('\n').slice(0, 5).join('\n');
  const counts: Record<string, number> = { '\t': 0, ',': 0, '|': 0, ';': 0 };

  for (const char of Object.keys(counts)) {
    counts[char] = (firstLines.match(new RegExp(char === '|' ? '\\|' : char, 'g')) || []).length;
  }

  if (counts['\t'] > 0) return '\t';
  
  const lines = text.trim().split('\n').slice(0, 5);
  const commaCounts = lines.map(l => (l.match(/,/g) || []).length);
  const consistentCommas = commaCounts.every(c => c === commaCounts[0] && c > 0);
  if (consistentCommas) return ',';
  
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] > 0) return sorted[0][0];
  
  return ',';
}

function isLikelyHeader(cells: string[]): boolean {
  const headerScore = cells.filter(c => {
    const cleaned = c.trim();
    return cleaned.length > 0 && cleaned.length < 30 &&
      !/^\d+$/.test(cleaned) && !/\$/.test(cleaned) &&
      !/^[\(\+]?\d/.test(cleaned) && !/@/.test(cleaned);
  }).length;
  return headerScore >= cells.length * 0.6;
}

function detectColumnType(values: string[]): { type: ParsedColumn['detectedType']; confidence: number } {
  const nonEmpty = values.filter(v => v.trim().length > 0);
  if (nonEmpty.length === 0) return { type: 'text', confidence: 10 };

  const typeCounts: Record<string, number> = {};
  
  for (const val of nonEmpty) {
    const trimmed = val.trim();
    let matched = false;
    
    for (const [typeName, { regex }] of Object.entries(PASTE_PATTERNS)) {
      if (regex.test(trimmed)) {
        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      const words = trimmed.split(/\s+/);
      // Detect names: 2-4 words, most starting with uppercase, no numbers, reasonable length
      const looksLikeName = words.length >= 2 && words.length <= 4 &&
        words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.5 &&
        trimmed.length < 40 && !/\d{3,}/.test(trimmed) && !/@/.test(trimmed) && !/\$/.test(trimmed);
      if (looksLikeName) {
        typeCounts['name'] = (typeCounts['name'] || 0) + 1;
      } else {
        typeCounts['text'] = (typeCounts['text'] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { type: 'text', confidence: 10 };

  const [topType, topCount] = sorted[0];
  const ratio = topCount / nonEmpty.length;
  const baseConfidence = ratio * 100;
  const priority = PASTE_PATTERNS[topType]?.priority || 50;
  const confidence = Math.round(Math.min(baseConfidence * (priority / 100) + 20, 99));

  return {
    type: topType as ParsedColumn['detectedType'],
    confidence,
  };
}

function generateHeaderName(colIndex: number, type: string): string {
  const typeLabels: Record<string, string> = {
    name: 'Name', email: 'Email', phone: 'Phone', address: 'Address',
    currency: 'Value', number: 'Number', date: 'Date', url: 'URL', text: 'Text',
  };
  const label = typeLabels[type] || 'Column';
  return `${label} ${colIndex + 1}`;
}

export function parsePastedData(text: string): ParsedPasteResult {
  if (!text.trim()) {
    return { rows: [], headers: [], columns: [], delimiter: ',', rowCount: 0 };
  }

  const delimiter = detectDelimiter(text);
  const rawLines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (rawLines.length === 0) {
    return { rows: [], headers: [], columns: [], delimiter, rowCount: 0 };
  }

  const allRows = rawLines.map(line => {
    if (delimiter === ',') {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
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
    return line.split(delimiter).map(c => c.trim());
  });

  const maxCols = Math.max(...allRows.map(r => r.length));
  const normalized = allRows.map(r => {
    while (r.length < maxCols) r.push('');
    return r;
  });

  const hasHeader = normalized.length > 1 && isLikelyHeader(normalized[0]);
  const headers = hasHeader ? normalized[0] : [];
  const dataRows = hasHeader ? normalized.slice(1) : normalized;

  const columns: ParsedColumn[] = [];
  for (let col = 0; col < maxCols; col++) {
    const values = dataRows.map(r => r[col] || '');
    const { type, confidence } = detectColumnType(values);
    const samples = values.filter(v => v.trim()).slice(0, 3);
    const name = hasHeader && headers[col] ? headers[col] : generateHeaderName(col, type);

    columns.push({ name, detectedType: type, confidence, samples });
  }

  return {
    rows: dataRows,
    headers: hasHeader ? headers : columns.map(c => c.name),
    columns,
    delimiter,
    rowCount: dataRows.length,
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
  name: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Name' },
  email: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'Email' },
  phone: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Phone' },
  address: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Address' },
  currency: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Currency' },
  number: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Number' },
  date: { bg: 'bg-pink-500/15', text: 'text-pink-400', label: 'Date' },
  url: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', label: 'URL' },
  text: { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Text' },
};

export function generateInviteCode(): string {
  return `WS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: '#10b981',
  offline: '#64748b',
  busy: '#ef4444',
  dnd: '#f59e0b',
};

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  busy: 'Busy',
  dnd: 'Do Not Disturb',
};

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' },
  medium: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  high: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  urgent: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
};

export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  'todo': { bg: 'bg-slate-500/15', text: 'text-slate-400' },
  'in-progress': { bg: 'bg-brand-500/15', text: 'text-brand-400' },
  'done': { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  'cancelled': { bg: 'bg-red-500/15', text: 'text-red-400' },
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
  unreadCounts: Record<string, number>;

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

  // Notifications
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearAllNotifications: () => void;

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
}

export const useStore = create<AppState>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────
  isAuthenticated: false,
  currentUser: null,
  authLoading: false,
  authError: null,

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
    unreadCounts: {},
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

  // ── Sync ──────────────────────────────────────────────────
  teamId: null,
  dataLoaded: false,
  setTeamId: (id) => set({ teamId: id }),
  setDataLoaded: (loaded) => set({ dataLoaded: loaded }),
  setBulkData: (data) => set(data as Partial<AppState>),

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
    if (teamId && isSupabaseConfigured) {
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
    if (isSupabaseConfigured) leadsService.remove(id).catch(() => {});
  },

  addTimelineEntry: (leadId, entry) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, timeline: [...l.timeline, { ...entry, id: uuidv4() }], updatedAt: new Date().toISOString() }
          : l
      ),
    })),

  // FIXED: Now saves to Supabase
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

      // Save to Supabase
      if (isSupabaseConfigured) {
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
    if (teamId && isSupabaseConfigured) {
      teamService.updatePresence(teamId, id, status).catch(() => {});
    }
  },

  setCustomStatus: (id, msg) =>
    set((s) => ({ team: s.team.map((m) => m.id === id ? { ...m, customStatus: msg } : m) })),

  updateMemberRole: (id, role) => {
    set((s) => ({ team: s.team.map((m) => m.id === id ? { ...m, teamRole: role } : m) }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured) {
      teamService.updateRole(teamId, id, role).catch(() => {});
    }
  },

  addTeamMember: (member) =>
    set((s) => ({ team: [...s.team, { ...member, id: uuidv4() }] })),

  removeTeamMember: (id) => {
    set((s) => ({ team: s.team.filter((m) => m.id !== id) }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured) {
      teamService.removeMember(teamId, id).catch(() => {});
    }
  },

  regenerateInviteCode: () => {
    const newCode = generateInviteCode();
    set((s) => ({ teamConfig: { ...s.teamConfig, inviteCode: newCode } }));
    // Persist to Supabase
    const { teamId } = get();
    if (teamId && isSupabaseConfigured) {
      import('../lib/supabase').then(({ supabase: sb }) => {
        if (sb) {
          sb.from('teams').update({ invite_code: newCode }).eq('id', teamId).then(() => {});
        }
      });
    }
  },

  updateTeamConfig: (updates) => {
    set((s) => ({ teamConfig: { ...s.teamConfig, ...updates } }));
    // Persist team name or other config to Supabase
    const { teamId } = get();
    if (teamId && isSupabaseConfigured) {
      import('../lib/supabase').then(({ supabase: sb }) => {
        if (sb) {
          const dbUpdates: Record<string, unknown> = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.inviteCode !== undefined) dbUpdates.invite_code = updates.inviteCode;
          if (Object.keys(dbUpdates).length > 0) {
            sb.from('teams').update(dbUpdates).eq('id', teamId).then(() => {});
          }
        }
      });
    }
  },

  // ── Tasks (empty — loaded from Supabase) ──────────────────
  tasks: [],

  addTask: (task) => {
    const newId = uuidv4();
    const now = new Date().toISOString();
    set((s) => ({ tasks: [...s.tasks, { ...task, id: newId, createdAt: now, completedAt: null }] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured) {
      tasksService.create({
        id: newId, team_id: teamId, title: task.title, description: task.description,
        assigned_to: task.assignedTo || null, created_by: task.createdBy || null,
        lead_id: task.leadId || null, status: task.status, priority: task.priority,
        due_date: task.dueDate || null,
      }).catch(() => {});
    }
  },

  updateTask: (id, updates) => {
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) tasksService.remove(id).catch(() => {});
  },

  completeTask: (id) => {
    const now = new Date().toISOString();
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: 'done' as TaskStatus, completedAt: now } : t) }));
    if (isSupabaseConfigured) tasksService.complete(id).catch(() => {});
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
    if (teamId && isSupabaseConfigured) {
      mapService.createBuyer({
        id: newId, team_id: teamId, name: buyer.name, email: buyer.email, phone: buyer.phone,
        lat: buyer.lat, lng: buyer.lng, budget_min: buyer.budgetMin, budget_max: buyer.budgetMax,
        active: buyer.active, deal_score: buyer.dealScore, notes: buyer.notes, criteria: buyer.criteria,
      }).catch(() => {});
    }
  },
  updateBuyer: (id, updates) => {
    set((s) => ({ buyers: s.buyers.map((b) => b.id === id ? { ...b, ...updates } : b) }));
    if (isSupabaseConfigured) {
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
    if (isSupabaseConfigured) mapService.deleteBuyer(id).catch(() => {});
  },
  addCoverageArea: (area) => {
    const newId = uuidv4();
    set((s) => ({ coverageAreas: [...s.coverageAreas, { ...area, id: newId, createdAt: new Date().toISOString() }] }));
    const { teamId } = get();
    if (teamId && isSupabaseConfigured) {
      mapService.createCoverageArea({
        id: newId, team_id: teamId, name: area.name, coordinates: JSON.stringify(area.coordinates),
        color: area.color, opacity: area.opacity, notes: area.notes,
      }).catch(() => {});
    }
  },
  updateCoverageArea: (id, updates) => set((s) => ({ coverageAreas: s.coverageAreas.map((a) => a.id === id ? { ...a, ...updates } : a) })),
  deleteCoverageArea: (id) => {
    set((s) => ({ coverageAreas: s.coverageAreas.filter((a) => a.id !== id) }));
    if (isSupabaseConfigured) mapService.deleteCoverageArea(id).catch(() => {});
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
  unreadCounts: {},

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
    if (isSupabaseConfigured) {
      chatService.sendMessage({
        id: newId, channel_id: channelId, user_id: user.id, sender_name: user.name,
        content, type, mentions, reply_to_id: replyToId, attachments: attachments.length ? attachments : [],
      }).catch(() => {});
    }
  },

  editMessage: (channelId, messageId, newContent) =>
    set((s) => {
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => m.id === messageId ? { ...m, content: newContent, edited: true } : m),
        },
      };
    }),

  deleteMessage: (channelId, messageId) =>
    set((s) => {
      const msgs = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: msgs.map(m => m.id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m),
        },
      };
    }),

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
    set((s) => ({
      channels: [...s.channels, {
        id, name, type, members, description,
        avatar: type === 'group' ? '💬' : name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        createdAt: new Date().toISOString(), createdBy: user?.id || '',
        lastMessageAt: new Date().toISOString(), pinnedMessageIds: [],
      }],
      messages: { ...s.messages, [id]: [] },
      unreadCounts: { ...s.unreadCounts, [id]: 0 },
    }));
    return id;
  },

  deleteChannel: (channelId) =>
    set((s) => {
      const newMsgs = { ...s.messages };
      delete newMsgs[channelId];
      const newUnread = { ...s.unreadCounts };
      delete newUnread[channelId];
      return {
        channels: s.channels.filter(ch => ch.id !== channelId),
        messages: newMsgs,
        unreadCounts: newUnread,
        currentChannelId: s.currentChannelId === channelId ? (s.channels[0]?.id || null) : s.currentChannelId,
      };
    }),

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
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('wholescale-theme', theme);
    }
    // Persist to Supabase profile
    if (supabase && isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          supabase!.from('profiles').select('settings').eq('id', data.user.id).single().then(({ data: profile }) => {
            const existing = (profile?.settings as Record<string, unknown>) || {};
            supabase!.from('profiles').update({ settings: { ...existing, theme } }).eq('id', data.user!.id).then(({ error }) => {
              if (error) console.error('Failed to save theme:', error);
              else console.log('✅ Theme saved to Supabase:', theme);
            });
          });
        }
      });
    }
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
    if (isSupabaseConfigured && currentUser) {
      notificationsService.create({ id: newId, user_id: currentUser.id, type: notif.type, title: notif.title, message: notif.message }).catch(() => {});
    }
  },

  markNotificationRead: (id) => {
    set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    if (isSupabaseConfigured) notificationsService.markRead(id).catch(() => {});
  },

  markAllNotificationsRead: () => {
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }));
    const { currentUser } = get();
    if (isSupabaseConfigured && currentUser) notificationsService.markAllRead(currentUser.id).catch(() => {});
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
    const { currentUser } = get();
    if (isSupabaseConfigured && currentUser) notificationsService.clearAll(currentUser.id).catch(() => {});
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

    // Save to Supabase
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
  memberStreaks: {},

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
}));