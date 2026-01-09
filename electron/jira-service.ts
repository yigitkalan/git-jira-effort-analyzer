import Store from 'electron-store';

const store = new Store();

interface JiraWorklogInput {
  issueKey: string;
  timeSpentSeconds: number;
  startDate: string;
  startTime: string;
  description: string;
}

interface JiraWorklog {
  id: string;
  issueId: string;
  timeSpentSeconds: number;
  started: string;
  comment?: { content: any[] };
  author: { accountId: string; displayName: string };
}

function getCredentials(): { baseUrl: string; email: string; token: string } {
  const baseUrl = (store.get('jiraBaseUrl') as string) || '';
  const email = (store.get('jiraEmail') as string) || '';
  const token = (store.get('jiraApiToken') as string) || '';
  return { baseUrl, email, token };
}

function getHeaders(): HeadersInit {
  const { email, token } = getCredentials();

  // Trim inputs to avoid whitespace issues
  const cleanEmail = email.trim();
  const cleanToken = token.trim();

  if (!cleanEmail || !cleanToken) {
    console.error('Missing Jira credentials:', { hasEmail: !!cleanEmail, hasToken: !!cleanToken });
  }

  // Jira Cloud uses Basic auth with email:token
  const authString = `${cleanEmail}:${cleanToken}`;
  const auth = Buffer.from(authString).toString('base64');

  // Debug log (masked)
  console.log(`Constructing Auth Header for: ${cleanEmail}`);
  console.log(`Token length: ${cleanToken.length}`);
  console.log(`Auth string length: ${authString.length}`);
  console.log(`Encoded auth length: ${auth.length}`);

  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function submitWorklog(worklog: JiraWorklogInput): Promise<JiraWorklog> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured. Please set it in Settings.');
  }

  // Format: 2024-01-09T09:00:00.000+0000
  const started = `${worklog.startDate}T${worklog.startTime}.000+0000`;

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${worklog.issueKey}/worklog`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      timeSpentSeconds: worklog.timeSpentSeconds,
      started: started,
      comment: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: worklog.description || 'Work logged via Git Effort Analyzer',
              },
            ],
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Jira API error:', errorText);
    throw new Error(`Failed to submit worklog: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export async function getWorklogs(issueKey: string): Promise<JiraWorklog[]> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured');
  }

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/worklog`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get worklogs: ${response.status}`);
  }

  const data = await response.json();
  return data.worklogs || [];
}

export async function getMyWorklogs(from: string, to: string): Promise<any[]> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured');
  }

  // Get current user's account ID first to ensure JQL works correctly
  const myself = await getMyself();
  const accountId = myself.accountId;
  console.log('Searching worklogs for accountId:', accountId);

  // Use JQL to search for issues with worklogs in date range
  const jql = `worklogDate >= "${from}" AND worklogDate <= "${to}" AND worklogAuthor = "${accountId}"`;

  const response = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      jql,
      fields: ['key', 'summary', 'worklog'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search worklogs: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Full Jira Response:', JSON.stringify(data, null, 2));

  // Extract worklogs from each issue
  const worklogs: any[] = [];
  for (const issue of data.issues || []) {
    if (issue.fields?.worklog?.worklogs) {
      console.log(
        `Checking issue ${issue.key} with ${issue.fields.worklog.worklogs.length} worklogs`
      );
      for (const wl of issue.fields.worklog.worklogs) {
        // Filter by date range and author manually to be safe
        const wlDate = wl.started.split('T')[0];
        if (wlDate >= from && wlDate <= to) {
          worklogs.push({
            ...wl,
            issue: { key: issue.key, summary: issue.fields.summary },
          });
        }
      }
    } else {
      console.log(`Issue ${issue.key} has no worklogs in search response`);
    }
  }

  console.log('Final filtered worklogs:', worklogs.length);
  return worklogs;
}

export async function getMyself(): Promise<{
  accountId: string;
  displayName: string;
  emailAddress: string;
}> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured');
  }

  const response = await fetch(`${baseUrl}/rest/api/3/myself`, { headers: getHeaders() });

  if (!response.ok) {
    throw new Error(`Jira API error: ${response.status}`);
  }

  return await response.json();
}
