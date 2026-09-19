import { Project, WeeklyProgressReport, AppNotification, User } from '../types';
import { calculateEVM, toPersianDigits } from './evmCalculations';

const STORAGE_KEY_READ_IDS = 'pmo_notifications_read_ids_v1';
const STORAGE_KEY_DISMISSED_IDS = 'pmo_notifications_dismissed_ids_v1';

export function getReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ_IDS);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_READ_IDS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('Failed to save read notification ids', e);
  }
}

export function getDismissedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED_IDS);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function saveDismissedNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISMISSED_IDS, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.error('Failed to save dismissed notification ids', e);
  }
}

/**
 * Dynamically computes system notifications from projects and weekly reports data
 */
export function generateSystemNotifications(
  projects: Project[],
  reports: WeeklyProgressReport[],
  currentUser?: User
): AppNotification[] {
  const readIds = getReadNotificationIds();
  const dismissedIds = getDismissedNotificationIds();
  const list: AppNotification[] = [];

  projects.forEach((proj) => {
    // Project's sorted reports (latest first)
    const projReports = reports
      .filter((r) => r.projectId === proj.id)
      .sort((a, b) => (b.weekNumber || 0) - (a.weekNumber || 0) || b.id - a.id);

    const latestReport = projReports[0];

    // --- 1. EVM Alerts (هشدارهای فنی و انحرافات تحلیلی) ---
    if (latestReport) {
      const evm = calculateEVM(
        proj.budgetBAC,
        latestReport.plannedValuePct,
        latestReport.earnedValuePct,
        latestReport.actualCost
      );

      // 1.1 SPI Critical / Delay alert
      if (evm.spi < 0.90 || latestReport.trafficLightStatus === 'red') {
        const notifId = `evm_spi_delay_${proj.id}_${latestReport.id}`;
        if (!dismissedIds.has(notifId)) {
          list.push({
            id: notifId,
            title: `هشدار تاخیر زمانی شدید (SPI: ${toPersianDigits(evm.spi.toFixed(2))})`,
            description: `پروژه «${proj.name}» با انحراف زمانی مواجه است (پیشرفت واقعی: ${toPersianDigits(latestReport.earnedValuePct)}٪ در برابر برنامه: ${toPersianDigits(latestReport.plannedValuePct)}٪).`,
            category: 'evm_alert',
            severity: 'critical',
            timestamp: 'امروز، آخرین پایش EVM',
            projectId: proj.id,
            reportId: latestReport.id,
            actionType: 'scurve',
            actionLabel: 'تحلیل منحنی S-Curve',
            isRead: readIds.has(notifId),
            createdAt: latestReport.createdAt || new Date().toISOString(),
          });
        }
      }

      // 1.2 CPI / Cost Overrun alert
      if (evm.cpi < 0.90 && latestReport.actualCost > 0) {
        const notifId = `evm_cpi_cost_${proj.id}_${latestReport.id}`;
        if (!dismissedIds.has(notifId)) {
          list.push({
            id: notifId,
            title: `هشدار اضافه هزینه و مصرف بیش از بودجه (CPI: ${toPersianDigits(evm.cpi.toFixed(2))})`,
            description: `در پروژه «${proj.name}» هزینه واقعی ثبت‌شده فراتر از ارزش کسب‌شده محقق‌شده است.`,
            category: 'evm_alert',
            severity: 'warning',
            timestamp: 'دیروز',
            projectId: proj.id,
            reportId: latestReport.id,
            actionType: 'view_project',
            actionLabel: 'مشاهده جزئیات مالی',
            isRead: readIds.has(notifId),
            createdAt: latestReport.createdAt || new Date().toISOString(),
          });
        }
      }
    }

    // 1.3 On-hold or Stopped project alert
    if (proj.status === 'on_hold') {
      const notifId = `project_on_hold_${proj.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          title: `پروژه در وضعیت متوقف (On Hold)`,
          description: `عملیات اجرایی پروژه «${proj.name}» متوقف است. نیازمند بررسی موانع در کمیته عالی پروژه.`,
          category: 'evm_alert',
          severity: 'warning',
          timestamp: '۲ روز پیش',
          projectId: proj.id,
          actionType: 'view_project',
          actionLabel: 'بررسی علل توقف',
          isRead: readIds.has(notifId),
          createdAt: proj.updatedAt || new Date().toISOString(),
        });
      }
    }

    // --- 2. Workflow & Approvals (فرآیندها، جریان‌های کاری و تاییدیه‌ها) ---
    // 2.1 Awaiting CEO approval
    if (proj.status === 'pending_ceo' || proj.ceoApprovalStatus === 'pending') {
      const notifId = `workflow_ceo_${proj.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          title: `شناسنامه در انتظار تایید مدیرعامل`,
          description: `شناسنامه اولیه پروژه «${proj.name}» تدوین شده و در کارتابل بررسی مدیریت ارشد قرار دارد.`,
          category: 'approval_workflow',
          severity: 'warning',
          timestamp: 'امروز، کارتابل مدیریت',
          projectId: proj.id,
          actionType: 'ceo_approval',
          actionLabel: 'مشاهده و تایید مدیرعامل',
          isRead: readIds.has(notifId),
          createdAt: proj.createdAt || new Date().toISOString(),
        });
      }
    }

    // 2.2 Project Needs Financial Code (planning stage)
    if ((proj.status === 'planning' || !proj.financialDetailCode) && proj.needsFinancialCode !== false && proj.status !== 'completed' && proj.status !== 'cancelled') {
      const notifId = `workflow_financial_code_${proj.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          title: `نیازمند تخصیص کد تفضیلی مالی`,
          description: `پروژه «${proj.name}» نیازمند صدور و درج کد تفضیلی اختصاصی از سیستم مالی است.`,
          category: 'approval_workflow',
          severity: 'info',
          timestamp: '۳ روز پیش',
          projectId: proj.id,
          actionType: 'financial_code',
          actionLabel: 'تخصیص کد مالی',
          isRead: readIds.has(notifId),
          createdAt: proj.createdAt || new Date().toISOString(),
        });
      }
    }

    // 2.3 Recent weekly report submission notification
    if (latestReport) {
      const notifId = `workflow_report_sub_${latestReport.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          title: `ثبت گزارش پیشرفت هفتگی دوره اخیر`,
          description: `گزارش پیشرفت دوره اخیر برای پروژه «${proj.name}» ثبت گردید.`,
          category: 'approval_workflow',
          severity: 'info',
          timestamp: 'دوره اخیر',
          projectId: proj.id,
          reportId: latestReport.id,
          actionType: 'view_reports',
          actionLabel: 'مشاهده گزارشات',
          isRead: readIds.has(notifId),
          createdAt: latestReport.createdAt || new Date().toISOString(),
        });
      }
    }

    // --- 3. Deadlines & Reminders (یادآوری‌های زمانی و موعدها) ---
    // 3.1 Active project with missing recent report
    if (proj.status === 'active' && (!projReports || projReports.length === 0)) {
      const notifId = `deadline_missing_report_${proj.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          title: `سررسید ثبت اولین گزارش پیشرفت هفتگی`,
          description: `پروژه فعال «${proj.name}» فاقد گزارش هفتگی است. لطفاً گزارش پیشرفت را ثبت فرمایید.`,
          category: 'deadline_reminder',
          severity: 'warning',
          timestamp: 'موعد هفتگی',
          projectId: proj.id,
          actionType: 'new_report',
          actionLabel: 'ثبت سریع گزارش',
          isRead: readIds.has(notifId),
          createdAt: proj.createdAt || new Date().toISOString(),
        });
      }
    }

    // 3.2 Baseline Finish Reminder (if finish date is specified)
    if (proj.baselineFinishDate && proj.status === 'active') {
      const notifId = `deadline_finish_${proj.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          title: `یادآوری موعد مصوب اتمام پروژه`,
          description: `موعد پایان مصوب گانت پروژه «${proj.name}» تاریخ ${toPersianDigits(proj.baselineFinishDate)} می‌باشد.`,
          category: 'deadline_reminder',
          severity: 'info',
          timestamp: 'برنامه مصوب',
          projectId: proj.id,
          actionType: 'view_project',
          actionLabel: 'کنترل مایلستون‌ها',
          isRead: readIds.has(notifId),
          createdAt: proj.updatedAt || new Date().toISOString(),
        });
      }
    }
  });

  return list;
}
