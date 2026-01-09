import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor, Plus, X, Clock } from 'lucide-react';

interface BreakTime {
  start: string;
  end: string;
}

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Jira settings
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [issuePatterns, setIssuePatterns] = useState('IMP,SJR');
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([{ start: '12:00', end: '13:00' }]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedJiraUrl = await (window as any).ipcRenderer.invoke('get-settings', 'jiraBaseUrl');
      if (savedJiraUrl) setJiraBaseUrl(savedJiraUrl);

      const savedJiraEmail = await (window as any).ipcRenderer.invoke('get-settings', 'jiraEmail');
      if (savedJiraEmail) setJiraEmail(savedJiraEmail);

      const savedJiraToken = await (window as any).ipcRenderer.invoke(
        'get-settings',
        'jiraApiToken'
      );
      if (savedJiraToken) setJiraApiToken(savedJiraToken);

      const savedPatterns = await (window as any).ipcRenderer.invoke(
        'get-settings',
        'issuePatterns'
      );
      if (savedPatterns) setIssuePatterns(savedPatterns);

      const savedBreakTimes = await (window as any).ipcRenderer.invoke(
        'get-settings',
        'breakTimes'
      );
      if (savedBreakTimes) setBreakTimes(savedBreakTimes);
    };
    loadSettings();
  }, []);

  // Save handlers
  const saveJiraBaseUrl = (value: string) => {
    setJiraBaseUrl(value);
    (window as any).ipcRenderer.invoke('save-settings', 'jiraBaseUrl', value);
  };

  const saveJiraEmail = (value: string) => {
    setJiraEmail(value);
    (window as any).ipcRenderer.invoke('save-settings', 'jiraEmail', value);
  };

  const saveJiraApiToken = (value: string) => {
    setJiraApiToken(value);
    (window as any).ipcRenderer.invoke('save-settings', 'jiraApiToken', value);
  };

  const saveIssuePatterns = (value: string) => {
    setIssuePatterns(value);
    (window as any).ipcRenderer.invoke('save-settings', 'issuePatterns', value);
  };

  const addBreakTime = () => {
    const newBreakTimes = [...breakTimes, { start: '12:00', end: '13:00' }];
    setBreakTimes(newBreakTimes);
    (window as any).ipcRenderer.invoke('save-settings', 'breakTimes', newBreakTimes);
  };

  const removeBreakTime = (index: number) => {
    const newBreakTimes = breakTimes.filter((_, i) => i !== index);
    setBreakTimes(newBreakTimes);
    (window as any).ipcRenderer.invoke('save-settings', 'breakTimes', newBreakTimes);
  };

  const updateBreakTime = (index: number, field: 'start' | 'end', value: string) => {
    const newBreakTimes = [...breakTimes];
    newBreakTimes[index][field] = value;
    setBreakTimes(newBreakTimes);
    (window as any).ipcRenderer.invoke('save-settings', 'breakTimes', newBreakTimes);
  };

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto animate-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-secondary text-sm">Configure your application preferences</p>
      </div>

      {/* Appearance Section */}
      <div className="glass-card p-6 rounded-xl flex flex-col gap-4">
        <label className="block text-xs font-medium text-secondary uppercase tracking-wider">
          Appearance
        </label>
        <div className="flex gap-3">
          <ThemeButton
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={<Sun size={18} />}
            label="Light"
          />
          <ThemeButton
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={<Moon size={18} />}
            label="Dark"
          />
          <ThemeButton
            active={theme === 'system'}
            onClick={() => setTheme('system')}
            icon={<Monitor size={18} />}
            label="System"
          />
        </div>
      </div>

      {/* Jira Integration Section */}
      <div className="glass-card p-6 rounded-xl flex flex-col gap-4">
        <label className="block text-xs font-medium text-secondary uppercase tracking-wider">
          Jira Integration
        </label>

        <div>
          <label className="block text-xs text-secondary mb-1">Jira Base URL</label>
          <input
            type="text"
            value={jiraBaseUrl}
            onChange={(e) => saveJiraBaseUrl(e.target.value)}
            placeholder="https://yourcompany.atlassian.net"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label className="block text-xs text-secondary mb-1">Jira Email</label>
          <input
            type="email"
            value={jiraEmail}
            onChange={(e) => saveJiraEmail(e.target.value)}
            placeholder="your.email@company.com"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label className="block text-xs text-secondary mb-1">Jira API Token</label>
          <input
            type="password"
            value={jiraApiToken}
            onChange={(e) => saveJiraApiToken(e.target.value)}
            placeholder="Enter your Jira API token"
            style={{ width: '100%' }}
          />
          <p className="text-xs text-muted mt-1">
            Generate from id.atlassian.com {'>'} Security {'>'} API tokens
          </p>
        </div>

        <div>
          <label className="block text-xs text-secondary mb-1">
            Issue Key Patterns (comma-separated)
          </label>
          <input
            type="text"
            value={issuePatterns}
            onChange={(e) => saveIssuePatterns(e.target.value)}
            placeholder="IMP,SJR"
            style={{ width: '100%' }}
          />
          <p className="text-xs text-muted mt-1">
            Prefixes for issue keys in commit messages (e.g., IMP-123)
          </p>
        </div>
      </div>

      {/* Break Times Section */}
      <div className="glass-card p-6 rounded-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-secondary uppercase tracking-wider">
            Break Times
          </label>
          <button
            onClick={addBreakTime}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
            }}
          >
            <Plus size={14} />
            Add Break
          </button>
        </div>

        <p className="text-xs text-muted">
          Break times will be excluded when calculating work durations
        </p>

        {breakTimes.map((breakTime, index) => (
          <div key={index} className="flex items-center gap-3">
            <Clock size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="time"
              value={breakTime.start}
              onChange={(e) => updateBreakTime(index, 'start', e.target.value)}
              style={{ width: '120px' }}
            />
            <span className="text-secondary">to</span>
            <input
              type="time"
              value={breakTime.end}
              onChange={(e) => updateBreakTime(index, 'end', e.target.value)}
              style={{ width: '120px' }}
            />
            {breakTimes.length > 1 && (
              <button
                onClick={() => removeBreakTime(index)}
                style={{
                  padding: '0.375rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.375rem',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ThemeButton: React.FC<ThemeButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
      active
        ? 'bg-blue-500/10 border-blue-500/50 text-accent'
        : 'bg-secondary/30 border-color hover:border-hover text-secondary'
    }`}
    style={{
      background: active ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.3)',
      borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    }}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);
