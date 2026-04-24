const canvas = document.querySelector("#spaceCanvas");
const ctx = canvas.getContext("2d");
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const speedButtons = document.querySelectorAll("[data-speed]");
const scaleButtons = document.querySelectorAll("[data-scale]");
const earthLabel = document.querySelector(".earth-label");
const moonLabel = document.querySelector("#moonLabel");
const barycenterHotspot = document.querySelector("#barycenterHotspot");
const tidalHotspot = document.querySelector("#tidalHotspot");
const infoPanel = document.querySelector("#infoPanel");
const infoClose = document.querySelector("#infoClose");
const infoKicker = document.querySelector("#infoKicker");
const infoTitle = document.querySelector("#infoTitle");
const infoBody = document.querySelector("#infoBody");
const factCards = document.querySelectorAll(".fact-card");
const badgeCount = document.querySelector("#badgeCount");
const missionAnswer = document.querySelector("#missionAnswer");
const saveLog = document.querySelector("#saveLog");
const savedNote = document.querySelector("#savedNote");

let angle = -0.8;
let speed = 0.1;
let scaleMode = "diagram";
let paused = false;
let lastTime = performance.now();
let activeInfo = null;
const readCards = new Set();
const totalCards = factCards.length;
const earthSpinsPerMoonOrbit = 28;
const moonDistanceInEarthRadii = 60.3;
const moonRadiusToEarthRadius = 0.273;
const earthBarycenterOrbitToMoonOrbit = 1 / 82.3;
const earthImage = new Image();
const moonImage = new Image();

earthImage.src = "assets/earth-north-pole.png";
moonImage.src = "assets/moon-nearside.png";

