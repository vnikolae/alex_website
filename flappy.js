const canvas = document.getElementById('flappy');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const W = canvas.width;
const H = canvas.height;

// ── constants ──────────────────────────────────────────────────────────────
const GRAVITY      = 0.20;
const THRUST       = -0.38;       // applied every frame while held
const TERMINAL_VEL = 6.5;
const ASTEROID_W   = 58;
const ASTEROID_GAP = 185;
const ASTEROID_SPEED_INIT = 2.4;
const ASTEROID_INTERVAL   = 1700; // ms between spawns

// accent colours matching styles.css
const PURPLE = '#7c5cff';
const TEAL   = '#25d0a8';

// ── state ──────────────────────────────────────────────────────────────────
let stars, ship, asteroids, particles, score, best, state, thrusting;
let lastAsteroidTime, speedMult, animId;

best = Number(localStorage.getItem('alexRocketBest') || 0);
bestEl.textContent = best;

// ── star field ─────────────────────────────────────────────────────────────
function makeStars() {
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.6 + 0.2,
    a: Math.random() * 0.7 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
  }));
}

// ── reset / init ───────────────────────────────────────────────────────────
function reset() {
  ship = {
    x: 100,
    y: H / 2,
    vy: 0,
    w: 36,
    h: 20,
    alive: true,
  };
  asteroids  = [];
  particles  = [];
  score      = 0;
  scoreEl.textContent = 0;
  state      = 'waiting';   // waiting | playing | dead
  thrusting  = false;
  lastAsteroidTime = 0;
  speedMult  = 1;
}

// ── asteroid spawning ──────────────────────────────────────────────────────
function spawnAsteroid(ts) {
  const minY  = 60;
  const maxY  = H - ASTEROID_GAP - 60;
  const gapY  = minY + Math.random() * (maxY - minY);
  asteroids.push({
    x:      W + ASTEROID_W,
    gapY,
    speed:  ASTEROID_SPEED_INIT * speedMult,
    passed: false,
    topJags:    makeJags(ASTEROID_W),
    botJags:    makeJags(ASTEROID_W),
  });
  lastAsteroidTime = ts;
}

function makeJags(width) {
  const segs = 10;
  const pts  = [];
  for (let i = 0; i <= segs; i++) {
    pts.push({ dx: (i / segs) * width, dy: (Math.random() - 0.5) * 18 });
  }
  return pts;
}

// ── particles ──────────────────────────────────────────────────────────────
function emitExhaust() {
  for (let i = 0; i < 2; i++) {
    particles.push({
      x:    ship.x - ship.w / 2,
      y:    ship.y + (Math.random() - 0.5) * 6,
      vx:   -(Math.random() * 2 + 1),
      vy:   (Math.random() - 0.5) * 1.2,
      life: 1,
      r:    Math.random() * 4 + 2,
      color: thrusting ? TEAL : PURPLE,
    });
  }
}

function emitExplosion(x, y) {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    particles.push({
      x, y,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      life: 1,
      r:    Math.random() * 5 + 2,
      color: Math.random() > 0.5 ? PURPLE : TEAL,
    });
  }
}

// ── collision ──────────────────────────────────────────────────────────────
function hitTest(rock) {
  const sx1 = ship.x - ship.w / 2 + 4;
  const sx2 = ship.x + ship.w / 2 - 4;
  const sy1 = ship.y - ship.h / 2 + 3;
  const sy2 = ship.y + ship.h / 2 - 3;

  const rx1 = rock.x - ASTEROID_W / 2;
  const rx2 = rock.x + ASTEROID_W / 2;

  if (sx2 < rx1 || sx1 > rx2) return false;

  // top asteroid occupies 0 → rock.gapY
  if (sy1 < rock.gapY) return true;
  // bottom asteroid occupies rock.gapY + GAP → H
  if (sy2 > rock.gapY + ASTEROID_GAP) return true;
  return false;
}

// ── update ─────────────────────────────────────────────────────────────────
function update(ts, dt) {
  // thrust / gravity
  if (thrusting) {
    ship.vy += THRUST;
  }
  ship.vy = Math.min(ship.vy + GRAVITY, TERMINAL_VEL);
  ship.y  = Math.max(ship.h / 2, ship.y + ship.vy);

  // hit ceiling
  if (ship.y <= ship.h / 2) ship.vy = 0;

  // hit floor
  if (ship.y + ship.h / 2 >= H) {
    die();
    return;
  }

  // spawn asteroids
  if (ts - lastAsteroidTime > ASTEROID_INTERVAL) spawnAsteroid(ts);

  // move asteroids
  asteroids.forEach((rock) => {
    rock.x -= rock.speed;

    if (!rock.passed && rock.x + ASTEROID_W / 2 < ship.x - ship.w / 2) {
      rock.passed = true;
      score++;
      scoreEl.textContent = score;
      if (score > best) {
        best = score;
        bestEl.textContent = best;
        localStorage.setItem('alexRocketBest', best);
      }
      // speed up gently every 5 points
      if (score % 5 === 0) speedMult = Math.min(speedMult + 0.1, 2.2);
    }

    if (hitTest(rock)) { die(); return; }
  });

  asteroids = asteroids.filter((r) => r.x > -ASTEROID_W - 10);

  // exhaust
  emitExhaust();

  // particles
  particles.forEach((p) => {
    p.x    += p.vx;
    p.y    += p.vy;
    p.life -= 0.04;
  });
  particles = particles.filter((p) => p.life > 0);
}

