/**
 * Jalali (Solar Hijri) Calendar Utilities and Algorithms
 * Accurate calculations for Persian calendar dates and conversion
 */

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

export const PERSIAN_WEEK_DAYS = [
  { key: 0, label: 'ش', name: 'شنبه' },
  { key: 1, label: 'ی', name: 'یک‌شنبه' },
  { key: 2, label: 'د', name: 'دوشنبه' },
  { key: 3, label: 'س', name: 'سه‌شنبه' },
  { key: 4, label: 'چ', name: 'چهارشنبه' },
  { key: 5, label: 'پ', name: 'پنج‌شنبه' },
  { key: 6, label: 'ج', name: 'جمعه', isWeekend: true },
];

export function toPersianDigits(input: string | number): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

export function toLatinDigits(str: string): string {
  if (!str) return '';
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return res;
}

export function isJalaliLeapYear(jy: number): boolean {
  const r = (jy - 474) % 2820;
  const mod = (r < 0 ? r + 2820 : r) % 33;
  return (
    mod === 1 ||
    mod === 5 ||
    mod === 9 ||
    mod === 13 ||
    mod === 17 ||
    mod === 22 ||
    mod === 26 ||
    mod === 30
  );
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const jy2 = jy - 979;
  let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) {
    j_day_no += i < 6 ? 31 : 30;
  }
  j_day_no += jd - 1;

  let g_day_no = j_day_no + 79;
  let gy2 = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy2 += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy2 += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy2 += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let i = 0;
  for (; i < 12; i++) {
    if (g_day_no < g_days_in_month[i]) break;
    g_day_no -= g_days_in_month[i];
  }
  return [gy2, i + 1, g_day_no + 1];
}

/**
 * Returns 0 (Shanbeh) to 6 (Jomeh) for a given Jalali date
 */
export function getJalaliFirstDayOfMonth(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const gDate = new Date(gy, gm - 1, gd);
  const jsDay = gDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return (jsDay + 1) % 7; // Convert so 0 = Saturday (Shanbeh), 6 = Friday (Jomeh)
}

/**
 * Returns today's Jalali date as [year, month, day]
 */
export function getTodayJalali(): [number, number, number] {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Format to standard string format: YYYY/MM/DD
 */
export function formatJalaliDate(jy: number, jm: number, jd: number, usePersianDigits = false): string {
  const mm = String(jm).padStart(2, '0');
  const dd = String(jd).padStart(2, '0');
  const str = `${jy}/${mm}/${dd}`;
  return usePersianDigits ? toPersianDigits(str) : str;
}

/**
 * Parses a date string like "1403/06/07" or "۱۴۰۳/۰۶/۰۷" or "1403-06-07" into [year, month, day]
 */
export function parseJalaliDate(str: string): [number, number, number] | null {
  if (!str) return null;
  const latinStr = toLatinDigits(str).trim();
  const parts = latinStr.split(/[/ -]/).map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const [y, m, d] = parts;
    if (y >= 1300 && y <= 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return [y, m, d];
    }
  }
  return null;
}

/**
 * Converts a Jalali date string into a standard JS Date object at 00:00:00
 */
export function jalaliStringToJsDate(str: string): Date | null {
  const parsed = parseJalaliDate(str);
  if (!parsed) return null;
  const [jy, jm, jd] = parsed;
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

/**
 * Calculates delivery delay in days compared to baseline finish date
 * If targetDate > baselineFinishDate -> returns positive number of delay days
 * If targetDate <= baselineFinishDate -> returns negative number (days remaining) or 0
 */
export function calculateDeliveryDelayDays(
  baselineFinishStr: string,
  targetDateStr?: string
): { delayDays: number; isDelayed: boolean; finishDateDisplay: string } {
  if (!baselineFinishStr) {
    return { delayDays: 0, isDelayed: false, finishDateDisplay: '-' };
  }

  const finishDate = jalaliStringToJsDate(baselineFinishStr);
  if (!finishDate) {
    return { delayDays: 0, isDelayed: false, finishDateDisplay: baselineFinishStr };
  }

  let compareDate: Date;
  if (targetDateStr) {
    const parsedTarget = jalaliStringToJsDate(targetDateStr);
    compareDate = parsedTarget || new Date();
  } else {
    compareDate = new Date();
  }

  // Calculate day difference (compareDate - finishDate)
  const diffTime = compareDate.getTime() - finishDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    delayDays: diffDays,
    isDelayed: diffDays > 0,
    finishDateDisplay: baselineFinishStr,
  };
}

