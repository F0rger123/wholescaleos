// src/pages/Calendar.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';
import { GoogleCalendarService, GoogleCalendarEvent } from '../lib/google-calendar';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  source?: 'local' | 'google';
  googleId?: string;
}

export default function Calendar() {
  const { currentUser } = useStore();
  // Theme fallback since it doesn't exist in AppState
  const theme = { primary: '#3b82f6' };
  
  const googleService = GoogleCalendarService.getInstance();
  
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('calendarEvents');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        title: 'Sample Event',
        start: '2026-03-15T10:00',
        end: '2026-03-15T12:00',
        description: 'This is a sample event',
        source: 'local'
      },
      {
        id: '2',
        title: 'Another Event',
        start: '2026-03-16T14:00',
        end: '2026-03-16T15:30',
        description: 'Another test event',
        source: 'local'
      }
    ];
  });

  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const [currentView, setCurrentView] = useState('month');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: ''
  });

  // Use selectedCalendar to fetch events when it changes
  useEffect(() => {
    if (isGoogleConnected && selectedCalendar) {
      console.log('📅 Switching to calendar:', selectedCalendar);
      loadGoogleEvents();
    }
  }, [selectedCalendar]);

  useEffect(() => {
    if (currentUser?.id) {
      checkGoogleConnection();
    }
  }, [currentUser]);

  const checkGoogleConnection = async () => {
    const connected = await googleService.isConnected(currentUser?.id || '');
    setIsGoogleConnected(connected);
    if (connected) {
      loadGoogleEvents();
    }
  };

  const loadGoogleEvents = async () => {
    if (!currentUser?.id || !isGoogleConnected) return;
    
    setIsLoading(true);
    try {
      const events = await googleService.fetchEvents(
        currentUser.id,
        selectedCalendar,
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      );
      setGoogleEvents(events);
      console.log('✅ Loaded Google events:', events.length);
    } catch (err) {
      console.error('Failed to load Google events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGoogleConnected) {
      loadGoogleEvents();
    }
  }, [currentDate, isGoogleConnected]);

  useEffect(() => {
    const localEvents = events.filter(e => e.source === 'local');
    localStorage.setItem('calendarEvents', JSON.stringify(localEvents));
  }, [events]);

  const allEvents = [
    ...events,
    ...googleEvents.map(ge => ({
      id: `google-${ge.id}`,
      title: ge.summary,
      start: ge.start?.dateTime || ge.start?.date || '',
      end: ge.end?.dateTime || ge.end?.date || '',
      description: ge.description || '',
      source: 'google' as const,
      googleId: ge.id
    }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 handleSubmit called', { formData, editingEvent, isGoogleConnected });
    
    const startDateTime = `${formData.startDate}T${formData.startTime}`;
    const endDateTime = `${formData.endDate}T${formData.endTime}`;
    
    if (editingEvent) {
      if (editingEvent.source === 'google' && editingEvent.googleId && currentUser?.id) {
        try {
          await googleService.updateEvent(
            currentUser.id,
            selectedCalendar,
            editingEvent.googleId,
            {
              summary: formData.title,
              description: formData.description,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime }
            }
          );
          await loadGoogleEvents();
          console.log('✅ Google event updated');
        } catch (err) {
          console.error('Failed to update Google event:', err);
          alert('Failed to update Google Calendar event');
        }
      } else {
        setEvents(events.map(e => 
          e.id === editingEvent.id 
            ? { ...e, title: formData.title, start: startDateTime, end: endDateTime, description: formData.description }
            : e
        ));
        console.log('✅ Local event updated');
      }
    } else {
      if (isGoogleConnected && currentUser?.id) {
        try {
          const newEvent = await googleService.createEvent(
            currentUser.id,
            selectedCalendar,
            {
              summary: formData.title,
              description: formData.description,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime }
            }
          );
          await loadGoogleEvents();
          console.log('✅ Google event created:', newEvent);
        } catch (err) {
          console.error('Failed to create Google event:', err);
          alert('Failed to create Google Calendar event');
        }
      } else {
        const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: formData.title,
          start: startDateTime,
          end: endDateTime,
          description: formData.description,
          source: 'local'
        };
        setEvents([...events, newEvent]);
        console.log('✅ Local event created:', newEvent);
      }
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      description: ''
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      startDate: event.start.split('T')[0],
      startTime: event.start.split('T')[1]?.slice(0, 5) || '09:00',
      endDate: event.end.split('T')[0],
      endTime: event.end.split('T')[1]?.slice(0, 5) || '10:00',
      description: event.description
    });
    setShowForm(true);
  };

  const deleteEvent = async (id: string, source?: string, googleId?: string) => {
    if (!confirm('Are you sure?')) return;
    
    if (source === 'google' && googleId && currentUser?.id) {
      try {
        await googleService.deleteEvent(currentUser.id, selectedCalendar, googleId);
        await loadGoogleEvents();
        console.log('✅ Google event deleted');
      } catch (err) {
        console.error('Failed to delete Google event:', err);
        alert('Failed to delete Google Calendar event');
      }
    } else {
      setEvents(events.filter(e => e.id !== id));
      console.log('✅ Local event deleted');
    }
  };

  const renderMonthView = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDay = firstDay.getDay();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cells = [];
    
    for (let i = 0; i < startingDay; i++) {
      cells.push(
        <div 
          key={`empty-${i}`} 
          className="h-24 p-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500"
        ></div>
      );
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = allEvents.filter(e => e.start.startsWith(dateStr));
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      
      cells.push(
        <div 
          key={day} 
          className={`h-24 p-1 border ${isToday ? 'border-brand-500 dark:border-brand-400' : 'border-slate-200 dark:border-slate-700'} hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer overflow-y-auto transition-colors`}
          onClick={() => {
            setFormData({...formData, startDate: dateStr, endDate: dateStr});
            setShowForm(true);
          }}
        >
          <div className={`font-medium ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {day}
            {isLoading && day === 1 && <span className="ml-1 text-xs text-slate-400">⟳</span>}
          </div>
          {dayEvents.map(event => (
            <div 
              key={event.id}
              className={`text-xs rounded px-1 mt-1 truncate transition-colors cursor-pointer ${
                event.source === 'google' 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                editEvent(event);
              }}
              style={event.source === 'local' ? { backgroundColor: theme.primary } : {}}
            >
              {event.source === 'google' ? '📅 ' : ''}{event.title}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ← Previous
          </button>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Next →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center font-semibold py-2 text-slate-600 dark:text-slate-400">
              {day}
            </div>
          ))}
          {cells}
        </div>
      </div>
    );
  };

  const buttonClasses = {
    primary: `bg-brand-500 hover:bg-brand-600 text-white transition-colors`,
    secondary: `bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors`,
    danger: `bg-red-500 hover:bg-red-600 text-white transition-colors`
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Calendar</h1>
        <div className="flex items-center gap-4">
          <GoogleCalendarConnect />
          
          {/* Calendar selector dropdown - fixes the warning and adds functionality */}
          {isGoogleConnected && (
            <select
              value={selectedCalendar}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
            >
              <option value="primary">Primary Calendar</option>
              <option value="drummerforger@gmail.com">Your Email</option>
            </select>
          )}
          
          <div className="space-x-2">
            <button 
              onClick={() => { setCurrentView('month'); setShowForm(false); }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'month' ? buttonClasses.primary : buttonClasses.secondary
              }`}
            >
              Month
            </button>
            <button 
              onClick={() => { setCurrentView('week'); setShowForm(false); }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'week' ? buttonClasses.primary : buttonClasses.secondary
              }`}
            >
              Week
            </button>
            <button 
              onClick={() => { setCurrentView('day'); setShowForm(false); }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                currentView === 'day' ? buttonClasses.primary : buttonClasses.secondary
              }`}
            >
              Day
            </button>
            <button 
              onClick={() => setShowForm(!showForm)}
              className={`px-4 py-2 rounded-lg ${buttonClasses.primary}`}
              style={{ backgroundColor: theme.primary }}
            >
              + New Event
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-800">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Week view coming soon...
          </div>
        )}
        {currentView === 'day' && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            Day view coming soon...
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">
              {editingEvent ? 'Edit Event' : 'Create Event'}
              {editingEvent?.source === 'google' && <span className="ml-2 text-xs text-green-500">(Google Calendar)</span>}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg ${buttonClasses.primary}`}
                  style={{ backgroundColor: theme.primary }}
                >
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">
          Upcoming Events
          {isGoogleConnected && <span className="ml-2 text-xs text-green-500">(Google Calendar synced)</span>}
        </h2>
        <div className="space-y-2">
          {allEvents.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No upcoming events</p>
          ) : (
            allEvents
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(event => (
                <div key={event.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {event.title}
                        {event.source === 'google' && <span className="ml-2 text-xs text-green-500">📅 Google</span>}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                      </div>
                      <div className="text-sm mt-1 text-slate-600 dark:text-slate-300">{event.description}</div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => editEvent(event)}
                        className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        style={{ backgroundColor: theme.primary }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id, event.source, event.googleId)}
                        className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
