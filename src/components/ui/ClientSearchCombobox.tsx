/**
 * ClientSearchCombobox Component
 * 
 * Searchable combobox for selecting clients with API-based search
 * Uses Command component from shadcn/ui
 */

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { useGetAccountsByType } from '../../queries/financialCenterQueries';
import { useDebounce } from '../../hooks/useDebounce';

interface ClientSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ClientSearchCombobox = ({
  value,
  onChange,
  placeholder = 'اختر عميل...',
  disabled = false,
}: ClientSearchComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Fetch clients with search
  const { data: clientsData, isLoading } = useGetAccountsByType(
    'client',
    {
      search: debouncedSearch,
      per_page: 50, // Increased to ensure selected client is in results
    },
    true // Always fetch to ensure selected client is available
  );

  const clients = clientsData?.accounts || [];
  const selectedClient = clients.find((c) => String(c.id) === value);

  // Keep selected client in list even when searching
  const displayClients = selectedClient && !clients.find(c => String(c.id) === value)
    ? [selectedClient, ...clients]
    : clients;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline-secondary"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-right"
          disabled={disabled}
        >
          <span className={cn(!selectedClient && 'text-black/50')}>
            {selectedClient ? selectedClient.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ابحث عن عميل..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-black/50" />
                <p className="mt-2 text-xs text-black/50">جاري البحث...</p>
              </div>
            ) : displayClients.length === 0 ? (
              <CommandEmpty>
                {search ? 'لا توجد نتائج' : 'ابدأ بالكتابة للبحث'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {displayClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={String(client.id)}
                    onSelect={(currentValue) => {
                      // Only toggle if clicking the same value, otherwise always select
                      const newValue = currentValue === value ? '' : currentValue;
                      console.log('Client selected:', { currentValue, value, newValue });
                      onChange(newValue);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="text-right"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-black/50">
                        Balance: {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(client.balance)} SAR
                      </div>
                    </div>
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === String(client.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientSearchCombobox;
