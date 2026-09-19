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
  Activity, 
  Target, 
  ChevronDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  ComposedChart
} from 'recharts';

interface SCurveAnalyticsProps {
  projects: Project[];
  reports: WeeklyProgressReport[];
  currentUser: User;
  onSelectProject?: (project: Project) => void;
  onOpenNewReport?: (projectId: number) => void;
}

interface SCurveDataPoint {
  label: string;
  dateStr: string;
  isHistorical: boolean;
  isForecast: boolean;
  plannedPct: number;
  actualPct: number | null;
  forecastPct: number | null;
  actualCostMillion?: number | null;
}

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

function diffJalaliDays(d1Str: string, d2Str: string): number {
  const date1 = jalaliStringToJsDate(d1Str);
  const date2 = jalaliStringToJsDate(d2Str);
  if (!date1 || !date2) return 0;
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

export const SCurveAnalytics: React.FC<SCurveAnalyticsProps> = ({
  projects,
  reports,
  currentUser,
  onSelectProject,
  onOpenNewReport,
}) => {
  const { isDark } = useTheme();

  const availableProjects = useMemo(() => {
    return projects.filter(p => p.status !== 'cancelled');
  }, [projects]);

  const [selectedProjectId, setSelectedProjectId] = useState<number>(() => {
    return availableProjects.length > 0 ? availableProjects[0].id : 1;
  });

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  const projectReports = useMemo(() => {
    if (!selectedProject) return [];
    return reports
      .filter(r => r.projectId === selectedProject.id)
      .sort((a, b) => {
        const da = jalaliStringToJsDate(a.reportDate)?.getTime() || 0;
        const db = jalaliStringToJsDate(b.reportDate)?.getTime() || 0;
        if (da !== db) return da - db;
        return a.weekNumber - b.weekNumber;
      });
  }, [selectedProject, reports]);

  const { 
    chartData, 
    latestPV, 
    latestEV, 
    scheduleVariancePct, 
    spi, 
    forecastFinishDate, 
    delayDays, 
    forecastStatus,
    avgWeeklyVelocity
  } = useMemo(() => {
    if (!selectedProject) {
      return {
        chartData: [],
        latestPV: 0,
        latestEV: 0,
        scheduleVariancePct: 0,
        spi: 1.0,
        forecastFinishDate: '-',
        delayDays: 0,
        forecastStatus: 'normal' as 'ahead' | 'delay' | 'normal',
        avgWeeklyVelocity: 0
      };
    }

    const baselineStart = selectedProject.baselineStartDate || '۱۴۰۲/۰۱/۰۱';
    const baselineFinish = selectedProject.baselineFinishDate || '۱۴۰۴/۰۶/۳۰';
    const totalBaselineDays = Math.max(30, diffJalaliDays(baselineStart, baselineFinish));

    const hasReports = projectReports.length > 0;
    const latestReport = hasReports ? projectReports[projectReports.length - 1] : null;

    const currentPV = latestReport ? latestReport.plannedValuePct : 0;
    const currentEV = latestReport ? latestReport.earnedValuePct : 0;
    const currentSV = currentEV - currentPV;
    const currentSPI = currentPV > 0 ? Number((currentEV / currentPV).toFixed(2)) : 1.0;

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
    const isDelayed = totalForecastDaysDiff > 5;
    const isAhead = totalForecastDaysDiff < -5;

    const points: SCurveDataPoint[] = [];

    // Start point
    points.push({
      label: `شروع (${baselineStart})`,
      dateStr: baselineStart,
      isHistorical: true,
      isForecast: false,
      plannedPct: 0,
      actualPct: 0,
      forecastPct: null,
    });

    if (hasReports) {
      const firstRep = projectReports[0];
      if (firstRep.weekNumber > 10) {
        const midDate = addDaysToJalaliString(baselineStart, Math.round(totalBaselineDays * 0.25));
        points.push({
          label: `مرحله مقدماتی`,
          dateStr: midDate,
          isHistorical: false,
          isForecast: false,
          plannedPct: 20,
          actualPct: null,
          forecastPct: null,
        });
      }

      projectReports.forEach((rep, idx) => {
        const isLatest = idx === projectReports.length - 1;
        const pStart = rep.reportingPeriodStart || addDaysToJalaliString(rep.reportDate, -6);
        const pEnd = rep.reportingPeriodEnd || rep.reportDate;
        points.push({
          label: `از ${pStart} تا ${pEnd}`,
          dateStr: rep.reportDate,
          isHistorical: true,
          isForecast: false,
          plannedPct: rep.plannedValuePct,
          actualPct: rep.earnedValuePct,
          forecastPct: isLatest ? rep.earnedValuePct : null,
          actualCostMillion: rep.actualCost
        });
      });
    } else {
      const d10Start = addDaysToJalaliString(baselineStart, 64);
      const d10End = addDaysToJalaliString(baselineStart, 70);
      const d20Start = addDaysToJalaliString(baselineStart, 134);
      const d20End = addDaysToJalaliString(baselineStart, 140);
      points.push({
        label: `از ${d10Start} تا ${d10End}`,
        dateStr: d10End,
        isHistorical: false,
        isForecast: false,
        plannedPct: 18,
        actualPct: null,
        forecastPct: null,
      });
      points.push({
        label: `از ${d20Start} تا ${d20End}`,
        dateStr: d20End,
        isHistorical: false,
        isForecast: false,
        plannedPct: 45,
        actualPct: null,
        forecastPct: null,
      });
    }

    // Forecast Future
    if (currentEV < 100) {
      const lastPointDate = latestReport ? latestReport.reportDate : baselineStart;

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
        points.push({
          label: `موعد مصوب (${baselineFinish})`,
          dateStr: baselineFinish,
          isHistorical: false,
          isForecast: true,
          plannedPct: 100,
          actualPct: null,
          forecastPct: Math.min(95, Math.round(currentEV + ((diffJalaliDays(lastPointDate, baselineFinish) / 7) * velocity))),
        });

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
      chartData: points,
      latestPV: currentPV,
      latestEV: currentEV,
      scheduleVariancePct: currentSV,
      spi: currentSPI,
      forecastFinishDate: estFinishDate,
      delayDays: totalForecastDaysDiff,
      forecastStatus: isDelayed ? 'delay' : isAhead ? 'ahead' : 'normal',
      avgWeeklyVelocity: velocity
    };
  }, [selectedProject, projectReports]);

  if (!selectedProject) return null;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg transition-colors space-y-5">
      
      {/* Header & Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>پایش و پیش‌بینی منحنی‌های پیشرفت پروژه‌ها</span>
              </h2>
            </div>
          </div>
        </div>

        {/* Project Selector Control */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
            انتخاب پروژه:
          </span>
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <select
              id="select-scurve-project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-white text-xs font-semibold rounded-xl px-3 py-2 pr-3 pl-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-right shadow-2xs transition"
            >
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {toPersianDigits(p.code)} - {p.name}
                </option>
              ))}
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {onSelectProject && (
            <button
              onClick={() => onSelectProject(selectedProject)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              شناسنامه پروژه
            </button>
          )}
        </div>
      </div>

      {/* 4 Executive Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Planned */}
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-1.5">
            <span>کجا باید می‌بودیم؟ (برنامه مبنا)</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-vazir text-indigo-900 dark:text-indigo-200">
              {formatPercent(latestPV)}
            </span>
            <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400">پیشرفت برنامه‌ای (PV)</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            موعد شروع مصوب: {toPersianDigits(selectedProject.baselineStartDate)}
          </p>
        </div>

        {/* Card 2: Actual */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-1.5">
            <span>الان کجا هستیم؟ (عملکرد واقعی)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-vazir text-emerald-900 dark:text-emerald-200">
              {formatPercent(latestEV)}
            </span>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400">پیشرفت واقعی (EV)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">انحراف زمانی:</span>
            <span className={`font-bold ${scheduleVariancePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {scheduleVariancePct > 0 ? `+${formatPercent(scheduleVariancePct)}` : formatPercent(scheduleVariancePct)}
            </span>
          </div>
        </div>

        {/* Card 3: SPI */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs font-semibold mb-1.5">
            <span>شاخص راندمان زمانی (SPI)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-bold font-vazir ${spi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}`}>
              {toPersianDigits(spi.toFixed(2))}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400">
              {spi >= 1 ? 'جلوتر از برنامه' : 'تاخیر در سرعت اجرا'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            میانگین پیشرفت هفتگی: {toPersianDigits(avgWeeklyVelocity)}٪ در هفته
          </p>
        </div>

        {/* Card 4: Forecast Finish Date */}
        <div className={`p-4 rounded-xl border ${
          forecastStatus === 'delay'
            ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
            : forecastStatus === 'ahead'
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className={forecastStatus === 'delay' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}>
              پیش‌بینی تاریخ اتمام (EAC_t)
            </span>
            <Calendar className={`w-4 h-4 ${forecastStatus === 'delay' ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold font-vazir text-slate-900 dark:text-white">
              {toPersianDigits(forecastFinishDate)}
            </span>
          </div>
          <div className="mt-1 text-[11px]">
            {forecastStatus === 'delay' ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                ⚠️ حدود {toPersianDigits(Math.abs(delayDays))} روز تاخیر نسبت به موعد مصوب ({toPersianDigits(selectedProject.baselineFinishDate)})
              </span>
            ) : forecastStatus === 'ahead' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✅ پیش‌بینی اتمام {toPersianDigits(Math.abs(delayDays))} روز زودتر از موعد مصوب
              </span>
            ) : (
              <span className="text-slate-600 dark:text-slate-400">
                منطبق بر موعد مصوب ({toPersianDigits(selectedProject.baselineFinishDate)})
              </span>
            )}
          </div>
        </div>

      </div>

      {/* S-Curve Main Chart */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span>منحنی تجمعی درصد پیشرفت پروژه: {selectedProject.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-medium">
              <span className="w-3 h-1 bg-indigo-600 rounded-full" />
              برنامه‌ای مبنا (Planned PV%)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
              <span className="w-3 h-1 bg-emerald-500 rounded-full" />
              واقعی محقق‌شده (Actual EV%)
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-3 h-1 border-b-2 border-dashed border-amber-500" />
              پیش‌بینی اتمام (Forecast Trend)
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
              
              <XAxis 
                dataKey="label" 
                stroke={isDark ? '#94a3b8' : '#64748b'} 
                fontSize={9.5} 
                tickLine={false} 
                interval="preserveStartEnd"
                height={35}
              />
              
              <YAxis 
                stroke={isDark ? '#94a3b8' : '#64748b'} 
                fontSize={11} 
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
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  direction: 'rtl',
                  textAlign: 'right'
                }}
                formatter={(value: any, name: any) => {
                  if (value === null || value === undefined) return ['-', ''];
                  const formatted = `${toPersianDigits(Number(value).toFixed(1))}٪`;
                  if (name === 'plannedPct') return [formatted, 'برنامه مبنا (PV)'];
                  if (name === 'actualPct') return [formatted, 'پیشرفت واقعی (EV)'];
                  if (name === 'forecastPct') return [formatted, 'مسیر پیش‌بینی (Forecast)'];
                  return [formatted, name];
                }}
                labelFormatter={(label) => `بازه زمانی: ${label}`}
              />

              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: '۱۰۰٪ تکمیل', fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10, position: 'insideTopLeft' }} />

              <Line 
                type="monotone" 
                dataKey="plannedPct" 
                stroke="#6366f1" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#6366f1' }} 
                activeDot={{ r: 6 }} 
                name="plannedPct"
              />

              <Line 
                type="monotone" 
                dataKey="actualPct" 
                stroke="#10b981" 
                strokeWidth={3.5} 
                dot={{ r: 5, fill: '#10b981' }} 
                activeDot={{ r: 7 }} 
                name="actualPct"
                connectNulls={false}
              />

              <Line 
                type="monotone" 
                dataKey="forecastPct" 
                stroke="#f59e0b" 
                strokeWidth={2.5} 
                strokeDasharray="5 5" 
                dot={{ r: 4, fill: '#f59e0b' }} 
                name="forecastPct"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">مدیر پروژه:</span>
            <span>{selectedProject.managerName}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="font-semibold text-slate-900 dark:text-white">واحد مسئول:</span>
            <span>{selectedProject.responsibleUnit || 'واحد فنی'}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="font-semibold text-slate-900 dark:text-white">بودجه مصوب:</span>
            <span className="font-mono">{formatCurrency(selectedProject.budgetBAC)}</span>
          </div>

          {onOpenNewReport && currentUser.role !== 'Executive_Viewer' && (
            <button
              onClick={() => onOpenNewReport(selectedProject.id)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              ثبت گزارش جدید برای این پروژه
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
