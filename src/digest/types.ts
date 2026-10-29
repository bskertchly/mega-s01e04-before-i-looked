// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One job of one night: all of that job's lines folded into a row.
export type DigestRow = {
  job: string;
  owner: string | null; // from the job's last line; null renders as "—"
  runs: number; // lines for this job, retries included
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // `error` of the job's last line that had one
  firstAt: string; // `at` as written in the log: offset kept, never converted to UTC
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job; the page and the JSON both use this order
  badLines: number; // lines that didn't parse or didn't match the line shape; counted, never thrown
};

// Reads `<runsDir>/<night>.jsonl`. Returns null when the file doesn't exist or `night` isn't
// YYYY-MM-DD (routes answer 404). An empty file is a Night with no rows.
// Implemented in `src/digest/read.ts` as `export const readNight: ReadNight`.
export type ReadNight = (runsDir: string, night: string) => Night | null;
