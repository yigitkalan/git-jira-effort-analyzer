import Store from 'electron-store';



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
  const store = new Store();
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

  console.log(`[TempoService] Fetching worklogs from ${from} to ${to}`);

  let allWorklogs: any[] = [];
  let nextUrl = `${TEMPO_API_BASE}/worklogs?from=${from}&to=${to}&limit=1000`; // Maximize page size

  while (nextUrl) {
    console.log(`[TempoService] Fetching page: ${nextUrl}`);
    const response = await fetch(nextUrl, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.error(`Tempo API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Response Body:', errorText);
      throw new Error(`Tempo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const results = data.results || [];
    allWorklogs = [...allWorklogs, ...results];
    
    nextUrl = data.metadata?.next || null;
  }

  console.log(`[TempoService] Total worklogs fetched: ${allWorklogs.length}`);
  let rawWorklogs = allWorklogs;

  // Filter by current user
  try {
    const { getMyself } = await import('./jira-service');
    const myself = await getMyself();
    const myAccountId = myself.accountId;
    
    rawWorklogs = rawWorklogs.filter((wl: any) => wl.author.accountId === myAccountId);
  } catch (error) {
    console.error('Failed to filter by user:', error);
  }

  // Enrich with Issue Details (Key, Summary) from Jira
  const issueIds = rawWorklogs.map((w: any) => w.issue.id);
  
  if (issueIds.length > 0) {
    try {
      const { getIssues } = await import('./jira-service');
      const issueMap = await getIssues(issueIds);
      
      return rawWorklogs.map((wl: any) => ({
        ...wl,
        issue: {
          ...wl.issue,
          key: issueMap.get(String(wl.issue.id))?.key || 'UNKNOWN',
          summary: issueMap.get(String(wl.issue.id))?.summary || 'Unknown Issue'
        }
      }));
    } catch (error) {
      console.error('Failed to enrich worklogs with Jira issue details:', error);
      // Fallback to raw worklogs if enrichment fails, but they will lack key/summary
      return rawWorklogs;
    }
  }

  return rawWorklogs;
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
