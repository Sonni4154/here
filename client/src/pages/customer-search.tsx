import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Globe, 
  Hash,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  User,
  FileText,
  Edit3,
  Save,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Customer, CustomerNote } from "@shared/schema";

export default function CustomerSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search customers
  const { data: customers = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/customers", { search: searchTerm }],
    enabled: searchTerm.length >= 2,
  });

  // Get customer notes
  const { data: customerNotes = [] } = useQuery<CustomerNote[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "notes"],
    enabled: !!selectedCustomer?.id,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: { customerId: string; content: string; isPrivate: boolean }) => {
      return await apiRequest(`/api/customers/${note.customerId}/notes`, {
        method: 'POST',
        body: JSON.stringify(note),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomer?.id, "notes"] });
      setNewNote("");
      toast({
        title: "Note Added",
        description: "Customer note has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add note",
        variant: "destructive",
      });
    },
  });

  // Update customer notes mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (updates: { notes: string }) => {
      return await apiRequest(`/api/customers/${selectedCustomer?.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsEditingNotes(false);
      setSelectedCustomer(prev => prev ? { ...prev, notes: editedNotes } : null);
      toast({
        title: "Customer Updated",
        description: "Customer notes have been updated and will sync to QuickBooks.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleAddNote = (isPrivate: boolean = false) => {
    if (!selectedCustomer || !newNote.trim()) return;
    
    addNoteMutation.mutate({
      customerId: selectedCustomer.id,
      content: newNote.trim(),
      isPrivate,
    });
  };

  const handleUpdateNotes = () => {
    if (!selectedCustomer) return;
    updateCustomerMutation.mutate({ notes: editedNotes });
  };

  const startEditingNotes = () => {
    setEditedNotes(selectedCustomer?.notes || "");
    setIsEditingNotes(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Customer Search</h1>
        <p className="text-slate-600">Search and manage customer information with QuickBooks sync</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Search Customers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isSearching && (
                <div className="text-center py-4 text-slate-500">
                  Searching...
                </div>
              )}

              {searchTerm.length >= 2 && !isSearching && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCustomers.map((customer: Customer) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900">{customer.name}</h3>
                          {customer.companyName && (
                            <p className="text-sm text-slate-600">{customer.companyName}</p>
                          )}
                          {customer.email && (
                            <p className="text-sm text-slate-500">{customer.email}</p>
                          )}
                        </div>
                        <div className="ml-2">
                          {getSyncStatusBadge(customer.syncStatus || 'pending')}
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <div className="text-center py-4 text-slate-500">
                      No customers found matching your search.
                    </div>
                  )}
                </div>
              )}

              {searchTerm.length < 2 && (
                <div className="text-center py-4 text-slate-500 text-sm">
                  Enter at least 2 characters to search
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Details Panel */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {selectedCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{selectedCustomer.name}</CardTitle>
                      {selectedCustomer.companyName && (
                        <CardDescription className="text-base">{selectedCustomer.companyName}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSyncStatusBadge(selectedCustomer.syncStatus || 'pending')}
                    {selectedCustomer.quickbooksId && (
                      <Badge variant="outline" className="text-xs">
                        QB: {selectedCustomer.quickbooksId}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Information */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Contact Information
                        </h3>
                        
                        {selectedCustomer.email && (
                          <div className="flex items-center space-x-2 text-slate-600">
                            <Mail className="w-4 h-4" />
                            <span>{selectedCustomer.email}</span>
                          </div>
                        )}
                        
                        {selectedCustomer.phone && (
                          <div className="flex items-center space-x-2 text-slate-600">
                            <Phone className="w-4 h-4" />
                            <span>{selectedCustomer.phone}</span>
                          </div>
                        )}
                        
                        {selectedCustomer.website && (
                          <div className="flex items-center space-x-2 text-slate-600">
                            <Globe className="w-4 h-4" />
                            <a href={selectedCustomer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {selectedCustomer.website}
                            </a>
                          </div>
                        )}
                        
                        {selectedCustomer.taxId && (
                          <div className="flex items-center space-x-2 text-slate-600">
                            <Hash className="w-4 h-4" />
                            <span>Tax ID: {selectedCustomer.taxId}</span>
                          </div>
                        )}
                      </div>

                      {/* Address Information */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900 flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          Address
                        </h3>
                        
                        {selectedCustomer.address && (
                          <div className="text-slate-600">
                            <p>{selectedCustomer.address}</p>
                            {(selectedCustomer.city || selectedCustomer.state || selectedCustomer.zipCode) && (
                              <p>
                                {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            )}
                            {selectedCustomer.country && (
                              <p>{selectedCustomer.country}</p>
                            )}
                          </div>
                        )}
                        
                        {!selectedCustomer.address && (
                          <p className="text-slate-400 italic">No address on file</p>
                        )}
                      </div>
                    </div>

                    {/* General Notes */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          General Notes (Syncs with QuickBooks)
                        </h3>
                        {!isEditingNotes && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={startEditingNotes}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>

                      {isEditingNotes ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            placeholder="Add general notes about this customer..."
                            rows={4}
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleUpdateNotes}
                              disabled={updateCustomerMutation.isPending}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingNotes(false)}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-3 rounded-lg">
                          {selectedCustomer.notes ? (
                            <p className="text-slate-700 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                          ) : (
                            <p className="text-slate-400 italic">No general notes</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-6">
                    {/* Add New Note */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900">Add New Note</h3>
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add a note about this customer..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleAddNote(false)}
                            disabled={!newNote.trim() || addNoteMutation.isPending}
                            size="sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Public Note
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleAddNote(true)}
                            disabled={!newNote.trim() || addNoteMutation.isPending}
                            size="sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Private Note
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Public notes sync with QuickBooks. Private notes are only visible internally.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Notes History */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-900">Notes History</h3>
                      
                      {customerNotes.length > 0 ? (
                        <div className="space-y-3">
                          {customerNotes.map((note) => (
                            <div
                              key={note.id}
                              className={`p-3 rounded-lg border ${
                                note.isPrivate
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={note.isPrivate ? "secondary" : "default"}
                                    className="text-xs"
                                  >
                                    {note.isPrivate ? "Private" : "Public"}
                                  </Badge>
                                  {!note.isPrivate && getSyncStatusBadge(note.syncStatus || 'pending')}
                                </div>
                                <span className="text-xs text-slate-500">
                                  {new Date(note.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p>No notes yet</p>
                          <p className="text-sm">Add your first note above</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Customer Selected</h3>
                  <p className="text-slate-500">Search and select a customer to view their details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}