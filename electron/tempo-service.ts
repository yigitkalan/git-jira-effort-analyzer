import Store from 'electron-store';

const store = new Store();

interface Worklog {
  id?: number;
  issueId: number;
  timeSpentSeconds: number;
  startDate: string;
  startTime: string;
  description: string;
  authorAccountId?: string;
}

interface TempoWorklogResponse {
  tempoWorklogId: number;
  issue: { id: number; key: string };
  timeSpentSeconds: number;
  startDate: string;
  startTime: string;
  description: string;
  author: { accountId: string; displayName: string };
}

const TEMPO_API_BASE = 'https://api.tempo.io/4';

function getTempoToken(): string {
  return (store.get('tempoApiToken') as string) || '';
}

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getTempoToken()}`,
    'Content-Type': 'application/json',
  };
}

export async function getWorklogs(from: string, to: string): Promise<TempoWorklogResponse[]> {
  const token = getTempoToken();
  if (!token) {
    throw new Error('Tempo API token not configured. Please set it in Settings.');
  }

  const response = await fetch(`${TEMPO_API_BASE}/worklogs?from=${from}&to=${to}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tempo API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.results || [];
}

export async function submitWorklog(worklog: Worklog): Promise<TempoWorklogResponse> {
  const token = getTempoToken();
  if (!token) {
    throw new Error('Tempo API token not configured. Please set it in Settings.');
  }

  const response = await fetch(`${TEMPO_API_BASE}/worklogs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      issueId: worklog.issueId,
      timeSpentSeconds: worklog.timeSpentSeconds,
      startDate: worklog.startDate,
      startTime: worklog.startTime,
      description: worklog.description,
      authorAccountId: worklog.authorAccountId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to submit worklog: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export async function getMyself(): Promise<{ accountId: string; displayName: string }> {
  const token = getTempoToken();
  if (!token) {
    throw new Error('Tempo API token not configured');
  }

  // Tempo doesn't have a /myself endpoint, so we'll get this from Jira
  // This function is a placeholder - we'll implement it via jira-service
  throw new Error('Use jira-service.ts to get user info');
}
