// src/pages/Calendar.tsx
import { useState, useEffect } from 'react';
import './Calendar.css'; // We'll create this next

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  description: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('calendarEvents');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        title: 'Sample Event',
        start: '2026-03-15T10:00',
        end: '2026-03-15T12:00',
        description: 'This is a sample event'
      },
      {
        id: 2,
        title: 'Another Event',
        start: '2026-03-16T14:00',
        end: '2026-03-16T15:30',
        description: 'Another test event'
      }
    ];
  });

  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1));
  const [currentView, setCurrentView] = useState('month');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: ''
  });

  useEffect(() => {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
  }, [events]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEvent = {
      id: editingEvent?.id || Date.now(),
      title: formData.title,
      start: `${formData.startDate}T${formData.startTime}`,
      end: `${formData.endDate}T${formData.endTime}`,
      description: formData.description
    };

    if (editingEvent) {
      setEvents(events.map(e => e.id === editingEvent.id ? newEvent : e));
    } else {
      setEvents([...events, newEvent]);
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
      startTime: event.start.split('T')[1].slice(0, 5),
      endDate: event.end.split('T')[0],
      endTime: event.end.split('T')[1].slice(0, 5),
      description: event.description
    });
    setShowForm(true);
  };

  const deleteEvent = (id: number) => {
    if (confirm('Are you sure?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const renderMonthView = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDay = firstDay.getDay();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const days = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Add day headers
    days.push(
      <div key="header" className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center font-semibold py-2">{day}</div>
        ))}
      </div>
    );
    
    // Create calendar grid
    const cells = [];
    
    // Add empty cells
    for (let i = 0; i < startingDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 p-1 bg-gray-50 text-gray-400 border"></div>);
    }
    
    // Add days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.start.startsWith(dateStr));
      
      cells.push(
        <div 
          key={day} 
          className="h-24 p-1 border hover:bg-blue-50 cursor-pointer overflow-y-auto"
          onClick={() => {
            setFormData({...formData, startDate: dateStr, endDate: dateStr});
            setShowForm(true);
          }}
        >
          <div className="font-medium">{day}</div>
          {dayEvents.map(event => (
            <div 
              key={event.id}
              className="text-xs bg-blue-500 text-white rounded px-1 mt-1 truncate"
              onClick={(e) => {
                e.stopPropagation();
                editEvent(event);
              }}
            >
              {event.title}
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← Previous
          </button>
          <h2 className="text-2xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Calendar</h1>
        <div className="space-x-2">
          <button 
            onClick={() => { setCurrentView('month'); setShowForm(false); }}
            className={`px-4 py-2 rounded ${currentView === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Month
          </button>
          <button 
            onClick={() => { setCurrentView('week'); setShowForm(false); }}
            className={`px-4 py-2 rounded ${currentView === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Week
          </button>
          <button 
            onClick={() => { setCurrentView('day'); setShowForm(false); }}
            className={`px-4 py-2 rounded ${currentView === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Day
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            + New Event
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {currentView === 'month' && renderMonthView()}
        {currentView === 'week' && <div>Week view coming soon...</div>}
        {currentView === 'day' && <div>Day view coming soon...</div>}
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-gray-500">No upcoming events</p>
          ) : (
            events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(event => (
                <div key={event.id} className="p-3 border rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{event.title}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                      </div>
                      <div className="text-sm mt-1">{event.description}</div>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => editEvent(event)}
                        className="px-2 py-1 bg-blue-500 text-white text-sm rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="px-2 py-1 bg-red-500 text-white text-sm rounded"
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