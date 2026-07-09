const WEBHOOK_URL = window.APP_CONFIG?.WISH_API_URL || "";

const NOTE_POOL = [
  { name: "mi", freq: 659.25, color: "#ffe066" },
  { name: "so", freq: 783.99, color: "#5adbb5" },
  { name: "xi", freq: 987.77, color: "#ff5d73" },
  { name: "re", freq: 587.33, color: "#71a7ff" },
  { name: "#fa", freq: 739.99, color: "#c58cff" }
];

const JAVA_LINES = [
  "public class BirthdayGame {",
  "System.out.println(\"Happy Birthday\");",
  "if (sliceCount >= 10) unlockWishModal();",
  "List<String> notes = Arrays.asList(\"do\",\"re\",\"mi\");",
  "RainDrop drop = new RainDrop(x, y);",
  "bgmPlayer.play(\"229.mp3\");",
  "catch (Exception e) { e.printStackTrace(); }",
  "for (Target t : targets) { t.update(); }",
  "boolean lucky = random.nextBoolean();",
  "String wish = request.getParameter(\"message\");",
  "var pokemonFrame = centerBackground(\"pokemon.jpg\");",
  "while (running) { render(); }"
];

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgm = document.getElementById("bgm");
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const sliceCountElement = document.getElementById("sliceCount");
const chestButton = document.getElementById("chestButton");
const wishModal = document.getElementById("wishModal");
const closeModalButton = document.getElementById("closeModalButton");
const wishForm = document.getElementById("wishForm");
const formFeedback = document.getElementById("formFeedback");
const wishToast = document.getElementById("wishToast");

const pokemonImage = new Image();
pokemonImage.src = "./pokemon.jpg";

const targetImage = new Image();
targetImage.src = "./yahaha.png";
const dogImage = new Image();
dogImage.src = "./gou.png";
const catImage = new Image();
catImage.src = "./mao.png";
const fruitImages = [targetImage, dogImage, catImage];

let audioContext = null;
let isStarted = false;
let sliceCount = 0;
let modalUnlocked = false;
let activePointer = false;
let pointerTrail = [];
let targets = [];
let bursts = [];
let flashes = [];
let codeRain = [];
let lastTimestamp = 0;
let spawnTimer = 0;
let toastTimer = 0;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function startExperience() {
  if (isStarted) {
    return;
  }

  isStarted = true;
  ensureAudio();
  bgm.volume = 0.62;
  bgm.play().catch(() => {});
  startScreen.classList.add("hidden");
  initCodeRain();
}

function getStageRect() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const imageRatio = pokemonImage.width && pokemonImage.height
    ? pokemonImage.width / pokemonImage.height
    : 1.5;

  const maxWidth = width * 0.7;
  const maxHeight = height * 0.82;
  let stageWidth = maxWidth;
  let stageHeight = stageWidth / imageRatio;

  if (stageHeight > maxHeight) {
    stageHeight = maxHeight;
    stageWidth = stageHeight * imageRatio;
  }

  return {
    x: (width - stageWidth) / 2,
    y: (height - stageHeight) / 2,
    width: stageWidth,
    height: stageHeight
  };
}

function initCodeRain() {
  codeRain = [];
  const width = canvas.clientWidth;
  const columns = Math.max(12, Math.floor(width / 120));
  for (let index = 0; index < columns; index += 1) {
    codeRain.push({
      x: index * (width / columns) + randomBetween(-18, 18),
      y: randomBetween(-canvas.clientHeight, canvas.clientHeight),
      speed: randomBetween(34, 92),
      text: JAVA_LINES[index % JAVA_LINES.length],
      alpha: randomBetween(0.2, 0.6)
    });
  }
}

function createTarget() {
  const stage = getStageRect();
  const image = fruitImages[Math.floor(Math.random() * fruitImages.length)];
  const size = randomBetween(52, 88);
  targets.push({
    id: `${Date.now()}-${Math.random()}`,
    type: "fruit",
    image,
    x: randomBetween(stage.x + size, stage.x + stage.width - size),
    y: -size - randomBetween(10, 160),
    size,
    speedY: randomBetween(170, 280),
    driftX: randomBetween(-55, 55),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-1.6, 1.6),
    sliced: false
  });
}

