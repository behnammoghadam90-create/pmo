import { ProjectROI, AIScenarioAnalysis, ROIBenefitType } from '../types';

/**
 * Real-time ROI Calculator
 * فرمول‌های استاندارد مدیریت مالی و ارزیابی اقتصادی طرح‌ها
 */
export function calculateROI(
  investmentCost: number,
  expectedReturnAmount: number,
  horizonMonths: number = 24,
  annualOperationalCost: number = 0,
  benefitType: ROIBenefitType = 'direct_revenue'
): ProjectROI {
  const cost = Math.max(0, Number(investmentCost) || 0);
  const revenue = Math.max(0, Number(expectedReturnAmount) || 0);
  const horizon = Math.max(1, Number(horizonMonths) || 12);
  const totalOpCost = ((Number(annualOperationalCost) || 0) * horizon) / 12;
  const totalCost = cost + totalOpCost;

  // سود خالص
  const netProfit = revenue - totalCost;

  // نرخ بازگشت سرمایه (ROI %)
  const roiPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  // نسبت فایده به هزینه (BCR)
  const bcr = totalCost > 0 ? Number((revenue / totalCost).toFixed(2)) : 0;

  // دوره بازگشت سرمایه (ماه)
  let paybackPeriodMonths = 0;
  if (revenue > 0) {
    const monthlyReturn = revenue / horizon;
    paybackPeriodMonths = monthlyReturn > 0 ? Number((totalCost / monthlyReturn).toFixed(1)) : horizon;
  }

  // سطح توجیه‌پذیری
  let feasibilityLevel: 'exceptional' | 'acceptable' | 'marginal' | 'unfeasible' = 'acceptable';
  if (roiPercentage >= 40 && bcr >= 1.4 && paybackPeriodMonths <= horizon * 0.7) {
    feasibilityLevel = 'exceptional';
  } else if (roiPercentage >= 15 && bcr >= 1.15) {
    feasibilityLevel = 'acceptable';
  } else if (roiPercentage >= 0 && bcr >= 1.0) {
    feasibilityLevel = 'marginal';
  } else {
    feasibilityLevel = 'unfeasible';
  }

  return {
    investmentCost: cost,
    expectedReturnAmount: revenue,
    benefitType,
    horizonMonths: horizon,
    annualOperationalCost,
    netProfit: Math.round(netProfit),
    roiPercentage: Number(roiPercentage.toFixed(1)),
    paybackPeriodMonths,
    bcr,
    feasibilityLevel,
    lastCalculatedAt: new Date().toISOString(),
  };
}

/**
 * دریافت ویژگی‌های بصری سطح توجیه‌پذیری
 */
