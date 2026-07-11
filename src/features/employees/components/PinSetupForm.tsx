import { useRef, useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PinSetupFormProps {
  value: string;
  onChange: (pin: string) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
}

const PinSetupForm = ({ value, onChange, error, label, disabled = false }: PinSetupFormProps) => {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('');

  useEffect(() => {
    // Focus the first empty input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = useCallback((index: number, digit: string) => {
    if (disabled) return;

    // Only allow digits
    if (digit && !/^\d$/.test(digit)) return;

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newPin = newDigits.join('');
    onChange(newPin);

    // Auto-focus next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits, onChange, disabled]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      // RTL: Arrow left goes to previous (visually right)
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      // RTL: Arrow right goes to next (visually left)
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits, disabled]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      onChange(pasted);
      // Focus the next empty or last input
      const focusIndex = Math.min(pasted.length, 3);
      inputRefs.current[focusIndex]?.focus();
    }
  }, [onChange, disabled]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <div className="flex gap-2" dir="ltr">
          {[0, 1, 2, 3].map((index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={1}
              className={`w-12 h-12 text-center text-xl font-mono font-bold border rounded-lg bg-background text-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                error ? 'border-status-danger-border' : 'border-border'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              value={digits[index] || ''}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              autoComplete="one-time-code"
            />
          ))}
        </div>
        <button
          type="button"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-muted/50 transition-colors"
          onClick={() => setShowPin(!showPin)}
          tabIndex={-1}
          disabled={disabled}
          title={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
        >
          {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-status-danger-text mt-1.5">{error}</p>
      )}
    </div>
  );
};

export default PinSetupForm;
