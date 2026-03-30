import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (teamId) {
      fetchEvents();
    }
  }, [currentMonth, teamId]);

  async function fetchEvents() {
    if (!supabase) return;
    setLoading(true);
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
        location: e.description, // Using description as location for now or metadata if added
        attendees: [], // We can expand this later
        color: EVENT_COLORS[e.type] || EVENT_COLORS.meeting,
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
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
          type: newEvent.type
        })
        .select()
        .single();

      if (error) throw error;

      const addedEvent: TeamEvent = {
        id: data.id,
        title: data.title,
        date: new Date(data.start_time),
        time: format(new Date(data.start_time), 'HH:mm'),
        type: data.type as any,
        location: data.description,
        attendees: [],
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

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.date), day));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" style={{ color: 'var(--t-text)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase flex items-center gap-3">
            <CalendarIcon size={28} style={{ color: 'var(--t-primary)' }} /> Team Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--t-text-muted)' }}>
            Schedule shared events, open houses, and team meetings
          </p>
        </div>
        <button
          onClick={() => setShowAddEvent(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:scale-105"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="p-6 rounded-2xl border" style={{ backgroundColor: 'var(--t-surface)', borderColor: 'var(--t-border)' }}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronLeft size={20} style={{ color: 'var(--t-text-muted)' }} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black uppercase tracking-wider">{format(currentMonth, 'MMMM yyyy')}</h2>
            {loading && <Loader2 size={16} className="animate-spin text-purple-500" />}
          </div>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronRight size={20} style={{ color: 'var(--t-text-muted)' }} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider py-2" style={{ color: 'var(--t-text-muted)' }}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--t-border)' }}>
          {days.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const today = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[90px] p-1.5 cursor-pointer transition-all hover:brightness-110 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                style={{
                  backgroundColor: isSelected ? 'var(--t-primary-dim)' : 'var(--t-surface)',
                }}
              >
                <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${today ? 'text-white' : ''}`}
                  style={{ backgroundColor: today ? 'var(--t-primary)' : 'transparent' }}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      className="text-[9px] font-bold px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: ev.color + '20', color: ev.color }}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[9px] font-bold pl-1" style={{ color: 'var(--t-text-muted)' }}>+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
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