export function getFeasibilityBadge(level: ProjectROI['feasibilityLevel'] | undefined) {
  switch (level) {
    case 'exceptional':
      return {
        label: 'توجیه‌پذیری اقتصادی ممتاز و عالی',
        shortLabel: 'ممتاز (ROI بالا)',
        bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
        textCol: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
    case 'acceptable':
      return {
        label: 'توجیه‌پذیری اقتصادی خوب و قابل قبول',
        shortLabel: 'قابل قبول (متعادل)',
        bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
        textCol: 'text-indigo-700 dark:text-indigo-300',
        border: 'border-indigo-500/30',
        dot: 'bg-indigo-500',
      };
    case 'marginal':
      return {
        label: 'توجیه‌پذیری مرزی (نیازمند کنترل دقیق هزینه‌ها)',
        shortLabel: 'مرزی و حساس',
        bg: 'bg-amber-500/15 dark:bg-amber-500/20',
        textCol: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'unfeasible':
    default:
      return {
        label: 'فاقد توجیه اقتصادی یا همراه با زیان',
        shortLabel: 'ریسک بالا / فاقد توجیه',
        bg: 'bg-rose-500/15 dark:bg-rose-500/20',
        textCol: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-500/30',
        dot: 'bg-rose-500',
      };
  }
}

/**
 * دریافت پیش‌تنظیم‌های آماده محاسباتی برای راحتی کاربر
 */
export function getQuickPresets(investmentCost: number, benefitType: ROIBenefitType = 'direct_revenue') {
  const cost = Math.max(0, investmentCost);
  
  if (benefitType === 'cost_reduction') {
    return [
      {
        label: 'صرفه‌جویی سالانه ۳۰٪ از بودجه',
        returnAmount: Math.round(cost * 1.3),
        horizonMonths: 24,
        description: 'کاهش اتلاف منابع و هزینه‌های عملیاتی',
      },
      {
        label: 'صرفه‌جویی بهینه‌سازی ۵۰٪',
        returnAmount: Math.round(cost * 1.5),
        horizonMonths: 36,
        description: 'بهینه‌سازی عمیق خط تولید و کاهش استهلاک',
      },
      {
        label: 'صرفه‌جویی دوبرابری (۲x هزینه در ۵ سال)',
        returnAmount: Math.round(cost * 2.0),
        horizonMonths: 60,
        description: 'جایگزینی تجهیزات نو با تجهیزات فرسوده',
      },
    ];
  }

  // Default Direct Revenue / Market expansion
  return [
    {
      label: 'مارک‌آپ متعادل ۲۵٪',
      returnAmount: Math.round(cost * 1.25),
      horizonMonths: 18,
      description: 'حاشیه سود ایمن با ریسک پایین',
    },
    {
      label: 'مارک‌آپ هدف ۴۰٪ (عرف صنعت)',
      returnAmount: Math.round(cost * 1.4),
      horizonMonths: 24,
      description: 'سودآوری متداول در پروژه‌های کیهان صنعت قائم',
    },
    {
      label: 'طرح توسعه‌ای ممتاز ۶۵٪',
      returnAmount: Math.round(cost * 1.65),
      horizonMonths: 36,
      description: 'ارزش افزوده بالا و ورود به بازارهای نو',
    },
  ];
}

/**
 * شبیه‌سازی هوشمند و بومی برای سناریوهای اقتصادی در صورت عدم اتصال اینترنت
 */
export function generateHeuristicROIAnalysis(params: {
  projectName: string;
  category?: string;
  responsibleUnit?: string;
  budgetBAC: number;
  expectedReturnAmount: number;
  horizonMonths: number;
  benefitType: ROIBenefitType;
}): {
  executivePitch: string;
  aiScenarios: AIScenarioAnalysis[];
  aiSuggestions: string[];
  risksAndAssumptions: string[];
} {
  const { projectName, budgetBAC, expectedReturnAmount, horizonMonths, benefitType } = params;
  const cost = Math.max(1, budgetBAC);
  const baseReturn = expectedReturnAmount > 0 ? expectedReturnAmount : Math.round(cost * 1.35);
  const horizon = horizonMonths || 24;

  const baseROI = Math.round(((baseReturn - cost) / cost) * 100);
  const basePayback = Number((cost / (baseReturn / horizon)).toFixed(1));

  // Optimistic
  const optReturn = Math.round(baseReturn * 1.22);
  const optROI = Math.round(((optReturn - cost) / cost) * 100);
  const optPayback = Number((cost / (optReturn / horizon)).toFixed(1));

  // Pessimistic (30% delay or 15% inflation / cost increase)
  const pessCost = Math.round(cost * 1.15);
  const pessReturn = Math.round(baseReturn * 0.88);
  const pessROI = Math.round(((pessReturn - pessCost) / pessCost) * 100);
  const pessPayback = Number((pessCost / (pessReturn / horizon)).toFixed(1));

  const executivePitch = `طرح «${projectName}» با سرمایه‌گذاری اولیه ${cost.toLocaleString('fa-IR')} میلیون تومان، پیش‌بینی می‌شود طی افق ${horizon.toLocaleString('fa-IR')} ماهه با محقق‌سازی عایدی ${baseReturn.toLocaleString('fa-IR')} میلیون تومانی، نرخ بازگشت سرمایه (ROI) معادل ${baseROI.toLocaleString('fa-IR')}٪ و دوره استهلاک سرمایه ${basePayback.toLocaleString('fa-IR')} ماهه را ثبت نماید. با عنایت به نسبت فایده به هزینه (BCR) بالاتر از ۱.۲، تصویب و تامین اعتبار این طرح جهت تثبیت مزیت رقابتی سازمان قویاً توجیه‌پذیر است.`;

  const aiScenarios: AIScenarioAnalysis[] = [
    {
      scenarioName: 'optimistic',
      title: 'سناریوی خوش‌بینانه (بهره‌برداری زودهنگام و بیشینه تقاضا)',
      expectedReturn: optReturn,
      roiPct: optROI,
      paybackPeriodMonths: Math.max(1, optPayback),
      description: 'تحویل به‌موقع پروژه با حفظ انضباط مالی و جذب سریع مشتریان یا صرفه‌جویی حداکثری.',
    },
    {
      scenarioName: 'base',
      title: 'سناریوی واقع‌بینانه و خط مبنا (Base Case)',
      expectedReturn: baseReturn,
      roiPct: baseROI,
      paybackPeriodMonths: Math.max(1, basePayback),
      description: 'تحقق اهداف مطابق برنامه زمان‌بندی و بودجه مصوب شناسنامه پروژه.',
    },
    {
      scenarioName: 'pessimistic',
      title: 'سناریوی محتاطانه (با فرض ۱۵٪ افزایش هزینه و تاخیر بهره‌برداری)',
      expectedReturn: pessReturn,
      roiPct: pessROI,
      paybackPeriodMonths: Math.max(1, pessPayback),
      description: 'افت حاشیه سود به دلیل تورم قیمت مواد اولیه یا کندی دوره وصول و بهره‌برداری.',
    },
  ];

  const aiSuggestions: string[] = [
    'انعقاد قراردادهای تامین مصالح و تجهیزات کلیدی با قیمت قطعی (Lump Sum) جهت ایمن‌سازی سرمایه‌گذاری اولیه در برابر تورم.',
    'تقسیم درآمدزایی یا صرفه‌جویی به فازهای تحویل زودهنگام (Early Wins) برای کوتاه‌تر شدن دوره بازگشت سرمایه به زیر ۱۸ ماه.',
    'پایش منظم شاخص‌های ارزش کسب‌شده (EVM) به‌ویژه شاخص CPI در گزارش‌های هفتگی برای ممانعت از ریزش نرخ ROI پیش‌بینی‌شده.',
  ];

  const risksAndAssumptions: string[] = [
    'فرض ثبات نرخ تورم عمومی در محدوده میانگین سالیانه تا سقف ۲۵٪.',
    'تعهد واحدهای بهره‌بردار به استقرار کامل سیستم بلافاصله پس از تحویل موقت.',
    'عدم تغییرات اساسی در محدوده پروژه (Scope Creep) پس از ابلاغ مصوبه مدیرعامل.',
  ];

  return {
    executivePitch,
    aiScenarios,
    aiSuggestions,
    risksAndAssumptions,
  };
}
