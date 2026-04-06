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
  Panel,
  useReactFlow,
  ReactFlowProvider
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
import { automationTemplates, AutomationTemplate } from '../data/automationTemplates';
import { useStore } from '../store/useStore';

const nodeTypes = {
  automation: AutomationNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'automation',
    position: { x: 250, y: 150 },
    data: { 
      label: 'New Trigger', 
      type: 'trigger',
      description: 'Start your automation here.'
    },
  }
];

const initialEdges: Edge[] = [];

function AutomationsHubContent() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isCreating, setIsCreating] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My New Automation');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { isAutomationRunning } = useStore();
  const { fitView } = useReactFlow();

  // Load existing workflow on mount
  useEffect(() => {
    async function loadWorkflow() {
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading workflow:', error);
          toast.error('Failed to load workflow.');
        } else if (data) {
          setWorkflowId(data.id);
          setWorkflowName(data.name || 'My New Automation');
          setNodes(data.nodes as Node[]);
          setEdges(data.edges as Edge[]);
          setIsActive(data.is_active ?? true);
          
          // Delayed fitView to allow React Flow to initialize nodes
          setTimeout(() => {
            fitView({ duration: 800, padding: 0.2 });
          }, 200);
        }
      } catch (err) {
        console.error('Load Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkflow();
  }, [fitView]);

  const saveWorkflow = async (forcedIsActive?: boolean) => {
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

      const activeStatus = forcedIsActive !== undefined ? forcedIsActive : isActive;

      const workflowData = {
        user_id: user.id,
        name: workflowName, 
        nodes,
        edges,
        is_active: activeStatus,
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
      
      if (forcedIsActive !== undefined) {
          toast.success(`Workflow ${activeStatus ? 'Activated' : 'Deactivated'}`);
      } else {
          toast.success('Workflow saved successfully!');
      }
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

  const loadTemplate = (template: AutomationTemplate) => {
    // Deep clone nodes and edges to avoid reference issues
    const newNodes = JSON.parse(JSON.stringify(template.nodes));
    const newEdges = JSON.parse(JSON.stringify(template.edges));
    
    setNodes(newNodes);
    setEdges(newEdges);
    setWorkflowName(template.name);
    setWorkflowId(null); // Reset ID so it saves as new
    setIsActive(true);
    setIsLibraryOpen(false);
    
    // Zoom to fit the loaded template
    setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
      toast.success(`Loaded Template: ${template.name}`);
    }, 100);
  };

  const addNode = (type: string) => {
    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'automation',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { 
        label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`, 
        type,
        description: 'Configure this node in settings.',
        actionType: type === 'ai' ? 'ai_process' : (type === 'action' ? 'notify' : undefined),
        triggerType: type === 'trigger' ? 'new_lead' : undefined
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
            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border ${
              isLibraryOpen 
                ? 'bg-[var(--t-primary-dim)] border-[var(--t-primary)] text-[var(--t-primary)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-surface-hover)]'
            }`}
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
                <span>v1.1.0</span>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4 bg-white/5 p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={() => {
                  const next = !isActive;
                  setIsActive(next);
                  if (workflowId) saveWorkflow(next);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black uppercase tracking-tighter text-[10px] transition-all ${
                  isActive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                {isActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            {isAutomationRunning && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--t-primary-dim)] border border-[var(--t-primary)] rounded-2xl animate-pulse shadow-lg shadow-[var(--t-primary-dim)] ml-4">
                <div className="w-2 h-2 rounded-full bg-[var(--t-primary)] animate-ping" />
                <span className="text-[10px] font-black italic uppercase tracking-tighter text-[var(--t-primary)]">
                  Automation Running
                </span>
              </div>
            )}

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
                onClick={() => saveWorkflow()}
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
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Lead Follow-up Engine"
                    className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Description</label>
                  <textarea 
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
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
                    const name = createName.trim() || 'My New Automation';
                    setWorkflowName(name);
                    setWorkflowId(null);
                    setNodes([{
                      id: '1',
                      type: 'automation',
                      position: { x: 250, y: 50 },
                      data: { 
                          label: 'Start Trigger', 
                          type: 'trigger', 
                          triggerType: 'new_lead',
                          description: createDesc.trim() || 'Configure your workflow starting point.' 
                      }
                    }]);
                    setEdges([]);
                    setIsActive(true);
                    setIsCreating(false);
                    setCreateName('');
                    setCreateDesc('');
                    toast.success(`Created new workflow: ${name}`);
                    setTimeout(() => fitView({ duration: 800 }), 100);
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

      {/* Library Sidebar */}
      <AnimatePresence>
        {isLibraryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLibraryOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--t-bg)] border-l border-[var(--t-border)] z-[100] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface)]/50 backdrop-blur-xl">
                <div>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                    Automation <span className="text-[var(--t-primary)]">Library</span>
                  </h2>
                  <p className="text-[var(--t-text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">20 Professional Templates</p>
                </div>
                <button 
                  onClick={() => setIsLibraryOpen(false)}
                  className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 flex gap-2 overflow-x-auto border-b border-[var(--t-border)] bg-[var(--t-bg)]">
                {['All', 'Lead Gen', 'Email', 'AI', 'Comms', 'CRM'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      selectedCategory === cat 
                        ? 'bg-[var(--t-primary)] text-white' 
                        : 'bg-[var(--t-surface)] text-[var(--t-text-muted)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {automationTemplates
                  .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
                  .map(template => (
                    <motion.div
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => loadTemplate(template)}
                      className="group cursor-pointer p-5 rounded-[2rem] bg-[var(--t-surface)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/50 transition-all shadow-lg hover:shadow-[var(--t-primary)]/10"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--t-primary)]/10 text-[var(--t-primary)] text-[9px] font-black uppercase tracking-widest border border-[var(--t-primary)]/20">
                          {template.category}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[var(--t-primary)]/20 transition-colors">
                          <Plus size={16} className="text-[var(--t-primary)]" />
                        </div>
                      </div>
                      <h3 className="text-lg font-black italic uppercase tracking-tighter text-[var(--t-text)] mb-2 group-hover:text-[var(--t-primary)] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-[var(--t-text-muted)] leading-relaxed line-clamp-2">
                        {template.description}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-[var(--t-text-muted)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        <Bot size={12} className="text-[var(--t-primary)]" />
                        Contains AI Automation Steps
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AutomationsHub() {
  return (
    <ReactFlowProvider>
      <AutomationsHubContent />
    </ReactFlowProvider>
  );
}
