import React, { useState, useEffect, useMemo } from 'react';

export default function Calendar({ socket, channel, username }) {
    const [events, setEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventTime, setEventTime] = useState('12:00');

    useEffect(() => {
        if (!socket) return;

        // Fetch channel calendar events
        socket.emit('get_events', { channel });

        socket.on('calendar_events_list', (data) => {
            setEvents(data.events || []);
        });

        socket.on('event_created', (event) => {
            if (event.channel === channel) {
                setEvents(prev => [...prev, event]);
            }
        });

        socket.on('event_deleted', (data) => {
            setEvents(prev => prev.filter(evt => evt.id !== data.id));
        });

        return () => {
            socket.off('calendar_events_list');
            socket.off('event_created');
            socket.off('event_deleted');
        };
    }, [socket, channel]);

    // Helpers to build month layout
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Filter events scheduled on the selected day
    const dayEvents = useMemo(() => {
        return events.filter(evt => {
            const evtDate = new Date(evt.startTime);
            return evtDate.getFullYear() === selectedDate.getFullYear() &&
                   evtDate.getMonth() === selectedDate.getMonth() &&
                   evtDate.getDate() === selectedDate.getDate();
        });
    }, [events, selectedDate]);

    // Track which days in the current month have events
    const daysWithEvents = useMemo(() => {
        const markedDays = new Set();
        events.forEach(evt => {
            const d = new Date(evt.startTime);
            if (d.getFullYear() === year && d.getMonth() === month) {
                markedDays.add(d.getDate());
            }
        });
        return markedDays;
    }, [events, year, month]);

    const handleAddEvent = (e) => {
        e.preventDefault();
        if (!eventTitle.trim()) return;

        // Construct ISO start time
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const isoStart = `${dateStr}T${eventTime}:00`;

        socket.emit('create_event', {
            title: eventTitle,
            description: eventDesc,
            startTime: isoStart,
            endTime: '',
            creator: username,
            channel
        });

        // Reset and close
        setEventTitle('');
        setEventDesc('');
        setEventTime('12:00');
        setShowModal(false);
    };

    const handleDeleteEvent = (id) => {
        socket.emit('delete_event', { id, channel });
    };

    // Render calendar days list
    const calendarDays = [];
    // Pad empty slots before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    // Days numbers
    for (let day = 1; day <= daysInMonth; day++) {
        const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
        const hasEvent = daysWithEvents.has(day);
        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

        calendarDays.push(
            <div 
                key={day} 
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
            >
                <span className="day-number">{day}</span>
                {hasEvent && <span className="event-dot"></span>}
            </div>
        );
    }

    return (
        <div className="calendar-container">
            <div className="calendar-workspace">
                {/* Left Side: Calendar Grid */}
                <div className="calendar-grid-box">
                    <div className="calendar-grid-header">
                        <button onClick={handlePrevMonth} className="month-nav-btn">◀</button>
                        <h2>{monthNames[month]} {year}</h2>
                        <button onClick={handleNextMonth} className="month-nav-btn">▶</button>
                    </div>
                    <div className="calendar-weekdays">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div className="calendar-days-grid">
                        {calendarDays}
                    </div>
                </div>

                {/* Right Side: Date Detail Events List */}
                <div className="calendar-events-detail">
                    <div className="detail-header">
                        <h3>Events: {selectedDate.toDateString()}</h3>
                        <button onClick={() => setShowModal(true)} className="add-event-fab">
                            + Add Event
                        </button>
                    </div>

                    <div className="detail-events-list">
                        {dayEvents.length === 0 ? (
                            <div className="empty-day-events">No events scheduled for this day. Click "+ Add Event" to schedule.</div>
                        ) : (
                            dayEvents.map(evt => (
                                <div key={evt.id} className="calendar-event-card">
                                    <div className="event-card-header">
                                        <h4>{evt.title}</h4>
                                        <button onClick={() => handleDeleteEvent(evt.id)} className="delete-event-btn" title="Delete event">
                                            🗑️
                                        </button>
                                    </div>
                                    {evt.description && <p className="event-card-desc">{evt.description}</p>}
                                    <div className="event-card-meta">
                                        <span>⏰ {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>👤 {evt.creator}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Event Form Modal */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content add-event-modal">
                        <div className="modal-header">
                            <h3>Schedule Event</h3>
                            <button onClick={() => setShowModal(false)} className="close-modal-btn">&times;</button>
                        </div>
                        <form onSubmit={handleAddEvent} className="event-form">
                            <div className="form-group">
                                <label>Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={eventTitle}
                                    onChange={e => setEventTitle(e.target.value)}
                                    placeholder="Event title..."
                                    maxLength={100}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    value={eventDesc}
                                    onChange={e => setEventDesc(e.target.value)}
                                    placeholder="Add description (optional)..."
                                    maxLength={300}
                                />
                            </div>
                            <div className="form-group">
                                <label>Time *</label>
                                <input 
                                    type="time" 
                                    required 
                                    value={eventTime}
                                    onChange={e => setEventTime(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
