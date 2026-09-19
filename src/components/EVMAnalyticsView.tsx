import React from 'react';
import { Project, WeeklyProgressReport } from '../types';
import { calculateEVM, formatCurrency, formatPercent } from '../utils/evmCalculations';
import { 
  TrendingUp, 
  Activity, 
  Layers, 
  BookOpen, 
  Target, 
  PieChart as PieIcon, 
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';

interface EVMAnalyticsViewProps {
  projects: Project[];
  reports: WeeklyProgressReport[];
  onSelectProject: (project: Project) => void;
}

export const EVMAnalyticsView: React.FC<EVMAnalyticsViewProps> = ({
  projects,
  reports,
  onSelectProject,
}) => {
  // Scatter quadrant data for CPI vs SPI
  const quadrantData = projects.map((p) => {
    const projReports = reports
      .filter((r) => r.projectId === p.id)
      .sort((a, b) => b.weekNumber - a.weekNumber);

    const latest = projReports[0];
    const evm = calculateEVM(
      p.budgetBAC,
      latest?.plannedValuePct || 0,
      latest?.earnedValuePct || 0,
      latest?.actualCost || 0
    );

    return {
      name: p.name,
      code: p.code,
      cpi: evm.cpi,
      spi: evm.spi,
      status: evm.status,
      bac: p.budgetBAC,
    };
  });

  // BAC vs EAC comparison data
  const comparisonData = projects.map((p) => {
    const projReports = reports
      .filter((r) => r.projectId === p.id)
      .sort((a, b) => b.weekNumber - a.weekNumber);

    const latest = projReports[0];
    const evm = calculateEVM(
      p.budgetBAC,
      latest?.plannedValuePct || 0,
      latest?.earnedValuePct || 0,
      latest?.actualCost || 0
    );

    return {
      code: p.code,
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      BAC: Math.round(p.budgetBAC),
      EAC: Math.round(evm.eac),
    };
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <span>ماتریس تحلیلی شاخص‌های مدیریت ارزش کسب‌شده</span>
        </h1>
      </div>

      {/* Visual Row: Quadrant & BAC vs EAC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Quadrant CPI vs SPI */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              ماتریس چهارگانه موقعیت پروژه‌ها
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              محور افقی: شاخص زمان (SPI) | محور عمودی: شاخص هزینه (CPI)
            </p>
          </div>

          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" dataKey="spi" name="SPI" domain={[0.5, 1.5]} stroke="#94a3b8" fontSize={11} />
                <YAxis type="number" dataKey="cpi" name="CPI" domain={[0.5, 1.5]} stroke="#94a3b8" fontSize={11} width={45} tickMargin={6} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isGreen = data.status === 'green';
                      const isYellow = data.status === 'yellow';
                      const statusLabel = isGreen
                        ? 'مطلوب و منطبق بر برنامه'
                        : isYellow
                        ? 'هشدار و نیازمند پایش'
                        : 'بحرانی و دارای انحراف';
                      const statusClass = isGreen
                        ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                        : isYellow
                        ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                        : 'text-rose-400 bg-rose-500/15 border-rose-500/30';

                      return (
                        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-2 min-w-[210px] text-right font-sans">
                          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between gap-2">
                            <span className="font-bold text-white">{data.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">[{data.code}]</span>
                          </div>
                          <div className="space-y-1 text-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">شاخص زمان (SPI):</span>
                              <span className="font-mono font-bold text-white">{data.spi}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">شاخص هزینه (CPI):</span>
                              <span className="font-mono font-bold text-white">{data.cpi}</span>
                            </div>
                          </div>
                          <div className="pt-0.5">
                            <span className={`block w-full text-center text-[10px] py-1 px-2 rounded-lg border font-medium ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Projects" data={quadrantData}>
                  {quadrantData.map((entry, index) => {
                    const color = entry.status === 'green' ? '#10b981' : entry.status === 'yellow' ? '#f59e0b' : '#ef4444';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-emerald-400 font-bold block">ناحیه ۱ (بالا-راست):</span>
              CPI &gt; 1 و SPI &gt; 1: پروژه زیر بودجه و جلوتر از برنامه زمان‌بندی.
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-rose-400 font-bold block">ناحیه ۴ (پایین-چپ):</span>
              CPI &lt; 1 و SPI &lt; 1: پروژه بحرانی؛ دارای تاخیر زمانی و اضافه هزینه.
            </div>
          </div>
        </div>

        {/* BAC vs EAC Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              مقایسه بودجه مصوب در اتمام (BAC) با برآورد هزینه اتمام (EAC)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مبالغ به میلیون تومان بر مبنای آخرین نرخ بهره‌وری هزینه
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: 15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="code" stroke="#94a3b8" fontSize={11} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  width={55}
                  tickMargin={8}
                  tickLine={{ stroke: '#334155' }}
                  axisLine={{ stroke: '#334155' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString('fa-IR')} م.ت`,
                    name === 'BAC' ? 'بودجه مصوب (BAC)' : 'برآورد در اتمام (EAC)'
                  ]}
                />
                <Bar dataKey="BAC" fill="#6366f1" radius={[4, 4, 0, 0]} name="BAC" />
                <Bar dataKey="EAC" fill="#ec4899" radius={[4, 4, 0, 0]} name="EAC" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <span className="w-3 h-3 rounded bg-indigo-500" /> بودجه مصوب (BAC)
            </span>
            <span className="flex items-center gap-1.5 text-pink-300">
              <span className="w-3 h-3 rounded bg-pink-500" /> برآورد کل هزینه در اتمام (EAC)
            </span>
          </div>
        </div>

      </div>

      {/* EVM Standard Formulas Reference Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white">مرجع فرمول‌ها و روابط ریاضی استاندارد مدیریت ارزش کسب‌شده</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">انحراف هزینه (Cost Variance)</span>
            <code className="text-emerald-400 font-bold block my-1 font-mono">CV = EV - AC</code>
            <span className="text-[10px] text-slate-400">مثبت: زیر بودجه | منفی: بیش‌بودجه</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">انحراف زمان‌بندی (Schedule Variance)</span>
            <code className="text-sky-400 font-bold block my-1 font-mono">SV = EV - PV</code>
            <span className="text-[10px] text-slate-400">مثبت: جلوتر از زمان | منفی: تاخیر</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">شاخص عملکرد هزینه (Cost Index)</span>
            <code className="text-indigo-400 font-bold block my-1 font-mono">CPI = EV / AC</code>
            <span className="text-[10px] text-slate-400">&gt; ۱: بازدهی مالی مثبت</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">شاخص عملکرد زمان‌بندی (Schedule Index)</span>
            <code className="text-amber-400 font-bold block my-1 font-mono">SPI = EV / PV</code>
            <span className="text-[10px] text-slate-400">&gt; ۱: سرعت اجرای مناسب</span>
          </div>
        </div>
      </div>

    </div>
  );
};
