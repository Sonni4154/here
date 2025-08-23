import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Phone, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  timestamp?: string;
  required?: boolean;
  dependsOn?: string[];
  formFields?: Array<{
    type: 'text' | 'number' | 'select' | 'textarea';
    label: string;
    options?: string[];
    required?: boolean;
  }>;
}

interface WorkEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  calendar: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  checklist: ChecklistItem[];
  formData: Record<string, any>;
  completed: boolean;
}

const INSECT_CONTROL_CHECKLIST: Omit<ChecklistItem, 'id' | 'completed' | 'timestamp'>[] = [
  {
    text: "Called your customer and confirmed appointment as well as arrival time.",
    required: true
  },
  {
    text: "Made contact with customer, provided a business card and walked the customer through today's service.",
    required: true
  },
  {
    text: "Children and Dogs have been put inside and I indicated to the customer that I am going to begin the spray.",
    required: true
  },
  {
    text: "Completed exterior perimeter spray.",
    required: true
  },
  {
    text: "Completed interior perimeter spray.",
    required: false,
    formFields: [{
      type: 'select',
      label: 'If not completed, reason:',
      options: ['Customer Declined', 'No Access/Door Locked', 'Other'],
      required: false
    }, {
      type: 'textarea',
      label: 'If Other, explain:',
      required: false
    }]
  },
  {
    text: "Walked the customer through the job and asked if there was any additional problem areas. Explained respray policy.",
    required: true,
    dependsOn: ['4'] // Depends on exterior spray
  },
  {
    text: "Price of treatment indicated",
    required: true,
    formFields: [{
      type: 'number',
      label: 'Treatment price ($)',
      required: true
    }]
  },
  {
    text: "Verbally explained respray policy and/or provided copy to customer",
    required: true
  },
  {
    text: "Payment received",
    required: true,
    formFields: [{
      type: 'number',
      label: 'Payment amount ($)',
      required: true
    }, {
      type: 'select',
      label: 'Payment method',
      options: ['Cash', 'Check', 'Credit Card', 'Call to Office', 'Invoice Approved By Spencer'],
      required: true
    }, {
      type: 'textarea',
      label: 'If no payment or $0, explain reason and request override:',
      required: false
    }]
  },
  {
    text: "All equipment, trash, tools and materials removed. Doors, hatches, gates closed and locked. Customer walked through service.",
    required: true
  },
  {
    text: "Areas treated documented",
    required: true,
    formFields: [{
      type: 'select',
      label: 'Areas treated (multiple selection)',
      options: ['Exterior Perimeter', 'Exterior Yard', 'Interior Perimeter', 'Interior Area Coverage', 'Crawlspace', 'Attic', 'Roof', 'Other'],
      required: true
    }, {
      type: 'text',
      label: 'If Other, specify:',
      required: false
    }]
  },
  {
    text: "Job completion declaration",
    required: true,
    formFields: [{
      type: 'text',
      label: 'Technician name',
      required: true
    }]
  }
];

interface WorkChecklistProps {
  eventId: string;
  onComplete: () => void;
  onClose: () => void;
}

