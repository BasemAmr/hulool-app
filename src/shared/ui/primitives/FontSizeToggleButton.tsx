import React from 'react';
import { Type, RotateCcw } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useFontSizeStore } from '@/shared/stores/fontSizeStore';

interface FontSizeToggleButtonProps {
  className?: string;
  variant?: 'icon' | 'menu-item';
}

export const FontSizeToggleButton: React.FC<FontSizeToggleButtonProps> = ({
  className,
}) => {
  const { scalePercent, setScalePercent, resetToDefault } = useFontSizeStore();
  const isDefault = scalePercent === 100;

  return (
    <div className={cn("p-2.5 flex flex-col gap-2 rounded-md", className)} style={{ direction: 'rtl' }}>
      {/* Label and Live Percentage */}
      <div className="flex items-center justify-between text-xs font-bold text-text-primary">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Type size={15} className="text-primary" />
          حجم الخطوط
        </span>
        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          {scalePercent}%
        </span>
      </div>

      {/* Slider Input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-text-muted">100%</span>
        <input
          type="range"
          min={100}
          max={200}
          step={5}
          value={scalePercent}
          onChange={(e) => setScalePercent(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
        />
        <span className="text-[10px] font-semibold text-text-muted">200%</span>
      </div>

      {/* Reset button if modified */}
      {!isDefault && (
        <button
          type="button"
          onClick={resetToDefault}
          className="flex items-center justify-center gap-1 w-full py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary hover:bg-accent rounded transition-colors cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>إعادة للافتراضي (100%)</span>
        </button>
      )}
    </div>
  );
};

export default FontSizeToggleButton;
