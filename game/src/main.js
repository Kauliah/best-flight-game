// Skylark Courier — boot and the one loop.
// Screens: title (pick a mission), play, paused, mission complete, flight over.
// ?seed=N fixes the archipelago. ?shot=start|play|land|end (with &seed=N) stages
// that scene instead of running the loop, paints it, and sets window.__shotReady
// for a screenshot.

import { STEP, MISSIONS, MISSION_ORDER, SCORE, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createTerrain } from './terrain.js';
import { createFlight } from './flight.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const terrain = createTerrain(seed);
// The renderer is built per mission: the storm courier gets its dark sky,
// rain and grey clouds, the other missions the fair-weather blue.
let renderer = null;
function buildRenderer(mission) {
  if (renderer) renderer.renderer.dispose();
  renderer = createRenderer(canvas, terrain, mission);
  renderer.resize();
}
buildRenderer(MISSIONS.rings);
const hud = createHud(document);
const audio = createAudio();
const input = createInput(canvas);

const screens = {
  title: document.getElementById('screen-title'),
  pause: document.getElementById('screen-pause'),
  complete: document.getElementById('screen-complete'),
  over: document.getElementById('screen-over'),
};
const completeBody = document.getElementById('complete-body');
const overBody = document.getElementById('over-body');
const titleMissions = document.getElementById('title-missions');

const HOP_STOPS = ['North Point', 'East Reef', 'South Holm'];
const COURIER_STRIP = 'Farlight Isle';

function missionById(id) {
  return MISSIONS[id];
}

