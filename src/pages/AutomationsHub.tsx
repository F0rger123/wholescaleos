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
  Save, 
  Webhook, X, Bot,
  Zap, Mail, Target, Loader2,
  Layout, Snowflake, Flame, Trash2, Edit3, Library, Plus,
  Activity, ChevronRight
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

interface AutomationNodeData extends Record<string, unknown> {
  label?: string;
  type?: string;
  description?: string;
  triggerType?: string;
  actionType?: string;
  status?: string;
  threshold?: number;
  message?: string;
  subject?: string;
  duration?: number;
}

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
  // State for Canvas
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My New Automation');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State for Layout
  const [viewMode, setViewMode] = useState<'editor' | 'dashboard'>('dashboard');
  const [myAutomations, setMyAutomations] = useState<any[]>([]);
  const [, setPrefs] = useState<any>(null);

  const { isAutomationRunning } = useStore();
  const { fitView } = useReactFlow();

  // Load Initial Data
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([
        fetchMyAutomations(),
        fetchPreferences()
      ]);
      setIsLoading(false);
    }
    init();
  }, []);

  const fetchMyAutomations = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_automations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMyAutomations(data || []);
    } catch (err) {
      console.error('Fetch my automations error:', err);
    }
  };

  const fetchPreferences = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_os_messages_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setPrefs(data);
    } catch (err) {
      console.error('Fetch preferences error:', err);
    }
  };

  const toggleAutomationActive = async (id: string, currentStatus: boolean) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase
        .from('user_automations')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setMyAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
      toast.success(currentStatus ? 'Automation Paused' : 'Automation Resumed', {
        style: { background: 'var(--t-surface)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }
      });
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const deleteWorkflow = async (id: string, name: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('user_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Deleted workflow: ${name}`);
      setMyAutomations(prev => prev.filter(a => a.id !== id));
      if (workflowId === id) {
        setWorkflowId(null);
        setWorkflowName('My New Automation');
        setNodes(initialNodes);
        setEdges([]);
        setViewMode('dashboard');
      }
    } catch (err) {
      toast.error('Failed to delete workflow');
    }
  };

  const editWorkflow = (automation: any) => {
    setWorkflowId(automation.id);
    setWorkflowName(automation.name);
    setNodes(automation.nodes || initialNodes);
    setEdges(automation.edges || []);
    setIsActive(automation.is_active);
    setViewMode('editor');
    setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
  };

  const saveWorkflow = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const workflowData = {
        user_id: user.id,
        name: workflowName, 
        nodes,
        edges,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (workflowId) {
        await supabase.from('user_automations').update(workflowData).eq('id', workflowId);
      } else {
        const { data } = await supabase.from('user_automations').insert([workflowData]).select().single();
        if (data) setWorkflowId(data.id);
      }

      await fetchMyAutomations();
      toast.success('Workflow saved successfully!');
    } catch (err) {
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const importTemplate = async (template: AutomationTemplate) => {
    setWorkflowId(null);
    setWorkflowName(template.name);
    setNodes(JSON.parse(JSON.stringify(template.nodes)));
    setEdges(JSON.parse(JSON.stringify(template.edges)));
    setIsActive(true);
    setViewMode('editor');
    toast.success(`Imported blueprint: ${template.name}`);
    setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
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

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setIsSettingsOpen(true);
  }, []);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, ...newData } } : null);
    }
  };

  const addNode = (type: string) => {
    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'automation',
      position: { x: 400, y: 200 },
      data: { 
        label: `New ${type.toUpperCase()}`, 
        type, 
        description: 'Configure this step' 
      },
    };
    setNodes(nds => [...nds, newNode]);
  };

  // Helper for rendering date
  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-[var(--t-border)]">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--t-text)] flex items-center gap-3">
             <Zap className="text-[var(--t-primary)] fill-[var(--t-primary)] w-8 h-8" />
             Automations <span className="text-[var(--t-primary)]">Hub</span>
          </h1>
          <p className="text-[var(--t-text-muted)] text-sm font-medium mt-1 uppercase tracking-widest">Autonomous Workflow Engine v3.0</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (viewMode === 'dashboard') {
                setWorkflowId(null);
                setWorkflowName('My New Automation');
                setNodes(initialNodes);
                setEdges([]);
                setViewMode('editor');
              } else {
                setViewMode('dashboard');
              }
            }}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all border ${
              viewMode === 'editor' 
                ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' 
                : 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)] hover:scale-105 active:scale-95'
            }`}
          >
            {viewMode === 'editor' ? <X size={20} /> : <Plus size={20} />}
            <span>{viewMode === 'editor' ? 'Close Editor' : 'Create Automation'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'dashboard' ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Section 1: Active Automations */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)] flex items-center gap-2">
                  <Activity className="text-green-500" />
                  Active Automations
                </h3>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20 rounded-full">
                  {myAutomations.filter(a => a.is_active).length} Running Now
                </div>
              </div>

              {myAutomations.length === 0 ? (
                <div className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2rem] p-12 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--t-surface-hover)] flex items-center justify-center text-[var(--t-text-muted)]">
                    <Snowflake size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-[var(--t-text)]">No automations active</h4>
                  <p className="text-[var(--t-text-muted)] max-w-sm">Bring your CRM to life by creating your first workflow or importing a template below.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myAutomations.map((automation) => (
                    <motion.div 
                      key={automation.id}
                      layoutId={automation.id}
                      className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-[2rem] p-6 hover:border-[var(--t-primary)] transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--t-primary)] opacity-[0.03] blur-3xl -mr-16 -mt-16 group-hover:opacity-[0.08] transition-opacity" />
                      
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                            automation.is_active 
                              ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                              : 'bg-white/5 border-white/10 text-[var(--t-text-muted)]'
                          }`}>
                            <Zap size={24} className={automation.is_active ? 'fill-current animate-pulse' : ''} />
                          </div>
                          <div>
                            <h4 className="font-black italic uppercase tracking-tighter text-[var(--t-text)] group-hover:text-[var(--t-primary)] transition-colors">{automation.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${automation.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-[var(--t-text-muted)]'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-text-muted)]">
                                {automation.is_active ? 'Active' : 'Paused'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                            onClick={() => editWorkflow(automation)}
                            className="p-2.5 hover:bg-[var(--t-surface-hover)] rounded-xl text-[var(--t-text-muted)] hover:text-[var(--t-primary)] transition-all"
                            title="Edit Workflow"
                           >
                            <Edit3 size={18} />
                           </button>
                           <button 
                            onClick={() => deleteWorkflow(automation.id, automation.name)}
                            className="p-2.5 hover:bg-red-500/10 rounded-xl text-[var(--t-text-muted)] hover:text-red-500 transition-all"
                            title="Delete"
                           >
                            <Trash2 size={18} />
                           </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
                             <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Run Count</span>
                             <span className="text-xl font-black italic text-[var(--t-text)]">{automation.run_count || 0}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
                             <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Success Rate</span>
                             <span className="text-xl font-black italic text-green-400">{automation.success_rate || 0}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[var(--t-border)]">
                        <div className="flex flex-col gap-0.5">
                           <span className="text-[8px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Last Triggered</span>
                           <span className="text-[10px] font-bold text-[var(--t-text)]">{formatDate(automation.last_triggered_at)}</span>
                        </div>
                        <div 
                          onClick={() => toggleAutomationActive(automation.id, automation.is_active)}
                          className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${automation.is_active ? 'bg-green-500' : 'bg-[var(--t-surface-hover)]'}`}
                        >
                          <motion.div 
                            animate={{ x: automation.is_active ? 24 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-lg" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Template Library */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)] flex items-center gap-2">
                  <Library className="text-purple-500" />
                  Template Library
                </h3>
                <div className="flex items-center gap-2 bg-[var(--t-surface)] p-1 rounded-xl border border-[var(--t-border)]">
                    <button className="px-3 py-1.5 bg-[var(--t-surface-hover)] rounded-lg text-xs font-bold text-[var(--t-text)]">Featured</button>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--t-text-muted)] hover:bg-[var(--t-surface-hover)]">My Blueprints</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {automationTemplates.map((template) => (
                  <motion.div 
                    key={template.id}
                    whileHover={{ y: -5 }}
                    className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl p-6 hover:shadow-2xl transition-all cursor-pointer group"
                    onClick={() => importTemplate(template)}
                  >
                    <div className="flex flex-col h-full">
                       <div className="flex items-center justify-between mb-4">
                         <div className="w-10 h-10 rounded-xl bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)]">
                           {template.category === 'Lead Gen' && <Target size={20} />}
                           {template.category === 'AI' && <Bot size={20} />}
                           {template.category === 'CRM' && <Layout size={20} />}
                           {template.category === 'Sales' && <Flame size={20} />}
                           {template.category === 'Comms' && <Mail size={20} />}
                         </div>
                         <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">
                           {template.category}
                         </div>
                       </div>
                       <h4 className="font-black italic uppercase tracking-tighter text-[var(--t-text)] mb-2 group-hover:text-[var(--t-primary)] transition-colors">{template.name}</h4>
                       <p className="text-xs text-[var(--t-text-muted)] flex-1">{template.description}</p>
                       <div className="pt-4 mt-4 border-t border-[var(--t-border)] flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-[var(--t-primary)]">Import Library</span>
                         <ArrowRight size={14} className="text-[var(--t-primary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key="editor"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 min-h-[700px] flex flex-col relative"
          >
            {/* Toolbar Panel */}
            <div className="absolute top-6 left-6 z-10 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex flex-col gap-0.5">
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="bg-transparent border-none text-white font-black italic uppercase tracking-tighter text-lg outline-none focus:ring-0 placeholder:opacity-30 w-48"
                  placeholder="Automation Name"
                />
                <div className="flex items-center gap-2 text-[9px] font-bold text-white/40 uppercase tracking-widest pl-0.5">
                  <span className="flex items-center gap-1"><Activity size={8} /> LIVE HUB EDITOR</span>
                </div>
              </div>

              <div className="w-px h-10 bg-white/10 mx-2" />

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => addNode('trigger')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-2 font-black uppercase tracking-tighter text-[10px]"
                >
                  <Webhook size={14} className="text-green-400" />
                  + Trigger
                </button>
                <button 
                  onClick={() => addNode('ai')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-2 font-black uppercase tracking-tighter text-[10px]"
                >
                  <Bot size={14} className="text-purple-400" />
                  + AI Engine
                </button>
                <button 
                  onClick={() => addNode('action')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-2 font-black uppercase tracking-tighter text-[10px]"
                >
                  <Zap size={14} className="text-orange-400" />
                  + Action
                </button>
              </div>

              <div className="w-px h-10 bg-white/10 mx-2" />

              <button 
                onClick={saveWorkflow}
                disabled={isSaving}
                className="px-6 py-2.5 bg-[var(--t-primary)] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--t-primary-dim)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Blueprint</span>
              </button>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 bg-[var(--t-surface)] rounded-[3rem] border border-[var(--t-border)] overflow-hidden shadow-2xl relative min-h-[600px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                colorMode="dark"
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--t-border)" />
                <Controls className="!bg-[var(--t-surface)] !border-[var(--t-border)] !fill-[var(--t-text)]" />
                
                {isAutomationRunning && (
                  <Panel position="top-right" className="m-6">
                    <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-2xl animate-pulse shadow-lg">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                      <span className="text-[10px] font-black italic uppercase tracking-tighter text-green-500">
                        Automation Engine Firing
                      </span>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && selectedNode && (
          <NodeSettingsModal 
            node={selectedNode}
            onClose={() => setIsSettingsOpen(false)}
            onUpdate={updateNodeData}
            onDelete={(id) => {
               setNodes(nds => nds.filter(n => n.id !== id));
               setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
               setIsSettingsOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Global Preferences Sidebar Overlay */}
      {/* ... keeping simplified for now ... */}
    </div>
  );
}

// Sub-component for Node Settings
function NodeSettingsModal({ node, onClose, onUpdate, onDelete }: { node: Node, onClose: () => void, onUpdate: (id: string, data: any) => void, onDelete: (id: string) => void }) {
  const data = node.data as AutomationNodeData;
  
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
      />
      <motion.div 
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--t-surface)] border-l border-[var(--t-border)] z-[101] shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-[var(--t-border)] flex items-center justify-between">
           <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                Node <span className="text-[var(--t-primary)]">Config</span>
              </h2>
              <p className="text-[var(--t-text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Configure Logic & Actions</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-all"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
           <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Display Label</label>
                <input 
                  type="text" 
                  value={data.label || ''} 
                  onChange={(e) => onUpdate(node.id, { label: e.target.value })}
                  className="w-full bg-black/40 border border-[var(--t-border)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--t-primary)] outline-none"
                />
              </div>

              {data.type === 'trigger' ? (
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Trigger Type</label>
                   <select 
                    value={data.triggerType || ''}
                    onChange={(e) => onUpdate(node.id, { triggerType: e.target.value })}
                    className="w-full bg-black/40 border border-[var(--t-border)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--t-primary)] outline-none"
                   >
                    <option value="new_lead">New Lead Created</option>
                    <option value="status_change">Lead Status Change</option>
                    <option value="high_score">High Lead Score</option>
                    <option value="task_overdue">Task Overdue</option>
                    <option value="birthday">Client Birthday</option>
                    <option value="referral_request">Referral Request Event</option>
                    <option value="offer_submitted">Offer Submitted</option>
                    <option value="monthly_run">1st of the Month</option>
                   </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Action Type</label>
                    <select 
                      value={data.actionType || ''}
                      onChange={(e) => onUpdate(node.id, { actionType: e.target.value })}
                      className="w-full bg-black/40 border border-[var(--t-border)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--t-primary)] outline-none"
                    >
                      <option value="send_sms">Send SMS</option>
                      <option value="send_email">Send Email</option>
                      <option value="notify">In-App Notification</option>
                      <option value="add_task">Create Task</option>
                      <option value="send_chat">Post to Chat</option>
                      <option value="delay">Wait / Delay</option>
                      <option value="update_status">Update Status</option>
                    </select>
                  </div>

                  {(data.actionType === 'send_sms' || data.actionType === 'send_email' || data.actionType === 'notify' || data.actionType === 'send_chat') && (
                    <div className="space-y-4">
                      {data.actionType === 'send_email' && (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Subject</label>
                          <input 
                            type="text" 
                            value={data.subject || ''} 
                            onChange={(e) => onUpdate(node.id, { subject: e.target.value })}
                            className="w-full bg-black/40 border border-[var(--t-border)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--t-primary)] outline-none"
                            placeholder="Email Subject"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Message Template</label>
                        <textarea 
                          value={data.message || ''} 
                          onChange={(e) => onUpdate(node.id, { message: e.target.value })}
                          rows={4}
                          className="w-full bg-black/40 border border-[var(--t-border)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--t-primary)] outline-none resize-none"
                          placeholder="Use {{name}} for dynamic tags..."
                        />
                      </div>
                    </div>
                  )}

                  {data.actionType === 'delay' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-2 block">Wait Duration (Seconds)</label>
                      <input 
                        type="number" 
                        value={data.duration || 0} 
                        onChange={(e) => onUpdate(node.id, { duration: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-[var(--t-border)] rounded-2xl px-4 py-3 text-sm focus:border-[var(--t-primary)] outline-none"
                      />
                    </div>
                  )}
                </>
              )}
           </div>
        </div>

        <div className="p-8 border-t border-[var(--t-border)] flex gap-4">
           <button 
            onClick={() => onDelete(node.id)}
            className="flex-1 px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl font-bold border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
           >
             <Trash2 size={18} /> Delete Step
           </button>
           <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[var(--t-primary)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--t-primary-dim)] hover:scale-105 transition-all"
           >
             Done
           </button>
        </div>
      </motion.div>
    </>
  );
}

function ArrowRight({ size, className }: { size: number, className: string }) {
  return <ChevronRight size={size} className={className} />;
}

export default function AutomationsHub() {
  return (
    <ReactFlowProvider>
      <AutomationsHubContent />
    </ReactFlowProvider>
  );
}
