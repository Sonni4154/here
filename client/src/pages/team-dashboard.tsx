import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Phone, Mail } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import WorkChecklist from './work-checklist';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  calendar: string;
  assignee?: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  notes?: Array<{
    id: string;
    date: string;
    technician: string;
    content: string;
  }>;
}

const CALENDAR_COLORS = {
  'Insect Control / Sprays': '#10B981',
  'Rodent Control': '#F59E0B',
  'Maintenance': '#3B82F6',
  'Exclusion Work': '#8B5CF6',
  'Default': '#6B7280'
};

export default function TeamDashboard() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showChecklist, setShowChecklist] = useState<string | null>(null);
  
  // Generate week dates
  const weekStart = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate time slots from 7 AM to 8 PM
  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 7);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/calendar/events', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?week=${format(weekStart, 'yyyy-MM-dd')}`);
      return response.json();
    }
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['/api/calendar/my-tasks', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/my-tasks`);
      return response.json();
    },
    enabled: !!user
  });

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    return events.filter((event: CalendarEvent) => {
      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(day);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return eventStart < slotEnd && eventEnd > slotStart && isSameDay(eventStart, day);
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Here's your team schedule and work queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentWeek(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-1">
            {/* Time column header */}
            <div className="p-2 text-center font-medium">Time</div>
            {/* Day headers */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-2 text-center font-medium border-b">
                <div>{format(day, 'EEE')}</div>
                <div className={`text-sm ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : 'text-muted-foreground'}`}>
                  {format(day, 'MMM d')}
                </div>
              </div>
            ))}

            {/* Time slots */}
            {timeSlots.map((hour) => (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="p-2 text-sm text-muted-foreground text-right border-r">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                </div>
                {/* Day columns */}
                {weekDays.map((day) => {
                  const dayEvents = getEventsForTimeSlot(day, hour);
                  return (
                    <div key={`${day.toISOString()}-${hour}`} className="min-h-16 p-1 border border-border/50 hover:bg-muted/50">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-2 rounded cursor-pointer mb-1 truncate"
                          style={{ backgroundColor: CALENDAR_COLORS[event.calendar] || CALENDAR_COLORS.Default }}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="text-white font-medium">{event.title}</div>
                          {event.assignee && (
                            <div className="text-white/90">{event.assignee}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Work Queue */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              My Work Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No tasks assigned for today
              </p>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task: CalendarEvent) => (
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{task.title}</h3>
                      <Badge variant="outline" style={{ borderColor: CALENDAR_COLORS[task.calendar] }}>
                        {task.calendar}
                      </Badge>
                    </div>
                    
                    {task.customer && (
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{task.customer.address}</span>
                        </div>
                        {task.customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{task.customer.phone}</span>
                          </div>
                        )}
                        {task.customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{task.customer.email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {format(parseISO(task.start), 'h:mm a')} - {format(parseISO(task.end), 'h:mm a')}
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => setShowChecklist(task.id)}
                        variant="outline"
                      >
                        Start Work
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(CALENDAR_COLORS).filter(([name]) => name !== 'Default').map(([name, color]) => (
                <div key={name} className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Detail Modal - Will implement detailed work checklist here */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedEvent.title}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedEvent(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Event Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Time:</strong> {format(parseISO(selectedEvent.start), 'h:mm a')} - {format(parseISO(selectedEvent.end), 'h:mm a')}</p>
                    <p><strong>Calendar:</strong> {selectedEvent.calendar}</p>
                    {selectedEvent.assignee && <p><strong>Assignee:</strong> {selectedEvent.assignee}</p>}
                    {selectedEvent.location && <p><strong>Location:</strong> {selectedEvent.location}</p>}
                  </div>
                </div>

                {selectedEvent.customer && (
                  <div>
                    <h4 className="font-semibold mb-2">Customer Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedEvent.customer.name}</p>
                      {selectedEvent.customer.address && <p><strong>Address:</strong> {selectedEvent.customer.address}</p>}
                      {selectedEvent.customer.phone && <p><strong>Phone:</strong> {selectedEvent.customer.phone}</p>}
                      {selectedEvent.customer.email && <p><strong>Email:</strong> {selectedEvent.customer.email}</p>}
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}

                {/* Notes section */}
                <div>
                  <h4 className="font-semibold mb-2">Technician Notes</h4>
                  {selectedEvent.notes && selectedEvent.notes.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEvent.notes.map((note) => (
                        <div key={note.id} className="bg-muted p-2 rounded text-sm">
                          <div className="font-medium">{note.date}: {note.technician}:</div>
                          <div>{note.content}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes yet</p>
                  )}
                  <Button size="sm" className="mt-2" variant="outline">
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work Checklist Modal */}
      {showChecklist && (
        <WorkChecklist
          eventId={showChecklist}
          onComplete={() => {
            setShowChecklist(null);
            // Refresh tasks
          }}
          onClose={() => setShowChecklist(null)}
        />
      )}
    </div>
  );
}