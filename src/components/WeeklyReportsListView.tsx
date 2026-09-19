import React, { useState, useMemo } from 'react';
import { Project, WeeklyProgressReport, User } from '../types';
import { calculateEVM, formatPercent } from '../utils/evmCalculations';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Download,
  Edit3,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface WeeklyReportsListViewProps {
  reports: WeeklyProgressReport[];
  projects: Project[];
  users: User[];
  currentUser: User;
  onOpenNewReport: (projectId?: number) => void;
  onEditReport?: (report: WeeklyProgressReport) => void;
  onDeleteReport?: (reportId: number) => void;
  onSelectProject: (project: Project) => void;
}

export const getReportStatusInfo = (report: WeeklyProgressReport) => {
  const pv = report.plannedValuePct ?? 0;
  const ev = report.earnedValuePct ?? 0;
  const spi = pv > 0 ? Number((ev / pv).toFixed(2)) : 1.0;

  let status: 'red' | 'yellow' | 'green' = 'green';
  if (report.trafficLightStatus === 'red' || spi < 0.90 || (pv > 0 && ev < pv - 10)) {
    status = 'red';
  } else if (report.trafficLightStatus === 'yellow' || spi < 1.00 || (pv > 0 && ev < pv - 2)) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  return { spi, status };
};

export const WeeklyReportsListView: React.FC<WeeklyReportsListViewProps> = ({
  reports,
  projects,
  users,
  currentUser,
  onOpenNewReport,
  onEditReport,
  onDeleteReport,
  onSelectProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [reportToDelete, setReportToDelete] = useState<WeeklyProgressReport | null>(null);

  // Status metrics counts
  const counts = useMemo(() => {
    let red = 0;
    let yellow = 0;
    let green = 0;
    reports.forEach((r) => {
      const st = getReportStatusInfo(r).status;
      if (st === 'red') red++;
      else if (st === 'yellow') yellow++;
      else green++;
    });
    return { total: reports.length, red, yellow, green };
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const project = projects.find((p) => p.id === r.projectId);
      const matchesProject = selectedProjectId === 'all' || r.projectId === Number(selectedProjectId);
      const { status } = getReportStatusInfo(r);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const matchesSearch =
        (project?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project?.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.keyIssuesAndDelays.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.weekNumber).includes(searchTerm);

      return matchesProject && matchesStatus && matchesSearch;
    });
  }, [reports, projects, selectedProjectId, statusFilter, searchTerm]);

  const exportCSV = () => {
    const headers = ['کد پروژه', 'نام پروژه', 'شماره هفته', 'تاریخ گزارش', 'PV%', 'EV%', 'هزینه واقعی AC (م.ت)', 'CPI', 'SPI', 'وضعیت RAG', 'علت انحراف'];
    const rows = filteredReports.map((r) => {
      const p = projects.find((proj) => proj.id === r.projectId);
      const evm = calculateEVM(p?.budgetBAC || 0, r.plannedValuePct, r.earnedValuePct, r.actualCost);
      return [
        p?.code || '',
        `"${p?.name || ''}"`,
        r.weekNumber,
        r.reportDate,
        r.plannedValuePct,
        r.earnedValuePct,
        r.actualCost,
        evm.cpi,
        evm.spi,
        r.trafficLightStatus,
        `"${r.keyIssuesAndDelays.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PMO_Weekly_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusStyles: Record<'red' | 'yellow' | 'green', {
    rowBg: string;
    borderRight: string;
    titleColor: string;
    label: string;
  }> = {
    red: {
      rowBg: 'bg-rose-950/20 hover:bg-rose-950/35',
      borderRight: 'border-r-4 border-r-rose-500/80',
      titleColor: 'text-rose-400 hover:text-rose-300',
      label: 'بحرانی (SPI < ۰.۹۰)',
    },
    yellow: {
      rowBg: 'bg-amber-950/15 hover:bg-amber-950/30',
      borderRight: 'border-r-4 border-r-amber-500/80',
      titleColor: 'text-amber-400 hover:text-amber-300',
      label: 'هشدار (۰.۹۰ ≤ SPI < ۱.۰۰)',
    },
    green: {
      rowBg: 'bg-emerald-950/15 hover:bg-emerald-950/30',
      borderRight: 'border-r-4 border-r-emerald-500/80',
      titleColor: 'text-emerald-400 hover:text-emerald-300',
      label: 'مطلوب (SPI ≥ ۱.۰۰)',
    },
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>آرشیو و جدول گزارش‌های پیشرفت هفتگی</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>خروجی اکسل (CSV)</span>
          </button>

          {currentUser.role !== 'Executive_Viewer' && (
            <button
              onClick={() => onOpenNewReport()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت گزارش جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در نام یا کد پروژه یا متن تاخیرات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Project Selector Filter */}
          <div>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">همه پروژه‌ها</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status / SPI Quick Filter Chips */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1 ml-2">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>فیلتر وضعیت SPI:</span>
          </span>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <span>همه موارد</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('red')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'red'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : 'bg-rose-950/30 text-rose-300 hover:bg-rose-950/50 border border-rose-800/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>بحرانی (SPI &lt; ۰.۹۰)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {counts.red}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('yellow')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'yellow'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                : 'bg-amber-950/30 text-amber-300 hover:bg-amber-950/50 border border-amber-800/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>هشدار (۰.۹۰ تا ۱.۰۰)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {counts.yellow}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('green')}
            className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'green'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50 border border-emerald-800/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>مطلوب (SPI &ge; ۱.۰۰)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
              {counts.green}
            </span>
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 px-3 font-medium text-center">پروژه</th>
                <th className="pb-3 px-2 font-medium text-center">تاریخ گزارش</th>
                <th className="pb-3 px-2 font-medium text-center">پیشرفت برنامه‌ای</th>
                <th className="pb-3 px-2 font-medium text-center">پیشرفت واقعی</th>
                <th className="pb-3 px-2 font-medium text-center">ثبت‌کننده</th>
                <th className="pb-3 px-2 font-medium text-center">شرح موانع و تاخیرات</th>
                <th className="pb-3 px-2 font-medium text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    گزارشی با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const project = projects.find((p) => p.id === report.projectId);
                  const submitter = users.find((u) => u.id === report.submittedById);
                  const statusInfo = getReportStatusInfo(report);
                  const st = statusStyles[statusInfo.status];

                  return (
                    <tr
                      key={report.id}
                      className={`${st.rowBg} transition-colors duration-150`}
                    >
                      {/* 1. Project Info + Left/Right indicator stripe */}
                      <td className={`py-3.5 px-3 ${st.borderRight}`}>
                        <div
                          onClick={() => project && onSelectProject(project)}
                          className={`font-bold ${st.titleColor} cursor-pointer transition`}
                          title={`پروژه: ${project?.name || ''}`}
                        >
                          {project?.name || 'پروژه ناشناس'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {project?.code}
                        </div>
                      </td>

                      {/* 2. Report Date */}
                      <td className="py-3.5 px-2 font-mono text-center text-slate-300">
                        {report.reportDate}
                      </td>

                      {/* 3. Planned Value % */}
                      <td className="py-3.5 px-2 font-mono text-center text-slate-300">
                        {formatPercent(report.plannedValuePct)}
                      </td>

                      {/* 4. Earned Value % */}
                      <td className="py-3.5 px-2 font-mono font-bold text-center text-sky-400">
                        {formatPercent(report.earnedValuePct)}
                      </td>

                      {/* 5. Submitter */}
                      <td className="py-3.5 px-2 text-center text-slate-400">
                        <div className="text-xs text-slate-300">{submitter?.fullName || 'کارشناس'}</div>
                        <div className="text-[10px] text-slate-400">{submitter?.role === 'Admin' ? 'مدیر ارشد' : 'کارشناس کنترل'}</div>
                      </td>

                      {/* 6. Key Issues & Delays */}
                      <td className="py-3.5 px-2 max-w-sm">
                        <p className="text-[11px] text-slate-300 line-clamp-2" title={report.keyIssuesAndDelays}>
                          {report.keyIssuesAndDelays}
                        </p>
                      </td>

                      {/* 7. Action Buttons (Edit & Delete) */}
                      <td className="py-3.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            id={`btn-edit-report-${report.id}`}
                            onClick={() => onEditReport?.(report)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 transition cursor-pointer"
                            title="اصلاح گزارش"
                            aria-label="اصلاح گزارش"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            id={`btn-delete-report-${report.id}`}
                            onClick={() => setReportToDelete(report)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition cursor-pointer"
                            title="حذف گزارش"
                            aria-label="حذف گزارش"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-rose-950/30 text-right space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">تایید حذف گزارش پیشرفت</h3>
                <p className="text-xs text-slate-400 mt-0.5">عملیات حذف سطر گزارش هفتگی</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              آیا از حذف این گزارش مربوط به پروژه{' '}
              <span className="font-bold text-white">
                «{projects.find((p) => p.id === reportToDelete.projectId)?.name || 'پروژه'}»
              </span>{' '}
              (تاریخ ثبت: <span className="font-mono text-white">{reportToDelete.reportDate}</span>) اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                id="btn-confirm-delete-report"
                onClick={() => {
                  if (onDeleteReport) {
                    onDeleteReport(reportToDelete.id);
                  }
                  setReportToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>بله، حذف شود</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
