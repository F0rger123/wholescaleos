import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Search,
  Calendar as CalendarIcon, Zap, Star
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
  eachDayOfInterval, parseISO, isToday, isPast
} from 'date-fns';
import { useStore } from '../../store/useStore';
import { toast } from 'react-hot-toast';
import { sendEmail, teamEventTemplate } from '../../lib/email';

interface TeamEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  type: 'meeting' | 'social' | 'deadline' | 'other';
  attendees: string[];
  createdBy: string;
  reminderMinutes?: number;
  notifyViaEmail?: boolean;
}

export function TeamCalendarTab() {
  const { team, currentUser } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'meeting' | 'social' | 'deadline'>('all');

  // Hardcoded initial events for demo - in real app would be from store/db
  const [events, setEvents] = useState<TeamEvent[]>([
    {
       id: '1',
       title: 'Weekly Sync',
       description: 'Review quarterly goals and pipeline status.',
       startDate: new Date().toISOString(),
       endDate: addDays(new Date(), 1).toISOString(),
       location: 'Zoom / Meeting Room A',
       type: 'meeting',
       attendees: team.slice(0, 3).map(m => m.id),
       createdBy: team[0]?.id || ''
    },
    {
       id: '2',
       title: 'Big Deal Deadline',
       description: 'Final contracts for Smith project due.',
       startDate: addDays(new Date(), 2).toISOString(),
       endDate: addDays(new Date(), 2).toISOString(),
       location: 'Remote',
       type: 'deadline',
       attendees: [team[0]?.id || ''],
       createdBy: team[0]?.id || ''
    }
  ]);

  const [newEvent, setNewEvent] = useState<Partial<TeamEvent>>({
    title: '',
    description: '',
    type: 'meeting',
    location: '',
    attendees: [],
    reminderMinutes: 15,
    notifyViaEmail: false
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleAddEvent = () => {
    if (!newEvent.title || !selectedDate) return;
    
    const event: TeamEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEvent.title,
      description: newEvent.description || '',
      startDate: selectedDate.toISOString(),
      endDate: selectedDate.toISOString(),
      location: newEvent.location || '',
      type: newEvent.type as any,
      attendees: newEvent.attendees || [],
      createdBy: currentUser?.id || '',
      reminderMinutes: newEvent.reminderMinutes,
      notifyViaEmail: newEvent.notifyViaEmail
    };

    if (event.notifyViaEmail) {
      // Send emails to all attendees
      event.attendees.forEach(async (attendeeId) => {
        const attendee = team.find(m => m.id === attendeeId);
        if (attendee?.email) {
          const emailPayload = teamEventTemplate(
            attendee.name,
            event.title,
            event.startDate,
            event.location,
            event.description,
            currentUser?.name || 'A team member',
            window.location.origin + '/team'
          );
          emailPayload.to = attendee.email;
          await sendEmail(emailPayload);
        }
      });
      toast.success(`Email invites dispatched to ${event.attendees.length} members`);
    }

    if (event.reminderMinutes && event.reminderMinutes > 0) {
      console.log(`[Reminder System] Alert set for ${event.reminderMinutes} minutes before ${format(selectedDate, 'PPp')}`);
    }

    setEvents([...events, event]);
    setShowEventModal(false);
    setNewEvent({ 
      title: '', 
      description: '', 
      type: 'meeting', 
      location: '', 
      attendees: [],
      reminderMinutes: 15,
      notifyViaEmail: false
    });
    toast.success('Event scheduled successfully!');
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || e.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Team Calendar</h1>
          <p className="text-sm text-[var(--t-text-muted)]">Sync availability & project milestones.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--t-text-muted)]" />
              <input 
                 placeholder="Search events..." 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="pl-10 pr-4 py-3 rounded-2xl bg-[var(--t-surface)] border border-[var(--t-border)] text-sm shadow-sm md:w-[250px]" 
              />
           </div>
           <button 
             onClick={() => { setSelectedDate(new Date()); setShowEventModal(true); }}
             className="p-3 rounded-2xl bg-[var(--t-primary)] text-white shadow-lg shadow-[var(--t-primary)]/20 hover:scale-105 active:scale-95 transition-all"
           >
             <Plus size={24} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Calendar Body */}
        <div className="xl:col-span-3 rounded-[2.5rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-[var(--t-border)] flex items-center justify-between flex-wrap gap-4">
             <div className="flex items-center gap-6">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">
                   {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex p-1.5 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
                   <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-[var(--t-surface)] text-[var(--t-text-muted)] transition-all cursor-pointer"><ChevronLeft size={20} /></button>
                   <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-[var(--t-surface)] text-[var(--t-text-muted)] transition-all cursor-pointer"><ChevronRight size={20} /></button>
                </div>
             </div>

             <div className="flex p-1.5 rounded-2xl bg-[var(--t-surface-dim)] border border-[var(--t-border)]">
                {(['all', 'meeting', 'social', 'deadline'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-[var(--t-primary)] text-white' : 'text-[var(--t-text-muted)] hover:text-[var(--t-text)]'}`}
                  >
                    {type}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex-1 grid grid-cols-7 border-b border-[var(--t-border)] bg-[var(--t-surface-dim)]">
             {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
               <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] border-r border-[var(--t-border)] last:border-0">{day}</div>
             ))}
          </div>

          <div className="grid grid-cols-7 flex-1">
             {calendarDays.map((date, i) => {
               const dayEvents = filteredEvents.filter(e => isSameDay(parseISO(e.startDate), date));
               const isCurrentMonth = isSameMonth(date, monthStart);
               const isTodayDate = isToday(date);
               
               return (
                 <div
                   key={i}
                   onClick={() => { setSelectedDate(date); setShowEventModal(true); }}
                   className={`min-h-[140px] p-4 border-r border-b border-[var(--t-border)] transition-all cursor-pointer flex flex-col gap-2 ${!isCurrentMonth ? 'bg-[var(--t-surface-dim)]/30 opacity-30 shadow-inner' : 'hover:bg-[var(--t-surface-hover)]'}`}
                 >
                   <div className="flex items-center justify-between">
                      <span className={`text-xs font-black tracking-tighter ${isTodayDate ? 'w-8 h-8 rounded-full bg-[var(--t-primary)] text-white flex items-center justify-center -m-1' : 'text-[var(--t-text)]'}`}>
                        {format(date, 'd')}
                      </span>
                   </div>
                   <div className="flex flex-col gap-1 overflow-hidden">
                      {dayEvents.map((e, idx) => (
                        <div key={idx} className={`p-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight truncate border shadow-sm ${e.type === 'meeting' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : e.type === 'deadline' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-purple-500/10 border-purple-500/20 text-purple-500'}`}>
                           {e.title}
                        </div>
                      ))}
                   </div>
                 </div>
               );
             })}
          </div>
        </div>

        {/* Sidebar / List View */}
        <div className="space-y-6">
           <div className="p-6 rounded-[2rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-xl">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--t-text)] mb-6 flex items-center gap-2">
                 <CalendarIcon size={20} className="text-[var(--t-primary)]" />
                 Upcoming
              </h3>
              <div className="space-y-4">
                 {filteredEvents.filter(e => !isPast(parseISO(e.startDate))).slice(0, 3).map((e, i) => (
                   <div key={i} className="group p-4 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] hover:border-[var(--t-primary)] transition-all">
                      <div className="flex items-center justify-between mb-3">
                         <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${e.type === 'meeting' ? 'bg-blue-500 text-white' : e.type === 'deadline' ? 'bg-rose-500 text-white' : 'bg-purple-500 text-white'}`}>
                            {e.type}
                         </span>
                         <Star size={14} className="text-[var(--t-text-muted)] group-hover:text-amber-500 transition-colors" />
                      </div>
                      <h4 className="text-sm font-black text-[var(--t-text)] mb-1">{e.title}</h4>
                      <p className="text-[10px] text-[var(--t-text-muted)] font-bold mb-4">{format(parseISO(e.startDate), 'MMM dd, yyyy')} · {format(parseISO(e.startDate), 'h:mm a')}</p>
                      <div className="flex -space-x-2">
                         {e.attendees.map((id, n) => {
                            const member = team.find(m => m.id === id);
                            return (
                               <div key={n} className="w-6 h-6 rounded-full border-2 border-[var(--t-surface)] bg-indigo-500 flex items-center justify-center text-[8px] font-bold text-white shadow-lg">
                                  {member?.avatar || '?'}
                               </div>
                            );
                         })}
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -bottom-8 -right-8 opacity-10 rotate-12"><Zap size={160} /></div>
              <div className="relative z-10 space-y-4">
                 <h3 className="text-xl font-black italic uppercase tracking-tighter">Team Sync</h3>
                 <p className="text-xs text-indigo-100/80 font-medium">Coordinate schedules and never miss a beat. Add your personal leaves to the shared dashboard.</p>
                 <button onClick={() => setShowEventModal(true)} className="w-full py-3 rounded-xl bg-white text-indigo-600 font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all">Schedule New</button>
              </div>
           </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-xl p-10 rounded-[3rem] bg-[var(--t-surface)] border border-[var(--t-border)] shadow-2xl relative">
              <button onClick={() => setShowEventModal(false)} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-[var(--t-surface-dim)] text-[var(--t-text-muted)] transition-all cursor-pointer"><X size={24} /></button>
              
              <div className="flex items-center gap-4 mb-10">
                 <div className="p-4 rounded-[1.5rem] bg-[var(--t-primary-dim)] text-[var(--t-primary)]">
                    <Zap size={32} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--t-text)]">Schedule Event</h3>
                    <p className="text-xs text-[var(--t-text-muted)]">Adding for {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'selected date'}</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-3 block">Event Title</label>
                    <input 
                       placeholder="Enter amazing event name..." 
                       value={newEvent.title}
                       onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                       className="w-full px-6 py-4 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] text-[var(--t-text)] font-bold outline-none focus:ring-2 focus:ring-[var(--t-primary)]/50" 
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-3 block">Category</label>
                       <select 
                          value={newEvent.type}
                          onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                          className="w-full px-6 py-4 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] text-[var(--t-text)] font-bold outline-none cursor-pointer"
                       >
                          <option value="meeting">Meeting</option>
                          <option value="deadline">Deadline</option>
                          <option value="social">Social</option>
                          <option value="other">Other</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-3 block">Location</label>
                       <input 
                          placeholder="Zoom/Office..." 
                          value={newEvent.location}
                          onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                          className="w-full px-6 py-4 rounded-[1.5rem] bg-[var(--t-bg)] border border-[var(--t-border)] text-[var(--t-text)] font-bold outline-none" 
                       />
                    </div>
                 </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)] mb-3 block">Team Attendees</label>
                    <div className="flex flex-wrap gap-2">
                       {team.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                               const current = newEvent.attendees || [];
                               const next = current.includes(m.id) ? current.filter(id => id !== m.id) : [...current, m.id];
                               setNewEvent({...newEvent, attendees: next});
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${newEvent.attendees?.includes(m.id) ? 'bg-[var(--t-primary)] text-white border-[var(--t-primary)]' : 'bg-[var(--t-bg)] border-[var(--t-border)] text-[var(--t-text-muted)]'}`}
                          >
                             {m.name}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="p-6 rounded-2xl bg-[var(--t-bg)] border border-[var(--t-border)] space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--t-text-muted)]">Reminders & Sync</p>
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex-1">
                          <label className="text-[9px] font-bold text-[var(--t-text-muted)] uppercase block mb-1">Push Alert Time</label>
                          <select 
                             value={newEvent.reminderMinutes}
                             onChange={e => setNewEvent({...newEvent, reminderMinutes: parseInt(e.target.value)})}
                             className="w-full bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl px-4 py-2 text-xs font-black text-[var(--t-text)] outline-none"
                          >
                             <option value={0}>No Reminder</option>
                             <option value={5}>5 Minutes Before</option>
                             <option value={15}>15 Minutes Before</option>
                             <option value={30}>30 Minutes Before</option>
                             <option value={60}>1 Hour Before</option>
                             <option value={1440}>1 Day Before</option>
                          </select>
                       </div>
                       <div className="flex flex-col items-end">
                          <label className="text-[9px] font-bold text-[var(--t-text-muted)] uppercase mb-1">Email Notice</label>
                          <button 
                             type="button"
                             onClick={() => setNewEvent({...newEvent, notifyViaEmail: !newEvent.notifyViaEmail})}
                             className={`w-12 h-6 rounded-full transition-all relative ${newEvent.notifyViaEmail ? 'bg-emerald-500' : 'bg-[var(--t-surface-dim)]'}`}
                          >
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newEvent.notifyViaEmail ? 'right-1' : 'left-1'}`} />
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="pt-6">
                    <button 
                       onClick={handleAddEvent}
                       className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                       Create Event Launch
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
