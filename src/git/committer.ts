import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as core from '@actions/core';

const execAsync = promisify(exec);

export function getFileSha256(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function getContentSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export interface WriteResult {
  filePath: string;
  written: boolean;
  reason: 'created' | 'updated' | 'unchanged';
}

/**
 * Writes SVG content to file only if changed, creating parent directories.
 */
export function writeSvgIfChanged(filePath: string, content: string): WriteResult {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const newHash = getContentSha256(content);
  const oldHash = getFileSha256(filePath);

  if (oldHash && oldHash === newHash) {
    return { filePath, written: false, reason: 'unchanged' };
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return {
    filePath,
    written: true,
    reason: oldHash ? 'updated' : 'created'
  };
}

/**
 * Automatically commits and pushes changed SVG files safely.
 */
export async function autoCommitFiles(
  files: string[],
  commitMessage: string
): Promise<boolean> {
  const filesToCommit = files.filter(f => fs.existsSync(f));
  if (filesToCommit.length === 0) return false;

  try {
    // Check if git status has any modified files among our targets
    const { stdout: statusOut } = await execAsync('git status --porcelain');
    const hasChanges = filesToCommit.some(f => statusOut.includes(path.basename(f)));

    if (!hasChanges) {
      core.info('No changes detected in generated assets. Skipping Git commit.');
      return false;
    }

    core.info('Committing updated visualizations to repository...');

    // Set git user info for GitHub Actions bot
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');

    for (const f of filesToCommit) {
      await execAsync(`git add "${f}"`);
    }

    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    await execAsync('git push');

    core.info('Successfully committed and pushed updated visual assets.');
    return true;
  } catch (error: any) {
    core.warning(
      `Automatic Git commit/push encountered an issue: ${error.message}. ` +
      `Ensure "contents: write" permission is granted in your GitHub Actions workflow.`
    );
    return false;
  }
}
