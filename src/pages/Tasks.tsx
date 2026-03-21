import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, X, Calendar,
  User, ChevronDown, Filter, Zap, Search, Flag, Link2, ArrowUpDown
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import {
  useStore, type Task, type TaskPriority, type TaskStatus,
  PRIORITY_COLORS, TASK_STATUS_COLORS,
} from '../store/useStore';

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

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-xl border transition-colors outline-none';
const inputStyle = {
  background: 'var(--t-input-bg)',
  borderColor: 'var(--t-border)',
  color: 'var(--t-text)',
  '--tw-ring-color': 'var(--t-primary-dim)'
};

export function Tasks() {
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
        t.title.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        getMemberName(t.assignedTo).toLowerCase().includes(s)
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

  const getDueLabel = (d: string) => {
    const date = parseISO(d);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const getDueColor = (t: Task) => {
    if (t.status === 'done' || t.status === 'cancelled') return 'var(--t-text-muted)';
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
        className={`group border rounded-xl p-4 transition-all ${isDone || isCancelled ? 'opacity-60' : ''}`}
        style={{ 
          background: 'var(--t-surface)', 
          borderColor: 'var(--t-border)',
          '--hover-border': 'var(--t-border-focus)'
        } as any}
      >
        <div className="flex items-start gap-3">
          {/* Check button */}
          <button
            onClick={() => isDone ? updateTask(task.id, { status: 'todo', completedAt: null }) : completeTask(task.id)}
            className={`mt-0.5 shrink-0 transition-colors`}
            style={{ color: isDone ? 'var(--t-success)' : 'var(--t-text-muted)' }}
          >
            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-medium`} style={{ color: isDone ? 'var(--t-text-muted)' : 'var(--t-text)', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                {task.priority.toUpperCase()}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>

            {task.description && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--t-text-muted)' }}>{task.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {/* Assignee */}
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--t-text-muted)' }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: 'linear-gradient(to bottom right, var(--t-primary), #9333ea)' }}
                >
                  {getMemberAvatar(task.assignedTo)}
                </span>
                {getMemberName(task.assignedTo)}
              </span>

              {/* Due */}
              <span className={`inline-flex items-center gap-1 text-xs`} style={{ color: getDueColor(task) }}>
                <Calendar size={12} />
                {getDueLabel(task.dueDate)}
                {isPast(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'cancelled' && (
                  <AlertTriangle size={11} style={{ color: 'var(--t-error)' }} />
                )}
              </span>

              {/* Lead link */}
              {leadName && (
                <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--t-primary)' }}>
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
    <div className="space-y-6" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>Manage team assignments and to-dos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl p-0.5" style={{ background: 'var(--t-surface)' }}>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={viewMode === 'list' ? { 
                background: 'var(--t-primary)', 
                color: '#fff' 
              } : { color: 'var(--t-text-muted)' }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={viewMode === 'board' ? { 
                background: 'var(--t-primary)', 
                color: '#fff' 
              } : { color: 'var(--t-text-muted)' }}
            >
              Board
            </button>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm()); }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors"
            style={{ background: 'var(--t-primary)' }}
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Zap, color: 'text-white' },
          { label: 'To Do', value: stats.todo, icon: Circle, color: 'var(--t-text-muted)' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-[var(--t-primary)]' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'text-[var(--t-success)]' },
          { label: 'Due Today', value: stats.todayDue, icon: Calendar, color: 'text-[var(--t-warning)]' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-[var(--t-error)]' },
        ].map((s) => (
          <div key={s.label} className="border rounded-xl p-3 text-center" style={{ background: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
            <s.icon size={16} className={`mx-auto mb-1`} style={{ color: s.color.startsWith('text-[') ? s.color.match(/\[(.*?)\]/)![1] : s.color.split(' ')[1] }} />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{s.label}</p>
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
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-colors"
          style={showFilters ? { 
            background: 'var(--t-primary-dim)', 
            borderColor: 'var(--t-primary)', 
            color: 'var(--t-primary)' 
          } : { 
            background: '#1e293b', 
            borderColor: '#334155', 
            color: '#94a3b8' 
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
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 text-white text-sm rounded-xl font-medium"
              style={{ background: 'var(--t-primary)' }}
            >
              <CheckCircle2 size={14} /> {editingId ? 'Update Task' : 'Create Task'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-4 py-2 transition-colors text-sm rounded-xl" style={{ background: 'var(--t-surface-hover)', color: 'var(--t-text-muted)' }}>Cancel</button>
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
                        <User size={11} /> {getMemberName(task.assignedTo).split(' ')[0]}
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