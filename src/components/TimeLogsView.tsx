import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subDays, eachDayOfInterval, isToday, parseISO, startOfDay, differenceInMinutes, addHours } from 'date-fns';

interface Worklog {
  id: string;
  issue: { key: string; summary?: string };
  timeSpentSeconds: number;
  started: string; // ISO string "YYYY-MM-DDTHH:mm:ss"
  description?: string;
  comment?: { content: any[] };
  author: { accountId: string; displayName: string };
}

const HOUR_HEIGHT = 60; // px per hour
const START_HOUR = 0;
const END_HOUR = 24;

export const TimeLogsView: React.FC = () => {
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'yesterday' | 'custom'>('week');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const savedUrl = await (window as any).ipcRenderer.invoke('get-settings', 'jiraBaseUrl');
      if (savedUrl) setJiraBaseUrl(savedUrl);
    };
    loadSettings();
  }, []);

  const getDateRanges = () => {
    const today = new Date();
    if (dateRange === 'week') {
      return {
        from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    } else if (dateRange === 'yesterday') {
      const yesterday = subDays(today, 1);
      return {
        from: format(yesterday, 'yyyy-MM-dd'),
        to: format(yesterday, 'yyyy-MM-dd'),
      };
    }
    return { from: customFrom, to: customTo };
  };

  const fetchWorklogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRanges();
      const result = await (window as any).ipcRenderer.invoke('tempo-get-worklogs', from, to);
      setWorklogs(result || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch worklogs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  // --- Calendar Logic ---

  const { from, to } = getDateRanges();
  const dates = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Group worklogs by date for easy access
  const worklogsByDate: Record<string, Worklog[]> = {};
  worklogs.forEach(wl => {
    if (!wl.started) return;
    const date = wl.started.split('T')[0];
    if (!worklogsByDate[date]) worklogsByDate[date] = [];
    worklogsByDate[date].push(wl);
  });

  const getWorklogStyle = (worklog: Worklog) => {
    const startDate = parseISO(worklog.started);
    const dayStart = startOfDay(startDate);
    const minutesFromStart = differenceInMinutes(startDate, dayStart);
    
    const top = (minutesFromStart / 60) * HOUR_HEIGHT + 2; // +2px gap from top
    const height = (worklog.timeSpentSeconds / 3600) * HOUR_HEIGHT - 4; // -4px for top/bottom gaps

    return {
      top: `${top}px`,
      height: `${Math.max(height, 18)}px`, // Minimum height for visibility
      left: '6px',
      right: '6px',
    };
  };

  // Auto-scroll to 8 AM
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Small timeout to ensure layout is calculated
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        // 8 AM * 60px/hr = 480px
        scrollContainerRef.current.scrollTop = 8 * HOUR_HEIGHT;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [dateRange, worklogs, isLoading]); // Re-scroll when data loads

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-hidden animate-in">
      {/* Header Section */}
      <div className="flex items-center justify-between shrink-0 px-6 pt-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Time Logs</h1>
          <p className="text-secondary text-sm">View your logged work from Jira</p>
        </div>

        <button
          onClick={fetchWorklogs}
          disabled={isLoading}
          className="primary flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Controls Section */}
      <div className="px-6 shrink-0">
        <div className="glass-card p-4 rounded-xl flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">
              Date Range
            </label>
            <div className="flex gap-2">
              {(['week', 'yesterday', 'custom'] as const).map(range => (
                <button
                key={range}
                onClick={() => setDateRange(range)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  background: dateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                  color: dateRange === range ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: dateRange === range ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  textTransform: 'capitalize'
                }}
              >
                {range === 'week' ? 'This Week' : range}
              </button>
              ))}
            </div>
          </div>

          {dateRange === 'custom' && (
            <>
              <div className="animate-in">
                <label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">From</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="animate-in">
                <label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">To</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 shrink-0">
          <div className="glass-card p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)' }}>
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div style={{ flex: 1, minHeight: 0, padding: '0 1.5rem 1.5rem 1.5rem' }}>
        <div className="glass-card rounded-xl" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Calendar Header (Days) */}
          <div className="flex border-b border-border" style={{ flexShrink: 0, background: 'var(--bg-secondary)', paddingLeft: '60px', paddingRight: '4px' }}>
            {dates.map(date => {
              const isTodayDate = isToday(date);
              return (
                <div key={date.toString()} className="flex-1 p-3 text-center border-l border-border" style={{ background: isTodayDate ? 'rgba(59, 130, 246, 0.05)' : 'inherit' }}>
                  <div className="text-xs uppercase tracking-wider text-secondary">{format(date, 'EEE')}</div>
                  <div className={`text-lg font-bold ${isTodayDate ? 'text-accent' : ''}`}>{format(date, 'dd')}</div>
                </div>
              );
            })}
          </div>

          {/* Calendar Body (Scrollable) */}
          <div 
            ref={scrollContainerRef} 
            style={{ 
              flex: 1, 
              overflowY: 'scroll', 
              overflowX: 'hidden',
              position: 'relative'
            }}
          >
            <div className="flex relative" style={{ height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px` }}>
              
              {/* Time Axis */}
              <div className="w-[60px] shrink-0 border-r border-border flex flex-col sticky left-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
                {hours.map(hour => (
                  <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="text-xs text-secondary text-right pr-2 pt-1 relative">
                    <span className="-top-2 relative">{format(addHours(startOfDay(new Date()), hour), 'HH:mm')}</span>
                    {/* Horizontal Grid Line */}
                    <div className="absolute top-0 right-0 w-[2000px] border-t border-border opacity-30 pointer-events-none" style={{ transform: 'translateX(100%)' }} />
                  </div>
                ))}
              </div>

              {/* Days Columns */}
              {dateStrings.map(dateStr => {
                const dayWorklogs = worklogsByDate[dateStr] || [];
                const isTodayDate = isToday(parseISO(dateStr));
                
                return (
                  <div key={dateStr} className="flex-1 relative border-l border-border first:border-l-0" style={{ background: isTodayDate ? 'rgba(59, 130, 246, 0.02)' : 'transparent' }}>
                    {/* Grid Lines (Background) */}
                    {hours.map(hour => (
                      <div key={hour} className="border-t border-border opacity-30 w-full absolute" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }} />
                    ))}

                    {/* Worklog Blocks */}
                    {dayWorklogs.map(wl => {
                      const blockStyle = getWorklogStyle(wl);
                      const heightPx = parseFloat(blockStyle.height);
                      const isShort = heightPx < 40; // Less than 40px (about 40 min)
                      const isTiny = heightPx < 25; // Less than 25px (about 25 min)
                      
                      return (
                        <div
                          key={wl.id}
                          className="absolute rounded-lg border border-accent/30 overflow-hidden hover:z-20 transition-all hover:shadow-lg group"
                          style={{
                            ...blockStyle,
                            marginTop: '2px',
                            marginBottom: '2px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            cursor: 'pointer',
                          }}
                          onClick={() => (window as any).ipcRenderer.invoke('open-external', `${jiraBaseUrl}/browse/${wl.issue.key}`)}
                          title={`${wl.issue.key}: ${wl.issue.summary}\n${formatTime(wl.timeSpentSeconds)}`}
                        >
                          <div style={{ padding: '2px 4px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minHeight: 0 }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {wl.issue.key}
                              </span>
                              {!isTiny && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                  {formatTime(wl.timeSpentSeconds)}
                                </span>
                              )}
                            </div>
                            {!isShort && (
                              <div style={{ fontSize: '0.75rem', lineHeight: 1.2, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                                {wl.issue.summary}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
