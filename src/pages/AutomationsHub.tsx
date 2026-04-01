import { useState, useCallback, useEffect } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Plus, Save, 
  Settings,
  Webhook, X, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutomationNode } from '../components/AutomationNode';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const nodeTypes = {
  automation: AutomationNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'automation',
    position: { x: 250, y: 50 },
    data: { 
      label: 'New Lead Trigger', 
      type: 'trigger',
      description: 'Fires when a new lead is added via API or manual entry.'
    },
  },
  {
    id: '2',
    type: 'automation',
    position: { x: 250, y: 250 },
    data: { 
      label: 'AI Intent Analysis', 
      type: 'ai',
      description: 'Analyze lead source and notes to determine priority.'
    },
  },
  {
    id: '3',
    type: 'automation',
    position: { x: 100, y: 450 },
    data: { 
      label: 'Send High-Priority SMS', 
      type: 'sms',
      description: 'Immediate SMS response for high-priority leads.'
    },
  },
  {
    id: '4',
    type: 'automation',
    position: { x: 400, y: 450 },
    data: { 
      label: 'Add to Drip Campaign', 
      type: 'action',
      description: 'Standard email sequence for general inquiries.'
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'var(--t-primary)' } },
  { id: 'e2-3', source: '2', target: '3', label: 'Priority > 80', style: { stroke: 'var(--t-success)' } },
  { id: 'e2-4', source: '2', target: '4', label: 'Default', style: { stroke: 'var(--t-border)' } },
];

export default function AutomationsHub() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My New Automation');

  // Load existing workflow on mount
  useEffect(() => {
    async function loadWorkflow() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
          console.error('Error loading workflow:', error);
          toast.error('Failed to load workflow.');
        } else if (data) {
          setWorkflowId(data.id);
          setWorkflowName(data.name || 'My New Automation');
          setNodes(data.nodes as Node[]);
          setEdges(data.edges as Edge[]);
        }
      } catch (err) {
        console.error('Load Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkflow();
  }, []);

  const saveWorkflow = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured.');
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to save workflows.');
        return;
      }

      const workflowData = {
        user_id: user.id,
        name: workflowName, 
        nodes,
        edges,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (workflowId) {
        ({ error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflowId));
      } else {
        const { data, error: insertError } = await supabase
          .from('workflows')
          .insert([workflowData])
          .select()
          .single();
        error = insertError;
        if (data) setWorkflowId(data.id);
      }

      if (error) throw error;
      toast.success('Workflow saved successfully!');
    } catch (err) {
      console.error('Save Error:', err);
      toast.error('Failed to save workflow.');
    } finally {
      setIsLoading(false);
    }
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--t-primary)' } }, eds)),
    [],
  );

  const addNode = (type: string) => {
    const id = (nodes.length + 1).toString();
    const newNode: Node = {
      id,
      type: 'automation',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, 
        type,
        description: 'Configure this node in settings.'
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
            Automations <span className="text-[var(--t-primary)]">Hub</span>
          </h1>
          <p className="text-[var(--t-text-muted)] text-sm">Design and deploy autonomous real estate workflows.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="flex items-center gap-2 px-6 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] rounded-2xl font-bold transition-all hover:bg-[var(--t-surface-hover)]"
          >
            <Settings size={20} />
            Library
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--t-primary)] hover:bg-[var(--t-primary-hover)] text-[var(--t-on-primary)] rounded-2xl font-bold shadow-lg shadow-[var(--t-primary-dim)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={20} />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-[var(--t-surface)] rounded-[2.5rem] border border-[var(--t-border)] overflow-hidden shadow-2xl relative min-h-[600px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--t-border)" />
          <Controls className="!bg-[var(--t-surface)] !border-[var(--t-border)] !fill-[var(--t-text)]" />
          
          <Panel position="top-left" className="m-4 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl z-10 transition-all hover:bg-black/80">
            <div className="flex flex-col gap-0.5">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-transparent border-none text-white font-black italic uppercase tracking-tighter text-lg outline-none focus:ring-0 placeholder:opacity-30 w-48"
                placeholder="Untitled Workflow"
              />
              <div className="flex items-center gap-3 text-[9px] font-bold text-white/40 uppercase tracking-widest pl-0.5">
                <span className="flex items-center gap-1"><Save size={8} /> Autosave On</span>
                <span className="w-1 h-1 rounded-full bg-green-500/50" />
                <span>v1.0.4</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => addNode('trigger')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                title="Add Trigger"
              >
                <Webhook size={14} className="text-green-400 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => addNode('ai')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                title="Add AI Step"
              >
                <Bot size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={saveWorkflow}
                disabled={isLoading}
                className="ml-2 px-4 py-2.5 rounded-xl bg-[var(--t-primary)] hover:bg-[var(--t-primary)]/80 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--t-primary)]/20 flex items-center gap-2 font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
              >
                <Save size={14} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'Saving' : 'Save'}
              </button>
            </div>
          </Panel>

          <Panel position="bottom-right" className="m-4">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live Canvas Active</span>
            </div>
          </Panel>
        </ReactFlow>

        {/* Loading Overlay with Theme Blur */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md pointer-events-none"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                  <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Synchronizing</span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Neural Workflow Bridge</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-modal)] bg-black/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[var(--t-bg)] border border-[var(--t-border)] w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">New Workflow</h2>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)]">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Workflow Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lead Follow-up Engine"
                    className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Description</label>
                  <textarea 
                    placeholder="What does this automation do?"
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] text-[var(--t-text)] rounded-2xl font-bold hover:bg-[var(--t-surface-hover)] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsCreating(false);
                    setNodes(initialNodes);
                  }}
                  className="flex-1 px-6 py-3 bg-[var(--t-primary)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--t-primary-dim)] hover:scale-[1.02] transition-all"
                >
                  Create Canvas
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