export default function WorkChecklist({ eventId, onComplete, onClose }: WorkChecklistProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [event, setEvent] = useState<WorkEvent | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    // Load event data and initialize checklist
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`);
      const eventData = await response.json();
      
      // Initialize checklist based on calendar type
      let initialChecklist = [];
      if (eventData.calendar === 'Insect Control / Sprays') {
        initialChecklist = INSECT_CONTROL_CHECKLIST.map((item, index) => ({
          ...item,
          id: index.toString(),
          completed: false,
          timestamp: undefined
        }));
      }

      setEvent(eventData);
      setChecklist(eventData.checklist || initialChecklist);
      setFormData(eventData.formData || {});
    } catch (error) {
      toast({
        title: "Error loading event",
        description: "Could not load event details",
        variant: "destructive"
      });
    }
  };

  const updateChecklistMutation = useMutation({
    mutationFn: async (updates: { checklist: ChecklistItem[], formData: Record<string, any> }) => {
      return apiRequest(`/api/calendar/events/${eventId}/checklist`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/my-tasks'] });
    }
  });

  const completeJobMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/calendar/events/${eventId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          completed: true, 
          completedBy: user?.firstName + ' ' + user?.lastName,
          completedAt: new Date().toISOString()
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Job completed!",
        description: "The job has been marked as complete"
      });
      onComplete();
    }
  });

  const handleChecklistChange = (itemId: string, completed: boolean) => {
    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          completed,
          timestamp: completed ? new Date().toISOString() : undefined
        };
      }
      return item;
    });

    setChecklist(updatedChecklist);
    updateChecklistMutation.mutate({ checklist: updatedChecklist, formData });
  };

  const handleFormDataChange = (field: string, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);
    updateChecklistMutation.mutate({ checklist, formData: updatedFormData });
  };

  const isItemAvailable = (item: ChecklistItem) => {
    if (!item.dependsOn) return true;
    return item.dependsOn.every(depId => 
      checklist.find(dep => dep.id === depId)?.completed
    );
  };

  const allRequiredCompleted = () => {
    return checklist
      .filter(item => item.required)
      .every(item => item.completed);
  };

  const getCompletionPercentage = () => {
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  };

  if (!event) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {event.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
                {event.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{event.calendar}</Badge>
                <span className="text-sm text-muted-foreground">
                  {getCompletionPercentage()}% Complete
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">{event.customer.name}</h4>
                  {event.customer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.customer.address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {event.customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <span>{event.customer.phone}</span>
                    </div>
                  )}
                  {event.customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      <span>{event.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work Checklist</CardTitle>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getCompletionPercentage()}%` }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklist.map((item, index) => {
                  const isAvailable = isItemAvailable(item);
                  const isCompleted = item.completed;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`border rounded-lg p-4 ${
                        isCompleted ? 'bg-green-50 border-green-200' : 
                        !isAvailable ? 'bg-gray-50 border-gray-200 opacity-60' : 
                        item.required ? 'border-red-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          checked={isCompleted}
                          disabled={!isAvailable}
                          onCheckedChange={(checked) => handleChecklistChange(item.id, !!checked)}
                          className={isCompleted ? 'border-green-500' : ''}
                        />
                        <div className="flex-1">
                          <label className={`text-sm font-medium cursor-pointer ${
                            isCompleted ? 'line-through text-green-700' : 
                            !isAvailable ? 'text-gray-500' : ''
                          }`}>
                            {index + 1}. {item.text}
                            {item.required && !isCompleted && (
                              <AlertTriangle className="inline h-4 w-4 text-red-500 ml-1" />
                            )}
                          </label>
                          
                          {item.timestamp && (
                            <div className="text-xs text-green-600 mt-1">
                              Completed: {format(parseISO(item.timestamp), 'h:mm a')}
                            </div>
                          )}

                          {/* Form fields for this item */}
                          {item.formFields && (
                            <div className="mt-3 space-y-3 border-t pt-3">
                              {item.formFields.map((field, fieldIndex) => (
                                <div key={fieldIndex}>
                                  <label className="text-sm font-medium">{field.label}</label>
                                  {field.type === 'text' && (
                                    <Input
                                      value={formData[`${item.id}_${fieldIndex}`] || ''}
                                      onChange={(e) => handleFormDataChange(`${item.id}_${fieldIndex}`, e.target.value)}
                                      className="mt-1"
                                      required={field.required}
                                    />
                                  )}
                                  {field.type === 'number' && (
                                    <Input
                                      type="number"
                                      value={formData[`${item.id}_${fieldIndex}`] || ''}
                                      onChange={(e) => handleFormDataChange(`${item.id}_${fieldIndex}`, e.target.value)}
                                      className="mt-1"
                                      required={field.required}
                                    />
                                  )}
                                  {field.type === 'select' && (
                                    <Select 
                                      value={formData[`${item.id}_${fieldIndex}`] || ''}
                                      onValueChange={(value) => handleFormDataChange(`${item.id}_${fieldIndex}`, value)}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select option..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map((option) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {field.type === 'textarea' && (
                                    <Textarea
                                      value={formData[`${item.id}_${fieldIndex}`] || ''}
                                      onChange={(e) => handleFormDataChange(`${item.id}_${fieldIndex}`, e.target.value)}
                                      className="mt-1"
                                      rows={3}
                                      required={field.required}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Save & Close
            </Button>
            
            <div className="flex gap-2">
              {!allRequiredCompleted() && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Complete all required items
                </div>
              )}
              <Button 
                onClick={() => completeJobMutation.mutate()}
                disabled={!allRequiredCompleted() || completeJobMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {completeJobMutation.isPending ? 'Completing...' : 'Complete Job'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}