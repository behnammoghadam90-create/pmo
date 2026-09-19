export type UserRole = 'Admin' | 'Project_Controller' | 'Executive_Viewer';

export interface Organization {
  id: string;              // شناسه یکتا سازمانی
  name: string;            // نام کامل شرکت یا سازمان
  shortCode: string;       // کد یا نماد اختصاری شرکتی (مثال: KSG یا PSG)
  subtitle?: string;       // عنوان سامانه در هدر و فرم‌ها
  industry?: string;       // حوزه فعالیت، صنعت یا خط تولید
  color?: string;          // کد رنگ یا تم سازمانی
  logoUrl?: string;        // آدرس فایل لوگوی سازمان (در پوشه public یا وب)
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  email: string;
  avatar: string;
  department: string;
  position: string; // سمت سازمانی
  phone: string;    // شماره همراه
  password?: string;
  isApproved?: boolean;
  registeredAt?: string;
  organizationId?: string;          // شناسه سازمان اختصاصی کاربر
  allowedOrganizationIds?: string[]; // سازمان‌های مجاز برای کاربر
  isSuperAdmin?: boolean;           // دسترسی ویژه مدیر کل به تمام سازمان‌ها و ایجاد سازمان جدید
}

export type ProjectStatus = 
  | 'pending_ceo'   // در انتظار تایید مدیرعامل
  | 'under_review'  // در حال تعیین تکلیف (رد توسط مدیرعامل یا در حال بازنگری)
  | 'planning'      // در حال برنامه‌ریزی / در انتظار تخصیص کد مالی
  | 'active'        // در حال انجام (مصوب)
  | 'on_hold'       // متوقف (با مصوبه صورتجلسه)
  | 'cancelled'     // رد شده / مختومه (با مصوبه صورتجلسه)
  | 'completed';    // پایان یافته

export type TrafficLightStatus = 'green' | 'yellow' | 'red';
export type GanttStatus = 'مصوب' | 'در حال تهیه' | 'فاقد گانت' | 'نیازمند بازنگری';
export type CharterStatus = 'مصوب' | 'در حال تدوین' | 'فاقد شناسنامه' | 'در انتظار تایید مدیرعامل' | 'در حال تعیین تکلیف';

export type ProjectRationale = 
  | 'جهت بهبود فرآیندها و سیستم‌ها'
  | 'افزایش ظرفیت تولید یا خدمات'
  | 'افزایش بهره‌وری و کاهش اتلاف'
  | 'مصوبه جلسات هماهنگی سازمانی'
  | 'مصوبه و تکلیف هیئت مدیره'
  | 'الزامات قانونی و حاکمیتی'
  | 'سایر موارد';

export type GanttRequirement = 'مورد نیاز است' | 'مورد نیاز نیست' | 'فقط گزارشات مستمر پروژه ارائه شود';
export type CEOApprovalDecision = 'approved' | 'rejected' | 'pending';

export interface StatusHistoryEntry {
  id: string;
  fromStatus: ProjectStatus;
  toStatus: ProjectStatus;
  reason: string;
  meetingMinutesRef?: string; // شماره بند و صورتجلسه
  meetingDate?: string;       // تاریخ جلسه
  decisionAuthority?: string; // مرجع تصویب‌کننده (هیئت مدیره، کمیته فنی و...)
  changedBy: string;
  changedAt: string;
}

export interface ProjectCostEstimateItem {
  id: string;
  costType: string;
  estimatedAmount: number; // in Million Tomans (میلیون تومان)
  description?: string;
}

export interface ProjectActivityItem {
  id: string;
  activityName: string;
  durationDays: number; // مدت زمان به روز
  responsiblePerson?: string;
}

export type ROIBenefitType = 
  | 'direct_revenue'     // درآمدزایی و فروش مستقیم
  | 'cost_reduction'     // کاهش هزینه و صرفه‌جویی عملیاتی
  | 'capacity_expansion' // افزایش ظرفیت تولید و خدمات
  | 'hybrid';            // ترکیبی (درآمدزایی + صرفه‌جویی)

export interface AIScenarioAnalysis {
  scenarioName: 'optimistic' | 'base' | 'pessimistic';
  title: string;
  expectedReturn: number;      // in Million Tomans
  roiPct: number;              // درصد بازگشت سرمایه
  paybackPeriodMonths: number; // دوره بازگشت به ماه
  description: string;
}

