import React, { useState, useEffect, useMemo } from 'react';
import { Project, WeeklyProgressReport, User, TrafficLightStatus, ProjectStatus, ProjectAssignment } from '../types';
import { calculateEVM, formatCurrency, formatPercent } from '../utils/evmCalculations';
import { JalaliDatePicker } from './JalaliDatePicker';
import { 
  calculateDeliveryDelayDays, 
  toPersianDigits 
} from '../utils/jalali';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  TrendingUp,
  UserCheck,
  Building,
  Hash,
  Clock,
  AlertCircle,
  Sparkles,
  PlayCircle,
  PauseCircle,
  FileSearch,
  CheckCheck,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WeeklyReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  assignments: ProjectAssignment[];
  currentUser: User;
  selectedProjectId?: number;
  editingReport?: WeeklyProgressReport | null;
  onSaveReport: (report: Omit<WeeklyProgressReport, 'id' | 'createdAt'>, existingReportId?: number) => void;
}

export const WeeklyReportFormModal: React.FC<WeeklyReportFormModalProps> = ({
  isOpen,
  onClose,
  projects,
  assignments,
  currentUser,
  selectedProjectId,
  editingReport,
  onSaveReport,
}) => {
  // Filter available projects for user
  const availableProjects = useMemo(() => {
    if (currentUser.role === 'Admin') return projects;
    // For Project_Controller: only assigned projects
    const assignedProjectIds = assignments
      .filter((a) => a.userId === currentUser.id && a.isActive)
      .map((a) => a.projectId);
    return projects.filter((p) => assignedProjectIds.includes(p.id));
  }, [projects, assignments, currentUser]);

  const [projectId, setProjectId] = useState<number>(
    editingReport?.projectId || selectedProjectId || availableProjects[0]?.id || 1
  );

  // Active project object
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === projectId) || projects[0];
  }, [projects, projectId]);

  // Project Status State (Planning / Active / On_Hold / Completed)
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    editingReport?.projectStatus || currentProject?.status || 'active'
  );

  // Date States
  const [reportDate, setReportDate] = useState<string>(editingReport?.reportDate || '۱۴۰۳/۰۶/۰۷');
  const [baselineStartDate, setBaselineStartDate] = useState<string>(
    editingReport?.reportingPeriodStart || currentProject?.baselineStartDate || '۱۴۰۳/۰۱/۱۵'
  );
  const [baselineFinishDate, setBaselineFinishDate] = useState<string>(
    editingReport?.reportingPeriodEnd || currentProject?.baselineFinishDate || '۱۴۰۴/۱۲/۲۹'
  );

  // EVM Inputs (For Active status)
  const [plannedValuePct, setPlannedValuePct] = useState<number>(editingReport?.plannedValuePct ?? 60.0);
  const [earnedValuePct, setEarnedValuePct] = useState<number>(editingReport?.earnedValuePct ?? 58.5);
  const [actualCost, setActualCost] = useState<number>(editingReport?.actualCost ?? 27000);

  // Qualitative Fields
  const [keyIssues, setKeyIssues] = useState<string>(editingReport?.keyIssuesAndDelays || '');
  const [correctiveActions, setCorrectiveActions] = useState<string>(editingReport?.correctiveActions || '');
  const [trafficLightStatus, setTrafficLightStatus] = useState<TrafficLightStatus>(editingReport?.trafficLightStatus || 'green');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Synchronize state whenever modal opens or editingReport changes
  useEffect(() => {
    if (isOpen) {
      if (editingReport) {
        setProjectId(editingReport.projectId);
        setReportDate(editingReport.reportDate || '۱۴۰۳/۰۶/۰۷');
        const proj = projects.find((p) => p.id === editingReport.projectId);
        setBaselineStartDate(editingReport.reportingPeriodStart || proj?.baselineStartDate || '۱۴۰۳/۰۱/۱۵');
        setBaselineFinishDate(editingReport.reportingPeriodEnd || proj?.baselineFinishDate || '۱۴۰۴/۱۲/۲۹');
        setProjectStatus(editingReport.projectStatus || proj?.status || 'active');
        setPlannedValuePct(editingReport.plannedValuePct);
        setEarnedValuePct(editingReport.earnedValuePct);
        setActualCost(editingReport.actualCost);
        setKeyIssues(editingReport.keyIssuesAndDelays || '');
        setCorrectiveActions(editingReport.correctiveActions || '');
        setTrafficLightStatus(editingReport.trafficLightStatus || 'green');
        setErrors({});
      } else {
        const initialProjId = selectedProjectId || availableProjects[0]?.id || 1;
        setProjectId(initialProjId);
        const proj = projects.find((p) => p.id === initialProjId);
        if (proj) {
          setBaselineStartDate(proj.baselineStartDate || '۱۴۰۳/۰۱/۱۵');
          setBaselineFinishDate(proj.baselineFinishDate || '۱۴۰۴/۱۲/۲۹');
          setProjectStatus(proj.status || 'active');
        }
        setReportDate('۱۴۰۳/۰۶/۰۷');
        setPlannedValuePct(60.0);
        setEarnedValuePct(58.5);
        setActualCost(27000);
        setKeyIssues('');
        setCorrectiveActions('');
        setTrafficLightStatus('green');
        setErrors({});
      }
    }
  }, [isOpen, editingReport, selectedProjectId]);

  // Auto-sync project status, baseline start and finish dates whenever project changes in new report mode
  useEffect(() => {
    if (currentProject && !editingReport) {
      setBaselineStartDate(currentProject.baselineStartDate || '');
      setBaselineFinishDate(currentProject.baselineFinishDate || '');
      setProjectStatus(currentProject.status || 'active');
    }
  }, [currentProject, editingReport]);

  // Delivery delay calculation based on baseline finish date vs report date
  const deliveryDelayInfo = useMemo(() => {
    if (!baselineFinishDate) return { delayDays: 0, isDelayed: false, finishDateDisplay: '-' };
    return calculateDeliveryDelayDays(baselineFinishDate, reportDate);
  }, [baselineFinishDate, reportDate]);

  // Live EVM calculation
  const liveEVM = useMemo(() => {
    if (!currentProject) return calculateEVM(0, plannedValuePct, earnedValuePct, actualCost);
    return calculateEVM(
      currentProject.budgetBAC,
      plannedValuePct,
      earnedValuePct,
      actualCost
    );
  }, [currentProject, plannedValuePct, earnedValuePct, actualCost]);

  // Sync suggested traffic light status automatically when in active mode
  useEffect(() => {
    if (projectStatus === 'active') {
      setTrafficLightStatus(liveEVM.status);
    } else if (projectStatus === 'on_hold') {
      setTrafficLightStatus('red');
    } else if (projectStatus === 'planning') {
      setTrafficLightStatus('yellow');
    } else if (projectStatus === 'completed') {
      setTrafficLightStatus('green');
    }
  }, [liveEVM.status, projectStatus]);

  // Update projectId if selectedProjectId prop changes
  useEffect(() => {
    if (selectedProjectId) {
      setProjectId(selectedProjectId);
    } else if (availableProjects.length > 0 && !availableProjects.some((p) => p.id === projectId)) {
      setProjectId(availableProjects[0].id);
    }
  }, [selectedProjectId, availableProjects]);

  if (!isOpen) return null;

  const isRestrictedMode = projectStatus === 'planning' || projectStatus === 'on_hold';

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!projectId) {
      errs.projectId = 'انتخاب پروژه الزامی است.';
    }

    if (!reportDate) {
      errs.reportDate = 'تاریخ ثبت گزارش الزامی است.';
    }

    if (!keyIssues.trim()) {
      errs.keyIssues = isRestrictedMode
        ? 'در این وضعیت، تشریح دلایل توقف/بررسی یا مهم‌ترین موانع الزامی است.'
        : 'شرح وضعیت اجرایی یا مهم‌ترین موانع این هفته الزامی است.';
    }

    // Only validate EVM metrics if in active mode
    if (projectStatus === 'active') {
      if (isNaN(plannedValuePct) || plannedValuePct < 0 || plannedValuePct > 100) {
        errs.plannedValuePct = 'درصد پیشرفت برنامه‌ای (PV) باید حتماً بین ۰ تا ۱۰۰ درصد باشد.';
      }

      if (isNaN(earnedValuePct) || earnedValuePct < 0 || earnedValuePct > 100) {
        errs.earnedValuePct = 'درصد پیشرفت واقعی (EV) باید حتماً بین ۰ تا ۱۰۰ درصد باشد.';
      }

      if (isNaN(actualCost) || actualCost < 0) {
        errs.actualCost = 'هزینه واقعی (AC) نمی‌تواند منفی باشد.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const plannedCost = currentProject ? (plannedValuePct * currentProject.budgetBAC) / 100 : 0;
    const earnedValueCost = currentProject ? (earnedValuePct * currentProject.budgetBAC) / 100 : 0;

    onSaveReport(
      {
        projectId,
        reportDate,
        weekNumber: editingReport ? editingReport.weekNumber : 1,
        reportingPeriodStart: baselineStartDate,
        reportingPeriodEnd: baselineFinishDate,
        plannedValuePct: isRestrictedMode ? 0 : Number(plannedValuePct.toFixed(2)),
        earnedValuePct: isRestrictedMode ? 0 : Number(earnedValuePct.toFixed(2)),
        actualCost: isRestrictedMode ? 0 : Number(actualCost.toFixed(2)),
        plannedCost: isRestrictedMode ? 0 : Number(plannedCost.toFixed(2)),
        earnedValueCost: isRestrictedMode ? 0 : Number(earnedValueCost.toFixed(2)),
        keyIssuesAndDelays: keyIssues,
        correctiveActions,
        trafficLightStatus,
        projectStatus,
        submittedById: editingReport ? editingReport.submittedById : currentUser.id,
      },
      editingReport?.id
    );

    // Fire celebration
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingReport ? 'ویرایش و اصلاح گزارش پیشرفت هفتگی' : 'ثبت فرم گزارش پیشرفت هفتگی پروژه'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-right bg-white dark:bg-slate-900">
          
          {/* Section 1: Project Selection */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                انتخاب پروژه <span className="text-rose-500">*</span>
              </label>
              <select
                id="form-select-project"
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name} - بودجه BAC: {formatCurrency(p.budgetBAC)}
                  </option>
                ))}
              </select>
              {errors.projectId && <p className="text-rose-500 dark:text-rose-400 text-[11px] mt-1">{errors.projectId}</p>}
            </div>

            {/* Auto-filled Project Details Card: Project Code, Responsible Person, Responsible Unit */}
            {currentProject && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-950/70 border border-indigo-100 dark:border-slate-800 transition-all">
                
                {/* Project Code (Auto) */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">کد پروژه</span>
                    <span className="text-xs font-bold font-mono text-indigo-700 dark:text-indigo-300">
                      {currentProject.code}
                    </span>
                  </div>
                </div>

                {/* Responsible Person / Project Manager */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">نام مسئول پروژه</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {currentProject.managerName || 'تعیین نشده'}
                    </span>
                  </div>
                </div>

                {/* Responsible Unit / Category */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">نام واحد مسئول پروژه</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {currentProject.category || 'واحد فنی و مهندسی'}
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Section 2: Project Status Selection (وضعیت پروژه) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              وضعیت پروژه: <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Option 1: در حال بررسی (Planning / In Review) */}
              <button
                type="button"
                onClick={() => setProjectStatus('planning')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 ${
                  projectStatus === 'planning'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-2 rounded-xl ${projectStatus === 'planning' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">در حال بررسی</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">امکان‌سنجی / بازبینی</span>
                </div>
              </button>

              {/* Option 2: در حال انجام (Active / In Progress) */}
              <button
                type="button"
                onClick={() => setProjectStatus('active')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 ${
                  projectStatus === 'active'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-2 rounded-xl ${projectStatus === 'active' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">در حال انجام</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">عملیات اجرایی فعال</span>
                </div>
              </button>

              {/* Option 3: متوقف (On Hold / Stopped) */}
              <button
                type="button"
                onClick={() => setProjectStatus('on_hold')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 ${
                  projectStatus === 'on_hold'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-2 rounded-xl ${projectStatus === 'on_hold' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  <PauseCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">متوقف</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">تعلیق یا توقف موقت</span>
                </div>
              </button>

              {/* Option 4: پایان یافته (Completed) */}
              <button
                type="button"
                onClick={() => setProjectStatus('completed')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 ${
                  projectStatus === 'completed'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-2 rounded-xl ${projectStatus === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">پایان یافته</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">تحویل نهایی شده</span>
                </div>
              </button>

            </div>
          </div>

          {/* Section 3: Dates Row with Jalali Date Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <JalaliDatePicker
              id="form-date-report"
              label="تاریخ ثبت گزارش"
              value={reportDate}
              onChange={setReportDate}
              placeholder="۱۴۰۳/۰۶/۰۷"
            />
            <div>
              <JalaliDatePicker
                id="form-date-baseline-start"
                label="تاریخ شروع مبنا (شناسنامه پروژه)"
                value={baselineStartDate}
                onChange={setBaselineStartDate}
                placeholder="۱۴۰۳/۰۱/۱۵"
              />
            </div>
            <div>
              <JalaliDatePicker
                id="form-date-baseline-finish"
                label="تاریخ پایان مصوب (شناسنامه پروژه)"
                value={baselineFinishDate}
                onChange={setBaselineFinishDate}
                placeholder="۱۴۰۴/۱۲/۲۹"
              />
            </div>
          </div>

          {/* Conditional Rendering based on Project Status */}
          {isRestrictedMode ? (
            /* Information Alert for "در حال بررسی" or "متوقف" */
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  پروژه در وضعیت «{projectStatus === 'planning' ? 'در حال بررسی' : 'متوقف'}» قرار دارد
                </span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                در این حالت نیازی به ثبت و تغییر درصدهای پیشرفت فیزیکی (PV% / EV%) و هزینه‌های اجرایی (AC) نمی‌باشد و این محاسبات موقتاً متوقف هستند. لطفاً در قسمت زیر، <strong>شرح مهم‌ترین موانع، علل توقف/بررسی</strong> و همچنین <strong>اقدامات اصلاحی و راهکارهای جبرانی</strong> را جهت پیگیری در جلسات پایش PMO تکمیل فرمایید.
              </p>
            </div>
          ) : projectStatus === 'completed' ? (
            /* Information Alert for "پایان یافته" */
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>پروژه به اتمام رسیده و تحویل گردیده است</span>
              </div>
              <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                کلیه تعهدات اجرایی پروژه پایان یافته است. در صورت نیاز به ثبت نکات پایانی، گزارش تحویل موقت/قطعی یا درس‌آموخته‌های پروژه، می‌توانید در فیلدهای پایین درج نمایید.
              </p>
            </div>
          ) : (
            /* Full EVM Section for "در حال انجام" (Active) */
            <>
              {/* Section 4: Core EVM Progress Numbers (PV%, EV%, AC) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-br dark:from-indigo-950/30 dark:to-slate-950 border border-slate-200 dark:border-indigo-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ثبت پیشرفت فیزیکی و مالی (اعتبارسنجی بازه ۰ تا ۱۰۰ درصد)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    بودجه مبنا (BAC): {formatCurrency(currentProject?.budgetBAC || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Planned Value (PV%) */}
                  <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        درصد برنامه‌ای (PV%):
                      </label>
                      <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatPercent(plannedValuePct)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={plannedValuePct}
                      onChange={(e) => setPlannedValuePct(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <input
                      id="form-input-pv-pct"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={plannedValuePct}
                      onChange={(e) => setPlannedValuePct(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-indigo-500"
                    />
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                      معادل مالی PV: {formatCurrency(liveEVM.pvValue)}
                    </div>
                    {errors.plannedValuePct && <p className="text-rose-500 dark:text-rose-400 text-[10px]">{errors.plannedValuePct}</p>}
                  </div>

                  {/* Earned Value (EV%) */}
                  <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        درصد واقعی (EV%):
                      </label>
                      <span className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">
                        {formatPercent(earnedValuePct)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={earnedValuePct}
                      onChange={(e) => setEarnedValuePct(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <input
                      id="form-input-ev-pct"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={earnedValuePct}
                      onChange={(e) => setEarnedValuePct(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-sky-500"
                    />
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                      معادل مالی EV: {formatCurrency(liveEVM.evValue)}
                    </div>
                    {errors.earnedValuePct && <p className="text-rose-500 dark:text-rose-400 text-[10px]">{errors.earnedValuePct}</p>}
                  </div>

                  {/* Actual Cost (AC) */}
                  <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        هزینه واقعی (AC):
                      </label>
                      <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                        {Math.round(actualCost).toLocaleString('fa-IR')} م.ت
                      </span>
                    </div>
                    <div className="pt-2">
                      <input
                        id="form-input-ac-value"
                        type="number"
                        min="0"
                        step="50"
                        value={actualCost}
                        onChange={(e) => setActualCost(Number(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-mono text-center focus:outline-none focus:border-rose-500"
                        placeholder="مبلغ به میلیون تومان"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                      کل مخارج مالی ثبت‌شده تا این تاریخ
                    </div>
                    {errors.actualCost && <p className="text-rose-500 dark:text-rose-400 text-[10px]">{errors.actualCost}</p>}
                  </div>

                </div>

                {/* Live EVM Calculations Summary Banner */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    محاسبه‌گر آنی شاخص‌های EVM بر مبنای داده‌های فرم:
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">انحراف زمان (SV)</span>
                      <span className={`font-mono font-bold ${liveEVM.sv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {liveEVM.sv >= 0 ? '+' : ''}{liveEVM.sv.toLocaleString('fa-IR')} م.ت
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">انحراف هزینه (CV)</span>
                      <span className={`font-mono font-bold ${liveEVM.cv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {liveEVM.cv >= 0 ? '+' : ''}{liveEVM.cv.toLocaleString('fa-IR')} م.ت
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">شاخص زمان (SPI)</span>
                      <span className={`font-mono font-bold ${liveEVM.spi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : liveEVM.spi >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {liveEVM.spi}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">شاخص هزینه (CPI)</span>
                      <span className={`font-mono font-bold ${liveEVM.cpi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : liveEVM.cpi >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {liveEVM.cpi}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-700 dark:text-slate-300">
                    <span>برآورد هزینه کل در اتمام (EAC): <strong>{formatCurrency(liveEVM.eac)}</strong></span>
                    <span>انحراف نهایی بودجه (VAC): <strong className={liveEVM.vac >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{formatCurrency(liveEVM.vac)}</strong></span>
                  </div>
                </div>

              </div>

              {/* Section 5: Traffic Light Status (RAG) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  وضعیت چراغ راهنمایی پروژه:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    id="btn-rag-green"
                    onClick={() => setTrafficLightStatus('green')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition ${
                      trafficLightStatus === 'green'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-md shadow-emerald-500/20 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs">سبز (عادی و مطلوب)</span>
                  </button>

                  <button
                    type="button"
                    id="btn-rag-yellow"
                    onClick={() => setTrafficLightStatus('yellow')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition ${
                      trafficLightStatus === 'yellow'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 shadow-md shadow-amber-500/20 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs">زرد (هشدار انحراف)</span>
                  </button>

                  <button
                    type="button"
                    id="btn-rag-red"
                    onClick={() => setTrafficLightStatus('red')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition ${
                      trafficLightStatus === 'red'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 shadow-md shadow-rose-500/20 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs">قرمز (بحرانی)</span>
                  </button>
                </div>
              </div>

              {/* Section 6: Delivery Delay Duration (مدت زمان تاخیر در تحویل) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${
                      deliveryDelayInfo.isDelayed 
                        ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                        : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        مدت زمان تاخیر در تحویل پروژه
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        تاریخ پایان مصوب: <strong className="font-mono text-slate-700 dark:text-slate-200">{baselineFinishDate || '-'}</strong> | تاریخ گزارش: <strong className="font-mono text-slate-700 dark:text-slate-200">{reportDate}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Delay Badge */}
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono self-start sm:self-auto flex items-center gap-1.5 ${
                    deliveryDelayInfo.isDelayed
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {deliveryDelayInfo.isDelayed ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{toPersianDigits(deliveryDelayInfo.delayDays)} روز گذشته از موعد پایان</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {deliveryDelayInfo.delayDays === 0
                            ? 'امروز موعد تحویل است'
                            : `${toPersianDigits(Math.abs(deliveryDelayInfo.delayDays))} روز تا موعد پایان مصوب`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Description message box */}
                <div className={`p-3 rounded-xl text-xs border ${
                  deliveryDelayInfo.isDelayed
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {deliveryDelayInfo.isDelayed ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong>هشدار تاخیر در تحویل:</strong> از تاریخ پایان مصوب و خط مبنای این پروژه (<strong>{baselineFinishDate}</strong>) به میزان <strong>{toPersianDigits(deliveryDelayInfo.delayDays)} روز</strong> گذشته است. لطفا در بخش اقدامات اصلاحی، راهکارهای جبرانی و علت‌های اصلی تاخیر را تشریح فرمایید.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        پروژه طبق برنامه زمان‌بندی مبنا در بازه زمانی مجاز قرار دارد و <strong>{toPersianDigits(Math.abs(deliveryDelayInfo.delayDays))} روز</strong> تا تاریخ اتمام مصوب (<strong>{baselineFinishDate}</strong>) فرصت باقی است.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Section 7: Delays & Corrective Actions (Always Available) */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                شرح مهم‌ترین موانع، علل تاخیر یا ریسک‌های هفته <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="form-textarea-key-issues"
                rows={3}
                value={keyIssues}
                onChange={(e) => setKeyIssues(e.target.value)}
                placeholder={
                  isRestrictedMode
                    ? "علت بررسی مجدد، معارضین، موانع حقوقی/فنی یا دلایل توقف کار را شرح دهید..."
                    : "توضیح دهید چه عواملی (مانند معارضین، کمبود متریال، قطعی برق، عدم تایید مشاور، تاخیرات پیمانکار) باعث انحراف یا کندی شده‌اند..."
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {errors.keyIssues && <p className="text-rose-500 dark:text-rose-400 text-[11px] mt-1">{errors.keyIssues}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                اقدامات اصلاحی و راهکارهای جبرانی
              </label>
              <textarea
                id="form-textarea-corrective-actions"
                rows={2}
                value={correctiveActions}
                onChange={(e) => setCorrectiveActions(e.target.value)}
                placeholder={
                  isRestrictedMode
                    ? "برنامه و شروط لازم برای شروع مجدد یا خروج از حالت توقف/بررسی..."
                    : "اقدامات پیشنهادی نظیر فشرده‌سازی زمان‌بندی (Crashing)، موازی‌کاری (Fast-Tracking) یا تزریق نقدینگی..."
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              id="btn-form-submit-report"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingReport ? 'ذخیره اصلاحات گزارش' : 'ذخیره نهایی گزارش پیشرفت'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
