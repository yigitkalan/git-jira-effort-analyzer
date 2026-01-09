import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const readdirAsync = promisify(fs.readdir);

export interface Commit {
  hash: string;
  date: string;
  message: string;
  refs: string;
  repoName: string;
  author: string;
  issueKey: string | null;
}

export interface ScanOptions {
  rootPath: string;
  since?: string;
  until?: string;
}

// Default issue key patterns - can be extended via settings
const ISSUE_KEY_PATTERN = /\b(IMP|SJR)-\d+/gi;

function extractIssueKey(message: string): string | null {
  const matches = message.match(ISSUE_KEY_PATTERN);
  return matches ? matches[0].toUpperCase() : null;
}

export async function scanRepos(options: ScanOptions): Promise<Commit[]> {
  const { rootPath, since, until } = options;
  const results: Commit[] = [];

  try {
    const entries = await readdirAsync(rootPath, { withFileTypes: true });
    const directories = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const dir of directories) {
      const repoPath = path.join(rootPath, dir);
      const gitPath = path.join(repoPath, '.git');

      if (fs.existsSync(gitPath)) {
        try {
          // Get local author
          const { stdout: authorStdout } = await execAsync(`git -C "${repoPath}" config user.name`);
          const localAuthor = authorStdout.trim();

          if (!localAuthor) continue;

          // Build git log command
          let cmd = `git -C "${repoPath}" log --all --no-merges -i --author="${localAuthor}" --pretty=format:"%h|%ad|%s|%D" --date=short`;

          if (since) {
            cmd += ` --since="${since}"`;
          }
          if (until) {
            cmd += ` --until="${until}"`;
          }

          const { stdout: logStdout } = await execAsync(cmd);

          if (logStdout.trim()) {
            const lines = logStdout.trim().split('\n');
            lines.forEach((line) => {
              const [hash, date, message, refs] = line.split('|');
              results.push({
                hash,
                date,
                message,
                refs: refs || '',
                repoName: dir,
                author: localAuthor,
                issueKey: extractIssueKey(message),
              });
            });
          }
        } catch (err) {
          console.error(`Error processing repo ${dir}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error scanning directories:', err);
    throw err;
  }

  return results;
}
