import { useTranslation } from 'react-i18next';

interface TaskFilterProps {
  search: string;
  status: string;
  type: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClearFilters: () => void;
}

const TaskFilter = ({
  search,
  status,
  type,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onClearFilters,
}: TaskFilterProps) => {
  const { t } = useTranslation();

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: t('common.all') },
    { value: 'New', label: t('status.New') },
    { value: 'Deferred', label: t('status.Deferred') },
    { value: 'Completed', label: t('status.Completed') },
    { value: 'Late', label: t('status.Late') },
    { value: 'Pending Review', label: t('status.Pending Review') },
  ];

  const typeOptions: { value: string; label: string }[] = [
    { value: '', label: t('common.all') },
    { value: 'Government', label: t('type.Government') },
    { value: 'RealEstate', label: t('type.RealEstate') },
    { value: 'Accounting', label: t('type.Accounting') },
    { value: 'Other', label: t('type.Other') },
  ];

  const hasActiveFilters = search || status || type;

  return (
    <div className="task-filters">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-4">
          <input
            type="text"
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-black text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder={t('tasks.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3">
          <select
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-black text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="md:col-span-3">
          <select
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-black text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="md:col-span-2">
          {hasActiveFilters && (
            <button
              type="button"
              className="w-full px-4 py-2 border border-border rounded-md bg-background text-black text-base font-medium hover:bg-muted transition-colors"
              onClick={onClearFilters}
            >
              {t('common.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500 text-white text-sm">
                {t('common.search')}: {search}
                <button
                  type="button"
                  className="ml-1 text-white hover:text-gray-200 transition-colors"
                  style={{ fontSize: '0.7em' }}
                  onClick={() => onSearchChange('')}
                  aria-label={t('common.remove')}
                >×</button>
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500 text-white text-sm">
                {t('common.status')}: {statusOptions.find(opt => opt.value === status)?.label}
                <button
                  type="button"
                  className="ml-1 text-white hover:text-gray-200 transition-colors"
                  style={{ fontSize: '0.7em' }}
                  onClick={() => onStatusChange('')}
                  aria-label={t('common.remove')}
                >×</button>
              </span>
            )}
            {type && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-sm">
                {t('common.type')}: {typeOptions.find(opt => opt.value === type)?.label}
                <button
                  type="button"
                  className="ml-1 text-white hover:text-gray-200 transition-colors"
                  style={{ fontSize: '0.7em' }}
                  onClick={() => onTypeChange('')}
                  aria-label={t('common.remove')}
                >×</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilter;
