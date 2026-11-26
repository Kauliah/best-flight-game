// Skylark Courier — the flight model and the mission rules that ride on it.
// Arcade, but honest: speed makes the wing fly, bank makes the turn, and a
// fast, steep arrival at the ground is a crash, not a landing.

import { WORLD, SCORE } from './config.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeToward(value, target, rate, dt) {
  const diff = target - value;
  const step = clamp(diff, -rate * dt, rate * dt);
  return value + step;
}

export function createFlight(terrain, mission) {
  const pose = terrain.startPose();
  const state = {
    x: pose.x,
    y: pose.y,
    z: pose.z,
    heading: pose.heading,
    pitch: 0,
    bank: 0,
    speed: 0,
    throttle: 0,
    fuel: mission.fuelStart,
    damage: 0,
    verticalSpeed: 0,
    onGround: true,
    airborne: false,
    crashed: false,
    crashReason: '',
    landed: false,
    landedRunway: null,
    ringsPassed: 0,
    stopsLanded: 0,
    delivered: false,
    stalled: false,
    time: 0,
    score: 0,
  };

  function step(input, dt) {
    const events = [];
    if (state.crashed) return events;
    state.time += dt;

    // Throttle: W/S (or Shift/Ctrl). Fuel empty means the engine is quiet.
    if (state.fuel <= 0) state.throttle = 0;
    else if (input.throttleUp) state.throttle = clamp(state.throttle + 0.55 * dt, 0, 1);
    else if (input.throttleDown) state.throttle = clamp(state.throttle - 0.55 * dt, 0, 1);

    // Attitude: the stick eases the plane toward the commanded bank and pitch,
    // and the wing levels itself when the stick is centred.
    const targetBank = input.bankLeft ? -WORLD.maxBank : input.bankRight ? WORLD.maxBank : 0;
    const targetPitch = input.pitchUp ? WORLD.maxPitch : input.pitchDown ? -WORLD.maxPitch : 0;
    state.bank = easeToward(state.bank, targetBank, 2.6, dt);
    state.pitch = easeToward(state.pitch, state.onGround ? Math.max(0, targetPitch) : targetPitch, 1.9, dt);

    // Turning comes from bank, and only bites once there is airflow.
    const airFactor = clamp(state.speed / WORLD.maxSpeed, 0, 1);
    state.heading += state.bank * WORLD.turnAuthority * (0.25 + 0.75 * airFactor) * dt;

    // Speed chases the throttle; the brake (Space) is an airbrake in the air
    // and wheel brakes on the strip.
    const targetSpeed = state.throttle * WORLD.maxSpeed;
    const rate = state.speed < targetSpeed ? 11 : input.brake ? 26 : 7;
    state.speed = easeToward(state.speed, targetSpeed, rate, dt);
    if (state.onGround && input.brake) state.speed = easeToward(state.speed, 0, 30, dt);

    // Lift and sink: pitch trades speed for height while the wing flies; below
    // the flying speed the wing quits and the nose drops.
    state.stalled = !state.onGround && state.speed < WORLD.stallSpeed;
    let verticalSpeed = Math.sin(state.pitch) * state.speed * WORLD.climbAuthority;
    if (state.stalled) {
      verticalSpeed -= (WORLD.minFlySpeed - state.speed) * 0.55;
      state.pitch = easeToward(state.pitch, -0.18, 1.2, dt);
    }
    state.verticalSpeed = verticalSpeed;

    // Wind pushes the whole airframe sideways; the storm mission leans on it.
    const wind = mission.wind;
    const gust = mission.storm ? Math.sin(state.time * 0.9) * 2.5 : 0;
    const horizontalSpeed = Math.cos(state.pitch) * state.speed;
    state.x += (Math.sin(state.heading) * horizontalSpeed + wind.x + gust) * dt;
    state.z += (-Math.cos(state.heading) * horizontalSpeed + wind.z + gust * 0.6) * dt;

    // Stay inside the charted sea; the edge turns the plane back gently.
    const edge = WORLD.size / 2 - 120;
    if (Math.abs(state.x) > edge || Math.abs(state.z) > edge) {
      state.heading += Math.PI * dt * 0.4;
    }

    if (state.onGround) {
      const ground = terrain.groundHeight(state.x, state.z);
      state.y = ground + 2.5;
      state.verticalSpeed = 0;
      if (state.speed > 36 && state.pitch > 0.06) {
        state.onGround = false;
        state.airborne = true;
        events.push({ type: 'takeoff' });
      }
    } else {
      state.y += verticalSpeed * dt;
      const ground = terrain.groundHeight(state.x, state.z);
      if (state.y <= ground + 2.2) {
        state.y = ground + 2.2;
        const strip = terrain.runwayAt(state.x, state.z);
        const gentle = Math.abs(verticalSpeed) < 7 && Math.abs(state.bank) < 0.4 && state.speed < 62;
        if (strip && gentle) {
          state.onGround = true;
          state.landed = true;
          state.landedRunway = strip.runway.name;
          state.speed = Math.min(state.speed, 46);
          events.push({ type: 'landed', runway: strip.runway.name, smooth: Math.abs(verticalSpeed) < 3.5 });
        } else if (gentle && ground > 0.5) {
          // A gentle touchdown on flat grass: a rough-field landing, not a
          // crash. It bends the airframe a little and counts as down, but it
          // is not a strip landing, so no mission stop is credited for it.
          state.damage += 15;
          state.onGround = true;
          state.landed = true;
          state.landedRunway = null;
          state.speed = Math.min(state.speed, 30);
          events.push({ type: 'landed', runway: null, smooth: false });
          if (state.damage >= 100) {
            state.crashed = true;
            state.crashReason = 'The rough-field landing broke the airframe.';
            events.push({ type: 'crash', reason: state.crashReason });
          }
        } else if (strip && !gentle) {
          state.damage += WORLD.damageHardLanding;
          state.onGround = true;
          state.landed = true;
          state.landedRunway = strip.runway.name;
          state.speed = Math.min(state.speed, 30);
          events.push({ type: 'hard-landing', runway: strip.runway.name, damage: state.damage });
          if (state.damage >= 100) {
            state.crashed = true;
            state.crashReason = 'The airframe broke up on a hard landing.';
            events.push({ type: 'crash', reason: state.crashReason });
          }
        } else {
          state.crashed = true;
          state.crashReason =
            ground <= 0.5 ? 'Ditched in the sea.' : 'Flew into the hillside.';
          events.push({ type: 'crash', reason: state.crashReason });
        }
      }
      if (state.y < 1 && !state.crashed) {
        state.crashed = true;
        state.crashReason = 'Ditched in the sea.';
        events.push({ type: 'crash', reason: state.crashReason });
      }
    }

    // Fuel: the engine drinks with the throttle; empty tanks mean a glide.
    if (!state.onGround || state.speed > 5) {
      state.fuel = Math.max(0, state.fuel - WORLD.fuelBurn * (0.25 + state.throttle) * dt);
    }
    if (state.damage >= 100 && !state.crashed) {
      state.crashed = true;
      state.crashReason = 'The damage was too much and the Skylark gave up.';
      events.push({ type: 'crash', reason: state.crashReason });
    }

    // Rings: flying through the next gold ring's hoop collects it.
    if (mission.id === 'rings' && state.ringsPassed < terrain.rings.length) {
      const ring = terrain.rings[state.ringsPassed];
      const dx = state.x - ring.x;
      const dy = state.y - ring.y;
      const dz = state.z - ring.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < ring.radius) {
        state.ringsPassed += 1;
        state.score += SCORE.ring;
        events.push({ type: 'ring', index: ring.index, total: state.ringsPassed });
      }
    }
    return events;
  }

  // Called by the game when a landing counts toward the Island Hop mission.
  function noteStop(runwayName) {
    state.stopsLanded += 1;
    state.score += SCORE.landing;
    state.fuel = WORLD.fuelCapacity;
    return state.stopsLanded;
  }

  function noteDelivery() {
    state.delivered = true;
    state.score += SCORE.delivery;
  }

  return { state, step, noteStop, noteDelivery };
}
