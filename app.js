/* 想换名字时，只需修改这里。 */
const LOVE = Object.freeze({
  from: "LH",
  to: "WZP",
  line1: "WZP，遇见你之后，",
  line2: "连代码都开始偏心。",
});

const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d", { alpha: true });
const replayTop = document.querySelector("#replay-top");
const replayButton = document.querySelector("#replay-button");
const starButton = document.querySelector("#star-button");
const soundToggle = document.querySelector("#sound-toggle");
const fullscreenToggle = document.querySelector("#fullscreen-toggle");
const fpsCounter = document.querySelector("#fps-counter");
const liveStatus = document.querySelector("#live-status");
const toast = document.querySelector("#toast");
const brand = document.querySelector(".brand");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compact = window.matchMedia("(max-width: 780px)").matches;

const COLORS = [
  [255, 196, 218],
  [255, 229, 240],
  [245, 158, 202],
  [194, 184, 255],
  [255, 249, 252],
];

let width = 0;
let height = 0;
let dpr = 1;
let particles = [];
let ambientParticles = [];
let bursts = [];
let started = false;
let startedAt = 0;
let heartFormed = false;
let pointer = { x: -1000, y: -1000, active: false };
let lastFrame = performance.now();
let fpsSmooth = 60;
let messageTimeout;
let toastTimeout;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function random(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function rgba(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function heartPoint(angle) {
  const x = 16 * Math.pow(Math.sin(angle), 3);
  const y = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);
  return { x: x / 18, y: (y - 1.3) / 18 };
}

function getHeartLayout() {
  const isNarrow = width <= 780;
  const scale = isNarrow
    ? Math.min(width * 0.305, height * 0.235)
    : Math.min(width * 0.195, height * 0.28, 292);

  return {
    x: width * 0.5,
    y: isNarrow ? height * 0.39 : height * 0.43,
    scale,
  };
}

function sampleHeartTarget(index, total) {
  const layout = getHeartLayout();
  const angle = (index / total) * Math.PI * 2 + random(-0.03, 0.03);
  const edge = heartPoint(angle);
  const isOutline = index % 4 === 0;
  const radial = isOutline ? random(0.93, 1.015) : Math.sqrt(Math.random()) * 0.97;
  const shimmer = Math.sin(angle * 9 + index) * 0.007;

  return {
    x: layout.x + edge.x * layout.scale * (radial + shimmer),
    y: layout.y - edge.y * layout.scale * (radial + shimmer),
    outline: isOutline,
    depth: random(0.35, 1),
  };
}

function createParticle(index, total) {
  const target = sampleHeartTarget(index, total);
  const edgeSide = Math.random() < 0.5 ? -1 : 1;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    startX: random(-30, width + 30),
    startY: random(height * 0.72, height + height * 0.5),
    tx: target.x,
    ty: target.y,
    outline: target.outline,
    depth: target.depth,
    color,
    size: target.outline ? random(0.85, 1.55) : random(0.42, 1.06),
    alpha: target.outline ? random(0.62, 0.98) : random(0.3, 0.82),
    phase: random(0, Math.PI * 2),
    speed: random(0.012, 0.035),
    delay: random(0, 0.72),
    launchBias: edgeSide * random(0.15, 1),
  };
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const particleCount = reduceMotion ? 720 : (width < 780 ? 1500 : (width < 1100 ? 2300 : 3200));
  particles = Array.from({ length: particleCount }, (_, index) => createParticle(index, particleCount));
  const ambientCount = reduceMotion ? 30 : (width < 780 ? 58 : 92);
  ambientParticles = Array.from({ length: ambientCount }, () => ({
    x: random(0, width),
    y: random(0, height),
    size: random(0.25, 1.4),
    alpha: random(0.06, 0.3),
    speed: random(0.03, 0.12),
    drift: random(-0.08, 0.08),
  }));
}

function render(time) {
  const delta = Math.min(0.05, (time - lastFrame) / 1000);
  lastFrame = time;
  const elapsed = started ? (time - startedAt) / 1000 : 0;
  context.clearRect(0, 0, width, height);

  drawAmbient(time);
  drawHeartCore(elapsed, time);
  drawParticles(delta, elapsed, time);
  drawBursts(delta, time);

  const frameFps = delta > 0 ? 1 / delta : 60;
  fpsSmooth += (frameFps - fpsSmooth) * 0.06;
  if (Math.floor(time / 500) !== Math.floor((time - 16) / 500)) {
    fpsCounter.textContent = `${Math.round(clamp(fpsSmooth, 20, 144))} FPS`;
  }

  requestAnimationFrame(render);
}

