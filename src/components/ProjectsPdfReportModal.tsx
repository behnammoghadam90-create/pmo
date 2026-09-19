import React, { useRef } from 'react';
import { Project, User } from '../types';
import {
  Printer,
  Download,
  X,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PauseCircle,
  XCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { getTodayJalali, toPersianDigits } from '../utils/jalali';

interface ProjectsPdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentUser: User;
  activeFilterUnit: string;
  activeFilterStatus: string;
  searchTerm: string;
}

export const ProjectsPdfReportModal: React.FC<ProjectsPdfReportModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentUser,
  activeFilterUnit,
  activeFilterStatus,
  searchTerm
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const [jy, jm, jd] = getTodayJalali();
  const jalaliTodayStr = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const totalBAC = projects.reduce((sum, p) => sum + (p.budgetBAC || 0), 0);
  const pendingCeoCount = projects.filter((p) => p.status === 'pending_ceo').length;
  const underReviewCount = projects.filter((p) => p.status === 'under_review').length;
  const planningCount = projects.filter((p) => p.status === 'planning').length;
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const onHoldCount = projects.filter((p) => p.status === 'on_hold').length;
  const cancelledCount = projects.filter((p) => p.status === 'cancelled').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_ceo':
        return 'در انتظار تایید مدیرعامل';
      case 'under_review':
        return 'در حال تعیین تکلیف (رد شده)';
      case 'planning':
        return 'در انتظار کد مالی';
      case 'active':
        return 'در حال انجام (مصوب)';
      case 'on_hold':
        return 'متوقف (با مصوبه)';
      case 'cancelled':
        return 'رد شده / مختومه';
      case 'completed':
        return 'پایان یافته';
      default:
        return status;
    }
  };

  const generateReportHtml = () => {
    const tableRowsHtml = projects.map((p, idx) => {
      const statusText = getStatusLabel(p.status);
      const ceoStatus = p.ceoApprovalStatus === 'approved' 
        ? 'تایید شده' 
        : p.ceoApprovalStatus === 'rejected' 
        ? 'رد شده' 
        : 'در انتظار';
      
      const financialCode = p.financialDetailCode 
        ? toPersianDigits(p.financialDetailCode) 
        : p.isFinancialCodeExempt 
        ? 'معاف از کد' 
        : 'فاقد کد';

      const requesterInfo = p.requesterName 
        ? `${p.requesterName} (${p.requestingUnit || 'نامشخص'})` 
        : (p.requestingUnit || '-');

      const durationStr = p.durationDays ? `${toPersianDigits(p.durationDays)} روز` : '-';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 6px 4px; text-align: center; font-size: 11px; font-weight: bold; color: #475569;">${toPersianDigits(idx + 1)}</td>
          <td style="padding: 6px 6px; text-align: center; font-size: 11px; font-weight: bold; color: #1e293b;">${toPersianDigits(p.code || p.id)}</td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: right;">
            <div style="font-weight: bold; color: #0f172a;">${p.title || p.name}</div>
            ${p.description ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">${p.description.slice(0, 90)}${p.description.length > 90 ? '...' : ''}</div>` : ''}
          </td>
          <td style="padding: 6px 6px; font-size: 10.5px; text-align: right; color: #334155;">${requesterInfo}</td>
          <td style="padding: 6px 6px; font-size: 10px; text-align: right; color: #475569;">${p.projectRationale || '-'}</td>
          <td style="padding: 6px 6px; font-size: 10.5px; text-align: right; color: #334155;">
            <div style="font-weight: 600;">${p.responsibleUnit || p.category || '-'}</div>
            ${p.manager ? `<div style="font-size: 9.5px; color: #64748b;">${p.manager}</div>` : ''}
          </td>
          <td style="padding: 6px 4px; text-align: center; font-size: 10px; color: #334155;">
            <div>${toPersianDigits(p.baselineStartDate || '-')}</div>
            <div>${toPersianDigits(p.baselineFinishDate || '-')}</div>
            <div style="font-size: 9px; color: #64748b;">(${durationStr})</div>
          </td>
          <td style="padding: 6px 4px; text-align: center; font-size: 10px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; ${
              p.ceoApprovalStatus === 'approved' ? 'background: #dcfce7; color: #15803d;' :
              p.ceoApprovalStatus === 'rejected' ? 'background: #fee2e2; color: #b91c1c;' :
              'background: #fef3c7; color: #b45309;'
            }">${ceoStatus}</span>
          </td>
          <td style="padding: 6px 4px; text-align: center; font-size: 10px; color: #334155;">
            <div>گانت: ${p.ganttStatus || 'مصوب'}</div>
            <div style="font-size: 9px; color: #64748b;">شناسنامه: ${p.charterStatus || 'مصوب'}</div>
          </td>
          <td style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: #1e40af;">
            ${financialCode}
          </td>
          <td style="padding: 6px 6px; text-align: center; font-size: 10.5px;">
            <span style="display: inline-block; padding: 3px 6px; border-radius: 4px; font-weight: bold; ${
              p.status === 'active' ? 'background: #e0f2fe; color: #0369a1;' :
              p.status === 'pending_ceo' ? 'background: #fef3c7; color: #b45309;' :
              p.status === 'under_review' ? 'background: #ffedd5; color: #c2410c;' :
              p.status === 'planning' ? 'background: #dbeafe; color: #1d4ed8;' :
              p.status === 'on_hold' ? 'background: #f1f5f9; color: #334155;' :
              p.status === 'cancelled' ? 'background: #ffe4e6; color: #be123c;' :
              'background: #ccfbf1; color: #0f766e;'
            }">${statusText}</span>
          </td>
          <td style="padding: 6px 6px; text-align: center; font-size: 10px; color: #475569;">
            ${toPersianDigits(p.meetingMinutesRef || '-')}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>گزارش رسمی پایش و فهرست پروژه‌ها - ${toPersianDigits(jalaliTodayStr)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif;
            font-feature-settings: 'ss01' 1, 'tnum' 1;
            direction: rtl;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 12px;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-box {
            border: 2px solid #0284c7;
            background: #f0f9ff;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-title {
            font-size: 16px;
            font-weight: 800;
            color: #0369a1;
            margin-bottom: 4px;
          }
          .header-subtitle {
            font-size: 12px;
            color: #334155;
            font-weight: 600;
          }
          .meta-item {
            font-size: 10.5px;
            color: #475569;
            margin-bottom: 2px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 6px;
            margin-bottom: 12px;
          }
          .stat-card {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 6px;
            padding: 6px 8px;
            text-align: center;
          }
          .stat-title {
            font-size: 9px;
            color: #64748b;
            margin-bottom: 2px;
            white-space: nowrap;
          }
          .stat-val {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            padding: 8px 4px;
            font-size: 10.5px;
            font-weight: bold;
            text-align: center;
            border: 1px solid #334155;
          }
          td {
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          .signature-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 24px;
            padding-top: 12px;
            page-break-inside: avoid;
          }
          .sig-box {
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
            height: 90px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .sig-title {
            font-weight: bold;
            font-size: 11px;
            color: #334155;
          }
          .sig-date {
            font-size: 9.5px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="header-title">سامانه یکپارچه مدیریت، پایش و کنترل پروژه‌های سازمانی (PMO & EVM)</div>
            <div class="header-subtitle">گزارش رسمی فهرست، چرخه عمر، محدوده کاری و وضعیت حاکمیتی پروژه‌ها</div>
          </div>
          <div style="text-align: left;">
            <div class="meta-item"><strong>تاریخ صدور:</strong> ${jalaliTodayStr} - ساعت ${timeStr}</div>
            <div class="meta-item"><strong>صادرکننده:</strong> ${currentUser.fullName} (${currentUser.role})</div>
            <div class="meta-item"><strong>فیلتر اعمال‌شده:</strong> ${activeFilterUnit !== 'all' ? `واحد: ${activeFilterUnit}` : 'همه واحدها'} | ${activeFilterStatus !== 'all' ? `وضعیت: ${getStatusLabel(activeFilterStatus)}` : 'همه وضعیت‌ها'}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card" style="border-color: #94a3b8;">
            <div class="stat-title">کل پروژه‌های سازمان</div>
            <div class="stat-val">${toPersianDigits(projects.length)}</div>
          </div>
          <div class="stat-card" style="border-color: #f59e0b; background: #fffbeb;">
            <div class="stat-title">در انتظار تایید مدیرعامل</div>
            <div class="stat-val" style="color: #b45309;">${toPersianDigits(pendingCeoCount)}</div>
          </div>
          <div class="stat-card" style="border-color: #f97316; background: #fff7ed;">
            <div class="stat-title">در حال تعیین تکلیف</div>
            <div class="stat-val" style="color: #c2410c;">${toPersianDigits(underReviewCount)}</div>
          </div>
          <div class="stat-card" style="border-color: #3b82f6; background: #eff6ff;">
            <div class="stat-title">در انتظار کد مالی</div>
            <div class="stat-val" style="color: #1d4ed8;">${toPersianDigits(planningCount)}</div>
          </div>
          <div class="stat-card" style="border-color: #10b981; background: #ecfdf5;">
            <div class="stat-title">در حال انجام (مصوب)</div>
            <div class="stat-val" style="color: #047857;">${toPersianDigits(activeCount)}</div>
          </div>
          <div class="stat-card" style="border-color: #64748b; background: #f8fafc;">
            <div class="stat-title">متوقف (با مصوبه)</div>
            <div class="stat-val" style="color: #334155;">${toPersianDigits(onHoldCount + cancelledCount)}</div>
          </div>
          <div class="stat-card" style="border-color: #14b8a6; background: #f0fdfa;">
            <div class="stat-title">پایان یافته</div>
            <div class="stat-val" style="color: #0f766e;">${toPersianDigits(completedCount)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th style="width: 65px;">کد پروژه</th>
              <th style="width: 170px;">عنوان و شرح پروژه</th>
              <th style="width: 110px;">درخواست‌کننده و واحد</th>
              <th style="width: 110px;">انگیزه / علت تعریف</th>
              <th style="width: 100px;">واحد مسئول و مدیر</th>
              <th style="width: 85px;">تاریخ شروع و پایان</th>
              <th style="width: 75px;">تایید مدیرعامل</th>
              <th style="width: 80px;">گانت و شناسنامه</th>
              <th style="width: 75px;">کد تفضیلی مالی</th>
              <th style="width: 95px;">وضعیت پروژه</th>
              <th style="width: 80px;">شماره مصوبه</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="sig-box">
            <div class="sig-title">کارشناس کنترل پروژه و PMO</div>
            <div class="sig-date">نام و امضا: ............................</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">مدیر برنامه‌ریزی و راهبرد سازمانی</div>
            <div class="sig-date">نام و امضا: ............................</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">تاییدیه مدیریت عامل / معاونت اجرایی</div>
            <div class="sig-date">نام و امضا: ............................</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // 1. Direct Print Execution (Iframe Sandbox bypass)
  const handlePrint = () => {
    const reportHtml = generateReportHtml();
    
    // Create an isolated hidden iframe in the document body
    let printIframe = document.getElementById('projects-print-iframe') as HTMLIFrameElement;
    if (printIframe) {
      document.body.removeChild(printIframe);
    }

    printIframe = document.createElement('iframe');
    printIframe.id = 'projects-print-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(reportHtml);
      doc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print restricted, opening popup window...', err);
          // Fallback to window.open
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(reportHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          } else {
            window.print();
          }
        }
      }, 350);
    }
  };

  // 2. Download Standalone Offline Printable HTML/PDF File
  const handleDownloadHtml = () => {
    const reportHtml = generateReportHtml();
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Projects_Official_Report_${jalaliTodayStr.replace(/\//g, '-')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>پیش‌نمایش و خروجی رسمی PDF فهرست پروژه‌ها</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {projects.length} پروژه
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                قالب استاندارد و رسمی گزارش‌گیری سازمانی با پشتیبانی کامل از چینش افقی (A4 Landscape) و زبان فارسی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-print-modal-trigger"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ مستقیم / ذخیره به عنوان PDF</span>
            </button>

            <button
              id="btn-download-html-report"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="دانلود سند کامل HTML مستقل جهت باز کردن در مرورگر و چاپ آفلاین"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل سند مستقل</span>
            </button>

            <button
              id="btn-close-pdf-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Document Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70 dark:bg-slate-950/80 flex justify-center">
          <div
            ref={printAreaRef}
            className="w-full bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 font-sans text-xs"
            style={{ direction: 'rtl' }}
          >
            {/* Document Header */}
            <div className="border-2 border-sky-600 bg-sky-50/60 rounded-xl p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <div className="text-base sm:text-lg font-black text-sky-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-700 shrink-0" />
                  <span>سامانه یکپارچه مدیریت، پایش و کنترل پروژه‌های سازمانی (PMO & EVM)</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-1">
                  گزارش رسمی فهرست، چرخه عمر، محدوده کاری و وضعیت حاکمیتی پروژه‌ها
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-lg border border-sky-200 shrink-0 space-y-1">
                <div><strong>تاریخ صدور:</strong> {jalaliTodayStr} - ساعت {timeStr}</div>
                <div><strong>صادرکننده:</strong> {currentUser.fullName} ({currentUser.role})</div>
                <div><strong>فیلتر گزارش:</strong> {activeFilterUnit !== 'all' ? activeFilterUnit : 'همه واحدها'}</div>
              </div>
            </div>

            {/* Document KPI Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4 text-center">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">کل پروژه‌ها</div>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">{projects.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-[10px] text-amber-700">در انتظار مدیرعامل</div>
                <div className="text-sm font-bold font-mono text-amber-800 mt-0.5">{pendingCeoCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                <div className="text-[10px] text-orange-700">در حال تعیین تکلیف</div>
                <div className="text-sm font-bold font-mono text-orange-800 mt-0.5">{underReviewCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-[10px] text-blue-700">در انتظار کد مالی</div>
                <div className="text-sm font-bold font-mono text-blue-800 mt-0.5">{planningCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] text-emerald-700">در حال انجام (مصوب)</div>
                <div className="text-sm font-bold font-mono text-emerald-800 mt-0.5">{activeCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 border border-slate-300">
                <div className="text-[10px] text-slate-600">متوقف با مصوبه</div>
                <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">{onHoldCount + cancelledCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-teal-50 border border-teal-200">
                <div className="text-[10px] text-teal-700">پایان یافته</div>
                <div className="text-sm font-bold font-mono text-teal-800 mt-0.5">{completedCount}</div>
              </div>
            </div>

            {/* Projects Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10.5px]">
                    <th className="p-2 text-center border-l border-slate-700 w-8">#</th>
                    <th className="p-2 text-center border-l border-slate-700 w-20">کد پروژه</th>
                    <th className="p-2 border-l border-slate-700 min-w-[160px]">عنوان و شرح پروژه</th>
                    <th className="p-2 border-l border-slate-700 w-28">درخواست‌کننده</th>
                    <th className="p-2 border-l border-slate-700 w-28">علت تعریف</th>
                    <th className="p-2 border-l border-slate-700 w-24">واحد مسئول</th>
                    <th className="p-2 text-center border-l border-slate-700 w-24">تاریخ‌های مبنا</th>
                    <th className="p-2 text-center border-l border-slate-700 w-20">تایید مدیرعامل</th>
                    <th className="p-2 text-center border-l border-slate-700 w-24">گانت/شناسنامه</th>
                    <th className="p-2 text-center border-l border-slate-700 w-20">کد مالی</th>
                    <th className="p-2 text-center border-l border-slate-700 w-24">وضعیت</th>
                    <th className="p-2 text-center w-20">شماره مصوبه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projects.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                      <td className="p-2 text-center font-bold text-slate-500 border-l border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-900 border-l border-slate-200">
                        {p.code || p.id}
                      </td>
                      <td className="p-2 border-l border-slate-200">
                        <div className="font-bold text-slate-900">{p.title || p.name}</div>
                        {p.description && (
                          <div className="text-[9.5px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</div>
                        )}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-slate-700 text-[10px]">
                        {p.requesterName ? `${p.requesterName} (${p.requestingUnit || ''})` : (p.requestingUnit || '-')}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-slate-600 text-[9.5px]">
                        {p.projectRationale || '-'}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-slate-800">
                        <div className="font-semibold">{p.responsibleUnit || p.category || '-'}</div>
                        {p.manager && <div className="text-[9px] text-slate-500">{p.manager}</div>}
                      </td>
                      <td className="p-2 text-center border-l border-slate-200 font-mono text-[9.5px] text-slate-600">
                        <div>{p.baselineStartDate || '-'}</div>
                        <div>{p.baselineFinishDate || '-'}</div>
                      </td>
                      <td className="p-2 text-center border-l border-slate-200">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          p.ceoApprovalStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          p.ceoApprovalStatus === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {p.ceoApprovalStatus === 'approved' ? 'تایید شده' : p.ceoApprovalStatus === 'rejected' ? 'رد شده' : 'در انتظار'}
                        </span>
                      </td>
                      <td className="p-2 text-center border-l border-slate-200 text-[9.5px] text-slate-600">
                        <div>گانت: {p.ganttStatus || 'مصوب'}</div>
                        <div>شناسنامه: {p.charterStatus || 'مصوب'}</div>
                      </td>
                      <td className="p-2 text-center border-l border-slate-200 font-mono font-bold text-[10px] text-blue-700">
                        {p.financialDetailCode || (p.isFinancialCodeExempt ? 'معاف' : '-')}
                      </td>
                      <td className="p-2 text-center border-l border-slate-200">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-bold ${
                          p.status === 'active' ? 'bg-sky-100 text-sky-800' :
                          p.status === 'pending_ceo' ? 'bg-amber-100 text-amber-800' :
                          p.status === 'under_review' ? 'bg-orange-100 text-orange-800' :
                          p.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                          p.status === 'on_hold' ? 'bg-slate-200 text-slate-800' :
                          p.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          'bg-teal-100 text-teal-800'
                        }`}>
                          {getStatusLabel(p.status)}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono text-[9.5px] text-slate-600">
                        {p.meetingMinutesRef || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Approvals Signatures Block */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-4 border-t border-slate-200 text-center">
              <div className="border border-dashed border-slate-300 rounded-lg p-3 h-20 flex flex-col justify-between">
                <div className="font-bold text-slate-700 text-[11px]">کارشناس کنترل پروژه و PMO</div>
                <div className="text-[9.5px] text-slate-400">امضا و تاریخ</div>
              </div>
              <div className="border border-dashed border-slate-300 rounded-lg p-3 h-20 flex flex-col justify-between">
                <div className="font-bold text-slate-700 text-[11px]">مدیر برنامه‌ریزی و راهبرد</div>
                <div className="text-[9.5px] text-slate-400">امضا و تاریخ</div>
              </div>
              <div className="border border-dashed border-slate-300 rounded-lg p-3 h-20 flex flex-col justify-between">
                <div className="font-bold text-slate-700 text-[11px]">تایید مدیریت عامل / معاونت</div>
                <div className="text-[9.5px] text-slate-400">امضا و تاریخ</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div>
            نکته: در صورت تمایل به ذخیره به عنوان فایل PDF، در پنجره چاپ مرورگر گزینه <strong>Destination</strong> را روی <strong>Save as PDF</strong> قرار دهید.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer transition"
          >
            بستن پنجره
          </button>
        </div>

      </div>
    </div>
  );
};
