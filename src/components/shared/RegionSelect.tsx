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
      <div className="absolute top-full right-0 left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 animate-in fade-in duration-200" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {/* Search Input */}
      <div className="p-3 border-b border-border">
        <input
          ref={searchInputRef}
          type="text"
          className="base-input text-sm"
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
          className="w-full px-3 py-2 text-right text-black hover:bg-accent transition-colors duration-150 flex items-center gap-2"
          onClick={() => handleClearSelection(onControllerChange)}
        >
          <i className="fas fa-times"></i>
          إلغاء التحديد
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="px-3 py-2 text-center text-black">
          <i className="fas fa-spinner fa-spin mr-2"></i>
          جاري التحميل...
        </div>
      )}

      {/* Filtered Regions List */}
      {!isLoading && filteredRegions.map((region) => (
        <button
          key={region.id}
          type="button"
          className={`w-full px-3 py-2 text-right flex justify-between items-center transition-colors duration-150 ${
            activeSelectedRegion?.id === region.id 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-accent'
          }`}
          onClick={() => handleRegionSelect(region, onControllerChange)}
        >
          <span>{region.name}</span>
          {region.client_count !== undefined && (
            <small className="text-sm opacity-75">({region.client_count} عميل)</small>
          )}
        </button>
      ))}

      {/* No Results */}
      {!isLoading && searchTerm && filteredRegions.length === 0 && (
        <div className="px-3 py-2 text-center text-black">
          لا توجد مناطق تطابق البحث
        </div>
      )}

      {/* Create New Region Section */}
      {allowCreate && (
        <>
          <div className="border-t border-border"></div>
          {!isCreating ? (
            <button
              type="button"
              className="w-full px-3 py-2 text-right flex items-center gap-2 hover:bg-accent transition-colors duration-150"
              style={{ color: 'hsl(var(--primary))' }}
              onClick={handleStartCreating}
            >
              <i className="fas fa-plus"></i>
              {searchTerm ? `إنشاء منطقة جديدة: "${searchTerm}"` : 'إنشاء منطقة جديدة'}
            </button>
          ) : (
            <div className="p-3 bg-muted/50">
              <div className="mb-2">
                <label className="block text-sm text-black mb-1">اسم المنطقة الجديدة:</label>
                <input
                  ref={createInputRef}
                  type="text"
                  className="base-input text-sm"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, onControllerChange)}
                  placeholder="أدخل اسم المنطقة"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md text-primary-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.9) 100%)'
                  }}
                  onClick={() => handleCreateRegion(onControllerChange)}
                  disabled={!newRegionName.trim() || createRegionMutation.isPending}
                >
                  {createRegionMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin ml-1"></i>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check ml-1"></i>
                      حفظ
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
          {required && <span className="text-destructive mr-1">*</span>}
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
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className={`base-input ${className.includes('form-control-sm') ? 'text-sm py-1.5' : ''} text-right flex justify-between items-center ${
                    error ? 'border-destructive' : ''
                  }`}
                  onClick={() => setIsOpen(!isOpen)}
                  style={{ minHeight: className.includes('form-control-sm') ? '31px' : '38px' }}
                >
                  <span className={selectedRegion ? '' : 'text-black'}>
                    {selectedRegion ? selectedRegion.name : (placeholder || 'اختر منطقة')}
                  </span>
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-black`}></i>
                </button>

                {isOpen && renderDropdownContent(onControllerChange, controllerValue)}
              </div>
            );
          }}
        />
      ) : (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className={`base-input ${className.includes('form-control-sm') ? 'text-sm py-1.5' : ''} text-right flex justify-between items-center ${
              error ? 'border-destructive' : ''
            }`}
            onClick={() => setIsOpen(!isOpen)}
            style={{ minHeight: className.includes('form-control-sm') ? '31px' : '38px' }}
          >
            <span className={selectedRegion ? '' : 'text-black'}>
              {selectedRegion ? selectedRegion.name : (placeholder || 'اختر منطقة')}
            </span>
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-black`}></i>
          </button>

          {isOpen && renderDropdownContent(undefined, value)}
        </div>
      )}

      {error && (
        <div className="text-destructive text-sm mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default RegionSelect;
