export function getDayId(date: Date): bigint {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return BigInt(year * 10000 + month * 100 + day);
}

export function dateFromDayId(dayId: bigint): Date {
  const id = Number(dayId);
  const year = Math.floor(id / 10000);
  const month = Math.floor((id % 10000) / 100) - 1;
  const day = id % 100;
  return new Date(year, month, day);
}

export function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  return days;
}

export function getMonthGridDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  const startDay = firstDay.getDay();
  
  for (let i = startDay - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    days.push(prevDate);
  }
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  
  const endDay = lastDay.getDay();
  for (let i = 1; i < 7 - endDay; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push(nextDate);
  }
  
  return days;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

export function formatDayId(dayId: bigint): string {
  const date = dateFromDayId(dayId);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Get the start day ID for a timeframe window (N days ago from today, inclusive)
 * For weekly: last 7 days including today
 * For monthly: last 30 days including today
 */
export function getTimeframeStartDayId(daysAgo: number): bigint {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (daysAgo - 1));
  return getDayId(startDate);
}

/**
 * Get the end day ID for a timeframe window (today)
 */
export function getTimeframeEndDayId(): bigint {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getDayId(today);
}

/**
 * Format a timeframe window as a date range string or "All Time" label
 * @param timeFilter - Either a number of days (7, 30) or a string filter ('weekly', 'monthly', 'all')
 */
export function formatTimeframeWindow(timeFilter: number | string): string {
  // Handle "all" filter
  if (timeFilter === 'all') {
    return 'All Time';
  }
  
  // Convert string filters to days
  let daysAgo: number;
  if (typeof timeFilter === 'string') {
    if (timeFilter === 'weekly') {
      daysAgo = 7;
    } else if (timeFilter === 'monthly') {
      daysAgo = 30;
    } else {
      return 'All Time';
    }
  } else {
    daysAgo = timeFilter;
  }
  
  const startDayId = getTimeframeStartDayId(daysAgo);
  const endDayId = getTimeframeEndDayId();
  
  const startDate = dateFromDayId(startDayId);
  const endDate = dateFromDayId(endDayId);
  
  const startStr = startDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  const endStr = endDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startStr} – ${endStr}`;
}
