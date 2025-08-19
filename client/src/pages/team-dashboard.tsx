import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, CheckCircle2, XCircle, DollarSign, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import InsectControlChecklist from '../components/insect-control-checklist';

// Calendar configurations from Google Calendar data
const CALENDAR_CONFIGS = [
  {
    id: '57d4687457176ca4e4b211910e7a69c19369d08081871d9f8ab54d234114c991@group.calendar.google.com',
    name: 'Insect Control / Sprays',
    color: '#4CAF50', // Green
    description: 'Insect spray treatments and pest control services'
  },
  {
    id: '3fc1d11fe5330c3e1c4693570419393a1d74036ef1b4cb866dd337f8c8cc6c8e@group.calendar.google.com', 
    name: 'Rodent Control',
    color: '#FF9800', // Orange
    description: 'Exclusion, remediation and insulation work'
  },
  {
    id: '64a3c24910c43703e539ab1e9ac41df6591995c63c1e4f208f76575a50149610@group.calendar.google.com',
    name: 'Termites',
    color: '#F44336', // Red
    description: 'Termite prevention and treatment services'
  },
  {
    id: '529c43e689235b82258319c30e7449e97c8788cb01cd924e0f4d0b4c34305cdb@group.calendar.google.com',
    name: 'Trap Check',
    color: '#2196F3', // Blue
    description: 'Non-billable trap and bait station checks'
  },
  {
    id: 'c81f827b8eeec1453d1f3d90c7bca859a1d342953680c4a0448e6b0b96b8bb4a@group.calendar.google.com',
    name: 'Inspections',
    color: '#9C27B0', // Purple
    description: 'Property inspections and assessments'
  },
  {
    id: '97180df5c9275973f1c51e234ec36de62c401860313b0b734704f070e5acf411@group.calendar.google.com',
    name: 'Tradework',
    color: '#795548', // Brown
    description: 'General trade and construction work'
  }
];

const HOURS_OF_DAY = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 8pm

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  calendar: string;
  customer?: {
    name: string;
    phone?: string;
    address?: string;
  };
  technician?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  serviceType?: string;
  notes?: string;
}

interface WorkQueueItem {
  id: string;
  customer: string;
  address: string;
  phone?: string;
  serviceType: string;
  scheduledTime: string;
  arrivalWindow: string;
  technician: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  estimatedDuration: number;
  specialInstructions?: string;
}

