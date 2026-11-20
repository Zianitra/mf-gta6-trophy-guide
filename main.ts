// Entry point for the gta6-trophy-guide-01 submission (Node 22, standard library only).
//
// This program packages the guide — a static site living in app/ (ES modules, CSS, no build
// step) served locally at app/index.html — into the shape the make.fun scorer expects. It does
// so by copying app/ and screenshots/ from beside this file to /output, then writing
// /output/dossier.json via the vendored make.fun library: the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source).
//
// The guide is offline by design: it loads nothing over the network, and its trophy list and
// guides come from app/data/trophies.json. Leave vendor/makefun-frontend.ts as it is — the
// scorer requires dossier.json to be byte-for-byte what its own copy writes.
//
// This is only the plumbing, not a winner: it ships a plain checklist of the 55 trophies with a
// one-line hint each. To make a real entry, write a guide for every trophy in your own words, a
// roadmap to the platinum, filters and a spoiler setting in app/, and put 3 or 4 PNG/JPEG
// screenshots of it in screenshots/ (the first by name is the cover; shots.json says which views
// this starter's were taken of), then run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
