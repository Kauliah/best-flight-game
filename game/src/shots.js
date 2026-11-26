// Skylark Courier — the screenshot scenes behind ?shot=play|start|land|end.
// Each scene flies the real flight model forward from a fresh world with a
// simple autopilot (steer at the next ring or the next strip, hold a target
// speed and altitude), so every screenshot is a frame a real flight could
// produce, and the same seed always gives the same frame.

import { STEP } from './config.js';
import { createFlight } from './flight.js';

const SAMPLE = STEP;

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function headingTo(fromX, fromZ, toX, toZ) {
  return Math.atan2(toX - fromX, -(toZ - fromZ));
}

// The autopilot's stick: booleans in the same shape the keyboard produces.
// Pitch is a little proportional controller: a smoothed pitch target from the
// altitude error, with a flare cap near the ground so the touchdown is
// gentle, and the booleans only nudge the real pitch toward that target.
let pulseFrame = 0;
let autoPitch = 0;
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function autopilotInput(state, terrain, mission, target) {
  pulseFrame += 1;
  const input = {
    pitchUp: false,
    pitchDown: false,
    bankLeft: false,
    bankRight: false,
    throttleUp: false,
    throttleDown: false,
    brake: false,
  };
  const desiredHeading = headingTo(state.x, state.z, target.x, target.z);
  const error = wrapAngle(desiredHeading - state.heading);
  if (error > 0.03) input.bankRight = true;
  else if (error < -0.03) input.bankLeft = true;

  const altitudeError = target.y - state.y;
  let desiredPitch = clamp(altitudeError * 0.03, -0.3, 0.3);
  // Flare: close to the ground, cap how steeply the nose may point down, so
  // the arrival is a landing and not a lawn dart.
  const groundBelow = terrain.groundHeight(state.x, state.z);
  const aboveGround = state.y - groundBelow;
  if (target.flare && aboveGround < 15) desiredPitch = Math.max(desiredPitch, -0.12);
  if (target.flare && aboveGround < 7) desiredPitch = Math.max(desiredPitch, -0.06);
  autoPitch = clamp(
    autoPitch + clamp(desiredPitch - autoPitch, -0.03, 0.03),
    -0.3,
    0.3,
  );
  // The band is tighter than one frame's pitch step, so the stick keeps
  // pulsing and the real pitch tracks the target instead of easing to level.
  if (autoPitch > state.pitch + 0.01) input.pitchUp = true;
  else if (autoPitch < state.pitch - 0.01) input.pitchDown = true;

  const cruise = target.cruise ?? 62;
  if (state.speed < cruise - 3) input.throttleUp = true;
  else if (state.speed > cruise + 4) input.throttleDown = true;
  if (target.brake && state.onGround) input.brake = true;
  return input;
}

function flyFor(flight, terrain, mission, targetFor, seconds) {
  for (let t = 0; t < seconds; t += SAMPLE) {
    const target = targetFor(flight.state);
    if (!target) break;
    flight.step(autopilotInput(flight.state, terrain, mission, target), SAMPLE);
    if (flight.state.crashed) break;
  }
}

export function stageShot(name, terrain, missionById) {
  if (name === 'play' || name === 'start') {
    const mission = missionById('rings');
    const flight = createFlight(terrain, mission);
    flyFor(flight, terrain, mission, (state) => {
      if (state.ringsPassed >= terrain.rings.length) return null;
      const ring = terrain.rings[state.ringsPassed];
      return { x: ring.x, y: ring.y, z: ring.z, cruise: 62 };
    }, name === 'play' ? 30 : 8);
    return { mission, flight, screen: name === 'play' ? 'play' : 'title' };
  }

  if (name === 'land') {
    const mission = missionById('hop');
    const flight = createFlight(terrain, mission);
    const strip = terrain.runways[1]; // North Point, first hop stop.
    // Set the plane on final approach: lined up, 800 m out, 110 m up.
    const s = flight.state;
    s.x = strip.x - strip.alongX * 800;
    s.z = strip.z - strip.alongZ * 800;
    s.y = strip.height + 110;
    s.heading = strip.heading;
    s.pitch = -0.06;
    s.bank = 0;
    s.speed = 54;
    s.throttle = 0.42;
    s.onGround = false;
    s.airborne = true;
    flyFor(flight, terrain, mission, (state) => {
      if (state.onGround) return null;
      // Fly the extended centreline, not the strip's centre: aim 400 m past
      // where the wheels should touch so the approach never S-turns, and hold
      // a steady glide slope down to the touchdown point.
      const dx = state.x - strip.x;
      const dz = state.z - strip.z;
      const along = dx * strip.alongX + dz * strip.alongZ;
      const across = dx * strip.alongZ - dz * strip.alongX;
      const touchdownAlong = -140;
      const ahead = along + 200;
      // A shallow glide slope, aiming at the tarmac itself once close, with a
      // cross-track correction that pulls the approach back to the centreline
      // against the wind instead of letting it drift off the strip.
      const targetY =
        along > -120
          ? strip.height - 6 // aim just under the tarmac: the ground itself stops the descent
          : strip.height + 10 + Math.max(0, touchdownAlong - along) * 0.15;
      const perpX = strip.alongZ;
      const perpZ = -strip.alongX;
      const correct = -across * 1.2;
      return {
        x: strip.x + strip.alongX * ahead + perpX * correct,
        y: targetY,
        z: strip.z + strip.alongZ * ahead + perpZ * correct,
        cruise: 42,
        flare: true,
      };
    }, 60);
    return { mission, flight, screen: 'play' };
  }

  // 'end': fly the whole ring course, then show the mission-complete screen
  // over the Skylark parked back on its home strip.
  const mission = missionById('rings');
  const flight = createFlight(terrain, mission);
  flyFor(flight, terrain, mission, (state) => {
    if (state.ringsPassed >= terrain.rings.length) return null;
    const ring = terrain.rings[state.ringsPassed];
    return { x: ring.x, y: ring.y, z: ring.z, cruise: 62 };
  }, 420);
  const s = flight.state;
  if (s.ringsPassed >= terrain.rings.length && !s.crashed) {
    const home = terrain.homeRunway;
    s.x = home.x;
    s.z = home.z;
    s.y = home.height + 2.5;
    s.heading = home.heading;
    s.speed = 0;
    s.throttle = 0;
    s.onGround = true;
    s.airborne = false;
  }
  return { mission, flight, screen: s.ringsPassed >= terrain.rings.length ? 'complete' : 'over' };
}
