import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Clock,
  Send,
  AlertCircle,
  Calendar,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Commit } from '../types';
import { format } from 'date-fns';

interface EffortSubmissionModalProps {
  commits: Commit[];
  onClose: () => void;
  onSubmit: (efforts: EffortEntry[], workDate: string, workStartTime: string) => Promise<void>;
  onSuccess?: () => void;
}

export interface EffortEntry {
  issueKey: string;
  timeSeconds: number;
  description: string;
  commitHashes: string[];
  order: number;
}

interface BreakTime {
  start: string;
  end: string;
}

const TIME_PRESETS = [
  { label: '30m', seconds: 30 * 60 },
  { label: '1h', seconds: 60 * 60 },
  { label: '2h', seconds: 2 * 60 * 60 },
  { label: '4h', seconds: 4 * 60 * 60 },
  { label: '8h', seconds: 8 * 60 * 60 },
];

export const EffortSubmissionModal: React.FC<EffortSubmissionModalProps> = ({
  commits,
  onClose,
  onSubmit,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('19:00');
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([{ start: '12:00', end: '13:00' }]);
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  const [isLoadingEffortTimes, setIsLoadingEffortTimes] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const savedBreaks = await (window as any).ipcRenderer.invoke('get-settings', 'breakTimes');
      if (savedBreaks && savedBreaks.length > 0) setBreakTimes(savedBreaks);

      const savedWorkStart = await (window as any).ipcRenderer.invoke('get-settings', 'workStartTime');
      if (savedWorkStart) setWorkStartTime(savedWorkStart);

      const savedWorkEnd = await (window as any).ipcRenderer.invoke('get-settings', 'workEndTime');
      if (savedWorkEnd) setWorkEndTime(savedWorkEnd);
    };
    loadSettings();
  }, []);

  // Group commits by issue key
  const issueGroups = useMemo(() => {
    const groups: Record<string, Commit[]> = {};
    commits.forEach((commit) => {
      const key = commit.issueKey || 'NO_ISSUE';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(commit);
    });
    return groups;
  }, [commits]);

  const validIssueKeys = Object.keys(issueGroups).filter((key) => key !== 'NO_ISSUE');

  // Order state - array of issue keys in order
  const [issueOrder, setIssueOrder] = useState<string[]>(validIssueKeys);

  const [effortTimes, setEffortTimes] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    validIssueKeys.forEach((key) => {
      initial[key] = 60 * 60; // Default 1 hour
    });
    return initial;
  });

  // Merge ALL commit messages with comma for description
  const [descriptions, setDescriptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.keys(issueGroups).forEach((key) => {
      if (key === 'NO_ISSUE') return;
      // Merge all commit messages, removing issue key prefix
      const messages = issueGroups[key].map((c) =>
        c.message.replace(/^[A-Z]+-\d+\s*[-:]?\s*/i, '').trim()
      );
      initial[key] = messages.join(', ');
    });
    return initial;
  });

  const hasNoIssues = 'NO_ISSUE' in issueGroups;

  // Auto-fill calculation
  const calculateAutoFill = async () => {
    if (!autoFillEnabled || validIssueKeys.length === 0) return;

    setIsLoadingEffortTimes(true);
    try {
      // Calculate available work minutes
      const startMins = timeToMinutes(workStartTime);
      const endMins = timeToMinutes(workEndTime);
      let availableMinutes = endMins - startMins;

      // Subtract break times
      for (const breakTime of breakTimes) {
        const breakStart = timeToMinutes(breakTime.start);
        const breakEnd = timeToMinutes(breakTime.end);
        // If break is within work hours
        if (breakStart >= startMins && breakEnd <= endMins) {
          availableMinutes -= (breakEnd - breakStart);
        }
      }

      // Apply random margin (1-3 hours less)
      const marginMinutes = Math.floor(Math.random() * 60) + 60; // 60-120 minutes
      const fillMinutes = Math.max(availableMinutes - marginMinutes, 60); // At least 1 hour

      // Fetch Development Effort Time for each issue (optional cap)
      const effortCaps: Record<string, number | null> = {};
      for (const issueKey of validIssueKeys) {
        try {
          const details = await (window as any).ipcRenderer.invoke('jira-get-issue-details', issueKey);
          effortCaps[issueKey] = details.developmentEffortTime;
        } catch {
          effortCaps[issueKey] = null;
        }
      }

      // Distribute time equally, capped by Development Effort Time if available
      const perIssueMinutes = Math.floor(fillMinutes / validIssueKeys.length);
      const newEffortTimes: Record<string, number> = {};

      for (const issueKey of validIssueKeys) {
        let allocatedSeconds = perIssueMinutes * 60;
        const cap = effortCaps[issueKey];
        if (cap !== null && cap > 0 && allocatedSeconds > cap) {
          allocatedSeconds = cap;
        }
        // Ensure minimum 1 minute (Tempo API requirement)
        allocatedSeconds = Math.max(allocatedSeconds, 60);
        newEffortTimes[issueKey] = allocatedSeconds;
      }

      setEffortTimes(newEffortTimes);
    } catch (error) {
      console.error('Auto-fill calculation failed:', error);
    } finally {
      setIsLoadingEffortTimes(false);
    }
  };

  // Trigger auto-fill when enabled or issue list changes
  useEffect(() => {
    if (autoFillEnabled) {
      calculateAutoFill();
    }
  }, [autoFillEnabled, validIssueKeys.length]);

  const moveIssue = (issueKey: string, direction: 'up' | 'down') => {
    const currentIndex = issueOrder.indexOf(issueKey);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= issueOrder.length) return;

    const newOrder = [...issueOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    setIssueOrder(newOrder);
  };

  const handleSubmit = async () => {
    if (issueOrder.length === 0) {
      setError('No valid issue keys found in selected commits');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const efforts: EffortEntry[] = issueOrder.map((issueKey, index) => ({
        issueKey,
        timeSeconds: effortTimes[issueKey],
        description: descriptions[issueKey],
        commitHashes: issueGroups[issueKey].map((c) => c.hash),
        order: index,
      }));

      await onSubmit(efforts, workDate, workStartTime);
      setShowConfirmation(false);
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit efforts');
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const totalSeconds = issueOrder.reduce((sum, key) => sum + (effortTimes[key] || 0), 0);

  // Calculate timeline preview
  const calculateTimeline = () => {
    let currentMinutes = timeToMinutes(workStartTime);
    const timeline: { issueKey: string; start: string; end: string }[] = [];

    for (const issueKey of issueOrder) {
      const durationMinutes = (effortTimes[issueKey] || 0) / 60;
      let endMinutes = currentMinutes + durationMinutes;

      // Check for break overlaps and skip them
      for (const breakTime of breakTimes) {
        const breakStart = timeToMinutes(breakTime.start);
        const breakEnd = timeToMinutes(breakTime.end);

        // If current time is within break, skip to end of break
        if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
          currentMinutes = breakEnd;
          endMinutes = currentMinutes + durationMinutes;
        }
        // If work would overlap break, add break duration
        else if (currentMinutes < breakStart && endMinutes > breakStart) {
          endMinutes += breakEnd - breakStart;
        }
      }

      timeline.push({
        issueKey,
        start: minutesToTime(currentMinutes),
        end: minutesToTime(endMinutes),
      });

      currentMinutes = endMinutes;
    }

    return timeline;
  };

  const timeline = calculateTimeline();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card rounded-xl animate-in"
        style={{
          width: '700px',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', margin: 0 }}>Submit Efforts</h2>
            <p className="text-secondary text-sm" style={{ marginTop: '0.25rem' }}>
              {commits.length} commit{commits.length !== 1 && 's'} → {issueOrder.length} issue
              {issueOrder.length !== 1 && 's'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Date and Time Selection */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label className="block text-xs text-secondary mb-1">
              <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Work Date
            </label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              style={{ width: '160px' }}
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">
              <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Start Time
            </label>
            <input
              type="time"
              value={workStartTime}
              onChange={(e) => setWorkStartTime(e.target.value)}
              style={{ width: '120px' }}
            />
          </div>
          <div className="flex-1 text-right">
            <span className="text-xs text-secondary">Breaks: </span>
            <span className="text-xs text-muted">
              {breakTimes.map((b) => `${b.start}-${b.end}`).join(', ')}
            </span>
          </div>
        </div>

        {/* Auto-Fill Toggle */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={() => setAutoFillEnabled(!autoFillEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: autoFillEnabled ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
              color: autoFillEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: autoFillEnabled ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <Zap size={16} />
            Auto-fill work hours
          </button>
          {autoFillEnabled && (
            <span className="text-xs text-muted">
              {isLoadingEffortTimes ? 'Calculating...' : `Filling ${formatTime(totalSeconds)} across ${validIssueKeys.length} issues`}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          {hasNoIssues && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid var(--warning)',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--warning)',
              }}
            >
              <AlertCircle size={16} />
              <span className="text-sm">
                {issueGroups['NO_ISSUE'].length} commit{issueGroups['NO_ISSUE'].length !== 1 && 's'}{' '}
                have no issue key (skipped)
              </span>
            </div>
          )}

          <p className="text-xs text-muted" style={{ marginBottom: '0.5rem' }}>
            <GripVertical size={12} style={{ display: 'inline' }} /> Drag or use arrows to reorder.
            Issues are logged sequentially in time.
          </p>

          {issueOrder.map((issueKey, index) => {
            const timelineEntry = timeline.find((t) => t.issueKey === issueKey);
            return (
              <div
                key={issueKey}
                style={{
                  padding: '1rem',
                  background: 'rgba(var(--text-primary-rgb, 255, 255, 255), 0.03)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  {/* Order controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <button
                      onClick={() => moveIssue(issueKey, 'up')}
                      disabled={index === 0}
                      style={{
                        padding: '0.125rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        color: index === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                        opacity: index === 0 ? 0.3 : 1,
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => moveIssue(issueKey, 'down')}
                      disabled={index === issueOrder.length - 1}
                      style={{
                        padding: '0.125rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: index === issueOrder.length - 1 ? 'not-allowed' : 'pointer',
                        color:
                          index === issueOrder.length - 1
                            ? 'var(--text-muted)'
                            : 'var(--text-secondary)',
                        opacity: index === issueOrder.length - 1 ? 0.3 : 1,
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <span
                    style={{
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    {issueKey}
                  </span>

                  <span className="text-secondary text-xs">
                    {issueGroups[issueKey].length} commit{issueGroups[issueKey].length !== 1 && 's'}
                  </span>

                  <span className="text-xs" style={{ marginLeft: 'auto', color: 'var(--success)' }}>
                    {timelineEntry?.start} → {timelineEntry?.end}
                  </span>
                </div>

                {/* Time Presets */}
                <div style={{ marginBottom: '0.75rem', opacity: autoFillEnabled ? 0.5 : 1, pointerEvents: autoFillEnabled ? 'none' : 'auto' }}>
                  <label className="block text-xs text-secondary mb-1">
                    Time {autoFillEnabled && <span className="text-muted">(auto-filled)</span>}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() =>
                          setEffortTimes((prev) => ({ ...prev, [issueKey]: preset.seconds }))
                        }
                        disabled={autoFillEnabled}
                        style={{
                          padding: '0.375rem 0.625rem',
                          borderRadius: '0.375rem',
                          background:
                            effortTimes[issueKey] === preset.seconds
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'var(--bg-tertiary)',
                          color:
                            effortTimes[issueKey] === preset.seconds
                              ? 'var(--accent-primary)'
                              : 'var(--text-secondary)',
                          border:
                            effortTimes[issueKey] === preset.seconds
                              ? '1px solid var(--accent-primary)'
                              : '1px solid var(--border-color)',
                          cursor: autoFillEnabled ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-secondary mb-1">Description</label>
                  <input
                    type="text"
                    value={descriptions[issueKey]}
                    onChange={(e) =>
                      setDescriptions((prev) => ({ ...prev, [issueKey]: e.target.value }))
                    }
                    style={{ width: '100%' }}
                    placeholder="Work description..."
                  />
                </div>
              </div>
            );
          })}

          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: '0.5rem',
                color: 'var(--danger)',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-secondary">Total: </span>
            <span className="font-bold text-accent">{formatTime(totalSeconds)}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ background: 'var(--bg-tertiary)' }}>
              Cancel
            </button>
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={isSubmitting || issueOrder.length === 0}
              className="primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Send size={16} />
              Submit Efforts
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onClick={() => setShowConfirmation(false)}
        >
          <div
            className="glass-card rounded-xl"
            style={{ padding: '1.5rem', maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontWeight: 700, margin: 0 }}>Confirm Submission</h3>
            </div>
            <p className="text-secondary" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              You are about to submit <strong>{issueOrder.length} worklog(s)</strong> for <strong>{workDate}</strong>:
            </p>
            <ul style={{ marginBottom: '1rem', fontSize: '0.875rem', paddingLeft: '1.25rem' }}>
              {issueOrder.map((issueKey) => (
                <li key={issueKey} style={{ marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{issueKey}</span>
                  {' — '}{formatTime(effortTimes[issueKey])}
                </li>
              ))}
            </ul>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
              Total: <strong>{formatTime(totalSeconds)}</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmation(false)} style={{ background: 'var(--bg-tertiary)' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            cursor: 'pointer',
          }}
          onClick={() => {
            onSuccess?.();
            onClose();
          }}
        >
          <div
            className="glass-card rounded-xl animate-in"
            style={{ padding: '2rem', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Success!</h3>
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
              {issueOrder.length} worklog(s) submitted successfully.
            </p>
            <button onClick={() => {
              onSuccess?.();
              onClose();
            }} className="primary" style={{ padding: '0.5rem 1.5rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
