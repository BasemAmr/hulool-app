import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectProps
>(({ label, error, options, placeholder = "-- اختر --", className, value, onChange, name, disabled }, ref) => {
  const handleValueChange = (newValue: string) => {
    if (onChange) {
      // Simulate onChange event
      const event = {
        target: { name, value: newValue },
        currentTarget: { name, value: newValue }
      } as React.ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }
  };

  // Convert value to string for Radix UI Select
  const stringValue = value !== undefined && value !== null ? String(value) : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-foreground tracking-tight">
          {label}
        </label>
      )}
      <SelectPrimitive.Root value={stringValue} onValueChange={handleValueChange} name={name} disabled={disabled}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border-[1.5px] border-input bg-background px-3.5 py-2 text-sm transition-all hover:border-primary/30 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted [&>span]:line-clamp-1",
            error && "!border-destructive focus:!ring-destructive/10",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
            <SelectPrimitive.Viewport className="p-1.5">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-9 pr-3 text-sm outline-none transition-colors hover:bg-primary/5 focus:bg-primary/10 focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-primary/5 data-[state=checked]:text-primary data-[state=checked]:font-medium"
                >
                  <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <div className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
