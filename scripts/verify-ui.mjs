import { execFileSync } from 'child_process';

const BROWSE_EXE = 'C:\\Users\\dhari\\.antigravity\\skills\\gstack\\gstack-source\\browse\\dist\\browse.exe';

function runBrowseChain(commands) {
  const jsonStr = JSON.stringify(commands);
  return execFileSync(BROWSE_EXE, ['chain', jsonStr], { encoding: 'utf-8' });
}

console.log('Running complete UI interaction & screenshot chain...');
const res = runBrowseChain([
  // 1. Dashboard
  ['goto', 'http://localhost:4173'],
  ['wait', 'h1'],
  ['screenshot', 'artifacts/1-dashboard.png'],

  // 2. To-Do overview
  ['click', 'aside button:nth-child(2)'],
  ['wait', 'h1:has-text("To-Do")'],
  ['screenshot', 'artifacts/2-todo.png'],

  // 3. Calendar
  ['click', 'aside button:nth-child(3)'],
  ['wait', 'button:has-text("Add Event")'],
  ['screenshot', 'artifacts/3-calendar.png'],

  // 4. Habit Tracker
  ['click', 'aside button:nth-child(4)'],
  ['wait', 'h1:has-text("Habit Tracker")'],
  ['screenshot', 'artifacts/4-habits.png'],

  // 5. Settings Modal
  ['click', 'button[aria-label="Open Settings"]'],
  ['wait', 'h2:has-text("Settings & Data Management")'],
  ['screenshot', 'artifacts/5-settings.png'],
  ['press', 'Escape'],

  // 6. Dark Mode
  ['click', 'button[aria-label="Toggle theme"]'],
  ['screenshot', 'artifacts/6-dark-mode.png']
]);

console.log(res);
console.log('Successfully captured all screenshots in single session!');
