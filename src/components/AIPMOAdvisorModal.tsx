import React, { useState } from 'react';
import { Project, WeeklyProgressReport } from '../types';
import { calculateEVM, formatCurrency, formatPercent } from '../utils/evmCalculations';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  ShieldAlert, 
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AIPMOAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  reports: WeeklyProgressReport[];
}

export const AIPMOAdvisorModal: React.FC<AIPMOAdvisorModalProps> = ({
  isOpen,
  onClose,
  projects,
  reports,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<number>(projects[0]?.id || 1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectReports = reports
    .filter((r) => r.projectId === currentProject?.id)
    .sort((a, b) => b.weekNumber - a.weekNumber);

  const latest = projectReports[0];
  const evm = calculateEVM(
    currentProject?.budgetBAC || 0,
    latest?.plannedValuePct || 0,
    latest?.earnedValuePct || 0,
    latest?.actualCost || 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col text-right">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-purple-950/60 via-slate-950 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                دستیار و مشاور هوشمند تحلیل انحرافات PMO (AI EVM & Risk Advisor)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تولید توصیه‌های تخصصی مبتنی بر استانداردهای PMBOK، تحلیل واریانس و راهکارهای جبرانی
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Project Picker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-1">انتخاب پروژه برای تحلیل هوشمند:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400">
              <span>آخرین داده ثبت‌شده: </span>
              <strong className="text-white font-mono">{latest?.reportDate || 'بدون گزارش'} (هفته {latest?.weekNumber || 0})</strong>
            </div>
          </div>

          {/* Current EVM State Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">انحراف زمان (SV)</span>
              <span className={`font-mono font-bold text-sm ${evm.sv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evm.sv >= 0 ? '+' : ''}{evm.sv.toLocaleString('fa-IR')} م.ت
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">انحراف هزینه (CV)</span>
              <span className={`font-mono font-bold text-sm ${evm.cv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evm.cv >= 0 ? '+' : ''}{evm.cv.toLocaleString('fa-IR')} م.ت
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">شاخص SPI / CPI</span>
              <span className="font-mono font-bold text-sm text-slate-200">
                {evm.spi} / {evm.cpi}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">برآورد در اتمام (EAC)</span>
              <span className="font-mono font-bold text-sm text-purple-300">
                {formatCurrency(evm.eac)}
              </span>
            </div>
          </div>

          {/* AI Comprehensive Analysis */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 to-slate-950 border border-purple-500/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>ارزیابی وضعیت و تحلیل علل ریشه‌ای (Root Cause Analysis):</span>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <p>
                📌 <strong>تحلیل عملکرد زمانی (Schedule Efficiency):</strong> با توجه به شاخص SPI معادل <code className="font-mono text-purple-300">{evm.spi}</code>، آهنگ اجرای واقعی فعالیت‌های مسیر بحرانی پروژه {evm.spi < 1 ? 'کندتر از خط مبنا' : 'منطبق بر خط مبنا'} است. فاصله بین ارزش برنامه‌ای و ارزش کسب‌شده نشان‌دهنده انحراف زمانی به میزان {Math.abs(evm.evPct - evm.pvPct).toFixed(1)} درصد فیزیکی است.
              </p>
              <p>
                💰 <strong>تحلیل بهره‌وری مالی و هزینه (Cost Performance):</strong> شاخص CPI برابر با <code className="font-mono text-purple-300">{evm.cpi}</code> ثبت شده است؛ به این معنی که به ازای هر ۱۰۰۰ تومان هزینه واقعی مصرف‌شده، به ارزش {Math.round(evm.cpi * 1000).toLocaleString('fa-IR')} تومان پیشرفت فیزیکی محقق گردیده است.
              </p>
              {latest?.keyIssuesAndDelays && (
                <p className="border-t border-slate-800 pt-2 text-amber-300">
                  ⚠️ <strong>مهم‌ترین موانع اعلام‌شده توسط کارشناس:</strong> {latest.keyIssuesAndDelays}
                </p>
              )}
            </div>

            {/* Actionable Strategies */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-white block">
                اقدامات اصلاحی و راهکارهای جبرانی پیشنهادی دفتر PMO:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-bold text-sky-400 block">۱. تکنیک فشرده‌سازی موازی (Fast-Tracking)</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    تبدیل توالی فعالیت‌های پس‌نیاز و پیش‌نیاز مسیر بحرانی به حالت همزمان (SS با تاخیر صفر) برای جبران تاخیرات زمانی.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="font-bold text-emerald-400 block">۲. تزریق منابع و خردسازی (Crashing)</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    افزایش شیفت کاری اکیپ‌های اجرایی به ۲ شیفت و تامین نقدی فوری متریال برای جلوگیری از توقف عملیات کارگاهی.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            بستن پنجره تحلیل
          </button>
        </div>

      </div>
    </div>
  );
};
