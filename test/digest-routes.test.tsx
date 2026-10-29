import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (at: string, job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at, job, status, owner });

const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
writeFileSync(
  join(dir, '2026-10-01.jsonl'),
  [
    line('2026-10-02T01:00:00+01:00', 'b/job', 'ok'),
    line('2026-10-02T01:01:00+01:00', 'a/job', 'retry'),
    line('2026-10-02T01:02:00+01:00', 'a/job', 'ok'),
  ].join('\n') + '\n',
);
writeFileSync(join(dir, '2026-10-02.jsonl'), '');
writeFileSync(
  join(dir, '2026-10-03.jsonl'),
  [line('2026-10-04T01:00:00+01:00', 'good/job', 'ok'), 'not json', '{"job":1}'].join('\n') + '\n',
);

const app = createApp({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: dir,
});
const page = (n: string) => app.request(`/digest/${n}`);
const json = (n: string) => app.request(`/api/digest/${n}`);

describe('digest routes', () => {
  it('200 for a normal night, page and JSON list the same jobs in the same order', async () => {
    const [p, j] = [await page('2026-10-01'), await json('2026-10-01')];
    expect(p.status).toBe(200);
    expect(j.status).toBe(200);
    const night = (await j.json()) as Night;
    expect(night.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    const html = await p.text();
    const at = night.rows.map((r) => html.indexOf(`<td>${r.job}</td>`));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('404 for a night with no file', async () => {
    expect((await page('2026-01-01')).status).toBe(404);
    expect((await json('2026-01-01')).status).toBe(404);
  });

  it('empty night: page says nothing ran, JSON has no rows', async () => {
    const [p, j] = [await page('2026-10-02'), await json('2026-10-02')];
    expect(p.status).toBe(200);
    expect(await p.text()).toContain('nothing ran');
    expect(j.status).toBe(200);
    expect(await j.json()).toEqual({ night: '2026-10-02', rows: [], badLines: 0 });
  });

  it('bad line: still 200, counted, good rows kept, page warns', async () => {
    const [p, j] = [await page('2026-10-03'), await json('2026-10-03')];
    expect(p.status).toBe(200);
    expect(j.status).toBe(200);
    const night = (await j.json()) as Night;
    expect(night.badLines).toBe(2);
    expect(night.rows.map((r) => r.job)).toEqual(['good/job']);
    const html = await p.text();
    expect(html).toContain('2 lines could not be read');
    expect(html).toContain('<td>good/job</td>');
  });
});
