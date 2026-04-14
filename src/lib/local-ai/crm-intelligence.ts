import { Lead, Task, useStore } from '../store/useStore';

/**
 * CRM Intelligence Service
 * Handles complex queries, analytics, and business logic for the OS Bot.
 */

export interface CRMAnalytics {
  conversionRate: number;
  totalLeads: number;
  closedDeals: number;
  topSource: { name: string; count: number };
  pipelineValue: number;
}

export interface ComparisonResult {
  winner: Lead | null;
  reasoning: string[];
  metrics: {
    name: string;
    leadA: string | number;
    leadB: string | number;
    better: 'A' | 'B' | 'Equal';
  }[];
}

/**
 * Calculates conversion rate and other pipeline analytics.
 */
export function getCRMAnalytics(leads: Lead[]): CRMAnalytics {
  const totalLeads = leads.length;
  const closedDeals = leads.filter(l => l.status === 'closed-won').length;
  const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;
  
  const sourceMap: Record<string, number> = {};
  let pipelineValue = 0;
  
  leads.forEach(l => {
    sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    if (['negotiating', 'contract-in', 'under-contract'].includes(l.status)) {
      pipelineValue += l.estimatedValue || 0;
    }
  });
  
  const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
  
  return {
    conversionRate,
    totalLeads,
    closedDeals,
    topSource: { name: topSource[0], count: topSource[1] },
    pipelineValue
  };
}

/**
 * Compares two leads based on deal score, value, and urgency.
 */
export function compareLeads(leadA: Lead, leadB: Lead): ComparisonResult {
  const metrics: ComparisonResult['metrics'] = [];
  let scoreA = 0;
  let scoreB = 0;

  // Deal Score
  const dsA = leadA.dealScore || 0;
  const dsB = leadB.dealScore || 0;
  metrics.push({
    name: 'Deal Score',
    leadA: dsA,
    leadB: dsB,
    better: dsA > dsB ? 'A' : dsA < dsB ? 'B' : 'Equal'
  });
  if (dsA > dsB) scoreA++; else if (dsB > dsA) scoreB++;

  // Estimated Value
  const evA = leadA.estimatedValue || 0;
  const evB = leadB.estimatedValue || 0;
  metrics.push({
    name: 'Est. Value',
    leadA: `$${evA.toLocaleString()}`,
    leadB: `$${evB.toLocaleString()}`,
    better: evA > evB ? 'A' : evA < evB ? 'B' : 'Equal'
  });
  if (evA > evB) scoreA++; else if (evB > evA) scoreB++;

  // Urgency
  const uA = leadA.timelineUrgency || 0;
  const uB = leadB.timelineUrgency || 0;
  metrics.push({
    name: 'Urgency',
    leadA: uA,
    leadB: uB,
    better: uA > uB ? 'A' : uA < uB ? 'B' : 'Equal'
  });
  if (uA > uB) scoreA++; else if (uB > uA) scoreB++;

  return {
    winner: scoreA > scoreB ? leadA : scoreB > scoreA ? leadB : null,
    reasoning: [
      scoreA > scoreB ? `${leadA.name} is the stronger lead overall.` : scoreB > scoreA ? `${leadB.name} is the stronger lead overall.` : "It's a tie between these two.",
      `They differ primarily in ${metrics.find(m => m.better !== 'Equal')?.name || 'no specific area'}.`
    ],
    metrics
  };
}

/**
 * Explains the deal score calculation for a lead.
 */
export function explainDealScore(lead: Lead): string[] {
  const reasons: string[] = [];
  
  // Logic based on useStore.calculateDealScore
  if (lead.estimatedValue && lead.estimatedValue > 500000) {
    reasons.push(`High property value ($${lead.estimatedValue.toLocaleString()}) boosts the score.`);
  }
  
  if (lead.probability && lead.probability > 60) {
    reasons.push(`Strong closing probability (${lead.probability}%) indicates high potential.`);
  }
  
  if (lead.engagementLevel && lead.engagementLevel >= 4) {
    reasons.push(`Excellent engagement level (${lead.engagementLevel}/5) suggests the seller is responsive.`);
  }
  
  if (lead.timelineUrgency && lead.timelineUrgency >= 4) {
    reasons.push(`High urgency (${lead.timelineUrgency}/5) means they want to move fast.`);
  }
  
  if (lead.competitionLevel && lead.competitionLevel <= 2) {
    reasons.push(`Low competition level (${lead.competitionLevel}/5) gives us more leverage.`);
  }
  
  if (reasons.length === 0) {
    reasons.push("The score is currently low due to lack of engagement or lower urgency indicators.");
  }
  
  return reasons;
}

/**
 * Filters leads based on complex criteria.
 */
export function filterLeadsByQuery(leads: Lead[], query: { timeframe?: string, source?: string, status?: string }): Lead[] {
  let filtered = [...leads];
  
  if (query.timeframe === 'last week') {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    filtered = filtered.filter(l => new Date(l.createdAt) >= lastWeek);
  }
  
  if (query.source) {
    filtered = filtered.filter(l => l.source.toLowerCase().includes(query.source!.toLowerCase()));
  }
  
  if (query.status) {
    filtered = filtered.filter(l => l.status.toLowerCase().includes(query.status!.toLowerCase()));
  }
  
  return filtered;
}
