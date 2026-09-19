import { ProjectScheduleTask } from '../types';
import { 
  jalaliStringToJsDate, 
  jalaliToGregorian, 
  gregorianToJalali, 
  formatJalaliDate, 
  parseJalaliDate, 
  toPersianDigits, 
  toLatinDigits 
} from './jalali';

/**
 * Compare two Jalali date strings (YYYY/MM/DD)
 * Returns -1 if d1 < d2, 0 if d1 == d2, 1 if d1 > d2
 */
export function compareJalaliDateStrings(d1: string, d2: string): number {
  if (!d1 && !d2) return 0;
  if (!d1) return 1;
  if (!d2) return -1;

  const date1 = jalaliStringToJsDate(d1);
  const date2 = jalaliStringToJsDate(d2);

  if (!date1 && !date2) return 0;
  if (!date1) return 1;
  if (!date2) return -1;

  const t1 = date1.getTime();
  const t2 = date2.getTime();

  if (t1 < t2) return -1;
  if (t1 > t2) return 1;
  return 0;
}

/**
 * Calculates duration in days between two Jalali dates (inclusive)
 * e.g., 1403/01/01 to 1403/01/01 is 1 day.
 */
export function calculateJalaliDuration(startDate: string, finishDate: string): number {
  if (!startDate || !finishDate) return 0;
  const d1 = jalaliStringToJsDate(startDate);
  const d2 = jalaliStringToJsDate(finishDate);
  if (!d1 || !d2) return 0;

  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays + 1);
}

/**
 * Adds a specific number of calendar days to a Jalali date string
 * Returns new Jalali date string in YYYY/MM/DD format
 */
export function addDaysToJalaliDate(dateStr: string, daysToAdd: number): string {
  if (!dateStr) return '';
  const jsDate = jalaliStringToJsDate(dateStr);
  if (!jsDate) return dateStr;

  const newJsDate = new Date(jsDate);
  newJsDate.setDate(newJsDate.getDate() + daysToAdd);

  const [jy, jm, jd] = gregorianToJalali(
    newJsDate.getFullYear(),
    newJsDate.getMonth() + 1,
    newJsDate.getDate()
  );

  return formatJalaliDate(jy, jm, jd);
}

/**
 * Recomputes WBS codes, Summary Tasks, and their Start/Finish dates
 * precisely adhering to Microsoft Project (MSP) rules:
 * 1. A task is a summary task if its immediate next task has a higher level.
 * 2. Summary task Start Date = min(Start Date of all its descendant tasks)
 * 3. Summary task Finish Date = max(Finish Date of all its descendant tasks)
 * 4. Summary task Duration = duration between min Start and max Finish
 * 5. WBS codes are formatted as 1, 1.1, 1.2, 2, 2.1, 2.1.1, etc.
 */
