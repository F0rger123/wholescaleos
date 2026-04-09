import { Node, Edge } from '@xyflow/react';

export const createMultiStepWorkflow = (name: string): { nodes: Node[], edges: Edge[] } => {
  const triggerId = 'trigger-1';
  const aiId = 'ai-1';
  const actionId = 'action-1';

  const nodes: Node[] = [
    {
      id: triggerId,
      type: 'automation',
      position: { x: 250, y: 100 },
      data: { 
        label: name || 'Lead Created', 
        type: 'trigger',
        triggerType: 'new_lead',
        description: 'Triggers when a new lead enters the CRM.'
      },
    },
    {
      id: aiId,
      type: 'automation',
      position: { x: 250, y: 250 },
      data: { 
        label: 'Analyze Lead', 
        type: 'ai',
        description: 'AI analyzes lead data and sentiment.',
        prompt: 'Analyze this lead: {{name}} is interested in {{address}}. Sentiment: {{notes}}. Should we prioritize them? Response must be concise.',
        model: 'gemini-1.5-flash'
      },
    },
    {
      id: actionId,
      type: 'automation',
      position: { x: 250, y: 400 },
      data: { 
        label: 'Send Smart SMS', 
        type: 'action',
        actionType: 'send_sms',
        description: 'Sends a personalized SMS based on AI analysis.',
        message: 'Hey {{name}}, thanks for your interest! I reviewed your property at {{address}} and we would love to chat. {{ai_output}}'
      },
    }
  ];

  const edges: Edge[] = [
    { id: `e-${triggerId}-${aiId}`, source: triggerId, target: aiId, animated: true, style: { stroke: 'var(--t-primary)' } },
    { id: `e-${aiId}-${actionId}`, source: aiId, target: actionId, animated: true, style: { stroke: 'var(--t-primary)' } }
  ];

  return { nodes, edges };
};
