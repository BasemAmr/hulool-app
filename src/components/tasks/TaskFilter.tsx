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
      <div className="row g-3 align-items-center">
        {/* Search Input */}
        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder={t('tasks.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="col-md-3">
          <select
            className="form-select"
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
        <div className="col-md-3">
          <select
            className="form-select"
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
        <div className="col-md-2">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
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
          <div className="d-flex flex-wrap gap-2">
            {search && (
              <span className="badge bg-info">
                {t('common.search')}: {search}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  style={{ fontSize: '0.7em' }}
                  onClick={() => onSearchChange('')}
                  aria-label={t('common.remove')}
                ></button>
              </span>
            )}
            {status && (
              <span className="badge bg-warning">
                {t('common.status')}: {statusOptions.find(opt => opt.value === status)?.label}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  style={{ fontSize: '0.7em' }}
                  onClick={() => onStatusChange('')}
                  aria-label={t('common.remove')}
                ></button>
              </span>
            )}
            {type && (
              <span className="badge bg-success">
                {t('common.type')}: {typeOptions.find(opt => opt.value === type)?.label}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  style={{ fontSize: '0.7em' }}
                  onClick={() => onTypeChange('')}
                  aria-label={t('common.remove')}
                ></button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilter;
