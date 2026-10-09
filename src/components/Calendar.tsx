import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Clock, 
    Trash2, 
    CalendarDays,
    X,
    User
} from 'lucide-react';

interface CalendarProps {
    socket: any;
    channel: string;
    username: string;
}

export default function Calendar({ socket, channel, username }: CalendarProps) {
    const [events, setEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const [showModal, setShowModal] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDesc, setEventDesc] = useState('');
    const [eventTime, setEventTime] = useState('12:00');

    useEffect(() => {
        if (!socket) return;

        socket.emit('get_events', { channel });

        const onEventsList = (data: any) => {
            setEvents(data.events || []);
        };

        const onEventCreated = (event: any) => {
            if (event.channel === channel) {
                setEvents(prev => [...prev, event]);
            }
        };

        const onEventDeleted = (data: any) => {
            setEvents(prev => prev.filter(evt => evt.id !== data.id));
        };

        socket.on('calendar_events_list', onEventsList);
        socket.on('event_created', onEventCreated);
        socket.on('event_deleted', onEventDeleted);

        return () => {
            socket.off('calendar_events_list', onEventsList);
            socket.off('event_created', onEventCreated);
            socket.off('event_deleted', onEventDeleted);
        };
    }, [socket, channel]);

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

    const dayEvents = useMemo(() => {
        return events.filter(evt => {
            const evtDate = new Date(evt.startTime);
            return evtDate.getFullYear() === selectedDate.getFullYear() &&
                   evtDate.getMonth() === selectedDate.getMonth() &&
                   evtDate.getDate() === selectedDate.getDate();
        });
    }, [events, selectedDate]);

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

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle.trim()) return;

        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const isoStart = `${dateStr}T${eventTime}:00`;

        socket?.emit('create_event', {
            title: eventTitle.trim(),
            description: eventDesc.trim(),
            startTime: isoStart,
            endTime: '',
            creator: username,
            channel
        });

        setEventTitle('');
        setEventDesc('');
        setShowModal(false);
    };

    const handleDeleteEvent = (id: any) => {
        if (window.confirm('Delete this event?')) {
            socket?.emit('delete_event', { id, channel });
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-200 p-5 overflow-hidden select-none">
            <div className="flex flex-1 gap-5 overflow-hidden">
                {/* Left Month Calendar Canvas */}
                <div className="flex-1 bg-[#0c101a] border border-white/[0.08] rounded-xl p-5 shadow-2xl flex flex-col overflow-hidden">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                                <CalendarDays size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-100">
                                    {monthNames[month]} {year}
                                </h2>
                                <span className="text-[10px] font-mono text-slate-400">
                                    #{channel} Shared Timeline
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button 
                                onClick={handlePrevMonth}
                                className="btn-secondary p-1.5 rounded-lg text-slate-300 cursor-pointer"
                                title="Previous Month"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className="btn-secondary px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                            >
                                Today
                            </button>
                            <button 
                                onClick={handleNextMonth}
                                className="btn-secondary p-1.5 rounded-lg text-slate-300 cursor-pointer"
                                title="Next Month"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* 7-Column Weekdays Header Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs font-semibold text-slate-400 mb-2 py-1.5 bg-white/[0.02] rounded-xl border border-white/5">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                    </div>

                    {/* 7-Column Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5 flex-1 overflow-y-auto custom-scrollbar p-0.5">
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-2 rounded-xl bg-transparent" />
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isSelected = selectedDate.getDate() === day &&
                                               selectedDate.getMonth() === month &&
                                               selectedDate.getFullYear() === year;
                            const isToday = new Date().getDate() === day &&
                                            new Date().getMonth() === month &&
                                            new Date().getFullYear() === year;
                            const hasEvents = daysWithEvents.has(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(new Date(year, month, day))}
                                    className={`relative p-2.5 rounded-xl flex flex-col items-center justify-between border transition-all cursor-pointer group ${
                                        isSelected 
                                            ? 'bg-sky-500/20 border-sky-500/50 text-white shadow-lg shadow-sky-500/10 font-bold' 
                                            : isToday 
                                                ? 'bg-white/[0.06] border-sky-400/30 text-sky-300 font-bold' 
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300 hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <span className="text-xs">{day}</span>
                                    {hasEvents && (
                                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                                            isSelected ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-emerald-400'
                                        }`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Events & Add Form Panel */}
                <div className="w-80 bg-[#0c101a] border border-white/[0.08] rounded-xl p-5 shadow-2xl flex flex-col shrink-0 overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4 shrink-0">
                        <div>
                            <h3 className="font-bold text-xs text-slate-100">Scheduled Events</h3>
                            <p className="text-[11px] font-mono text-sky-400">{selectedDate.toDateString()}</p>
                        </div>
                        <button 
                            onClick={() => setShowModal(!showModal)}
                            className="btn-shimmer p-1.5 rounded-lg flex items-center justify-center cursor-pointer shadow-sm"
                            title="Add Event"
                        >
                            <Plus size={15} />
                        </button>
                    </div>

                    {showModal && (
                        <form onSubmit={handleAddEvent} className="mb-4 bg-[#101522] border border-white/10 rounded-xl p-3 space-y-2.5 shadow-inner">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                                <span>New Event</span>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                                    <X size={14} />
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Event title..."
                                value={eventTitle}
                                onChange={e => setEventTitle(e.target.value)}
                                className="w-full bg-[#161d2d] border border-white/10 focus:border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                                autoFocus
                            />
                            <input
                                type="time"
                                value={eventTime}
                                onChange={e => setEventTime(e.target.value)}
                                className="w-full bg-[#161d2d] border border-white/10 focus:border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                            />
                            <button 
                                type="submit" 
                                className="btn-shimmer w-full text-xs font-semibold py-1.5 rounded-lg cursor-pointer"
                            >
                                Save Event
                            </button>
                        </form>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
                        {dayEvents.length === 0 ? (
                            <div className="text-xs text-slate-500 italic text-center py-10 bg-white/[0.02] rounded-xl border border-white/5">
                                No events for this date.
                            </div>
                        ) : (
                            dayEvents.map(evt => {
                                const evtTime = new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div 
                                        key={evt.id} 
                                        className="spotlight-card rounded-xl p-3 border border-white/[0.06] hover:border-sky-500/30 flex items-start justify-between group transition-all"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-xs text-slate-100 truncate">{evt.title}</h4>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
                                                <Clock size={11} className="text-sky-400" />
                                                <span>{evtTime}</span>
                                                <span>•</span>
                                                <span className="text-slate-300">@{evt.creator}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteEvent(evt.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all rounded hover:bg-rose-500/10 cursor-pointer"
                                            title="Delete event"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
