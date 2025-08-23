import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
}

interface CustomerAutocompleteProps {
  value?: string;
  onValueChange: (customerId: string, customer: Customer | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomerAutocomplete({
  value,
  onValueChange,
  placeholder = "Select customer...",
  disabled = false,
  className,
}: CustomerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch customers with search
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", search],
    enabled: open || !!search,
  });

  // Update selected customer when value changes externally
  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find(c => c.id === value);
      if (customer) {
        setSelectedCustomer(customer);
      }
    } else if (!value) {
      setSelectedCustomer(null);
    }
  }, [value, customers]);

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOpen(false);
    setSearch("");
    onValueChange(customer.id, customer);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setSearch("");
    onValueChange("", null);
  };

  const displayValue = selectedCustomer 
    ? `${selectedCustomer.name}${selectedCustomer.companyName ? ` (${selectedCustomer.companyName})` : ''}`
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            !selectedCustomer && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center space-x-2 flex-1 overflow-hidden">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {displayValue || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search customers..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>
            {isLoading ? "Loading customers..." : "No customers found."}
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {customers.map((customer) => (
              <CommandItem
                key={customer.id}
                value={customer.id}
                onSelect={() => handleSelect(customer)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    {customer.companyName && (
                      <span className="text-xs text-muted-foreground">
                        {customer.companyName}
                      </span>
                    )}
                    {customer.email && (
                      <span className="text-xs text-muted-foreground">
                        {customer.email}
                      </span>
                    )}
                  </div>
                </div>
                <Check
                  className={cn(
                    "h-4 w-4",
                    selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Simple autocomplete input version for inline use
export function CustomerAutocompleteInput({
  value,
  onValueChange,
  placeholder = "Type to search customers...",
  disabled = false,
  className,
}: CustomerAutocompleteProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", search],
    enabled: !!search && search.length > 1,
  });

  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find(c => c.id === value);
      if (customer) {
        setSelectedCustomer(customer);
        setSearch(customer.name);
      }
    } else if (!value) {
      setSelectedCustomer(null);
      setSearch("");
    }
  }, [value, customers]);

  const handleInputChange = (inputValue: string) => {
    setSearch(inputValue);
    setShowDropdown(inputValue.length > 1);
    
    // Clear selection if input doesn't match selected customer
    if (selectedCustomer && inputValue !== selectedCustomer.name) {
      setSelectedCustomer(null);
      onValueChange("", null);
    }
  };

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearch(customer.name);
    setShowDropdown(false);
    onValueChange(customer.id, customer);
    inputRef.current?.blur();
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => search.length > 1 && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      
      {showDropdown && customers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center space-x-2"
              onClick={() => handleSelect(customer)}
            >
              <User className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-medium">{customer.name}</span>
                {customer.companyName && (
                  <span className="text-xs text-muted-foreground">
                    {customer.companyName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isLoading && showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-center text-muted-foreground">
          Loading customers...
        </div>
      )}
    </div>
  );
}