const canvas = document.getElementById('snake');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const TILE = 24;
const COLS = canvas.width / TILE;
const ROWS = canvas.height / TILE;

let snake, dir, nextDir, food, score, best, alive, tickMs, lastTick;

best = Number(localStorage.getItem('alexSnakeBest') || 0);
bestEl.textContent = best;

function reset() {
  snake = [
    { x: 8, y: 12 },
    { x: 7, y: 12 },
    { x: 6, y: 12 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = 0;
  alive = true;
  tickMs = 110;
  lastTick = 0;
  placeFood();
}

function placeFood() {
  while (true) {
    const fx = Math.floor(Math.random() * COLS);
    const fy = Math.floor(Math.random() * ROWS);
    if (!snake.some((s) => s.x === fx && s.y === fy)) {
      food = { x: fx, y: fy };
      return;
    }
  }
}

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (!alive && (k === ' ' || k === 'enter')) { reset(); return; }
  if ((k === 'arrowup' || k === 'w') && dir.y !== 1) nextDir = { x: 0, y: -1 };
  else if ((k === 'arrowdown' || k === 's') && dir.y !== -1) nextDir = { x: 0, y: 1 };
  else if ((k === 'arrowleft' || k === 'a') && dir.x !== 1) nextDir = { x: -1, y: 0 };
  else if ((k === 'arrowright' || k === 'd') && dir.x !== -1) nextDir = { x: 1, y: 0 };
});

canvas.addEventListener('click', () => { if (!alive) reset(); });

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) { alive = false; return; }
  if (snake.some((s) => s.x === head.x && s.y === head.y)) { alive = false; return; }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('alexSnakeBest', best);
    }
    if (tickMs > 55) tickMs -= 2;
    placeFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(124, 92, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * TILE, 0);
    ctx.lineTo(i * TILE, canvas.height);
    ctx.stroke();
  }
  for (let i = 1; i < ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * TILE);
    ctx.lineTo(canvas.width, i * TILE);
    ctx.stroke();
  }

  ctx.font = `${TILE - 4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍎', food.x * TILE + TILE / 2, food.y * TILE + TILE / 2);

  snake.forEach((seg, i) => {
    const t = i / snake.length;
    const r = Math.round(124 + (37 - 124) * t);
    const g = Math.round(92 + (208 - 92) * t);
    const b = Math.round(255 + (168 - 255) * t);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(seg.x * TILE + 1, seg.y * TILE + 1, TILE - 2, TILE - 2);
  });

  if (snake[0]) {
    ctx.fillStyle = '#050810';
    const headX = snake[0].x * TILE;
    const headY = snake[0].y * TILE;
    ctx.beginPath();
    ctx.arc(headX + TILE * 0.35, headY + TILE * 0.35, 2.5, 0, Math.PI * 2);
    ctx.arc(headX + TILE * 0.65, headY + TILE * 0.35, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!alive) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.fillStyle = '#9aa3b8';
    ctx.fillText(`Score: ${score}  •  Best: ${best}`, canvas.width / 2, canvas.height / 2 + 14);
    ctx.fillText('Press space or click to play again', canvas.width / 2, canvas.height / 2 + 42);
  }
}

function loop(ts) {
  if (alive && ts - lastTick > tickMs) {
    step();
    lastTick = ts;
  }
  draw();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
