/**
 * CRM Synonym Mapper
 * Translates various user-facing terms into standardized CRM keywords
 * to help the regex engine and logic matching.
 */

const SYNONYM_MAP: Record<string, string> = {
  // Leads synonyms
  'deals': 'leads',
  'deal': 'lead',
  'clients': 'leads',
  'client': 'lead',
  'people': 'leads',
  'contacts': 'leads',
  'contact': 'lead',
  'pipeline': 'leads',
  'records': 'leads',
  
  // Tasks synonyms
  'actions': 'tasks',
  'action': 'task',
  'todo': 'task',
  'todos': 'tasks',
  'reminders': 'tasks',
  'reminder': 'task',
  'objectives': 'tasks',
  'objective': 'task',
  'to do': 'task',
  'to-do': 'task',
  
  // Communications
  'message': 'sms',
  'ping': 'sms',
  'blast': 'sms',
  'reach out': 'sms',
  
  // Calendar
  'appointments': 'calendar',
  'appointment': 'calendar',
  'schedule': 'calendar',
  'agenda': 'calendar',
  'events': 'calendar',
};

/**
 * Expands a normalized phrase by replacing synonyms with core keywords.
 * Also returns a "keyword-dense" version for better fuzzy scoring.
 */
export function expandSynonyms(input: string): string {
  let expanded = input.toLowerCase();
  
  // Replace multi-word synonyms first
  if (expanded.includes('to do')) expanded = expanded.replace('to do', 'task');
  if (expanded.includes('reach out')) expanded = expanded.replace('reach out', 'sms');

  const words = expanded.split(/\s+/);
  const mappedWords = words.map(word => SYNONYM_MAP[word] || word);
  
  return mappedWords.join(' ');
}

/**
 * Checks if any of the target keywords are present (including synonyms).
 */
export function hasKeyword(input: string, keyword: string): boolean {
  const expanded = expandSynonyms(input);
  return expanded.includes(keyword);
}
