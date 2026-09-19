import React, { useState, useMemo, useEffect } from 'react';
import { Project, ProjectScheduleTask, User } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  Lock, 
  Link2, 
  RefreshCw, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Building, 
  User as UserIcon, 
  BarChart2,
  FileSpreadsheet,
  Zap,
  Info
} from 'lucide-react';
import { JalaliDatePicker } from './JalaliDatePicker';
import { 
  recalculateScheduleTasks, 
  autoAlignPredecessors, 
  calculateJalaliDuration, 
  addDaysToJalaliDate,
  compareJalaliDateStrings
} from '../utils/scheduleCalculations';
import { toPersianDigits, getTodayJalali, formatJalaliDate } from '../utils/jalali';

interface ProjectActivitiesModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTasks: (projectId: number, updatedTasks: ProjectScheduleTask[]) => void;
  currentUser: User;
}

export const ProjectActivitiesModal: React.FC<ProjectActivitiesModalProps> = ({
  project,
  isOpen,
  onClose,
  onSaveTasks,
  currentUser,
}) => {
  // Local state for editing tasks
  const [tasks, setTasks] = useState<ProjectScheduleTask[]>(() => {
    const existing = project?.scheduleTasks || [];
    if (existing.length > 0) {
      return recalculateScheduleTasks(existing);
    }
    // Default initial task if project has none
    const [jy, jm, jd] = getTodayJalali();
    const todayStr = formatJalaliDate(jy, jm, jd);
    const endStr = addDaysToJalaliDate(todayStr, 30);

    return recalculateScheduleTasks([
      {
        id: `tsk-${Date.now()}-1`,
        wbs: '1',
        name: 'فاز ۱: برنامه‌ریزی و تجهیز اولیه',
        level: 0,
        startDate: '',
        finishDate: '',
        durationDays: 0,
        progressPct: 0,
      },
      {
        id: `tsk-${Date.now()}-2`,
        wbs: '1.1',
        name: 'مطالعات و تهیه نقشه‌های اجرایی',
        level: 1,
        startDate: todayStr,
        finishDate: endStr,
        durationDays: 31,
        progressPct: 0,
      }
    ]);
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'gantt_preview'>('table');

  // Keep state in sync if project prop changes
  useEffect(() => {
    if (project?.scheduleTasks && project.scheduleTasks.length > 0) {
      setTasks(recalculateScheduleTasks(project.scheduleTasks));
    }
  }, [project?.id]);

  // Handle task modification
  const handleUpdateTask = (id: string, updates: Partial<ProjectScheduleTask>) => {
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          const next = { ...t, ...updates };

          // If user manually changed duration and we have a start date, recompute finish date
          if (updates.durationDays !== undefined && updates.finishDate === undefined && next.startDate) {
            const dur = Math.max(1, updates.durationDays);
            next.finishDate = addDaysToJalaliDate(next.startDate, dur - 1);
            next.durationDays = dur;
          }
          // If user manually changed finish date or start date, recompute duration
          else if ((updates.startDate !== undefined || updates.finishDate !== undefined) && next.startDate && next.finishDate) {
            next.durationDays = calculateJalaliDuration(next.startDate, next.finishDate);
          }

          return next;
        }
        return t;
      });

      setHasUnsavedChanges(true);
      return recalculateScheduleTasks(updated);
    });
  };

  // Add new task
  const handleAddTask = (isSubtask = false) => {
    const [jy, jm, jd] = getTodayJalali();
    const todayStr = formatJalaliDate(jy, jm, jd);
    const endStr = addDaysToJalaliDate(todayStr, 14);

    let targetLevel = 0;
    let insertIndex = tasks.length;

    if (selectedTaskId) {
      const idx = tasks.findIndex((t) => t.id === selectedTaskId);
      if (idx !== -1) {
        insertIndex = idx + 1;
        targetLevel = isSubtask ? (tasks[idx].level || 0) + 1 : tasks[idx].level || 0;
      }
    } else if (isSubtask && tasks.length > 0) {
      targetLevel = 1;
    }

    const newTask: ProjectScheduleTask = {
      id: `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      wbs: '',
      name: isSubtask ? 'زیرفعالیت جدید' : 'فعالیت جدید',
      level: targetLevel,
      startDate: todayStr,
      finishDate: endStr,
      durationDays: 15,
      progressPct: 0,
    };

    const newTasks = [...tasks];
    newTasks.splice(insertIndex, 0, newTask);

    const recomputed = recalculateScheduleTasks(newTasks);
    setTasks(recomputed);
    setSelectedTaskId(newTask.id);
    setHasUnsavedChanges(true);
  };

  // Delete task
  const handleDeleteTask = (id: string) => {
    if (tasks.length <= 1) {
      alert('حداقل یک فعالیت باید در زمان‌بندی پروژه باقی بماند.');
      return;
    }

    // Also remove predecessor references pointing to this task
    const filtered = tasks
      .filter((t) => t.id !== id)
      .map((t) => {
        if (t.predecessorId === id) {
          return { ...t, predecessorId: undefined, predecessorWbs: undefined, predecessorName: undefined };
        }
        return t;
      });

    setTasks(recalculateScheduleTasks(filtered));
    if (selectedTaskId === id) setSelectedTaskId(null);
    setHasUnsavedChanges(true);
  };

  // Indent (increase level -> make subtask)
  const handleIndent = (id: string) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx <= 0) return; // Cannot indent the very first task

    const prevTask = tasks[idx - 1];
    // Cannot indent more than 1 level deeper than the previous task
    if (tasks[idx].level > prevTask.level) return;

    const updated = tasks.map((t, i) => {
      if (i === idx) {
        return { ...t, level: (t.level || 0) + 1 };
      }
      return t;
    });

    setTasks(recalculateScheduleTasks(updated));
    setHasUnsavedChanges(true);
  };

  // Outdent (decrease level -> promote)
  const handleOutdent = (id: string) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    if ((tasks[idx].level || 0) <= 0) return; // Already at top level

    const updated = tasks.map((t, i) => {
      if (i === idx) {
        return { ...t, level: Math.max(0, (t.level || 0) - 1) };
      }
      return t;
    });

    setTasks(recalculateScheduleTasks(updated));
    setHasUnsavedChanges(true);
  };

  // Move task up
  const handleMoveUp = (id: string) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx <= 0) return;

    const newTasks = [...tasks];
    const temp = newTasks[idx];
    newTasks[idx] = newTasks[idx - 1];
    newTasks[idx - 1] = temp;

    setTasks(recalculateScheduleTasks(newTasks));
    setHasUnsavedChanges(true);
  };

  // Move task down
  const handleMoveDown = (id: string) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1 || idx >= tasks.length - 1) return;

    const newTasks = [...tasks];
    const temp = newTasks[idx];
    newTasks[idx] = newTasks[idx + 1];
    newTasks[idx + 1] = temp;

    setTasks(recalculateScheduleTasks(newTasks));
    setHasUnsavedChanges(true);
  };

  // Auto-align all tasks according to their Finish-to-Start Predecessors
  const handleAutoAlign = () => {
    const aligned = autoAlignPredecessors(tasks);
    setTasks(aligned);
    setHasUnsavedChanges(true);
    setSuccessMessage('تمامی فعالیت‌ها بر اساس توالی پیش‌نیازها (Finish-to-Start) همگام‌سازی شدند.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Align single task to predecessor
  const handleAlignSingleToPredecessor = (task: ProjectScheduleTask) => {
    if (!task.predecessorId) return;
    const pred = tasks.find((t) => t.id === task.predecessorId);
    if (!pred || !pred.finishDate) return;

    const nextDay = addDaysToJalaliDate(pred.finishDate, 1);
    const duration = Math.max(1, task.durationDays || 1);
    const finishDate = addDaysToJalaliDate(nextDay, duration - 1);

    handleUpdateTask(task.id, {
      startDate: nextDay,
      finishDate: finishDate,
      durationDays: duration,
    });
  };

  // Toggle collapse for summary task
  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter visible tasks based on collapsed state of ancestors
  const visibleTasks = useMemo(() => {
    const result: ProjectScheduleTask[] = [];
    let hiddenBelowLevel: number | null = null;

    for (const task of tasks) {
      if (hiddenBelowLevel !== null) {
        if (task.level > hiddenBelowLevel) {
          continue; // Skip hidden descendant
        } else {
          hiddenBelowLevel = null; // Exit hidden scope
        }
      }

      result.push(task);

      if (task.isSummary && collapsedIds.has(task.id)) {
        hiddenBelowLevel = task.level;
      }
    }
    return result;
  }, [tasks, collapsedIds]);

  // Overall schedule statistics
  const stats = useMemo(() => {
    const totalCount = tasks.length;
    const summaryCount = tasks.filter((t) => t.isSummary).length;
    const leafCount = totalCount - summaryCount;
    const withPredCount = tasks.filter((t) => t.predecessorId).length;

    // Earliest start and latest finish across all tasks
    const validStarts = tasks.filter((t) => t.startDate).map((t) => t.startDate);
    const validFinishes = tasks.filter((t) => t.finishDate).map((t) => t.finishDate);

    let earliestStart = '';
    let latestFinish = '';
    let totalSpanDays = 0;

    if (validStarts.length > 0) {
      earliestStart = validStarts.reduce((min, d) => compareJalaliDateStrings(d, min) < 0 ? d : min, validStarts[0]);
    }
    if (validFinishes.length > 0) {
      latestFinish = validFinishes.reduce((max, d) => compareJalaliDateStrings(d, max) > 0 ? d : max, validFinishes[0]);
    }
    if (earliestStart && latestFinish) {
      totalSpanDays = calculateJalaliDuration(earliestStart, latestFinish);
    }

    return {
      totalCount,
      summaryCount,
      leafCount,
      withPredCount,
      earliestStart,
      latestFinish,
      totalSpanDays,
    };
  }, [tasks]);

  // Save handler
  const handleSave = () => {
    onSaveTasks(project.id, tasks);
    setHasUnsavedChanges(false);
    setSuccessMessage('فعالیت‌ها و زمان‌بندی WBS با موفقیت در پروژه ذخیره شدند.');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Predecessor candidate options for dropdown (exclude self and immediate descendants to prevent simple loops)
  const getPredecessorOptions = (currentTask: ProjectScheduleTask) => {
    return tasks.filter((t) => t.id !== currentTask.id);
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full shadow-2xl overflow-hidden my-4 max-h-[94vh] flex flex-col text-right">
        
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>ساختار شکست کار و فعالیت‌های پروژه (WBS & Schedule)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {project.code}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  پروژه: <strong className="text-slate-800 dark:text-slate-200">{project.name}</strong> • مسئول: {project.managerName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                جدول WBS
              </button>
              <button
                type="button"
                onClick={() => setViewMode('gantt_preview')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === 'gantt_preview'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                نمای گانت‌چارت
              </button>
            </div>

            {/* Save Button */}
            <button
              id="btn-save-project-schedule"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/50 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              title="ذخیره ساختار فعالیت‌ها در پروژه"
            >
              <Save className="w-4 h-4" />
              <span>{hasUnsavedChanges ? 'ذخیره تغییرات *' : 'ذخیره فعالیت‌ها'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* KPI & Summary Header Strip */}
        <div className="bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">تعداد کل فعالیت‌ها:</span>
              <strong className="text-slate-900 dark:text-white font-mono">{toPersianDigits(stats.totalCount)}</strong>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">سامری‌تسک‌ها (فازها):</span>
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{toPersianDigits(stats.summaryCount)}</strong>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">ریزفعالیت‌های اجرایی:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{toPersianDigits(stats.leafCount)}</strong>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">دارای پیش‌نیاز:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-mono">{toPersianDigits(stats.withPredCount)}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-500 dark:text-slate-400">بازه زمان‌بندی:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {stats.earliestStart ? toPersianDigits(stats.earliestStart) : '—'} الی {stats.latestFinish ? toPersianDigits(stats.latestFinish) : '—'}
              </span>
              {stats.totalSpanDays > 0 && (
                <span className="mr-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  ({toPersianDigits(stats.totalSpanDays)} روز)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Strip (MSP Action Buttons) */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Add Task */}
            <button
              id="btn-add-schedule-task"
              type="button"
              onClick={() => handleAddTask(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن فعالیت</span>
            </button>

            {/* Add Subtask */}
            <button
              id="btn-add-schedule-subtask"
              type="button"
              onClick={() => handleAddTask(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="افزودن زیرفعالیت به فعالیت انتخاب‌شده"
            >
              <Folder className="w-3.5 h-3.5 text-indigo-500" />
              <span>افزودن زیرفعالیت (فرزند)</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Indent (Increase Level) */}
            <button
              id="btn-indent-task"
              type="button"
              disabled={!selectedTaskId}
              onClick={() => selectedTaskId && handleIndent(selectedTaskId)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="افزایش سطح (تبدیل به زیرفعالیت سطر بالایی - Indent)"
            >
              <span>افزایش سطح (Indent ⇥)</span>
            </button>

            {/* Outdent (Decrease Level) */}
            <button
              id="btn-outdent-task"
              type="button"
              disabled={!selectedTaskId}
              onClick={() => selectedTaskId && handleOutdent(selectedTaskId)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="کاهش سطح (ارتقا به سطح بالاتر - Outdent)"
            >
              <span>کاهش سطح (Outdent ⇤)</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Move Up */}
            <button
              type="button"
              disabled={!selectedTaskId}
              onClick={() => selectedTaskId && handleMoveUp(selectedTaskId)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="انتقال سطر به بالا"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* Move Down */}
            <button
              type="button"
              disabled={!selectedTaskId}
              onClick={() => selectedTaskId && handleMoveDown(selectedTaskId)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="انتقال سطر به پایین"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Auto Schedule Predecessors Button */}
            <button
              id="btn-auto-schedule-predecessors"
              type="button"
              onClick={handleAutoAlign}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold border border-amber-200 dark:border-amber-800 transition cursor-pointer"
              title="محاسبه و همگام‌سازی خودکار تاریخ شروع و پایان تمام فعالیت‌ها بر اساس پیش‌نیازها (Finish-to-Start)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>همگام‌سازی با پیش‌نیازها (Auto-Schedule)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Collapse/Expand All */}
            <button
              type="button"
              onClick={() => {
                if (collapsedIds.size > 0) {
                  setCollapsedIds(new Set());
                } else {
                  const allSummaryIds = new Set(tasks.filter((t) => t.isSummary).map((t) => t.id));
                  setCollapsedIds(allSummaryIds);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
            >
              {collapsedIds.size > 0 ? 'باز کردن همه سامری‌ها' : 'جمع کردن همه سامری‌ها'}
            </button>
          </div>
        </div>

        {/* Informative Guidance Banner */}
        <div className="px-6 py-2 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>منطق MSP:</strong> فعالیت‌هایی که دارای زیرفعالیت هستند به عنوان <strong>سامری‌تسک</strong> شناسایی شده و تاریخ شروع آن‌ها برابر با <strong>زودترین تاریخ شروع فرزندان</strong> و تاریخ پایان برابر با <strong>دیرترین تاریخ پایان فرزندان</strong> به‌طور خودکار محاسبه و قفل می‌گردد.
            </span>
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
            وابستگی پیش‌نیاز: خاتمه به آغاز (FS)
          </span>
        </div>

        {/* Content Body: Table or Gantt Preview */}
        <div className="flex-1 overflow-y-auto min-h-[360px] p-4">
          
          {viewMode === 'gantt_preview' ? (
            /* Gantt Chart Visual Timeline */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  نمای بصری زمان‌بندی و گانت خطی فعالیت‌ها
                </h3>

                <div className="space-y-2">
                  {tasks.map((task) => {
                    const hasPredecessor = !!task.predecessorId;
                    const pred = tasks.find((t) => t.id === task.predecessorId);

                    return (
                      <div 
                        key={task.id} 
                        className={`p-2.5 rounded-xl border transition ${
                          task.isSummary
                            ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                        style={{ marginRight: `${task.level * 20}px` }}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                              {toPersianDigits(task.wbs)}
                            </span>
                            <span className="text-slate-900 dark:text-white">
                              {task.name}
                            </span>
                            {task.isSummary && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                                سامری‌تسک
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {hasPredecessor && pred && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-sans">
                                <Link2 className="w-3 h-3" />
                                پیش‌نیاز: {pred.wbs} ({pred.name.slice(0, 20)}...)
                              </span>
                            )}
                            <span>شروع: {toPersianDigits(task.startDate || '—')}</span>
                            <span>پایان: {toPersianDigits(task.finishDate || '—')}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">({toPersianDigits(task.durationDays || 0)} روز)</span>
                          </div>
                        </div>

                        {/* Visual Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              task.isSummary
                                ? 'bg-slate-800 dark:bg-indigo-500'
                                : 'bg-gradient-to-l from-indigo-500 to-sky-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, task.progressPct || 40))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Main Excel / MSP Style Table */
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold select-none sticky top-0 z-10">
                      <th className="p-2.5 text-center w-12 border-l border-slate-200 dark:border-slate-800 font-mono text-slate-400">
                        #
                      </th>
                      <th className="p-2.5 w-20 border-l border-slate-200 dark:border-slate-800 text-center font-mono">
                        کد WBS
                      </th>
                      <th className="p-2.5 min-w-[280px] border-l border-slate-200 dark:border-slate-800">
                        نام فعالیت / بسته کاری
                      </th>
                      <th className="p-2.5 min-w-[170px] border-l border-slate-200 dark:border-slate-800 text-center">
                        فعالیت پیش‌نیاز (Predecessor)
                      </th>
                      <th className="p-2.5 min-w-[150px] border-l border-slate-200 dark:border-slate-800 text-center">
                        تاریخ شروع
                      </th>
                      <th className="p-2.5 min-w-[150px] border-l border-slate-200 dark:border-slate-800 text-center">
                        تاریخ پایان
                      </th>
                      <th className="p-2.5 w-24 border-l border-slate-200 dark:border-slate-800 text-center">
                        مدت (روز)
                      </th>
                      <th className="p-2.5 w-24 border-l border-slate-200 dark:border-slate-800 text-center">
                        پیشرفت (%)
                      </th>
                      <th className="p-2.5 w-20 text-center">
                        عملیات
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {visibleTasks.map((task, idx) => {
                      const isSelected = selectedTaskId === task.id;
                      const isCollapsed = collapsedIds.has(task.id);
                      const predOptions = getPredecessorOptions(task);

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500'
                              : task.isSummary
                              ? 'bg-slate-50/70 dark:bg-slate-900/80 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* 0. Row Index */}
                          <td className="p-2.5 text-center font-mono text-slate-400 border-l border-slate-200 dark:border-slate-800">
                            {idx + 1}
                          </td>

                          {/* 1. WBS Code */}
                          <td className="p-2.5 text-center font-mono border-l border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              task.isSummary
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {toPersianDigits(task.wbs)}
                            </span>
                          </td>

                          {/* 2. Activity Name with indentation */}
                          <td className="p-2.5 border-l border-slate-200 dark:border-slate-800">
                            <div 
                              className="flex items-center gap-1.5"
                              style={{ paddingRight: `${task.level * 22}px` }}
                            >
                              {task.isSummary ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCollapse(task.id);
                                  }}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition"
                                  title={isCollapsed ? 'باز کردن زیرفعالیت‌ها' : 'جمع کردن زیرفعالیت‌ها'}
                                >
                                  {isCollapsed ? (
                                    <ChevronLeft className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-4 inline-block text-slate-300 dark:text-slate-600 text-center font-bold">
                                  •
                                </span>
                              )}

                              {task.isSummary ? (
                                <span className="text-indigo-600 dark:text-indigo-400">
                                  {isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                                </span>
                              ) : null}

                              {/* Input field for Task Name */}
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) => handleUpdateTask(task.id, { name: e.target.value })}
                                className={`w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded px-1.5 py-1 text-xs outline-none transition ${
                                  task.isSummary
                                    ? 'font-bold text-slate-900 dark:text-white'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                                placeholder="نام فعالیت..."
                              />
                            </div>
                          </td>

                          {/* 3. Predecessor (پیش‌نیاز) */}
                          <td className="p-2 border-l border-slate-200 dark:border-slate-800">
                            {task.isSummary ? (
                              <span className="text-[11px] text-slate-400 block text-center italic">
                                — (محاسبه خودکار)
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <select
                                  value={task.predecessorId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value || undefined;
                                    handleUpdateTask(task.id, { predecessorId: val });
                                  }}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                  <option value="">بدون پیش‌نیاز</option>
                                  {predOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.wbs} - {opt.name.slice(0, 24)}{opt.name.length > 24 ? '...' : ''} ({opt.finishDate})
                                    </option>
                                  ))}
                                </select>

                                {task.predecessorId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAlignSingleToPredecessor(task);
                                    }}
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0"
                                    title="تنظیم تاریخ شروع فردای اتمام پیش‌نیاز"
                                  >
                                    <Zap className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 4. Start Date */}
                          <td className="p-2 border-l border-slate-200 dark:border-slate-800 text-center font-mono">
                            {task.isSummary ? (
                              <div 
                                className="flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                title="محاسبه خودکار از زودترین تاریخ شروع زیرفعالیت‌ها (MSP Summary Logic)"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>{task.startDate ? toPersianDigits(task.startDate) : '—'}</span>
                              </div>
                            ) : (
                              <JalaliDatePicker
                                value={task.startDate}
                                onChange={(dateStr) => handleUpdateTask(task.id, { startDate: dateStr })}
                                placeholder="۱۴۰۳/۰۱/۰۱"
                                className="w-full text-center"
                              />
                            )}
                          </td>

                          {/* 5. Finish Date */}
                          <td className="p-2 border-l border-slate-200 dark:border-slate-800 text-center font-mono">
                            {task.isSummary ? (
                              <div 
                                className="flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                title="محاسبه خودکار از دیرترین تاریخ پایان زیرفعالیت‌ها (MSP Summary Logic)"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>{task.finishDate ? toPersianDigits(task.finishDate) : '—'}</span>
                              </div>
                            ) : (
                              <JalaliDatePicker
                                value={task.finishDate}
                                onChange={(dateStr) => handleUpdateTask(task.id, { finishDate: dateStr })}
                                placeholder="۱۴۰۳/۰۲/۱۵"
                                className="w-full text-center"
                              />
                            )}
                          </td>

                          {/* 6. Duration Days */}
                          <td className="p-2 border-l border-slate-200 dark:border-slate-800 text-center font-mono">
                            {task.isSummary ? (
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {toPersianDigits(task.durationDays || 0)} روز
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                max={9999}
                                value={task.durationDays || 1}
                                onChange={(e) => handleUpdateTask(task.id, { durationDays: parseInt(e.target.value, 10) || 1 })}
                                className="w-16 text-center font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            )}
                          </td>

                          {/* 7. Progress (%) */}
                          <td className="p-2 border-l border-slate-200 dark:border-slate-800 text-center font-mono">
                            <div className="flex items-center justify-center gap-1">
                              {task.isSummary ? (
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {toPersianDigits(task.progressPct || 0)}٪
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={task.progressPct || 0}
                                  onChange={(e) => handleUpdateTask(task.id, { progressPct: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                                  className="w-14 text-center font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              )}
                            </div>
                          </td>

                          {/* 8. Actions */}
                          <td className="p-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="حذف این فعالیت"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>💡 کلیدهای میانبر: با انتخاب هر سطر می‌توانید از دکمه‌های <strong>افزایش/کاهش سطح</strong> جهت ایجاد ساختار درختی (WBS) استفاده نمایید.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition font-medium"
            >
              بستن
            </button>
            <button
              id="btn-footer-save-schedule"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition cursor-pointer"
            >
              ذخیره و نهایی‌سازی
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
