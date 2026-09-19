import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, StatusHistoryEntry, User } from '../types';
import { getTodayJalali, formatJalaliDate } from '../utils/jalali';
import { 
  X, 
  AlertOctagon, 
  FileText, 
  SendHorizontal, 
  PauseCircle, 
  XCircle, 
  PlayCircle, 
  CheckCircle2, 
  History,
  Building2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';

interface ProjectStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser?: User;
  onConfirmStatusChange: (projectId: number, updates: Partial<Project>) => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string; desc: string; icon: any; color: string }[] = [
  { 
    value: 'on_hold', 
    label: 'متوقف (On Hold)', 
    desc: 'تعلیق موقت فعالیت‌ها بنا به مصوبه رسمی صورتجلسه',
    icon: PauseCircle,
    color: 'amber'
  },
  { 
    value: 'cancelled', 
    label: 'رد شده / مختومه (Cancelled)', 
    desc: 'ابطال یا لغو رسمی طرح بر اساس مصوبه هیئت مدیره یا کارفرما',
    icon: XCircle,
    color: 'rose'
  },
  { 
    value: 'active', 
    label: 'در حال انجام / فعال‌سازی مجدد (Active)', 
    desc: 'رفع موانع و شروع مجدد عملیات اجرایی پروژه',
    icon: PlayCircle,
    color: 'emerald'
  },
  { 
    value: 'completed', 
    label: 'خاتمه یافته (Completed)', 
    desc: 'تحویل موقت/قطعی و پایان عملیات پروژه',
    icon: CheckCircle2,
    color: 'teal'
  },
];

const AUTHORITY_OPTIONS = [
  'مصوبه هیئت مدیره',
  'کمیته عالی راهبری و پایش پروژه',
  'جلسه هماهنگی سازمانی و PMO',
  'دستور مستقیم مدیرعامل',
  'ابلاغیه رسمی کارفرما / مشاور',
  'سایر مراجع قانونی',
];

export const ProjectStatusChangeModal: React.FC<ProjectStatusChangeModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUser,
  onConfirmStatusChange,
}) => {
  const [targetStatus, setTargetStatus] = useState<ProjectStatus>('on_hold');
  const [meetingMinutesRef, setMeetingMinutesRef] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [decisionAuthority, setDecisionAuthority] = useState<string>('کمیته عالی راهبری و پایش پروژه');
  const [reason, setReason] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && project) {
      const [jy, jm, jd] = getTodayJalali();
      const todayStr = formatJalaliDate(jy, jm, jd, true);
      setMeetingDate(todayStr);
      setOfficerName(currentUser?.fullName || 'کارشناس کنترل پروژه');
      setTargetStatus(project.status === 'on_hold' ? 'active' : 'on_hold');
      setMeetingMinutesRef(project.meetingMinutesRef || '');
      setDecisionAuthority(project.decisionAuthority || 'کمیته عالی راهبری و پایش پروژه');
      setReason('');
      setErrors({});
    }
  }, [isOpen, project, currentUser]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!reason.trim()) {
      errs.reason = 'درج شرح و دلایل تغییر وضعیت الزامی است.';
    }

    if ((targetStatus === 'on_hold' || targetStatus === 'cancelled') && !meetingMinutesRef.trim()) {
      errs.meetingMinutesRef = 'شماره و بند صورتجلسه مصوب برای توقف یا رد پروژه الزامی است.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const [jy, jm, jd] = getTodayJalali();
    const changedAtStr = `${formatJalaliDate(jy, jm, jd, true)} - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;

    const newHistoryEntry: StatusHistoryEntry = {
      id: Date.now().toString(),
      fromStatus: project.status,
      toStatus: targetStatus,
      reason: reason.trim(),
      meetingMinutesRef: meetingMinutesRef.trim() || undefined,
      meetingDate: meetingDate || undefined,
      decisionAuthority,
      changedBy: officerName.trim(),
      changedAt: changedAtStr,
    };

    const existingHistory = project.statusHistory || [];

    onConfirmStatusChange(project.id, {
      status: targetStatus,
      statusChangeReason: reason.trim(),
      meetingMinutesRef: meetingMinutesRef.trim() || undefined,
      meetingDate: meetingDate || undefined,
      decisionAuthority,
      statusChangedBy: officerName.trim(),
      statusChangedAt: changedAtStr,
      statusHistory: [newHistoryEntry, ...existingHistory],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-4 flex flex-col text-right max-h-[94vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-l from-slate-900 via-slate-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-600/80 border border-amber-400/30 text-white shadow-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  تغییر وضعیت رسمی پروژه (مستند به صورتجلسه)
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {project.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                پنل ویژه کارشناس کنترل پروژه جهت ثبت توقف، لغو یا فعال‌سازی مجدد با سوابق مصوبات
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Project Details */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">پروژه هدف:</span>
              <span className="font-bold text-slate-900 dark:text-white text-xs">{project.name}</span>
            </div>
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block">وضعیت فعلی:</span>
              <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {project.status}
              </span>
            </div>
          </div>

          {/* Target Status Choice */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              انتخاب وضعیت جدید پروژه <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STATUS_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = targetStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTargetStatus(opt.value)}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <div className="font-bold text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Minutes Requirements (Mandatory for On Hold / Cancelled) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3.5">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>مستندات مصوبه رسمی و جلسه تغییر وضعیت</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* شماره و بند صورتجلسه */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  شماره و بند صورتجلسه <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={meetingMinutesRef}
                  onChange={(e) => setMeetingMinutesRef(e.target.value)}
                  placeholder="مثال: بند ۴ صورتجلسه شماره ۱۴۰۳/۱۸"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {errors.meetingMinutesRef && <p className="text-rose-500 text-[10px] mt-1">{errors.meetingMinutesRef}</p>}
              </div>

              {/* مرجع تصمیم‌گیرنده */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  مرجع تصویب‌کننده
                </label>
                <select
                  value={decisionAuthority}
                  onChange={(e) => setDecisionAuthority(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {AUTHORITY_OPTIONS.map((auth) => (
                    <option key={auth} value={auth}>{auth}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* تاریخ جلسه */}
              <div>
                <JalaliDatePicker
                  label="تاریخ جلسه مصوب"
                  value={meetingDate}
                  onChange={setMeetingDate}
                  placeholder="۱۴۰۳/۰۶/۰۱"
                />
              </div>

              {/* نام کارشناس ثبت کننده */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  کارشناس کنترل پروژه ثبت‌کننده
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Description & Detailed Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              شرح تفصیلی علل توقف / رد یا بازگشت به کار <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="شرح دقیق علل تصمیم‌گیری، مشکلات پیش‌آمده، عدم تامین مالی، تغییر اولویت‌ها یا رفع موانع..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.reason && <p className="text-rose-500 text-[10px] mt-1">{errors.reason}</p>}
          </div>

          {/* Previous History (if any) */}
          {project.statusHistory && project.statusHistory.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
                <History className="w-3.5 h-3.5" />
                <span>سوابق تغییر وضعیت‌های قبلی این پروژه</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {project.statusHistory.map((h) => (
                  <div key={h.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{h.toStatus}</span>
                      <span className="text-slate-400 mr-2">({h.reason})</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{h.changedAt}</span>
                  </div>
                ))}
              </div>
            </div>
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>ثبت رسمی تغییر وضعیت در سامانه</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
