import React, { useState } from 'react';
import { Organization } from '../types';
import { 
  X, 
  Building2, 
  Plus, 
  Sparkles, 
  Check, 
  ShieldCheck,
  Briefcase,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOrganization: (org: Organization) => void;
  existingOrganizations: Organization[];
}

const COLOR_THEMES = [
  { id: 'indigo', name: 'نیلی سازمانی', bg: 'bg-indigo-600', ring: 'ring-indigo-500', text: 'text-indigo-600' },
  { id: 'emerald', name: 'سبز صنعتی', bg: 'bg-emerald-600', ring: 'ring-emerald-500', text: 'text-emerald-600' },
  { id: 'teal', name: 'فیروزه‌ای مدرن', bg: 'bg-teal-600', ring: 'ring-teal-500', text: 'text-teal-600' },
  { id: 'amber', name: 'کهربایی معدنی', bg: 'bg-amber-600', ring: 'ring-amber-500', text: 'text-amber-600' },
  { id: 'rose', name: 'یاقوتی متالیک', bg: 'bg-rose-600', ring: 'ring-rose-500', text: 'text-rose-600' },
  { id: 'sky', name: 'آبی آسمانی', bg: 'bg-sky-600', ring: 'ring-sky-500', text: 'text-sky-600' },
];

export const NewOrganizationModal: React.FC<NewOrganizationModalProps> = ({
  isOpen,
  onClose,
  onSaveOrganization,
  existingOrganizations,
}) => {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [logoUrl, setLogoUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  // Auto-generate a shortcode from Persian words or acronym
  const handleNameChange = (val: string) => {
    setName(val);
    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
    
    // Suggest code if not edited
    if (!shortCode) {
      const words = val.trim().split(/\s+/);
      if (words.length >= 2) {
        const letters = words.map((w) => w[0]).join('').toUpperCase();
        setShortCode(`ORG-${letters}`);
      } else if (words.length === 1 && words[0].length > 1) {
        setShortCode(`ORG-${val.slice(0, 3).toUpperCase()}`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'نام کامل سازمان یا شرکت الزامی است.';
    if (!shortCode.trim()) errs.shortCode = 'کد یا شناسه اختصاری سازمان الزامی است.';

    // Check duplicate name
    const isDuplicate = existingOrganizations.some(
      (o) => o.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      errs.name = 'سازمانی با این نام از قبل وجود دارد.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const orgId = `org_${Date.now()}`;
    const newOrg: Organization = {
      id: orgId,
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      subtitle: subtitle.trim() || 'سامانه جامع مدیریت و کنترل پروژه سازمان',
      industry: industry.trim() || 'صنایع تولیدی و صنعتی',
      color: selectedColor,
      logoUrl: logoUrl.trim() || undefined,
      createdAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
    };

    onSaveOrganization(newOrg);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    onClose();
    setName('');
    setShortCode('');
    setSubtitle('');
    setIndustry('');
    setLogoUrl('');
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                تعریف و راه‌اندازی سازمان جدید
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ایجاد فضای کاری کاملاً اختصاصی و تفکیک‌شده برای شرکت تابعه
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* نام شرکت / سازمان */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              نام کامل سازمان / شرکت <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="مثال: پیستون سازان قائم"
              className={`w-full bg-white dark:bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${
                errors.name ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.name && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.name}</p>}
          </div>

          {/* شناسه اختصاری و حوزه صنعت */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                کد اختصاری شرکتی <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => {
                  setShortCode(e.target.value);
                  if (errors.shortCode) setErrors((prev) => ({ ...prev, shortCode: '' }));
                }}
                placeholder="مثال: PSG"
                className={`w-full bg-white dark:bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left ${
                  errors.shortCode ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.shortCode && <p className="text-rose-500 text-[11px] mt-1 font-semibold">{errors.shortCode}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                حوزه فعالیت و صنعت
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="مثال: قطعه‌سازی و ریخته‌گری خودرو"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* زیرعنوان و شعار سامانه در هدر */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان زیرتیتر سامانه (در بالای صفحه)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="مثال: سامانه تخصصی مدیریت و کنترل پروژه کارخانجات پیستون‌سازی"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* لوگوی اختصاصی سازمان */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              لوگوی سازمان (فایل در پوشه public یا بارگذاری تصویر)
            </label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="پیش‌نمایش" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="پیش‌فرض: /logo1.png"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  dir="ltr"
                />
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">
                    <span>بارگذاری فایل تصویر...</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                              setLogoUrl(ev.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      حذف و بازگشت به لوگوی پیش‌فرض
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              فایل لوگوی سازمانی به صورت پیش‌فرض از <code className="text-indigo-500 font-mono">/logo1.png</code> در پوشه <code className="text-indigo-500 font-mono">public/</code> فراخوانی می‌شود.
            </p>
          </div>

          {/* تم رنگی سازمانی */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              تم رنگی اختصاصی سازمان
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedColor(theme.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition cursor-pointer ${
                    selectedColor === theme.id
                      ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full ${theme.bg} flex items-center justify-center text-white shadow-xs`}>
                    {selectedColor === theme.id && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span className="text-[10px] text-slate-700 dark:text-slate-300">
                    {theme.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* نکته حفظ ایزولاسیون اطلاعات */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-relaxed">
              با ایجاد این سازمان، یک محیط مدیریت پروژه کاملاً مستقل و تمیز برای آن ساخته می‌شود. پروژه‌ها، گزارش‌ها و کاربران آن مجزا بوده و دسترسی به آن تنها در اختیار مدیر کل و افراد مجاز خواهد بود.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد سازمان و ورود به فضای کاری</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
