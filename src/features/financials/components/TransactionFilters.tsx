import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { arSA } from 'date-fns/locale';
import { RotateCcw, Search as SearchIcon, X as ClearIcon } from 'lucide-react';
import {
  ShadcnSelect as Select,
  ShadcnSelectContent as SelectContent,
  ShadcnSelectItem as SelectItem,
  ShadcnSelectTrigger as SelectTrigger,
  ShadcnSelectValue as SelectValue,
} from '@/shared/ui/shadcn/select';

interface FilterState {
  start_date: string;
  end_date: string;
  type: string;
  search: string;
}

interface TransactionFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  typeOptions?: { value: string; label: string }[];
}

const ALL_TYPES_VALUE = '__all__';

const FILTER_TYPE_OPTIONS = [
  { value: ALL_TYPES_VALUE, label: 'كل الأنواع' },
  { value: 'CASHBOX_RECEIPT', label: 'قبض' },
  { value: 'CASHBOX_PAYMENT', label: 'صرف' },
];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-CA');
}

const filterDateStyles = `
  .filter-date-picker .react-datepicker__input-container input {
    height: 2.5rem;
    padding-inline: 0.8rem;
    padding-block: 0;
    font-size: 0.875rem;
    border: 1px solid var(--color-border);
    border-radius: 0.7rem;
    background-color: var(--color-background);
    color: var(--color-foreground);
    outline: none;
    width: 100%;
    box-sizing: border-box;
    font-family: inherit;
    direction: rtl;
    text-align: right;
    unicode-bidi: plaintext;
  }
  .filter-date-picker .react-datepicker__input-container input::placeholder {
    direction: rtl;
    text-align: right;
    unicode-bidi: plaintext;
  }
  .filter-date-picker .react-datepicker__input-container input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--token-border-focus) 15%, transparent);
  }
  .filter-date-picker .react-datepicker-wrapper {
    width: 100%;
  }
  .filter-date-picker .react-datepicker-popper {
    z-index: 60 !important;
  }
`;

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onChange,
  onReset,
  typeOptions = FILTER_TYPE_OPTIONS,
}) => {
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });
  const hasActiveFilters = Boolean(filters.start_date || filters.end_date || filters.type || filters.search);

  return (
    <>
      <style>{filterDateStyles}</style>
      <div className="rounded-2xl border border-border/70 bg-bg-surface/95 p-3 shadow-sm shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/80 sm:p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_150px_minmax(220px,1.2fr)_auto] xl:items-center">
          <div className="filter-date-picker min-w-0">
            <DatePicker
              selected={parseDate(filters.start_date)}
              onChange={(date: Date | null) => update({ start_date: formatDate(date) })}
              dateFormat="yyyy-MM-dd"
              placeholderText="بداية الفترة"
              locale={arSA}
              portalId="transaction-filters-datepicker-portal"
              showYearDropdown
              scrollableYearDropdown
              dropdownMode="select"
              calendarStartDay={6}
            />
          </div>

          <div className="filter-date-picker min-w-0">
            <DatePicker
              selected={parseDate(filters.end_date)}
              onChange={(date: Date | null) => update({ end_date: formatDate(date) })}
              dateFormat="yyyy-MM-dd"
              placeholderText="نهاية الفترة"
              locale={arSA}
              portalId="transaction-filters-datepicker-portal"
              showYearDropdown
              scrollableYearDropdown
              dropdownMode="select"
              calendarStartDay={6}
            />
          </div>

          <div className="min-w-0">
            <Select
              value={filters.type || ALL_TYPES_VALUE}
              onValueChange={value => update({ type: value === ALL_TYPES_VALUE ? '' : value })}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border/80 bg-background/95 text-[0.92rem] font-medium shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-background focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem
                    key={option.value || ALL_TYPES_VALUE}
                    value={option.value || ALL_TYPES_VALUE}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative min-w-0">
            <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              dir="rtl"
              className="base-input h-10 w-full rounded-xl border-border/80 bg-background/95 px-3 pl-10 text-right text-[0.92rem] shadow-sm transition-all duration-200 placeholder:text-text-muted/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              placeholder="بحث"
              value={filters.search}
              onChange={e => update({ search: e.target.value })}
            />
            {filters.search && (
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-text-muted transition-colors hover:bg-muted hover:text-text-primary"
                onClick={() => update({ search: '' })}
                aria-label="مسح البحث"
              >
                <ClearIcon size={13} />
              </button>
            )}
          </div>

          <div className="flex items-end justify-end xl:justify-start">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-border/80 bg-background px-3 text-[0.9rem] font-medium text-text-secondary transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-text-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              disabled={!hasActiveFilters}
            >
              <RotateCcw size={13} />
              <span>إعادة</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export type { FilterState };
export default TransactionFilters;
