import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppNotification, NotificationCategory, Project, User } from '../types';
import { toPersianDigits } from '../utils/evmCalculations';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckCircle2,
  FileText,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  X,
  CheckCheck,
  Trash2,
  ExternalLink,
  ChevronLeft,
  Calendar,
  Layers,
  Inbox
} from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismissNotification: (id: string) => void;
  onClearReadNotifications: () => void;
  onNotificationAction: (notif: AppNotification) => void;
  currentUser: User;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  onClearReadNotifications,
  onNotificationAction,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | NotificationCategory>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.isRead).length;
    const evmAlerts = notifications.filter((n) => n.category === 'evm_alert').length;
    const approvals = notifications.filter((n) => n.category === 'approval_workflow').length;
    const deadlines = notifications.filter((n) => n.category === 'deadline_reminder').length;

    return { total, unread, evmAlerts, approvals, deadlines };
  }, [notifications]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: NotificationCategory, severity: AppNotification['severity']) => {
    if (category === 'evm_alert') {
      return severity === 'critical' ? (
        <AlertOctagon className="w-4 h-4 text-rose-500" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      );
    }
    if (category === 'approval_workflow') {
      return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
    }
    return <Clock className="w-4 h-4 text-sky-500" />;
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'evm_alert':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
            انحراف EVM
          </span>
        );
      case 'approval_workflow':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            فرآیند و تاییدیه
          </span>
        );
      case 'deadline_reminder':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/50">
            موعد و سررسید
          </span>
        );
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 sm:left-auto sm:right-auto sm:origin-top-left top-full mt-2.5 w-[92vw] sm:w-[460px] md:w-[500px] max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150"
      style={{ left: '-10px' }}
    >
      {/* 1. Header */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                مرکز اعلان‌ها و هشدارهای سیستم
              </h3>
              {stats.unread > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                  {toPersianDigits(stats.unread)} جدید
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              هشدارهای انحراف، کارتابل تاییدیه‌ها و سررسیدهای کلیدی
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Category Filter Tabs */}
      <div className="p-2.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>همه</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700">
              {toPersianDigits(stats.total)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('evm_alert')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'evm_alert'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shadow-2xs border border-rose-200 dark:border-rose-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>هشدارهای انحراف EVM</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
              {toPersianDigits(stats.evmAlerts)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approval_workflow')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approval_workflow'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-indigo-200 dark:border-indigo-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>تاییدیه‌ها</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
              {toPersianDigits(stats.approvals)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('deadline_reminder')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'deadline_reminder'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-2xs border border-sky-200 dark:border-sky-900/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>موعدها</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
              {toPersianDigits(stats.deadlines)}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Quick Actions Toolbar */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <div className="text-slate-500 dark:text-slate-400">
            <span>نمایش </span>
            <strong className="text-slate-800 dark:text-slate-200 font-bold">
              {toPersianDigits(filteredNotifications.length)}
            </strong>
            <span> مورد</span>
          </div>

          <div className="flex items-center gap-3">
            {stats.unread > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>خواندن همه</span>
              </button>
            )}

            <button
              onClick={onClearReadNotifications}
              className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
              title="پاک‌سازی موارد خوانده‌شده"
            >
              <Trash2 className="w-3 h-3" />
              <span>پاک‌سازی</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Notification Items List (Scrollable) */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[460px] p-2 space-y-1.5">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              هیچ اعلانی در این دسته وجود ندارد
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              تمامی رویدادها و انحرافات پورتفولیو بررسی و رسیدگی شده‌اند.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isCritical = notif.severity === 'critical';
            const isWarning = notif.severity === 'warning';

            return (
              <div
                key={notif.id}
                className={`p-3 rounded-xl transition-all relative border group ${
                  !notif.isRead
                    ? isCritical
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                      : isWarning
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'
                      : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/40'
                    : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                }`}
              >
                {/* Top Row: Category, Timestamp & Actions */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(notif.category, notif.severity)}
                    {getCategoryBadge(notif.category)}
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{notif.timestamp}</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismissNotification(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition"
                      title="حذف اعلان"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4
                    className={`text-xs font-bold leading-snug ${
                      !notif.isRead
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {notif.description}
                  </p>
                </div>

                {/* Footer Action Button */}
                {notif.actionType && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between">
                    <button
                      onClick={() => {
                        onMarkAsRead(notif.id);
                        onNotificationAction(notif);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition shadow-2xs cursor-pointer"
                    >
                      <span>{notif.actionLabel || 'مشاهده و اقدام'}</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    {!notif.isRead && (
                      <button
                        onClick={() => onMarkAsRead(notif.id)}
                        className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-medium transition cursor-pointer"
                      >
                        علامت به‌عنوان خوانده‌شده
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer Info */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>پایش هوشمند و بلادرنگ شاخص‌های پورتفولیو</span>
        <span className="font-mono">PMO Live Engine</span>
      </div>
    </div>
  );
};
