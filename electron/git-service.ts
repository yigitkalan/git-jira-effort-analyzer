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
  issueDetectionMode?: 'commit' | 'branch';
  issuePatterns?: string[];
}

function extractIssueKey(text: string, patterns: string[] = ['IMP', 'SJR']): string | null {
  if (!patterns || patterns.length === 0) patterns = ['IMP', 'SJR'];
  // Escape patterns to be safe in regex
  const safePatterns = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const patternString = `\\b(${safePatterns.join('|')})-\\d+`;
  const regex = new RegExp(patternString, 'gi');
  const matches = text.match(regex);
  return matches ? matches[0].toUpperCase() : null;
}

export async function scanRepos(options: ScanOptions): Promise<Commit[]> {
  const { rootPath, since, until, issueDetectionMode = 'commit', issuePatterns } = options;
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
            
            // Process lines sequentially to handle async branch detection
            for (const line of lines) {
              const [hash, date, message, refs] = line.split('|');
              let issueKey: string | null = null;

              if (issueDetectionMode === 'branch') {
                try {
                  // Find the branch name that contains this commit
                  // --refs="refs/heads/*" limits to local branches
                  const { stdout: branchStdout } = await execAsync(
                    `git -C "${repoPath}" name-rev --name-only --refs="refs/heads/*" ${hash}`
                  );
                  const branchName = branchStdout.trim();
                  // Remove generation suffix (e.g. ~2) to get the base branch name
                  const cleanBranchName = branchName.replace(/[~^]\d+$/, '');
                  issueKey = extractIssueKey(cleanBranchName, issuePatterns);
                } catch (e) {
                  // Fallback or ignore if branch detection fails
                  console.warn(`Failed to detect branch for commit ${hash}`, e);
                }
              }

              // Fallback to commit message if branch detection didn't find anything or mode is 'commit'
              if (!issueKey) {
                issueKey = extractIssueKey(message, issuePatterns);
              }

              results.push({
                hash,
                date,
                message,
                refs: refs || '',
                repoName: dir,
                author: localAuthor,
                issueKey,
              });
            }
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
