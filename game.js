(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const pauseBtn = document.getElementById("pauseBtn");
  const hintEl = document.getElementById("hint");

  const leftZone = document.getElementById("leftZone");
  const rightZone = document.getElementById("rightZone");
  const startZone = document.getElementById("startZone");

  const W = canvas.width, H = canvas.height;

  const state = {
    running: false,
    paused: false,
    tPrev: 0,
    score: 0,
    best: Number(localStorage.getItem("tapdodger_best") || 0),
    speed: 220,
    spawnEvery: 0.75,
    spawnTimer: 0,
    obstacles: [],
    shake: 0,
  };

  const player = {
    r: 16,
    x: W / 2,
    y: H - 80,
    targetX: W / 2,
  };

  function reset() {
    state.running = false;
    state.paused = false;
    state.tPrev = 0;
    state.score = 0;
    state.speed = 220;
    state.spawnEvery = 0.75;
    state.spawnTimer = 0;
    state.obstacles = [];
    state.shake = 0;
    player.x = W / 2;
    player.targetX = W / 2;
    scoreEl.textContent = "0";
    hintEl.textContent = `Tippe unten: Start. Best: ${state.best}`;
    pauseBtn.textContent = "\u23F8";
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.paused = false;
    state.tPrev = performance.now();
    hintEl.textContent = "Links/Rechts tippen zum Ausweichen.";
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? "\u25B6" : "\u23F8";
    if (!state.paused) {
      state.tPrev = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function moveTo(side) {
    const lanes = [W * 0.2, W * 0.4, W * 0.6, W * 0.8];
    const current = player.targetX;
    const idx = lanes.reduce((best, x, i) =>
      Math.abs(x - current) < Math.abs(lanes[best] - current) ? i : best
    , 0);

    let next = idx + (side === "left" ? -1 : 1);
    next = Math.max(0, Math.min(lanes.length - 1, next));
    player.targetX = lanes[next];
  }

  function spawnObstacle() {
    const w = 26 + Math.random() * 34;
    const x = 10 + Math.random() * (W - 20 - w);
    const vy = state.speed * (0.9 + Math.random() * 0.35);
    state.obstacles.push({ x, y: -40, w, h: 18 + Math.random() * 18, vy });
  }

  function circleRectCollide(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }

  function gameOver() {
    state.running = false;
    state.paused = false;
    pauseBtn.textContent = "\u23F8";
    state.best = Math.max(state.best, Math.floor(state.score));
    localStorage.setItem("tapdodger_best", String(state.best));
    hintEl.textContent = `Game Over. Score: ${Math.floor(state.score)} | Best: ${state.best}. Tippe unten: Restart.`;
  }

  function update(dt) {
    state.score += dt * 10;
    state.speed = 220 + state.score * 0.35;
    state.spawnEvery = Math.max(0.35, 0.75 - state.score / 900);

    const k = 18;
    player.x += (player.targetX - player.x) * (1 - Math.exp(-k * dt));

    state.spawnTimer += dt;
    while (state.spawnTimer >= state.spawnEvery) {
      state.spawnTimer -= state.spawnEvery;
      spawnObstacle();
    }

    for (const o of state.obstacles) o.y += o.vy * dt;
    state.obstacles = state.obstacles.filter(o => o.y < H + 80);

    for (const o of state.obstacles) {
      if (circleRectCollide(player.x, player.y, player.r, o.x, o.y, o.w, o.h)) {
        gameOver();
        break;
      }
    }

    scoreEl.textContent = String(Math.floor(state.score));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = "rgba(233,238,252,0.35)";
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    for (const o of state.obstacles) {
      ctx.fillStyle = "rgba(125,211,252,0.85)";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "rgba(167,139,250,0.35)";
      ctx.fillRect(o.x + 3, o.y + 3, Math.max(0, o.w - 6), Math.max(0, o.h - 6));
    }

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(233,238,252,0.92)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r - 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(11,16,32,0.75)";
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(233,238,252,0.25)";
    ctx.fillRect(player.targetX - 2, player.y - 40, 4, 80);
    ctx.restore();
  }

  function loop(t) {
    if (!state.running || state.paused) return;
    const dt = Math.min(0.033, (t - state.tPrev) / 1000);
    state.tPrev = t;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  leftZone.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state.running) moveTo("left");
  });

  rightZone.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state.running) moveTo("right");
  });

  startZone.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!state.running) {
      reset();
      start();
    }
  });

  pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") moveTo("left");
    if (e.key === "ArrowRight") moveTo("right");
    if (e.key === " ") togglePause();
    if (e.key.toLowerCase() === "r") { reset(); start(); }
  });

  reset();
  draw();
})();
