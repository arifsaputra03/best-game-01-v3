// Mouse and keyboard: where the pointer is, what was clicked, which keys
// were pressed. The game loop reads this once per frame and clears the
// one-shot events, so a click never fires twice.

export function createInput(canvas) {
  const input = {
    mx: -1,
    my: -1,
    clicked: null, // {x, y} once per click, cleared by the loop
    rightClicked: null,
    keys: {}, // keys held down, by e.key
    pressed: {}, // keys pressed this frame, cleared by the loop
    inside: false,
  };

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = pos(e);
    input.mx = p.x;
    input.my = p.y;
    input.inside = true;
  });

  canvas.addEventListener('mouseleave', () => {
    input.inside = false;
  });

  canvas.addEventListener('mousedown', (e) => {
    const p = pos(e);
    input.mx = p.x;
    input.my = p.y;
    if (e.button === 2) input.rightClicked = p;
    else input.clicked = p;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys[e.key] = true;
    input.pressed[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    input.keys[e.key] = false;
  });

  input.endFrame = () => {
    input.clicked = null;
    input.rightClicked = null;
    input.pressed = {};
  };

  input.wasPressed = (key) => !!input.pressed[key];

  // Grid cell under the pointer (play field only), or null.
  input.gridCell = () => {
    if (!input.inside) return null;
    const col = Math.floor(input.mx / 80);
    const row = Math.floor((input.my - 48) / 80);
    if (col < 0 || col > 15 || row < 0 || row > 6) return null;
    return { col, row };
  };

  return input;
}
