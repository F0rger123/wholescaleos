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
  Settings,
  Webhook, X, Bot,
  Zap, Mail, Clock, Calendar, Target, CheckCircle2, AlertCircle, Loader2
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
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isCreating, setIsCreating] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My New Automation');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);

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
          .from('user_automations')
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
    fetchPreferences();
  }, [fitView]);

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
      if (data) {
        setPrefs(data);
      } else {
        const defaultPrefs = {
          user_id: user.id,
          daily_summary_enabled: true,
          weekly_summary_enabled: true,
          monthly_performance_report_enabled: true,
          deal_closed_alerts_enabled: true,
          offer_made_alert_enabled: true,
          offer_accepted_alert_enabled: true,
          contract_signed_alert_enabled: true,
          calendar_digest_enabled: true,
          task_reminders_enabled: true,
          task_overdue_alert_enabled: true,
          new_lead_alerts_enabled: true,
          lead_inactivity_alert_enabled: true,
          lead_score_high_alert_enabled: true,
          email_open_notification_enabled: true,
          sms_received_alert_enabled: true,
          goal_milestone_alert_enabled: true,
          team_activity_summary_enabled: true,
          birthday_greeting_enabled: true
        };
        setPrefs(defaultPrefs);
        await supabase.from('user_os_messages_preferences').insert(defaultPrefs);
      }
    } catch (err) {
      console.error('Fetch preferences error:', err);
    }
  };

  const updatePreference = async (key: string) => {
    if (!isSupabaseConfigured || !supabase || !prefs) return;
    try {
      const newValue = !prefs[key];
      const newPrefs = { ...prefs, [key]: newValue };
      setPrefs(newPrefs);
      
      const { error } = await supabase
        .from('user_os_messages_preferences')
        .upsert(newPrefs);
        
      if (error) throw error;
      toast.success(`${key.replace(/_/g, ' ')} updated`, {
        style: { background: 'var(--t-surface)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }
      });
    } catch (err) {
      console.error('Update preferences error:', err);
      toast.error('Failed to update preference');
    }
  };

  const saveWorkflow = async (forcedIsActive?: boolean, overrideNodes?: Node[], overrideEdges?: Edge[], overrideName?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to save workflows.');
        return;
      }

      const activeStatus = forcedIsActive !== undefined ? forcedIsActive : isActive;
      const finalNodes = overrideNodes || nodes;
      const finalEdges = overrideEdges || edges;
      const finalName = overrideName || workflowName;

      const workflowData = {
        user_id: user.id,
        name: finalName, 
        nodes: finalNodes,
        edges: finalEdges,
        is_active: activeStatus,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (workflowId) {
        ({ error } = await supabase
          .from('user_automations')
          .update(workflowData)
          .eq('id', workflowId));
      } else {
        const { data, error: insertError } = await supabase
          .from('user_automations')
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
      setIsSaving(false);
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

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setIsSettingsOpen(true);
  }, []);

  const selectedNodeData = selectedNode?.data as AutomationNodeData | undefined;

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...newData } } : null);
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setIsSettingsOpen(false);
    setSelectedNode(null);
  };

  const loadTemplate = async (template: AutomationTemplate) => {
    // Deep clone nodes and edges to avoid reference issues
    const newNodes = JSON.parse(JSON.stringify(template.nodes));
    const newEdges = JSON.parse(JSON.stringify(template.edges));
    
    // Immediate UI update
    setNodes(newNodes);
    setEdges(newEdges);
    setWorkflowName(template.name);
    setWorkflowId(null); // Reset ID so it saves as new
    setIsActive(true);
    setIsLibraryOpen(false);
    
    // Smooth zoom to fit the loaded template
    setTimeout(() => {
      fitView({ duration: 800, padding: 0.2 });
    }, 100);

    // Background auto-save the template to the database
    setIsSaving(true);
    try {
      await saveWorkflow(true, newNodes, newEdges, template.name);
      toast.success(`Loaded & Saved Template: ${template.name}`, {
        icon: '🤖',
        style: { background: 'var(--t-surface)', color: 'var(--t-text)', border: '1px solid var(--t-success)' }
      });
    } catch (err) {
      console.error('Failed to auto-save template:', err);
      toast.error('Failed to save template to database.');
    } finally {
      setIsSaving(false);
    }
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
    toast.success(`Added ${type.toUpperCase()} node`, {
      icon: '➕',
      style: { background: 'var(--t-surface)', color: 'var(--t-text)', border: '1px solid var(--t-border)' }
    });
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
        <div className="flex items-center gap-3">
          {isSaving && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--t-primary)]/10 text-[var(--t-primary)] rounded-full border border-[var(--t-primary)]/20 shadow-[0_0_15px_rgba(var(--t-primary-rgb),0.1)]"
            >
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing...</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsGlobalSettingsOpen(!isGlobalSettingsOpen)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border ${
              isGlobalSettingsOpen 
                ? 'bg-[var(--t-primary-dim)] border-[var(--t-primary)] text-[var(--t-primary)]' 
                : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-surface-hover)]'
            }`}
          >
            <Zap size={20} />
            Global Alerts
          </button>
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
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 p-1.5 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl group">
                <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${isActive ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'hover:bg-[var(--t-surface-hover)] text-[var(--t-text-muted)]'}`}
                  onClick={() => setIsActive(!isActive)}
                >
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white animate-pulse' : 'bg-[var(--t-text-muted)]'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <button 
                onClick={() => saveWorkflow()}
                disabled={isSaving}
                className={`px-4 py-2.5 bg-[var(--t-primary)] text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--t-primary-dim)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Saving...' : 'Save Workflow'}</span>
              </button>
            </div>
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
          onNodeClick={onNodeClick}
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
                onClick={async () => {
                  const next = !isActive;
                  setIsActive(next);
                  if (workflowId) await saveWorkflow(next);
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

        {/* Loading Overlay */}
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

      {/* Node Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && selectedNode && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)]">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                      Node <span className="text-[var(--t-primary)]">Settings</span>
                    </h2>
                    <p className="text-[var(--t-text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Configure {selectedNodeData?.type || 'Node'} Step</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[var(--t-text)]">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Step Label</label>
                    <input 
                      type="text" 
                      value={selectedNodeData?.label || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Description</label>
                    <textarea 
                      value={selectedNodeData?.description || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 resize-none"
                    />
                  </div>
                </div>

                <div className="h-px bg-[var(--t-border)]" />

                {selectedNodeData?.type === 'trigger' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Trigger Event</label>
                      <select 
                        value={selectedNodeData?.triggerType || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { triggerType: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 appearance-none cursor-pointer"
                      >
                        <option value="new_lead">New Lead Created</option>
                        <option value="status_change">Lead Status Changed</option>
                        <option value="high_score">High Deal Score</option>
                        <option value="task_overdue">Task Becomes Overdue</option>
                      </select>
                    </div>

                    {selectedNodeData?.triggerType === 'status_change' && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Target Status</label>
                        <select 
                          value={selectedNodeData?.status || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { status: e.target.value })}
                          className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                        >
                          <option value="new">New</option>
                          <option value="engaged">Engaged</option>
                          <option value="cold">Cold</option>
                          <option value="negotiating">Negotiating</option>
                        </select>
                      </div>
                    )}

                    {selectedNodeData?.triggerType === 'high_score' && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Score Threshold</label>
                        <input 
                          type="number" 
                          value={selectedNodeData?.threshold ?? 80}
                          onChange={(e) => updateNodeData(selectedNode.id, { threshold: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(['action', 'sms', 'email', 'ai'].includes(selectedNodeData?.type || '')) && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Action Type</label>
                      <select 
                        value={selectedNodeData?.actionType || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { actionType: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--t-surface)] border border(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 appearance-none cursor-pointer"
                      >
                        <option value="send_sms">Send SMS Message</option>
                        <option value="send_email">Send Email Template</option>
                        <option value="notify">System Notification</option>
                        <option value="add_task">Create Follow-up Task</option>
                      </select>
                    </div>

                    {(['send_sms', 'notify', 'send_chat'].includes(selectedNodeData?.actionType || '')) && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-1.5 block">Message Template</label>
                        <textarea 
                          value={selectedNodeData?.message || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                          placeholder="Use {{name}} for personalization."
                          rows={4}
                          className="w-full px-4 py-3 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50 font-mono text-[11px]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[var(--t-border)] bg-[var(--t-surface)]/50 flex gap-3">
                <button 
                  onClick={() => deleteNode(selectedNode.id)}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-6 py-3 bg-[var(--t-primary)] text-white rounded-2xl font-bold transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Settings Sidebar */}
      <AnimatePresence>
        {isGlobalSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGlobalSettingsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-[var(--t-bg)] border-l border-[var(--t-border)] z-[100] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-[var(--t-border)] flex items-center justify-between bg-[var(--t-surface)]/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--t-primary-dim)] flex items-center justify-center text-[var(--t-primary)]">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                      Global <span className="text-[var(--t-primary)]">Alerts</span>
                    </h2>
                    <p className="text-[var(--t-text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Unified Notification Hub</p>
                  </div>
                </div>
                <button onClick={() => setIsGlobalSettingsOpen(false)}><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Reporting */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2">
                    <Mail size={16} className="text-[var(--t-primary)]" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Reporting Core</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <HubSettingToggle 
                      icon={<Clock size={16} />}
                      title="Daily Summary"
                      description="Leads, tasks, and revenue digest (8:00 AM)"
                      enabled={prefs?.daily_summary_enabled}
                      onToggle={() => updatePreference('daily_summary_enabled')}
                    />
                    <HubSettingToggle 
                      icon={<Calendar size={16} />}
                      title="Weekly Summary"
                      description="Trends and conversion rates"
                      enabled={prefs?.weekly_summary_enabled}
                      onToggle={() => updatePreference('weekly_summary_enabled')}
                    />
                  </div>
                </section>

                {/* Real-time Alerts */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--t-border)] pb-2">
                    <Zap size={16} className="text-[var(--t-primary)]" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Real-time Signals</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <HubSettingToggle 
                      icon={<Target size={16} />}
                      title="New Lead Alerts"
                      description="Instant notification for new captures"
                      enabled={prefs?.new_lead_alerts_enabled}
                      onToggle={() => updatePreference('new_lead_alerts_enabled')}
                    />
                    <HubSettingToggle 
                      icon={<CheckCircle2 size={16} />}
                      title="Deal Won"
                      description="Alert when a deal status set to Closed Won"
                      enabled={prefs?.deal_closed_alerts_enabled}
                      onToggle={() => updatePreference('deal_closed_alerts_enabled')}
                    />
                    <HubSettingToggle 
                      icon={<AlertCircle size={16} />}
                      title="Task Overdue"
                      description="Immediate alert for missed deadlines"
                      enabled={prefs?.task_overdue_alert_enabled}
                      onToggle={() => updatePreference('task_overdue_alert_enabled')}
                    />
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-[var(--t-border)] bg-[var(--t-surface)]/50">
                <button 
                  onClick={() => setIsGlobalSettingsOpen(false)}
                  className="w-full py-4 bg-[var(--t-primary)] text-white rounded-2xl font-bold transition-all hover:scale-[1.02] shadow-xl shadow-[var(--t-primary-dim)]"
                >
                  Confirm Settings
                </button>
              </div>
            </motion.div>
          </>
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
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--t-bg)] border-l border-[var(--t-border)] z-[100] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-[var(--t-border)] flex items-center justify-between">
                <h2 className="text-xl font-black italic uppercase text-[var(--t-text)]">
                  Automation <span className="text-[var(--t-primary)]">Library</span>
                </h2>
                <button onClick={() => setIsLibraryOpen(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {automationTemplates.map(template => (
                  <motion.div
                    key={template.id}
                    onClick={() => loadTemplate(template)}
                    className="cursor-pointer p-5 rounded-[2rem] bg-[var(--t-surface)] border border-[var(--t-border)] hover:border-[var(--t-primary)]/50 transition-all"
                  >
                    <h3 className="text-lg font-black uppercase text-[var(--t-text)]">{template.name}</h3>
                    <p className="text-sm text-[var(--t-text-muted)]">{template.description}</p>
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

function HubSettingToggle({ icon, title, description, enabled, onToggle }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  enabled: boolean; 
  onToggle: () => void;
}) {
  return (
    <div 
      onClick={onToggle}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none group ${
        enabled ? 'border-[var(--t-primary-dim)] bg-[var(--t-primary-dim)]/5' : 'border-[var(--t-border)] hover:border-[var(--t-primary-dim)]/40 hover:bg-[var(--t-surface-subtle)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl transition-all ${enabled ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary)]/20' : 'bg-[var(--t-surface-subtle)] text-[var(--t-text-muted)]'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-xs font-black transition-colors ${enabled ? 'text-[var(--t-text)]' : 'text-[var(--t-text-muted)] group-hover:text-[var(--t-text-secondary)]'}`}>{title}</p>
          <p className="text-[9px] text-[var(--t-text-muted)] font-medium leading-tight">{description}</p>
        </div>
      </div>
      <div className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${enabled ? 'bg-[var(--t-primary)]' : 'bg-[var(--t-border)]'}`}>
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enabled ? 'left-6 shadow-lg shadow-black/20' : 'left-1'}`} />
      </div>
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
