import { useStore } from '../../store/useStore';
import { sendSMS } from '../sms-service';

/**
 * Tool interface defining the structure for AI-callable functions
 */
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (params: any) => Promise<any>;
}

/**
 * Registry of tools available to the AI agent
 */
export const toolRegistry: Record<string, Tool> = {
  create_lead: {
    name: 'create_lead',
    description: 'Create a new real estate lead in the CRM.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name of the lead' },
        email: { type: 'string', description: 'Email address of the lead' },
        phone: { type: 'string', description: 'Phone number of the lead' },
        location: { type: 'string', description: 'Property address or location' },
      },
      required: ['name'],
    },
    execute: async (params) => {
      console.log('🤖 AI Tool: create_lead', params);
      return useStore.getState().addLead({
        name: params.name,
        email: params.email || '',
        phone: params.phone || '',
        propertyAddress: params.location || '',
        status: 'new',
        source: 'ai_bot',
        propertyType: 'single-family',
        estimatedValue: 0,
        bedrooms: 0,
        bathrooms: 0,
        sqft: 0,
        offerAmount: 0,
        lat: 0,
        lng: 0,
        notes: 'Created by OS Bot via AI Command',
        assignedTo: '',
        probability: 50,
        engagementLevel: 50,
        timelineUrgency: 50,
        competitionLevel: 50,
        documents: [],
      });
    },
  },
  create_task: {
    name: 'create_task',
    description: 'Create a new task or follow-up reminder.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the task' },
        due_date: { type: 'string', description: 'Due date in ISO format' },
        priority: { 
          type: 'string', 
          enum: ['low', 'medium', 'high', 'urgent'], 
          description: 'Priority level' 
        },
      },
      required: ['title'],
    },
    execute: async (params) => {
      console.log('🤖 AI Tool: create_task', params);
      return useStore.getState().addTask({
        title: params.title,
        description: 'Scheduled by OS Bot',
        assignedTo: '',
        dueDate: params.due_date || new Date().toISOString(),
        priority: params.priority || 'medium',
        status: 'todo',
        createdBy: 'OS Bot',
      });
    },
  },
  send_sms: {
    name: 'send_sms',
    description: 'Send an SMS message to a contact.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient phone number' },
        message: { type: 'string', description: 'SMS message content' },
      },
      required: ['to', 'message'],
    },
    execute: async (params) => {
      console.log('🤖 AI Tool: send_sms', params);
      return sendSMS(params.to, params.message);
    },
  },
  update_lead_status: {
    name: 'update_lead_status',
    description: 'Update the status of an existing lead.',
    parameters: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'The unique ID of the lead' },
        status: { 
          type: 'string', 
          enum: ['new', 'contacted', 'qualified', 'negotiating', 'closed-won', 'closed-lost', 'contract-in', 'under-contract', 'follow-up'],
          description: 'The new status for the lead' 
        },
      },
      required: ['lead_id', 'status'],
    },
    execute: async (params) => {
      console.log('🤖 AI Tool: update_lead_status', params);
      return useStore.getState().updateLeadStatus(params.lead_id, params.status as any, 'OS Bot');
    },
  },
  navigate: {
    name: 'navigate',
    description: 'Navigate to a specific page or section in the CRM.',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: 'The URL path to navigate to (e.g., /leads, /tasks, /calendar, /analytics)',
          enum: ['/leads', '/tasks', '/calendar', '/analytics', '/settings', '/sms', '/team', '/admin']
        },
      },
      required: ['path'],
    },
    execute: async (params) => {
      console.log('🤖 AI Tool: navigate', params);
      window.location.hash = params.path; // Simple hash-based navigation for now
      return { success: true, message: `Navigated to ${params.path}` };
    },
  },
  update_lead: {
    name: 'update_lead',
    description: 'Update any field on an existing lead (name, email, phone, etc).',
    parameters: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'The unique ID of the lead' },
        name: { type: 'string', description: 'Updated name' },
        email: { type: 'string', description: 'Updated email' },
        phone: { type: 'string', description: 'Updated phone' },
        propertyAddress: { type: 'string', description: 'Updated address' },
        notes: { type: 'string', description: 'New notes to append' },
      },
      required: ['lead_id'],
    },
    execute: async (params) => {
      console.log('🤖 AI Tool: update_lead', params);
      const { lead_id, ...updates } = params;
      useStore.getState().updateLead(lead_id, updates);
      return { success: true, message: `Lead ${lead_id} updated successfully.` };
    },
  },
};

/**
 * Helper to retrieve a tool by name
 */
export const getTool = (name: string): Tool | undefined => {
  return toolRegistry[name];
};

/**
 * Helper to get all registered tools for LLM context
 */
export const getAvailableTools = () => {
  return Object.values(toolRegistry).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
};
