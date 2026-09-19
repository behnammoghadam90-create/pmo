import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsRight, 
  ChevronsLeft, 
  X, 
  Check 
} from 'lucide-react';
import { 
  PERSIAN_MONTH_NAMES, 
  PERSIAN_WEEK_DAYS, 
  toPersianDigits, 
  getJalaliMonthDays, 
  getJalaliFirstDayOfMonth, 
  getTodayJalali, 
  formatJalaliDate, 
  parseJalaliDate 
} from '../utils/jalali';

interface JalaliDatePickerProps {
  id?: string;
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
  displayPersianDigits?: boolean;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  id,
  value,
  onChange,
  label,
  placeholder = '۱۴۰۳/۰۶/۰۱',
  disabled = false,
  error,
  required = false,
  className = '',
  displayPersianDigits = true,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const parsedValue = useMemo(() => parseJalaliDate(value), [value]);
  const [todayY, todayM, todayD] = useMemo(() => getTodayJalali(), []);

  // View state for browsing calendar (Year & Month)
  const [viewYear, setViewYear] = useState<number>(parsedValue ? parsedValue[0] : todayY);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue ? parsedValue[1] : todayM);

  // When value changes from outside, sync view if open
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue[0]);
      setViewMonth(parsedValue[1]);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePrevYear = () => {
    setViewYear((y) => y - 1);
  };

  const handleNextYear = () => {
    setViewYear((y) => y + 1);
  };

  // Select day
  const handleSelectDay = (day: number) => {
    const formatted = formatJalaliDate(viewYear, viewMonth, day, displayPersianDigits);
    onChange(formatted);
    setIsOpen(false);
  };

  // Quick select Today
  const handleSelectToday = () => {
    setViewYear(todayY);
    setViewMonth(todayM);
    const formatted = formatJalaliDate(todayY, todayM, todayD, displayPersianDigits);
    onChange(formatted);
    setIsOpen(false);
  };

  // Calculate days in current view month and day offset
  const daysInMonth = useMemo(() => getJalaliMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const firstDayOffset = useMemo(() => getJalaliFirstDayOfMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  // Years for quick dropdown (e.g. 1395 to 1415)
  const yearsList = useMemo(() => {
    const years = [];
    for (let y = 1395; y <= 1415; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Field with Calendar Button */}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full bg-slate-50 dark:bg-slate-900 border ${
            error
              ? 'border-rose-500 ring-1 ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500'
          } rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono text-left pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'cursor-pointer'
          }`}
          dir="ltr"
        />

        <button
          type="button"
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          disabled={disabled}
          aria-label="انتخاب تاریخ از تقویم"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="text-rose-500 dark:text-rose-400 text-[11px] mt-1">{error}</p>}

      {/* Popover Calendar Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-50 mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-900 dark:text-white transition-all transform origin-top right-0 sm:right-auto sm:left-0 select-none animate-in fade-in zoom-in-95 duration-150"
          dir="rtl"
        >
          
          {/* Header Controls: Month, Year, and Nav Arrows */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            {/* Year & Month Selectors */}
            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {PERSIAN_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold font-mono text-xs rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                title="سال قبل"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="ماه قبل"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                title="ماه بعد"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                title="سال بعد"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {PERSIAN_WEEK_DAYS.map((day) => (
              <div
                key={day.key}
                title={day.name}
                className={`text-[11px] font-bold py-1 ${
                  day.isWeekend ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {day.label}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank spaces before 1st of month */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                parsedValue &&
                parsedValue[0] === viewYear &&
                parsedValue[1] === viewMonth &&
                parsedValue[2] === day;

              const isToday =
                todayY === viewYear &&
                todayM === viewMonth &&
                todayD === day;

              const dayOfWeek = (firstDayOffset + i) % 7;
              const isFriday = dayOfWeek === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-full rounded-xl text-xs font-semibold font-mono flex items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-105'
                      : isToday
                      ? 'border border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                      : isFriday
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {toPersianDigits(day)}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 font-semibold transition cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <span>امروز ({toPersianDigits(`${todayY}/${String(todayM).padStart(2, '0')}/${String(todayD).padStart(2, '0')}`)})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-[11px]"
            >
              بستن
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
