import React, { useState, useMemo } from 'react';
import { Project, WeeklyProgressReport, User } from '../types';
import { useTheme } from '../context/ThemeContext';
import { 
  formatPercent, 
  formatCurrency, 
  toPersianDigits 
} from '../utils/evmCalculations';
import { 
  parseJalaliDate, 
  jalaliToGregorian, 
  gregorianToJalali, 
  formatJalaliDate, 
  jalaliStringToJsDate 
} from '../utils/jalali';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  Activity, 
  Layers,
  ChevronDown,
  Info,
  Search,
  SlidersHorizontal,
  ExternalLink,
  LayoutGrid,
  Maximize2,
  Check,
  AlertCircle,
  FolderKanban,
  FilePlus2,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  ComposedChart
} from 'recharts';

interface SCurveGalleryViewProps {
  projects: Project[];
  reports: WeeklyProgressReport[];
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onOpenNewReport?: (projectId?: number) => void;
}

interface SCurveDataPoint {
  label: string;           // e.g. "هفته ۳۸" or "۱۴۰۳/۰۵/۱۰"
  dateStr: string;
  isHistorical: boolean;
  isForecast: boolean;
  plannedPct: number;      // PV%
  actualPct: number | null; // EV%
  forecastPct: number | null; // Forecast%
  actualCostMillion?: number | null;
}

type FilterCategory = 'all' | 'critical' | 'gantt' | 'on_track';

/**
 * Add days to a Jalali date string
 */
