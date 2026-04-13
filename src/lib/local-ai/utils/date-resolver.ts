/**
 * OS Bot Date Resolver
 * Parses relative human terms into ISO strings for task/calendar filtering.
 */

export function resolveDate(input: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();

  // Reset time to midnight for clean comparison
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (lower.includes('today')) {
    // defaults to target (today)
  } else if (lower.includes('tomorrow')) {
    target.setDate(target.getDate() + 1);
  } else if (lower.includes('yesterday')) {
    target.setDate(target.getDate() - 1);
  } else if (lower.includes('next week')) {
    target.setDate(target.getDate() + 7);
  } else if (lower.includes('monday')) {
    getNextDayOfWeek(target, 1);
  } else if (lower.includes('tuesday')) {
    getNextDayOfWeek(target, 2);
  } else if (lower.includes('wednesday')) {
    getNextDayOfWeek(target, 3);
  } else if (lower.includes('thursday')) {
    getNextDayOfWeek(target, 4);
  } else if (lower.includes('friday')) {
    getNextDayOfWeek(target, 5);
  } else if (lower.includes('saturday')) {
    getNextDayOfWeek(target, 6);
  } else if (lower.includes('sunday')) {
    getNextDayOfWeek(target, 0);
  }

  return target.toISOString().split('T')[0];
}

/**
 * Moves date to the next occurrence of a day of the week (0=Sun, 1=Mon, etc.)
 */
function getNextDayOfWeek(date: Date, dayOfWeek: number) {
  const resultDate = new Date(date.getTime());
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
  // If result is today but we're looking for "next Monday", move to next week
  if (resultDate.getTime() === date.getTime()) {
    resultDate.setDate(resultDate.getDate() + 7);
  }
  date.setTime(resultDate.getTime());
}

/**
 * Formats a date for human display
 */
export function formatHumanDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}
