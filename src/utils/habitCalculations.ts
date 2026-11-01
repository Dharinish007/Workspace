import { Habit, HabitLog } from '../types';
import { formatLocalDate } from '../db/indexedDB';

export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  if (habit.schedule.type === 'daily') return true;
  if (habit.schedule.type === 'weekdays') {
    // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    // Our convention: 1 = Monday, 7 = Sunday
    const dow = (date.getDay() + 6) % 7 + 1;
    return habit.schedule.days.includes(dow);
  }
  return false;
}

export function isHabitScheduledOnDateStr(habit: Habit, dateStr: string): boolean {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return isHabitScheduledOnDate(habit, d);
}

/**
 * Section 8.6: Current Streak Rule
 * - Count consecutive scheduled days completed, going backward from today.
 * - Skip unscheduled days.
 * - If today is scheduled but not yet completed, the streak is NOT broken. It counts from yesterday!
 */
export function calculateCurrentStreak(habit: Habit, logs: HabitLog[], referenceDate: Date = new Date()): number {
  const logMap = new Map<string, boolean>();
  logs.forEach(l => {
    if (l.habitId === habit.id) {
      logMap.set(l.date, l.completed);
    }
  });

  const todayStr = formatLocalDate(referenceDate);
  const isTodayScheduled = isHabitScheduledOnDate(habit, referenceDate);
  const isTodayCompleted = logMap.get(todayStr) === true;

  let streak = 0;
  let checkDate = new Date(referenceDate);

  if (isTodayScheduled && isTodayCompleted) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else if (isTodayScheduled && !isTodayCompleted) {
    // If today is scheduled but not yet completed, streak is not broken. Counts from yesterday.
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // Unscheduled today: start checking from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Iterate backward up to 365 days
  for (let i = 0; i < 365; i++) {
    const dStr = formatLocalDate(checkDate);
    const scheduled = isHabitScheduledOnDate(habit, checkDate);

    if (scheduled) {
      const completed = logMap.get(dStr) === true;
      if (completed) {
        streak++;
      } else {
        // Missed a scheduled day -> streak stops
        break;
      }
    }
    // If unscheduled, skip it (streak continues)
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/**
 * Section 8.6: Longest Streak Rule
 * Maximum consecutive completed scheduled days ever recorded.
 */
export function calculateLongestStreak(habit: Habit, logs: HabitLog[], referenceDate: Date = new Date()): number {
  const habitLogs = logs.filter(l => l.habitId === habit.id && l.completed);
  if (habitLogs.length === 0) return 0;

  // Check last 365 days
  let maxStreak = 0;
  let currentRun = 0;

  const d = new Date(referenceDate);
  d.setDate(d.getDate() - 365);

  const logMap = new Map<string, boolean>();
  logs.forEach(l => {
    if (l.habitId === habit.id) {
      logMap.set(l.date, l.completed);
    }
  });

  for (let i = 0; i <= 365; i++) {
    const scheduled = isHabitScheduledOnDate(habit, d);
    const dStr = formatLocalDate(d);

    if (scheduled) {
      if (logMap.get(dStr) === true) {
        currentRun++;
        if (currentRun > maxStreak) {
          maxStreak = currentRun;
        }
      } else {
        currentRun = 0;
      }
    }
    d.setDate(d.getDate() + 1);
  }

  return Math.max(maxStreak, calculateCurrentStreak(habit, logs, referenceDate));
}

/**
 * Section 8.6: Completion % and counts in the selected period (default: last 28 days)
 */
export function calculateHabitStats(
  habit: Habit, 
  logs: HabitLog[], 
  daysCount: number = 28, 
  referenceDate: Date = new Date()
) {
  const logMap = new Map<string, boolean>();
  logs.forEach(l => {
    if (l.habitId === habit.id) {
      logMap.set(l.date, l.completed);
    }
  });

  let scheduledDays = 0;
  let completedDays = 0;
  let missedDays = 0;

  const d = new Date(referenceDate);

  for (let i = 0; i < daysCount; i++) {
    const scheduled = isHabitScheduledOnDate(habit, d);
    const dStr = formatLocalDate(d);

    if (scheduled) {
      scheduledDays++;
      const isDone = logMap.get(dStr) === true;
      if (isDone) {
        completedDays++;
      } else {
        // Today is only considered missed if it's already ended or past
        // But for statistics within the period:
        if (i > 0 || isDone) {
          missedDays++;
        }
      }
    }
    d.setDate(d.getDate() - 1);
  }

  const completionPercentage = scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0;
  const currentStreak = calculateCurrentStreak(habit, logs, referenceDate);
  const longestStreak = calculateLongestStreak(habit, logs, referenceDate);

  return {
    scheduledDays,
    completedDays,
    missedDays,
    completionPercentage,
    currentStreak,
    longestStreak,
  };
}

/**
 * Section 8.5: Heatmap intensity calculation for a given date
 * - completed scheduled habits ÷ scheduled habits that day
 * Intensity levels:
 * 0: 0% or no scheduled habits
 * 1: 1-49%
 * 2: 50-99%
 * 3: 100%
 */
export function getHeatmapDayIntensity(habits: Habit[], logs: HabitLog[], date: Date): {
  scheduledCount: number;
  completedCount: number;
  percentage: number;
  level: 0 | 1 | 2 | 3;
} {
  const dateStr = formatLocalDate(date);
  let scheduledCount = 0;
  let completedCount = 0;

  habits.forEach(h => {
    if (isHabitScheduledOnDate(h, date)) {
      scheduledCount++;
      const isDone = logs.some(l => l.habitId === h.id && l.date === dateStr && l.completed);
      if (isDone) {
        completedCount++;
      }
    }
  });

  if (scheduledCount === 0) {
    return { scheduledCount: 0, completedCount: 0, percentage: 0, level: 0 };
  }

  const percentage = Math.round((completedCount / scheduledCount) * 100);
  let level: 0 | 1 | 2 | 3 = 0;
  if (percentage === 100) level = 3;
  else if (percentage >= 50) level = 2;
  else if (percentage > 0) level = 1;

  return { scheduledCount, completedCount, percentage, level };
}

