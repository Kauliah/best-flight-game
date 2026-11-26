// Skylark Courier — the program that hands this entry in (Node 22, stdlib only).
//
// It copies the game's static files and the maker's screenshots from beside
// this file into /output (or MAKEFUN_OUTPUT_DIR outside the grader), then
// writes /output/dossier.json with the kit's buildDossier library, so the
// judge reads exactly the files in this repository. No network, no installs,
// no work beyond copying and summarising.
//
// Check it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps: the text budget shapes the dossier's bytes, the rest
// refuse an entry the scorer would refuse anyway (too many screenshots, a
// screenshot over 256 KiB, a game over 993 files or 48 MiB, a game path over
// 1000 bytes). game/, screenshots/ and dossier.json share /output's own
// 1000-entry cap, so the game leaves them room.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
