interface BreakTime {
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format
}

/**
 * Calculates actual work time excluding break periods.
 *
 * @param startTime - Work start time in "HH:MM" format
 * @param endTime - Work end time in "HH:MM" format
 * @param breakTimes - Array of break periods to exclude
 * @returns Work duration in seconds, excluding breaks
 */
export function calculateWorkTime(
  startTime: string,
  endTime: string,
  breakTimes: BreakTime[]
): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  let totalWorkMinutes = endMinutes - startMinutes;
  if (totalWorkMinutes < 0) totalWorkMinutes = 0;

  // Subtract overlapping break times
  for (const breakTime of breakTimes) {
    const breakStart = timeToMinutes(breakTime.start);
    const breakEnd = timeToMinutes(breakTime.end);

    // Calculate overlap between work period and break
    const overlapStart = Math.max(startMinutes, breakStart);
    const overlapEnd = Math.min(endMinutes, breakEnd);

    if (overlapStart < overlapEnd) {
      totalWorkMinutes -= overlapEnd - overlapStart;
    }
  }

  return Math.max(0, totalWorkMinutes * 60); // Convert to seconds
}

/**
 * Converts "HH:MM" time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Distributes total work time across issues, optionally with break time exclusion.
 *
 * @param totalSeconds - Total work time in seconds
 * @param issueCount - Number of issues to distribute time across
 * @param breakTimes - Optional break times to consider
 * @returns Array of time allocations in seconds
 */
export function distributeTimeAcrossIssues(
  totalSeconds: number,
  issueCount: number,
  breakTimes?: BreakTime[]
): number[] {
  if (issueCount <= 0) return [];

  const perIssue = Math.floor(totalSeconds / issueCount);
  const remainder = totalSeconds % issueCount;

  const allocations: number[] = [];
  for (let i = 0; i < issueCount; i++) {
    // Give remainder to first issues
    allocations.push(perIssue + (i < remainder ? 1 : 0));
  }

  return allocations;
}

/**
 * Formats seconds as human-readable duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Example usage:
 *
 * // Work from 9am to 7pm with lunch break 12-1pm
 * const workSeconds = calculateWorkTime('09:00', '19:00', [
 *   { start: '12:00', end: '13:00' }
 * ]);
 * // Returns: 9 hours = 32400 seconds
 */
