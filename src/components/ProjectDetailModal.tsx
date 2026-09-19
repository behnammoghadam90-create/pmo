import React, { useMemo } from 'react';
import { Project, WeeklyProgressReport, User, ProjectAssignment } from '../types';
import { calculateEVM, formatCurrency, formatPercent, getStatusBadge, toPersianDigits } from '../utils/evmCalculations';
import { 
  X, 
  Building2, 
  Calendar, 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck,
  Plus,
  BarChart3,
  Clock,
  ShieldCheck,
  FileText,
  Layers,
  Calculator,
  Sparkles
} from 'lucide-react';
import { ProjectROICalculator } from './ProjectROICalculator';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  reports: WeeklyProgressReport[];
  assignments: ProjectAssignment[];
  users: User[];
  currentUser: User;
  onOpenNewReport: (projectId: number) => void;
  onOpenActivities?: (project: Project) => void;
  onUpdateProject?: (updatedProject: Project) => void;
  onEditReport?: (report: WeeklyProgressReport) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  reports,
  assignments,
  users,
  currentUser,
  onOpenNewReport,
  onOpenActivities,
  onUpdateProject,
  onEditReport,
}) => {
  const projectReports = useMemo(() => {
    if (!project) return [];
    return reports
      .filter((r) => r.projectId === project.id)
      .sort((a, b) => a.weekNumber - b.weekNumber);
  }, [reports, project?.id]);

  if (!project) return null;

  const latestReport = projectReports[projectReports.length - 1];
  const evm = calculateEVM(
    project.budgetBAC,
    latestReport?.plannedValuePct || 0,
    latestReport?.earnedValuePct || 0,
    latestReport?.actualCost || 0
  );
  const badge = getStatusBadge(evm.status);

  // S-Curve chart data
  const sCurveData = projectReports.map((r) => {
    const pStart = r.reportingPeriodStart || r.reportDate;
    const pEnd = r.reportingPeriodEnd || r.reportDate;
    return {
      week: `از ${pStart} تا ${pEnd}`,
      PV_pct: r.plannedValuePct,
      EV_pct: r.earnedValuePct,
      PV_Cost: Math.round(r.plannedCost || 0),
      EV_Cost: Math.round(r.earnedValueCost || 0),
      AC_Cost: Math.round(r.actualCost || 0),
    };
  });

  const assignedUsers = assignments
    .filter((a) => a.projectId === project.id && a.isActive)
    .map((a) => ({
      user: users.find((u) => u.id === a.userId),
      roleInProject: a.roleInProject,
    }))
    .filter((item) => item.user !== undefined);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col text-right">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {toPersianDigits(project.code)}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${badge.bg} ${badge.textCol} ${badge.border}`}>
                {badge.text}
              </span>
              <span className="text-xs text-slate-400">{project.category}</span>
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight">{project.name}</h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">{project.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              صرفاً جهت مشاهده (غیرقابل ویرایش)
            </span>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Key Facts Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">بودجه کل مصوب (BAC)</span>
              <span className="text-sm font-bold text-white">{formatCurrency(project.budgetBAC)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">مدیر و واحد مسئول</span>
              <span className="text-sm font-semibold text-slate-200 block truncate">{project.managerName}</span>
              <span className="text-[10px] text-slate-400 block truncate">{project.responsibleUnit || project.category}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">تاریخ شروع مبنا</span>
              <span className="text-xs text-slate-300">{toPersianDigits(project.baselineStartDate)}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">تاریخ پایان مبنا {project.durationDays ? `(${toPersianDigits(project.durationDays)} روز)` : ''}</span>
              <span className="text-xs text-slate-300">{toPersianDigits(project.baselineFinishDate)}</span>
            </div>
          </div>

          {/* Requester & Project Rationale Card (if available) */}
          {(project.requesterName || project.rationale) && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {project.requesterName && (
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">اطلاعات درخواست‌کننده:</span>
                  <div className="text-slate-200 font-medium">
                    {project.requesterName} {project.requesterUnit ? `(${project.requesterUnit})` : ''}
                    {project.requestDate && <span className="text-[11px] font-mono text-slate-400 mr-2">مورخ {project.requestDate}</span>}
                  </div>
                </div>
              )}
              {project.rationale && (
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">علت و انگیزه تعریف پروژه:</span>
                  <div className="text-indigo-300 font-semibold">{project.rationale}</div>
                </div>
              )}
            </div>
          )}

          {/* Cost Estimates Breakdown (if recorded) */}
          {project.costEstimates && project.costEstimates.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-bold text-xs pb-1 border-b border-slate-800">
                <span>سرفصل‌های برآورد تفکیکی هزینه</span>
                <span className="font-mono text-indigo-400">جمع کل: {formatCurrency(project.budgetBAC)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.costEstimates.map((c, i) => (
                  <div key={c.id || i} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-slate-200 block font-medium">{c.costType}</span>
                      {c.description && <span className="text-[10px] text-slate-400 block">{c.description}</span>}
                    </div>
                    <span className="font-mono font-bold text-emerald-400 shrink-0 mr-2">
                      {formatCurrency(c.estimatedAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ارزیابی امکان‌سنجی اقتصادی و نرخ بازگشت سرمایه (ROI & Economic Feasibility) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <ProjectROICalculator
              budgetBAC={project.budgetBAC}
              projectName={project.name}
              category={project.category}
              responsibleUnit={project.responsibleUnit}
              durationDays={project.durationDays}
              costEstimates={project.costEstimates}
              value={project.roi}
              readOnly={true}
              onChange={() => {}}
            />
          </div>

          {/* Key Activities List (if recorded) */}
          {project.activities && project.activities.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5 text-xs">
              <span className="text-slate-300 font-bold text-xs block pb-1 border-b border-slate-800">
                فعالیت‌های کلیدی تعریف‌شده پروژه
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.activities.map((a, i) => (
                  <div key={a.id || i} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-slate-200 block font-medium">{a.activityName}</span>
                      {a.responsiblePerson && <span className="text-[10px] text-slate-400 block">مسئول: {a.responsiblePerson}</span>}
                    </div>
                    <span className="font-mono font-bold text-indigo-400 text-xs px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 shrink-0 mr-2">
                      {a.durationDays} روز
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CEO Approval & Financial Detail Code Card */}
          {(project.ceoApprovalStatus || project.financialDetailCode || project.ceoOpinion || project.ganttRequirement) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-950 to-emerald-950/30 border border-indigo-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>فرآیند حاکمیتی: تاییدیه مدیرعامل و کدگذاری مالی</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  project.ceoApprovalStatus === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {project.ceoApprovalStatus === 'rejected' ? 'عدم تایید مدیرعامل' : 'تایید شده توسط مدیرعامل'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">دستور گانت چارت:</span>
                  <span className="text-slate-200 font-semibold">{project.ganttRequirement || 'مورد نیاز است'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">کد تفضیلی مالی پروژه:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {project.financialDetailCode || (project.needsFinancialCode === false ? 'معاف از کد مالی (دستور مدیرعامل)' : '—')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">وضعیت نهایی شناسنامه:</span>
                  <span className="font-bold text-indigo-300">{project.charterStatus || 'مصوب'}</span>
                </div>
              </div>

              {project.ceoOpinion && (
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-slate-300">
                  <span className="text-[10px] text-indigo-400 block font-semibold">نظر و رهنمود مدیرعامل:</span>
                  <p className="mt-0.5">{project.ceoOpinion}</p>
                </div>
              )}

              {project.ceoRejectionReason && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300">
                  <span className="text-[10px] text-rose-400 block font-semibold">علت عدم پذیرش توسط مدیرعامل:</span>
                  <p className="mt-0.5">{project.ceoRejectionReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Official Meeting Minutes & Status History Card (صورتجلسه و سوابق تغییر وضعیت) */}
          {(project.meetingMinutesRef || project.statusChangeReason || (project.statusHistory && project.statusHistory.length > 0)) && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-amber-800/60 pb-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>مستندات مصوبات رسمی، صورتجلسات و سوابق تغییر وضعیت</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ثبت رسمی در PMO
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {project.meetingMinutesRef && (
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block">بند و شماره صورتجلسه:</span>
                    <span className="text-amber-300 font-bold">{project.meetingMinutesRef}</span>
                  </div>
                )}

                {project.decisionAuthority && (
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block">مرجع تصویب‌کننده:</span>
                    <span className="text-slate-200 font-semibold">{project.decisionAuthority}</span>
                  </div>
                )}

                {project.meetingDate && (
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block">تاریخ جلسه مصوب:</span>
                    <span className="text-slate-200 font-semibold">{project.meetingDate}</span>
                  </div>
                )}
              </div>

              {project.statusChangeReason && (
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                  <span className="text-[10px] text-amber-400 block font-semibold">شرح و دلایل تغییر وضعیت / توقف:</span>
                  <p className="mt-0.5 leading-relaxed">{project.statusChangeReason}</p>
                </div>
              )}
            </div>
          )}

          {/* EVM KPI Overview */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>تحلیل پیشرفته شاخص‌های ارزش کسب‌شده (Earned Value Health)</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                بر مبنای آخرین گزارش ثبت‌شده ({latestReport ? `هفته ${toPersianDigits(latestReport.weekNumber)}` : 'بدون گزارش'})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">پیشرفت واقعی (EV%)</span>
                <span className="text-base font-bold text-sky-300">{formatPercent(evm.evPct)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">برنامه‌ای: {formatPercent(evm.pvPct)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">شاخص هزینه (CPI)</span>
                <span className={`text-base font-bold ${evm.cpi >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {toPersianDigits(evm.cpi.toFixed(2))}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{evm.cpi >= 1 ? 'زیر بودجه' : 'بیش‌بودجه'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">شاخص زمان (SPI)</span>
                <span className={`text-base font-bold ${evm.spi >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {toPersianDigits(evm.spi.toFixed(2))}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{evm.spi >= 1 ? 'جلوتر از زمان' : 'دارای تاخیر'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">هزینه واقعی (AC)</span>
                <span className="text-sm font-bold text-slate-200">{formatCurrency(evm.acValue)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ارزش کار: {formatCurrency(evm.evValue)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">برآورد در اتمام (EAC)</span>
                <span className="text-sm font-bold text-slate-200">{formatCurrency(evm.eac)}</span>
                <span className={`text-[10px] block mt-0.5 ${evm.vac >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  انحراف: {formatCurrency(evm.vac)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              💡 <strong>وضعیت PMO:</strong> {evm.healthDescription}
            </div>
          </div>

          {/* S-Curve Chart */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                منحنی تجمعی پیشرفت فیزیکی و مالی (Project S-Curve)
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-indigo-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> پیشرفت برنامه‌ای (PV%)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> پیشرفت واقعی (EV%)
                </span>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sCurveData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={9.5} interval="preserveStartEnd" height={32} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    labelFormatter={(lbl) => `بازه زمانی: ${lbl}`}
                    formatter={(val: any, name: any) => [
                      `${val} %`,
                      name === 'PV_pct' ? 'پیشرفت برنامه‌ای (PV%)' : 'پیشرفت واقعی (EV%)'
                    ]}
                  />
                  <Line type="monotone" dataKey="PV_pct" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="EV_pct" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Reports & Delay Logs Table */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                تاریخچه گزارش‌های هفتگی و شرح تاخیرات
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">شماره هفته</th>
                    <th className="pb-2 font-medium">تاریخ</th>
                    <th className="pb-2 font-medium">پیشرفت PV%</th>
                    <th className="pb-2 font-medium">پیشرفت EV%</th>
                    <th className="pb-2 font-medium">هزینه AC</th>
                    <th className="pb-2 font-medium">CPI</th>
                    <th className="pb-2 font-medium">SPI</th>
                    <th className="pb-2 font-medium text-center">چراغ راهنمایی</th>
                    <th className="pb-2 font-medium">شرح موانع و تاخیرات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projectReports.map((r) => {
                    const rEVM = calculateEVM(project.budgetBAC, r.plannedValuePct, r.earnedValuePct, r.actualCost);
                    const rBadge = getStatusBadge(r.trafficLightStatus);
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 font-bold text-indigo-300">هفته {r.weekNumber}</td>
                        <td className="py-2.5 font-mono text-slate-300">{r.reportDate}</td>
                        <td className="py-2.5 font-mono text-slate-300">{formatPercent(r.plannedValuePct)}</td>
                        <td className="py-2.5 font-mono font-bold text-sky-400">{formatPercent(r.earnedValuePct)}</td>
                        <td className="py-2.5 font-mono text-slate-200">{Math.round(r.actualCost).toLocaleString('fa-IR')} م.ت</td>
                        <td className="py-2.5 font-mono">{rEVM.cpi}</td>
                        <td className="py-2.5 font-mono">{rEVM.spi}</td>
                        <td className="py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${rBadge.bg} ${rBadge.textCol} ${rBadge.border}`}>
                            {rBadge.text}
                          </span>
                        </td>
                        <td className="py-2.5 text-[11px] text-slate-300 max-w-xs">{r.keyIssuesAndDelays}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