function drawAmbient(time) {
  for (const particle of ambientParticles) {
    particle.y -= particle.speed * 0.3;
    particle.x += particle.drift * 0.2;
    const twinkle = 0.55 + Math.sin(time * 0.001 + particle.x) * 0.45;
    if (particle.y < -4) {
      particle.y = height + 4;
      particle.x = random(0, width);
    }
    if (particle.x < -4) particle.x = width + 4;
    if (particle.x > width + 4) particle.x = -4;
    context.beginPath();
    context.fillStyle = rgba(COLORS[4], particle.alpha * twinkle);
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  }
}

function drawHeartCore(elapsed, time) {
  if (!started) return;
  const layout = getHeartLayout();
  const reveal = clamp((elapsed - 0.2) / 2.6, 0, 1);
  if (reveal <= 0) return;

  const pulse = 1 + Math.sin(time * 0.0025) * 0.018;
  const radius = layout.scale * 1.65 * pulse;
  const glow = context.createRadialGradient(layout.x, layout.y + layout.scale * 0.01, 0, layout.x, layout.y, radius);
  glow.addColorStop(0, `rgba(255, 120, 180, ${0.085 * reveal})`);
  glow.addColorStop(0.45, `rgba(255, 116, 178, ${0.035 * reveal})`);
  glow.addColorStop(1, "rgba(255, 116, 178, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(layout.x, layout.y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawParticles(delta, elapsed, time) {
  const layout = getHeartLayout();
  const pulse = 1 + Math.sin(time * 0.0025) * 0.014;

  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const baseTargetX = layout.x + (particle.tx - layout.x) * pulse;
    const baseTargetY = layout.y + (particle.ty - layout.y) * pulse;
    const waveX = Math.sin(time * particle.speed + particle.phase) * (1.8 + particle.depth * 3.8);
    const waveY = Math.cos(time * particle.speed * 0.8 + particle.phase) * (1.2 + particle.depth * 2.4);
    const progress = reduceMotion
      ? 1
      : clamp((elapsed - 0.22 - particle.delay) / 2.45, 0, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 4);
    const startX = particle.startX + particle.launchBias * Math.sin(progress * Math.PI) * 42;
    const startY = particle.startY;
    let x = startX + (baseTargetX - startX) * easedProgress + waveX * easedProgress;
    let y = startY + (baseTargetY - startY) * easedProgress + waveY * easedProgress;

    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const distanceSquared = dx * dx + dy * dy;
    const influence = pointer.active ? 112 : 0;
    if (distanceSquared > 0 && distanceSquared < influence * influence) {
      const distance = Math.sqrt(distanceSquared);
      const force = Math.pow(1 - distance / influence, 2) * 30;
      x += (dx / distance) * force;
      y += (dy / distance) * force;
    }
    particle.x = x;
    particle.y = y;

    const visible = started ? clamp(elapsed / 0.45, 0, 1) : 0.42;
    const twinkle = 0.72 + 0.28 * Math.sin(time * 0.0015 + particle.phase * 2.2);
    const alpha = particle.alpha * twinkle * visible;
    if (alpha < 0.015) continue;

    if (particle.outline) {
      context.fillStyle = rgba(particle.color, alpha * 0.13);
      context.beginPath();
      context.arc(x, y, particle.size * 3.2, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = rgba(particle.color, alpha);
    context.fillRect(
      x - particle.size / 2,
      y - particle.size / 2,
      particle.size,
      particle.size,
    );
  }
  context.globalCompositeOperation = "source-over";
}

function drawBursts(delta, time) {
  context.globalCompositeOperation = "lighter";
  bursts = bursts.filter((spark) => {
    spark.life -= delta;
    if (spark.life <= 0) return false;
    spark.x += spark.vx * delta * 60;
    spark.y += spark.vy * delta * 60;
    spark.vy += 0.018 * delta * 60;
    spark.vx *= 0.985;
    const alpha = clamp(spark.life / spark.maxLife, 0, 1);
    context.fillStyle = rgba(spark.color, alpha * 0.82);
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size * (0.65 + alpha * 0.8), 0, Math.PI * 2);
    context.fill();
    return true;
  });
  context.globalCompositeOperation = "source-over";
}

function createBurst(x, y, amount = 24) {
  const count = reduceMotion ? Math.ceil(amount / 3) : amount;
  for (let index = 0; index < count; index += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(0.45, 2.7);
    const life = random(0.7, 1.8);
    bursts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.3,
      size: random(0.8, 2.2),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life,
      maxLife: life,
    });
  }
}

