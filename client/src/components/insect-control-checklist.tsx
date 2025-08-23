import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Clock, MapPin, Phone, User, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  timestamp?: string;
  required: boolean;
  showDropdownOnSkip?: boolean;
  dropdownOptions?: string[];
  requiresAmount?: boolean;
  requiresPaymentMethod?: boolean;
  requiresExplanation?: boolean;
  amount?: string;
  paymentMethod?: string;
  explanation?: string;
  skipReason?: string;
}

interface InsectControlChecklistProps {
  event: {
    id: string;
    title: string;
    start: string;
    end: string;
    customer?: {
      name: string;
      phone?: string;
      address?: string;
    };
    technician?: string;
    serviceType?: string;
  };
  onClose: () => void;
  onComplete: (data: any) => void;
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: '1',
    text: 'Called your customer and confirmed appointment as well as arrival time.',
    completed: false,
    required: true
  },
  {
    id: '2', 
    text: 'Made contact with customer, provided a business card and walked the customer through today\'s service.',
    completed: false,
    required: true
  },
  {
    id: '3',
    text: 'Children and Dogs have been put inside and I indicated to the customer that I am going to begin the spray.',
    completed: false,
    required: true
  },
  {
    id: '4',
    text: 'Completed exterior perimeter spray.',
    completed: false,
    required: true
  },
  {
    id: '5',
    text: 'Completed interior perimeter spray.',
    completed: false,
    required: true,
    showDropdownOnSkip: true,
    dropdownOptions: ['Customer Declined', 'No Access/Door Locked', 'Other: Explain']
  },
  {
    id: '6',
    text: 'Walked the customer through the job and asked if there was any additional problem areas. If the customer did not want the interior spray, I explained that resprays would not be possible. If the customer did want the interior and exterior sprayed...',
    completed: false,
    required: true
  },
  {
    id: '6a',
    text: 'I indicated the price of the treatment',
    completed: false,
    required: true,
    requiresAmount: true
  },
  {
    id: '6b',
    text: 'I verbally explained our respray policy and/or provided a copy of the respray policy to the customer.',
    completed: false,
    required: true
  },
  {
    id: '7',
    text: 'I received payment',
    completed: false,
    required: true,
    requiresAmount: true,
    requiresPaymentMethod: true,
    requiresExplanation: true
  },
  {
    id: '8',
    text: 'All Marin Pest Control equipment, jobsite trash, tools and materials have been removed from the site. All doors, hatches and gates are closed and locked. The customer has been walked through the service and is happy with our performance.',
    completed: false,
    required: true
  },
  {
    id: '9',
    text: 'Areas of the home that were treated',
    completed: false,
    required: true,
    requiresExplanation: true
  },
  {
    id: '10',
    text: 'I hereby declare that this insect control spray or broad spectrum treatment has been finished to the best of my abilities and the customer is happy. There are no other loose ends or objectionable leftovers that will cause problems. This job is closed.',
    completed: false,
    required: true
  }
];

const PAYMENT_METHODS = [
  'Cash',
  'Check', 
  'Credit Card',
  'Call to Office',
  'Invoice Approved By Spencer'
];

const TREATMENT_AREAS = [
  'Exterior Perimeter',
  'Exterior Yard', 
  'Interior Perimeter',
  'Interior Area Coverage',
  'Crawlspace',
  'Attic',
  'Roof',
  'Other'
];