function createBurst(x, y, note) {
  const particleCount = 18;
  for (let index = 0; index < particleCount; index += 1) {
    bursts.push({
      x,
      y,
      vx: randomBetween(-160, 160),
      vy: randomBetween(-200, 160),
      size: randomBetween(6, 20),
      color: note.color,
      life: randomBetween(0.28, 0.88),
      square: Math.random() > 0.5
    });
  }
}

function createFlash(x, y, text, color) {
  flashes.push({
    x,
    y,
    text,
    color,
    life: 0.8
  });
}

function playNoteTone(note) {
  ensureAudio();
  const now = audioContext.currentTime;

  const oscillator = audioContext.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(note.freq, now);
  oscillator.frequency.exponentialRampToValueAtTime(note.freq * 1.03, now + 0.06);

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.14, now + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gainNode).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

function sliceTarget(target) {
  target.sliced = true;
  sliceCount += 1;
  sliceCountElement.textContent = String(sliceCount);

  const note = NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];
  playNoteTone(note);
  createBurst(target.x, target.y, note);
  createFlash(target.x, target.y, note.name.toUpperCase(), note.color);

  if (sliceCount >= 10 && !modalUnlocked) {
    modalUnlocked = true;
    wishModal.classList.remove("hidden");
  }
}

function drawCodeRain(deltaSeconds, stage) {
  ctx.save();
  ctx.font = "12px 'Press Start 2P', monospace";
  ctx.textBaseline = "top";

  codeRain.forEach((line) => {
    line.y += line.speed * deltaSeconds;
    if (line.y > canvas.clientHeight + 40) {
      line.y = -randomBetween(40, 260);
      line.text = JAVA_LINES[Math.floor(Math.random() * JAVA_LINES.length)];
      line.alpha = randomBetween(0.18, 0.6);
    }

    const inCenter = line.x > stage.x - 20 && line.x < stage.x + stage.width + 20;
    if (inCenter) {
      return;
    }

    ctx.globalAlpha = line.alpha;
    ctx.fillStyle = "#5adbb5";
    ctx.fillText(line.text, line.x, line.y);
  });

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawStageBackground(stage) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  drawCodeRain(1 / 60, stage);

  ctx.save();
  ctx.fillStyle = "#080808";
  ctx.fillRect(stage.x, stage.y, stage.width, stage.height);
  if (pokemonImage.complete && pokemonImage.naturalWidth) {
    ctx.drawImage(pokemonImage, stage.x, stage.y, stage.width, stage.height);
  }
  ctx.strokeStyle = "#1d1d1d";
  ctx.lineWidth = 4;
  ctx.strokeRect(stage.x, stage.y, stage.width, stage.height);
  ctx.restore();
}