export interface ProjectROI {
  // ورودی‌های محاسباتی
  investmentCost: number;       // کل سرمایه‌گذاری اولیه (پیش‌فرض از جمع هزینه‌ها BAC) به میلیون تومان
  benefitType: ROIBenefitType;  // مدل عایدی یا صرفه‌جویی
  expectedReturnAmount: number; // کل درآمد یا صرفه‌جویی پیش‌بینی‌شده به میلیون تومان
  horizonMonths: number;        // افق زمانی بهره‌برداری به ماه (مثلاً ۱۲، ۲۴، ۳۶، ۶۰)
  annualOperationalCost?: number; // هزینه سالیانه نگهداری/بهره‌برداری به میلیون تومان

  // نتایج شاخص‌های کلیدی بازگشت سرمایه
  netProfit: number;            // سود خالص = عایدی - سرمایه‌گذاری (میلیون تومان)
  roiPercentage: number;        // نرخ بازگشت سرمایه به درصد
  paybackPeriodMonths: number;  // دوره بازگشت سرمایه به ماه
  bcr: number;                  // نسبت فایده به هزینه (Benefit-Cost Ratio)
  feasibilityLevel: 'exceptional' | 'acceptable' | 'marginal' | 'unfeasible'; // سطح توجیه‌پذیری طرح

  // تحلیل و خروجی هوش مصنوعی
  executivePitch?: string;      // خلاصه توجیه اقتصادی و بیانیه تصمیم‌گیری برای مدیرعامل
  aiScenarios?: AIScenarioAnalysis[]; // سناریوهای سه‌گانه
  aiSuggestions?: string[];     // راهکارهای بهینه‌سازی مالی هوش مصنوعی
  risksAndAssumptions?: string[]; // مفروضات و ریسک‌های کلیدی
  aiModelUsed?: string;         // موتور هوش مصنوعی استفاده شده (Gemini یا سفارشی)
  lastCalculatedAt?: string;    // زمان آخرین ارزیابی
}

export interface ProjectScheduleTask {
  id: string;
  wbs: string;                 // کد ساختار شکست WBS (مثال: ۱, ۱.۱, ۱.۲, ۲)
  name: string;                // نام فعالیت
  level: number;               // سطح سلسله‌مراتب (0 = فعالیت سطح اصلی, 1 = زیرفعالیت, 2 = زیرفعالیت سطح ۲)
  startDate: string;           // تاریخ شروع شمسی (مثال: ۱۴۰۳/۰۲/۰۱)
  finishDate: string;          // تاریخ پایان شمسی (مثال: ۱۴۰۳/۰۳/۱۵)
  durationDays: number;        // مدت زمان به روز
  predecessorId?: string;      // شناسه فعالیت پیش‌نیاز (Finish-to-Start)
  predecessorWbs?: string;     // کد WBS فعالیت پیش‌نیاز جهت نمایش سریع
  predecessorName?: string;    // نام فعالیت پیش‌نیاز
  isSummary?: boolean;         // آیا سامری تسک است (دارای زیرفعالیت با محاسبه خودکار)
  isCollapsed?: boolean;       // وضعیت جمع/باز بودن در جدول
  progressPct?: number;        // درصد پیشرفت فیزیکی (۰ تا ۱۰۰)
  responsiblePerson?: string;  // مسئول اجرا
  notes?: string;              // یادداشت و توضیحات
}

export interface Project {
  id: number;
  code: string;
  name: string;
  description: string;
  managerName: string;
  responsibleUnit?: string;
  
  // Requester Info (قسمت اول)
  requesterName?: string;
  requesterUnit?: string;
  requestDate?: string;

  // Project Rationale (قسمت دوم)
  rationale?: ProjectRationale | string;

  // Schedule & Baseline (قسمت سوم)
  baselineStartDate: string;
  baselineFinishDate: string;
  durationDays?: number; // مدت زمان کل پروژه به روز
  status: ProjectStatus;

  // Cost Estimation & Feasibility (قسمت چهارم و امکان‌سنجی اقتصادی)
  costEstimates?: ProjectCostEstimateItem[];
  budgetBAC: number; // in Million Tomans (میلیون تومان)
  roi?: ProjectROI; // ارزیابی امکان‌سنجی مالی و نرخ بازگشت سرمایه (ROI)

