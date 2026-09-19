import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { getTodayJalali, formatJalaliDate } from '../utils/jalali';
import { formatCurrency } from '../utils/evmCalculations';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Building2, 
  SendHorizontal, 
  Info,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FinancialCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUserName?: string;
  onSaveFinancialCode: (projectId: number, financialCode: string, officerName: string, approvalDate: string) => void;
}

export const FinancialCodeModal: React.FC<FinancialCodeModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUserName = 'امور مالی و حسابداری پروژه‌ها',
  onSaveFinancialCode,
}) => {
  const [financialCode, setFinancialCode] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>(currentUserName);
  const [approvalDate, setApprovalDate] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && project) {
      const [jy, jm, jd] = getTodayJalali();
      const todayStr = formatJalaliDate(jy, jm, jd, true);
      setApprovalDate(project.financialApprovalDate || todayStr);
      setOfficerName(project.financialOfficerName || currentUserName);
      
      if (project.financialDetailCode) {
        setFinancialCode(project.financialDetailCode);
      } else {
        const seq = project.code.replace(/[^0-9]/g, '') || '2606';
        setFinancialCode(`1104-90-${seq}`);
      }
      setError('');
    }
  }, [isOpen, project, currentUserName]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!financialCode.trim()) {
      setError('ورود کد تفضیلی مالی الزامی است.');
      return;
    }

    onSaveFinancialCode(project.id, financialCode.trim(), officerName.trim(), approvalDate);

    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-4 flex flex-col text-right">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-l from-emerald-900 via-teal-950 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-600/80 border border-emerald-400/30 text-white shadow-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  تخصیص کد تفضیلی مالی پروژه
                </h2>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                تکمیل شناسنامه و فعال‌سازی رسمی پروژه در سیستم یکپارچه مالی و PMO
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          
          {/* Project Header Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                {project.code}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(project.budgetBAC)}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
              {project.name}
            </h3>
            {project.ceoOpinion && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <strong className="text-indigo-600 dark:text-indigo-400">نظر مدیرعامل:</strong> {project.ceoOpinion}
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              با ثبت کد تفضیلی مالی، این پروژه به عنوان <strong>«شناسنامه مصوب و تایید شده»</strong> در لیست پروژه‌ها قرار گرفته و عملیات ثبت سند و پرداخت‌های مالی آن مجاز می‌گردد.
            </p>
          </div>

          {/* Input Code */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              کد تفضیلی مالی پروژه (سیستم حسابداری) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={financialCode}
              onChange={(e) => setFinancialCode(e.target.value)}
              placeholder="مثال: 1104-90-2606"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-mono text-left font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {error && <p className="text-rose-500 text-[10px] mt-1">{error}</p>}
          </div>

          {/* Officer & Date */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                ثبت‌کننده / کارشناس مالی
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                تاریخ تخصیص کد
              </label>
              <input
                type="text"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono text-center"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>ثبت و تایید شناسنامه مصوب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
