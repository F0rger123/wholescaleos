import { useState, useMemo } from 'react';
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle, X, Calendar,
  User, ChevronDown, Filter, Zap, Search, Flag, Link2, ArrowUpDown,
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

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50';

export function Tasks() {
  const { tasks, team, leads, addTask, updateTask, deleteTask, completeTask } = useStore();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'due' | 'status'>('priority');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [showFilters, setShowFilters] = useState(false);

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
    if (t.status === 'done' || t.status === 'cancelled') return 'text-slate-500';
    const d = parseISO(t.dueDate);
    if (isPast(d)) return 'text-red-400';
    if (isToday(d)) return 'text-amber-400';
    return 'text-slate-400';
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const pc = PRIORITY_COLORS[task.priority];
    const sc = TASK_STATUS_COLORS[task.status];
    const leadName = getLeadName(task.leadId);
    const isDone = task.status === 'done';
    const isCancelled = task.status === 'cancelled';

    return (
      <div
        className={`group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all ${isDone || isCancelled ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Check button */}
          <button
            onClick={() => isDone ? updateTask(task.id, { status: 'todo', completedAt: null }) : completeTask(task.id)}
            className={`mt-0.5 shrink-0 transition-colors ${isDone ? 'text-emerald-400' : 'text-slate-600 hover:text-emerald-400'}`}
          >
            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                {task.priority.toUpperCase()}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {/* Assignee */}
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                  {getMemberAvatar(task.assignedTo)}
                </span>
                {getMemberName(task.assignedTo)}
              </span>

              {/* Due */}
              <span className={`inline-flex items-center gap-1 text-xs ${getDueColor(task)}`}>
                <Calendar size={12} />
                {getDueLabel(task.dueDate)}
                {isPast(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'cancelled' && (
                  <AlertTriangle size={11} className="text-red-400" />
                )}
              </span>

              {/* Lead link */}
              {leadName && (
                <span className="inline-flex items-center gap-1 text-xs text-brand-400">
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
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <button onClick={() => startEdit(task)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg">
              <Flag size={14} />
            </button>
            <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Board view grouping
  const boardColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo', label: 'To Do', color: 'border-slate-500' },
    { status: 'in-progress', label: 'In Progress', color: 'border-brand-500' },
    { status: 'done', label: 'Done', color: 'border-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Manage team assignments and to-dos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewMode === 'board' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Board
            </button>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm()); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Zap, color: 'bg-slate-800 text-white' },
          { label: 'To Do', value: stats.todo, icon: Circle, color: 'bg-slate-500/10 text-slate-400' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'bg-brand-500/10 text-brand-400' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Due Today', value: stats.todayDue, icon: Calendar, color: 'bg-amber-500/10 text-amber-400' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-500/10 text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <s.icon size={16} className={`mx-auto mb-1 ${s.color.split(' ')[1]}`} />
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-colors ${
            showFilters ? 'bg-brand-600/20 border-brand-500 text-brand-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Filter size={14} /> Filters <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => setSortBy(sortBy === 'priority' ? 'due' : sortBy === 'due' ? 'status' : 'priority')}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowUpDown size={14} /> {sortBy === 'priority' ? 'Priority' : sortBy === 'due' ? 'Due Date' : 'Status'}
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="all">All</option>
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Assigned To</label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="all">All Members</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {(showAdd || editingId) && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit Task' : 'New Task'}</h3>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="text-slate-400 hover:text-white"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Task title..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} h-20 resize-none`} placeholder="Task details..." />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Assign To</label>
              <select value={form.assignedTo} onChange={(e) => setForm(f => ({ ...f, assignedTo: e.target.value }))} className={inputClass}>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Due Date</label>
              <input type="datetime-local" value={form.dueDate.slice(0, 16)} onChange={(e) => setForm(f => ({ ...f, dueDate: new Date(e.target.value).toISOString() }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Priority</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setForm(f => ({ ...f, priority: o.value }))}
                    className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${
                      form.priority === o.value
                        ? `${PRIORITY_COLORS[o.value].bg} ${PRIORITY_COLORS[o.value].text} border-current`
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Link to Lead (optional)</label>
              <select
                value={form.leadId || ''}
                onChange={(e) => setForm(f => ({ ...f, leadId: e.target.value || undefined }))}
                className={inputClass}
              >
                <option value="">No lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.propertyAddress}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-xl font-medium">
              <CheckCircle2 size={14} /> {editingId ? 'Update Task' : 'Create Task'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="mx-auto text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">No tasks found</p>
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
                <div className={`flex items-center gap-2 p-3 bg-slate-900 border-l-4 ${col.color} rounded-lg`}>
                  <h3 className="text-sm font-semibold text-white flex-1">{col.label}</h3>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors cursor-pointer"
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
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <User size={11} /> {getMemberName(task.assignedTo).split(' ')[0]}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] ${getDueColor(task)}`}>
                        <Clock size={11} /> {getDueLabel(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-600 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl">
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
