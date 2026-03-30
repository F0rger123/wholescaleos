import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users, ChevronLeft, ChevronRight, X, Loader2, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../lib/supabase';

interface TeamEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: 'open_house' | 'meeting' | 'showing' | 'closing' | 'personal';
  location?: string;
  attendees: string[];
  color: string;
}

const EVENT_COLORS: Record<string, string> = {
  open_house: '#f59e0b',
  meeting: '#3b82f6',
  showing: '#8b5cf6',
  closing: '#10b981',
  personal: '#6b7280',
};

const EVENT_LABELS: Record<string, string> = {
  open_house: 'Open House',
  meeting: 'Team Meeting',
  showing: 'Showing',
  closing: 'Closing',
  personal: 'Personal',
};

export default function TeamCalendar() {
  const { team, currentUser, teamId } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<TeamEvent[]>([]);

  const [filters, setFilters] = useState<string[]>([]);
  const [view, setView] = useState<'month' | 'team'>('month');

  useEffect(() => {
    if (teamId) {
      fetchEvents();
      
      // Real-time subscription
      const channel = supabase
        ?.channel('calendar_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `team_id=eq.${teamId}` }, () => {
          fetchEvents();
        })
        .subscribe();
      
      return () => {
        supabase?.removeChannel(channel as any);
      };
    }
  }, [currentMonth, teamId]);

  async function fetchEvents() {
    if (!supabase) return;
    console.log('[Calendar] Fetching events for team:', teamId, 'month:', format(currentMonth, 'MMMM yyyy'));
    if (!teamId) {
      console.warn('[Calendar] No teamId found in store. Skipping fetch.');
      setLoading(false);
      return;
    }
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const { data, error } = await (supabase as any)
        .from('calendar_events')
        .select('*')
        .eq('team_id', teamId)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      if (error) throw error;

      const formattedEvents: TeamEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.start_time),
        time: format(new Date(e.start_time), 'HH:mm'),
        type: e.type as any,
        location: e.description,
        attendees: e.attendees || [],
        color: EVENT_COLORS[e.type] || EVENT_COLORS.meeting,
      }));

      console.log('[Calendar] Fetched events:', formattedEvents.length);
      setEvents(formattedEvents);
    } catch (err) {
      console.error('[Calendar] Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  }

  const [newEvent, setNewEvent] = useState({
    title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00',
    type: 'meeting' as keyof typeof EVENT_COLORS,
    location: '', attendees: ''
  });

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !currentUser || !teamId) return;
    
    const startTime = new Date(newEvent.date + 'T' + newEvent.time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    try {
      const { data, error } = await (supabase as any)
        .from('calendar_events')
        .insert({
          team_id: teamId,
          user_id: currentUser.id,
          title: newEvent.title.trim(),
          description: newEvent.location,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          type: newEvent.type,
          attendees: newEvent.attendees.split(',').map(s => s.trim()).filter(Boolean)
        })
        .select()
        .single();
      if (error) {
        console.error('[Calendar] Supabase insert error:', error);
        throw error;
      }

      console.log('[Calendar] Event created successfully:', data.id);

      const addedEvent: TeamEvent = {
        id: data.id,
        title: data.title,
        date: new Date(data.start_time),
        time: format(new Date(data.start_time), 'HH:mm'),
        type: data.type as any,
        location: data.description,
        attendees: data.attendees || [],
        color: EVENT_COLORS[data.type] || EVENT_COLORS.meeting,
      };

      setEvents([...events, addedEvent]);
      setNewEvent({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', type: 'meeting', location: '', attendees: '' });
      setShowAddEvent(false);
    } catch (err) {
      console.error('Error adding event:', err);
      alert('Failed to save event');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await (supabase as any)
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => events.filter(e => {
    const isDay = isSameDay(new Date(e.date), day);
    if (!isDay) return false;
    // Apply filters
    if (filters.length > 0) {
      // Check if any filter (name) is in the attendees list
      // Or if 'all' is an attendee
      const isAll = e.attendees.some(a => a.toLowerCase() === 'all');
      return isAll || filters.some(f => e.attendees.some(a => a.toLowerCase().includes(f.toLowerCase())));
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ color: 'var(--t-text)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase flex items-center gap-3">
            <CalendarIcon size={28} style={{ color: 'var(--t-primary)' }} /> Team Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
            Orchestrate your team's schedule and collective availability
          </p>
        </div>
        <div className="flex gap-2 bg-[var(--t-surface)] p-1 rounded-2xl border border-[var(--t-border)]">
          <button 
            onClick={() => setView('month')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'month' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:bg-white/5'}`}
          >
            Month View
          </button>
          <button 
            onClick={() => setView('team')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'team' ? 'bg-[var(--t-primary)] text-white shadow-lg' : 'text-[var(--t-text-muted)] hover:bg-white/5'}`}
          >
            Team Timeline
          </button>
        </div>
        <button
          onClick={() => setShowAddEvent(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <div className="w-64 hidden xl:block shrink-0 space-y-4">
           <div className="p-6 rounded-3xl bg-[var(--t-surface)] border border-[var(--t-border)] space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t-text-muted)]">Team Members</h3>
              <div className="space-y-2">
                {(team || []).map(member => (
                   <label key={member.id} className="flex items-center gap-3 p-2 rounded-xl border border-[var(--t-border)] hover:bg-[var(--t-surface-dim)] cursor-pointer transition-all group">
                      <input 
                        type="checkbox" 
                        checked={filters.includes(member.name)}
                        onChange={() => {
                          if (filters.includes(member.name)) {
                            setFilters(filters.filter(f => f !== member.name));
                          } else {
                            setFilters([...filters, member.name]);
                          }
                        }}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${filters.includes(member.name) ? 'bg-[var(--t-primary)] border-[var(--t-primary)]' : 'border-[var(--t-border)] group-hover:border-[var(--t-text-muted)]'}`}>
                         {filters.includes(member.name) && <Check size={10} className="text-white" />}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-blue-600/10 flex items-center justify-center text-[10px] font-bold">{member.avatar}</div>
                      <span className="text-xs font-bold truncate opacity-80">{member.name}</span>
                   </label>
                ))}
              </div>
              <button 
                onClick={() => setFilters([])}
                className="w-full py-2 text-[10px] font-bold uppercase text-[var(--t-primary)] hover:underline"
              >
                Reset Filters
              </button>
           </div>

           <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600/10 to-blue-600/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2 text-blue-400">
                 <Clock size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Next Meeting</span>
              </div>
              <p className="text-xs font-bold mb-1">Weekly Pipeline Sync</p>
              <p className="text-[10px] text-[var(--t-text-muted)]">Tomorrow at 10:00 AM</p>
           </div>
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          {view === 'month' ? (
            <div className="p-6 rounded-[2.5rem] border shadow-xl bg-[var(--t-surface)]" style={{ borderColor: 'var(--t-border)' }}>
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                    {format(currentMonth, 'MMMM')} <span className="opacity-30">{format(currentMonth, 'yyyy')}</span>
                  </h2>
                  {loading && <Loader2 size={16} className="animate-spin text-blue-500" />}
                </div>
                <div className="flex items-center gap-2 bg-[var(--t-bg)] p-1 rounded-xl border border-[var(--t-border)]">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <ChevronLeft size={20} style={{ color: 'var(--t-text-muted)' }} />
                  </button>
                  <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-white/5">Today</button>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <ChevronRight size={20} style={{ color: 'var(--t-text-muted)' }} />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.2em] py-2" style={{ color: i === 0 || i === 6 ? 'var(--t-text-muted)' : 'var(--t-primary)' }}>{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-3">
                {days.map((day, i) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const today = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[120px] p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 relative group border ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'} ${isSelected ? 'shadow-2xl z-10 scale-[1.05]' : 'hover:scale-[1.02]'}`}
                      style={{
                        backgroundColor: isSelected ? 'var(--t-bg)' : 'var(--t-surface-dim)',
                        borderColor: isSelected ? 'var(--t-primary)' : 'var(--t-border)',
                      }}
                    >
                      <div className={`text-xs font-black mb-3 w-7 h-7 flex items-center justify-center rounded-xl transition-all ${today ? 'bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary-dim)]' : 'group-hover:bg-white/5'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div
                            key={ev.id}
                            className="text-[9px] font-black px-2 py-1 rounded-lg truncate border-l-2"
                            style={{ 
                              backgroundColor: ev.color + '15', 
                              color: ev.color,
                              borderColor: ev.color
                            }}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[9px] font-bold pl-2 pt-1 opacity-40">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-[2.5rem] border shadow-xl bg-[var(--t-surface)]" style={{ borderColor: 'var(--t-border)' }}>
               {/* Team View placeholder logic */}
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-bold uppercase tracking-widest">Global Team Timeline</h2>
                 <p className="text-xs text-[var(--t-text-muted)]">{format(selectedDate || new Date(), 'EEEE, MMM d')}</p>
               </div>
               
               <div className="relative overflow-x-auto">
                 <div className="min-w-[800px] space-y-4">
                   {/* Time Markers */}
                   <div className="flex pl-32 mb-2">
                     {Array.from({ length: 10 }).map((_, i) => (
                       <div key={i} className="flex-1 text-[9px] font-bold text-[var(--t-text-muted)] border-l border-[var(--t-border)] pl-2">
                         {i + 9}:00
                       </div>
                     ))}
                   </div>
                   
                   {(team || []).map(member => (
                     <div key={member.id} className="flex items-center gap-4 group">
                       <div className="w-32 flex items-center gap-2 shrink-0">
                         <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center text-[10px] font-bold">{member.avatar}</div>
                         <span className="text-xs font-bold truncate">{member.name}</span>
                       </div>
                       <div className="flex-1 h-12 bg-[var(--t-bg)] rounded-xl border border-[var(--t-border)] relative overflow-hidden">
                          {/* Simplified busy block visualization */}
                          {getEventsForDay(selectedDate || new Date()).length > 0 && (
                            <div className="absolute inset-y-2 left-[20%] w-[15%] bg-blue-500/20 border-x border-blue-500/40 rounded flex items-center justify-center">
                              <span className="text-[8px] font-bold text-blue-400">BUSY</span>
                            </div>
                          )}
                          <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                            {Array.from({ length: 10 }).map((_, j) => (
                              <div key={j} className="border-r border-white/5 h-full" />
                            ))}
                          </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Day Detail + Team Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day Detail */}
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <h3 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'var(--t-text-muted)' }}>
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a day'}
          </h3>
          {selectedDate ? (
            <div className="space-y-3">
              {getEventsForDay(selectedDate).length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--t-text-muted)' }}>No events scheduled</p>
              ) : (
                getEventsForDay(selectedDate).map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border group" style={{ borderColor: ev.color + '30', backgroundColor: ev.color + '08' }}>
                    <div className="w-1 h-full min-h-[40px] rounded-full" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{ev.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--t-text-muted)' }}>
                          <Clock size={10} /> {ev.time}
                        </span>
                        {ev.location && (
                          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--t-text-muted)' }}>
                            <MapPin size={10} /> {ev.location}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-2 inline-block"
                        style={{ backgroundColor: ev.color + '20', color: ev.color }}>
                        {EVENT_LABELS[ev.type]}
                      </span>
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-400 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--t-text-muted)' }}>Click a day to see details</p>
          )}
        </div>

        {/* Team Availability */}
        <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
          <h3 className="text-sm font-black uppercase tracking-wider mb-4" style={{ color: 'var(--t-text-muted)' }}>
            <Users size={14} className="inline mr-2" />Team Availability
          </h3>
          <div className="space-y-3">
            {(team || []).map(member => {
              const memberEvents = selectedDate ? getEventsForDay(selectedDate).filter(e => e.attendees.some(a => a.toLowerCase() === 'all' || a.toLowerCase().includes(member.name.split(' ')[0].toLowerCase()))) : [];
              const isBusy = memberEvents.length > 0;

              return (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--t-bg)' }}>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--t-avatar-from), var(--t-avatar-to))' }}>
                      {member.avatar}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2`}
                      style={{
                        borderColor: 'var(--t-surface)',
                        backgroundColor: member.presenceStatus === 'online' ? 'var(--t-success)' : 'var(--t-text-muted)'
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{member.name}</p>
                    <p className="text-[10px]" style={{ color: isBusy ? '#f59e0b' : 'var(--t-success)' }}>
                      {isBusy ? `${memberEvents.length} event${memberEvents.length > 1 ? 's' : ''}` : 'Available'}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: isBusy ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: isBusy ? '#f59e0b' : '#10b981'
                    }}>
                    {isBusy ? 'Busy' : 'Free'}
                  </span>
                </div>
              );
            })}
            {(!team || team.length === 0) && (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--t-text-muted)' }}>No team members found</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddEvent(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase tracking-wider">New Event</h3>
              <button onClick={() => setShowAddEvent(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} style={{ color: 'var(--t-text-muted)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Title</label>
                <input value={newEvent.title} onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm" placeholder="Weekly standup"
                  style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Date</label>
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Time</label>
                  <input type="time" value={newEvent.time} onChange={e => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Type</label>
                <select value={newEvent.type} onChange={e => setNewEvent(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}>
                  {Object.entries(EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Location (optional)</label>
                <input value={newEvent.location} onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm" placeholder="123 Main St"
                  style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t-text-muted)' }}>Attendees (comma-separated)</label>
                <input value={newEvent.attendees} onChange={e => setNewEvent(prev => ({ ...prev, attendees: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm" placeholder="All, or John, Sarah"
                  style={{ backgroundColor: 'var(--t-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }} />
              </div>
              <button onClick={handleAddEvent} disabled={!newEvent.title.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--t-primary)' }}>
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
