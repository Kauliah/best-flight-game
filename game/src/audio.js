// Skylark Courier — sound, made in code, no audio files.
// A WebAudio engine hum (two detuned oscillators through a low-pass filter,
// pitch and loudness following the throttle), plus short chimes for rings,
// landings and warnings. Starts only after the player presses a key, so the
// browser's autoplay rules are never fought.

export function createAudio() {
  let context = null;
  let engineOscA = null;
  let engineOscB = null;
  let engineGain = null;
  let engineFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engineOscA = context.createOscillator();
      engineOscB = context.createOscillator();
      engineOscA.type = 'sawtooth';
      engineOscB.type = 'square';
      engineOscA.frequency.value = 55;
      engineOscB.frequency.value = 82;
      engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOscA.connect(engineFilter);
      engineOscB.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOscA.start();
      engineOscB.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function blip(frequency, duration, type, volume, when = 0) {
    if (!started || muted || !context) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      const start = context.currentTime + when;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // Sound is garnish: a failed blip never stops the game.
    }
  }

  return {
    unlock() {
      if (ensure() && context && context.state === 'suspended') context.resume();
    },
    // Called every frame: the engine follows throttle and airspeed.
    update(throttle, speed, onGround) {
      if (!started || muted || !context) return;
      const rpm = 42 + throttle * 58 + speed * 0.22;
      engineOscA.frequency.setTargetAtTime(rpm, context.currentTime, 0.08);
      engineOscB.frequency.setTargetAtTime(rpm * 1.494, context.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(320 + throttle * 700, context.currentTime, 0.1);
      const loud = onGround && throttle < 0.05 ? 0 : 0.045 + throttle * 0.075;
      engineGain.gain.setTargetAtTime(loud, context.currentTime, 0.1);
    },
    ring() {
      blip(880, 0.22, 'sine', 0.16);
      blip(1318, 0.3, 'sine', 0.12, 0.07);
    },
    landing() {
      blip(523, 0.18, 'triangle', 0.16);
      blip(784, 0.28, 'triangle', 0.14, 0.09);
    },
    warning() {
      blip(220, 0.25, 'square', 0.07);
      blip(220, 0.25, 'square', 0.07, 0.28);
    },
    crash() {
      blip(110, 0.7, 'sawtooth', 0.14);
      blip(55, 0.9, 'sawtooth', 0.12, 0.1);
    },
    complete() {
      [523, 659, 784, 1046].forEach((freq, i) => blip(freq, 0.35, 'triangle', 0.14, i * 0.11));
    },
    toggleMute() {
      muted = !muted;
      if (engineGain && context) engineGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
