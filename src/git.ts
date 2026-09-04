import { execFile } from 'child_process';

const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

interface RunGitOptions {
  /** Exit codes treated as success besides 0 (e.g. `diff --no-index` exits 1 on differences). */
  okExitCodes?: number[];
}

/**
 * Runs a git command and resolves with its stdout. Rejects with stderr (or the error
 * message) when git exits with a status that is not 0 or listed in `okExitCodes`.
 */
export function runGit(
  args: string[],
  cwd: string,
  options: RunGitOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd, maxBuffer: MAX_OUTPUT_BYTES },
      (error, stdout, stderr) => {
        if (error && !(options.okExitCodes ?? []).includes(error.code as number)) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

/** Lists untracked, non-ignored files under `pathspec` (or the whole repo), repo-relative. */
export async function listUntrackedFiles(cwd: string, pathspec: string[] = []): Promise<string[]> {
  const out = await runGit(
    ['ls-files', '--others', '--exclude-standard', '-z', '--', ...pathspec],
    cwd
  );
  return out.split('\0').filter((p) => p.length > 0);
}

/** Produces a "new file" diff for an untracked file so it can be applied like any other hunk. */
export function diffUntrackedFile(cwd: string, file: string, flags: string[]): Promise<string> {
  return runGit(['diff', '--no-index', ...flags, '--', '/dev/null', file], cwd, {
    okExitCodes: [1],
  });
}
