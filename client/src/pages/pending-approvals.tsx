import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, DollarSign, AlertTriangle, CheckCircle, XCircle, Edit, User, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PendingApproval {
  id: string;
  type: 'payroll' | 'hours_materials' | 'calendar_appointment';
  submittedBy: string;
  submittedByEmail?: string;
  submitDate: string;
  formType: string;
  suspicious: boolean;
  approved: boolean | null; // null = pending, true = approved, false = denied
  data: any;
  weekEndingDate?: string;
  customerName?: string;
  totalAmount?: number;
  eventDate?: string;
}

export default function PendingApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ["/api/pending-approvals"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      return apiRequest(`/api/pending-approvals/${id}/approve`, {
        method: "POST",
        body: { type }
      });
    },
    onSuccess: () => {
      toast({
        title: "Approved",
        description: "Item has been approved and processed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
    }
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest(`/api/pending-approvals/${id}/deny`, {
        method: "POST",
        body: { reason }
      });
    },
    onSuccess: () => {
      toast({
        title: "Denied",
        description: "Item has been denied and notifications sent",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      setDenyReason("");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/pending-approvals/${id}`, {
        method: "PATCH",
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Updated",
        description: "Approval item has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      setEditDialogOpen(false);
      setSelectedApproval(null);
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payroll': return <Clock className="w-4 h-4" />;
      case 'hours_materials': return <FileText className="w-4 h-4" />;
      case 'calendar_appointment': return <Calendar className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payroll': return <Badge variant="outline" className="bg-blue-50">Payroll</Badge>;
      case 'hours_materials': return <Badge variant="outline" className="bg-green-50">H&M</Badge>;
      case 'calendar_appointment': return <Badge variant="outline" className="bg-purple-50">Calendar</Badge>;
      default: return <Badge variant="outline">Other</Badge>;
    }
  };

  const getStatusBadge = (approved: boolean | null, suspicious: boolean) => {
    if (approved === true) {
      return <Badge className="bg-green-500">Approved</Badge>;
    } else if (approved === false) {
      return <Badge variant="destructive">Denied</Badge>;
    } else {
      return (
        <div className="flex space-x-1">
          <Badge variant="secondary">Pending</Badge>
          {suspicious && <Badge variant="destructive" className="bg-yellow-500"><AlertTriangle className="w-3 h-3" /></Badge>}
        </div>
      );
    }
  };

  const handleApprove = (approval: PendingApproval) => {
    approveMutation.mutate({ id: approval.id, type: approval.type });
  };

  const handleDeny = (approval: PendingApproval) => {
    if (!denyReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for denial",
        variant: "destructive"
      });
      return;
    }
    denyMutation.mutate({ id: approval.id, reason: denyReason });
  };

  const handleEdit = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setEditDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Filter approvals by type
  const payrollApprovals = pendingApprovals.filter((a: PendingApproval) => a.type === 'payroll');
  const hoursApprovals = pendingApprovals.filter((a: PendingApproval) => a.type === 'hours_materials');
  const calendarApprovals = pendingApprovals.filter((a: PendingApproval) => a.type === 'calendar_appointment');

  const ApprovalCard = ({ approval }: { approval: PendingApproval }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getTypeIcon(approval.type)}
            <div>
              <CardTitle className="text-lg">{approval.formType}</CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <User className="w-3 h-3" />
                <span>by {approval.submittedBy}</span>
                <span>•</span>
                <span>{format(new Date(approval.submitDate), "MMM dd, yyyy h:mm a")}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getTypeBadge(approval.type)}
            {getStatusBadge(approval.approved, approval.suspicious)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {approval.type === 'payroll' && approval.weekEndingDate && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Week Ending</Label>
              <p className="text-sm">{format(new Date(approval.weekEndingDate), "MMM dd, yyyy")}</p>
            </div>
          )}
          {approval.customerName && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
              <p className="text-sm">{approval.customerName}</p>
            </div>
          )}
          {approval.totalAmount && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
              <p className="text-sm font-semibold">{formatCurrency(approval.totalAmount)}</p>
            </div>
          )}
          {approval.eventDate && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Event Date</Label>
              <p className="text-sm">{format(new Date(approval.eventDate), "MMM dd, yyyy h:mm a")}</p>
            </div>
          )}
        </div>

        {approval.approved === null && (
          <div className="flex space-x-2">
            <Button 
              onClick={() => handleEdit(approval)}
              variant="outline" 
              size="sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button 
              onClick={() => handleApprove(approval)}
              disabled={approveMutation.isPending}
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <XCircle className="w-4 h-4 mr-1" />
                  Deny
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deny Approval</DialogTitle>
                  <DialogDescription>
                    Provide a reason for denying this {approval.type} submission. 
                    An email will be sent to the submitter and admin.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Denial Reason</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please explain why this submission is being denied..."
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      className="min-h-20"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleDeny(approval)}
                      disabled={denyMutation.isPending || !denyReason.trim()}
                      variant="destructive"
                    >
                      Send Denial
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading pending approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Pending Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve payroll, hours & materials, and calendar requests</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({pendingApprovals.filter((a: PendingApproval) => a.approved === null).length})
          </TabsTrigger>
          <TabsTrigger value="payroll">
            Payroll ({payrollApprovals.filter(a => a.approved === null).length})
          </TabsTrigger>
          <TabsTrigger value="hours">
            H&M ({hoursApprovals.filter(a => a.approved === null).length})
          </TabsTrigger>
          <TabsTrigger value="calendar">
            Calendar ({calendarApprovals.filter(a => a.approved === null).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {pendingApprovals.filter((a: PendingApproval) => a.approved === null).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending approvals</p>
              </CardContent>
            </Card>
          ) : (
            pendingApprovals
              .filter((a: PendingApproval) => a.approved === null)
              .sort((a: PendingApproval, b: PendingApproval) => 
                new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime()
              )
              .map((approval: PendingApproval) => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))
          )}
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          {payrollApprovals.filter(a => a.approved === null).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending payroll approvals</p>
              </CardContent>
            </Card>
          ) : (
            payrollApprovals
              .filter(a => a.approved === null)
              .sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime())
              .map(approval => <ApprovalCard key={approval.id} approval={approval} />)
          )}
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          {hoursApprovals.filter(a => a.approved === null).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending hours & materials approvals</p>
              </CardContent>
            </Card>
          ) : (
            hoursApprovals
              .filter(a => a.approved === null)
              .sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime())
              .map(approval => <ApprovalCard key={approval.id} approval={approval} />)
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          {calendarApprovals.filter(a => a.approved === null).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No pending calendar approvals</p>
              </CardContent>
            </Card>
          ) : (
            calendarApprovals
              .filter(a => a.approved === null)
              .sort((a, b) => new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime())
              .map(approval => <ApprovalCard key={approval.id} approval={approval} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {selectedApproval?.formType}</DialogTitle>
            <DialogDescription>
              Make changes to the submission before approval
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="submittedBy">Submitted By</Label>
                  <Input
                    id="submittedBy"
                    value={selectedApproval.submittedBy}
                    onChange={(e) => setSelectedApproval({
                      ...selectedApproval,
                      submittedBy: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="formType">Form Type</Label>
                  <Input
                    id="formType"
                    value={selectedApproval.formType}
                    onChange={(e) => setSelectedApproval({
                      ...selectedApproval,
                      formType: e.target.value
                    })}
                  />
                </div>
              </div>
              {selectedApproval.totalAmount && (
                <div>
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={selectedApproval.totalAmount}
                    onChange={(e) => setSelectedApproval({
                      ...selectedApproval,
                      totalAmount: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              )}
              <div className="flex space-x-2">
                <Button 
                  onClick={() => updateMutation.mutate({ 
                    id: selectedApproval.id, 
                    data: selectedApproval 
                  })}
                  disabled={updateMutation.isPending}
                >
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}