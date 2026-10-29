import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

// Plan morning-digest § 3: save one rig page as one self-contained HTML file (ADR 0001).
// Usage: tsx --env-file-if-exists=.env scripts/save-page.ts /digest/2026-10-28 var/preview/index.html
// LANE_MARKER= in front of it saves the page with "no marker set" (§ 4).
const [path, out] = process.argv.slice(2);
if (!path || !out) throw new Error('usage: save-page.ts <path> <out.html>');
const res = await createApp().request(path);
if (res.status !== 200) throw new Error(`${path} answered ${res.status}`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${path} -> ${out}`);
