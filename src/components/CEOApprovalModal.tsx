import React, { useState, useEffect } from 'react';
import { Project, GanttRequirement, CEOApprovalDecision } from '../types';
import { formatCurrency } from '../utils/evmCalculations';
import { getTodayJalali, formatJalaliDate, toPersianDigits } from '../utils/jalali';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  BadgeCheck, 
  Clock, 
  SendHorizontal, 
  Building2, 
  Calendar, 
  DollarSign, 
  CheckCheck,
  TrendingUp,
  Sparkles,
  Calculator
} from 'lucide-react';
import { getFeasibilityBadge } from '../utils/roiCalculations';
import confetti from 'canvas-confetti';

interface CEOApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUserName?: string;
  onConfirmApproval: (projectId: number, updates: Partial<Project>) => void;
}

export const CEOApprovalModal: React.FC<CEOApprovalModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUserName = 'دکتر حمیدرضا رضایی (مدیرعامل)',
  onConfirmApproval,
}) => {
  const [decision, setDecision] = useState<CEOApprovalDecision>('approved');
  const [ceoOpinion, setCeoOpinion] = useState<string>('کلیات طرح با توجه به توجیه فنی و اقتصادی مورد تایید است.');
  const [ganttRequirement, setGanttRequirement] = useState<GanttRequirement>('مورد نیاز است');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [exemptFromFinancialCode, setExemptFromFinancialCode] = useState<boolean>(false);
  const [approverName, setApproverName] = useState<string>(currentUserName);
  const [approvalDate, setApprovalDate] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && project) {
      const [jy, jm, jd] = getTodayJalali();
      const todayStr = formatJalaliDate(jy, jm, jd, true);
      setApprovalDate(project.ceoApprovalDate || todayStr);
      setApproverName(project.ceoApproverName || currentUserName);
      setDecision(project.ceoApprovalStatus === 'rejected' ? 'rejected' : 'approved');
      setCeoOpinion(project.ceoOpinion || 'کلیات طرح با توجه به توجیه فنی و اقتصادی مورد تایید است.');
      setGanttRequirement(project.ganttRequirement || 'مورد نیاز است');
      setRejectionReason(project.ceoRejectionReason || '');
      setExemptFromFinancialCode(project.needsFinancialCode === false);
      setError('');
    }
  }, [isOpen, project, currentUserName]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (decision === 'rejected') {
      if (!rejectionReason.trim()) {
        setError('لطفاً دلایل و توضیحات عدم پذیرش پروژه را قید فرمایید تا به اطلاع مسئول پروژه برسد.');
        return;
      }

      onConfirmApproval(project.id, {
        ceoApprovalStatus: 'rejected',
        ceoRejectionReason: rejectionReason.trim(),
        ceoOpinion: ceoOpinion.trim() || undefined,
        ceoApprovalDate: approvalDate,
        ceoApproverName: approverName,
        status: 'under_review', // در حال تعیین تکلیف
        charterStatus: 'در حال تعیین تکلیف',
        ganttStatus: 'در انتظار تعیین تکلیف',
      });
      onClose();
      return;
    }

    // Decision is APPROVED
    let finalGanttStatus = 'مصوب';
    if (ganttRequirement === 'مورد نیاز نیست') {
      finalGanttStatus = 'فاقد گانت';
    } else if (ganttRequirement === 'فقط گزارشات مستمر پروژه ارائه شود') {
      finalGanttStatus = 'در حال تهیه';
    }

    const isExempt = exemptFromFinancialCode;
    const hasFinancialCode = Boolean(project.financialDetailCode && project.financialDetailCode.trim());

    // اگر معاف باشد یا کد تفضیلی داشته باشد -> مصوب و تایید شده
    const finalCharterStatus = (isExempt || hasFinancialCode) ? 'مصوب' : 'در حال تدوین';
    const finalProjectStatus = (isExempt || hasFinancialCode) ? 'active' : 'planning';

    onConfirmApproval(project.id, {
      ceoApprovalStatus: 'approved',
      ceoOpinion: ceoOpinion.trim(),
      ganttRequirement,
      ceoApprovalDate: approvalDate,
      ceoApproverName: approverName,
      ceoRejectionReason: undefined,
      needsFinancialCode: !isExempt,
      charterStatus: finalCharterStatus,
      ganttStatus: finalGanttStatus,
      status: finalProjectStatus,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-4 flex flex-col text-right max-h-[94vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/80 border border-indigo-400/30 text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-vazir">
                  کارتابل بررسی و تاییدیه مدیرعامل
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700">
                  {toPersianDigits(project.code)}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                تعیین تکلیف حاکمیتی طرح، الزام برنامه زمان‌بندی (گانت) و ارجاع به واحد مالی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-indigo-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Project Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">عنوان پروژه:</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {project.name}
                </h3>
              </div>
              <div className="text-left shrink-0">
                <span className="text-[11px] text-slate-400 block">بودجه مصوب (BAC):</span>
                <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(project.budgetBAC)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 block">درخواست‌کننده:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{project.requesterName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">واحد مسئول:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{project.responsibleUnit || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">مدیر پروژه:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{project.managerName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">مدت زمان مبنا:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{toPersianDigits(project.durationDays || 0)} روز</span>
              </div>
            </div>

            {project.rationale && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">علت و انگیزه تعریف پروژه:</span>
                <span className="text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">{project.rationale}</span>
              </div>
            )}
          </div>

          {/* ارزیابی توجیه اقتصادی و نرخ بازگشت سرمایه (ROI) برای تصمیم‌گیری مدیرعامل */}
          {project.roi ? (
            <div className="p-4 rounded-2xl bg-gradient-to-l from-emerald-950/30 via-slate-900 to-indigo-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Calculator className="w-4 h-4" />
                  <span>شاخص‌های ارزیابی اقتصادی و بازگشت سرمایه (ROI & Payback):</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getFeasibilityBadge(project.roi.feasibilityLevel).bg} ${getFeasibilityBadge(project.roi.feasibilityLevel).border} ${getFeasibilityBadge(project.roi.feasibilityLevel).textCol}`}>
                  {getFeasibilityBadge(project.roi.feasibilityLevel).label}
                </span>
              </div>

              {/* ۴ کارت کلیدی مالی */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">نرخ بازگشت (ROI)</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-400 mt-0.5 block">
                    {project.roi.roiPercentage > 0 ? '+' : ''}{project.roi.roiPercentage.toLocaleString('fa-IR')}٪
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">سود ناخالص پیش‌بینی</span>
                  <span className="font-mono font-bold text-xs text-indigo-300 mt-0.5 block">
                    {project.roi.netProfit.toLocaleString('fa-IR')} م.ت
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">دوره بازگشت سرمایه</span>
                  <span className="font-mono font-bold text-xs text-amber-300 mt-0.5 block">
                    {project.roi.paybackPeriodMonths.toLocaleString('fa-IR')} ماه
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">نسبت فایده/هزینه (BCR)</span>
                  <span className="font-mono font-bold text-xs text-sky-300 mt-0.5 block">
                    {project.roi.bcr}x
                  </span>
                </div>
              </div>

              {/* بیانیه دفاعیه و توجیه اقتصادی */}
              {project.roi.executivePitch && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-300 block mb-0.5">بیانیه توجیه اقتصادی و دفاعیه طرح:</span>
                    <p>{project.roi.executivePitch}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>اطلاعات تفصیلی ROI برای این طرح هنوز محاسبه نشده است.</span>
              <span className="text-[10px] text-indigo-500">قابل تکمیل در ویرایش شناسنامه</span>
            </div>
          )}

          {/* Decision Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              تصمیم و نتیجه بررسی مدیریت عامل <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Approve Option */}
              <button
                type="button"
                onClick={() => setDecision('approved')}
                className={`p-3.5 rounded-2xl border-2 text-right transition cursor-pointer flex items-center justify-between ${
                  decision === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">پروژه مورد تایید و مصوب است</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">تعیین تکلیف گانت و ارجاع به فرآیند مالی</div>
                  </div>
                </div>
                {decision === 'approved' && <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              </button>

              {/* Reject Option */}
              <button
                type="button"
                onClick={() => setDecision('rejected')}
                className={`p-3.5 rounded-2xl border-2 text-right transition cursor-pointer flex items-center justify-between ${
                  decision === 'rejected'
                    ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">عدم تایید (در حال تعیین تکلیف)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">ذکر علت و بازگرداندن به مسئول پروژه</div>
                  </div>
                </div>
                {decision === 'rejected' && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              </button>
            </div>
          </div>

          {/* If REJECTED -> Mandatory Reason Form */}
          {decision === 'rejected' && (
            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                <XCircle className="w-4 h-4" />
                <span>دلایل و توضیحات عدم پذیرش توسط مدیرعامل <span className="text-rose-500">*</span></span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                این پیام به عنوان بازخورد رسمی مدیریت ارشد ثبت شده و وضعیت پروژه در سیستم به <strong>«در حال تعیین تکلیف»</strong> تغییر می‌یابد تا مسئول پروژه از دلایل رد آگاه شود.
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="دلایل عدم توجیه اقتصادی/فنی، لزوم بازنگری در بودجه، یا عدم همخوانی با اولویت‌های کلان..."
                className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          {/* If APPROVED -> Opinion, Gantt Requirement & Financial Code Exemption */}
          {decision === 'approved' && (
            <div className="space-y-4">
              {/* CEO Opinion */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  نظر و رهنمودهای اجرایی مدیرعامل
                </label>
                <textarea
                  rows={2}
                  value={ceoOpinion}
                  onChange={(e) => setCeoOpinion(e.target.value)}
                  placeholder="نکات حائز اهمیت پیرامون رعایت زمان‌بندی، کنترل هزینه‌ها و نظارت بر پیمانکاران..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Gantt Requirement */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-950/50 border border-indigo-100 dark:border-slate-800 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  دستور مدیریت عامل در خصوص برنامه زمان‌بندی (گانت چارت) <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['مورد نیاز است', 'مورد نیاز نیست', 'فقط گزارشات مستمر پروژه ارائه شود'] as GanttRequirement[]).map((req) => (
                    <button
                      key={req}
                      type="button"
                      onClick={() => setGanttRequirement(req)}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                        ganttRequirement === req
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">{req}</span>
                      {ganttRequirement === req && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Financial Code Exemption Checkbox */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="exempt-financial"
                  checked={exemptFromFinancialCode}
                  onChange={(e) => setExemptFromFinancialCode(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="exempt-financial" className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed cursor-pointer">
                  <strong>این پروژه نیازی به تعریف کد تفضیلی مالی ندارد (معافیت).</strong>
                  <span className="block text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                    در صورت انتخاب این گزینه، پروژه بدون توقف در مرحله مالی، مستقیماً با عنوان «شناسنامه مصوب و تایید شده» در سامانه فعال می‌گردد.
                  </span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className="text-rose-500 text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </p>
          )}

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
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition cursor-pointer ${
                decision === 'rejected'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              <SendHorizontal className="w-4 h-4" />
              <span>{decision === 'rejected' ? 'ثبت عدم تایید و ارسال به مسئول پروژه' : 'ثبت تاییدیه نهایی مدیرعامل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
