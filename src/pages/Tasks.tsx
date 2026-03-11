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

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-0';
const inputStyle = { backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text)', focusRingColor: 'var(--t-primary)' };

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
    if (t.status === 'done' || t.status === 'cancelled') return { color: 'var(--t-text-muted)' };
    const d = parseISO(t.dueDate);
    if (isPast(d)) return { color: 'var(--t-error)' };
    if (isToday(d)) return { color: 'var(--t-warning)' };
    return { color: 'var(--t-text-muted)' };
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const pc = PRIORITY_COLORS[task.priority];
    const sc = TASK_STATUS_COLORS[task.status];
    const leadName = getLeadName(task.leadId);
    const isDone = task.status === 'done';
    const isCancelled = task.status === 'cancelled';

    return (
      <div
        style={{
          backgroundColor: 'var(--t-bg)',
          borderColor: 'var(--t-border)',
        }}
        className={`group border rounded-xl p-4 hover:border-opacity-100 transition-all ${isDone || isCancelled ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => isDone ? updateTask(task.id, { status: 'todo', completedAt: null }) : completeTask(task.id)}
            style={{ color: isDone ? 'var(--t-success)' : 'var(--t-text-muted)' }}
            className="mt-0.5 shrink-0 transition-colors hover:text-opacity-100"
            onMouseEnter={(e) => !isDone && (e.currentTarget.style.color = 'var(--t-success)')}
            onMouseLeave={(e) => !isDone && (e.currentTarget.style.color = 'var(--t-text-muted)')}
          >
            {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 style={{ color: isDone ? 'var(--t-text-muted)' : 'var(--t-text)' }} className={`text-sm font-medium ${isDone ? 'line-through' : ''}`}>{task.title}</h3>
              <span style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-text)' }} className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                {task.priority.toUpperCase()}
              </span>
              <span style={{ backgroundColor: 'var(--t-primary-dim)', color: 'var(--t-primary)' }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </div>

            {task.description && (
              <p style={{ color: 'var(--t-text-muted)' }} className="text-xs mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span style={{ color: 'var(--t-text-muted)' }} className="inline-flex items-center gap-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                  {getMemberAvatar(task.assignedTo)}
                </span>
                {getMemberName(task.assignedTo)}
              </span>

              <span style={getDueColor(task)} className="inline-flex items-center gap-1 text-xs">
                <Calendar size={12} />
                {getDueLabel(task.dueDate)}
                {isPast(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'cancelled' && (
                  <AlertTriangle size={11} style={{ color: 'var(--t-error)' }} />
                )}
              </span>

              {leadName && (
                <span style={{ color: 'var(--t-primary)' }} className="inline-flex items-center gap-1 text-xs">
                  <Link2 size={11} />
                  {leadName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isDone && !isCancelled && (
              <select
                value={task.status}
                onChange={(e) => {
                  const newStatus = e.target.value as TaskStatus;
                  if (newStatus === 'done') completeTask(task.id);
                  else updateTask(task.id, { status: newStatus });
                }}
                style={{
                  backgroundColor: 'var(--t-surface)',
                  borderColor: 'var(--t-border-light)',
                  color: 'var(--t-text-secondary)',
                }}
                className="text-xs rounded-lg px-2 py-1 focus:outline-none border"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            <button
              onClick={() => startEdit(task)}
              style={{ color: 'var(--t-text-muted)' }}
              className="p-1.5 hover:text-opacity-100 rounded-lg transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t-text)', e.currentTarget.style.backgroundColor = 'var(--t-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-text-muted)', e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Flag size={14} />
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              style={{ color: 'var(--t-text-muted)' }}
              className="p-1.5 hover:text-opacity-100 rounded-lg transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t-error)', e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-text-muted)', e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const boardColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'todo', label: 'To Do', color: 'var(--t-border)' },
    { status: 'in-progress', label: 'In Progress', color: 'var(--t-primary)' },
    { status: 'done', label: 'Done', color: 'var(--t-success)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ color: 'var(--t-text)' }} className="text-2xl font-bold">Tasks</h1>
          <p style={{ color: 'var(--t-text-muted)' }} className="text-sm mt-1">Manage team assignments and to-dos</p>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ backgroundColor: 'var(--t-surface)' }} className="flex rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('list')}
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--t-primary)' : 'transparent',
                color: viewMode === 'list' ? 'var(--t-text)' : 'var(--t-text-muted)',
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:text-opacity-100"
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              style={{
                backgroundColor: viewMode === 'board' ? 'var(--t-primary)' : 'transparent',
                color: viewMode === 'board' ? 'var(--t-text)' : 'var(--t-text-muted)',
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:text-opacity-100"
            >
              Board
            </button>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm()); }}
            style={{
              backgroundColor: 'var(--t-primary)',
              color: 'var(--t-text)',
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors hover:opacity-90"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Zap, bgStyle: { backgroundColor: 'var(--t-surface)' }, textColor: 'var(--t-text)' },
          { label: 'To Do', value: stats.todo, icon: Circle, bgStyle: { backgroundColor: 'rgba(148, 163, 184, 0.1)' }, textColor: 'var(--t-text-muted)' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, bgStyle: { backgroundColor: 'var(--t-primary-dim)' }, textColor: 'var(--t-primary)' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, bgStyle: { backgroundColor: 'var(--t-success-dim)' }, textColor: 'var(--t-success)' },
          { label: 'Due Today', value: stats.todayDue, icon: Calendar, bgStyle: { backgroundColor: 'var(--t-warning-dim)' }, textColor: 'var(--t-warning)' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, bgStyle: { backgroundColor: 'var(--t-error-dim)' }, textColor: 'var(--t-error)' },
        ].map((s) => (
          <div key={s.label} style={{ ...s.bgStyle, backgroundColor: s.bgStyle.backgroundColor, borderColor: 'var(--t-border)' }} className="border rounded-xl p-3 text-center">
            <s.icon size={16} style={{ color: s.textColor }} className="mx-auto mb-1" />
            <p style={{ color: 'var(--t-text)' }} className="text-xl font-bold">{s.value}</p>
            <p style={{ color: 'var(--t-text-muted)' }} className="text-[10px] uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} style={{ color: 'var(--t-text-muted)' }} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{
              backgroundColor: 'var(--t-surface)',
              borderColor: 'var(--t-border-light)',
              color: 'var(--t-text)',
            }}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-0"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            backgroundColor: showFilters ? 'rgba(var(--t-primary-rgb), 0.2)' : 'var(--t-surface)',
            borderColor: showFilters ? 'var(--t-primary)' : 'var(--t-border-light)',
            color: showFilters ? 'var(--t-primary)' : 'var(--t-text-muted)',
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-colors"
        >
          <Filter size={14} /> Filters <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        <button
          onClick={() => setSortBy(sortBy === 'priority' ? 'due' : sortBy === 'due' ? 'status' : 'priority')}
          style={{
            backgroundColor: 'var(--t-surface)',
            borderColor: 'var(--t-border-light)',
            color: 'var(--t-text-muted)',
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-colors hover:text-opacity-100"
        >
          <ArrowUpDown size={14} /> {sortBy === 'priority' ? 'Priority' : sortBy === 'due' ? 'Due Date' : 'Status'}
        </button>
      </div>

      {showFilters && (
        <div style={{ backgroundColor: 'var(--t-bg)', borderColor: 'var(--t-border)' }} className="flex flex-wrap gap-3 p-4 border rounded-xl">
          <div>
            <label style={{ color: 'var(--t-text-muted)' }} className="text-[10px] uppercase tracking-wider block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              style={{
                backgroundColor: 'var(--t-surface)',
                borderColor: 'var(--t-border-light)',
                color: 'var(--t-text)',
              }}
              className="text-xs rounded-lg px-3 py-2 focus:outline-none border"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--t-text-muted)' }} className="text-[10px] uppercase tracking-wider block mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              style={{
                backgroundColor: 'var(--t-surface)',
                borderColor: 'var(--t-border-light)',
                color: 'var(--t-text)',
              }}
              className="text-xs rounded-lg px-3 py-2 focus:outline-none border"
            >
              <option value="all">All</option>
              {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--t-text-muted)' }} className="text-[10px] uppercase tracking-wider block mb-1">Assigned To</label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              style={{
                backgroundColor: 'var(--t-surface)',
                borderColor: 'var(--t-border-light)',
                color: 'var(--t-text)',
              }}
              className="text-xs rounded-lg px-3 py-2 focus:outline-none border"
            >
              <option value="all">All Members</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {(showAdd || editingId) && (
        <div style={{ backgroundColor: 'var(--t-bg)', borderColor: 'var(--t-border-light)' }} className="border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 style={{ color: 'var(--t-text)' }} className="text-sm font-semibold">{editingId ? 'Edit Task' : 'New Task'}</h3>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} style={{ color: 'var(--t-text-muted)' }} className="hover:text-opacity-100"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label style={{ color: 'var(--t-text-muted)' }} className="text-xs mb-1 block">Title *</label>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text)' }} className={inputClass} placeholder="Task title..." />
            </div>
            <div className="md:col-span-2">
              <label style={{ color: 'var(--t-text-muted)' }} className="text-xs mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text)' }} className={`${inputClass} h-20 resize-none`} placeholder="Task details..." />
            </div>
            <div>
              <label style={{ color: 'var(--t-text-muted)' }} className="text-xs mb-1 block">Assign To</label>
              <select value={form.assignedTo} onChange={(e) => setForm(f => ({ ...f, assignedTo: e.target.value }))} style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text)' }} className={inputClass}>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--t-text-muted)' }} className="text-xs mb-1 block">Due Date</label>
              <input type="datetime-local" value={form.dueDate.slice(0, 16)} onChange={(e) => setForm(f => ({ ...f, dueDate: new Date(e.target.value).toISOString() }))} style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text)' }} className={inputClass} />
            </div>
            <div>
              <label style={{ color: 'var(--t-text-muted)' }} className="text-xs mb-1 block">Priority</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setForm(f => ({ ...f, priority: o.value }))}
                    style={{
                      backgroundColor: form.priority === o.value ? 'var(--t-primary)' : 'var(--t-surface)',
                      borderColor: form.priority === o.value ? 'var(--t-primary)' : 'var(--t-border-light)',
                      color: form.priority === o.value ? 'var(--t-text)' : 'var(--t-text-muted)',
                    }}
                    className="flex-1 py-2 text-xs rounded-lg border font-medium transition-colors"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color: 'var(--t-text-muted)' }} className="text-xs mb-1 block">Link to Lead (optional)</label>
              <select
                value={form.leadId || ''}
                onChange={(e) => setForm(f => ({ ...f, leadId: e.target.value || undefined }))}
                style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text)' }}
                className={inputClass}
              >
                <option value="">No lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.propertyAddress}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} style={{ backgroundColor: 'var(--t-primary)', color: 'var(--t-text)' }} className="flex items-center gap-1 px-4 py-2 text-sm rounded-xl font-medium transition-colors hover:opacity-90">
              <CheckCircle2 size={14} /> {editingId ? 'Update Task' : 'Create Task'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border-light)', color: 'var(--t-text-secondary)' }} className="px-4 py-2 text-sm rounded-xl border">Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 size={48} style={{ color: 'var(--t-border)' }} className="mx-auto mb-3" />
              <p style={{ color: 'var(--t-text-muted)' }} className="text-sm">No tasks found</p>
            </div>
          )}
          {filtered.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}

      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {boardColumns.map(col => {
            const colTasks = filtered.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="space-y-2">
                <div style={{ backgroundColor: 'var(--t-bg)', borderLeftColor: col.color }} className="flex items-center gap-2 p-3 border-l-4 rounded-lg">
                  <h3 style={{ color: 'var(--t-text)' }} className="text-sm font-semibold flex-1">{col.label}</h3>
                  <span style={{ backgroundColor: 'var(--t-surface)', color: 'var(--t-text-muted)' }} className="text-xs px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    style={{ backgroundColor: 'var(--t-bg)', borderColor: 'var(--t-border)' }}
                    className="border rounded-xl p-3 hover:border-opacity-100 transition-colors cursor-pointer"
                    onClick={() => startEdit(task)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--t-primary)' }} />
                      <span style={{ color: 'var(--t-primary)' }} className="text-[10px] font-bold">
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    <h4 style={{ color: 'var(--t-text)' }} className="text-sm font-medium mb-1">{task.title}</h4>
                    {task.description && (
                      <p style={{ color: 'var(--t-text-muted)' }} className="text-xs line-clamp-2 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--t-text-muted)' }} className="inline-flex items-center gap-1 text-[11px]">
                        <User size={11} /> {getMemberName(task.assignedTo).split(' ')[0]}
                      </span>
                      <span style={getDueColor(task)} className="inline-flex items-center gap-1 text-[11px]">
                        <Clock size={11} /> {getDueLabel(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div style={{ backgroundColor: 'rgba(var(--t-surface-rgb), 0.5)', borderColor: 'var(--t-border)', color: 'var(--t-text-muted)' }} className="text-center py-6 text-xs border-dashed border rounded-xl">
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
