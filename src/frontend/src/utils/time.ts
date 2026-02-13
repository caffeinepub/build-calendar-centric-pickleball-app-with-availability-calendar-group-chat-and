// Time utility functions for parsing and formatting availability times

export interface TimeComponents {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

// Generate hour options (1-12)
export function getHourOptions(): string[] {
  return Array.from({ length: 12 }, (_, i) => (i + 1).toString());
}

// Generate minute options (00, 15, 30, 45)
export function getMinuteOptions(): string[] {
  return ['00', '15', '30', '45'];
}

// Generate period options
export function getPeriodOptions(): Array<'AM' | 'PM'> {
  return ['AM', 'PM'];
}

// Format time components into a time string (e.g., "8:00 AM")
export function formatTimeString(hour: string, minute: string, period: 'AM' | 'PM'): string {
  return `${hour}:${minute} ${period}`;
}

// Parse a time string into components
// Returns null if parsing fails
export function parseTimeString(timeString: string): TimeComponents | null {
  if (!timeString) return null;

  // Match pattern like "8:00 AM" or "12:30 PM"
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  
  if (!match) return null;

  const [, hour, minute, period] = match;
  
  // Validate hour (1-12)
  const hourNum = parseInt(hour, 10);
  if (hourNum < 1 || hourNum > 12) return null;
  
  // Validate minute (00-59)
  const minuteNum = parseInt(minute, 10);
  if (minuteNum < 0 || minuteNum > 59) return null;
  
  return {
    hour: hourNum.toString(),
    minute,
    period: period.toUpperCase() as 'AM' | 'PM',
  };
}

// Get default time components (8:00 AM)
export function getDefaultTimeComponents(): TimeComponents {
  return {
    hour: '8',
    minute: '00',
    period: 'AM',
  };
}
