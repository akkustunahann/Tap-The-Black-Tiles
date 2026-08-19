
const GRID_SIZE = 4;

const GAME_TIME_MS = 10000;
const TICK_MS = 50;
const HS_KEY = "ctis255_hiscore";

const BLACK_COUNT = 3;

const POINT_WINDOW_MS = 1000; 
const MAX_P = 10;
const MIN_P = 1;

function pointsFromPercent(pct) {
  const p = Math.round(MIN_P + (pct / 100) * (MAX_P - MIN_P));
  return Math.max(MIN_P, Math.min(MAX_P, p));
}

const membersScreen = document.getElementById("membersScreen");
const gameScreen = document.getElementById("gameScreen");
const membersCard = document.getElementById("membersCard");

const board = document.getElementById("board");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const hiScoreEl = document.getElementById("hiScore");
const pointsBar = document.getElementById("pointsBar"); 
const centerMsg = document.getElementById("centerMsg");
const bottomHint = document.getElementById("bottomHint");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNum = document.getElementById("countdownNum");
const gainEl = document.getElementById("gain");

let tiles = [];
let blackSet = new Set();  

let score = 0;
let hiScore = 0;

let gameRunning = false;
let gameOver = false;

let remainingGameMs = GAME_TIME_MS;
let gameTickId = null;

let remainingPointMs = POINT_WINDOW_MS;
let pointsTickId = null;

let lastHitIdx = -1;

hiScore = loadHighScore();
hiScoreEl.textContent = String(hiScore);

buildBoard();
board.classList.add("disabled");

membersCard.addEventListener("click", () => {
  membersScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  startCountdownAndGame();
});

function buildBoard() {
  board.innerHTML = "";
  tiles = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const t = document.createElement("div");
    t.className = "tile";
    t.dataset.index = i;
    t.addEventListener("click", onTileClick);
    board.appendChild(t);
    tiles.push(t);
  }
}

function clearAllTiles() {
  tiles.forEach(t => t.classList.remove("black", "correct", "wrong"));
  blackSet.clear();
}

function startCountdownAndGame() {
  stopAllTimers();

  gameRunning = false;
  gameOver = false;

  score = 0;
  scoreEl.textContent = "0";
  hideGain();

  remainingGameMs = GAME_TIME_MS;
  updateGameTimeUI();

  clearAllTiles();
  board.classList.add("disabled");

  bottomHint.classList.add("hidden");
  hideCenterMsg();

  resetPointsBar();

  countdownOverlay.classList.remove("hidden");
  let n = 3;
  countdownNum.textContent = String(n);

  const cdId = setInterval(() => {
    n--;
    if (n <= 0) {
      clearInterval(cdId);
      countdownOverlay.classList.add("hidden");
      startGame();
    } else {
      countdownNum.textContent = String(n);
    }
  }, 1000);
}

function startGame() {
  clearAllTiles();
  board.classList.remove("disabled");

  gameRunning = true;
  gameOver = false;

  showTapMessage();

  setTimeout(() => {
    if (!gameRunning || gameOver) return;
    spawnInitialBlackTiles();
  }, 300);

  gameTickId = setInterval(tickGameTime, TICK_MS);

  pointsTickId = setInterval(tickPointsBar, TICK_MS);
}

function tickGameTime() {
  if (!gameRunning || gameOver) return;

  remainingGameMs -= TICK_MS;
  if (remainingGameMs < 0) remainingGameMs = 0;

  updateGameTimeUI();

  if (remainingGameMs === 0) endGame();
}

function updateGameTimeUI() {
  const secs = Math.ceil(remainingGameMs / 1000);
  timeEl.textContent = String(secs);
}

function resetPointsBar() {
  remainingPointMs = POINT_WINDOW_MS;
  renderPointsBar();
}

function tickPointsBar() {
  if (!gameRunning || gameOver) return;

  remainingPointMs -= TICK_MS;
  if (remainingPointMs < 0) remainingPointMs = 0;

  renderPointsBar();
}

