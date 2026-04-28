const canvas  = document.getElementById('tetris');
const ctx     = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');

// ── layout constants ───────────────────────────────────────────────────────
const CELL = 30;
const COLS = 10;
const ROWS = 20;
const GAP  = 10;
const SIDE = 140;
const MINI = 20;           // preview cell size
const BW   = COLS * CELL;  // 300
const BH   = ROWS * CELL;  // 600
const SX   = BW + GAP;     // sidebar x = 310

const PURPLE = '#7c5cff';
const TEAL   = '#25d0a8';

// color index 0 = empty, 1-7 = piece colors
const COLORS = [
  null,
  TEAL,       // I
  '#f5c842',  // O
  PURPLE,     // T
  '#4adf80',  // S
  '#ff5c7c',  // Z
  '#5ca0ff',  // J
  '#ff9c50',  // L
];

// Piece matrices — cell values are the color index
const SHAPES = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                              // O
  [[0,3,0],[3,3,3],[0,0,0]],                 // T
  [[0,4,4],[4,4,0],[0,0,0]],                 // S
  [[5,5,0],[0,5,5],[0,0,0]],                 // Z
  [[6,0,0],[6,6,6],[0,0,0]],                 // J
  [[0,0,7],[7,7,7],[0,0,0]],                 // L
];

// ── state ──────────────────────────────────────────────────────────────────
let board, bag, current, nextType, heldType, canHold;
let score, level, totalLines, state;
let lastDrop, dropMs, flashRows, flashFrame;
let dasDelay, dasRepeat;

let best = Number(localStorage.getItem('alexTetrisBest') || 0);
bestEl.textContent = best;

// ── helpers ────────────────────────────────────────────────────────────────
function makeBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function shuffleBag() {
  const b = [0, 1, 2, 3, 4, 5, 6];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function popBag() {
  if (!bag.length) bag = shuffleBag();
  return bag.pop();
}

function makePiece(type) {
  const cells = SHAPES[type].map(r => [...r]);
  return { type, cells, x: Math.floor((COLS - cells[0].length) / 2), y: 0 };
}

function rotateCW(cells) {
  const R = cells.length, C = cells[0].length;
  const out = Array.from({ length: C }, () => Array(R).fill(0));
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      out[c][R - 1 - r] = cells[r][c];
  return out;
}

function isValid(cells, px, py) {
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) {
      if (!cells[r][c]) continue;
      const bx = px + c, by = py + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && board[by][bx]) return false;
    }
  return true;
}

function ghostY() {
  let gy = current.y;
  while (isValid(current.cells, current.x, gy + 1)) gy++;
  return gy;
}

// ── core game ──────────────────────────────────────────────────────────────
function spawnNext() {
  current = makePiece(nextType);
  nextType = popBag();
  if (!isValid(current.cells, current.x, current.y)) {
    state = 'dead';
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('alexTetrisBest', best);
    }
  }
}

function lockPiece() {
  current.cells.forEach((row, r) =>
    row.forEach((v, c) => {
      const by = current.y + r;
      if (v && by >= 0 && by < ROWS) board[by][current.x + c] = v;
    })
  );
  const full = [];
  for (let r = 0; r < ROWS; r++) if (board[r].every(Boolean)) full.push(r);
  if (full.length) {
    flashRows = full;
    flashFrame = 0;
    state = 'flash';
  } else {
    spawnNext();
    canHold = true;
  }
}

function clearLines() {
  const n = flashRows.length;
  board = board.filter((_, i) => !flashRows.includes(i));
  while (board.length < ROWS) board.unshift(Array(COLS).fill(0));
  score += [0, 100, 300, 500, 800][n] * level;
  totalLines += n;
  level = Math.floor(totalLines / 10) + 1;
  dropMs = Math.max(80, 1000 - (level - 1) * 85);
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    localStorage.setItem('alexTetrisBest', best);
  }
  flashRows = [];
  state = 'playing';
  spawnNext();
  canHold = true;
}

function reset() {
  board     = makeBoard();
  bag       = shuffleBag();
  heldType  = null;
  canHold   = true;
  flashRows = [];
  flashFrame = 0;
  score      = 0;
  totalLines = 0;
  level      = 1;
  dropMs     = 1000;
  scoreEl.textContent = 0;
  nextType = popBag();
  spawnNext();
  state    = 'playing';
  lastDrop = performance.now();
}

