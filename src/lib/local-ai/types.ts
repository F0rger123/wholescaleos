/**
 * Core types for the OS Bot AI system (v11.0).
 */

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
  clean?: boolean;
  reasoning?: string[]; // Chain of Thought traces
  nextIntent?: { name: string; params: any }; // Proactive task chaining
  needsConfirmation?: boolean; // v12.1 Affirmation Loop
}

export interface Entity {
  id: string;
  name: string;
  type: 'lead' | 'task' | 'contact' | 'appointment' | 'unknown';
  lastMentioned?: number;
}
