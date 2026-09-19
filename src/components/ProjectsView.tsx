import React, { useState, useMemo } from 'react';
import { Project, WeeklyProgressReport, User, ProjectAssignment, ProjectStatus, GanttStatus, CharterStatus } from '../types';
import { formatCurrency } from '../utils/evmCalculations';
import { 
  Table, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer,
  FileSpreadsheet,
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  FileText, 
  Building, 
  User as UserIcon, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  RefreshCw,
  X,
  ChevronDown,
  Layers,
  BarChart2,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  XCircle,
  Eye
} from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { CEOApprovalModal } from './CEOApprovalModal';
import { FinancialCodeModal } from './FinancialCodeModal';
import { ProjectStatusChangeModal } from './ProjectStatusChangeModal';
import { ProjectsPdfReportModal } from './ProjectsPdfReportModal';

interface ProjectsViewProps {
  projects: Project[];
  reports: WeeklyProgressReport[];
  assignments: ProjectAssignment[];
  users: User[];
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onOpenNewReport: (projectId: number) => void;
  onOpenNewProject: () => void;
  onUpdateProjectStatus?: (projectId: number, newStatus: ProjectStatus) => void;
  onUpdateProject?: (project: Project) => void;
  onOpenActivities?: (project: Project) => void;
}