function die() {
  if (!ship.alive) return;
  ship.alive = false;
  state = 'dead';
  emitExplosion(ship.x, ship.y);
}

// ── draw helpers ───────────────────────────────────────────────────────────
function drawStars(ts) {
  stars.forEach((s) => {
    s.twinkle += 0.02;
    const alpha = s.a * (0.7 + 0.3 * Math.sin(s.twinkle));
    ctx.fillStyle = `rgba(232, 236, 247, ${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRocket() {
  const x = ship.x;
  const y = ship.y;
  const tilt = Math.max(-0.45, Math.min(0.45, ship.vy * 0.055));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // body
  const bodyGrad = ctx.createLinearGradient(-18, -8, 18, 8);
  bodyGrad.addColorStop(0, '#c0aaff');
  bodyGrad.addColorStop(0.5, PURPLE);
  bodyGrad.addColorStop(1, '#4a3b99');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // nose cone
  ctx.fillStyle = TEAL;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(6, -7);
  ctx.lineTo(6, 7);
  ctx.closePath();
  ctx.fill();

  // fins
  ctx.fillStyle = '#5a3fcf';
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, -12);
  ctx.lineTo(-8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, 12);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  ctx.fill();

  // window
  ctx.fillStyle = 'rgba(37, 208, 168, 0.85)';
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(5, -1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAsteroid(rock) {
  const rx   = rock.x - ASTEROID_W / 2;
  const gapY = rock.gapY;
  const byY  = gapY + ASTEROID_GAP;

  // shared horizontal gradient giving a rounded-rock feel
  const grad = ctx.createLinearGradient(rx, 0, rx + ASTEROID_W, 0);
  grad.addColorStop(0,   '#1e1a30');
  grad.addColorStop(0.25,'#3d3260');
  grad.addColorStop(0.75,'#3d3260');
  grad.addColorStop(1,   '#1e1a30');

  function drawColumn(jags, topY, botY) {
    ctx.fillStyle   = grad;
    ctx.strokeStyle = '#5a4a80';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx, topY);
    ctx.lineTo(rx + ASTEROID_W, topY);
    // jagged inner edge — traverse pts right → left
    for (let i = jags.length - 1; i >= 0; i--) {
      ctx.lineTo(rx + jags[i].dx, botY + jags[i].dy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // purple glow along the gap edge
    ctx.save();
    ctx.shadowColor  = PURPLE;
    ctx.shadowBlur   = 8;
    ctx.strokeStyle  = 'rgba(124, 92, 255, 0.7)';
    ctx.lineWidth    = 2;
    ctx.beginPath();
    jags.forEach((p, i) => {
      if (i === 0) ctx.moveTo(rx + p.dx, botY + p.dy);
      else         ctx.lineTo(rx + p.dx, botY + p.dy);
    });
    ctx.stroke();
    ctx.restore();

    // subtle left-edge highlight
    ctx.strokeStyle = 'rgba(160, 140, 210, 0.18)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(rx + 4, topY);
    ctx.lineTo(rx + 4, botY);
    ctx.stroke();
  }

  // top column: solid block from y=0 down to gapY (jagged bottom)
  drawColumn(rock.topJags, 0, gapY);
  // bottom column: solid block from byY down to H (jagged top)
  drawColumn(rock.botJags, H, byY);
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawHUD(ts) {
  if (state === 'waiting') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8ecf7';
    ctx.font = 'bold 36px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀 Alex Rocket', W / 2, H / 2 - 36);
    ctx.font = '18px Segoe UI, sans-serif';
    ctx.fillStyle = '#9aa3b8';
    ctx.fillText('Hold Space or Click to thrust', W / 2, H / 2 + 10);
    ctx.fillText('Release to fall — dodge the asteroids', W / 2, H / 2 + 38);
  }

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e8ecf7';
    ctx.font = 'bold 40px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Crashed! 💥', W / 2, H / 2 - 24);
    ctx.font = '19px Segoe UI, sans-serif';
    ctx.fillStyle = '#9aa3b8';
    ctx.fillText(`Score: ${score}  •  Best: ${best}`, W / 2, H / 2 + 16);
    ctx.fillText('Space or Click to retry', W / 2, H / 2 + 46);
  }
}

// ── main loop ──────────────────────────────────────────────────────────────
let prevTs = 0;
function loop(ts) {
  const dt = ts - prevTs;
  prevTs = ts;

  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);

  drawStars(ts);
  drawParticles();
  asteroids.forEach(drawAsteroid);
  if (ship.alive) drawRocket();
  drawHUD(ts);

  if (state === 'playing' && ship.alive) update(ts, dt);

  animId = requestAnimationFrame(loop);
}

// ── input ──────────────────────────────────────────────────────────────────
function startThrust() {
  if (state === 'waiting' || state === 'dead') {
    reset();
    state = 'playing';
    return;
  }
  thrusting = true;
}

function stopThrust() {
  thrusting = false;
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); startThrust(); }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') stopThrust();
});
canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); startThrust(); });
canvas.addEventListener('pointerup',   () => stopThrust());
canvas.addEventListener('pointerleave',() => stopThrust());

// ── boot ───────────────────────────────────────────────────────────────────
makeStars();
reset();
requestAnimationFrame(loop);
