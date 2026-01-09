import React, { useState, useEffect } from 'react';
import { Calendar, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';

interface Worklog {
  id: string;
  issue: { key: string; summary?: string };
  timeSpentSeconds: number;
  started: string;
  comment?: { content: any[] };
  author: { accountId: string; displayName: string };
}

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
      const result = await (window as any).ipcRenderer.invoke('jira-get-worklogs', from, to);
      setWorklogs(result || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch worklogs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const totalSeconds = worklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);

  // Extract date from 'started' field and group worklogs
  const groupedByDate = worklogs.reduce(
    (acc, worklog) => {
      const date = worklog.started?.split('T')[0] || 'Unknown';
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(worklog);
      return acc;
    },
    {} as Record<string, Worklog[]>
  );

  const sortedDates = Object.keys(groupedByDate).sort().reverse();

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto animate-in">
      <div className="flex items-center justify-between">
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

      {/* Date Range Selector */}
      <div className="glass-card p-4 rounded-xl flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">
            Date Range
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('week')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background: dateRange === 'week' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                color: dateRange === 'week' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border:
                  dateRange === 'week'
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
              }}
            >
              This Week
            </button>
            <button
              onClick={() => setDateRange('yesterday')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background:
                  dateRange === 'yesterday' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                color:
                  dateRange === 'yesterday' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border:
                  dateRange === 'yesterday'
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
              }}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateRange('custom')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                background:
                  dateRange === 'custom' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)',
                color: dateRange === 'custom' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border:
                  dateRange === 'custom'
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
              }}
            >
              Custom
            </button>
          </div>
        </div>

        {dateRange === 'custom' && (
          <>
            <div className="animate-in">
              <label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">
                From
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="animate-in">
              <label className="block text-xs font-medium text-secondary mb-1-5 uppercase tracking-wider">
                To
              </label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </>
        )}

        {worklogs.length > 0 && (
          <div className="ml-auto text-right">
            <span className="text-xs text-secondary uppercase tracking-wider">Total</span>
            <div className="text-xl font-bold text-accent">{formatTime(totalSeconds)}</div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="glass-card p-4 rounded-xl"
          style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)' }}
        >
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {/* Worklogs Display */}
      {worklogs.length === 0 && !isLoading && !error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-secondary gap-6 opacity-60">
          <div
            style={{
              width: '6rem',
              height: '6rem',
              borderRadius: '9999px',
              background: 'var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={48} />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">No worklogs found</p>
            <p className="text-sm">Click "Refresh" to fetch worklogs from Jira</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedDates.map((date) => {
            const dayWorklogs = groupedByDate[date];
            const dayTotal = dayWorklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);

            return (
              <div key={date} className="glass-card rounded-xl overflow-hidden">
                <div
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(var(--text-primary-rgb, 255, 255, 255), 0.03)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span className="font-bold">{date}</span>
                  <span className="text-accent font-medium">{formatTime(dayTotal)}</span>
                </div>

                <div>
                  {dayWorklogs.map((worklog, index) => (
                    <div
                      key={worklog.id}
                      style={{
                        padding: '1rem 1.25rem',
                        borderTop: index > 0 ? '1px solid var(--border-color)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      <div
                        style={{
                          padding: '0.5rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          borderRadius: '0.375rem',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <Clock size={16} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              window.open(`${jiraBaseUrl}/browse/${worklog.issue.key}`, '_blank')
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: 'var(--accent-primary)',
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {worklog.issue.key}
                            <ExternalLink size={12} />
                          </button>
                        </div>
                        {worklog.issue.summary && (
                          <p className="text-sm text-secondary" style={{ marginTop: '0.25rem' }}>
                            {worklog.issue.summary}
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {formatTime(worklog.timeSpentSeconds)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
