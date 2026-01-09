import React, { useMemo, useState, useEffect } from 'react';
import { Commit } from '../types';
import {
  GitBranch,
  Clock,
  FolderGit,
  User,
  Hash,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Square,
  CheckSquare,
  Send,
} from 'lucide-react';
import { EffortSubmissionModal, EffortEntry } from './EffortSubmissionModal';

interface RepoListProps {
  commits: Commit[];
}

export const RepoList: React.FC<RepoListProps> = ({ commits }) => {
  const [collapsedRepos, setCollapsedRepos] = useState<Record<string, boolean>>({});
  const [jiraBaseUrl, setJiraBaseUrl] = useState('https://yourcompany.atlassian.net');
  const [selectedCommits, setSelectedCommits] = useState<Set<string>>(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const savedUrl = await (window as any).ipcRenderer.invoke('get-settings', 'jiraBaseUrl');
      if (savedUrl) setJiraBaseUrl(savedUrl);
    };
    loadSettings();
  }, []);

  const openJiraIssue = (issueKey: string) => {
    (window as any).ipcRenderer.invoke('open-external', `${jiraBaseUrl}/browse/${issueKey}`);
  };

  const toggleCommitSelection = (hash: string) => {
    setSelectedCommits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(hash)) {
        newSet.delete(hash);
      } else {
        newSet.add(hash);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedCommits(new Set());
  };

  const getSelectedCommitObjects = (): Commit[] => {
    return commits.filter((c) => selectedCommits.has(c.hash));
  };

  const handleSubmitEfforts = async (
    efforts: EffortEntry[],
    workDate: string,
    workStartTime: string
  ) => {
    // Load break times for timeline calculation
    const breakTimes =
      (await (window as any).ipcRenderer.invoke('get-settings', 'breakTimes')) || [];

    // Sort efforts by order
    const sortedEfforts = [...efforts].sort((a, b) => a.order - b.order);

    // Calculate start times for each effort
    let currentMinutes = timeToMinutes(workStartTime);

    for (const effort of sortedEfforts) {
      try {
        // Skip breaks
        for (const breakTime of breakTimes) {
          const breakStart = timeToMinutes(breakTime.start);
          const breakEnd = timeToMinutes(breakTime.end);
          if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
            currentMinutes = breakEnd;
          }
        }

        const startTimeStr = minutesToTime(currentMinutes);

        // 1. Resolve Issue Key to ID (Tempo requires numeric ID)
        const issueId = await (window as any).ipcRenderer.invoke('jira-get-issue-id', effort.issueKey);

        // 2. Submit worklog to Tempo
        await (window as any).ipcRenderer.invoke('tempo-submit-worklog', {
          issueId: parseInt(issueId, 10),
          timeSpentSeconds: effort.timeSeconds,
          startDate: workDate,
          startTime: startTimeStr + ':00',
          description: effort.description,
          authorAccountId: await (window as any).ipcRenderer.invoke('jira-get-myself').then((u: any) => u.accountId)
        });

        // Move current time forward
        currentMinutes += effort.timeSeconds / 60;
      } catch (error: any) {
        throw new Error(`Failed to submit ${effort.issueKey}: ${error.message}`);
      }
    }
    clearSelection();
  };

  // Helper functions for time calculation
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const groupedCommits = useMemo(() => {
    const groups: Record<string, Commit[]> = {};
    commits.forEach((commit) => {
      if (!groups[commit.repoName]) {
        groups[commit.repoName] = [];
      }
      groups[commit.repoName].push(commit);
    });
    return groups;
  }, [commits]);

  const repoNames = Object.keys(groupedCommits).sort();

  const toggleRepo = (repoName: string) => {
    setCollapsedRepos((prev) => ({
      ...prev,
      [repoName]: !prev[repoName],
    }));
  };

  if (commits.length === 0) {
    return (
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
          <FolderGit size={48} />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">No activity found</p>
          <p className="text-sm">Select a directory and scan to see your git history</p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedCommits.size;
  const allSelected = selectedCount === commits.length && commits.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < commits.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCommits(new Set());
    } else {
      setSelectedCommits(new Set(commits.map(c => c.hash)));
    }
  };

  return (
    <>
      <div className="flex-1 overflow-auto px-6 pb-6">
        {/* Selection Action Bar - Always show if commits exist */}
        {commits.length > 0 && (
          <div
            className="glass-card rounded-xl mb-4 animate-in"
            style={{
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Select All Checkbox */}
              <button
                onClick={toggleSelectAll}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: allSelected ? 'var(--accent-primary)' : someSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'color 0.15s ease',
                }}
              >
                {allSelected ? <CheckSquare size={18} /> : someSelected ? <CheckSquare size={18} style={{ opacity: 0.5 }} /> : <Square size={18} />}
              </button>
              <span className="text-sm">
                {selectedCount > 0 ? (
                  <>
                    <span className="font-bold text-accent">{selectedCount}</span> of {commits.length} selected
                  </>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Select commits to submit</span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedCount > 0 && (
                <>
                  <button
                    onClick={clearSelection}
                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="primary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <Send size={14} />
                    Submit Efforts
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Column layout for repositories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {repoNames.map((repoName, index) => {
            const isCollapsed = collapsedRepos[repoName];
            return (
              <div
                key={repoName}
                className="glass-card rounded-xl overflow-hidden animate-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Repository Header */}
                <div
                  onClick={() => toggleRepo(repoName)}
                  style={{
                    background: 'rgba(var(--text-primary-rgb, 255, 255, 255), 0.03)',
                    padding: '1rem 1.25rem',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'rgba(var(--text-primary-rgb, 255, 255, 255), 0.06)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      'rgba(var(--text-primary-rgb, 255, 255, 255), 0.03)')
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        borderRadius: '0.5rem',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <FolderGit size={20} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          margin: 0,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {repoName}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          marginTop: '0.125rem',
                        }}
                      >
                        <span
                          style={{
                            width: '0.5rem',
                            height: '0.5rem',
                            borderRadius: '9999px',
                            background: 'var(--success)',
                          }}
                        ></span>
                        {groupedCommits[repoName].length} commit
                        {groupedCommits[repoName].length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        background: 'rgba(0, 0, 0, 0.1)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <User size={12} />
                      {groupedCommits[repoName][0].author}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Commits List */}
                {!isCollapsed && (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {groupedCommits[repoName].map((commit, commitIndex) => {
                      const isSelected = selectedCommits.has(commit.hash);
                      return (
                        <div
                          key={commit.hash}
                          style={{
                            padding: '1rem 1.25rem',
                            borderTop: commitIndex > 0 ? '1px solid var(--border-color)' : 'none',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'flex-start',
                            transition: 'background 0.15s ease',
                            background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.background =
                                'rgba(var(--text-primary-rgb, 255, 255, 255), 0.02)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {/* Selection Checkbox */}
                          <button
                            onClick={() => toggleCommitSelection(commit.hash)}
                            style={{
                              padding: '0.25rem',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                              transition: 'color 0.15s ease',
                            }}
                          >
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>

                          {/* Commit Hash with Icon */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              color: 'var(--accent-primary)',
                              minWidth: '80px',
                              paddingTop: '0.125rem',
                            }}
                          >
                            <Hash size={12} style={{ opacity: 0.7 }} />
                            <span>{commit.hash}</span>
                          </div>

                          {/* Commit Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Commit Message */}
                            <div
                              style={{
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                color: 'var(--text-primary)',
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                              }}
                            >
                              {commit.message}
                            </div>

                            {/* Metadata Row */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                marginTop: '0.5rem',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {/* Date */}
                              <span
                                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                              >
                                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                {commit.date}
                              </span>

                              {/* Branch/Refs */}
                              {commit.refs && (
                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    color: 'var(--warning)',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '9999px',
                                    border: '1px solid var(--border-color)',
                                  }}
                                >
                                  <GitBranch size={10} />
                                  {commit.refs}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Issue Key Badge */}
                          {commit.issueKey && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openJiraIssue(commit.issueKey!);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.375rem 0.75rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                              }}
                            >
                              {commit.issueKey}
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Effort Submission Modal */}
      {showSubmitModal && (
        <EffortSubmissionModal
          commits={getSelectedCommitObjects()}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={handleSubmitEfforts}
        />
      )}
    </>
  );
};
