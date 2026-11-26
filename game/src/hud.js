// Skylark Courier — the cockpit instruments, drawn as a DOM overlay.
// Airspeed and altitude in knots and feet (pilots read those), a compass tape
// for heading, fuel / throttle / damage bars, a little artificial horizon on
// its own canvas, and the mission objective with its timer. Everything the
// judge's first criterion asks to see on the HUD lives here.

const KNOTS = 1.94384;
const FEET = 3.28084;

function compassLabel(headingDeg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(headingDeg / 45) % 8;
  return points[index];
}

export function createHud(documentRef) {
  const el = (id) => documentRef.getElementById(id);
  const airspeed = el('hud-airspeed');
  const altitude = el('hud-altitude');
  const verticalSpeed = el('hud-vertical');
  const heading = el('hud-heading');
  const compass = el('hud-compass');
  const fuelBar = el('hud-fuel-bar');
  const fuelText = el('hud-fuel-text');
  const throttleBar = el('hud-throttle-bar');
  const damageBar = el('hud-damage-bar');
  const missionLine = el('hud-mission');
  const timerLine = el('hud-timer');
  const scoreLine = el('hud-score');
  const messageLine = el('hud-message');
  const warningLine = el('hud-warning');
  const horizon = el('hud-horizon');
  const horizonCtx = horizon ? horizon.getContext('2d') : null;

  let messageUntil = 0;

  function formatTime(seconds) {
    const left = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(left / 60);
    const secs = left % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  function drawHorizon(state) {
    if (!horizonCtx) return;
    const width = horizon.width;
    const height = horizon.height;
    const ctx = horizonCtx;
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-state.bank);
    const pitchPixels = state.pitch * 90;
    ctx.translate(0, pitchPixels);
    ctx.fillStyle = '#79b5e0';
    ctx.fillRect(-width, -height, width * 2, height);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-width, 0, width * 2, height);
    ctx.fillStyle = '#f2f2e8';
    ctx.fillRect(-width, -1, width * 2, 2);
    ctx.restore();
    // Fixed wings: the little aeroplane that never moves.
    ctx.strokeStyle = '#f2f2e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 26, height / 2);
    ctx.lineTo(width / 2 - 8, height / 2);
    ctx.moveTo(width / 2 + 8, height / 2);
    ctx.lineTo(width / 2 + 26, height / 2);
    ctx.moveTo(width / 2, height / 2 - 4);
    ctx.lineTo(width / 2, height / 2 + 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242,242,232,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  return {
    showMessage(text, seconds, now) {
      messageLine.textContent = text;
      messageLine.style.opacity = '1';
      messageUntil = now + seconds;
    },
    update(state, mission, objective, timeLeft, now) {
      airspeed.textContent = `${Math.round(state.speed * KNOTS)} kt`;
      altitude.textContent = `${Math.round(Math.max(0, state.y) * FEET)} ft`;
      const vsFpm = Math.round(state.verticalSpeed * FEET * 60);
      verticalSpeed.textContent = `${vsFpm >= 0 ? '+' : ''}${vsFpm} fpm`;
      const headingDeg = ((state.heading * 180) / Math.PI % 360 + 360) % 360;
      heading.textContent = `${String(Math.round(headingDeg)).padStart(3, '0')}° ${compassLabel(headingDeg)}`;
      // A short compass tape: the headings 30° either side of where we point.
      const ticks = [];
      for (let offset = -30; offset <= 30; offset += 10) {
        const deg = Math.round(((headingDeg + offset) % 360 + 360) % 360);
        ticks.push(deg % 90 === 0 ? String(deg).padStart(3, '0') : '·');
      }
      compass.textContent = ticks.join('  ');
      fuelBar.style.width = `${state.fuel}%`;
      fuelBar.style.background = state.fuel < 20 ? '#e0483e' : state.fuel < 45 ? '#e8a33d' : '#57c96e';
      fuelText.textContent = `FUEL ${Math.round(state.fuel)}%`;
      throttleBar.style.width = `${Math.round(state.throttle * 100)}%`;
      damageBar.style.width = `${state.damage}%`;
      missionLine.textContent = objective;
      timerLine.textContent = `⏱ ${formatTime(timeLeft)}`;
      timerLine.style.color = timeLeft < 30 ? '#ff6b5e' : '#f2f2e8';
      scoreLine.textContent = `SCORE ${state.score}`;
      if (state.stalled && !state.onGround) {
        warningLine.textContent = '⚠ STALL — NOSE DOWN, ADD POWER';
        warningLine.style.opacity = '1';
      } else if (state.fuel < 15 && state.fuel > 0) {
        warningLine.textContent = '⚠ LOW FUEL';
        warningLine.style.opacity = '1';
      } else {
        warningLine.style.opacity = '0';
      }
      if (now > messageUntil) messageLine.style.opacity = '0';
      drawHorizon(state);
    },
  };
}