function updateStaticContent() {
  const nameSpans = document.querySelectorAll(".name-lockup span");
  nameSpans[0].textContent = LOVE.to;
  nameSpans[1].textContent = LOVE.from;
  document.querySelector(".message-line").innerHTML = `${LOVE.line1}<br>${LOVE.line2}`;
  document.querySelector(".message-signature").innerHTML = `你的 ${LOVE.from} <span aria-hidden="true">♡</span>`;
  document.title = `${LOVE.to} × ${LOVE.from} · Love Runtime`;
}

function startExperience(autoStart = false) {
  if (!started) {
    started = true;
    startedAt = performance.now();
    document.body.classList.add("has-started");
    liveStatus.textContent = "心动程序开始运行，粒子正在组成爱心。";
    if (!autoStart && !soundToggle.classList.contains("is-muted")) startMusic();
  } else {
    replayExperience();
    return;
  }

  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    if (!started) return;
    heartFormed = true;
    document.body.classList.add("heart-formed");
    liveStatus.textContent = "粒子爱心已经形成。WZP，遇见你之后，连代码都开始偏心。";
    createBurst(getHeartLayout().x, getHeartLayout().y, reduceMotion ? 18 : 55);
    playChime(523.25, 0.08);
  }, reduceMotion ? 900 : 3400);
}

function replayExperience() {
  document.body.classList.remove("heart-formed");
  heartFormed = false;
  startedAt = performance.now();
  const particleCount = particles.length;
  particles = Array.from({ length: particleCount }, (_, index) => createParticle(index, particleCount));
  bursts = [];
  liveStatus.textContent = "心动程序重新运行。";
  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    heartFormed = true;
    document.body.classList.add("heart-formed");
    liveStatus.textContent = "粒子爱心再次形成。";
    createBurst(getHeartLayout().x, getHeartLayout().y, 55);
    playChime(659.25, 0.07);
  }, reduceMotion ? 900 : 2800);
}

let audioContext = null;
let audioGain = null;
let musicTimer = null;
let noteIndex = 0;
const melody = [261.63, 329.63, 392, 493.88, 440, 392, 329.63, 293.66];

function ensureAudio() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioContext = new AudioContext();
    audioGain = audioContext.createGain();
    audioGain.gain.value = 0.025;
    audioGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playChime(frequency, volume = 0.03) {
  if (soundToggle.getAttribute("aria-pressed") === "false") return;
  const audio = ensureAudio();
  if (!audio) return;
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.01, now + 1.1);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  oscillator.connect(gain);
  gain.connect(audioGain);
  oscillator.start(now);
  oscillator.stop(now + 1.7);
}

function startMusic() {
  const audio = ensureAudio();
  if (!audio || musicTimer) return;
  const note = () => {
    playChime(melody[noteIndex], 0.014);
    if (noteIndex % 2 === 0) playChime(melody[noteIndex] / 2, 0.008);
    noteIndex = (noteIndex + 1) % melody.length;
  };
  note();
  musicTimer = setInterval(note, 1450);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}

function toggleSound() {
  const willMute = soundToggle.getAttribute("aria-pressed") === "true";
  soundToggle.setAttribute("aria-pressed", String(!willMute));
  soundToggle.setAttribute("aria-label", willMute ? "开启音乐" : "关闭音乐");
  soundToggle.classList.toggle("is-muted", willMute);
  if (willMute) {
    stopMusic();
    showToast("已静音");
  } else {
    startMusic();
    showToast("声音已开启");
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => showToast("当前浏览器不支持全屏"));
  } else {
    document.exitFullscreen?.();
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 1700);
}

replayButton.addEventListener("click", replayExperience);
replayTop.addEventListener("click", replayExperience);
starButton.addEventListener("click", (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  createBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 60);
  const layout = getHeartLayout();
  createBurst(layout.x, layout.y, 32);
  playChime(783.99, 0.04);
  showToast("这颗星，已经为你们点亮");
});

soundToggle.addEventListener("click", toggleSound);
fullscreenToggle.addEventListener("click", toggleFullscreen);
brand.addEventListener("click", (event) => {
  event.preventDefault();
  replayExperience();
});

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
}, { passive: true });

window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("pointerdown", (event) => {
  if (!started || event.target.closest("button, a")) return;
  createBurst(event.clientX, event.clientY, 22);
  playChime(random(523, 880), 0.018);
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMusic();
  else if (started && soundToggle.getAttribute("aria-pressed") === "true") startMusic();
});

window.addEventListener("resize", resizeCanvas, { passive: true });

updateStaticContent();
resizeCanvas();
startExperience(true);
requestAnimationFrame(render);