export default function TeamDashboard() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'queue'>('calendar');

  // Fetch calendar events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/calendar/events', format(currentWeek, 'yyyy-MM-dd')],
    queryFn: () => fetch(`/api/calendar/events?week=${format(currentWeek, 'yyyy-MM-dd')}`).then(r => r.json()),
  });

  // Fetch work queue
  const { data: workQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['/api/work-queue'],
    queryFn: () => fetch('/api/work-queue').then(r => r.json()),
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToCurrentWeek = () => setCurrentWeek(new Date());

  const getEventsForDay = (day: Date) => {
    return events.filter((event: CalendarEvent) => 
      isSameDay(parseISO(event.start), day)
    );
  };

  const getCalendarConfig = (calendarId: string) => {
    return CALENDAR_CONFIGS.find(config => config.id === calendarId) || CALENDAR_CONFIGS[0];
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    if (event.serviceType === 'Insect Control' || event.title.toLowerCase().includes('spray')) {
      setShowChecklist(true);
    }
  };

  const getNextJob = () => {
    const now = new Date();
    const upcomingJobs = workQueue
      .filter((job: WorkQueueItem) => job.status === 'pending' && new Date(job.scheduledTime) > now)
      .sort((a: WorkQueueItem, b: WorkQueueItem) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );
    return upcomingJobs[0] || null;
  };

  const getMinutesUntilJob = (scheduledTime: string) => {
    const now = new Date();
    const jobTime = new Date(scheduledTime);
    return Math.max(0, Math.floor((jobTime.getTime() - now.getTime()) / 60000));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Team Dashboard</h1>
            <p className="text-purple-200">Real-time Google Calendar integration and work queue management</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant={activeTab === 'calendar' ? 'default' : 'outline'}
              onClick={() => setActiveTab('calendar')}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              Calendar View
            </Button>
            <Button 
              variant={activeTab === 'queue' ? 'default' : 'outline'}
              onClick={() => setActiveTab('queue')}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              Work Queue
            </Button>
          </div>
        </div>

        {/* Calendar Legend */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Service Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {CALENDAR_CONFIGS.map((config) => (
                <div key={config.id} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: config.color }}
                  />
                  <div className="text-white text-sm">
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-purple-200">{config.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeTab === 'calendar' && (
          <>
            {/* Week Navigation */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={goToPreviousWeek}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous Week
                  </Button>
                  
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-white">
                      {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToCurrentWeek}
                      className="mt-2 bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      Today
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={goToNextWeek}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    Next Week
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Grid */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-0">
                {eventsLoading ? (
                  <div className="p-8 text-center text-white">Loading calendar events...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                      {/* Header Row */}
                      <div className="grid grid-cols-8 border-b border-white/20">
                        <div className="p-3 text-center font-medium text-white bg-white/5">Time</div>
                        {weekDays.map((day) => (
                          <div key={day.toISOString()} className="p-3 text-center border-l border-white/20">
                            <div className="text-white font-medium">
                              {format(day, 'EEE')}
                            </div>
                            <div className="text-purple-200 text-sm">
                              {format(day, 'MMM d')}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Time Rows */}
                      {HOURS_OF_DAY.map((hour) => (
                        <div key={hour} className="grid grid-cols-8 border-b border-white/10 min-h-[60px]">
                          <div className="p-3 text-center font-medium text-white bg-white/5 border-r border-white/20">
                            {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
                          </div>
                          {weekDays.map((day) => {
                            const dayEvents = getEventsForDay(day).filter((event: CalendarEvent) => {
                              const eventHour = new Date(event.start).getHours();
                              return eventHour === hour;
                            });
                            
                            return (
                              <div key={`${day}-${hour}`} className="border-l border-white/10 p-1 relative">
                                {dayEvents.map((event: CalendarEvent) => {
                                  const config = getCalendarConfig(event.calendar);
                                  const startTime = new Date(event.start);
                                  const endTime = new Date(event.end);
                                  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
                                  const height = Math.max(40, (duration / 60) * 60); // 60px per hour
                                  
                                  return (
                                    <div
                                      key={event.id}
                                      className="absolute left-1 right-1 rounded p-2 text-xs text-white cursor-pointer hover:shadow-lg transition-all"
                                      style={{ 
                                        backgroundColor: config.color,
                                        height: `${height}px`,
                                        zIndex: 10
                                      }}
                                      onClick={() => handleEventClick(event)}
                                    >
                                      <div className="font-medium truncate">{event.title}</div>
                                      <div className="text-xs opacity-90">
                                        {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                      </div>
                                      {event.customer && (
                                        <div className="text-xs opacity-80 truncate">
                                          {event.customer.name}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'queue' && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Work Queue - Technician Tasks</CardTitle>
              <CardDescription className="text-purple-200">
                Upcoming jobs and service appointments organized by priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="text-center text-white py-8">Loading work queue...</div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {workQueue.map((job: WorkQueueItem) => {
                      const minutesUntil = getMinutesUntilJob(job.scheduledTime);
                      const isPriority = job.priority === 'high';
                      const isNext = job.id === getNextJob()?.id;
                      
                      return (
                        <Card 
                          key={job.id} 
                          className={`${
                            isNext ? 'ring-2 ring-yellow-400 bg-yellow-50/10' : 'bg-white/5'
                          } border-white/20 transition-all hover:bg-white/10`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-white">{job.customer}</h3>
                                {isNext && (
                                  <Badge className="bg-yellow-500 text-black font-medium">
                                    Next Job
                                  </Badge>
                                )}
                                {isPriority && (
                                  <Badge variant="destructive">High Priority</Badge>
                                )}
                                <Badge 
                                  variant="outline" 
                                  className="border-white/30 text-white"
                                >
                                  {job.serviceType}
                                </Badge>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {format(new Date(job.scheduledTime), 'h:mm a')}
                                </div>
                                {minutesUntil > 0 && (
                                  <div className="text-sm text-purple-200">
                                    in {minutesUntil} minutes
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center text-purple-200">
                                <MapPin className="w-4 h-4 mr-2" />
                                {job.address}
                              </div>
                              
                              {job.phone && (
                                <div className="flex items-center text-purple-200">
                                  <Phone className="w-4 h-4 mr-2" />
                                  {job.phone}
                                </div>
                              )}
                              
                              <div className="flex items-center text-purple-200">
                                <User className="w-4 h-4 mr-2" />
                                {job.technician}
                              </div>
                            </div>

                            {job.specialInstructions && (
                              <div className="mt-3 p-3 bg-white/10 rounded-lg">
                                <div className="flex items-start text-purple-200">
                                  <FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{job.specialInstructions}</span>
                                </div>
                              </div>
                            )}

                            <div className="mt-4 flex justify-between items-center">
                              <div className="flex items-center space-x-4 text-sm text-purple-200">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {job.estimatedDuration}min
                                </div>
                                <div>{job.arrivalWindow}</div>
                              </div>
                              
                              <div className="flex space-x-2">
                                {job.serviceType === 'Insect Control' && (
                                  <Button 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEvent({
                                        id: job.id,
                                        title: `${job.serviceType} - ${job.customer}`,
                                        start: job.scheduledTime,
                                        end: new Date(new Date(job.scheduledTime).getTime() + job.estimatedDuration * 60000).toISOString(),
                                        calendar: CALENDAR_CONFIGS[0].id,
                                        customer: {
                                          name: job.customer,
                                          phone: job.phone,
                                          address: job.address
                                        },
                                        technician: job.technician,
                                        serviceType: job.serviceType
                                      });
                                      setShowChecklist(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Start Service
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-white/30 text-white hover:bg-white/10"
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Insect Control Service Checklist Modal */}
      {showChecklist && selectedEvent && (
        <InsectControlChecklist
          event={selectedEvent}
          onClose={() => {
            setShowChecklist(false);
            setSelectedEvent(null);
          }}
          onComplete={(data) => {
            console.log('Service completed:', data);
            // Update event status and move to next job
            setShowChecklist(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}