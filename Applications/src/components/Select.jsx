import React, { useState, useRef, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { ChevronDown } from 'lucide-react';

/**
 * Custom Select Component
 * A dropdown select component with custom styling
 *
 * @param {Object} props
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Callback when value changes
 * @param {Array<{value: string, label: string}>} props.options - Array of options
 * @param {string} props.placeholder - Placeholder text when no value selected
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable the select
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {boolean} props.isDarkMode - Dark mode (optional, uses context if not provided)
 */
const Select = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
  size = 'md',
  isDarkMode: propIsDarkMode,
}) => {
  const contextIsDarkMode = useDarkMode();
  const isDarkMode = propIsDarkMode !== undefined ? propIsDarkMode : contextIsDarkMode;
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const handleSelect = (optValue) => {
    if (!disabled) {
      onChange(optValue);
      setIsOpen(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const baseClasses = `
    relative w-full flex items-center justify-between gap-2
    rounded-lg border font-medium transition-all
    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${sizeClasses[size]}
    ${isDarkMode
      ? 'bg-slate-800 border-slate-600 text-white hover:border-slate-500'
      : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
    }
    ${className}
  `;

  const dropdownClasses = `
    absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-lg border
    shadow-lg ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}
  `;

  const optionClasses = (isSelected, isHovered) => `
    px-3 py-2 text-sm cursor-pointer transition-colors
    ${isSelected
      ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
      : isHovered
        ? isDarkMode ? 'bg-slate-700 text-white' : 'bg-gray-50 text-gray-900'
        : isDarkMode ? 'text-slate-300' : 'text-gray-700'
    }
  `;

  return (
    <div ref={selectRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={baseClasses}
        disabled={disabled}
      >
        <span className="flex-1 text-left truncate">{displayValue}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={dropdownClasses}>
          {options.length === 0 ? (
            <div className={`px-3 py-2 text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={optionClasses(isSelected, false)}
                >
                  {option.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Select;
