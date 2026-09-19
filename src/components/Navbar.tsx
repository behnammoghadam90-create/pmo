import React, { useState } from 'react';
import { User, AppNotification, Organization } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { BrandLogo } from './BrandLogo';
import { toPersianDigits } from '../utils/evmCalculations';
import { 
  ShieldCheck, 
  UserCheck, 
  Eye, 
  PlusCircle,
  FolderPlus,
  LogOut,
  Layers,
  Factory,
  Bell
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  users?: User[];
  currentOrganization?: Organization;
  organizations?: Organization[];
  onSelectOrganization?: (orgId: string) => void;
  onOpenNewOrganizationModal?: () => void;
  onSelectUser?: (user: User) => void;
  onLogout: () => void;
  onOpenNewReport: () => void;
  onOpenNewProject: () => void;
  onOpenAIAdvisor?: () => void;
  onSelectTab?: (tab: any) => void;
  onOpenProfile?: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismissNotification: (id: string) => void;
  onClearReadNotifications: () => void;
  onNotificationAction: (notif: AppNotification) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentOrganization,
  organizations = [],
  onSelectOrganization,
  onOpenNewOrganizationModal,
  onLogout,
  onOpenNewReport,
  onOpenNewProject,
  onOpenProfile,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  onClearReadNotifications,
  onNotificationAction,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'Admin':
        return {
          label: 'مدیر سیستم',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />,
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        };
      case 'Project_Controller':
        return {
          label: 'کارشناس کنترل پروژه',
          icon: <UserCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />,
          bg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
        };
      case 'Executive_Viewer':
        return {
          label: 'مدیر ارشد',
          icon: <Eye className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-2.5 transition-colors shadow-xs">
      <div className="flex items-center justify-between gap-4 max-w-[1600px] mx-auto">
        
        {/* 1. Official Logo & Company Name */}
        <div className="flex items-center gap-3.5">
          {/* Company Brand Logo Emblem (Loaded from /public/logo.svg or /public/logo.png or organization logoUrl) */}
          <BrandLogo 
            size="md" 
            customSrc={currentOrganization?.logoUrl} 
            alt={currentOrganization?.name || 'کیهان صنعت قائم'} 
          />

          {/* Company Name & Organization Switcher */}
          {currentOrganization ? (
            <OrganizationSwitcher
              currentOrganization={currentOrganization}
              organizations={organizations}
              currentUser={currentUser}
              onSelectOrganization={onSelectOrganization || (() => {})}
              onOpenNewOrganizationModal={onOpenNewOrganizationModal || (() => {})}
            />
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold font-vazir text-lg sm:text-xl text-slate-900 dark:text-white tracking-normal leading-tight">
                  کیهان صنعت قائم
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
                  PMO
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                سامانه جامع مدیریت و کنترل پروژه سازمان
              </p>
            </div>
          )}
        </div>

        {/* 2. Center Quick Action Shortcuts (Clean & Focused) */}
        <div className="hidden md:flex items-center gap-2.5">
          {currentUser.role !== 'Executive_Viewer' && (
            <button
              id="btn-nav-new-report"
              onClick={onOpenNewReport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
              title="ثبت گزارش پیشرفت هفتگی پروژه‌ها"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت گزارش پیشرفت هفتگی</span>
            </button>
          )}

          {currentUser.role === 'Admin' && (
            <button
              id="btn-nav-new-project"
              onClick={onOpenNewProject}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="تعریف و ثبت پروژه سازمانی جدید"
            >
              <FolderPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>تعریف پروژه جدید</span>
            </button>
          )}
        </div>

        {/* 3. User Controls, Notifications & Theme Mode */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Notifications Bell Icon Button & Flyout Dropdown */}
          <div className="relative">
            <button
              id="btn-nav-notifications"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`relative p-2 sm:p-2.5 rounded-xl border transition cursor-pointer shadow-2xs group ${
                isNotificationOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="مرکز اعلان‌ها و هشدارهای پروژه‌ها"
            >
              <Bell className="w-4 h-4 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              
              {/* Notification active dot / count indicator */}
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 px-1.5 min-w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
                  {toPersianDigits(unreadCount)}
                </span>
              ) : (
                notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )
              )}
            </button>

            {/* Notification Center Dropdown Panel */}
            <NotificationCenter
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              notifications={notifications}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onDismissNotification={onDismissNotification}
              onClearReadNotifications={onClearReadNotifications}
              onNotificationAction={onNotificationAction}
              currentUser={currentUser}
            />
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="flex items-center">
            <ThemeToggle variant="compact" />
          </div>

          {/* Current User Avatar & Badge (Clickable for Profile modal) */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
            <button
              id="btn-nav-user-profile"
              onClick={onOpenProfile}
              type="button"
              className="flex items-center gap-2.5 p-1 sm:p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 transition-all cursor-pointer group text-right"
              title="مشاهده و ویرایش مشخصات پروفایل کاربری"
            >
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 ring-2 ring-slate-100 dark:ring-slate-800 group-hover:scale-105 group-hover:ring-indigo-400 dark:group-hover:ring-indigo-500 transition-transform"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <div className="hidden xl:block text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                  <span>{currentUser.fullName}</span>
                </div>
                <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border mt-0.5 ${badge.bg}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
              </div>
            </button>

            {/* Logout button */}
            <button
              id="btn-nav-logout"
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition cursor-pointer"
              title="خروج از حساب کاربری"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};