  // Key Activities (قسمت پنجم)
  activities?: ProjectActivityItem[];
  scheduleTasks?: ProjectScheduleTask[]; // ساختار شکست کار و فعالیت‌های تفصیلی (WBS و زمان‌بندی MSP)

  // CEO Approval & Governance (قسمت ششم و تایید مدیرعامل)
  ceoApprovalStatus?: CEOApprovalDecision;
  ceoOpinion?: string;
  ganttRequirement?: GanttRequirement;
  ceoApprovalDate?: string;
  ceoApproverName?: string;
  ceoRejectionReason?: string;
  needsFinancialCode?: boolean; // آیا نیاز به تعریف کد تفضیلی مالی دارد؟ (پیش‌فرض: بله مگر تیک معافیت زده شود)

  // Financial Unit Integration (کد تفضیلی مالی)
  financialDetailCode?: string; // کد تفضیلی پروژه در سیستم مالی
  financialApprovalDate?: string;
  financialOfficerName?: string;

  // Charter & Gantt Status computed / saved
  ganttStatus?: GanttStatus | string;
  charterStatus?: CharterStatus | string;

  // Official Status Change & Meeting Minutes Audit (مستندات صورتجلسه تغییر وضعیت)
  statusChangeReason?: string;
  meetingMinutesRef?: string; // شماره و بند صورتجلسه (مثال: بند ۴ صورتجلسه شماره ۱۴۰۳/۱۸)
  meetingDate?: string;       // تاریخ جلسه تصویب
  decisionAuthority?: string; // مرجع تصمیم‌گیرنده (هیئت مدیره، کمیته عالی راهبری، کارفرما)
  statusChangedBy?: string;   // کارشناس کنترل پروژه ثبت‌کننده
  statusChangedAt?: string;   // تاریخ و زمان تغییر وضعیت
  statusHistory?: StatusHistoryEntry[]; // سوابق تغییر وضعیت پروژه

  actualStartDate?: string;
  actualFinishDate?: string;
  category: string;
  organizationId?: string; // شناسه سازمان والد ایزوله
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: number;
  projectId: number;
  userId: number;
  roleInProject: 'controller' | 'lead_pmo' | 'observer';
  assignedAt: string;
  isActive: boolean;
  organizationId?: string;
}

export interface WeeklyProgressReport {
  id: number;
  projectId: number;
  organizationId?: string;
  reportDate: string; // e.g. 1403/06/07 or 2026-08-28
  weekNumber: number;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  plannedValuePct: number; // PV% (0 - 100)
  earnedValuePct: number;  // EV% (0 - 100)
  actualCost: number;      // AC in Million Tomans
  plannedCost: number;     // PV in Million Tomans = (PV% * BAC) / 100
  earnedValueCost: number; // EV in Million Tomans = (EV% * BAC) / 100
  keyIssuesAndDelays: string;
  correctiveActions: string;
  trafficLightStatus: TrafficLightStatus;
  projectStatus?: ProjectStatus;
  submittedById: number;
  createdAt: string;
}

export interface EVMMetrics {
  pvPct: number;
  evPct: number;
  acValue: number;
  pvValue: number;
  evValue: number;
  bac: number;
  cv: number;          // Cost Variance = EV - AC
  sv: number;          // Schedule Variance = EV - PV
  cpi: number;         // Cost Performance Index = EV / AC
  spi: number;         // Schedule Performance Index = EV / PV
  eac: number;         // Estimate at Completion = BAC / CPI
  etc: number;         // Estimate to Complete = EAC - AC
  vac: number;         // Variance at Completion = BAC - EAC
  tcpi: number;        // To Complete Performance Index = (BAC - EV) / (BAC - AC)
  status: TrafficLightStatus;
  healthDescription: string;
}

export type ActiveTab = 'dashboard' | 'projects' | 'weekly_reports' | 'evm_analytics' | 'scurve_analytics' | 'assignments' | 'django_code_hub';

export type ThemeMode = 'dark' | 'light';

export type NotificationCategory = 'evm_alert' | 'approval_workflow' | 'deadline_reminder';
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  timestamp: string;
  projectId?: number;
  reportId?: number;
  actionType?: 'view_project' | 'view_reports' | 'ceo_approval' | 'financial_code' | 'new_report' | 'scurve';
  actionLabel?: string;
  isRead: boolean;
  createdAt: string;
}
