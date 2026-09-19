import React, { useState, useRef, useEffect } from 'react';
import { Organization, User } from '../types';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  ShieldCheck,
  Building,
  ArrowRightLeft
} from 'lucide-react';

interface OrganizationSwitcherProps {
  currentOrganization: Organization;
  organizations: Organization[];
  currentUser: User;
  onSelectOrganization: (orgId: string) => void;
  onOpenNewOrganizationModal: () => void;
}

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  currentOrganization,
  organizations,
  currentUser,
  onSelectOrganization,
  onOpenNewOrganizationModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is allowed to switch organizations
  const isSuperAdmin = currentUser.role === 'Admin' || currentUser.isSuperAdmin === true;
  const userAllowedOrgs = currentUser.allowedOrganizationIds || [currentUser.organizationId || 'org_keyhan'];
  
  // Available organizations for this user
  const accessibleOrgs = organizations.filter((org) => {
    if (isSuperAdmin) return true;
    return userAllowedOrgs.includes(org.id);
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If user cannot switch and has access to only 1 org, just display the plain name
  if (!isSuperAdmin && accessibleOrgs.length <= 1) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-bold font-vazir text-lg sm:text-xl text-slate-900 dark:text-white tracking-normal leading-tight">
            {currentOrganization.name}
          </h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 font-mono">
            {currentOrganization.shortCode}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
          {currentOrganization.subtitle || 'سامانه جامع مدیریت و کنترل پروژه سازمان'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable Header Brand Section for Admins / Multi-Org Users */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-right p-1.5 -m-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer group"
        title="کلیک جهت جابه‌جایی یا تعریف سازمان جدید"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold font-vazir text-lg sm:text-xl text-slate-900 dark:text-white tracking-normal leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {currentOrganization.name}
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 font-mono">
              {currentOrganization.shortCode}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {currentOrganization.subtitle || 'سامانه جامع مدیریت و کنترل پروژه سازمان'}
          </p>
        </div>
      </button>

      {/* Switcher Dropdown Flyout */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 text-right">
          
          {/* Dropdown Header */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>انتخاب فضای کاری سازمان</span>
            </div>
            {isSuperAdmin && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                مدیر کل
              </span>
            )}
          </div>

          {/* List of Organizations */}
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {accessibleOrgs.map((org) => {
              const isSelected = org.id === currentOrganization.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    onSelectOrganization(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {org.shortCode.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${
                        isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-900 dark:text-white'
                      }`}>
                        {org.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {org.industry || 'فضای کاری مجزا'}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mr-2">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>فعال</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add New Organization Action (Super Admins only) */}
          {isSuperAdmin && (
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewOrganizationModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تعریف سازمان جدید (+)</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