type SortField = 'id' | 'code' | 'name' | 'budgetBAC' | 'managerName' | 'responsibleUnit' | 'ganttStatus' | 'charterStatus' | 'baselineStartDate' | 'baselineFinishDate' | 'status';

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  reports,
  assignments,
  users,
  currentUser,
  onSelectProject,
  onOpenNewReport,
  onOpenNewProject,
  onUpdateProjectStatus,
  onUpdateProject,
  onOpenActivities,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ganttFilter, setGanttFilter] = useState<string>('all');
  const [charterFilter, setCharterFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [ceoApprovalProject, setCeoApprovalProject] = useState<Project | null>(null);
  const [financialCodeProject, setFinancialCodeProject] = useState<Project | null>(null);
  const [statusChangeProject, setStatusChangeProject] = useState<Project | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Extract unique responsible units for filter dropdown
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    projects.forEach((p) => {
      if (p.responsibleUnit) units.add(p.responsibleUnit);
      else if (p.category) units.add(p.category);
    });
    return Array.from(units);
  }, [projects]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper to get the latest description for a project (latest weekly report's issues/delays if available, otherwise project.description)
  const getLatestProjectDescription = (project: Project): string => {
    const projectReports = reports
      .filter((r) => r.projectId === project.id && r.keyIssuesAndDelays && r.keyIssuesAndDelays.trim().length > 0)
      .sort((a, b) => {
        const dateA = a.reportDate || a.createdAt || '';
        const dateB = b.reportDate || b.createdAt || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.id || 0) - (a.id || 0);
      });

    if (projectReports.length > 0 && projectReports[0].keyIssuesAndDelays) {
      return projectReports[0].keyIssuesAndDelays.trim();
    }
    return project.description || '';
  };

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    return projects
      .map((p) => {
        const latestDesc = getLatestProjectDescription(p);
        return latestDesc !== p.description ? { ...p, description: latestDesc } : p;
      })
      .filter((p) => {
        // Search filter
        const unit = p.responsibleUnit || p.category || '';
        const desc = p.description || '';
        const searchLower = searchTerm.toLowerCase();
        
        const matchesSearch =
          p.name.toLowerCase().includes(searchLower) ||
          p.code.toLowerCase().includes(searchLower) ||
          p.managerName.toLowerCase().includes(searchLower) ||
          unit.toLowerCase().includes(searchLower) ||
          desc.toLowerCase().includes(searchLower);

        // Status filters
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesGantt = ganttFilter === 'all' || (p.ganttStatus || 'مصوب') === ganttFilter;
        const matchesCharter = charterFilter === 'all' || (p.charterStatus || 'مصوب') === charterFilter;
        const matchesUnit = unitFilter === 'all' || unit === unitFilter;

        // RBAC Filter: If user is Project_Controller, check if assigned
        if (currentUser.role === 'Project_Controller') {
          const isAssigned = assignments.some(
            (a) => a.projectId === p.id && a.userId === currentUser.id && a.isActive
          );
          return matchesSearch && matchesStatus && matchesGantt && matchesCharter && matchesUnit && isAssigned;
        }

        return matchesSearch && matchesStatus && matchesGantt && matchesCharter && matchesUnit;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof Project] ?? '';
        let valB: any = b[sortField as keyof Project] ?? '';

        if (sortField === 'responsibleUnit') {
          valA = a.responsibleUnit || a.category || '';
          valB = b.responsibleUnit || b.category || '';
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA);
        const strB = String(valB);
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB, 'fa')
          : strB.localeCompare(strA, 'fa');
      });
  }, [projects, reports, searchTerm, statusFilter, ganttFilter, charterFilter, unitFilter, sortField, sortDirection, currentUser, assignments]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const totalBAC = projects.reduce((sum, p) => sum + (p.budgetBAC || 0), 0);
    const pendingCeoCount = projects.filter((p) => p.status === 'pending_ceo').length;
    const underReviewCount = projects.filter((p) => p.status === 'under_review').length;
    const activeCount = projects.filter((p) => p.status === 'active').length;
    const planningCount = projects.filter((p) => p.status === 'planning').length;
    const onHoldCount = projects.filter((p) => p.status === 'on_hold').length;
    const completedCount = projects.filter((p) => p.status === 'completed').length;

    return { total, totalBAC, pendingCeoCount, underReviewCount, activeCount, planningCount, onHoldCount, completedCount };
  }, [projects]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      'ردیف',
      'کد پروژه',
      'عنوان پروژه',
      'بودجه کل پروژه (میلیون تومان)',
      'مسئول پروژه',
      'واحد مسئول',
      'وضعیت گانت',
      'وضعیت شناسنامه',
      'کد تفضیلی مالی',
      'تاریخ شروع مبنا',
      'تاریخ پایان مصوب',
      'وضعیت پروژه',
      'شماره صورتجلسه/مصوبه',
      'توضیحات',
    ];

    const getStatusText = (status: ProjectStatus) => {
      switch (status) {
        case 'pending_ceo': return 'در انتظار تایید مدیرعامل';
        case 'under_review': return 'در حال تعیین تکلیف';
        case 'planning': return 'در انتظار کد مالی';
        case 'active': return 'در حال انجام (مصوب)';
        case 'on_hold': return 'متوقف (با مصوبه)';
        case 'cancelled': return 'رد شده / مختومه';
        case 'completed': return 'پایان یافته';
        default: return status;
      }
    };

    const rows = filteredAndSortedProjects.map((p, idx) => [
      (idx + 1).toString(),
      p.code,
      `"${p.name.replace(/"/g, '""')}"`,
      p.budgetBAC.toString(),
      `"${p.managerName.replace(/"/g, '""')}"`,
      `"${(p.responsibleUnit || p.category || '').replace(/"/g, '""')}"`,
      p.ganttStatus || 'مصوب',
      p.charterStatus || 'مصوب',
      p.financialDetailCode || '',
      p.baselineStartDate,
      p.baselineFinishDate,
      `"${getStatusText(p.status)}"`,
      `"${p.meetingMinutesRef || ''}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Projects_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export / Print to PDF
  const handleExportPDF = () => {
    setIsPdfModalOpen(true);
  };

  // Status Badge Helper (Comprehensive with tooltip and audit notes)
  const renderStatusBadge = (status: ProjectStatus, project?: Project) => {
    switch (status) {
      case 'pending_ceo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 shadow-xs animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>در انتظار تایید مدیرعامل</span>
          </span>
        );
      case 'under_review':
        return (
          <div className="flex flex-col items-center gap-0.5" title={project?.ceoRejectionReason ? `علت عدم تایید: ${project.ceoRejectionReason}` : 'در حال تعیین تکلیف'}>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800 shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span>در حال تعیین تکلیف</span>
            </span>
            {project?.ceoRejectionReason && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[130px] truncate">
                رد توسط مدیرعامل
              </span>
            )}
          </div>
        );
      case 'planning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>در انتظار کد مالی</span>
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>در حال انجام (مصوب)</span>
          </span>
        );
      case 'on_hold':
        return (
          <div className="flex flex-col items-center gap-0.5" title={project?.meetingMinutesRef ? `مصوبه: ${project.meetingMinutesRef}` : 'پروژه متوقف شده'}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-xs">
              <PauseCircle className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>متوقف (با مصوبه)</span>
            </span>
            {project?.meetingMinutesRef && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                {project.meetingMinutesRef}
              </span>
            )}
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex flex-col items-center gap-0.5" title={project?.meetingMinutesRef ? `مصوبه: ${project.meetingMinutesRef}` : 'پروژه لغو شده'}>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 shadow-xs">
              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>رد شده / مختومه</span>
            </span>
            {project?.meetingMinutesRef && (
              <span className="text-[9px] text-rose-600 dark:text-rose-400 font-mono">
                {project.meetingMinutesRef}
              </span>
            )}
          </div>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>پایان یافته</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-xs">
            <span>{status}</span>
          </span>
        );
    }
  };

  // Helper for Gantt & Charter Badges
  const renderGanttBadge = (ganttStatus?: string) => {
    const val = ganttStatus || 'مصوب';
    if (val === 'مصوب') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80">مصوب</span>;
    }
    if (val === 'در حال تهیه') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80">در حال تهیه</span>;
    }
    if (val === 'نیازمند بازنگری') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/80">نیازمند بازنگری</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">فاقد گانت</span>;
  };

  const renderCharterBadge = (charterStatus?: string, financialCode?: string, isExempt?: boolean) => {
    const val = charterStatus || 'مصوب';
    if (val === 'در انتظار تایید مدیرعامل') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80">
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>در انتظار مدیرعامل</span>
        </span>
      );
    }
    if (val === 'در حال تعیین تکلیف') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/80">
          <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
          <span>در حال تعیین تکلیف</span>
        </span>
      );
    }
    if (val === 'مصوب') {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>مصوب و تایید شده</span>
          </span>
          {financialCode && (
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400" title={`کد تفضیلی مالی: ${financialCode}`}>
              کد مالی: {financialCode}
            </span>
          )}
          {isExempt && (
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
              معاف از کد مالی
            </span>
          )}
        </div>
      );
    }
    if (val === 'در حال تدوین') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/80">
          در انتظار کد مالی
        </span>
      );
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">فاقد شناسنامه</span>;
  };

  return (
    <div className="space-y-5 pb-12 font-sans" dir="rtl">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Table className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              جدول جامع پروژه‌ها و محدوده کاری سازمان
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export to Excel */}
          <button
            id="btn-projects-export-excel"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-xs"
            title="خروجی فایل اکسل با فرمت CSV UTF-8"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>خروجی اکسل (Excel)</span>
          </button>

          {/* Export / Print PDF */}
          <button
            id="btn-projects-export-pdf"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 transition cursor-pointer shadow-xs"
            title="خروجی و چاپ PDF گزارش جامع پروژه‌ها"
          >
            <Printer className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>خروجی PDF / چاپ</span>
          </button>

          {/* New Project */}
          {currentUser.role === 'Admin' && (
            <button
              id="btn-projects-create-new"
              onClick={onOpenNewProject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تعریف پروژه جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">کل پروژه‌های سازمان</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{metrics.total}</span>
            <span className="text-[10px] text-indigo-500 font-semibold">پروژه ثبت‌شده</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex flex-col justify-between bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>در انتظار تایید مدیرعامل</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300">{metrics.pendingCeoCount}</span>
            <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">کارتابل مدیریت</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-sm flex flex-col justify-between bg-orange-50/20 dark:bg-orange-950/10">
          <div className="flex items-center gap-1.5 text-[11px] text-orange-700 dark:text-orange-300">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>در حال تعیین تکلیف</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold font-mono text-orange-700 dark:text-orange-300">{metrics.underReviewCount}</span>
            <span className="text-[10px] text-orange-600/70 dark:text-orange-400/70">رد / بازنگری</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm flex flex-col justify-between bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>در حال انجام (مصوب)</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">{metrics.activeCount}</span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">دارای پیشرفت</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col justify-between bg-slate-50/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span>متوقف با مصوبه</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold font-mono text-slate-700 dark:text-slate-300">{metrics.onHoldCount}</span>
            <span className="text-[10px] text-slate-500">دارای صورتجلسه</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-teal-200 dark:border-teal-900/50 shadow-sm flex flex-col justify-between bg-teal-50/20 dark:bg-teal-950/10">
          <div className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            <span>پایان یافته</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300">{metrics.completedCount}</span>
            <span className="text-[10px] text-teal-600/70 dark:text-teal-400/70">تحویل قطعی</span>
          </div>
        </div>
      </div>

      {/* Excel Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Universal Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-projects-filter-search"
              type="text"
              placeholder="جستجوی سریع در کد، نام، مسئول، واحد یا توضیحات پروژه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Filter by Project Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">وضعیت:</span>
              <select
                id="filter-projects-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending_ceo">در انتظار تایید مدیرعامل</option>
                <option value="under_review">در حال تعیین تکلیف (رد شده)</option>
                <option value="planning">در انتظار کد مالی</option>
                <option value="active">در حال انجام (مصوب)</option>
                <option value="on_hold">متوقف (با مصوبه)</option>
                <option value="cancelled">رد شده / مختومه</option>
                <option value="completed">پایان یافته</option>
              </select>
            </div>

            {/* Filter by Gantt Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">گانت:</span>
              <select
                id="filter-projects-gantt"
                value={ganttFilter}
                onChange={(e) => setGanttFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">همه وضعیت‌های گانت</option>
                <option value="مصوب">مصوب شده</option>
                <option value="در حال تهیه">در حال تهیه</option>
                <option value="نیازمند بازنگری">نیازمند بازنگری</option>
                <option value="فاقد گانت">فاقد گانت</option>
              </select>
            </div>

            {/* Filter by Charter Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 whitespace-nowrap">شناسنامه:</span>
              <select
                id="filter-projects-charter"
                value={charterFilter}
                onChange={(e) => setCharterFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">همه شناسنامه‌ها</option>
                <option value="مصوب">مصوب شده</option>
                <option value="در حال تدوین">در حال تدوین</option>
                <option value="فاقد شناسنامه">فاقد شناسنامه</option>
              </select>
            </div>

            {/* Filter by Unit */}
            {uniqueUnits.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 whitespace-nowrap">واحد:</span>
                <select
                  id="filter-projects-unit"
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer font-medium max-w-[150px] truncate"
                >
                  <option value="all">همه واحدها</option>
                  {uniqueUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Filters */}
            {(searchTerm || statusFilter !== 'all' || ganttFilter !== 'all' || charterFilter !== 'all' || unitFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setGanttFilter('all');
                  setCharterFilter('all');
                  setUnitFilter('all');
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer flex items-center gap-1"
                title="پاکسازی فیلترها"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>حذف فیلترها</span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* Main Excel-like Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-right border-collapse text-xs">
            
            {/* Table Header (Excel Columns) */}
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold select-none sticky top-0 z-10">
                
                {/* 0. Row # */}
                <th className="p-3 text-center w-12 border-l border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-400">
                  #
                </th>

                {/* 1. Project Code */}
                <th 
                  onClick={() => handleSort('code')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>کد پروژه</span>
                    {sortField === 'code' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 2. Project Title */}
                <th 
                  onClick={() => handleSort('name')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition min-w-[220px]"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>عنوان پروژه</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 3. Total Budget (BAC) */}
                <th 
                  onClick={() => handleSort('budgetBAC')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition whitespace-nowrap text-left"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>بودجه کل (BAC)</span>
                    {sortField === 'budgetBAC' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 4. Project Manager */}
                <th 
                  onClick={() => handleSort('managerName')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>مسئول پروژه</span>
                    {sortField === 'managerName' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 5. Responsible Unit */}
                <th 
                  onClick={() => handleSort('responsibleUnit')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition min-w-[160px]"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>واحد مسئول</span>
                    {sortField === 'responsibleUnit' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 6. Gantt Status */}
                <th 
                  onClick={() => handleSort('ganttStatus')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition text-center whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>وضعیت گانت</span>
                    {sortField === 'ganttStatus' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 7. Charter Status */}
                <th 
                  onClick={() => handleSort('charterStatus')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition text-center whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>وضعیت شناسنامه</span>
                    {sortField === 'charterStatus' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 8. Baseline Start Date */}
                <th 
                  onClick={() => handleSort('baselineStartDate')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>تاریخ شروع مبنا</span>
                    {sortField === 'baselineStartDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 9. Baseline Finish Date */}
                <th 
                  onClick={() => handleSort('baselineFinishDate')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>تاریخ پایان مصوب</span>
                    {sortField === 'baselineFinishDate' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 10. Project Status */}
                <th 
                  onClick={() => handleSort('status')}
                  className="p-3 border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition whitespace-nowrap text-center min-w-[130px]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>وضعیت پروژه</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>

                {/* 11. Notes / Description (Last Column) */}
                <th className="p-3 border-l border-slate-200 dark:border-slate-800 min-w-[200px]">
                  <span>توضیحات</span>
                </th>

                {/* 12. Actions */}
                <th className="p-3 text-center w-24 whitespace-nowrap">
                  <span>عملیات</span>
                </th>

              </tr>
            </thead>

            {/* Table Body (Rows) */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-normal">
              {filteredAndSortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <Table className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">پروژه‌ای با معیارهای فیلتر شده یافت نشد.</p>
                    <p className="text-xs text-slate-400 mt-1">می‌توانید فیلترها را تغییر داده یا پروژه جدیدی تعریف نمایید.</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedProjects.map((project, index) => {
                  const unit = project.responsibleUnit || project.category || 'عمومی';

                  return (
                    <tr 
                      key={project.id}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors group"
                    >
                      {/* 0. Row Index */}
                      <td className="p-3 text-center font-mono text-[11px] text-slate-400 border-l border-slate-200 dark:border-slate-800">
                        {index + 1}
                      </td>

                      {/* 1. Project Code */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                          {project.code}
                        </span>
                      </td>

                      {/* 2. Project Title */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer" onClick={() => onSelectProject(project)}>
                          {project.name}
                        </div>
                      </td>

                      {/* 3. Total Budget (BAC) */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 whitespace-nowrap text-left font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {Number(project.budgetBAC).toLocaleString('fa-IR')}
                        </span>
                        <span className="text-[10px] text-slate-400 mr-1">م.ت</span>
                      </td>

                      {/* 4. Project Manager */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{project.managerName}</span>
                        </div>
                      </td>

                      {/* 5. Responsible Unit */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]" title={unit}>{unit}</span>
                        </div>
                      </td>

                      {/* 6. Gantt Status */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                        {renderGanttBadge(project.ganttStatus)}
                      </td>

                      {/* 7. Charter Status */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                        {renderCharterBadge(
                          project.charterStatus, 
                          project.financialDetailCode, 
                          project.needsFinancialCode === false
                        )}
                      </td>

                      {/* 8. Baseline Start Date */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 text-center whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                        {project.baselineStartDate}
                      </td>

                      {/* 9. Baseline Finish Date */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 text-center whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">
                        {project.baselineFinishDate}
                      </td>

                      {/* 10. Project Status */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                        {renderStatusBadge(project.status)}
                      </td>

                      {/* 11. Notes / Description */}
                      <td className="p-3 border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                        <p className="line-clamp-2 max-w-[260px] leading-relaxed" title={project.description}>
                          {project.description || '—'}
                        </p>
                      </td>

                      {/* 12. Actions */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* 1. View Details & S-Curve */}
                          <button
                            id={`btn-view-evm-${project.id}`}
                            onClick={() => onSelectProject(project)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="مشاهده شناسنامه و نمودار S-Curve"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 1.5. WBS & Schedule Activities Button */}
                          <button
                            id={`btn-activities-${project.id}`}
                            onClick={() => onOpenActivities && onOpenActivities(project)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer relative"
                            title="فعالیت‌ها و ساختار شکست کار (WBS & زمان‌بندی MSP)"
                          >
                            <Layers className="w-4 h-4" />
                            {project.scheduleTasks && project.scheduleTasks.length > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                            )}
                          </button>

                          {/* 2. CEO Approval & Review Button */}
                          {(currentUser.role === 'Admin' || project.status === 'pending_ceo' || project.status === 'under_review') && (
                            <button
                              id={`btn-ceo-approval-${project.id}`}
                              onClick={() => setCeoApprovalProject(project)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                project.status === 'pending_ceo'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                                  : project.status === 'under_review'
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
                                  : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title="کارتابل تاییدیه و نظر مدیرعامل"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* 3. Assign Financial Detail Code */}
                          {(currentUser.role === 'Admin' || currentUser.role === 'Project_Controller' || project.status === 'planning') && (
                            <button
                              id={`btn-financial-code-${project.id}`}
                              onClick={() => setFinancialCodeProject(project)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                project.status === 'planning' && !project.financialDetailCode
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                                  : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title="تخصیص یا ویرایش کد تفضیلی مالی"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* 4. Status Change with Meeting Minutes (Audit Log) */}
                          {currentUser.role !== 'Executive_Viewer' && (
                            <button
                              id={`btn-status-change-${project.id}`}
                              onClick={() => setStatusChangeProject(project)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="تغییر وضعیت رسمی با مصوبه صورتجلسه (توقف، رد، فعال‌سازی)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* 5. General Edit */}
                          {currentUser.role !== 'Executive_Viewer' && (
                            <button
                              id={`btn-edit-project-${project.id}`}
                              onClick={() => setEditingProject(project)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="ویرایش مشخصات پروژه"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Total Summary */}
            {filteredAndSortedProjects.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100/80 dark:bg-slate-950 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <td colSpan={3} className="p-3 text-right border-l border-slate-200 dark:border-slate-800">
                    <span>مجموع موارد نمایش داده شده ({filteredAndSortedProjects.length} پروژه):</span>
                  </td>
                  <td className="p-3 text-left font-mono border-l border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300">
                    {filteredAndSortedProjects
                      .reduce((sum, p) => sum + (p.budgetBAC || 0), 0)
                      .toLocaleString('fa-IR')}{' '}
                    <span className="text-[10px] text-slate-400">م.ت</span>
                  </td>
                  <td colSpan={9} className="p-3 text-slate-400 text-[11px]">
                    کلیه اطلاعات جدول طبق آخرین خطوط مبنای مصوب به‌روزرسانی شده است.
                  </td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onSave={(updated) => {
            if (onUpdateProject) {
              onUpdateProject(updated);
            }
            setEditingProject(null);
          }}
        />
      )}

      {/* CEO Approval Modal */}
      {ceoApprovalProject && (
        <CEOApprovalModal
          isOpen={!!ceoApprovalProject}
          onClose={() => setCeoApprovalProject(null)}
          project={ceoApprovalProject}
          currentUser={currentUser}
          onConfirmApproval={(updatedProject) => {
            if (onUpdateProject) {
              onUpdateProject(updatedProject);
            }
            setCeoApprovalProject(null);
          }}
        />
      )}

      {/* Financial Code Assignment Modal */}
      {financialCodeProject && (
        <FinancialCodeModal
          isOpen={!!financialCodeProject}
          onClose={() => setFinancialCodeProject(null)}
          project={financialCodeProject}
          currentUser={currentUser}
          onSaveFinancialCode={(updatedProject) => {
            if (onUpdateProject) {
              onUpdateProject(updatedProject);
            }
            setFinancialCodeProject(null);
          }}
        />
      )}

      {/* Project Status Change Modal (with Meeting Minutes audit) */}
      {statusChangeProject && (
        <ProjectStatusChangeModal
          isOpen={!!statusChangeProject}
          onClose={() => setStatusChangeProject(null)}
          project={statusChangeProject}
          currentUser={currentUser}
          onConfirmStatusChange={(updatedProject) => {
            if (onUpdateProject) {
              onUpdateProject(updatedProject);
            }
            setStatusChangeProject(null);
          }}
        />
      )}

      {/* Projects Official PDF Report Modal */}
      {isPdfModalOpen && (
        <ProjectsPdfReportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          projects={filteredAndSortedProjects}
          currentUser={currentUser}
          activeFilterUnit={unitFilter}
          activeFilterStatus={statusFilter}
          searchTerm={searchTerm}
        />
      )}

    </div>
  );
};

// Modal for editing project details inline
interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(project.name);
  const [managerName, setManagerName] = useState(project.managerName);
  const [responsibleUnit, setResponsibleUnit] = useState(project.responsibleUnit || project.category || '');
  const [budgetBAC, setBudgetBAC] = useState(project.budgetBAC);
  const [ganttStatus, setGanttStatus] = useState<string>(project.ganttStatus || 'مصوب');
  const [charterStatus, setCharterStatus] = useState<string>(project.charterStatus || 'مصوب');
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [baselineStart, setBaselineStart] = useState(project.baselineStartDate);
  const [baselineFinish, setBaselineFinish] = useState(project.baselineFinishDate);
  const [description, setDescription] = useState(project.description);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...project,
      name,
      managerName,
      responsibleUnit,
      budgetBAC: Number(budgetBAC),
      ganttStatus,
      charterStatus,
      status,
      baselineStartDate: baselineStart,
      baselineFinishDate: baselineFinish,
      description,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 flex flex-col text-right">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">ویرایش اطلاعات پروژه ({project.code})</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">اصلاح وضعیت، بودجه، مسئول، واحد و خطوط مبنا</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                عنوان پروژه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                مسئول پروژه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                واحد مسئول <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={responsibleUnit}
                onChange={(e) => setResponsibleUnit(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                بودجه کل BAC (میلیون تومان) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={budgetBAC}
                onChange={(e) => setBudgetBAC(Number(e.target.value))}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وضعیت گانت</label>
              <select
                value={ganttStatus}
                onChange={(e) => setGanttStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="مصوب">مصوب شده</option>
                <option value="در حال تهیه">در حال تهیه</option>
                <option value="نیازمند بازنگری">نیازمند بازنگری</option>
                <option value="فاقد گانت">فاقد گانت</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وضعیت شناسنامه</label>
              <select
                value={charterStatus}
                onChange={(e) => setCharterStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="مصوب">مصوب شده</option>
                <option value="در حال تدوین">در حال تدوین</option>
                <option value="فاقد شناسنامه">فاقد شناسنامه</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">وضعیت پروژه</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="active">در حال انجام (Active)</option>
                <option value="planning">در حال بررسی (Planning)</option>
                <option value="on_hold">متوقف (On Hold)</option>
                <option value="completed">پایان یافته (Completed)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <JalaliDatePicker
                label="تاریخ شروع مبنا"
                value={baselineStart}
                onChange={setBaselineStart}
                placeholder="۱۴۰۳/۰۶/۰۱"
              />
            </div>

            <div>
              <JalaliDatePicker
                label="تاریخ پایان مصوب"
                value={baselineFinish}
                onChange={setBaselineFinish}
                placeholder="۱۴۰۴/۱۲/۲۹"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">توضیحات</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="توضیحات تکمیلی یا موانع پروژه..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ذخیره تغییرات</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
