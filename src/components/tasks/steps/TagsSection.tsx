// TagsSection.tsx - Compact Version
import type { Tag } from '../../../api/types';
import { Controller } from 'react-hook-form';

interface TagsSectionProps {
  control: any;
  availableTags?: Tag[];
}

const TagsSection = ({ control, availableTags }: TagsSectionProps) => {
  return (
    <div className="tags-section">
      <label className="form-label-compact mb-2">العلامات</label>
      <Controller
        name="tags"
        control={control}
        render={({ field }) => (
          <div className="tags-container">
            {availableTags && availableTags.length > 0 ? (
              <div className="tags-grid">
                {availableTags.map(tag => (
                  <label key={tag.id} className="tag-checkbox">
                    <input
                      type="checkbox"
                      value={tag.id}
                      checked={Array.isArray(field.value) && field.value.includes(tag.id)}
                      onChange={e => {
                        let newValue = Array.isArray(field.value) ? [...field.value] : [];
                        if (e.target.checked) {
                          if (!newValue.includes(tag.id)) newValue.push(tag.id);
                        } else {
                          newValue = newValue.filter((id) => id !== tag.id);
                        }
                        field.onChange(newValue);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                    <span className="tag-label">{tag.name}</span>
                    <span className="checkmark"></span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="no-tags">
                <p className="text-muted small mb-0">لا توجد علامات متاحة</p>
              </div>
            )}
          </div>
        )}
      />
      
      <style>{`
        .tags-section {
          border: 1px solid #e9ecef;
          border-radius: 0.375rem;
          padding: 0.75rem;
          background-color: #f8f9fa;
        }
        
        .tags-container {
          min-height: 40px;
          max-height: 120px;
          overflow-y: auto;
        }
        
        .tags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.5rem;
        }
        
        .tag-checkbox {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0.375rem 0.5rem;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }
        
        .tag-checkbox:hover {
          border-color: #007bff;
          box-shadow: 0 1px 3px rgba(0,123,255,0.15);
        }
        
        .tag-checkbox input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          cursor: pointer;
        }
        
        .tag-label {
          flex: 1;
          margin-right: 0.5rem;
        }
        
        .checkmark {
          width: 16px;
          height: 16px;
          border: 2px solid #dee2e6;
          border-radius: 3px;
          transition: all 0.2s ease;
        }
        
        .tag-checkbox input:checked ~ .checkmark {
          background-color: #007bff;
          border-color: #007bff;
        }
        
        .tag-checkbox input:checked ~ .checkmark:after {
          content: "✓";
          color: white;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        
        .tag-checkbox input:checked {
          background-color: #e7f3ff;
          border-color: #007bff;
        }
        
        .no-tags {
          text-align: center;
          padding: 1rem;
          color: #6c757d;
        }
      `}</style>
    </div>
  );
};

export default TagsSection;