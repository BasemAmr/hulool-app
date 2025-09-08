import React, { useState, useEffect, useRef } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { useGetRegions, useCreateRegion } from '../../queries/regionQueries';
import type { Region } from '../../api/types';
import { useToast } from '../../hooks/useToast';

interface RegionSelectProps {
  control?: Control<any>;
  name?: string;
  label?: string;
  placeholder?: string;
  value?: number | null;
  onChange?: (value: number | null) => void;
  error?: string;
  required?: boolean;
  allowCreate?: boolean;
  className?: string;
}

const RegionSelect: React.FC<RegionSelectProps> = ({
  control,
  name,
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  allowCreate = true,
  className = ''
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const { data: regions = [], isLoading } = useGetRegions();
  const createRegionMutation = useCreateRegion();

  // Filter regions based on search term
  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Find selected region
  const selectedRegion = regions.find(region => Number(region.id) === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setSearchTerm('');
        setNewRegionName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Focus create input when creating mode is activated
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  const handleRegionSelect = (region: Region, onControllerChange?: (value: any) => void) => {
    const regionId = Number(region.id);
    if (onControllerChange) {
      onControllerChange(regionId);
    }
    if (onChange) {
      onChange(regionId);
    }
    setIsOpen(false);
    setSearchTerm('');
    setIsCreating(false);
  };

  const handleClearSelection = (onControllerChange?: (value: any) => void) => {
    if (onControllerChange) {
      onControllerChange(null);
    }
    if (onChange) {
      onChange(null);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateRegion = async (onControllerChange?: (value: any) => void) => {
    if (!newRegionName.trim()) return;

    try {
      const newRegion = await createRegionMutation.mutateAsync({
        name: newRegionName.trim()
      });

      // Select the newly created region
      if (onControllerChange) {
        onControllerChange(Number(newRegion.id));
      }
      if (onChange) {
        onChange(Number(newRegion.id));
      }

      toastSuccess('تم إنشاء المنطقة بنجاح', `تم إضافة منطقة "${newRegion.name}" بنجاح`);
      
      setIsOpen(false);
      setIsCreating(false);
      setSearchTerm('');
      setNewRegionName('');
    } catch (error: any) {
      console.error('Error creating region:', error);
      const errorMessage = error?.response?.data?.message || 'حدث خطأ أثناء إنشاء المنطقة';
      toastError('خطأ في إنشاء المنطقة', errorMessage);
    }
  };

  const handleStartCreating = () => {
    setNewRegionName(searchTerm);
    setIsCreating(true);
  };

  const handleCancelCreating = () => {
    setIsCreating(false);
    setNewRegionName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, onControllerChange?: (value: any) => void) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsCreating(false);
      setSearchTerm('');
      setNewRegionName('');
    } else if (e.key === 'Enter' && !isCreating && filteredRegions.length === 1) {
      e.preventDefault();
      handleRegionSelect(filteredRegions[0], onControllerChange);
    } else if (e.key === 'Enter' && isCreating) {
      e.preventDefault();
      handleCreateRegion(onControllerChange);
    }
  };

  const renderDropdownContent = (onControllerChange?: (value: any) => void, currentValue?: number | null) => {
    // Use the passed currentValue or fallback to the prop value
    const activeValue = currentValue !== undefined ? currentValue : value;
    const activeSelectedRegion = regions.find(region => Number(region.id) === activeValue);
    
    return (
      <div className="dropdown-menu show w-100 shadow-lg border-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {/* Search Input */}
      <div className="p-3 border-bottom">
        <input
          ref={searchInputRef}
          type="text"
          className="form-control form-control-sm"
          placeholder="البحث عن منطقة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, onControllerChange)}
        />
      </div>

      {/* Clear Selection Option */}
      {!required && (
        <button
          type="button"
          className="dropdown-item text-muted"
          onClick={() => handleClearSelection(onControllerChange)}
        >
          <i className="fas fa-times me-2"></i>
          إلغاء التحديد
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="dropdown-item text-center">
          <i className="fas fa-spinner fa-spin me-2"></i>
          جاري التحميل...
        </div>
      )}

      {/* Filtered Regions List */}
      {!isLoading && filteredRegions.map((region) => (
        <button
          key={region.id}
          type="button"
          className={`dropdown-item d-flex justify-content-between align-items-center ${
            activeSelectedRegion?.id === region.id ? 'active' : ''
          }`}
          onClick={() => handleRegionSelect(region, onControllerChange)}
        >
          <span>{region.name}</span>
          {region.client_count !== undefined && (
            <small className="text-muted">({region.client_count} عميل)</small>
          )}
        </button>
      ))}

      {/* No Results */}
      {!isLoading && searchTerm && filteredRegions.length === 0 && (
        <div className="dropdown-item text-muted text-center">
          لا توجد مناطق تطابق البحث
        </div>
      )}

      {/* Create New Region Section */}
      {allowCreate && (
        <>
          <div className="dropdown-divider"></div>
          {!isCreating ? (
            <button
              type="button"
              className="dropdown-item text-primary"
              onClick={handleStartCreating}
            >
              <i className="fas fa-plus me-2"></i>
              {searchTerm ? `إنشاء منطقة جديدة: "${searchTerm}"` : 'إنشاء منطقة جديدة'}
            </button>
          ) : (
            <div className="p-3 bg-light">
              <div className="mb-2">
                <label className="form-label small">اسم المنطقة الجديدة:</label>
                <input
                  ref={createInputRef}
                  type="text"
                  className="form-control form-control-sm"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, onControllerChange)}
                  placeholder="أدخل اسم المنطقة"
                />
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-fill"
                  onClick={() => handleCreateRegion(onControllerChange)}
                  disabled={!newRegionName.trim() || createRegionMutation.isPending}
                >
                  {createRegionMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin me-1"></i>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-1"></i>
                      حفظ
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancelCreating}
                  disabled={createRegionMutation.isPending}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    );
  };

  return (
    <div className={`${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      
      {control && name ? (
        <Controller
          control={control}
          name={name}
          rules={{ required: required ? 'هذا الحقل مطلوب' : false }}
          render={({ field: { onChange: onControllerChange, value: controllerValue } }) => {
            const selectedRegion = regions.find(region => Number(region.id) === controllerValue);

            return (
              <div className="position-relative" ref={dropdownRef}>
                <button
                  type="button"
                  className={`form-control ${className.includes('form-control-sm') ? 'form-control-sm' : ''} text-start d-flex justify-content-between align-items-center ${
                    error ? 'is-invalid' : ''
                  }`}
                  onClick={() => setIsOpen(!isOpen)}
                  style={{ minHeight: className.includes('form-control-sm') ? '31px' : '38px', fontSize: className.includes('form-control-sm') ? '0.875rem' : undefined }}
                >
                  <span className={selectedRegion ? '' : 'text-muted'}>
                    {selectedRegion ? selectedRegion.name : (placeholder || 'اختر منطقة')}
                  </span>
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
                </button>

                {isOpen && renderDropdownContent(onControllerChange, controllerValue)}
              </div>
            );
          }}
        />
      ) : (
        <div className="position-relative" ref={dropdownRef}>
          <button
            type="button"
            className={`form-control ${className.includes('form-control-sm') ? 'form-control-sm' : ''} text-start d-flex justify-content-between align-items-center ${
              error ? 'is-invalid' : ''
            }`}
            onClick={() => setIsOpen(!isOpen)}
            style={{ minHeight: className.includes('form-control-sm') ? '31px' : '38px', fontSize: className.includes('form-control-sm') ? '0.875rem' : undefined }}
          >
            <span className={selectedRegion ? '' : 'text-muted'}>
              {selectedRegion ? selectedRegion.name : (placeholder || 'اختر منطقة')}
            </span>
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted`}></i>
          </button>

          {isOpen && renderDropdownContent(undefined, value)}
        </div>
      )}

      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
    </div>
  );
};

export default RegionSelect;
