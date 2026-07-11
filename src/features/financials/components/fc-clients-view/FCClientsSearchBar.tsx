import { Search, X } from 'lucide-react';

interface FCClientsSearchBarProps {
  search: string;
  onSearchChange: (v: string) => void;
}

const FCClientsSearchBar = ({ search, onSearchChange }: FCClientsSearchBarProps) => {
  return (
    <div className="relative w-full" style={{ maxWidth: 350 }}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="البحث بالاسم أو رقم الهاتف..."
        className="w-full pl-9 pr-8 py-2 text-sm border border-input rounded-md bg-background text-text-primary focus:ring-2 focus:ring-primary outline-none"
        dir="rtl"
      />
      {search && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default FCClientsSearchBar;
