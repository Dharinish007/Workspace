import { 
  Page, 
  Task, 
  Habit, 
  HabitLog, 
  CalendarEvent, 
  DayColor, 
  BackupData 
} from '../types';
import { formatLocalDate } from '../db/indexedDB';

// Helper to calculate a date string (YYYY-MM-DD) offset by N days from reference
function getOffsetDateStr(offsetDays: number, refDate: Date = new Date()): string {
  const d = new Date(refDate);
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
}

// Helper to generate ISO timestamp offset by days and hours
function getOffsetISO(offsetDays: number, offsetHours: number = 0, refDate: Date = new Date()): string {
  const d = new Date(refDate);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(d.getHours() + offsetHours);
  return d.toISOString();
}

export function generateDummyData(refDate: Date = new Date()): BackupData {
  const now = refDate.toISOString();

  // 1. Pages (including an archived page to test archive views)
  const pages: Page[] = [
    {
      id: 'demo-page-career',
      name: 'Career & Work',
      icon: 'Briefcase',
      color: '#4285F4', // Blue
      order: 0,
      archived: false,
      createdAt: getOffsetISO(-30, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-page-projects',
      name: 'Side Projects',
      icon: 'Code',
      color: '#10B981', // Emerald
      order: 1,
      archived: false,
      createdAt: getOffsetISO(-25, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-page-learning',
      name: 'Learning & Books',
      icon: 'BookOpen',
      color: '#8B5CF6', // Purple
      order: 2,
      archived: false,
      createdAt: getOffsetISO(-20, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-page-health',
      name: 'Health & Wellness',
      icon: 'Heart',
      color: '#EC4899', // Pink
      order: 3,
      archived: false,
      createdAt: getOffsetISO(-15, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-page-finance',
      name: 'Personal Finance',
      icon: 'TrendingUp',
      color: '#F59E0B', // Amber
      order: 4,
      archived: false,
      createdAt: getOffsetISO(-10, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-page-archived',
      name: 'Archived 2025 Retrospective',
      icon: 'Folder',
      color: '#6B7280', // Gray
      order: 5,
      archived: true,
      createdAt: getOffsetISO(-90, 0, refDate),
      updatedAt: getOffsetISO(-30, 0, refDate),
    },
  ];

  // 2. Tasks with rich variations (priorities, overdue, today, future, completed, important)
  const tasks: Task[] = [
    // --- Career & Work ---
    {
      id: 'demo-task-career-1',
      pageId: 'demo-page-career',
      title: 'Finalize Q4 Strategic Roadmap & OKR Alignment',
      priority: 'high',
      important: true,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(0, refDate), // Today
      order: 0,
      createdAt: getOffsetISO(-3, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-career-2',
      pageId: 'demo-page-career',
      title: 'Prepare slides for executive product sync',
      priority: 'high',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(1, refDate), // Tomorrow
      order: 1,
      createdAt: getOffsetISO(-2, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-career-3',
      pageId: 'demo-page-career',
      title: 'Conduct weekly 1:1 engineering mentorship sessions',
      priority: 'medium',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(3, refDate),
      order: 2,
      createdAt: getOffsetISO(-4, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-career-4',
      pageId: 'demo-page-career',
      title: 'Submit quarterly performance reflections',
      priority: 'medium',
      important: true,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(-2, refDate), // Overdue by 2 days
      order: 3,
      createdAt: getOffsetISO(-6, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-career-5',
      pageId: 'demo-page-career',
      title: 'Complete annual compliance & information security training',
      priority: 'low',
      important: false,
      completed: true,
      completedAt: getOffsetISO(-1, -4, refDate),
      dueDate: getOffsetDateStr(-1, refDate),
      order: 4,
      createdAt: getOffsetISO(-5, 0, refDate),
      updatedAt: getOffsetISO(-1, -4, refDate),
    },

    // --- Side Projects ---
    {
      id: 'demo-task-proj-1',
      pageId: 'demo-page-projects',
      title: 'Ship local-first IndexedDB backup & restore pipeline',
      priority: 'high',
      important: true,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(0, refDate), // Today
      order: 0,
      createdAt: getOffsetISO(-2, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-proj-2',
      pageId: 'demo-page-projects',
      title: 'Tune framer-motion micro-interactions for calendar navigation',
      priority: 'medium',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(2, refDate),
      order: 1,
      createdAt: getOffsetISO(-1, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-proj-3',
      pageId: 'demo-page-projects',
      title: 'Audit bundle size and remove unused SVG icon dependencies',
      priority: 'low',
      important: false,
      completed: true,
      completedAt: getOffsetISO(-2, -6, refDate),
      dueDate: getOffsetDateStr(-2, refDate),
      order: 2,
      createdAt: getOffsetISO(-7, 0, refDate),
      updatedAt: getOffsetISO(-2, -6, refDate),
    },
    {
      id: 'demo-task-proj-4',
      pageId: 'demo-page-projects',
      title: 'Implement drag-and-drop reordering for habit table view',
      priority: 'medium',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: null, // No due date
      order: 3,
      createdAt: getOffsetISO(-5, 0, refDate),
      updatedAt: now,
    },

    // --- Learning & Books ---
    {
      id: 'demo-task-learn-1',
      pageId: 'demo-page-learning',
      title: 'Read Chapters 7-9 of Designing Data-Intensive Applications',
      priority: 'high',
      important: true,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(2, refDate),
      order: 0,
      createdAt: getOffsetISO(-4, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-learn-2',
      pageId: 'demo-page-learning',
      title: 'Explore TypeScript 5.8 feature updates and type narrowing',
      priority: 'medium',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(5, refDate),
      order: 1,
      createdAt: getOffsetISO(-3, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-learn-3',
      pageId: 'demo-page-learning',
      title: 'Take notes on System Design distributed locks & consensus',
      priority: 'low',
      important: false,
      completed: true,
      completedAt: getOffsetISO(-1, -2, refDate),
      dueDate: getOffsetDateStr(-1, refDate),
      order: 2,
      createdAt: getOffsetISO(-4, 0, refDate),
      updatedAt: getOffsetISO(-1, -2, refDate),
    },

    // --- Health & Wellness ---
    {
      id: 'demo-task-health-1',
      pageId: 'demo-page-health',
      title: 'Book bi-annual dental checkup and teeth cleaning',
      priority: 'high',
      important: true,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(-1, refDate), // Overdue by 1 day
      order: 0,
      createdAt: getOffsetISO(-5, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-health-2',
      pageId: 'demo-page-health',
      title: 'Restock daily vitamins, magnesium and whey protein',
      priority: 'medium',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(1, refDate),
      order: 1,
      createdAt: getOffsetISO(-1, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-health-3',
      pageId: 'demo-page-health',
      title: 'Morning 45-minute stretching & foam rolling routine',
      priority: 'medium',
      important: false,
      completed: true,
      completedAt: getOffsetISO(0, -8, refDate),
      dueDate: getOffsetDateStr(0, refDate),
      order: 2,
      createdAt: getOffsetISO(0, -10, refDate),
      updatedAt: getOffsetISO(0, -8, refDate),
    },

    // --- Personal Finance ---
    {
      id: 'demo-task-fin-1',
      pageId: 'demo-page-finance',
      title: 'Review monthly cloud infrastructure and SaaS subscriptions',
      priority: 'medium',
      important: false,
      completed: false,
      completedAt: null,
      dueDate: getOffsetDateStr(4, refDate),
      order: 0,
      createdAt: getOffsetISO(-2, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-task-fin-2',
      pageId: 'demo-page-finance',
      title: 'Rebalance index fund portfolio and automated SIPs',
      priority: 'low',
      important: false,
      completed: true,
      completedAt: getOffsetISO(-3, -2, refDate),
      dueDate: getOffsetDateStr(-3, refDate),
      order: 1,
      createdAt: getOffsetISO(-8, 0, refDate),
      updatedAt: getOffsetISO(-3, -2, refDate),
    },
  ];

  // 3. Habits (both daily and weekdays schedules)
  const habits: Habit[] = [
    {
      id: 'demo-habit-water',
      name: 'Drink 2.5L Water',
      icon: 'Coffee',
      color: '#0EA5E9', // Sky blue
      schedule: { type: 'daily' },
      createdAt: getOffsetISO(-50, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-habit-reading',
      name: 'Read 25 Pages',
      icon: 'BookOpen',
      color: '#8B5CF6', // Violet
      schedule: { type: 'daily' },
      createdAt: getOffsetISO(-45, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-habit-gym',
      name: 'Strength Training',
      icon: 'Dumbbell',
      color: '#EF4444', // Red
      schedule: { type: 'weekdays', days: [1, 2, 4, 5] }, // Mon, Tue, Thu, Fri
      createdAt: getOffsetISO(-45, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-habit-meditation',
      name: 'Mindful Meditation',
      icon: 'Sun',
      color: '#F59E0B', // Amber
      schedule: { type: 'daily' },
      createdAt: getOffsetISO(-40, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-habit-code',
      name: 'Clean Code & Commit',
      icon: 'Code',
      color: '#10B981', // Emerald
      schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] }, // Mon - Fri
      createdAt: getOffsetISO(-40, 0, refDate),
      updatedAt: now,
    },
  ];

  // 4. Habit Logs for the past 45 days (generating a rich heatmap & realistic streaks)
  const habitLogs: HabitLog[] = [];
  
  for (let offset = -44; offset <= 0; offset++) {
    const curDate = new Date(refDate);
    curDate.setDate(curDate.getDate() + offset);
    const dateStr = formatLocalDate(curDate);
    // Day of week: 1 = Monday, 7 = Sunday
    const dow = (curDate.getDay() + 6) % 7 + 1;
    const isToday = offset === 0;

    // Habit 1: Water (Daily - ~88% completion, strong recent streak)
    // On today, let's mark it completed
    const waterCompleted = isToday ? true : (offset % 7 !== 3 && Math.sin(offset) > -0.6);
    if (waterCompleted) {
      habitLogs.push({
        id: `demo-habit-water_${dateStr}`,
        habitId: 'demo-habit-water',
        date: dateStr,
        completed: true,
        updatedAt: getOffsetISO(offset, 18, refDate),
      });
    }

    // Habit 2: Reading (Daily - ~78% completion)
    const readingCompleted = isToday ? true : (offset % 5 !== 1);
    if (readingCompleted) {
      habitLogs.push({
        id: `demo-habit-reading_${dateStr}`,
        habitId: 'demo-habit-reading',
        date: dateStr,
        completed: true,
        updatedAt: getOffsetISO(offset, 21, refDate),
      });
    }

    // Habit 3: Gym (Mon, Tue, Thu, Fri - strong attendance)
    if ([1, 2, 4, 5].includes(dow)) {
      // Completed on most scheduled days except occasional rest
      const gymCompleted = offset % 6 !== 0;
      if (gymCompleted) {
        habitLogs.push({
          id: `demo-habit-gym_${dateStr}`,
          habitId: 'demo-habit-gym',
          date: dateStr,
          completed: true,
          updatedAt: getOffsetISO(offset, 8, refDate),
        });
      }
    }

    // Habit 4: Meditation (Daily - ~80% completion)
    const medCompleted = offset % 6 !== 2;
    if (medCompleted) {
      habitLogs.push({
        id: `demo-habit-meditation_${dateStr}`,
        habitId: 'demo-habit-meditation',
        date: dateStr,
        completed: true,
        updatedAt: getOffsetISO(offset, 7, refDate),
      });
    }

    // Habit 5: Clean Code (Mon-Fri)
    if (dow >= 1 && dow <= 5) {
      const codeCompleted = isToday ? true : (offset % 8 !== 4);
      if (codeCompleted) {
        habitLogs.push({
          id: `demo-habit-code_${dateStr}`,
          habitId: 'demo-habit-code',
          date: dateStr,
          completed: true,
          updatedAt: getOffsetISO(offset, 19, refDate),
        });
      }
    }
  }

  // 5. Calendar Events across current week and surrounding days
  const events: CalendarEvent[] = [
    // Today
    {
      id: 'demo-event-1',
      title: 'Weekly Sprint Kickoff & Standup',
      date: getOffsetDateStr(0, refDate),
      startTime: '09:30',
      endTime: '10:30',
      color: '#4285F4', // Blue
      category: 'Work',
      createdAt: getOffsetISO(-5, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-event-2',
      title: 'Deep Focus: Local-First Architecture',
      date: getOffsetDateStr(0, refDate),
      startTime: '14:00',
      endTime: '16:00',
      color: '#8B5CF6', // Purple
      category: 'Focus',
      createdAt: getOffsetISO(-2, 0, refDate),
      updatedAt: now,
    },
    // Tomorrow
    {
      id: 'demo-event-3',
      title: 'Design Critique & UI Polishing',
      date: getOffsetDateStr(1, refDate),
      startTime: '11:00',
      endTime: '12:00',
      color: '#EC4899', // Pink
      category: 'Design',
      createdAt: getOffsetISO(-3, 0, refDate),
      updatedAt: now,
    },
    {
      id: 'demo-event-4',
      title: 'Strength & Conditioning Session',
      date: getOffsetDateStr(1, refDate),
      startTime: '18:00',
      endTime: '19:15',
      color: '#EF4444', // Red
      category: 'Health',
      createdAt: getOffsetISO(-1, 0, refDate),
      updatedAt: now,
    },
    // Day + 2
    {
      id: 'demo-event-5',
      title: 'Frontend Architecture Brownbag Demo',
      date: getOffsetDateStr(2, refDate),
      startTime: '15:30',
      endTime: '16:30',
      color: '#10B981', // Emerald
      category: 'Work',
      createdAt: getOffsetISO(-4, 0, refDate),
      updatedAt: now,
    },
    // Day + 3
    {
      id: 'demo-event-6',
      title: 'Coffee Catchup with Tech Lead',
      date: getOffsetDateStr(3, refDate),
      startTime: '10:00',
      endTime: '10:45',
      color: '#F59E0B', // Amber
      category: 'Personal',
      createdAt: getOffsetISO(-2, 0, refDate),
      updatedAt: now,
    },
    // Yesterday
    {
      id: 'demo-event-7',
      title: 'Quarterly Systems Review & Retro',
      date: getOffsetDateStr(-1, refDate),
      startTime: '16:00',
      endTime: '17:30',
      color: '#4285F4',
      category: 'Work',
      createdAt: getOffsetISO(-7, 0, refDate),
      updatedAt: now,
    },
    // Day - 2
    {
      id: 'demo-event-8',
      title: 'IndexedDB Performance Benchmark Session',
      date: getOffsetDateStr(-2, refDate),
      startTime: '13:00',
      endTime: '14:30',
      color: '#8B5CF6',
      category: 'Work',
      createdAt: getOffsetISO(-6, 0, refDate),
      updatedAt: now,
    },
    // Weekend / Upcoming
    {
      id: 'demo-event-9',
      title: 'Weekend Trail Run & Nature Hike',
      date: getOffsetDateStr(4, refDate),
      startTime: '07:30',
      endTime: '09:30',
      color: '#10B981',
      category: 'Health',
      createdAt: getOffsetISO(-3, 0, refDate),
      updatedAt: now,
    },
    // All-day milestone in 6 days
    {
      id: 'demo-event-10',
      title: 'Product Beta Milestone Release Day',
      date: getOffsetDateStr(6, refDate),
      startTime: null,
      endTime: null,
      color: '#F59E0B',
      category: 'Milestone',
      createdAt: getOffsetISO(-5, 0, refDate),
      updatedAt: now,
    },
  ];

  // 6. Day Colors for highlight days
  const dayColors: DayColor[] = [
    {
      date: getOffsetDateStr(0, refDate), // Today: soft purple
      color: '#8B5CF6',
    },
    {
      date: getOffsetDateStr(4, refDate), // Weekend activity: soft green
      color: '#10B981',
    },
    {
      date: getOffsetDateStr(6, refDate), // Milestone: soft amber
      color: '#F59E0B',
    },
    {
      date: getOffsetDateStr(-2, refDate), // Benchmark day: soft blue
      color: '#4285F4',
    },
  ];

  return {
    app: 'my-workspace',
    schemaVersion: 1,
    exportedAt: now,
    data: {
      pages,
      tasks,
      habits,
      habitLogs,
      events,
      dayColors,
      settings: {
        theme: 'light',
        displayName: 'Dharinish',
        weekStart: 'monday',
        lastBackup: now,
        habitDefaultColor: '#0D9488',
        eventDefaultColor: '#F97316',
        backgroundStyle: 'current',
      },
    },
  };
}

