import { TIMESHEET_LIMITS } from '@/types';
import type { WorkType } from '@/types';

/** One Jira ticket, shaped for the timesheet "Add from Jira" picker. */
export interface JiraTicket {
  key: string;
  title: string;
  project: string;
  type: string;
  status: string;
  url: string;
  /** Ready-to-use Task/Activity text: "KEY – title. short description" (never longer than the task limit). */
  taskText: string;
  /** Work type picked from the ticket type, or null when the type is not in the table (the person chooses). */
  workType: WorkType | null;
  updated: string;
}

export type JiraErrorCode = 'not_configured' | 'auth' | 'unreachable' | 'failed';

/** Errors carry a message that is safe to show: it never contains the token or Jira's raw answer. */
export class JiraError extends Error {
  code: JiraErrorCode;
  constructor(code: JiraErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// Jira ticket type -> timesheet work type (anything not listed leaves the work type for the person to choose)
const TYPE_TO_WORK_TYPE: Record<string, WorkType> = {
  bug: 'Bugfix / Troubleshooting',
  task: 'Development',
  story: 'Development',
  'sub-task': 'Development',
  epic: 'Development',
  release: 'Deploy / Release',
  idea: 'Research / Analysis',
};

const SNIPPET_LENGTH = 120;
/** The most tickets one request returns, and the time windows (in days) the picker can ask for */
export const JIRA_MAX_TICKETS = 100;
export const JIRA_WINDOWS = [30, 90] as const;
export type JiraWindow = typeof JIRA_WINDOWS[number];
const TIMEOUT_MS = 8000;

function getConfig() {
  const baseUrl = (process.env.JIRA_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const email = (process.env.JIRA_EMAIL ?? '').trim();
  const token = (process.env.JIRA_API_TOKEN ?? '').trim();
  if (!baseUrl.startsWith('https://') || !email || !token) return null;
  return { baseUrl, email, token };
}

export function isJiraConfigured() {
  return getConfig() !== null;
}

// Jira writes descriptions in its own block format (Atlassian Document Format). This turns it into
// plain-text blocks, one per paragraph / heading / list item, so the first block can be judged on its own.
type AdfNode = { type?: string; text?: string; content?: AdfNode[] };
// taskItem / decisionItem are the lines of a Jira checklist or decision list: their text sits directly inside them
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote', 'tableCell', 'tableHeader', 'taskItem', 'decisionItem']);

function adfBlocks(node: AdfNode | undefined, out: string[] = []): string[] {
  if (!node) return out;
  if (node.type && BLOCK_TYPES.has(node.type)) {
    const text = adfInlineText(node).replace(/\s+/g, ' ').trim();
    out.push(text);
    // A list item or block quote can hold nested blocks: only the top block's own text is taken above
    return out;
  }
  for (const child of node.content ?? []) adfBlocks(child, out);
  return out;
}

function adfInlineText(node: AdfNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return ' ';
  return (node.content ?? []).map(adfInlineText).join('');
}

/**
 * A short, clean version of the description, or '' when it does not read well. It is skipped (the task
 * text is then just "KEY – title") when the first block is only a label ("Regression sheet link:"),
 * only a link, or too short to say anything.
 */
export function shortDescription(description: unknown): string {
  if (!description || typeof description !== 'object') return '';
  const blocks = adfBlocks(description as AdfNode).filter(b => b.length > 0);
  const first = blocks[0];
  if (!first) return '';
  if (first.length < 15) return '';
  if (/[:：]$/.test(first)) return '';
  if (/^https?:\/\//i.test(first) || /^\S+$/.test(first)) return '';
  if (first.length <= SNIPPET_LENGTH) return first;
  const cut = first.slice(0, SNIPPET_LENGTH).replace(/\s+\S*$/, '').replace(/[\s,;:.\-–]+$/, '');
  return cut ? `${cut}…` : '';
}

/** "KEY – title. short description", never longer than the Task/Activity limit. */
export function buildTaskText(key: string, title: string, snippet: string): string {
  const limit = TIMESHEET_LIMITS.task;
  let text = `${key} – ${title.replace(/\s+/g, ' ').trim()}`;
  if (snippet) {
    const joiner = /[.!?…]$/.test(text) ? ' ' : '. ';
    text = `${text}${joiner}${snippet}`;
  }
  if (text.length > limit) text = `${text.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`;
  return text;
}

interface JiraSearchIssue {
  key: string;
  fields: {
    summary?: string;
    description?: unknown;
    issuetype?: { name?: string };
    project?: { name?: string };
    status?: { name?: string };
    updated?: string;
  };
}

/**
 * The tickets assigned to one person that were updated in the last 30 (or 90) days, most recently updated
 * first. Read-only: this only ever asks Jira questions, it never changes anything in Jira.
 */
export async function getAssignedTickets(accountId: string, days: JiraWindow = 30): Promise<JiraTicket[]> {
  const config = getConfig();
  if (!config) throw new JiraError('not_configured', 'Jira is not set up on this portal yet.');

  // The id goes inside a Jira search query, so only the characters a Jira account id really uses are allowed
  if (!/^[A-Za-z0-9:_-]{5,128}$/.test(accountId)) {
    throw new JiraError('failed', 'This account has an invalid Jira id.');
  }

  // Only the two known window sizes are ever put into the query
  const windowDays = days === 90 ? 90 : 30;
  const jql = `assignee = "${accountId}" AND updated >= -${windowDays}d ORDER BY updated DESC`;
  const fields = 'summary,description,issuetype,project,status,updated';
  const url = `${config.baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=${JIRA_MAX_TICKETS}`;
  const auth = Buffer.from(`${config.email}:${config.token}`).toString('base64');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    throw new JiraError('unreachable', 'Could not reach Jira. Please try again in a moment, or type the entry yourself.');
  } finally {
    clearTimeout(timer);
  }

  // For a wrong or expired key Jira's search does not always answer 401: it can answer "200, no tickets"
  // and only say so in this header. Without this check an expired key would look like "no tickets".
  const loginReason = res.headers.get('x-seraph-loginreason') ?? '';
  if (res.status === 401 || res.status === 403 || /AUTHENTICATED_FAILED|AUTHENTICATION_DENIED/i.test(loginReason)) {
    throw new JiraError('auth', 'Jira did not accept the portal\'s login. The access key may have expired.');
  }
  if (!res.ok) {
    throw new JiraError('failed', 'Jira could not give the tickets right now.');
  }

  let data: { issues?: JiraSearchIssue[] };
  try {
    data = await res.json();
  } catch {
    throw new JiraError('failed', 'Jira could not give the tickets right now.');
  }

  return (data.issues ?? []).map(issue => {
    const f = issue.fields ?? {};
    const title = (f.summary ?? '').trim();
    const type = f.issuetype?.name ?? '';
    return {
      key: issue.key,
      title,
      project: f.project?.name ?? '',
      type,
      status: f.status?.name ?? '',
      url: `${config.baseUrl}/browse/${issue.key}`,
      taskText: buildTaskText(issue.key, title, shortDescription(f.description)),
      workType: TYPE_TO_WORK_TYPE[type.toLowerCase()] ?? null,
      updated: f.updated ?? '',
    };
  });
}
