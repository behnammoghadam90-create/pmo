import { EVMMetrics, TrafficLightStatus } from '../types';

/**
 * Calculates full Earned Value Management (EVM) metrics
 * based on PMBOK 7th / Practice Standard for Earned Value Management
 */
export function calculateEVM(
  bac: number,
  pvPct: number,
  evPct: number,
  acValue: number
): EVMMetrics {
  const safeBac = Math.max(0, bac);
  const safePvPct = Math.min(100, Math.max(0, pvPct));
  const safeEvPct = Math.min(100, Math.max(0, evPct));
  const safeAc = Math.max(0, acValue);

  // Monetary values
  const pvValue = (safePvPct / 100) * safeBac;
  const evValue = (safeEvPct / 100) * safeBac;

  // Variances
  const cv = evValue - safeAc; // Cost Variance
  const sv = evValue - pvValue; // Schedule Variance

  // Indices
  const cpi = safeAc > 0 ? Number((evValue / safeAc).toFixed(3)) : (evValue > 0 ? 1.0 : 1.0);
  const spi = pvValue > 0 ? Number((evValue / pvValue).toFixed(3)) : 1.0;

  // Forecasts
  const eac = cpi > 0 ? Number((safeBac / cpi).toFixed(1)) : safeBac;
  const etc = Math.max(0, Number((eac - safeAc).toFixed(1)));
  const vac = Number((safeBac - eac).toFixed(1));
  
  // TCPI
  const remainingBudget = safeBac - safeAc;
  const remainingWork = safeBac - evValue;
  const tcpi = remainingBudget > 0 ? Number((remainingWork / remainingBudget).toFixed(3)) : 1.0;

  // RAG status calculation
  let status: TrafficLightStatus = 'green';
  let healthDescription = 'پروژه در وضعیت مطلوب، منطبق بر برنامه زمانی و بودجه مصوب است.';

  if (spi < 0.85 || cpi < 0.85 || (safeEvPct < safePvPct - 15)) {
    status = 'red';
    healthDescription = 'وضعیت بحرانی: انحراف زمانی یا هزینه‌ای قابل‌توجه. نیازمند بازنگری فوری و جلسه اضطراری PMO.';
  } else if (spi < 0.95 || cpi < 0.95 || (safeEvPct < safePvPct - 5)) {
    status = 'yellow';
    healthDescription = 'وضعیت هشدار: انحراف جزئی از برنامه بیس‌لاین. اقدامات کنترلی و پیشگیرانه توصیه می‌شود.';
  }

  return {
    pvPct: safePvPct,
    evPct: safeEvPct,
    acValue: safeAc,
    pvValue: Number(pvValue.toFixed(1)),
    evValue: Number(evValue.toFixed(1)),
    bac: safeBac,
    cv: Number(cv.toFixed(1)),
    sv: Number(sv.toFixed(1)),
    cpi,
    spi,
    eac,
    etc,
    vac,
    tcpi,
    status,
    healthDescription,
  };
}

/**
 * Convert Latin digits to Persian digits safely
 */
export function toPersianDigits(num: string | number | null | undefined): string {
  if (num === null || num === undefined) return '';
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Format numbers with dots as thousand separators (e.g. 185.400)
 */
export function formatNumberWithDots(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '۰';
  const rounded = Math.round(Number(value));
  const withDots = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return toPersianDigits(withDots);
}

/**
 * Format numbers with Persian thousand separators and optional decimal places
 */
export function formatPersianNumber(value: number | string | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '۰';
  const num = Number(value);
  const fixedStr = decimals > 0 ? num.toFixed(decimals) : String(Math.round(num));
  const parts = fixedStr.split('.');
  // Add thousand separators to integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  const formatted = parts.join('/');
  return toPersianDigits(formatted);
}

/**
 * Format currency amounts with Persian digits and million Tomans unit
 */
export function formatCurrency(amount: number, unit: string = 'میلیون تومان'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `۰ ${unit}`;
  const rounded = Math.round(amount);
  const withCommas = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  return `${toPersianDigits(withCommas)} ${unit}`;
}

/**
 * Format percentage with Persian representation
 */
export function formatPercent(value: number, decimals = 1): string {
  if (isNaN(value) || value === null || value === undefined) return '۰٪';
  const fixed = Number(value).toFixed(decimals);
  // Remove trailing .0 if present or format
  const displayVal = fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed.replace('.', '/');
  return `${toPersianDigits(displayVal)}٪`;
}

/**
 * Get human readable status label in Persian
 */
export function getStatusBadge(status: TrafficLightStatus): { text: string; bg: string; textCol: string; border: string } {
  switch (status) {
    case 'green':
      return { text: 'سبز (عادی)', bg: 'bg-emerald-500/15', textCol: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'yellow':
      return { text: 'زرد (هشدار)', bg: 'bg-amber-500/15', textCol: 'text-amber-400', border: 'border-amber-500/30' };
    case 'red':
      return { text: 'قرمز (بحرانی)', bg: 'bg-rose-500/15', textCol: 'text-rose-400', border: 'border-rose-500/30' };
  }
}
