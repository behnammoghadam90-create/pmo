import React, { useState, useId } from 'react';
import { User, Project } from '../types';
import { toPersianDigits } from '../utils/evmCalculations';
import {
  X,
  User as UserIcon,
  Shield,
  KeyRound,
  Phone,
  Mail,
  Building,
  Briefcase,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Upload,
  Layers,
  FolderKanban,
  Calendar,
  Check,
  ShieldCheck
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  projects?: Project[];
  showToast: (msg: string) => void;
}

// Preset avatars for quick enterprise selection
const PRESET_AVATARS = [
  {
    id: 'avatar-1',
    label: 'مدیر مهندسی ۱',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-2',
    label: 'مدیر پروژه زن ۱',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-3',
    label: 'کارشناس کنترل پروژه ۱',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-4',
    label: 'مدیر ارشد اجرایی',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-5',
    label: 'مهندس ناظر ارشد',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-6',
    label: 'کارشناس برنامه‌ریزی زن',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-7',
    label: 'مهندس تاسیسات',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-8',
    label: 'کارشناس PMO',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  projects = [],
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'security' | 'permissions'>('profile');

  // Form State
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [position, setPosition] = useState(currentUser.position || '');
  const [department, setDepartment] = useState(currentUser.department || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFullName(currentUser.fullName);
      setUsername(currentUser.username);
      setPosition(currentUser.position || '');
      setDepartment(currentUser.department || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setAvatar(currentUser.avatar);
      setCustomAvatarUrl('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // File upload for avatar (convert to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('حجم تصویر نباید بیشتر از ۲ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
          showToast('تصویر جدید انتخاب شد.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customAvatarUrl.trim()) {
      showToast('لطفاً آدرس اینترنتی تصویر را وارد فرمایید.');
      return;
    }
    setAvatar(customAvatarUrl.trim());
    showToast('آواتار از طریق لینک اختصاصی اعمال شد.');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!fullName.trim()) {
      showToast('نام و نام خانوادگی نمی‌تواند خالی باشد.');
      return;
    }

    // Handle password change validation if entered
    let updatedPassword = currentUser.password;
    if (newPassword || confirmPassword || currentPassword) {
      if (currentUser.password && currentPassword !== currentUser.password) {
        setPasswordError('رمز عبور فعلی واردشده نادرست است.');
        setActiveTab('security');
        return;
      }
      if (newPassword.length < 4) {
        setPasswordError('رمز عبور جدید باید حداقل ۴ نویسه باشد.');
        setActiveTab('security');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('رمز عبور جدید با تکرار آن مطابقت ندارد.');
        setActiveTab('security');
        return;
      }
      updatedPassword = newPassword;
    }

    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
      username: username.trim() || currentUser.username,
      position: position.trim(),
      department: department.trim(),
      phone: phone.trim(),
      email: email.trim(),
      avatar: avatar || currentUser.avatar,
      password: updatedPassword,
    };

    onUpdateUser(updated);
    showToast('مشخصات و تغییرات پروفایل شما با موفقیت ذخیره شد.');
    onClose();
  };

  // Projects supervised count
  const myProjectsCount = projects.filter(
    (p) => p.managerName?.includes(currentUser.fullName) || p.responsibleUnit?.includes(currentUser.department)
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 text-right"
        dir="rtl"
      >
        
        {/* 1. Modal Top Banner & Header */}
        <div className="relative bg-gradient-to-l from-indigo-600 to-indigo-800 dark:from-indigo-950 dark:to-slate-900 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <img
                src={avatar}
                alt={fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg"
              />
              <button
                type="button"
                onClick={() => setActiveTab('avatar')}
                className="absolute -bottom-1.5 -left-1.5 p-1.5 rounded-xl bg-white text-indigo-600 dark:bg-slate-800 dark:text-indigo-400 shadow-md hover:scale-105 transition cursor-pointer"
                title="تغییر عکس پروفایل"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Intro Info */}
            <div className="text-center sm:text-right min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black">{fullName || 'کاربر سیستم'}</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
                  {currentUser.role === 'Admin'
                    ? 'مدیر ارشد سیستم (Admin)'
                    : currentUser.role === 'Project_Controller'
                    ? 'کارشناس کنترل پروژه'
                    : 'مدیر ارشد ناظر'}
                </span>
              </div>
              <p className="text-xs text-indigo-100 dark:text-slate-300 mt-1">
                {position || 'سمت سازمانی مشخص نشده'} • {department || 'دفتر مدیریت پروژه'}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-indigo-200 dark:text-slate-400 mt-2 font-mono">
                <span>شناسه: {currentUser.username}</span>
                <span>•</span>
                <span>عضویت: {toPersianDigits(currentUser.registeredAt || '۱۴۰۲/۰۷/۱۵')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>مشخصات فردی و سازمانی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('avatar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'avatar'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>تصویر و آواتار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>امنیت و رمز عبور</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نقش و دسترسی‌ها</span>
          </button>
        </div>

        {/* 3. Tab Contents Form */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: General Info */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثلاً: مهندس علیرضا حسینی"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    نام کاربری / نام ورود (Username)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin_pmo"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                      dir="ltr"
                    />
                    <Shield className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Position / Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سمت سازمانی و عنوان شغلی
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="مثلاً: مدیر دفتر PMO / کارشناس ارشد کنترل پروژه"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <Briefcase className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    واحد سازمانی / دپارتمان
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="مثلاً: واحد برنامه‌ریزی و کنترل پروژه"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <Building className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    شماره تلفن همراه / تماس
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09121234567"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                      dir="ltr"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    پست الکترونیکی سازمانی (Email)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                      dir="ltr"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

              </div>

              {/* Quick Summary Note */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  مشخصات شما در تمامی بخش‌های سامانه از جمله امضاکننده گزارشات پیشرفت، صورتجلسات و بخش تخصیص پروژه‌ها نمایش داده خواهد شد.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Avatar Gallery & Upload */}
          {activeTab === 'avatar' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                  انتخاب از میان آواتارهای سازمانی استاندارد
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  یکی از تصاویر رسمی زیر را با کلیک انتخاب کنید:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((p) => {
                    const isSelected = avatar === p.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setAvatar(p.url)}
                        className={`p-2 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center truncate w-full">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload or Custom URL */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  یا بارگذاری تصویر از دستگاه / لینک اینترنتی
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File Upload */}
                  <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/60 transition cursor-pointer text-center">
                    <Upload className="w-5 h-5 text-indigo-500 mb-1.5" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      انتخاب فایل عکس از سیستم
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      فرمت‌های JPG، PNG (حداکثر ۲ مگابایت)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Custom URL Input */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      آدرس اینترنتی تصویر (Image URL)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-left"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomUrl}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shrink-0 cursor-pointer"
                      >
                        اعمال
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Security & Password */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  جهت تغییر رمز عبور، رمز فعلی حساب کاربری را وارد فرمایید. در صورت عدم تمایل به تغییر رمز، فیلدهای زیر را خالی بگذارید.
                </span>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رمز عبور فعلی
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 pl-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                      dir="ltr"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      رمز عبور جدید
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="حداقل ۴ نویسه"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 pl-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                        dir="ltr"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      تکرار رمز عبور جدید
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="تکرار رمز جدید"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-left"
                        dir="ltr"
                      />
                      <CheckCircle2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Permissions Overview */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    سطح دسترسی و نقش سازمانی
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {currentUser.role === 'Admin'
                      ? 'مدیر ارشد سیستم (Full Admin)'
                      : currentUser.role === 'Project_Controller'
                      ? 'کارشناس کنترل پروژه (Controller)'
                      : 'مدیر ارشد ناظر (Executive Viewer)'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>مشاهده کامل داشبوردهای پورتفولیو و نمودارهای تحلیلی S-Curve</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${currentUser.role !== 'Executive_Viewer' ? 'text-emerald-500' : 'text-slate-400'} shrink-0`} />
                    <span className={currentUser.role === 'Executive_Viewer' ? 'line-through text-slate-400' : ''}>
                      ثبت و ویرایش گزارشات پیشرفت هفتگی و شاخص‌های EVM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${currentUser.role === 'Admin' ? 'text-emerald-500' : 'text-slate-400'} shrink-0`} />
                    <span className={currentUser.role !== 'Admin' ? 'line-through text-slate-400' : ''}>
                      تایید مصوبات مدیرعامل، تخصیص دسترسی کاربران و ایجاد پروژه جدید
                    </span>
                  </div>
                </div>
              </div>

              {/* Workload Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold block">
                    پروژه‌های تحت نظارت
                  </span>
                  <span className="text-xl font-bold font-vazir text-indigo-950 dark:text-indigo-200 mt-1 block">
                    {toPersianDigits(myProjectsCount)} پروژه
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                    وضعیت حساب
                  </span>
                  <span className="text-xl font-bold font-vazir text-emerald-950 dark:text-emerald-200 mt-1 block">
                    فعال و معتبر
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ذخیره مشخصات و تغییرات</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