// ── input actions ──────────────────────────────────────────────────────────
function moveH(dx) {
  if (state !== 'playing') return;
  if (isValid(current.cells, current.x + dx, current.y)) current.x += dx;
}

function softDrop() {
  if (state !== 'playing') return;
  if (isValid(current.cells, current.x, current.y + 1)) {
    current.y++;
    score++;
    scoreEl.textContent = score;
    lastDrop = performance.now();
  }
}

function hardDrop() {
  if (state !== 'playing') return;
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  scoreEl.textContent = score;
  lockPiece();
  lastDrop = performance.now();
}

function rotate() {
  if (state !== 'playing') return;
  const rotated = rotateCW(current.cells);
  for (const dx of [0, -1, 1, -2, 2]) {
    if (isValid(rotated, current.x + dx, current.y)) {
      current.cells = rotated;
      current.x += dx;
      return;
    }
  }
}

function hold() {
  if (state !== 'playing' || !canHold) return;
  canHold = false;
  if (heldType === null) {
    heldType = current.type;
    spawnNext();
  } else {
    const tmp = heldType;
    heldType = current.type;
    current = makePiece(tmp);
  }
}

// ── draw helpers ───────────────────────────────────────────────────────────
function drawCell(px, py, colorIdx, alpha = 1) {
  if (!colorIdx) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIdx];
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(px + 1, py + 1, CELL - 2, 4);
  ctx.fillRect(px + 1, py + 1, 4, CELL - 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(px + 1, py + CELL - 5, CELL - 2, 4);
  ctx.fillRect(px + CELL - 5, py + 1, 4, CELL - 2);
  ctx.globalAlpha = 1;
}

function drawMiniCell(px, py, colorIdx) {
  if (!colorIdx) return;
  ctx.fillStyle = COLORS[colorIdx];
  ctx.fillRect(px + 1, py + 1, MINI - 2, MINI - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(px + 1, py + 1, MINI - 2, 3);
  ctx.fillRect(px + 1, py + 1, 3, MINI - 2);
}

function drawPreview(type, ox, oy) {
  if (type == null) return;
  const m    = SHAPES[type];
  const rows = m.length, cols = m[0].length;
  const sx   = ox + Math.floor((4 * MINI - cols * MINI) / 2);
  const sy   = oy + Math.floor((4 * MINI - rows * MINI) / 2);
  m.forEach((row, r) => row.forEach((v, c) => drawMiniCell(sx + c * MINI, sy + r * MINI, v)));
}

// ── draw ───────────────────────────────────────────────────────────────────
function drawBoard() {
  ctx.strokeStyle = 'rgba(124,92,255,0.07)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, BH); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(BW, r * CELL); ctx.stroke();
  }
  board.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    const alpha = flashRows.includes(r) ? (flashFrame % 6 < 3 ? 1 : 0.12) : 1;
    drawCell(c * CELL, r * CELL, v, alpha);
  }));
}

function drawActive() {
  if (state !== 'playing' || !current) return;
  const gy = ghostY();

  // ghost piece
  current.cells.forEach((row, r) => row.forEach((v, c) => {
    if (!v || gy + r < 0) return;
    const px = (current.x + c) * CELL, py = (gy + r) * CELL;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = COLORS[v];
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS[v];
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3);
  }));

  // active piece
  current.cells.forEach((row, r) => row.forEach((v, c) => {
    if (!v || current.y + r < 0) return;
    drawCell((current.x + c) * CELL, (current.y + r) * CELL, v);
  }));
}

