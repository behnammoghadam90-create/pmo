import React from 'react';
import { ActiveTab, User, Organization } from '../types';
import { toPersianDigits } from '../utils/evmCalculations';
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileSpreadsheet, 
  Users2, 
  TrendingUp, 
  LineChart, 
  ShieldCheck, 
  CheckCircle2, 
  Building2,
  UserCheck,
  ChevronDown,
  ArrowLeftRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User;
  users?: User[];
  currentOrganization?: Organization;
  onSelectUser?: (user: User) => void;
  projectsCount: number;
  reportsCount: number;
  onOpenAIAdvisor?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  users = [],
  currentOrganization,
  onSelectUser,
  projectsCount,
  reportsCount,
  onOpenProfile,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'داشبورد مدیریتی پورتفولیو',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'projects' as ActiveTab,
      label: 'پروژه‌ها و محدوده کاری',
      icon: FolderKanban,
      badge: projectsCount,
    },
    {
      id: 'weekly_reports' as ActiveTab,
      label: 'گزارش‌های پیشرفت هفتگی',
      icon: FileSpreadsheet,
      badge: reportsCount,
    },
    {
      id: 'evm_analytics' as ActiveTab,
      label: 'ماتریس تحلیلی EVM',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'scurve_analytics' as ActiveTab,
      label: 'منحنی‌های پیشرفت S-Curve',
      icon: LineChart,
      badge: null,
    },
    {
      id: 'assignments' as ActiveTab,
      label: 'تخصیص کاربران و دسترسی‌ها',
      icon: Users2,
      badge: null,
    },
  ];

  return (
    <aside className="w-full lg:w-72 bg-white/80 dark:bg-slate-900/60 lg:min-h-[calc(100vh-61px)] border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 transition-colors">
      <div className="space-y-6">
        
        {/* Active Role Status Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>سطح دسترسی شما:</span>
            <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
              RBAC
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              {currentUser.role === 'Admin' && 'مدیر کل سیستم (دسترسی کامل)'}
              {currentUser.role === 'Project_Controller' && 'کارشناس کنترل پروژه (ثبت داده)'}
              {currentUser.role === 'Executive_Viewer' && 'مدیر ارشد (مشاهده و پایش)'}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {currentUser.role === 'Admin' && 'امکان تعریف پروژه، تغییر تخصیص‌ها و نظارت بر کلیه گزارش‌های ثبت‌شده سازمان.'}
            {currentUser.role === 'Project_Controller' && 'ثبت و ویرایش گزارش‌های پیشرفت فیزیکی و مالی برای پروژه‌های مجاز.'}
            {currentUser.role === 'Executive_Viewer' && 'مشاهده داشبوردهای کلان، نمودارهای روند پیشرفت و بررسی شاخص‌های سلامت پورتفولیو.'}
          </p>
        </div>

        {/* Navigation List */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-3 uppercase tracking-wider mb-2">
            بخش‌های سامانه
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-500/30 text-indigo-800 dark:text-indigo-200'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                    }`}
                  >
                    {toPersianDigits(item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Switcher Section (Right under Assignments & Access menu) */}
        {users && users.length > 0 && onSelectUser && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                <span>تغییر کاربر فعال (سوییچ نقش)</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {toPersianDigits(users.length)} کاربر
              </span>
            </div>

            <div className="relative">
              <select
                id="sidebar-select-active-user"
                value={currentUser.id}
                onChange={(e) => {
                  const selected = users.find((u) => u.id === Number(e.target.value));
                  if (selected) onSelectUser(selected);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl px-3 py-2 pr-8 pl-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none text-right shadow-2xs transition-all"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} — {u.role === 'Admin' ? 'مدیر سیستم' : u.role === 'Project_Controller' ? 'کنترل پروژه' : 'مدیر ارشد'}
                  </option>
                ))}
              </select>

              <UserCheck className="w-4 h-4 text-indigo-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Active User Quick Card */}
            <div 
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer group"
              title="مشاهده و ویرایش مشخصات پروفایل"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-indigo-300 dark:ring-indigo-700 group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="min-w-0 flex-1 text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate flex items-center justify-between">
                  <span>{currentUser.role === 'Admin' ? 'مدیر ارشد PMO' : currentUser.role === 'Project_Controller' ? 'کارشناس کنترل پروژه' : 'مدیر ناظر پورتفولیو'}</span>
                  <span className="text-[9px] text-slate-400 group-hover:text-indigo-500 transition">ویرایش ✎</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 transition-colors">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-vazir font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={currentOrganization?.name || 'کیهان صنعت قائم'}>
            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{currentOrganization?.name || 'کیهان صنعت قائم'}</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-mono">
            {currentOrganization?.shortCode || 'PMO'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>متدولوژی کنترل پروژه:</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold">PMBOK / EVM</span>
        </div>
      </div>
    </aside>
  );
};