function renderPointsBar() {
  const pct = (remainingPointMs / POINT_WINDOW_MS) * 100;
  pointsBar.style.width = pct + "%";
}

function currentPointsValue() {
  const pct = (remainingPointMs / POINT_WINDOW_MS) * 100;
  return pointsFromPercent(pct);
}

function spawnInitialBlackTiles() {
  while (blackSet.size < BLACK_COUNT) {
    const idx = Math.floor(Math.random() * tiles.length);
    if (!blackSet.has(idx)) {
      blackSet.add(idx);
      tiles[idx].classList.add("black");
    }
  }
}

function spawnOneBlackTile() {
  if (blackSet.size >= BLACK_COUNT) return;

  let idx = Math.floor(Math.random() * tiles.length);
  let safety = 0;
  while (blackSet.has(idx)) {
    idx = Math.floor(Math.random() * tiles.length);
    safety++;
    if (safety > 500) break;
  }

  if (!blackSet.has(idx)) {
    blackSet.add(idx);
    tiles[idx].classList.add("black");
  }
}

function onTileClick(e) {
  if (!gameRunning || gameOver) return;

  const idx = Number(e.currentTarget.dataset.index);

  if (blackSet.has(idx)) {
    const pts = currentPointsValue();
    lastHitIdx = idx;   


    
    score += pts;
    scoreEl.textContent = String(score);
    
    showPointsOnTile(idx, pts);
    
    hideGain();
    

    tiles[idx].classList.remove("black");
    tiles[idx].classList.add("correct");
    setTimeout(() => tiles[idx].classList.remove("correct"), 150);

    blackSet.delete(idx);

    spawnOneBlackTile();

    resetPointsBar();

    hideCenterMsg();
    return;
  }

  tiles[idx].classList.add("wrong");
  setTimeout(() => tiles[idx].classList.remove("wrong"), 120);
}

function endGame() {
  gameRunning = false;
  gameOver = true;

  board.classList.add("disabled");
  stopAllTimers();

  if (score > hiScore) {
    hiScore = score;
    hiScoreEl.textContent = String(hiScore);
    saveHighScore(hiScore);
    showCenterMsg("New Hi-Score!", false);
  
    confetti({
      particleCount: 180,
      spread: 70,
      origin: { y: 0.65 }
    });
  } else {
    showCenterMsg("Time is up", false);
  }
  

  bottomHint.classList.remove("hidden");
}

function stopAllTimers() {
  if (gameTickId) clearInterval(gameTickId);
  if (pointsTickId) clearInterval(pointsTickId);
  gameTickId = null;
  pointsTickId = null;
}

function showTapMessage() {
  centerMsg.textContent = "Tap the black tiles!";
  centerMsg.classList.remove("hidden");
  centerMsg.classList.add("soft");
  setTimeout(() => hideCenterMsg(), 900);
}

function showCenterMsg(text, soft) {
  centerMsg.textContent = text;
  centerMsg.classList.remove("hidden");
  if (soft) centerMsg.classList.add("soft");
  else centerMsg.classList.remove("soft");
}

function hideCenterMsg() {
  centerMsg.classList.add("hidden");
}

function showGain(text) {
  gainEl.textContent = text;
  gainEl.classList.remove("hidden");
  setTimeout(() => hideGain(), 400);
}
function hideGain() {
  gainEl.classList.add("hidden");
}

function showPointsOnTile(tileIndex, pts) {
  const t = tiles[tileIndex];

  const old = t.querySelector(".tilePoints");
  if (old) old.remove();

  const s = document.createElement("span");
  s.className = "tilePoints";
  s.textContent = "+" + pts;
  t.appendChild(s);

  setTimeout(() => {
    if (s.parentNode) s.parentNode.removeChild(s);
  }, 450);
}


function loadHighScore() {
  return Number(localStorage.getItem(HS_KEY) || 0);
}
function saveHighScore(v) {
  localStorage.setItem(HS_KEY, String(v));
}