function drawSidebar() {
  // divider
  ctx.strokeStyle = 'rgba(124,92,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(BW + 5, 0); ctx.lineTo(BW + 5, BH); ctx.stroke();

  const lx = SX + 10;

  function sideLabel(text, y) {
    ctx.fillStyle = '#9aa3b8';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, lx, y);
  }

  function previewBox(y) {
    ctx.strokeStyle = 'rgba(124,92,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, y, 4 * MINI, 4 * MINI);
  }

  // NEXT
  sideLabel('NEXT', 16);
  previewBox(32);
  drawPreview(nextType, lx, 32);

  // HOLD
  sideLabel('HOLD', 128);
  previewBox(144);
  drawPreview(heldType, lx, 144);
  if (heldType != null && !canHold) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(lx, 144, 4 * MINI, 4 * MINI);
  }

  // LEVEL
  sideLabel('LEVEL', 250);
  ctx.fillStyle = PURPLE;
  ctx.font = 'bold 30px Segoe UI, sans-serif';
  ctx.fillText(level, lx, 267);

  // LINES
  sideLabel('LINES', 320);
  ctx.fillStyle = TEAL;
  ctx.font = 'bold 30px Segoe UI, sans-serif';
  ctx.fillText(totalLines, lx, 337);
}

function drawHUD() {
  if (state === 'waiting') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, BW, BH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8ecf7';
    ctx.font = 'bold 32px Segoe UI, sans-serif';
    ctx.fillText('🧱 Alex Tetris', BW / 2, BH / 2 - 100);
    ctx.font = '15px Segoe UI, sans-serif';
    ctx.fillStyle = '#9aa3b8';
    [
      '← → / A D     Move',
      '↑ / W            Rotate',
      '↓ / S            Soft drop',
      'Space            Hard drop',
      'C / Shift        Hold',
    ].forEach((line, i) => ctx.fillText(line, BW / 2, BH / 2 - 42 + i * 28));
    ctx.fillStyle = PURPLE;
    ctx.font = 'bold 15px Segoe UI, sans-serif';
    ctx.fillText('Press any key or click to start', BW / 2, BH / 2 + 112);
  }

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, BW, BH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8ecf7';
    ctx.font = 'bold 38px Segoe UI, sans-serif';
    ctx.fillText('Game Over', BW / 2, BH / 2 - 28);
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.fillStyle = '#9aa3b8';
    ctx.fillText(`Score: ${score}  •  Best: ${best}`, BW / 2, BH / 2 + 14);
    ctx.fillText('Space or Click to play again', BW / 2, BH / 2 + 44);
  }
}

// ── main loop ──────────────────────────────────────────────────────────────
function loop(ts) {
  if (state === 'playing' && current && ts - lastDrop >= dropMs) {
    if (!isValid(current.cells, current.x, current.y + 1)) {
      lockPiece();
    } else {
      current.y++;
    }
    lastDrop = ts;
  }

  if (state === 'flash') {
    flashFrame++;
    if (flashFrame >= 20) clearLines();
  }

  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBoard();
  drawActive();
  drawSidebar();
  drawHUD();

  requestAnimationFrame(loop);
}

// ── input ──────────────────────────────────────────────────────────────────
function startDAS(dir) {
  clearTimeout(dasDelay);
  clearInterval(dasRepeat);
  dasDelay = setTimeout(() => {
    dasRepeat = setInterval(() => moveH(dir), 50);
  }, 170);
}

function stopDAS() {
  clearTimeout(dasDelay);
  clearInterval(dasRepeat);
}

document.addEventListener('keydown', (e) => {
  if (state === 'waiting') { if (!e.repeat) reset(); return; }
  if (state === 'dead')    { if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) reset(); return; }

  if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); softDrop(); return; }
  if (e.repeat) return;

  switch (e.code) {
    case 'ArrowLeft':  case 'KeyA': e.preventDefault(); moveH(-1);  startDAS(-1); break;
    case 'ArrowRight': case 'KeyD': e.preventDefault(); moveH(1);   startDAS(1);  break;
    case 'ArrowUp':    case 'KeyW': e.preventDefault(); rotate();   break;
    case 'Space':                   e.preventDefault(); hardDrop(); break;
    case 'KeyC': case 'ShiftLeft': case 'ShiftRight':  hold();     break;
  }
});

document.addEventListener('keyup', (e) => {
  if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) stopDAS();
});

canvas.addEventListener('click', () => {
  if (state === 'waiting' || state === 'dead') reset();
});

// ── boot ───────────────────────────────────────────────────────────────────
board      = makeBoard();
bag        = [];
nextType   = null;
heldType   = null;
canHold    = true;
score      = 0;
totalLines = 0;
level      = 1;
dropMs     = 1000;
flashRows  = [];
flashFrame = 0;
state      = 'waiting';
scoreEl.textContent = 0;
requestAnimationFrame(loop);