export function recalculateScheduleTasks(tasks: ProjectScheduleTask[]): ProjectScheduleTask[] {
  if (!tasks || tasks.length === 0) return [];

  // Step 1: Assign WBS codes based on level
  const wbsCounters: number[] = [];
  const withWbs = tasks.map((task, index) => {
    const level = Math.max(0, task.level || 0);

    // Adjust counter length to current level
    while (wbsCounters.length <= level) {
      wbsCounters.push(0);
    }
    // Truncate deeper levels
    wbsCounters.length = level + 1;
    wbsCounters[level] = (wbsCounters[level] || 0) + 1;

    const wbs = wbsCounters.slice(0, level + 1).join('.');

    // Check if it has children (next task has level > current level)
    const nextTask = tasks[index + 1];
    const isSummary = nextTask ? (nextTask.level || 0) > level : false;

    return {
      ...task,
      level,
      wbs,
      isSummary,
    };
  });

  // Step 2: Compute summary dates from bottom to top (post-order traversal)
  // We process indices in reverse order so inner summaries are computed before outer summaries
  const computed = [...withWbs];

  for (let i = computed.length - 1; i >= 0; i--) {
    const current = computed[i];
    if (!current.isSummary) {
      // Leaf task: ensure duration is computed
      if (current.startDate && current.finishDate) {
        current.durationDays = calculateJalaliDuration(current.startDate, current.finishDate);
      }
      continue;
    }

    // Find all immediate or nested descendants of this summary task
    // Descendants are subsequent tasks with level > current.level until a task with level <= current.level
    const currentLevel = current.level;
    const descendantStartDates: string[] = [];
    const descendantFinishDates: string[] = [];
    let totalProgressWeighted = 0;
    let totalDuration = 0;

    for (let j = i + 1; j < computed.length; j++) {
      const descendant = computed[j];
      if (descendant.level <= currentLevel) {
        break; // Stop at next sibling or ancestor
      }

      if (descendant.startDate) {
        descendantStartDates.push(descendant.startDate);
      }
      if (descendant.finishDate) {
        descendantFinishDates.push(descendant.finishDate);
      }

      // If it's a leaf descendant, calculate progress weighting
      if (!descendant.isSummary && descendant.durationDays) {
        totalDuration += descendant.durationDays;
        totalProgressWeighted += (descendant.progressPct || 0) * descendant.durationDays;
      }
    }

    // Determine min start date
    let minStart = current.startDate || '';
    if (descendantStartDates.length > 0) {
      minStart = descendantStartDates.reduce((min, d) => {
        return compareJalaliDateStrings(d, min) < 0 ? d : min;
      }, descendantStartDates[0]);
    }

    // Determine max finish date
    let maxFinish = current.finishDate || '';
    if (descendantFinishDates.length > 0) {
      maxFinish = descendantFinishDates.reduce((max, d) => {
        return compareJalaliDateStrings(d, max) > 0 ? d : max;
      }, descendantFinishDates[0]);
    }

    current.startDate = minStart;
    current.finishDate = maxFinish;
    current.durationDays = calculateJalaliDuration(minStart, maxFinish);
    if (totalDuration > 0) {
      current.progressPct = Math.round(totalProgressWeighted / totalDuration);
    }
  }

  // Step 3: Populate predecessor display information
  const taskMap = new Map<string, ProjectScheduleTask>();
  computed.forEach((t) => taskMap.set(t.id, t));

  return computed.map((t) => {
    if (t.predecessorId && taskMap.has(t.predecessorId)) {
      const pred = taskMap.get(t.predecessorId)!;
      return {
        ...t,
        predecessorWbs: pred.wbs,
        predecessorName: pred.name,
      };
    }
    return t;
  });
}

/**
 * Auto-aligns all tasks according to their Finish-to-Start (FS) Predecessor dependencies.
 * If task B has predecessor task A:
 * task B Start Date = Day after task A Finish Date (Finish + 1)
 * task B Finish Date = Start Date + (duration - 1)
 */
export function autoAlignPredecessors(tasks: ProjectScheduleTask[]): ProjectScheduleTask[] {
  if (!tasks || tasks.length === 0) return [];

  const taskMap = new Map<string, ProjectScheduleTask>();
  // Clone tasks
  const updatedTasks = tasks.map((t) => ({ ...t }));
  updatedTasks.forEach((t) => taskMap.set(t.id, t));

  // Perform multiple passes to cascade dependencies
  const maxPasses = updatedTasks.length;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    for (const task of updatedTasks) {
      // Summary tasks dates are derived from children, not directly by predecessor
      if (task.isSummary || !task.predecessorId) continue;

      const pred = taskMap.get(task.predecessorId);
      if (!pred || !pred.finishDate) continue;

      // Finish-to-Start: Task starts the day after predecessor finishes
      const targetStart = addDaysToJalaliDate(pred.finishDate, 1);
      if (targetStart && targetStart !== task.startDate) {
        const duration = Math.max(1, task.durationDays || 1);
        task.startDate = targetStart;
        task.finishDate = addDaysToJalaliDate(targetStart, duration - 1);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Recompute summaries and WBS
  return recalculateScheduleTasks(updatedTasks);
}