function bestKey(missionId) {
  return `skylark-best-${missionId}`;
}
function readBest(missionId) {
  try {
    return Number.parseInt(window.localStorage.getItem(bestKey(missionId)) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(missionId, value) {
  try {
    window.localStorage.setItem(bestKey(missionId), String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

// Build the title screen's mission cards from the mission definitions.
for (const id of MISSION_ORDER) {
  const mission = MISSIONS[id];
  const card = document.createElement('button');
  card.className = 'mission-card';
  card.dataset.mission = id;
  card.innerHTML =
    `<strong>${mission.name}</strong><span>${mission.tagline}</span>` +
    `<em>${mission.timeLimit / 60} min · ${mission.storm ? 'Storm wind' : 'Fair weather'}</em>`;
  card.addEventListener('click', () => startMission(id));
  titleMissions.appendChild(card);
}

let game = null;

function showScreen(name) {
  for (const [key, element] of Object.entries(screens)) {
    element.classList.toggle('hidden', key !== name);
  }
  document.getElementById('hud').classList.toggle('hidden', name === 'title');
}

function objectiveText() {
  const { mission, flight } = game;
  const s = flight.state;
  if (mission.id === 'rings') return `RING RUN — ring ${Math.min(s.ringsPassed + 1, 8)} of 8 · ${s.ringsPassed} flown`;
  if (mission.id === 'hop') {
    const next = HOP_STOPS[s.stopsLanded] ?? 'done';
    return `ISLAND HOP — land on ${next} · ${s.stopsLanded} of 3 stops`;
  }
  return s.delivered
    ? 'STORM COURIER — parcel delivered!'
    : 'STORM COURIER — deliver the parcel to Farlight Isle';
}

function startMission(id) {
  const mission = missionById(id);
  buildRenderer(mission);
  const flight = createFlight(terrain, mission);
  renderer.snap(flight.state, 0);
  game = {
    mission,
    flight,
    screen: 'play',
    timeLeft: mission.timeLimit,
    best: readBest(id),
    cameraOrbit: 0,
    overReason: '',
    finished: false,
  };
  showScreen(null);
  hud.showMessage(mission.brief, 5, performance.now() / 1000);
  audio.unlock();
}

function finishMission(won, reason) {
  const { mission, flight } = game;
  const s = flight.state;
  let finalScore = s.score;
  if (won) {
    finalScore += Math.round(game.timeLeft * SCORE.timeBonusPerSecond);
    finalScore -= Math.round(s.damage * SCORE.damagePenaltyPerPoint);
    if (mission.id === 'hop' && s.damage === 0) finalScore += SCORE.smoothLandingBonus;
  }
  finalScore = Math.max(0, finalScore);
  game.finished = true;
  const isBest = finalScore > game.best;
  if (isBest) saveBest(mission.id, finalScore);
  if (won) {
    game.screen = 'complete';
    completeBody.innerHTML =
      `<p class="big">${mission.name} complete!</p>` +
      `<p>Score <strong>${finalScore}</strong>${isBest ? ' — a new best for this mission!' : ` · best ${game.best}`}</p>` +
      `<p>Rings ${s.ringsPassed} · Landings ${s.stopsLanded} · Damage ${Math.round(s.damage)}% · Fuel ${Math.round(s.fuel)}% left</p>` +
      `<p>Press R to fly again, or T for the title screen.</p>`;
    showScreen('complete');
    audio.complete();
  } else {
    game.screen = 'over';
    overBody.innerHTML =
      `<p class="big">${reason}</p>` +
      `<p>Score <strong>${finalScore}</strong> · best ${game.best}</p>` +
      `<p>Press R to try again, or T for the title screen.</p>`;
    showScreen('over');
    audio.crash();
  }
  window.__game = { screen: game.screen, score: finalScore, mission: mission.id };
}

function handleEvents(events) {
  const { mission, flight } = game;
  const s = flight.state;
  const now = performance.now() / 1000;
  for (const event of events) {
    if (event.type === 'ring') {
      hud.showMessage(`RING ${event.total} OF 8 — +${SCORE.ring}`, 2.2, now);
      audio.ring();
      if (s.ringsPassed >= terrain.rings.length) finishMission(true, '');
    } else if (event.type === 'takeoff') {
      hud.showMessage('AIRBORNE — gear up, enjoy the Skylark', 2.5, now);
    } else if (event.type === 'landed') {
      audio.landing();
      if (mission.id === 'hop') {
        const nextStop = HOP_STOPS[s.stopsLanded];
        if (event.runway === nextStop) {
          const stops = flight.noteStop(event.runway);
          hud.showMessage(
            `TOUCHDOWN ON ${event.runway.toUpperCase()} — refuelled · stop ${stops} of 3`,
            3,
            now,
          );
          if (stops >= HOP_STOPS.length) finishMission(true, '');
        } else if (event.runway) {
          hud.showMessage(`Landed on ${event.runway} — the next stop is ${nextStop}`, 3, now);
        } else {
          hud.showMessage('Down in a field — take off again and aim for the strip', 3, now);
        }
      } else if (mission.id === 'courier' && event.runway === COURIER_STRIP) {
        flight.noteDelivery();
        hud.showMessage('PARCEL DELIVERED TO FARLIGHT ISLE', 3, now);
        finishMission(true, '');
      } else {
        hud.showMessage(
          event.smooth ? 'SMOOTH TOUCHDOWN' : 'LANDED — a little firm',
          2.5,
          now,
        );
      }
    } else if (event.type === 'hard-landing') {
      hud.showMessage(`HARD LANDING — airframe damage ${Math.round(event.damage)}%`, 3, now);
      audio.warning();
    } else if (event.type === 'crash') {
      finishMission(false, event.reason);
    }
  }
}

function tick(dt, nowSeconds) {
  if (!game || game.screen !== 'play') return;
  const { flight } = game;
  game.timeLeft -= dt;
  if (game.timeLeft <= 0 && !game.finished) {
    game.timeLeft = 0;
    finishMission(false, 'Out of time — the mission window closed.');
    return;
  }
  const controls = input.read();
  const events = flight.step(controls, dt);
  handleEvents(events);
  audio.update(flight.state.throttle, flight.state.speed, flight.state.onGround);
  if (flight.state.stalled && !flight.state.onGround && Math.random() < dt * 0.5) {
    audio.warning();
  }
}

function runShot(name) {
  const staged = stageShot(name, terrain, missionById);
  buildRenderer(staged.mission);
  game = {
    mission: staged.mission,
    flight: staged.flight,
    screen: staged.screen,
    timeLeft: staged.mission.timeLimit - staged.flight.state.time,
    best: 0,
    cameraOrbit: 0,
    finished: staged.screen === 'complete',
    overReason: '',
  };
  const s = staged.flight.state;
  if (staged.screen === 'complete') {
    // The same arithmetic as a real finish: rings plus the time bonus.
    const finalScore = s.score + Math.round(game.timeLeft * SCORE.timeBonusPerSecond);
    completeBody.innerHTML =
      `<p class="big">${staged.mission.name} complete!</p>` +
      `<p>Score <strong>${finalScore}</strong> · all 8 rings flown</p>` +
      `<p>Skylark Courier — a flight game over the archipelago.</p>`;
  }
  if (staged.screen === 'over') {
    overBody.innerHTML = `<p class="big">Flight over</p><p>Score <strong>${s.score}</strong></p>`;
  }
  showScreen(staged.screen === 'play' ? null : staged.screen);
  hud.update(s, staged.mission, objectiveText(), game.timeLeft, 0);
  // The title screen's cards sit in the middle of the frame, so its camera
  // orbits to one side and the plane stays visible beside them.
  const shotOrbit = staged.screen === 'title' ? 0.55 : 0;
  renderer.snap(s, shotOrbit);
  let painted = 0;
  function paint() {
    renderer.draw(s, shotOrbit, STEP, painted * STEP);
    painted += 1;
    if (painted < 40) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  game = null;
  showScreen('title');
  let last = performance.now();
  let accumulator = 0;
  let elapsed = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    elapsed += frameDt;
    const pressedKeys = input.takePressed();
    game && (game.cameraOrbit += input.takeDrag() * 0.004);
    if (pressedKeys.has('KeyM')) {
      const muted = audio.toggleMute();
      hud.showMessage(muted ? 'Sound off' : 'Sound on', 1.2, now / 1000);
    }
    if (!game) {
      if (pressedKeys.has('Digit1')) startMission('rings');
      else if (pressedKeys.has('Digit2')) startMission('hop');
      else if (pressedKeys.has('Digit3')) startMission('courier');
      else if (pressedKeys.has('Enter')) startMission('rings');
    } else if (game.screen === 'play') {
      if (pressedKeys.has('KeyP') || pressedKeys.has('Escape')) {
        game.screen = 'paused';
        showScreen('pause');
      } else {
        accumulator += frameDt;
        while (accumulator >= STEP) {
          tick(STEP, now / 1000);
          accumulator -= STEP;
          if (!game || game.screen !== 'play') break;
        }
      }
    } else if (game.screen === 'paused') {
      if (pressedKeys.has('KeyP') || pressedKeys.has('Escape')) {
        game.screen = 'play';
        showScreen(null);
      }
    } else if (game.screen === 'complete' || game.screen === 'over') {
      if (pressedKeys.has('KeyR')) startMission(game.mission.id);
      else if (pressedKeys.has('KeyT')) {
        game = null;
        showScreen('title');
      }
    }
    if (game && (game.screen === 'play' || game.screen === 'paused')) {
      const s = game.flight.state;
      renderer.draw(s, game.cameraOrbit, frameDt, elapsed);
      hud.update(s, game.mission, objectiveText(), game.timeLeft, now / 1000);
      // A read-only handle for play-testing: position, speed, fuel, progress.
      window.__skylark = {
        screen: game.screen,
        mission: game.mission.id,
        x: s.x, y: s.y, z: s.z,
        speed: s.speed, throttle: s.throttle, fuel: s.fuel,
        damage: s.damage, rings: s.ringsPassed, stops: s.stopsLanded,
        score: s.score, crashed: s.crashed, onGround: s.onGround,
      };
    } else if (!game) {
      // Title screen: a slow orbit over the lagoon so the menu sits on a view.
      const idle = {
        x: -400, y: 150, z: 400,
        heading: Math.sin(elapsed * 0.05) * 0.6,
        pitch: -0.08, bank: 0.12, speed: 55, throttle: 0.5,
        fuel: 100, damage: 0, verticalSpeed: 0, onGround: false, ringsPassed: 0,
      };
      renderer.draw(idle, 0, frameDt, elapsed);
    }
  }
  requestAnimationFrame(frame);
}

function resize() {
  renderer.resize();
}
window.addEventListener('resize', resize);
resize();

if (shot) runShot(shot);
else runGame();

window.__game = { screen: shot ? 'shot' : 'title', mission: null, score: 0 };
