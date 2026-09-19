import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'compact' | 'full' | 'pill';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'compact',
  className = '' 
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  if (variant === 'pill') {
    return (
      <div 
        className={`inline-flex items-center bg-slate-200/80 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-sm transition-colors ${className}`}
        dir="rtl"
      >
        <button
          type="button"
          onClick={() => isDark && toggleTheme()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            !isDark
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="پوسته روشن"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>روشن</span>
        </button>
        <button
          type="button"
          onClick={() => !isDark && toggleTheme()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isDark
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="پوسته تاریک"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>تاریک</span>
        </button>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <button
        id="btn-theme-toggle-full"
        type="button"
        onClick={toggleTheme}
        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition shadow-sm cursor-pointer ${className}`}
        title={isDark ? 'تغییر به پوسته روشن' : 'تغییر به پوسته تاریک'}
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span>{isDark ? 'پوسته تاریک (Dark Mode)' : 'پوسته روشن (Light Mode)'}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-mono">
          {isDark ? 'تاریک' : 'روشن'}
        </span>
      </button>
    );
  }

  // Compact variant (default for Navbar)
  return (
    <button
      id="btn-theme-toggle-compact"
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-400 border-slate-700 hover:border-amber-400/40 shadow-sm shadow-black/20'
          : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-300 hover:border-indigo-400/60 shadow-sm shadow-slate-200'
      } ${className}`}
      title={isDark ? 'تغییر به صفحه روشن (Light Mode)' : 'تغییر به صفحه تاریک (Dark Mode)'}
      aria-label="تغییر تم سامانه"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
      )}
      <span className="sr-only">{isDark ? 'روشن' : 'تاریک'}</span>
    </button>
  );
};
