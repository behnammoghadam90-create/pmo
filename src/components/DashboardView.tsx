import React, { useMemo, useState } from 'react';
import { Project, WeeklyProgressReport, User } from '../types';
import { calculateEVM, formatCurrency, formatPercent, getStatusBadge, toPersianDigits, formatNumberWithDots } from '../utils/evmCalculations';
import { useTheme } from '../context/ThemeContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Activity,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  PieChart as PieIcon,
  BarChart3,
  Coins,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { SCurveAnalytics } from './SCurveAnalytics';

interface DashboardViewProps {
  projects: Project[];
  reports: WeeklyProgressReport[];
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onOpenNewReport: (projectId?: number) => void;
  onOpenAIAdvisor: () => void;
  onSelectTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  reports,
  currentUser,
  onSelectProject,
  onOpenNewReport,
  onOpenAIAdvisor,
  onSelectTab,
}) => {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState('3months');

  // Compute portfolio KPIs
  const portfolioMetrics = useMemo(() => {
    let totalBAC = 0;
    let totalPlannedCost = 0;
    let totalEarnedValueCost = 0;
    let totalActualCost = 0;

    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;

    const projectLatestStats: Array<{
      project: Project;
      latestReport?: WeeklyProgressReport;
      evm: ReturnType<typeof calculateEVM>;
    }> = [];

    projects.forEach((proj) => {
      totalBAC += proj.budgetBAC;
      
      const projReports = reports
        .filter((r) => r.projectId === proj.id)
        .sort((a, b) => b.weekNumber - a.weekNumber);

      const latest = projReports[0];

      if (latest) {
        const evm = calculateEVM(
          proj.budgetBAC,
          latest.plannedValuePct,
          latest.earnedValuePct,
          latest.actualCost
        );

        totalPlannedCost += evm.pvValue;
        totalEarnedValueCost += evm.evValue;
        totalActualCost += evm.acValue;

        if (latest.trafficLightStatus === 'green') greenCount++;
        else if (latest.trafficLightStatus === 'yellow') yellowCount++;
        else if (latest.trafficLightStatus === 'red') redCount++;

        projectLatestStats.push({ project: proj, latestReport: latest, evm });
      } else {
        const evm = calculateEVM(proj.budgetBAC, 0, 0, 0);
        projectLatestStats.push({ project: proj, evm });
        greenCount++;
      }
    });

    const portfolioCPI = totalActualCost > 0 ? Number((totalEarnedValueCost / totalActualCost).toFixed(3)) : 1.0;
    const portfolioSPI = totalPlannedCost > 0 ? Number((totalEarnedValueCost / totalPlannedCost).toFixed(3)) : 1.0;
    const portfolioCV = totalEarnedValueCost - totalActualCost;
    const portfolioSV = totalEarnedValueCost - totalPlannedCost;
    const avgPvPct = projects.length > 0 ? (totalPlannedCost / totalBAC) * 100 : 0;
    const avgEvPct = projects.length > 0 ? (totalEarnedValueCost / totalBAC) * 100 : 0;

    return {
      totalBAC,
      totalPlannedCost,
      totalEarnedValueCost,
      totalActualCost,
      portfolioCPI,
      portfolioSPI,
      portfolioCV,
      portfolioSV,
      avgPvPct,
      avgEvPct,
      greenCount,
      yellowCount,
      redCount,
      projectLatestStats,
    };
  }, [projects, reports]);

  // Compute real dynamic values & trends for the 5 executive cards from actual data
  const dynamicKpiStats = useMemo(() => {
    let prevTotalEarnedValue = 0;
    let prevTotalActualCost = 0;
    let prevYellowCount = 0;
    let prevRedCount = 0;

    projects.forEach((proj) => {
      const projReports = reports
        .filter((r) => r.projectId === proj.id)
        .sort((a, b) => b.weekNumber - a.weekNumber);

      // Previous report (second newest if exists, else first)
      if (projReports.length > 1) {
        const prev = projReports[1];
        prevTotalEarnedValue += (prev.earnedValuePct / 100) * proj.budgetBAC;
        prevTotalActualCost += prev.actualCost;
        if (prev.trafficLightStatus === 'yellow') prevYellowCount++;
        else if (prev.trafficLightStatus === 'red') prevRedCount++;
      } else if (projReports.length === 1) {
        const prev = projReports[0];
        prevTotalEarnedValue += (prev.earnedValuePct / 100) * proj.budgetBAC;
        prevTotalActualCost += prev.actualCost;
        if (prev.trafficLightStatus === 'yellow') prevYellowCount++;
        else if (prev.trafficLightStatus === 'red') prevRedCount++;
      }
    });

    const activeCount = projects.filter(
      (p) => p.status === 'active' || (p.status !== 'completed' && p.status !== 'cancelled')
    ).length;

    const completedCount = projects.filter((p) => p.status === 'completed').length;

    // Previous average EV%
    const prevAvgEvPct = portfolioMetrics.totalBAC > 0 
      ? (prevTotalEarnedValue / portfolioMetrics.totalBAC) * 100 
      : 0;

    const evGrowth = Number((portfolioMetrics.avgEvPct - prevAvgEvPct).toFixed(1));
    const yellowDiff = portfolioMetrics.yellowCount - prevYellowCount;
    const redDiff = portfolioMetrics.redCount - prevRedCount;
    const costDelta = Math.max(0, portfolioMetrics.totalActualCost - prevTotalActualCost);

    return {
      activeCount,
      completedCount,
      totalBAC: portfolioMetrics.totalBAC,
      costDelta,
      currentEvPct: portfolioMetrics.avgEvPct,
      evGrowth,
      yellowCount: portfolioMetrics.yellowCount,
      yellowDiff,
      redCount: portfolioMetrics.redCount,
      redDiff,
    };
  }, [projects, reports, portfolioMetrics]);

  // S-Curve chart data aggregation over weeks
  const sCurveData = useMemo(() => {
    // Collect all unique week numbers
    const weekNumbers = Array.from(new Set(reports.map((r) => r.weekNumber))).map(Number).sort((a, b) => a - b);
    
    if (weekNumbers.length === 0) {
      return [
        { week: 'هفته ۱', PV: 10, EV: 10, AC: 9 },
        { week: 'هفته ۲', PV: 25, EV: 22, AC: 24 },
        { week: 'هفته ۳', PV: 40, EV: 36, AC: 39 },
        { week: 'هفته ۴', PV: 55, EV: 50, AC: 54 },
      ];
    }

    return weekNumbers.map((week) => {
      const weekReports = reports.filter((r) => r.weekNumber === week);
      const totalPV = weekReports.reduce((acc, r) => acc + (r.plannedCost || 0), 0);
      const totalEV = weekReports.reduce((acc, r) => acc + (r.earnedValueCost || 0), 0);
      const totalAC = weekReports.reduce((acc, r) => acc + (r.actualCost || 0), 0);

      const rep = weekReports[0];
      const weekLabel = rep && rep.reportingPeriodStart && rep.reportingPeriodEnd
        ? `از ${rep.reportingPeriodStart} تا ${rep.reportingPeriodEnd}`
        : rep ? `تا تاریخ ${rep.reportDate}` : `هفته ${toPersianDigits(week)}`;

      return {
        week: weekLabel,
        PV: Math.round(totalPV),
        EV: Math.round(totalEV),
        AC: Math.round(totalAC),
      };
    });
  }, [reports]);

  // Critical alerts list
  const criticalProjects = useMemo(() => {
    return portfolioMetrics.projectLatestStats.filter(
      (p) => p.latestReport?.trafficLightStatus === 'red' || p.latestReport?.trafficLightStatus === 'yellow'
    );
  }, [portfolioMetrics]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Bar: Title on Right (pure white text), Time Range Filter on Left */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Right side in RTL: Title & Subtitle in white */}
        <div className="text-right">
          <h1 className="text-2xl font-black font-vazir text-white tracking-tight">
            داشبورد اجرایی پروژه‌ها
          </h1>
          <p className="text-xs text-white/90 mt-1">
            نمای کلی وضعیت سبد پروژه‌های سازمان
          </p>
        </div>

        {/* Left side in RTL: Time range filter box */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b1324] border border-[#1e293b] text-slate-300 shadow-md">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">بازه زمانی:</span>
            <div className="relative flex items-center">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent text-xs font-bold text-white pr-1 pl-6 py-0.5 border-none focus:outline-hidden focus:ring-0 cursor-pointer appearance-none"
              >
                <option value="3months" className="bg-[#0b1324] text-white">۳ ماه گذشته</option>
                <option value="1month" className="bg-[#0b1324] text-white">ماه جاری</option>
                <option value="6months" className="bg-[#0b1324] text-white">۶ ماه گذشته</option>
                <option value="year" className="bg-[#0b1324] text-white">سال جاری</option>
                <option value="all" className="bg-[#0b1324] text-white">کل دوره</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-0 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 5 Executive KPI Cards with Real Data and 3-digit dot separated budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
        
        {/* Card 1 (Far Right in RTL): Active Projects */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1324] border border-[#1e293b] flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all duration-200 min-h-[160px] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-semibold text-slate-300">پروژه‌های فعال</span>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
          </div>
          <div className="my-auto py-1.5 text-center">
            <div className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-black font-vazir text-white tracking-tight">
              {toPersianDigits(dynamicKpiStats.activeCount)}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] xl:text-[11px] text-slate-400 truncate">
            {dynamicKpiStats.completedCount > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{toPersianDigits(dynamicKpiStats.completedCount)} پروژه خاتمه‌یافته</span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">بدون تغییر نسبت به دوره قبل</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2 (Second from Right): Total Approved Budget (3-digit dot separated) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1324] border border-[#1e293b] flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all duration-200 min-h-[160px] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-semibold text-slate-300">بودجه مصوب کل</span>
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
          </div>
          <div className="my-auto py-1 text-center">
            <div className="text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black font-vazir text-white tracking-tight px-1">
              {formatNumberWithDots(dynamicKpiStats.totalBAC)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">میلیون تومان</div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] xl:text-[11px] text-slate-400 truncate">
            {dynamicKpiStats.costDelta > 0 ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">+{formatNumberWithDots(dynamicKpiStats.costDelta)} م.ت هزینه اخیر</span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">مطابق سقف بودجه مصوب</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3 (Center): Overall Portfolio Progress */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1324] border border-[#1e293b] flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all duration-200 min-h-[160px] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-semibold text-slate-300">پیشرفت کل سبد پروژه‌ها</span>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
          </div>
          <div className="my-auto py-1.5 text-center">
            <div className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-black font-vazir text-white tracking-tight">
              {formatPercent(dynamicKpiStats.currentEvPct, 1)}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] xl:text-[11px] text-slate-400 truncate">
            {dynamicKpiStats.evGrowth > 0 ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">+{toPersianDigits(dynamicKpiStats.evGrowth)}٪ رشد نسبت به دوره قبل</span>
              </>
            ) : dynamicKpiStats.evGrowth < 0 ? (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{toPersianDigits(Math.abs(dynamicKpiStats.evGrowth))}٪ افت نسبت به دوره قبل</span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">بدون تغییر نسبت به دوره قبل</span>
              </>
            )}
          </div>
        </div>

        {/* Card 4 (Fourth from Right / Second from Left): Projects At Risk */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1324] border border-[#1e293b] flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all duration-200 min-h-[160px] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-semibold text-amber-300">پروژه‌های در معرض خطر</span>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
          </div>
          <div className="my-auto py-1.5 text-center">
            <div className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-black font-vazir text-white tracking-tight">
              {toPersianDigits(dynamicKpiStats.yellowCount)}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] xl:text-[11px] text-slate-400 truncate">
            {dynamicKpiStats.yellowDiff > 0 ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">+{toPersianDigits(dynamicKpiStats.yellowDiff)} مورد بیشتر نسبت به دوره قبل</span>
              </>
            ) : dynamicKpiStats.yellowDiff < 0 ? (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{toPersianDigits(Math.abs(dynamicKpiStats.yellowDiff))} مورد بهبود نسبت به دوره قبل</span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">بدون تغییر نسبت به دوره قبل</span>
              </>
            )}
          </div>
        </div>

        {/* Card 5 (Far Left in RTL): Critical Projects */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1324] border border-[#1e293b] flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all duration-200 min-h-[160px] overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-[13px] font-semibold text-rose-300">پروژه‌های بحرانی</span>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
          </div>
          <div className="my-auto py-1.5 text-center">
            <div className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-black font-vazir text-white tracking-tight">
              {toPersianDigits(dynamicKpiStats.redCount)}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] xl:text-[11px] text-slate-400 truncate">
            {dynamicKpiStats.redDiff > 0 ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">+{toPersianDigits(dynamicKpiStats.redDiff)} مورد بیشتر نسبت به دوره قبل</span>
              </>
            ) : dynamicKpiStats.redDiff < 0 ? (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{toPersianDigits(Math.abs(dynamicKpiStats.redDiff))} مورد کاهش نسبت به دوره قبل</span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">بدون تغییر نسبت به دوره قبل</span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Main Visuals Row: S-Curve Chart & Critical Projects Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* S-Curve EVM Chart (2 Columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                منحنی تجمعی پیشرفت و ارزش کسب‌شده
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> برنامه‌ای (PV)
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> کسب‌شده (EV)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> هزینه واقعی (AC)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sCurveData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.7} />
                <XAxis dataKey="week" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={9.5} tickLine={false} interval="preserveStartEnd" height={32} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? '#334155' : '#cbd5e1', 
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderRadius: '12px', 
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(lbl) => `بازه زمانی: ${lbl}`}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('fa-IR')} م.ت`,
                    name === 'PV' ? 'ارزش برنامه‌ای (PV)' : name === 'EV' ? 'ارزش کسب‌شده (EV)' : 'هزینه واقعی (AC)'
                  ]}
                />
                <Line type="monotone" dataKey="PV" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="EV" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="AC" stroke="#f43f5e" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4, fill: '#f43f5e' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-transparent">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">مجموع ارزش برنامه‌ای (PV)</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono">{formatCurrency(portfolioMetrics.totalPlannedCost)}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-transparent">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">مجموع ارزش کسب‌شده (EV)</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">{formatCurrency(portfolioMetrics.totalEarnedValueCost)}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-transparent">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">مجموع هزینه واقعی (AC)</span>
              <span className="font-bold text-rose-700 dark:text-rose-300 font-mono">{formatCurrency(portfolioMetrics.totalActualCost)}</span>
            </div>
          </div>
        </div>

        {/* Critical Alerts & Delays Feed (1 Column) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                رادار ریسک و تاخیرات بحرانی
              </h2>
              <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/30">
                {toPersianDigits(criticalProjects.length)} هشدار
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
              {criticalProjects.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                  هیچ پروژه بحرانی در پورتفولیو شناسایی نشد.
                </div>
              ) : (
                criticalProjects.map(({ project, latestReport, evm }) => {
                  const badge = getStatusBadge(evm.status);
                  return (
                    <div
                      key={project.id}
                      onClick={() => onSelectProject(project)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition cursor-pointer space-y-2 group shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                          {project.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg} ${badge.textCol} ${badge.border}`}>
                          {badge.text}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">پیشرفت واقعی: </span>
                          <span className="font-bold text-sky-600 dark:text-sky-300">{formatPercent(evm.evPct)}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400"> (بیس‌لاین: {formatPercent(evm.pvPct)})</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">شاخص SPI: </span>
                          <span className={`font-bold ${evm.spi < 0.9 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {toPersianDigits(evm.spi.toFixed(2))}
                          </span>
                        </div>
                      </div>

                      {latestReport?.keyIssuesAndDelays && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">علت انحراف: </span>
                          {latestReport.keyIssuesAndDelays}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">مشاهده کلیه گزارش‌ها:</span>
            <button
              onClick={() => onSelectTab('weekly_reports')}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>گزارش‌های هفتگی</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Projects Quick Status Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              ماتریس وضعیت پروژه‌های پورتفولیو
            </h2>
          </div>
          <button
            onClick={() => onSelectTab('projects')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>مشاهده همه پروژه‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="pb-3 pr-2 font-medium">کد و نام پروژه</th>
                <th className="pb-3 font-medium">مدیر پروژه</th>
                <th className="pb-3 font-medium">پیشرفت (PV / EV)</th>
                <th className="pb-3 font-medium text-center">شاخص CPI</th>
                <th className="pb-3 font-medium text-center">شاخص SPI</th>
                <th className="pb-3 font-medium text-center">وضعیت</th>
                <th className="pb-3 font-medium text-center">جزئیات</th>
                <th className="pb-3 pl-2 font-medium text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {portfolioMetrics.projectLatestStats.map(({ project, latestReport, evm }) => {
                const badge = getStatusBadge(evm.status);
                return (
                  <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer" onClick={() => onSelectProject(project)}>
                        {project.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{toPersianDigits(project.code)}</div>
                    </td>
                    <td className="py-3.5 text-slate-700 dark:text-slate-300">{project.managerName}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sky-600 dark:text-sky-400">{formatPercent(evm.evPct)}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">/ {formatPercent(evm.pvPct)}</span>
                      </div>
                      <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-sky-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, evm.evPct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`font-bold ${evm.cpi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {toPersianDigits(evm.cpi.toFixed(2))}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`font-bold ${evm.spi >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {toPersianDigits(evm.spi.toFixed(2))}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center w-20 h-7 text-[11px] font-bold rounded-lg border ${badge.bg} ${badge.textCol} ${badge.border} text-center shadow-xs mx-auto`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => onSelectProject(project)}
                        className="inline-flex items-center justify-center w-20 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs mx-auto"
                      >
                        جزئیات
                      </button>
                    </td>
                    <td className="py-3.5 pl-2 text-center">
                      {currentUser.role !== 'Executive_Viewer' ? (
                        <button
                          onClick={() => onOpenNewReport(project.id)}
                          className="inline-flex items-center justify-center w-20 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-600/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold transition cursor-pointer border border-indigo-200 dark:border-indigo-500/30 shadow-xs mx-auto"
                        >
                          ثبت گزارش
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectProject(project)}
                          className="inline-flex items-center justify-center w-20 h-7 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-[11px] font-semibold border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 mx-auto"
                        >
                          مشاهده
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project-Specific S-Curve Progress & Forecast Trajectory (EAC_t) */}
      <SCurveAnalytics
        projects={projects}
        reports={reports}
        currentUser={currentUser}
        onSelectProject={onSelectProject}
        onOpenNewReport={onOpenNewReport}
      />

    </div>
  );
};