export default function InsectControlChecklist({ event, onClose, onComplete }: InsectControlChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [technicianName, setTechnicianName] = useState(event.technician || '');
  const [treatmentAreas, setTreatmentAreas] = useState<string[]>([]);
  const [otherTreatmentArea, setOtherTreatmentArea] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>) => {
    setChecklist(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            ...updates, 
            timestamp: updates.completed ? new Date().toISOString() : item.timestamp 
          }
        : item
    ));
  };

  const handleCheckboxChange = (id: string, completed: boolean) => {
    updateChecklistItem(id, { completed });
  };

  const getCompletedCount = () => {
    return checklist.filter(item => item.completed).length;
  };

  const getTotalCount = () => {
    return checklist.length;
  };

  const canComplete = () => {
    const requiredItems = checklist.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => item.completed);
    return completedRequired.length === requiredItems.length && technicianName.trim() !== '';
  };

  const handleComplete = async () => {
    if (!canComplete()) return;

    setIsCompleting(true);
    
    const completionData = {
      eventId: event.id,
      customer: event.customer,
      technician: technicianName,
      completedAt: new Date().toISOString(),
      checklist: checklist,
      treatmentAreas: treatmentAreas,
      otherTreatmentArea: otherTreatmentArea
    };

    try {
      // Submit completion data to backend
      await fetch('/api/service-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionData)
      });

      onComplete(completionData);
    } catch (error) {
      console.error('Error completing service:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const getItemStatus = (item: ChecklistItem) => {
    if (item.completed) {
      return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' };
    }
    if (item.required) {
      return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' };
    }
    return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' };
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
            <CheckCircle2 className="w-6 h-6 mr-2 text-green-600" />
            Insect Control Service Checklist
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <span className="font-medium">{event.customer?.name}</span>
                  </div>
                  
                  {event.customer?.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{event.customer.phone}</span>
                    </div>
                  )}
                  
                  {event.customer?.address && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{event.customer.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>
                      {format(new Date(event.start), 'MMM d, h:mm a')} - 
                      {format(new Date(event.end), 'h:mm a')}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progress</span>
                    <Badge variant={canComplete() ? 'default' : 'secondary'}>
                      {getCompletedCount()}/{getTotalCount()}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(getCompletedCount() / getTotalCount()) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Technician Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Technician Name</label>
                  <Input
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Treatment Areas */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Areas Treated</label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {TREATMENT_AREAS.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={area}
                          checked={treatmentAreas.includes(area)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTreatmentAreas(prev => [...prev, area]);
                            } else {
                              setTreatmentAreas(prev => prev.filter(a => a !== area));
                            }
                          }}
                        />
                        <label htmlFor={area} className="text-sm">{area}</label>
                      </div>
                    ))}
                  </div>
                  {treatmentAreas.includes('Other') && (
                    <Input
                      value={otherTreatmentArea}
                      onChange={(e) => setOtherTreatmentArea(e.target.value)}
                      placeholder="Specify other treatment area"
                      className="mt-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checklist */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {checklist.map((item, index) => {
                      const status = getItemStatus(item);
                      const StatusIcon = status.icon;
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            item.completed 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <Checkbox
                                id={item.id}
                                checked={item.completed}
                                onCheckedChange={(checked) => 
                                  handleCheckboxChange(item.id, checked as boolean)
                                }
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <label
                                  htmlFor={item.id}
                                  className={`text-sm cursor-pointer ${
                                    item.completed ? 'line-through text-gray-500' : 'text-gray-700'
                                  }`}
                                >
                                  <span className="font-medium">{index + 1}.</span> {item.text}
                                </label>
                                {item.timestamp && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Completed at {format(new Date(item.timestamp), 'h:mm a')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <StatusIcon className={`w-5 h-5 ${status.color} flex-shrink-0`} />
                          </div>

                          {/* Special fields for specific items */}
                          {item.id === '5' && !item.completed && item.showDropdownOnSkip && (
                            <div className="mt-3 ml-6">
                              <Select 
                                value={item.skipReason || ''} 
                                onValueChange={(value) => updateChecklistItem(item.id, { skipReason: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="If not completed, select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.dropdownOptions?.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {item.skipReason === 'Other: Explain' && (
                                <Textarea
                                  className="mt-2"
                                  placeholder="Please explain..."
                                  value={item.explanation || ''}
                                  onChange={(e) => updateChecklistItem(item.id, { explanation: e.target.value })}
                                />
                              )}
                            </div>
                          )}

                          {item.requiresAmount && (
                            <div className="mt-3 ml-6">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4" />
                                <Input
                                  type="number"
                                  placeholder="Amount"
                                  value={item.amount || ''}
                                  onChange={(e) => updateChecklistItem(item.id, { amount: e.target.value })}
                                  className="w-32"
                                />
                              </div>
                            </div>
                          )}

                          {item.requiresPaymentMethod && (
                            <div className="mt-3 ml-6">
                              <Select 
                                value={item.paymentMethod || ''} 
                                onValueChange={(value) => updateChecklistItem(item.id, { paymentMethod: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_METHODS.map((method) => (
                                    <SelectItem key={method} value={method}>
                                      {method}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {item.id === '7' && (item.amount === '0' || !item.amount) && (
                            <div className="mt-3 ml-6">
                              <div className="flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-1" />
                                <div className="space-y-2 flex-1">
                                  <p className="text-sm text-yellow-700">
                                    No payment received - requires explanation and admin override
                                  </p>
                                  <Textarea
                                    placeholder="Explain why no payment was received..."
                                    value={item.explanation || ''}
                                    onChange={(e) => updateChecklistItem(item.id, { explanation: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="flex justify-between items-center pt-4 mt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="text-gray-600"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={handleComplete}
                    disabled={!canComplete() || isCompleting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isCompleting ? 'Completing Service...' : 'Complete Service'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}