// src/pages/Calendar.tsx - CLEAN VERSION (no drag & drop)
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { GoogleCalendarConnect } from '../components/GoogleCalendarConnect';
import { GoogleCalendarService, GoogleCalendarEvent } from '../lib/google-calendar.js';
import { supabase } from '../lib/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  source?: 'local' | 'google';
  googleId?: string;
  calendarId?: string;
  color?: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  notified?: boolean;
  leadId?: string;
  leadName?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Lead {
  id: string;
  name: string;
}

function Calendar() {
  console.log('🔥 Calendar loading...');
  const { currentUser } = useStore();
  
  const theme = { primary: '#3b82f6' };
  
  const googleService = GoogleCalendarService.getInstance();
  
  // Get leads from store
  const leads: Lead[] = useStore((state: any) => {
    return Array.isArray(state.leads) ? state.leads : [];
  });
  
  // Categories Management
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('calendarCategories');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Meeting', color: '#8b5cf6' },
      { id: '2', name: 'Task', color: '#10b981' },
      { id: '3', name: 'Follow-up', color: '#f59e0b' },
      { id: '4', name: 'Personal', color: '#ec4899' },
      { id: '5', name: 'Holiday', color: '#ef4444' }
    ];
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  
  // View selector popout
  const [showViewSelector, setShowViewSelector] = useState(false);
  
  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('calendarNotifications') === 'true';
  });

  // Local enrichment for Google events
  const [enrichments, setEnrichments] = useState<Record<string, any>>({});
  const [enrichmentsLoaded, setEnrichmentsLoaded] = useState(false);
  
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('calendarEvents');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        title: 'Sample Event',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        description: 'This is a sample event',
        source: 'local',
        categoryId: '1',
        categoryName: 'Meeting',
        categoryColor: '#8b5cf6',
        notified: false
      },
      {
        id: '2',
        title: 'Another Event',
        start: new Date(Date.now() + 86400000).toISOString(),
        end: new Date(Date.now() + 90000000).toISOString(),
        description: 'Another test event',
        source: 'local',
        categoryId: '2',
        categoryName: 'Task',
        categoryColor: '#10b981',
        notified: false
      }
    ];
  });

  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['primary']);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [showForm, setShowForm] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: '',
    categoryId: categories[0]?.id || '',
    leadId: ''
  });

  // Load enrichments first
  const loadEnrichments = async () => {
    if (!currentUser?.id) return;
    
    try {
      if (!supabase) return;
      const { data } = await supabase
        .from('event_enrichments')
        .select('*')
        .eq('user_id', currentUser.id);
        
      if (data) {
        const enrichMap: Record<string, any> = {};
        data.forEach(item => {
          enrichMap[item.google_event_id] = item;
        });
        setEnrichments(enrichMap);
      }
      setEnrichmentsLoaded(true);
    } catch (err) {
      console.error('Failed to load enrichments:', err);
      setEnrichmentsLoaded(true);
    }
  };

  // Save categories to localStorage
  useEffect(() => {
    localStorage.setItem('calendarCategories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (currentUser?.id) {
      loadEnrichments();
      checkGoogleConnection();
    }
  }, [currentUser]);

  const checkGoogleConnection = async () => {
    const connected = await googleService.isConnected(currentUser?.id || '');
    setIsGoogleConnected(connected);
    if (connected) {
      loadCalendars();
    }
  };

  const loadCalendars = async () => {
    if (!currentUser?.id) return;
    
    try {
      const fetchedCalendars = await googleService.fetchCalendars(currentUser.id);
      setCalendars(fetchedCalendars);
      const primary = fetchedCalendars.find(c => c.primary)?.id || 'primary';
      setSelectedCalendars([primary]);
    } catch (err) {
      console.error('Failed to load calendars:', err);
    }
  };

  const getViewStartDate = () => {
    if (currentView === 'month') {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    } else if (currentView === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      return start;
    } else {
      return new Date(currentDate);
    }
  };

  const getViewEndDate = () => {
    if (currentView === 'month') {
      return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (currentView === 'week') {
      const end = new Date(currentDate);
      end.setDate(currentDate.getDate() - currentDate.getDay() + 7);
      return end;
    } else {
      const end = new Date(currentDate);
      end.setDate(currentDate.getDate() + 1);
      return end;
    }
  };

  const loadAllEvents = async () => {
    if (!currentUser?.id || !isGoogleConnected || selectedCalendars.length === 0 || !enrichmentsLoaded) return;
    
    setIsLoading(true);
    let allFetchedEvents: GoogleCalendarEvent[] = [];
    
    try {
      for (const calendarId of selectedCalendars) {
        const events = await googleService.fetchEvents(
          currentUser.id,
          calendarId,
          getViewStartDate(),
          getViewEndDate()
        );
        allFetchedEvents = [...allFetchedEvents, ...events];
      }
      setGoogleEvents(allFetchedEvents);
    } catch (err) {
      console.error('Failed to load Google events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGoogleConnected && enrichmentsLoaded) {
      loadAllEvents();
    }
  }, [currentDate, selectedCalendars, currentView, isGoogleConnected, enrichmentsLoaded]);

  useEffect(() => {
    const localEvents = events.filter(e => e.source === 'local');
    localStorage.setItem('calendarEvents', JSON.stringify(localEvents));
  }, [events]);

  const getCalendarColor = (calendarId: string) => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.backgroundColor || '#3b82f6';
  };

  // Category management functions
  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      color: newCategoryColor
    };
    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryColor('#3b82f6');
    setEditingCategory(null);
  };

  const updateCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    setCategories(categories.map(c => 
      c.id === editingCategory.id 
        ? { ...c, name: newCategoryName, color: newCategoryColor }
        : c
    ));
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryColor('#3b82f6');
  };

  const deleteCategory = (categoryId: string) => {
    if (confirm('Are you sure? This will remove this category from all events.')) {
      setCategories(categories.filter(c => c.id !== categoryId));
      setEvents(events.map(e => 
        e.categoryId === categoryId 
          ? { ...e, categoryId: undefined, categoryName: undefined, categoryColor: undefined }
          : e
      ));
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
  };

  // Save enrichment for Google event
  const saveEnrichment = async (googleEventId: string, data: any) => {
    if (!currentUser?.id || !supabase) return;
    
    const { error } = await supabase
      .from('event_enrichments')
      .upsert({
        user_id: currentUser.id,
        google_event_id: googleEventId,
        category_id: data.categoryId,
        lead_id: data.leadId,
        updated_at: new Date().toISOString()
      });
      
    if (!error) {
      setEnrichments({
        ...enrichments,
        [googleEventId]: {
          google_event_id: googleEventId,
          category_id: data.categoryId,
          lead_id: data.leadId
        }
      });
    }
  };

  // Merge Google events with local enrichments
  const mergedGoogleEvents = googleEvents.map(ge => {
    const enrichment = enrichments[ge.id];
    const category = enrichment?.category_id ? categories.find(c => c.id === enrichment.category_id) : null;
    const lead = enrichment?.lead_id ? leads.find(l => l.id === enrichment.lead_id) : null;
    
    return {
      id: `google-${ge.id}`,
      title: ge.summary,
      start: ge.start?.dateTime || ge.start?.date || '',
      end: ge.end?.dateTime || ge.end?.date || '',
      description: ge.description || '',
      source: 'google' as const,
      googleId: ge.id,
      calendarId: 'primary',
      color: getCalendarColor('primary'),
      categoryId: enrichment?.category_id,
      categoryName: category?.name,
      categoryColor: category?.color,
      leadId: enrichment?.lead_id,
      leadName: lead?.name
    };
  });

  const allEvents = [...events, ...mergedGoogleEvents];

  const filteredEvents = allEvents.filter(event => {
    if (selectedCategories.length === 0) return true;
    return event.categoryId && selectedCategories.includes(event.categoryId);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
    const endDateTime = `${formData.endDate}T${formData.endTime}:00`;
    
    const selectedCategory = categories.find(c => c.id === formData.categoryId);
    const selectedLead = leads.find(l => l.id === formData.leadId);
    
    if (editingEvent) {
      if (editingEvent.source === 'google' && editingEvent.googleId && currentUser?.id) {
        try {
          await googleService.updateEvent(
            currentUser.id,
            selectedCalendars[0],
            editingEvent.googleId,
            {
              summary: formData.title,
              description: formData.description,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime }
            }
          );
          
          await saveEnrichment(editingEvent.googleId, {
            categoryId: formData.categoryId,
            leadId: formData.leadId
          });
          
          await loadAllEvents();
          alert('Google Calendar event updated!');
        } catch (err) {
          alert('Failed to update Google Calendar event');
        }
      } else {
        setEvents(events.map(e => 
          e.id === editingEvent.id 
            ? { 
                ...e, 
                title: formData.title, 
                start: startDateTime, 
                end: endDateTime, 
                description: formData.description,
                categoryId: formData.categoryId,
                categoryName: selectedCategory?.name,
                categoryColor: selectedCategory?.color,
                leadId: formData.leadId,
                leadName: selectedLead?.name
              }
            : e
        ));
        alert('Local event updated!');
      }
    } else {
      if (isGoogleConnected) {
        try {
          if (!currentUser) throw new Error('User not logged in');
          const newEvent = await googleService.createEvent(
            currentUser.id,
            selectedCalendars[0],
            {
              summary: formData.title,
              description: formData.description,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime }
            }
          );
          
          await saveEnrichment(newEvent.id, {
            categoryId: formData.categoryId,
            leadId: formData.leadId
          });
          
          await loadAllEvents();
          alert('Google Calendar event created with local data!');
        } catch (err) {
          alert('Failed to create Google Calendar event');
        }
      } else {
        const newEvent: CalendarEvent = {
          id: Date.now().toString(),
          title: formData.title,
          start: startDateTime,
          end: endDateTime,
          description: formData.description,
          source: 'local',
          categoryId: formData.categoryId,
          categoryName: selectedCategory?.name,
          categoryColor: selectedCategory?.color,
          leadId: formData.leadId,
          leadName: selectedLead?.name,
          notified: false
        };
        setEvents([...events, newEvent]);
        alert('Local event created!');
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
      description: '',
      categoryId: categories[0]?.id || '',
      leadId: ''
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    const startParts = (event.start || '').split('T');
    const endParts = (event.end || '').split('T');
    setFormData({
      title: event.title,
      startDate: startParts[0] || new Date().toISOString().split('T')[0],
      startTime: startParts[1]?.slice(0, 5) || '09:00',
      endDate: endParts[0] || new Date().toISOString().split('T')[0],
      endTime: endParts[1]?.slice(0, 5) || '10:00',
      description: event.description,
      categoryId: event.categoryId || categories[0]?.id || '',
      leadId: event.leadId || ''
    });
    setShowForm(true);
    setShowEventDetail(false);
  };

  const deleteEvent = async (id: string, source?: string, googleId?: string) => {
    if (!confirm('Are you sure?')) return;
    
    if (source === 'google' && googleId && currentUser?.id) {
      try {
        await googleService.deleteEvent(currentUser.id, selectedCalendars[0], googleId);
        
        if (supabase) {
          await supabase
            .from('event_enrichments')
            .delete()
            .eq('google_event_id', googleId);
        }
          
        await loadAllEvents();
        alert('Google Calendar event deleted!');
      } catch (err) {
        alert('Failed to delete Google Calendar event');
      }
    } else {
      setEvents(events.filter(e => e.id !== id));
      alert('Local event deleted!');
    }
    setShowEventDetail(false);
  };

  const navigateView = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (currentView === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (currentView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getViewTitle = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    if (currentView === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (currentView === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${currentDate.getFullYear()}`;
    } else {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
    }
  };

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDay = firstDay.getDay();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cells = [];
    
    for (let i = 0; i < startingDay; i++) {
      cells.push(
        <div 
          key={`empty-${i}`} 
          className="h-24 p-1 border border-[var(--t-border)] dark:border-[var(--t-border)] bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)]/50 text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]"
        ></div>
      );
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter(e => e.start.startsWith(dateStr));
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      
      cells.push(
        <div 
          key={day} 
          className="h-24 p-1 border hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)]/50 cursor-pointer overflow-y-auto transition-colors"
          style={isToday ? { borderColor: 'var(--t-primary)' } : { borderColor: 'var(--t-border)' }}
          onClick={() => {
            setFormData({...formData, startDate: dateStr, endDate: dateStr});
            setShowForm(true);
          }}
        >
          <div className="font-medium" style={isToday ? { color: 'var(--t-primary)' } : { color: 'var(--t-text)' }}>
            {day}
            {isLoading && day === 1 && <span className="ml-1 text-xs text-[var(--t-text-muted)]">⟳</span>}
          </div>
          {dayEvents.map(event => (
            <div 
              key={event.id}
              className="text-xs rounded px-1 mt-1 truncate transition-colors cursor-pointer text-white"
              style={{ 
                backgroundColor: event.source === 'google' 
                  ? (event.categoryColor || event.color || '#10b981')
                  : (event.categoryColor || theme.primary)
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(event);
                setShowEventDetail(true);
              }}
            >
              {event.source === 'google' ? '📅 ' : ''}{event.title}
              {event.leadName && <span className="ml-1 opacity-75">👤</span>}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center font-semibold py-2 text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">
            {day}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });

    const getEventsForTimeSlot = (day: Date, hour: number) => {
      const dayStr = day.toISOString().split('T')[0];
      const hourStart = `${dayStr}T${String(hour).padStart(2, '0')}:00:00`;
      const hourEnd = `${dayStr}T${String(hour + 1).padStart(2, '0')}:00:00`;
      
      return filteredEvents.filter(e => 
        e.start >= hourStart && e.start < hourEnd
      );
    };

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="text-center font-semibold py-2 text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]"></div>
            {days.map((day, i) => (
              <div key={i} className="text-center font-semibold py-2 text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">
                {day.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </div>
            ))}
          </div>

          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-right pr-2 text-sm text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">
                {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              {days.map((day, dayIndex) => {
                const events = getEventsForTimeSlot(day, hour);
                const dateStr = day.toISOString().split('T')[0];
                
                return (
                  <div
                    key={dayIndex}
                    className="h-16 p-1 border border-[var(--t-border)] dark:border-[var(--t-border)] hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)]/50 cursor-pointer overflow-y-auto transition-colors rounded"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        startDate: dateStr,
                        endDate: dateStr,
                        startTime: `${String(hour).padStart(2, '0')}:00`,
                        endTime: `${String(hour + 1).padStart(2, '0')}:00`
                      });
                      setShowForm(true);
                    }}
                  >
                    {events.map(event => (
                      <div
                        key={event.id}
                        className="text-xs rounded px-1 mb-1 truncate cursor-pointer text-white"
                        style={{ 
                          backgroundColor: event.source === 'google' 
                            ? (event.categoryColor || event.color || '#10b981')
                            : (event.categoryColor || theme.primary)
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                          setShowEventDetail(true);
                        }}
                      >
                        {event.title}
                        {event.leadName && <span className="ml-1 opacity-75">👤</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayStr = currentDate.toISOString().split('T')[0];

    const getEventsForHour = (hour: number) => {
      const hourStart = `${dayStr}T${String(hour).padStart(2, '0')}:00:00`;
      const hourEnd = `${dayStr}T${String(hour + 1).padStart(2, '0')}:00:00`;
      
      return filteredEvents.filter(e => 
        e.start >= hourStart && e.start < hourEnd
      );
    };

    return (
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        <div className="space-y-2">
          {hours.map(hour => {
            const events = getEventsForHour(hour);
            
            return (
              <div
                key={hour}
                className="flex items-start gap-4 p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)]/50 cursor-pointer transition-colors rounded"
                onClick={() => {
                  setFormData({
                    ...formData,
                    startDate: dayStr,
                    endDate: dayStr,
                    startTime: `${String(hour).padStart(2, '0')}:00`,
                    endTime: `${String(hour + 1).padStart(2, '0')}:00`
                  });
                  setShowForm(true);
                }}
              >
                <div className="w-20 text-sm font-medium text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">
                  {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
                </div>
                <div className="flex-1 min-h-[60px]">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className="text-sm rounded px-2 py-1 mb-1 cursor-pointer text-white"
                      style={{ 
                        backgroundColor: event.source === 'google' 
                          ? (event.categoryColor || event.color || '#10b981')
                          : (event.categoryColor || theme.primary)
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setShowEventDetail(true);
                      }}
                    >
                      <span className="font-medium">{event.title}</span>
                      {event.leadName && <span className="ml-1 opacity-75">👤</span>}
                      <span className="text-xs ml-2 opacity-75">
                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const buttonClasses = {
    primary: `text-white transition-colors`,
    secondary: `bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)] transition-colors`,
    danger: `bg-[var(--t-error)] hover:bg-[var(--t-error-hover)] text-white transition-colors`
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Top Bar - Clean Layout */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-[var(--t-text)] dark:text-white">Calendar</h1>
        
        <div className="flex items-center gap-2">
          <GoogleCalendarConnect />
          
          {/* View Selector Popout */}
          <div className="relative">
            <button
              onClick={() => setShowViewSelector(!showViewSelector)}
              className="px-4 py-2 rounded-lg bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)] flex items-center gap-2"
            >
              <span>{currentView.charAt(0).toUpperCase() + currentView.slice(1)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showViewSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowViewSelector(false)} />
                <div className="absolute right-0 mt-2 w-32 z-50 rounded-xl border shadow-2xl bg-white dark:bg-[var(--t-surface-dim)]">
                  {['month', 'week', 'day'].map(view => (
                    <button
                      key={view}
                      onClick={() => {
                        setCurrentView(view);
                        setShowViewSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)] ${
                        currentView === view ? 'text-white' : ''
                      }`}
                      style={currentView === view ? { background: 'var(--t-primary)' } : {}}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Calendar Selector */}
          {isGoogleConnected && calendars.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCalendarSelector(!showCalendarSelector)}
                className="px-3 py-2 rounded-lg border border-[var(--t-border)] dark:border-[var(--t-border)] bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white text-sm flex items-center gap-2"
              >
                <span>{selectedCalendars.length} cal</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showCalendarSelector && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCalendarSelector(false)} />
                  <div className="absolute right-0 mt-2 w-64 z-50 rounded-xl border shadow-2xl bg-white dark:bg-[var(--t-surface-dim)]">
                    <div className="p-3 max-h-64 overflow-y-auto">
                      {calendars.map(cal => (
                        <label key={cal.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCalendars.includes(cal.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCalendars([...selectedCalendars, cal.id]);
                              } else {
                                setSelectedCalendars(selectedCalendars.filter(id => id !== cal.id));
                              }
                            }}
                            className="rounded border-[var(--t-border)]"
                          />
                          <span className="text-sm truncate flex-1">{cal.summary}</span>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.backgroundColor }} />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="px-3 py-2 rounded-lg border border-[var(--t-border)] dark:border-[var(--t-border)] bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white text-sm flex items-center gap-2"
              >
                <span>Filter</span>
                {selectedCategories.length > 0 && (
                  <span className="text-xs text-white px-1.5 rounded-full"
                    style={{ background: 'var(--t-primary)' }}
                  >
                    {selectedCategories.length}
                  </span>
                )}
              </button>
              
              {showCategoryFilter && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCategoryFilter(false)} />
                  <div className="absolute right-0 mt-2 w-48 z-50 rounded-xl border shadow-2xl bg-white dark:bg-[var(--t-surface-dim)]">
                    <div className="p-3">
                      <button
                        onClick={() => setSelectedCategories([])}
                        className="text-xs mb-2 hover:underline"
                        style={{ color: 'var(--t-primary)' }}
                      >
                        Clear all
                      </button>
                      {categories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, cat.id]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                              }
                            }}
                            className="rounded border-[var(--t-border)]"
                          />
                          <span className="text-sm truncate flex-1">{cat.name}</span>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Manage Categories Button */}
          <button
            onClick={() => setShowCategoryManager(true)}
            className="px-3 py-2 rounded-lg border border-[var(--t-border)] dark:border-[var(--t-border)] bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white text-sm"
          >
            Manage
          </button>

          {/* New Event Button */}
          <button
            onClick={() => {
              setEditingEvent(null);
              const today = new Date().toISOString().split('T')[0];
              setFormData({
                ...formData,
                startDate: today,
                endDate: today,
                startTime: '09:00',
                endTime: '10:00'
              });
              setShowForm(true);
            }}
            className="px-4 py-2 rounded-lg text-white"
            style={{ background: 'var(--t-primary)' }}
          >
            + New
          </button>

          {/* Notifications Toggle */}
          <button
            onClick={() => {
              setNotificationsEnabled(!notificationsEnabled);
              localStorage.setItem('calendarNotifications', (!notificationsEnabled).toString());
              if (!notificationsEnabled && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
            className={`px-3 py-2 rounded-lg text-sm ${
              notificationsEnabled 
                ? 'bg-[var(--t-success)] text-white hover:bg-[var(--t-success-hover)]' 
                : 'bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)]'
            }`}
            title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}
          >
            🔔
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigateView('prev')}
          className="px-4 py-2 bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] rounded-lg hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)] transition-colors"
        >
          ← Previous
        </button>
        <h2 className="text-xl font-semibold text-[var(--t-text)] dark:text-white">
          {getViewTitle()}
          {isLoading && <span className="ml-2 text-sm text-[var(--t-text-muted)]">(loading...)</span>}
        </h2>
        <button
          onClick={() => navigateView('next')}
          className="px-4 py-2 bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] rounded-lg hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)] transition-colors"
        >
          Next →
        </button>
      </div>

      <div className="bg-white dark:bg-[var(--t-surface-dim)] rounded-lg shadow-lg p-6 border border-[var(--t-border)] dark:border-[var(--t-border)]">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && renderWeekView()}
        {currentView === 'day' && renderDayView()}
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[var(--t-surface-dim)] rounded-lg p-6 max-w-md w-full border border-[var(--t-border)] dark:border-[var(--t-border)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--t-text)] dark:text-white">Manage Categories</h2>
              <button
                onClick={() => {
                  setShowCategoryManager(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryColor('#3b82f6');
                }}
                className="text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-3 bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] rounded-lg">
              <h3 className="text-sm font-medium mb-2">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded bg-white dark:bg-[var(--t-surface-dim)] text-[var(--t-text)] dark:text-white text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <button
                    onClick={editingCategory ? updateCategory : addCategory}
                    disabled={!newCategoryName.trim()}
                    className="flex-1 px-3 py-2 text-white rounded hover:opacity-90 disabled:opacity-50 text-sm"
                    style={{ background: 'var(--t-primary)' }}
                  >
                    {editingCategory ? 'Update' : 'Add'}
                  </button>
                  {editingCategory && (
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setNewCategoryColor('#3b82f6');
                      }}
                      className="px-3 py-2 bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface-subtle)] rounded hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-hover)] text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm text-[var(--t-text)] dark:text-white">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditCategory(cat)}
                      className="p-1 text-[var(--t-text-muted)] hover:opacity-80"
                      style={{ color: 'var(--t-primary)' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1 text-[var(--t-text-muted)] hover:text-[var(--t-error)]"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[var(--t-surface-dim)] rounded-lg p-6 max-w-md w-full border border-[var(--t-border)] dark:border-[var(--t-border)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--t-text)] dark:text-white">
                  {selectedEvent.title}
                </h2>
                <div className="flex gap-2 mt-1">
                  {selectedEvent.source === 'google' && (
                    <span className="text-xs text-[var(--t-success)]">📅 Google Calendar</span>
                  )}
                  {selectedEvent.categoryName && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: selectedEvent.categoryColor }}
                    >
                      {selectedEvent.categoryName}
                    </span>
                  )}
                  {selectedEvent.leadName && (
                    <span className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ background: 'var(--t-primary)' }}
                    >
                      👤 {selectedEvent.leadName}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowEventDetail(false)}
                className="text-[var(--t-text-muted)] hover:text-[var(--t-text)] dark:hover:text-[var(--t-text-muted)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)] mt-1">⏰</span>
                <div>
                  <p className="text-[var(--t-text)] dark:text-white font-medium">
                    {new Date(selectedEvent.start).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">
                    {new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(selectedEvent.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="flex items-start gap-3">
                  <span className="text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)] mt-1">📝</span>
                  <p className="text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--t-border)] dark:border-[var(--t-border)]">
                <button
                  onClick={() => editEvent(selectedEvent)}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: 'var(--t-primary)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteEvent(selectedEvent.id, selectedEvent.source, selectedEvent.googleId)}
                  className="px-4 py-2 bgfrom-[var(--t-primary)] to-[var(--t-secondary)]xt-white rounded-lg hover:bg-[var(--t-error)] transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowEventDetail(false)}
                  className="px-4 py-2 bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] rounded-lg hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[var(--t-surface-dim)] rounded-lg p-6 max-w-md w-full border border-[var(--t-border)] dark:border-[var(--t-border)]">
            <h2 className="text-xl font-semibold mb-4 text-[var(--t-text)] dark:text-white">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white focus:outline-none focus:ring-2"
                  style={{ 
                    // @ts-expect-error custom prop
                    '--tw-ring-color': 'var(--t-primary-dim)' 
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                />
              </div>
              
              {/* Categories - Always visible */}
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Lead Assignment - Always visible */}
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--t-text)] dark:text-[var(--t-text-muted)]">
                  Link to Lead (Optional)
                </label>
                <select
                  value={formData.leadId}
                  onChange={(e) => setFormData({...formData, leadId: e.target.value})}
                  className="w-full p-2 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg bg-white dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-white"
                >
                  <option value="">None</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-[var(--t-surface-dim)] dark:bg-[var(--t-surface)] text-[var(--t-text)] dark:text-[var(--t-text-muted)] rounded-lg hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface-subtle)] transition-colors"
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

      {/* Upcoming Events List */}
      <div className="mt-8 bg-white dark:bg-[var(--t-surface-dim)] rounded-lg shadow-lg p-6 border border-[var(--t-border)] dark:border-[var(--t-border)]">
        <h2 className="text-xl font-semibold mb-4 text-[var(--t-text)] dark:text-white">
          Upcoming Events
          {isGoogleConnected && <span className="ml-2 text-xs text-[var(--t-success)]">(Google Calendar synced)</span>}
        </h2>
        <div className="space-y-2">
          {filteredEvents.length === 0 ? (
            <p className="text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">No upcoming events</p>
          ) : (
            filteredEvents
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .slice(0, 10)
              .map(event => (
                <div key={event.id} className="p-3 border border-[var(--t-border)] dark:border-[var(--t-border)] rounded-lg hover:bg-[var(--t-surface-dim)] dark:hover:bg-[var(--t-surface)]/50 transition-colors cursor-pointer"
                     onClick={() => {
                       setSelectedEvent(event);
                       setShowEventDetail(true);
                     }}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: event.categoryColor || event.color || theme.primary }} />
                    <div>
                      <div className="font-semibold text-[var(--t-text)] dark:text-white">
                        {event.title}
                        {event.source === 'google' && <span className="ml-2 text-xs text-[var(--t-success)]">📅 Google</span>}
                        {event.categoryName && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full text-white" 
                                style={{ backgroundColor: event.categoryColor }}>
                            {event.categoryName}
                          </span>
                        )}
                        {event.leadName && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full text-white" 
                                style={{ backgroundColor: 'var(--t-primary)' }}>
                            👤 {event.leadName}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">
                        {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                      </div>
                      <div className="text-sm mt-1 text-[var(--t-text-muted)] dark:text-[var(--t-text-muted)]">{event.description}</div>
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

export default Calendar;