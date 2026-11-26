// Skylark Courier — keyboard and mouse input.
// Arrow keys fly the plane (Up = stick forward, nose down; Down = pull up),
// W/S work the throttle, Space is the brake, P pauses, M mutes. The mouse
// picks a mission on the title screen and drags the chase camera around.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let dragX = 0;
  let dragging = false;
  let lastX = 0;

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(codeOf(event));
    keys.add(codeOf(event));
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(codeOf(event));
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
  });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    lastX = event.clientX;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });

  function held(code) {
    return keys.has(code);
  }

  return {
    // Read once per frame: the flying controls as plain booleans.
    read() {
      return {
        pitchUp: held('ArrowDown'),
        pitchDown: held('ArrowUp'),
        bankLeft: held('ArrowLeft') || held('KeyA'),
        bankRight: held('ArrowRight') || held('KeyD'),
        throttleUp: held('KeyW') || held('ShiftLeft') || held('ShiftRight'),
        throttleDown: held('KeyS') || held('ControlLeft') || held('ControlRight'),
        brake: held('Space'),
      };
    },
    // One-shot actions, consumed by the game loop each frame.
    takePressed() {
      const out = new Set(pressed);
      pressed.clear();
      return out;
    },
    // How far the player dragged the camera sideways since the last read.
    takeDrag() {
      const value = dragX;
      dragX = 0;
      return value;
    },
    isDown(code) {
      return held(code);
    },
  };
}
