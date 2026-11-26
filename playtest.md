# Skylark Courier — play-test log

Browser: headless Chromium (chrome-headless-shell from the Playwright cache),
1280×720 for screenshots, 800×450 for the interactive test. Served locally
with `node serve.ts`. No network requests; all assets are files under `game/`.

## Automated flight-model checks (Node, no browser)

Ran the real flight model + autopilot through every `?shot=` scene:

- `play` — Ring Run, 30 s flown: 2 rings passed, airborne at 59 m/s, no crash.
- `start` — title scene, 8 s flown: airborne at 61 m/s, no crash.
- `land` — Island Hop final approach: landed on North Point strip, damage 0.
- `end` — full ring course: all 8 rings in ~105 s, mission-complete screen,
  parked back on the home strip.

Two real bugs were found and fixed this way: the landing autopilot first
flew into a hillside (approach too low over the island slope), then floated
past the strip (the pitch dead-band let the plane level off 2 m above the
tarmac). Fixed with a flat runway plateau, a proportional pitch controller
with a flare cap, and a centreline correction against the wind.

## Interactive browser test (CDP key events)

- Title screen loads, mission cards render, HUD hidden until a mission starts.
- Press `1`: Ring Run starts on the home strip, throttle 0, fuel 100%.
- Hold `W` + `↓` (full throttle, pull up): the Skylark rotates, climbs to
  283 m (930 ft), 96 m/s (187 kt), fuel draining, HUD airspeed / altitude /
  heading / mission all updating live.
- Bank right with `→`: heading swings 008° → 033° NE; the camera follows
  without snapping.
- Console errors across every run: **0**. No failed network requests.

## Screenshots

Four JPEGs in `screenshots/`, all 1280×720 and under 256 KiB, taken as
renders of the game running (`?shot=play|start|land|end&seed=1`):

- `1-play.jpg` (cover) — chase view, plane big in frame, gold ring ahead,
  islands and blue sea, HUD legible.
- `2-start.jpg` — title screen with the three mission cards over the sea.
- `3-land.jpg` — on the runway centreline on final approach to North Point.
- `4-end.jpg` — "Ring Run complete!" with the plane parked on the home strip.

Two framing issues were found by viewing the first captures and fixed: the
sea first rendered as sand (the terrain mesh hid the ocean plane — the
seabed is now sunk below the water), and the chase camera first swept in
from far away (it now snaps behind the plane for shots and mission starts).
