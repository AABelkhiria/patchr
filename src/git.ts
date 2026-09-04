import { execFile } from 'child_process';

const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

/**
 * Runs a git command and resolves with its stdout. Rejects with stderr (or the error
 * message) when git exits with a non-zero status.
 */
export function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd, maxBuffer: MAX_OUTPUT_BYTES },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout);
      }
    );
  });
}