function drawTarget(target) {
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(target.rotation);

  if (target.image && target.image.complete && target.image.naturalWidth) {
    const ratio = target.image.naturalWidth / target.image.naturalHeight;
    const drawWidth = target.size * 1.15;
    const drawHeight = drawWidth / ratio;
    ctx.drawImage(target.image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  } else {
    ctx.fillStyle = "#8be35f";
    ctx.fillRect(-target.size / 2, -target.size / 2, target.size, target.size);
  }

  ctx.restore();
}

function drawTrail() {
  if (pointerTrail.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = 1; index < pointerTrail.length; index += 1) {
    const prev = pointerTrail[index - 1];
    const point = pointerTrail[index];
    const alpha = index / pointerTrail.length;

    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85})`;
    ctx.lineWidth = 5 + alpha * 11;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,93,115,${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEffects(deltaSeconds) {
  bursts = bursts.filter((particle) => {
    particle.life -= deltaSeconds;
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vy += 220 * deltaSeconds;
    if (particle.life <= 0) {
      return false;
    }

    ctx.save();
    ctx.globalAlpha = clamp(particle.life, 0, 1);
    ctx.fillStyle = particle.color;
    if (particle.square) {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.life * 5);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return true;
  });

  flashes = flashes.filter((flash) => {
    flash.life -= deltaSeconds;
    flash.y -= 46 * deltaSeconds;
    if (flash.life <= 0) {
      return false;
    }

    ctx.save();
    ctx.globalAlpha = clamp(flash.life, 0, 1);
    ctx.fillStyle = flash.color;
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(flash.text, flash.x, flash.y);
    ctx.restore();
    return true;
  });
}

function updateScene(deltaSeconds) {
  if (!isStarted) {
    return;
  }

  spawnTimer -= deltaSeconds;
  if (spawnTimer <= 0) {
    createTarget();
    spawnTimer = randomBetween(0.3, 0.65);
  }

  targets = targets.filter((target) => {
    if (target.sliced) {
      return false;
    }
    target.y += target.speedY * deltaSeconds;
    target.x += target.driftX * deltaSeconds;
    target.rotation += target.rotationSpeed * deltaSeconds;

    const outLeft = target.x < -target.size * 2;
    const outRight = target.x > canvas.clientWidth + target.size * 2;
    const outBottom = target.y > canvas.clientHeight + target.size * 2;
    return !(outLeft || outRight || outBottom);
  });

  if (!wishToast.classList.contains("hidden")) {
    toastTimer -= deltaSeconds;
    if (toastTimer <= 0) {
      wishToast.classList.add("hidden");
      wishToast.textContent = "";
    }
  }
}

function render(deltaSeconds) {
  const stage = getStageRect();
  drawStageBackground(stage);
  targets.forEach(drawTarget);
  drawEffects(deltaSeconds);
  drawTrail();
}

function frame(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.032);
  lastTimestamp = timestamp;

  updateScene(deltaSeconds);
  render(deltaSeconds);
  pointerTrail = pointerTrail.filter((point) => timestamp - point.t < 150);

  window.requestAnimationFrame(frame);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    t: performance.now()
  };
}

function checkSlice(point) {
  if (pointerTrail.length < 2) {
    return;
  }

  const previous = pointerTrail[pointerTrail.length - 2];
  targets.forEach((target) => {
    if (target.sliced) {
      return;
    }
    const threshold = target.size * 0.55;
    const hitNow = distance(point, target) < threshold;
    const hitPrev = distance(previous, target) < threshold + 8;
    if (hitNow || hitPrev) {
      sliceTarget(target);
    }
  });
}

function beginSlice(event) {
  startExperience();
  activePointer = true;
  pointerTrail = [getCanvasPoint(event)];
}

function moveSlice(event) {
  if (!activePointer) {
    return;
  }

  const point = getCanvasPoint(event);
  pointerTrail.push(point);
  if (pointerTrail.length > 14) {
    pointerTrail.shift();
  }
  checkSlice(point);
}

function endSlice() {
  activePointer = false;
}

async function submitWish(payload) {
  if (!WEBHOOK_URL) {
    return { ok: true, demo: true };
  }

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function handleWishSubmit(event) {
  event.preventDefault();
  const formData = new FormData(wishForm);
  const name = String(formData.get("name") || "匿名").trim();
  const message = String(formData.get("message") || "").trim();

  if (!message) {
    formFeedback.textContent = "请先输入祝福。";
    return;
  }

  formFeedback.textContent = "发送中...";

  try {
    await submitWish({
      name,
      message,
      sliceCount,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    wishModal.classList.add("hidden");
    chestButton.classList.remove("hidden");
    formFeedback.textContent = "";
    wishForm.reset();
    wishToast.textContent = "谢谢！！！";
    wishToast.classList.remove("hidden");
    toastTimer = 3;
  } catch {
    formFeedback.textContent = "发送失败，请检查 API 配置或服务端连接。";
  }
}

function bindEvents() {
  window.addEventListener("resize", () => {
    resizeCanvas();
    initCodeRain();
  });
  startButton.addEventListener("click", startExperience);
  canvas.addEventListener("pointerdown", beginSlice);
  canvas.addEventListener("pointermove", moveSlice);
  canvas.addEventListener("pointerup", endSlice);
  canvas.addEventListener("pointerleave", endSlice);
  closeModalButton.addEventListener("click", () => {
    wishModal.classList.add("hidden");
    if (modalUnlocked) {
      chestButton.classList.remove("hidden");
    }
  });
  chestButton.addEventListener("click", () => {
    wishModal.classList.remove("hidden");
    chestButton.classList.add("hidden");
  });
  wishForm.addEventListener("submit", handleWishSubmit);
}

function init() {
  resizeCanvas();
  bindEvents();
  initCodeRain();
  window.requestAnimationFrame(frame);
}

init();
