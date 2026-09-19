import React, { useState, useEffect } from 'react';
import { User, UserRole, Organization } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { BrandLogo } from './BrandLogo';
import { 
  Building2, 
  Smartphone, 
  Lock, 
  ShieldCheck, 
  UserCheck, 
  Eye, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Briefcase, 
  Building, 
  UserPlus, 
  LogIn,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';

interface AuthScreenProps {
  users: User[];
  currentOrganization?: Organization;
  onLoginSuccess: (user: User) => void;
  onRegisterNewUser: (newUser: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  users,
  currentOrganization,
  onLoginSuccess,
  onRegisterNewUser,
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');

  // Login State
  const [loginPhone, setLoginPhone] = useState<string>('09121111111');
  const [loginPassword, setLoginPassword] = useState<string>('1234');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register Steps: 1: Phone, 2: OTP, 3: Profile Info
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regPhone, setRegPhone] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState<number>(120);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Profile Form State (Step 3)
  const [fullName, setFullName] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('1234');
  const [formError, setFormError] = useState<string | null>(null);

  // OTP Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, otpTimer]);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanPhone = loginPhone.trim();
    if (!cleanPhone) {
      setLoginError('لطفاً شماره همراه خود را وارد نمایید.');
      return;
    }

    if (!loginPassword) {
      setLoginError('لطفاً رمز عبور را وارد نمایید.');
      return;
    }

    // Find user by phone
    const foundUser = users.find(
      (u) => u.phone?.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '')
    );

    if (foundUser) {
      // Check password (default 1234 or user's password)
      const validPass = foundUser.password || '1234';
      if (loginPassword === validPass || loginPassword === '1234') {
        onLoginSuccess(foundUser);
        return;
      } else {
        setLoginError('رمز عبور وارد شده نادرست است. (رمز پیش‌فرض: 1234)');
        return;
      }
    }

    // If not found in pre-defined users, but matches standard phone format & password is 1234
    if (cleanPhone.length >= 10 && loginPassword === '1234') {
      // Auto create a profile or ask to register
      setLoginError('این شماره تلفن هنوز ثبت‌نام نشده است. لطفاً از تب «ثبت‌نام کاربر جدید» اقدام کنید.');
      return;
    }

    setLoginError('کاربری با این شماره همراه یافت نشد یا اطلاعات ورود نامعتبر است.');
  };

  // Step 1: Send OTP
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    const cleanPhone = regPhone.trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      setOtpError('لطفاً یک شماره همراه معتبر ۱۱ رقمی (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد نمایید.');
      return;
    }

    // Check if phone already registered
    const existing = users.find((u) => u.phone === cleanPhone);
    if (existing) {
      setOtpError('این شماره همراه قبلاً در سامانه ثبت شده است. لطفاً از تب «ورود به سامانه» استفاده کنید.');
      return;
    }

    // Start timer & move to Step 2
    setOtpTimer(120);
    setIsTimerRunning(true);
    setRegStep(2);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    // Hardcoded test code requested: "1234"
    if (otpCode.trim() === '1234') {
      setRegStep(3);
    } else {
      setOtpError('کد اعتبارسنجی وارد شده اشتباه است. (کد تستی سامانه: 1234)');
    }
  };

  // Step 3: Complete Registration
  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('لطفاً نام و نام خانوادگی خود را وارد نمایید.');
      return;
    }
    if (!position.trim()) {
      setFormError('لطفاً سمت سازمانی خود را مشخص کنید.');
      return;
    }
    if (!department.trim()) {
      setFormError('لطفاً واحد کاری خود را مشخص نمایید.');
      return;
    }

    const newUserId = Date.now();
    const newUser: User = {
      id: newUserId,
      username: `user_${regPhone.slice(-4)}`,
      fullName: fullName.trim(),
      role: 'Project_Controller', // Default initial role, awaiting admin review
      email: `${regPhone}@pmo-org.ir`,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      department: department.trim(),
      position: position.trim(),
      phone: regPhone.trim(),
      password: newPassword.trim() || '1234',
      isApproved: false, // New registered user needs admin role assignment/approval
      registeredAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
    };

    onRegisterNewUser(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden transition-colors duration-200" dir="rtl">
      
      {/* Top Left Theme Toggle Button */}
      <div className="absolute top-4 left-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-32 w-96 h-96 bg-sky-500/10 dark:bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <BrandLogo 
            size="lg" 
            className="mb-4 mx-auto" 
            customSrc={currentOrganization?.logoUrl}
            alt={currentOrganization?.name || 'لوگوی کیهان صنعت قائم'} 
          />
          <h1 className="text-2xl font-bold font-vazir text-slate-900 dark:text-white tracking-tight">
            {currentOrganization?.name || 'کیهان صنعت قائم'}
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {currentOrganization?.subtitle || 'سامانه جامع مدیریت و کنترل پروژه سازمان'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/60 transition-colors">
          
          {/* Navigation Tabs: Login vs Register */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
            <button
              id="tab-login-btn"
              onClick={() => {
                setActiveMode('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>ورود به سامانه</span>
            </button>
            <button
              id="tab-register-btn"
              onClick={() => {
                setActiveMode('register');
                setRegStep(1);
                setOtpError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>ثبت‌نام کاربر جدید</span>
            </button>
          </div>

          {/* MODE 1: LOGIN FORM */}
          {activeMode === 'login' && (
            <div className="space-y-5">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Phone Number Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>شماره تلفن همراه</span>
                    <span className="text-[10px] text-slate-500 font-mono">09xxxxxxxxx</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-login-phone"
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pl-10 text-left font-mono"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>رمز عبور</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">رمز پیش‌فرض: 1234</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pl-10 text-left font-mono tracking-widest"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  id="btn-login-submit"
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ورود به سامانه مدیریت پروژه</span>
                </button>
              </form>

              {/* Quick Demo Access Roles */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2.5 text-center">
                  ورود سریع با اکانت‌های تعریف‌شده (تست سطوح دسترسی):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {users.slice(0, 3).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setLoginPhone(u.phone || '');
                        setLoginPassword('1234');
                        onLoginSuccess(u);
                      }}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-right transition cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <img
                          src={u.avatar}
                          alt={u.fullName}
                          className="w-5 h-5 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                        />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white truncate">
                          {u.fullName.split(' ')[1] || u.fullName}
                        </span>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border inline-block ${
                        u.role === 'Admin'
                          ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20'
                          : u.role === 'Project_Controller'
                          ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
                      }`}>
                        {u.role === 'Admin' ? 'مدیر ارشد' : u.role === 'Project_Controller' ? 'کارشناس کنترل' : 'مدیر ناظر'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: MULTI-STEP REGISTRATION */}
          {activeMode === 'register' && (
            <div className="space-y-5">
              
              {/* Step Tracker Indicator */}
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                    regStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    ۱
                  </div>
                  <span className={`text-[11px] font-semibold ${regStep >= 1 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}>
                    شماره همراه
                  </span>
                </div>
                <div className={`flex-1 h-0.5 mx-2 ${regStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                    regStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    ۲
                  </div>
                  <span className={`text-[11px] font-semibold ${regStep >= 2 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}>
                    کد تایید
                  </span>
                </div>
                <div className={`flex-1 h-0.5 mx-2 ${regStep >= 3 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                    regStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    ۳
                  </div>
                  <span className={`text-[11px] font-semibold ${regStep >= 3 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}>
                    اطلاعات تکمیلی
                  </span>
                </div>
              </div>

              {/* STEP 1: ENTER PHONE */}
              {regStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                    برای شروع ثبت‌نام در سامانه PMO، لطفاً شماره تلفن همراه سازمانی خود را وارد نمایید تا کد تایید پیامکی ارسال گردد.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      شماره تلفن همراه
                    </label>
                    <div className="relative">
                      <input
                        id="input-register-phone"
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pl-10 text-left font-mono"
                        autoFocus
                      />
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {otpError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <button
                    id="btn-register-send-otp"
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>ارسال کد اعتبارسنجی پیامکی</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: VERIFY OTP */}
              {regStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/20 text-xs text-sky-800 dark:text-sky-200 leading-relaxed flex items-center justify-between">
                    <div>
                      <span>کد تایید ۴ رقمی به شماره </span>
                      <strong className="font-mono text-slate-900 dark:text-white">{regPhone}</strong>
                      <span> پیامک شد.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      ویرایش شماره
                    </button>
                  </div>

                  {/* Simulated Code Notice */}
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>کد تایید تستی و پیش‌فرض سامانه: <strong className="font-mono text-base text-amber-700 dark:text-amber-200">1234</strong></span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                      کد تایید پیامکی (OTP)
                    </label>
                    <input
                      id="input-register-otp"
                      type="text"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="1234"
                      className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500 rounded-xl px-3.5 py-3 text-center text-xl tracking-[0.5em] font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-600"
                      autoFocus
                    />
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    {isTimerRunning ? (
                      <span>
                        زمان باقی‌مانده تا ارسال مجدد: {Math.floor(otpTimer / 60)}:
                        {(otpTimer % 60).toString().padStart(2, '0')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpTimer(120);
                          setIsTimerRunning(true);
                          setOtpCode('');
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>ارسال مجدد کد تایید</span>
                      </button>
                    )}
                  </div>

                  {otpError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer border border-slate-200 dark:border-transparent"
                    >
                      مرحله قبل
                    </button>
                    <button
                      id="btn-verify-otp"
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تایید و تکمیل اطلاعات</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: PROFILE FORM */}
              {regStep === 3 && (
                <form onSubmit={handleCompleteRegistration} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    شماره شما با موفقیت تایید شد. لطفاً مشخصات هویتی و سازمانی خود را برای ایجاد حساب کاربری وارد نمایید:
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      نام و نام خانوادگی <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <input
                      id="input-reg-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: مهندس احسان احمدی"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>

                  {/* Organizational Position */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      سمت سازمانی <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-reg-position"
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="مثال: کارشناس کنترل پروژه، سرپرست کارگاه، ناظر مقیم"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 pl-10"
                      />
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      واحد کاری <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-reg-department"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="مثال: دفتر فنی و PMO، واحد عمران، امور قراردادها"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 pl-10"
                      />
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>کلمه عبور دلخواه برای ورودهای بعدی</span>
                      <span className="text-[10px] text-slate-500 font-mono">پیش‌فرض: 1234</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-reg-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="1234"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 pl-10 font-mono"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">توجه:</span> پس از ثبت‌نام اولیه، حساب کاربری شما ایجاد شده و در پرتال مدیر ارشد PMO قرار می‌گیرد تا سطح دسترسی نهایی و پروژه‌های مجاز برای شما تعیین گردد.
                  </div>

                  <button
                    id="btn-complete-register"
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تکمیل ثبت‌نام و ورود به صفحه اصلی</span>
                  </button>
                </form>
              )}

            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          سامانه تحت وب مدیریت پروژه یکپارچه بر پایه متدولوژی PMBOK و EVM
        </div>

      </div>

    </div>
  );
};