const infoCopy = {
  earth: {
    kicker: "Our home planet",
    title: "Earth",
    body: "Earth is the planet we live on. It has liquid water, air, clouds, land, oceans, and life. In this model, Earth spins while it travels around the Earth-Moon balance point.",
  },
  moon: {
    kicker: "Earth's natural satellite",
    title: "Moon",
    body: "The Moon is a rocky world that orbits Earth. It is much smaller than Earth, but its gravity helps shape ocean tides and keeps a steady rhythm in our sky.",
  },
  barycenter: {
    kicker: "Balance point",
    title: "Barycenter",
    body: "Earth and the Moon both move around this shared balance point. The Moon is much lighter, so Earth only makes a tiny loop while the Moon makes a big one.",
  },
  tidal: {
    kicker: "Same side faces Earth",
    title: "Tidal Locking",
    body: "The Moon spins once during each orbit. That timing keeps the same near side pointed toward Earth all the way around.",
  },
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawEarth(x, y, radius, orbitAngle, shouldSpin) {
  const spinAngle = shouldSpin ? orbitAngle * earthSpinsPerMoonOrbit : 0;
  ctx.save();
  ctx.shadowColor = "rgba(65, 163, 255, 0.9)";
  ctx.shadowBlur = radius * 0.55;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  if (earthImage.complete && earthImage.naturalWidth > 0) {
    drawImageDisk(earthImage, x, y, radius, spinAngle);
  } else {
    ctx.fillStyle = "#1d8ce8";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const night = ctx.createLinearGradient(x - radius, y, x + radius, y);
  night.addColorStop(0, "rgba(0, 0, 0, 0)");
  night.addColorStop(0.58, "rgba(0, 0, 0, 0.02)");
  night.addColorStop(1, "rgba(0, 12, 36, 0.48)");
  ctx.fillStyle = night;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  ctx.strokeStyle = "rgba(167, 223, 255, 0.68)";
  ctx.lineWidth = Math.max(2, radius * 0.025);
  ctx.beginPath();
  ctx.arc(x, y, radius - ctx.lineWidth, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMoon(x, y, radius, earthX, earthY, shouldSpin, showNearSideMarker) {
  const earthDirection = Math.atan2(earthY - y, earthX - x);
  const spinAngle = shouldSpin ? earthDirection : 0;
  let nearSidePosition = null;
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.42)";
  ctx.shadowBlur = radius * 0.7;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  if (moonImage.complete && moonImage.naturalWidth > 0) {
    drawImageDisk(moonImage, x, y, radius, spinAngle);
  } else {
    ctx.fillStyle = "#cfd5dc";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  if (showNearSideMarker) {
    nearSidePosition = drawNearSideMarker(x, y, radius, earthX, earthY);
  }

  return nearSidePosition;
}

function drawImageDisk(image, x, y, radius, rotation) {
  const imageRadius = radius * 1.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(image, -imageRadius, -imageRadius, imageRadius * 2, imageRadius * 2);
  ctx.restore();
}

function drawNearSideMarker(moonX, moonY, moonRadius, earthX, earthY) {
  const direction = Math.atan2(earthY - moonY, earthX - moonX);
  const markerX = moonX + Math.cos(direction) * moonRadius * 0.58;
  const markerY = moonY + Math.sin(direction) * moonRadius * 0.58;

  ctx.save();
  ctx.strokeStyle = "rgba(255, 213, 91, 0.86)";
  ctx.fillStyle = "rgba(255, 213, 91, 0.95)";
  ctx.lineWidth = Math.max(2, moonRadius * 0.08);
  ctx.beginPath();
  ctx.arc(markerX, markerY, moonRadius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(markerX, markerY);
  ctx.lineTo(markerX + Math.cos(direction) * moonRadius * 0.42, markerY + Math.sin(direction) * moonRadius * 0.42);
  ctx.stroke();
  ctx.restore();

  return { x: markerX, y: markerY };
}

function drawOrbit(cx, cy, orbitRadius) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEarthOrbit(cx, cy, orbitRadius) {
  ctx.save();
  ctx.strokeStyle = "rgba(242, 184, 75, 0.34)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBarycenter(cx, cy, earthRadius) {
  const markerRadius = Math.max(2, Math.min(5, earthRadius * 0.08));

  ctx.save();
  ctx.fillStyle = "rgba(242, 184, 75, 0.96)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function getSystemGeometry(shortSide) {
  if (scaleMode === "true") {
    const moonOrbitRadius = shortSide * 0.39;
    const earthRadius = moonOrbitRadius / moonDistanceInEarthRadii;
    return {
      earthRadius,
      moonOrbitRadius,
      earthOrbitRadius: 0,
      moonRadius: earthRadius * moonRadiusToEarthRadius,
    };
  }

  const earthRadius = Math.max(54, shortSide * 0.12);
  const moonOrbitRadius = Math.max(135, shortSide * 0.31);
  return {
    earthRadius,
    moonOrbitRadius,
    earthOrbitRadius: Math.max(13, moonOrbitRadius * 0.07),
    moonRadius: Math.max(20, earthRadius * 0.31),
  };
}

function positionHotspot(element, x, y, isVisible) {
  element.classList.toggle("is-hidden", !isVisible);
  if (!isVisible) {
    return;
  }
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
}

function showInfo(kind) {
  if (activeInfo === kind) {
    hideInfo();
    return;
  }

  activeInfo = kind;
  infoKicker.textContent = infoCopy[kind].kicker;
  infoTitle.textContent = infoCopy[kind].title;
  infoBody.textContent = infoCopy[kind].body;
  infoPanel.classList.remove("is-hidden");
}

function hideInfo() {
  activeInfo = null;
  infoPanel.classList.add("is-hidden");
}

function render(time) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dt = Math.min(50, time - lastTime);
  lastTime = time;

  if (!paused) {
    angle += (dt / 1000) * speed;
  }

  ctx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.53;
  const shortSide = Math.min(width, height);
  const { earthRadius, moonOrbitRadius, earthOrbitRadius, moonRadius } = getSystemGeometry(shortSide);
  const earthX = cx - Math.cos(angle) * earthOrbitRadius;
  const earthY = cy - Math.sin(angle) * earthOrbitRadius;
  const moonX = cx + Math.cos(angle) * moonOrbitRadius;
  const moonY = cy + Math.sin(angle) * moonOrbitRadius;

  const isDiagramScale = scaleMode === "diagram";

  drawOrbit(cx, cy, moonOrbitRadius);
  if (isDiagramScale) {
    drawEarthOrbit(cx, cy, earthOrbitRadius);
  }
  drawEarth(earthX, earthY, earthRadius, angle, isDiagramScale);
  if (isDiagramScale) {
    drawBarycenter(cx, cy, earthRadius);
  }
  const tidalPosition = drawMoon(moonX, moonY, moonRadius, earthX, earthY, isDiagramScale, isDiagramScale);

  positionHotspot(barycenterHotspot, cx, cy, isDiagramScale);
  positionHotspot(tidalHotspot, tidalPosition?.x || 0, tidalPosition?.y || 0, isDiagramScale && Boolean(tidalPosition));
  if (!isDiagramScale && (activeInfo === "barycenter" || activeInfo === "tidal")) {
    hideInfo();
  }

  earthLabel.style.transform = `translate(${earthX - cx + earthRadius * 0.72}px, ${earthY - cy - earthRadius * 0.55}px)`;
  moonLabel.style.transform = `translate(${moonX - cx + moonRadius}px, ${moonY - cy - moonRadius * 2}px)`;

  requestAnimationFrame(render);
}

pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseIcon.textContent = paused ? "▶" : "II";
  pauseButton.setAttribute("aria-label", paused ? "Play orbit" : "Pause orbit");
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    speed = Number(button.dataset.speed);
    speedButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
  });
});

scaleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scaleMode = button.dataset.scale;
    if (activeInfo === "barycenter" || activeInfo === "tidal") {
      hideInfo();
    }
    scaleButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
  });
});

earthLabel.addEventListener("click", () => {
  showInfo("earth");
});

moonLabel.addEventListener("click", () => {
  showInfo("moon");
});

barycenterHotspot.addEventListener("click", () => {
  showInfo("barycenter");
});

tidalHotspot.addEventListener("click", () => {
  showInfo("tidal");
});

infoClose.addEventListener("click", hideInfo);

factCards.forEach((card) => {
  const title = card.querySelector(".card-title");
  title.addEventListener("click", () => {
    factCards.forEach((item) => item.classList.remove("is-open"));
    card.classList.add("is-open");
    card.classList.add("is-read");
    readCards.add(card.dataset.card);
    badgeCount.textContent = `${readCards.size}/${totalCards}`;
  });
});

saveLog.addEventListener("click", () => {
  const thought = missionAnswer.value.trim();
  if (!thought) {
    savedNote.textContent = "Try writing one thing you noticed.";
    return;
  }
  localStorage.setItem("wonderLabEarthMoonLog", thought);
  savedNote.textContent = "Saved.";
});

window.addEventListener("resize", resizeCanvas);

const savedThought = localStorage.getItem("wonderLabEarthMoonLog");
if (savedThought) {
  missionAnswer.value = savedThought;
}

resizeCanvas();
requestAnimationFrame(render);
