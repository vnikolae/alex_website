const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('playerScore');
const cpuScoreEl = document.getElementById('cpuScore');

const W = canvas.width;
const H = canvas.height;
const PADDLE_W = 12;
const PADDLE_H = 90;
const BALL_R = 8;
const WIN_SCORE = 7;

const player = { x: 16, y: H / 2 - PADDLE_H / 2, vy: 0 };
const cpu = { x: W - 16 - PADDLE_W, y: H / 2 - PADDLE_H / 2 };
const ball = { x: W / 2, y: H / 2, vx: 5, vy: 3, speed: 5 };

let playerScore = 0;
let cpuScore = 0;
let gameOver = false;
let winner = '';

const keys = {};
document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const mouseY = (e.clientY - rect.top) * scaleY;
  player.y = mouseY - PADDLE_H / 2;
});

canvas.addEventListener('click', () => {
  if (gameOver) resetGame();
});

function resetBall(direction) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = 5;
  ball.vx = direction * ball.speed;
  ball.vy = (Math.random() * 2 - 1) * 3;
}

function resetGame() {
  playerScore = 0;
  cpuScore = 0;
  gameOver = false;
  winner = '';
  playerScoreEl.textContent = 0;
  cpuScoreEl.textContent = 0;
  resetBall(Math.random() < 0.5 ? 1 : -1);
}

function update() {
  if (gameOver) return;

  if (keys['w'] || keys['arrowup']) player.y -= 7;
  if (keys['s'] || keys['arrowdown']) player.y += 7;
  player.y = Math.max(0, Math.min(H - PADDLE_H, player.y));

  const cpuCenter = cpu.y + PADDLE_H / 2;
  const targetY = ball.y;
  const cpuSpeed = 4.5;
  if (cpuCenter < targetY - 10) cpu.y += cpuSpeed;
  else if (cpuCenter > targetY + 10) cpu.y -= cpuSpeed;
  cpu.y = Math.max(0, Math.min(H - PADDLE_H, cpu.y));

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; }
  if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy *= -1; }

  if (
    ball.x - BALL_R < player.x + PADDLE_W &&
    ball.x - BALL_R > player.x &&
    ball.y > player.y &&
    ball.y < player.y + PADDLE_H &&
    ball.vx < 0
  ) {
    ball.vx *= -1;
    const hit = (ball.y - (player.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    ball.vy = hit * 5;
    ball.speed += 0.3;
    ball.vx = Math.sign(ball.vx) * ball.speed;
  }

  if (
    ball.x + BALL_R > cpu.x &&
    ball.x + BALL_R < cpu.x + PADDLE_W &&
    ball.y > cpu.y &&
    ball.y < cpu.y + PADDLE_H &&
    ball.vx > 0
  ) {
    ball.vx *= -1;
    const hit = (ball.y - (cpu.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    ball.vy = hit * 5;
    ball.speed += 0.3;
    ball.vx = Math.sign(ball.vx) * ball.speed;
  }

  if (ball.x < 0) {
    cpuScore++;
    cpuScoreEl.textContent = cpuScore;
    if (cpuScore >= WIN_SCORE) { gameOver = true; winner = 'CPU wins!'; }
    else resetBall(1);
  }
  if (ball.x > W) {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    if (playerScore >= WIN_SCORE) { gameOver = true; winner = 'Alex wins! 🎉'; }
    else resetBall(-1);
  }
}

function draw() {
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(124, 92, 255, 0.3)';
  ctx.setLineDash([10, 14]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#7c5cff';
  ctx.fillRect(player.x, player.y, PADDLE_W, PADDLE_H);
  ctx.fillStyle = '#25d0a8';
  ctx.fillRect(cpu.x, cpu.y, PADDLE_W, PADDLE_H);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(winner, W / 2, H / 2 - 10);
    ctx.font = '20px Segoe UI, sans-serif';
    ctx.fillStyle = '#9aa3b8';
    ctx.fillText('Click to play again', W / 2, H / 2 + 30);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resetBall(Math.random() < 0.5 ? 1 : -1);
loop();