function addDaysToJalaliString(dateStr: string, daysToAdd: number): string {
  const parsed = parseJalaliDate(dateStr);
  if (!parsed) return dateStr;
  const [jy, jm, jd] = parsed;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const date = new Date(gy, gm - 1, gd);
  date.setDate(date.getDate() + daysToAdd);
  const [newJy, newJm, newJd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return formatJalaliDate(newJy, newJm, newJd);
}

/**
 * Calculate difference in days between two Jalali dates (d2 - d1)
 */
function diffJalaliDays(d1Str: string, d2Str: string): number {
  const date1 = jalaliStringToJsDate(d1Str);
  const date2 = jalaliStringToJsDate(d2Str);
  if (!date1 || !date2) return 0;
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compute S-Curve trajectory & forecast KPIs for a single project
 */
function getProjectSCurveMetrics(project: Project, allReports: WeeklyProgressReport[]) {
  const baselineStart = project.baselineStartDate || '۱۴۰۲/۰۱/۰۱';
  const baselineFinish = project.baselineFinishDate || '۱۴۰۴/۰۶/۳۰';
  const totalBaselineDays = Math.max(30, diffJalaliDays(baselineStart, baselineFinish));

  const projectReports = allReports
    .filter(r => r.projectId === project.id)
    .sort((a, b) => {
      const da = jalaliStringToJsDate(a.reportDate)?.getTime() || 0;
      const db = jalaliStringToJsDate(b.reportDate)?.getTime() || 0;
      if (da !== db) return da - db;
      return a.weekNumber - b.weekNumber;
    });

  const hasReports = projectReports.length > 0;
  const latestReport = hasReports ? projectReports[projectReports.length - 1] : null;

  const currentPV = latestReport ? latestReport.plannedValuePct : 0;
  const currentEV = latestReport ? latestReport.earnedValuePct : 0;
  const currentSV = currentEV - currentPV;
  const currentSPI = currentPV > 0 ? Number((currentEV / currentPV).toFixed(2)) : 1.0;

  // Calculate velocity (% progress gained per week)
  let velocity = 1.8;
  if (projectReports.length >= 2) {
    const first = projectReports[0];
    const last = projectReports[projectReports.length - 1];
    const weeksDiff = Math.max(1, last.weekNumber - first.weekNumber);
    const evDiff = Math.max(0.5, last.earnedValuePct - first.earnedValuePct);
    velocity = Number((evDiff / weeksDiff).toFixed(2));
  } else if (latestReport && latestReport.weekNumber > 0) {
    velocity = Math.max(0.5, Number((latestReport.earnedValuePct / latestReport.weekNumber).toFixed(2)));
  }

  const remainingPct = Math.max(0, 100 - currentEV);
  const weeksToComplete = velocity > 0 ? Math.ceil(remainingPct / velocity) : 20;
  const daysToComplete = weeksToComplete * 7;

  const baseReportDate = latestReport ? latestReport.reportDate : baselineStart;
  const estFinishDate = addDaysToJalaliString(baseReportDate, daysToComplete);

  const totalForecastDaysDiff = diffJalaliDays(baselineFinish, estFinishDate);
  const isDelayed = totalForecastDaysDiff > 5 || currentSPI < 0.95 || currentSV < -4;
  const isAhead = totalForecastDaysDiff < -5 || (currentSPI >= 1.05 && currentSV > 3);

  // Generate chart data points
  const points: SCurveDataPoint[] = [];

  // 1. Initial point (only planned and actual start from 0; forecast starts from latest report)
  points.push({
    label: `شروع: ${baselineStart}`,
    dateStr: baselineStart,
    isHistorical: true,
    isForecast: false,
    plannedPct: 0,
    actualPct: 0,
    forecastPct: null,
  });

  // 2. Intermediate points (displaying exact date ranges: از تاریخ ... تا تاریخ ...)
  if (hasReports) {
    projectReports.forEach((rep, idx) => {
      const isLatest = idx === projectReports.length - 1;
      const pStart = rep.reportingPeriodStart || addDaysToJalaliString(rep.reportDate, -6);
      const pEnd = rep.reportingPeriodEnd || rep.reportDate;
      const dateRangeLabel = `از ${pStart} تا ${pEnd}`;

      points.push({
        label: dateRangeLabel,
        dateStr: rep.reportDate,
        isHistorical: true,
        isForecast: false,
        plannedPct: rep.plannedValuePct,
        actualPct: rep.earnedValuePct,
        // The forecast trajectory connects exactly to the latest actual progress point
        forecastPct: isLatest ? rep.earnedValuePct : null,
        actualCostMillion: rep.actualCost
      });
    });
  } else {
    // Basic planned curve if no reports yet
    const d10Start = addDaysToJalaliString(baselineStart, 64);
    const d10End = addDaysToJalaliString(baselineStart, 70);
    const d25Start = addDaysToJalaliString(baselineStart, 169);
    const d25End = addDaysToJalaliString(baselineStart, 175);
    points.push({
      label: `از ${d10Start} تا ${d10End}`,
      dateStr: d10End,
      isHistorical: false,
      isForecast: false,
      plannedPct: 25,
      actualPct: null,
      forecastPct: null,
    });
    points.push({
      label: `از ${d25Start} تا ${d25End}`,
      dateStr: d25End,
      isHistorical: false,
      isForecast: false,
      plannedPct: 60,
      actualPct: null,
      forecastPct: null,
    });
  }

  // 3. Forecast future trajectory
  if (currentEV < 100) {
    const lastPointDate = latestReport ? latestReport.reportDate : baselineStart;

    // Mid future milestone (if sufficient gap exists)
    const midWeeks = Math.ceil(weeksToComplete / 2);
    const midPct = Math.min(99, Number((currentEV + (remainingPct / 2)).toFixed(1)));
    const midDateStr = addDaysToJalaliString(lastPointDate, midWeeks * 7);
    const daysFromStartToMid = diffJalaliDays(baselineStart, midDateStr);
    const approxPVAtMid = Math.min(100, Math.round((daysFromStartToMid / totalBaselineDays) * 100));

    if (diffJalaliDays(midDateStr, baselineFinish) > 7) {
      const midStart = addDaysToJalaliString(midDateStr, -6);
      points.push({
        label: `از ${midStart} تا ${midDateStr}`,
        dateStr: midDateStr,
        isHistorical: false,
        isForecast: true,
        plannedPct: approxPVAtMid,
        actualPct: null,
        forecastPct: midPct,
      });
    }

    if (isDelayed) {
      // 1. Contractual deadline: Planned line completes at 100%, forecast is delayed
      points.push({
        label: `موعد مصوب (${baselineFinish})`,
        dateStr: baselineFinish,
        isHistorical: false,
        isForecast: true,
        plannedPct: 100,
        actualPct: null,
        forecastPct: Math.min(95, Math.round(currentEV + ((diffJalaliDays(lastPointDate, baselineFinish) / 7) * velocity))),
      });

      // 2. Delayed completion: Only forecast reaches 100%; plannedPct is strictly null so planned line stops at baselineFinish
      points.push({
        label: `پیش‌بینی اتمام (${estFinishDate})`,
        dateStr: estFinishDate,
        isHistorical: false,
        isForecast: true,
        plannedPct: null,
        actualPct: null,
        forecastPct: 100,
      });
    } else {
      // Project is on track or ahead
      if (diffJalaliDays(estFinishDate, baselineFinish) < -7) {
        const daysToFinish = diffJalaliDays(baselineStart, estFinishDate);
        const approxPVAtFinish = Math.min(99, Math.round((daysToFinish / totalBaselineDays) * 100));
        points.push({
          label: `پیش‌بینی اتمام (${estFinishDate})`,
          dateStr: estFinishDate,
          isHistorical: false,
          isForecast: true,
          plannedPct: approxPVAtFinish,
          actualPct: null,
          forecastPct: 100,
        });
      }

      points.push({
        label: `موعد مصوب (${baselineFinish})`,
        dateStr: baselineFinish,
        isHistorical: false,
        isForecast: true,
        plannedPct: 100,
        actualPct: null,
        forecastPct: 100,
      });
    }
  }

  return {
    reportsCount: projectReports.length,
    latestPV: currentPV,
    latestEV: currentEV,
    scheduleVariancePct: currentSV,
    spi: currentSPI,
    forecastFinishDate: estFinishDate,
    delayDays: totalForecastDaysDiff,
    isDelayed,
    isAhead,
    status: isDelayed ? 'critical' : isAhead ? 'ahead' : 'on_track',
    avgWeeklyVelocity: velocity,
    chartData: points,
    baselineStart,
    baselineFinish,
    hasGantt: Boolean(project.baselineStartDate && project.baselineFinishDate)
  };
}

/**
 * Individual Project S-Curve Card Component (Spacious 2-in-a-row layout)
 */
const ProjectSCurveGridCard: React.FC<{
  project: Project;
  reports: WeeklyProgressReport[];
  onSelectProject: (project: Project) => void;
  onOpenNewReport?: (projectId?: number) => void;
  isDark: boolean;
}> = ({ project, reports, onSelectProject, onOpenNewReport, isDark }) => {
  const metrics = useMemo(() => getProjectSCurveMetrics(project, reports), [project, reports]);

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all p-5 relative group">
      
      {/* Top Header: Clean Project Name, Status Badge & Read-Only Detail Button */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
            <h3 
              className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition"
              title={project.name}
            >
              {project.name}
            </h3>

            {metrics.isDelayed ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>بحرانی ({toPersianDigits(Math.abs(metrics.delayDays))} روز تاخیر)</span>
              </span>
            ) : metrics.isAhead ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <Check className="w-3.5 h-3.5" />
                <span>پیشرو در برنامه</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>مطلوب (منطبق بر برنامه)</span>
              </span>
            )}
          </div>

          {/* Corner Project Detail Action Button (Read-Only Charter) */}
          <button
            onClick={() => onSelectProject(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs"
            title="مشاهده شناسنامه کامل پروژه (صرفاً جهت مشاهده و غیرقابل ویرایش)"
          >
            <Info className="w-4 h-4" />
            <span className="inline">شناسنامه</span>
          </button>
        </div>

        {/* Spacious 2-in-a-row S-Curve Line Chart */}
        <div className="h-64 w-full my-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={metrics.chartData} margin={{ top: 12, right: 12, left: -10, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} opacity={0.7} />
              
              <XAxis 
                dataKey="label" 
                stroke={isDark ? '#94a3b8' : '#64748b'}
                fontSize={9}
                tickLine={false}
                interval="preserveStartEnd"
                height={35}
              />
              
              <YAxis 
                stroke={isDark ? '#94a3b8' : '#64748b'} 
                fontSize={10.5} 
                tickLine={false} 
                domain={[0, 105]} 
                tickFormatter={(v) => `${toPersianDigits(v)}٪`} 
              />
              
              <Tooltip
                contentStyle={{ 
                  backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                  borderColor: isDark ? '#334155' : '#cbd5e1', 
                  color: isDark ? '#f8fafc' : '#0f172a',
                  borderRadius: '12px', 
                  fontSize: '12px',
                  boxShadow: '0 8px 25px -4px rgba(0, 0, 0, 0.2)',
                  direction: 'rtl',
                  textAlign: 'right',
                  padding: '8px 12px'
                }}
                formatter={(value: any, name: any) => {
                  if (value === null || value === undefined) return ['-', ''];
                  const formatted = `${toPersianDigits(Number(value).toFixed(1))}٪`;
                  if (name === 'plannedPct') return [formatted, 'برنامه مصوب (PV)'];
                  if (name === 'actualPct') return [formatted, 'پیشرفت واقعی (EV)'];
                  if (name === 'forecastPct') return [formatted, 'پیش‌بینی (Forecast)'];
                  return [formatted, name];
                }}
                labelFormatter={(label) => `بازه زمانی: ${label}`}
              />

              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} label={{ value: '۱۰۰٪', fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, position: 'insideTopLeft' }} />

              {/* Planned PV Line (Blue) */}
              <Line 
                type="monotone" 
                dataKey="plannedPct" 
                stroke="#6366f1" 
                strokeWidth={2.8} 
                dot={{ r: 3.5, fill: '#6366f1' }} 
                activeDot={{ r: 5 }}
                name="plannedPct"
              />

              {/* Actual EV Line (Green) */}
              <Line 
                type="monotone" 
                dataKey="actualPct" 
                stroke="#10b981" 
                strokeWidth={3.2} 
                dot={{ r: 4.5, fill: '#10b981' }} 
                activeDot={{ r: 6 }}
                name="actualPct"
                connectNulls={false}
              />

              {/* Forecast Extrapolation (Dashed Amber) */}
              <Line 
                type="monotone" 
                dataKey="forecastPct" 
                stroke="#f59e0b" 
                strokeWidth={2.4} 
                strokeDasharray="5 5" 
                dot={{ r: 3.5, fill: '#f59e0b' }} 
                activeDot={{ r: 5 }}
                name="forecastPct"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-50/70 dark:bg-slate-950/40 rounded-lg">
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
            <span className="w-3 h-1 bg-indigo-600 inline-block rounded-full" />
            برنامه مصوب گانت (PV)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-3 h-1 bg-emerald-500 inline-block rounded-full" />
            پیشرفت واقعی محقق‌شده (EV)
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
            <span className="w-3 h-1 border-b-2 border-dashed border-amber-500 inline-block" />
            مسیر پیش‌بینی اتمام (Forecast)
          </span>
        </div>
      </div>

      {/* Bottom Forecast Summary */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs">
        <div className={`flex items-center justify-between p-2 rounded-lg border ${metrics.isDelayed ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'}`}>
          <span className="text-slate-700 dark:text-slate-300 font-semibold">تخمین تاریخ اتمام (EAC_t):</span>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="font-vazir text-slate-900 dark:text-white">{toPersianDigits(metrics.forecastFinishDate)}</span>
            <span className={metrics.isDelayed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
              ({metrics.isDelayed ? `+${toPersianDigits(Math.abs(metrics.delayDays))} روز تاخیر` : metrics.isAhead ? `-${toPersianDigits(Math.abs(metrics.delayDays))} روز تسریع` : 'منطبق'})
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export const SCurveGalleryView: React.FC<SCurveGalleryViewProps> = ({
  projects,
  reports,
  currentUser,
  onSelectProject,
  onOpenNewReport,
}) => {
  const { isDark } = useTheme();

  // Filters and Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'delay' | 'actual' | 'code'>('delay');

  // Extract list of unique responsible units
  const responsibleUnits = useMemo(() => {
    const units = new Set<string>();
    projects.forEach(p => {
      if (p.responsibleUnit) units.add(p.responsibleUnit);
    });
    return Array.from(units);
  }, [projects]);

  // Filter & Sort Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Base validity
        if (project.status === 'cancelled') return false;

        // Search text matching (name, code, manager)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = project.name.toLowerCase().includes(q);
          const matchesCode = project.code.toLowerCase().includes(q);
          const matchesManager = project.managerName.toLowerCase().includes(q);
          if (!matchesName && !matchesCode && !matchesManager) return false;
        }

        // Responsible unit filter
        if (selectedUnit !== 'all' && project.responsibleUnit !== selectedUnit) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'delay') {
          const ma = getProjectSCurveMetrics(a, reports);
          const mb = getProjectSCurveMetrics(b, reports);
          return mb.delayDays - ma.delayDays; // Highest delay first
        }
        if (sortBy === 'actual') {
          const ma = getProjectSCurveMetrics(a, reports);
          const mb = getProjectSCurveMetrics(b, reports);
          return mb.latestEV - ma.latestEV; // Highest progress first
        }
        return a.code.localeCompare(b.code);
      });
  }, [projects, reports, searchQuery, selectedUnit, sortBy]);

  return (
    <div className="space-y-5">
      
      {/* 1. Clean Top Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              پایش و مقایسه منحنی‌های پیشرفت پروژه‌ها
            </h1>
          </div>
        </div>

        {onOpenNewReport && currentUser.role !== 'Executive_Viewer' && (
          <button
            onClick={() => onOpenNewReport()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>ثبت گزارش پیشرفت جدید</span>
          </button>
        )}
      </div>

      {/* 2. Compact Search & Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو در عنوان، کد یا مدیر پروژه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-8 pl-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Unit Filter */}
          <div className="relative">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-3 pl-8 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none text-right cursor-pointer shadow-2xs"
            >
              <option value="all">تمام واحدهای سازمانی</option>
              {responsibleUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-3 pl-8 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none text-right cursor-pointer shadow-2xs"
            >
              <option value="delay">مرتب‌سازی: بیشترین تاخیر زمانی</option>
              <option value="actual">مرتب‌سازی: بیشترین پیشرفت واقعی</option>
              <option value="code">مرتب‌سازی: کد پروژه</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* 3. Projects S-Curve Gallery Content (2 per row grid) */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">پروژه‌ای با شرایط فیلتر انتخابی یافت نشد</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            می‌توانید فیلترها را تغییر دهید یا عبارت جستجو را پاک کنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((project) => (
            <ProjectSCurveGridCard
              key={project.id}
              project={project}
              reports={reports}
              onSelectProject={onSelectProject}
              onOpenNewReport={onOpenNewReport}
              isDark={isDark}
            />
          ))}
        </div>
      )}

    </div>
  );
};
