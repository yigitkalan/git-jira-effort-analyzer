import Store from 'electron-store';




function getCredentials(): { baseUrl: string; email: string; token: string } {
  const store = new Store();
  let baseUrl = (store.get('jiraBaseUrl') as string) || '';
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }
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
  const auth = Buffer.from(authString, 'utf-8').toString('base64');

  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Atlassian-Token': 'no-check'
  };
}

export async function getIssueId(issueKey: string): Promise<string> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured');
  }

  const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=id`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get issue ID for ${issueKey}: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

export async function getIssues(issueIds: string[]): Promise<Map<string, { key: string; summary: string }>> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured');
  }

  const uniqueIds = [...new Set(issueIds)];
  const issueMap = new Map<string, { key: string; summary: string }>();

  if (uniqueIds.length === 0) return issueMap;

  // JQL: id in (1, 2, 3)
  const jql = `id in (${uniqueIds.join(',')})`;

  const searchResponse = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      jql,
      fields: ['key', 'summary']
    })
  });

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    for (const issue of searchData.issues) {
      issueMap.set(issue.id, { key: issue.key, summary: issue.fields.summary });
    }
  } else {
    console.error(`[JiraService] Search failed: ${searchResponse.status}`);
    const text = await searchResponse.text();
    console.error(`[JiraService] Error body: ${text}`);
  }
  return issueMap;
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

  const response = await fetch(`${baseUrl}/rest/api/2/myself`, { headers: getHeaders() });

  if (!response.ok) {
    console.error(`Jira API Error: ${response.status} ${response.statusText}`);
    console.error('Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    const errorText = await response.text();
    console.error('Response Body:', errorText);
    throw new Error(`Jira API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Fetches "Development Effort Time" (customfield_13397) value for an issue.
 * Returns null if field is missing or not found (graceful handling).
 */
export async function getIssueDetails(issueKey: string): Promise<{ developmentEffortTime: number | null }> {
  const { baseUrl } = getCredentials();

  if (!baseUrl) {
    throw new Error('Jira Base URL not configured');
  }

  try {
    // Fetch the specific custom field for Development Effort Time
    const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}?fields=customfield_13397`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.warn(`[JiraService] Failed to get issue details for ${issueKey}: ${response.status}`);
      return { developmentEffortTime: null };
    }

    const data = await response.json();
    const fields = data.fields || {};

    // customfield_13397 is "Development Effort Time" - value is in HOURS
    const effortTimeHours = fields.customfield_13397;

    if (effortTimeHours !== null && effortTimeHours !== undefined && typeof effortTimeHours === 'number') {
      // Convert hours to seconds
      return { developmentEffortTime: effortTimeHours * 3600 };
    }

    return { developmentEffortTime: null };
  } catch (error) {
    console.error(`[JiraService] Error fetching issue details for ${issueKey}:`, error);
    return { developmentEffortTime: null };
  }
}
