import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, X, Calendar,
  User, ChevronDown, Filter, Zap, Search, Flag, Link2, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import {
  useStore, type Task, type TaskPriority, type TaskStatus,
  PRIORITY_COLORS, TASK_STATUS_COLORS,
} from '../store/useStore';
import { googleEcosystem } from '../lib/google-ecosystem';

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const inputClass = 'w-full px-4 py-3 text-sm rounded-2xl border transition-all outline-none focus:ring-2';
const inputStyle = {
  background: 'var(--t-surface-subtle)',
  borderColor: 'var(--t-border)',
  color: 'var(--t-text)',
  '--tw-ring-color': 'var(--t-primary-dim)',
  fontFamily: 'Inter, sans-serif'
};

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('id');

  const { 
    tasks, team, leads, addTask, updateTask, deleteTask, completeTask,
  } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'due' | 'status'>('priority');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [syncingTasks, setSyncingTasks] = useState(false);

  useEffect(() => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setSearch(task.title);
      }
    }
  }, [taskId, tasks]);

  const emptyForm = (): Omit<Task, 'id' | 'createdAt' | 'completedAt'> => ({
    title: '', description: '', assignedTo: team[0]?.id || '',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    priority: 'medium', status: 'todo', createdBy: team[0]?.id || '',
  });

  const [form, setForm] = useState(emptyForm());

  const getMemberName = (id: string) => team.find(m => m.id === id)?.name || 'Unassigned';
  const getMemberAvatar = (id: string) => team.find(m => m.id === id)?.avatar || '?';
  const getLeadName = (id?: string) => id ? leads.find(l => l.id === id)?.name : undefined;

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t =>
        (t.title || '').toLowerCase().includes(s) ||
        (t.description || '').toLowerCase().includes(s) ||
        (getMemberName(t.assignedTo) || '').toLowerCase().includes(s)
      );
    }
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterPriority !== 'all') result = result.filter(t => t.priority === filterPriority);
    if (filterAssignee !== 'all') result = result.filter(t => t.assignedTo === filterAssignee);

    result.sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortBy === 'due') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return a.status.localeCompare(b.status);
    });
    return result;
  }, [tasks, search, filterStatus, filterPriority, filterAssignee, sortBy]);

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && isPast(parseISO(t.dueDate))).length,
    todayDue: tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && isToday(parseISO(t.dueDate))).length,
  }), [tasks]);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setShowAdd(false);
    setForm({
      title: task.title, description: task.description,
      assignedTo: task.assignedTo, dueDate: task.dueDate,
      priority: task.priority, status: task.status,
      createdBy: task.createdBy, leadId: task.leadId,
    });
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editingId) {
      updateTask(editingId, form);
      setEditingId(null);
    } else {
      addTask(form);
      setShowAdd(false);
    }
    setForm(emptyForm());
  };

  const handleSyncTasks = async () => {
    const { currentUser } = useStore.getState();
    if (!currentUser?.id) return;
    setSyncingTasks(true);
    try {
      const data = await googleEcosystem.getTasksLists(currentUser.id);
      const lists = data.items || [];
      const defaultList = lists.find((l: any) => l.title === '@default' || l.title === 'My Tasks') || lists[0];
      
      if (!defaultList) throw new Error('No task lists found on Google');

      const tasksData = await googleEcosystem.getTasks(currentUser.id, defaultList.id);
      const googleTasks = tasksData.items || [];

      let newTasks = 0;
      googleTasks.forEach((gt: any) => {
        const existing = tasks.find(t => t.title === gt.title);
        if (!existing) {
          addTask({
            title: gt.title,
            description: gt.notes || '',
            assignedTo: currentUser.id,
            dueDate: gt.due ? new Date(gt.due).toISOString() : new Date(Date.now() + 86400000).toISOString(),
            priority: 'medium',
            status: gt.status === 'completed' ? 'done' : 'todo',
            createdBy: currentUser.id
          });
          newTasks++;
        }
      });
      alert(`Synced ${newTasks} new tasks from Google!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to sync tasks: ' + err.message);
    } finally {
      setSyncingTasks(false);
    }
  };

  const getDueLabel = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getDueColor = (t: Task) => {
    if (t.status === 'done' || t.status === 'cancelled') return 'var(--t-text-muted)';
    if (!t.dueDate) return 'var(--t-text-muted)';
    const d = parseISO(t.dueDate);
    if (isPast(d)) return 'var(--t-error)';
    if (isToday(d)) return 'var(--t-warning)';
    return 'var(--t-text-muted)';
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const pc = PRIORITY_COLORS[task.priority];
    const sc = TASK_STATUS_COLORS[task.status];
    const leadName = getLeadName(task.leadId);
    const isDone = task.status === 'done';
    const isCancelled = task.status === 'cancelled';

    return (
      <div
        className={`group border rounded-xl p-3 transition-all hover:shadow-xl hover:border-[var(--t-primary)] ${isDone || isCancelled ? 'opacity-60 grayscale-[0.5]' : ''} astral-glass`}
        style={{ 
          background: 'var(--t-surface)', 
          borderColor: 'var(--t-border)'
        }}
      >
        <div className="flex items-start gap-4">
          {/* Check button */}
          <button
            onClick={() => isDone ? updateTask(task.id, { status: 'todo', completedAt: null }) : completeTask(task.id)}
            className={`mt-0.5 shrink-0 transition-all hover:scale-110 active:scale-90`}
            style={{ color: isDone ? 'var(--t-success)' : 'var(--t-border-focus)' }}
          >
            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-xs font-semibold italic`} style={{ color: isDone ? 'var(--t-text-muted)' : 'var(--t-text)', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</h3>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${pc.text}`} style={{ background: pc.bg, borderColor: 'currentColor' }}>
                {task.priority}
              </span>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${sc.text}`} style={{ background: sc.bg, borderColor: 'currentColor' }}>
                {task.status === 'in-progress' ? 'In Progress' : task.status}
              </span>
            </div>

            {task.description && (
              <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--t-text-muted)' }}>{task.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {/* Assignee */}
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--t-text-muted)' }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--t-primary), #9333ea)' }}
                >
                  {getMemberAvatar(task.assignedTo)}
                </div>
                {getMemberName(task.assignedTo)}
              </span>

              {/* Due */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold`} style={{ color: getDueColor(task) }}>
                <Calendar size={11} />
                {getDueLabel(task.dueDate)}
                {isPast(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'cancelled' && (
                  <AlertTriangle size={12} className="animate-bounce" />
                )}
              </span>

              {/* Lead link */}
              {leadName && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold italic" style={{ color: 'var(--t-primary)' }}>
                  <Link2 size={11} />
                  {leadName}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isDone && !isCancelled && (
              <select
                value={task.status}
                onChange={(e) => {
                  const newStatus = e.target.value as TaskStatus;
                  if (newStatus === 'done') completeTask(task.id);
                  else updateTask(task.id, { status: newStatus });
                }}
                className="text-xs border rounded-lg px-2 py-1 outline-none"
                style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <button onClick={() => startEdit(task)} className="p-1.5 transition-colors rounded-lg hover:opacity-80" style={{ color: 'var(--t-text-muted)' }}>
              <Flag size={14} />
            </button>
            <button 
              onClick={() => deleteTask(task.id)} 
              className="p-1.5 transition-colors rounded-lg border border-transparent" 
              style={{ color: 'var(--t-error)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--t-error-dim)';
                e.currentTarget.style.borderColor = 'var(--t-error-border)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Board view grouping
  const boardColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo', label: 'To Do', color: 'rgba(var(--t-text-rgb), 0.3)' },
    { status: 'in-progress', label: 'In Progress', color: 'border-[var(--t-primary)]' },
    { status: 'done', label: 'Done', color: 'border-[var(--t-success)]' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 pt-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[var(--t-surface)] p-4 rounded-3xl border border-[var(--t-border)] shadow-xl astral-glass">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-widest" style={{ color: 'var(--t-text)' }}>Tasks</h1>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--t-text-muted)' }}>Manage team assignments and to-dos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <button
            onClick={handleSyncTasks}
            disabled={syncingTasks}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl transition-all border shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ 
              background: syncingTasks ? 'var(--t-primary)' : 'var(--t-surface-dim)', 
              color: syncingTasks ? 'var(--t-on-primary)' : 'var(--t-text)',
              borderColor: syncingTasks ? 'var(--t-primary)' : 'var(--t-border)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <RefreshCw size={12} className={syncingTasks ? 'animate-spin' : ''} />
            Sync
          </button>
          <div className="flex bg-[var(--t-background)] rounded-xl p-1 border border-[var(--t-border)] shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
              style={viewMode === 'list' ? { 
                background: 'var(--t-primary)', 
                color: 'var(--t-on-primary)',
                boxShadow: '0 4px 12px var(--t-primary-dim)',
                fontFamily: 'Inter, sans-serif'
              } : { color: 'var(--t-text-muted)', fontFamily: 'Inter, sans-serif' }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
              style={viewMode === 'board' ? { 
                background: 'var(--t-primary)', 
                color: 'var(--t-on-primary)',
                boxShadow: '0 4px 12px var(--t-primary-dim)',
                fontFamily: 'Inter, sans-serif'
              } : { color: 'var(--t-text-muted)', fontFamily: 'Inter, sans-serif' }}
            >
              Board
            </button>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm()); }}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95 group overflow-hidden relative"
            style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)', fontFamily: 'Inter, sans-serif' }}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant-glow" />
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Zap, color: 'var(--t-text)' },
          { label: 'To Do', value: stats.todo, icon: Circle, color: 'var(--t-text-muted)' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'var(--t-primary)' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'var(--t-success)' },
          { label: 'Today', value: stats.todayDue, icon: Calendar, color: 'var(--t-warning)' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'var(--t-error)' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl p-3 text-center shadow-md hover:border-[var(--t-primary)] transition-all group astral-glass">
            <s.icon size={16} className="mx-auto mb-1 transition-transform group-hover:scale-110" style={{ color: s.color }} />
            <p className="text-xl font-black" style={{ color: 'var(--t-text)' }}>{s.value}</p>
            <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t-text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className={`${inputClass} pl-10`}
            style={inputStyle}
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all"
          style={showFilters ? { 
            background: 'var(--t-primary-dim)', 
            borderColor: 'var(--t-primary)', 
            color: 'var(--t-primary)' 
          } : { 
            background: 'var(--t-surface)', 
            borderColor: 'var(--t-border)', 
            color: 'var(--t-text-muted)' 
          }}
        >
          <Filter size={14} /> Filters <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => setSortBy(sortBy === 'priority' ? 'due' : sortBy === 'due' ? 'status' : 'priority')}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-colors"
          style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}
        >
          <ArrowUpDown size={14} /> {sortBy === 'priority' ? 'Priority' : sortBy === 'due' ? 'Due Date' : 'Status'}
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 border rounded-xl" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--t-text-muted)' }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              className="text-xs border rounded-lg px-3 py-2 outline-none"
              style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--t-text-muted)' }}>Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="text-xs border rounded-lg px-3 py-2 outline-none"
              style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="all">All</option>
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--t-text-muted)' }}>Assigned To</label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-xs border rounded-lg px-3 py-2 outline-none"
              style={{ background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            >
              <option value="all">All Members</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {(showAdd || editingId) && (
        <div className="border rounded-2xl p-5 space-y-4" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Task' : 'New Task'}</h3>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} style={{ color: 'var(--t-text-muted)' }} className="hover:text-white"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Title *</label>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} style={inputStyle} placeholder="Task title..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} h-20 resize-none`} style={inputStyle} placeholder="Task details..." />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Assign To</label>
              <select value={form.assignedTo} onChange={(e) => setForm(f => ({ ...f, assignedTo: e.target.value }))} className={inputClass} style={inputStyle}>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Due Date</label>
              <input type="datetime-local" value={form.dueDate.slice(0, 16)} onChange={(e) => setForm(f => ({ ...f, dueDate: new Date(e.target.value).toISOString() }))} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Priority</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setForm(f => ({ ...f, priority: o.value }))}
                    className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors`}
                    style={form.priority === o.value
                        ? { background: PRIORITY_COLORS[o.value].bg, color: PRIORITY_COLORS[o.value].text, borderColor: 'currentColor' }
                        : { background: 'var(--t-input-bg)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t-text-muted)' }}>Link to Lead (optional)</label>
              <select
                value={form.leadId || ''}
                onChange={(e) => setForm(f => ({ ...f, leadId: e.target.value || undefined }))}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">No lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.propertyAddress}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl font-black uppercase tracking-widest transition-all"
              style={{ background: 'var(--t-primary)', color: 'var(--t-on-primary)' }}
            >
              <CheckCircle2 size={14} /> {editingId ? 'Update Task' : 'Create Task'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-4 py-2 transition-all text-[10px] font-black uppercase tracking-widest rounded-xl" style={{ background: 'var(--t-surface-dim)', color: 'var(--t-text-muted)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="mx-auto mb-3" style={{ color: 'var(--t-border)' }} />
              <p className="text-sm" style={{ color: 'var(--t-text-muted)' }}>No tasks found</p>
            </div>
          )}
          {filtered.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {boardColumns.map(col => {
            const colTasks = filtered.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="space-y-2">
                <div className={`flex items-center gap-2 p-3 border-l-4 rounded-lg`} style={{ background: 'var(--t-surface)', borderColor: col.color.startsWith('border-[') ? col.color.match(/\[(.*?)\]/)![1] : col.color.split('-')[1] }}>
                  <h3 className="text-sm font-semibold text-white flex-1">{col.label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}>{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="border rounded-xl p-3 transition-colors cursor-pointer"
                    style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
                    onClick={() => startEdit(task)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority].dot}`} />
                      <span className={`text-[10px] font-bold ${PRIORITY_COLORS[task.priority].text}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--t-text-muted)' }}>{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--t-text-muted)' }}>
                        <User size={11} /> {(getMemberName(task.assignedTo) || 'Unassigned').split(' ')[0]}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] ${getDueColor(task)}`}>
                        <Clock size={11} /> {getDueLabel(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-6 text-xs border border-dashed rounded-xl" style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }}>
                    No tasks
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}