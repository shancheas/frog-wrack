// Game Configuration
const GAME_WIDTH = 600;
const GAME_HEIGHT = 600;
const HOLE_ROWS = 3;
const HOLE_COLS = 3;
const GAME_DURATION = 30;
const SPAWN_DURATION = 500;

// Configurable settings (defaults)
let gameConfig = {
  showTimeMin: 1000,
  showTimeMax: 1000,
  spawnIntervalMin: 1000,
  spawnIntervalMax: 1000,
};

// Game State
let score = 0;
let missed = 0;
let timeLeft = GAME_DURATION;
let gameRunning = false;
let holes = [];
let app;
let timerInterval = null;

// Sound
const whackSound = new Audio("assets/sounds/frog-croak.mp3");
whackSound.volume = 0.5;

// Background music
const bgMusic = new Audio("assets/sounds/backsound.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.3;
let isMuted = false;
let musicStarted = false;

// Play sound function (creates new instance for overlapping sounds)
function playWhackSound() {
  if (isMuted) return;
  const sound = whackSound.cloneNode();
  sound.volume = 0.5;
  sound.play().catch(() => {}); // Ignore autoplay errors
}

// Start background music (called on first user interaction)
function startBackgroundMusic() {
  if (musicStarted) return;
  musicStarted = true;
  if (!isMuted) {
    bgMusic.play().catch((e) => {
      console.error("Error playing background music:", e);
    });
  }
}

// Toggle mute
function toggleMute() {
  isMuted = !isMuted;

  if (isMuted) {
    bgMusic.pause();
  } else {
    if (musicStarted) {
      bgMusic.play().catch(() => {});
    }
  }

  // Update button icon
  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) {
    muteBtn.textContent = isMuted ? "🔇" : "🔊";
    muteBtn.title = isMuted ? "Unmute" : "Mute";
  }

  // Save preference
  localStorage.setItem("frogWhackMuted", isMuted);

  return isMuted;
}

// Load mute preference
function loadMutePreference() {
  const saved = localStorage.getItem("frogWhackMuted");
  if (saved === "true") {
    isMuted = true;
    const muteBtn = document.getElementById("muteBtn");
    if (muteBtn) {
      muteBtn.textContent = "🔇";
      muteBtn.title = "Unmute";
    }
  }
}

// Get mute state
function getMuteState() {
  return isMuted;
}

// Apply game configuration from settings panel
function applyGameConfig(config) {
  gameConfig = { ...gameConfig, ...config };
  restartGame();
}

// Restart the game with current config
function restartGame() {
  // Stop current game
  gameRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Clear all frogs
  holes.forEach((hole) => {
    if (hole.frogSprite) {
      app.stage.removeChild(hole.frogSprite);
      hole.frogSprite = null;
      hole.hasFrog = false;
    }
  });

  // Remove any overlays
  const children = [...app.stage.children];
  children.forEach((child) => {
    if (child.isOverlay) {
      app.stage.removeChild(child);
    }
  });

  // Reset and start
  startGame();
}

// Loading state
let loadingElements = null;

// Initialize PixiJS Application
async function initGame() {
  app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x1a472a,
    view: document.getElementById("game-canvas"),
    antialias: true,
  });

  // Show loading screen first
  showLoadingScreen();

  // Load assets with progress tracking
  await loadAssetsWithProgress();

  // Load mute preference
  loadMutePreference();

  // Create the game elements
  createBackground();
  createHoles();

  // Hide loading screen and show start menu
  hideLoadingScreen();

  // Show start menu
  showStartMenu();
}

// Show loading screen
function showLoadingScreen() {
  const elements = {};

  // Dark background
  elements.bg = new PIXI.Graphics();
  elements.bg.beginFill(0x1a472a);
  elements.bg.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  elements.bg.endFill();
  app.stage.addChild(elements.bg);

  // Title
  elements.title = new PIXI.Text("🐸 FROG WHACK!", {
    fontFamily: "Arial",
    fontSize: 42,
    fill: 0x90ee90,
    fontWeight: "bold",
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowDistance: 3,
  });
  elements.title.anchor.set(0.5);
  elements.title.x = GAME_WIDTH / 2;
  elements.title.y = 180;
  app.stage.addChild(elements.title);

  // Loading text
  elements.loadingText = new PIXI.Text("Loading...", {
    fontFamily: "Arial",
    fontSize: 20,
    fill: 0xffffff,
  });
  elements.loadingText.anchor.set(0.5);
  elements.loadingText.x = GAME_WIDTH / 2;
  elements.loadingText.y = GAME_HEIGHT / 2 - 50;
  app.stage.addChild(elements.loadingText);

  // Progress bar background
  const barWidth = 300;
  const barHeight = 30;
  const barX = (GAME_WIDTH - barWidth) / 2;
  const barY = GAME_HEIGHT / 2;

  elements.barBg = new PIXI.Graphics();
  elements.barBg.beginFill(0x2d5a3d);
  elements.barBg.drawRoundedRect(barX, barY, barWidth, barHeight, 15);
  elements.barBg.endFill();
  elements.barBg.lineStyle(3, 0x90ee90);
  elements.barBg.drawRoundedRect(barX, barY, barWidth, barHeight, 15);
  app.stage.addChild(elements.barBg);

  // Progress bar fill
  elements.barFill = new PIXI.Graphics();
  app.stage.addChild(elements.barFill);

  // Store bar dimensions for updates
  elements.barWidth = barWidth;
  elements.barHeight = barHeight;
  elements.barX = barX;
  elements.barY = barY;

  // Percentage text
  elements.percentText = new PIXI.Text("0%", {
    fontFamily: "Arial",
    fontSize: 16,
    fill: 0xffd700,
    fontWeight: "bold",
  });
  elements.percentText.anchor.set(0.5);
  elements.percentText.x = GAME_WIDTH / 2;
  elements.percentText.y = barY + barHeight + 25;
  app.stage.addChild(elements.percentText);

  // Tips text
  elements.tipText = new PIXI.Text(
    "💡 Tip: Tap frogs quickly for high scores!",
    {
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0x90ee90,
      fontStyle: "italic",
    }
  );
  elements.tipText.anchor.set(0.5);
  elements.tipText.x = GAME_WIDTH / 2;
  elements.tipText.y = GAME_HEIGHT - 100;
  app.stage.addChild(elements.tipText);

  loadingElements = elements;
}

// Update loading progress
function updateLoadingProgress(progress) {
  if (!loadingElements) return;

  const { barFill, barWidth, barHeight, barX, barY, percentText } =
    loadingElements;

  // Clear and redraw progress bar
  barFill.clear();
  barFill.beginFill(0x6b8e23);
  const fillWidth = Math.max(0, (barWidth - 6) * progress);
  barFill.drawRoundedRect(barX + 3, barY + 3, fillWidth, barHeight - 6, 12);
  barFill.endFill();

  // Update percentage text
  percentText.text = `${Math.round(progress * 100)}%`;

  // Add frog head indicator if loaded
  if (loadingElements.frogHead) {
    loadingElements.frogHead.x = barX + 3 + fillWidth;
  }
}

// Load assets with progress
async function loadAssetsWithProgress() {
  const assets = [
    { alias: "frog-head", src: "assets/frog-head.png" },
    { alias: "frog", src: "assets/frog.png" },
    { alias: "ghost", src: "assets/ghost.png" },
  ];

  // Add assets to loader
  for (const asset of assets) {
    PIXI.Assets.add(asset);
  }

  // Create a bundle
  PIXI.Assets.addBundle("gameAssets", assets);

  // First load the frog head for the progress indicator
  await PIXI.Assets.load("frog-head");

  // Create frog head indicator on progress bar
  const frogHead = PIXI.Sprite.from("frog-head");
  frogHead.anchor.set(0.5);
  frogHead.scale.set(0.08);
  frogHead.x = loadingElements.barX + 3;
  frogHead.y = loadingElements.barY + loadingElements.barHeight / 2;
  app.stage.addChild(frogHead);
  loadingElements.frogHead = frogHead;

  // Animate frog head
  let bounceTime = 0;
  const animateFrogHead = () => {
    if (!loadingElements) return;
    bounceTime += 0.1;
    frogHead.rotation = Math.sin(bounceTime) * 0.2;
    frogHead.scale.set(0.08 + Math.sin(bounceTime * 2) * 0.005);
    requestAnimationFrame(animateFrogHead);
  };
  animateFrogHead();

  // Load remaining assets with progress
  let loadedCount = 1; // frog-head already loaded
  const totalAssets = assets.length;

  updateLoadingProgress(loadedCount / totalAssets);

  // Simulate a bit of loading time for smooth progress
  await simulateDelay(200);

  for (let i = 1; i < assets.length; i++) {
    await PIXI.Assets.load(assets[i].alias);
    loadedCount++;
    updateLoadingProgress(loadedCount / totalAssets);
    await simulateDelay(150); // Small delay for visual feedback
  }

  // Load sounds
  updateLoadingProgress(0.9);
  loadingElements.loadingText.text = "Loading sounds...";

  // Preload sounds
  whackSound.load();
  bgMusic.load();

  await simulateDelay(300);

  // Final progress
  updateLoadingProgress(1);
  loadingElements.loadingText.text = "Ready!";

  await simulateDelay(500);
}

// Simulate delay for smooth loading
function simulateDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hide loading screen
function hideLoadingScreen() {
  if (!loadingElements) return;

  // Remove all loading elements
  Object.values(loadingElements).forEach((element) => {
    if (element && element.parent) {
      app.stage.removeChild(element);
    }
  });

  loadingElements = null;
}

// Show start menu
function showStartMenu() {
  // Semi-transparent overlay
  const overlay = new PIXI.Graphics();
  overlay.beginFill(0x000000, 0.6);
  overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  overlay.endFill();
  overlay.isOverlay = true;
  app.stage.addChild(overlay);

  // Title text
  const titleText = new PIXI.Text("🐸 FROG WHACK!", {
    fontFamily: "Arial",
    fontSize: 52,
    fill: 0x90ee90,
    fontWeight: "bold",
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowDistance: 4,
    dropShadowBlur: 4,
  });
  titleText.anchor.set(0.5);
  titleText.x = GAME_WIDTH / 2;
  titleText.y = 120;
  titleText.isOverlay = true;
  app.stage.addChild(titleText);

  // Frog sprite in menu
  const menuFrog = PIXI.Sprite.from("frog");
  menuFrog.anchor.set(0.5);
  menuFrog.x = GAME_WIDTH / 2;
  menuFrog.y = GAME_HEIGHT / 2 - 30;
  menuFrog.scale.set(0.25);
  menuFrog.isOverlay = true;
  app.stage.addChild(menuFrog);

  // Animate the frog (bouncing)
  let bounceTime = 0;
  const animateFrog = () => {
    if (!menuFrog.parent) return; // Stop if removed
    bounceTime += 0.05;
    menuFrog.y = GAME_HEIGHT / 2 - 30 + Math.sin(bounceTime) * 10;
    menuFrog.rotation = Math.sin(bounceTime * 0.5) * 0.1;
    requestAnimationFrame(animateFrog);
  };
  animateFrog();

  // Instructions text
  const instructionsText = new PIXI.Text("Tap the frogs before they hide!", {
    fontFamily: "Arial",
    fontSize: 18,
    fill: 0xffffff,
    fontWeight: "normal",
  });
  instructionsText.anchor.set(0.5);
  instructionsText.x = GAME_WIDTH / 2;
  instructionsText.y = GAME_HEIGHT / 2 + 80;
  instructionsText.isOverlay = true;
  app.stage.addChild(instructionsText);

  // Play button
  const playBtn = new PIXI.Graphics();
  playBtn.beginFill(0x6b8e23);
  playBtn.drawRoundedRect(-100, -30, 200, 60, 30);
  playBtn.endFill();
  playBtn.x = GAME_WIDTH / 2;
  playBtn.y = GAME_HEIGHT / 2 + 160;
  playBtn.eventMode = "static";
  playBtn.cursor = "pointer";
  playBtn.isOverlay = true;

  const playText = new PIXI.Text("▶  PLAY", {
    fontFamily: "Arial",
    fontSize: 28,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  playText.anchor.set(0.5);
  playBtn.addChild(playText);

  // Button hover effects
  playBtn.on("pointerover", () => {
    playBtn.tint = 0xaaffaa;
    playBtn.scale.set(1.05);
  });

  playBtn.on("pointerout", () => {
    playBtn.tint = 0xffffff;
    playBtn.scale.set(1);
  });

  // Play button click
  playBtn.on("pointerdown", () => {
    console.log("pointerdown");
    // Start music on play
    startBackgroundMusic();

    // Remove all menu elements
    app.stage.removeChild(overlay);
    app.stage.removeChild(titleText);
    app.stage.removeChild(menuFrog);
    app.stage.removeChild(instructionsText);
    app.stage.removeChild(playBtn);

    // Start the game
    startGame();
  });

  app.stage.addChild(playBtn);

  // Add pulsing animation to play button
  let pulseTime = 0;
  const pulseButton = () => {
    if (!playBtn.parent) return;
    pulseTime += 0.03;
    const scale = 1 + Math.sin(pulseTime) * 0.03;
    if (playBtn.scale.x === 1 || playBtn.scale.x === scale) {
      playBtn.scale.set(scale);
    }
    requestAnimationFrame(pulseButton);
  };
  pulseButton();
}

// Create yard-like background with grass texture
function createBackground() {
  // Main grass background
  const grass = new PIXI.Graphics();
  grass.beginFill(0x4a7c23);
  grass.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  grass.endFill();
  app.stage.addChild(grass);

  // Add grass texture pattern
  for (let i = 0; i < 100; i++) {
    const blade = new PIXI.Graphics();
    const x = Math.random() * GAME_WIDTH;
    const y = Math.random() * GAME_HEIGHT;
    const height = 8 + Math.random() * 15;

    blade.lineStyle(2, 0x3d6b1c, 0.6);
    blade.moveTo(x, y);
    blade.lineTo(x + (Math.random() - 0.5) * 6, y - height);
    app.stage.addChild(blade);
  }

  // Add some decorative elements (small flowers)
  for (let i = 0; i < 20; i++) {
    const flower = new PIXI.Graphics();
    const x = Math.random() * GAME_WIDTH;
    const y = Math.random() * GAME_HEIGHT;

    // Check if flower is not too close to hole positions
    const holeSpacing = GAME_WIDTH / (HOLE_COLS + 1);
    const isNearHole = holes.some((h) => {
      const dist = Math.sqrt(Math.pow(x - h?.x, 2) + Math.pow(y - h?.y, 2));
      return dist < 80;
    });

    if (!isNearHole) {
      flower.beginFill(Math.random() > 0.5 ? 0xffff00 : 0xffffff);
      flower.drawCircle(x, y, 3);
      flower.endFill();
      app.stage.addChild(flower);
    }
  }
}

// Create 9 holes in a 3x3 grid
function createHoles() {
  const holeWidth = 100;
  const holeHeight = 50;
  const spacingX = GAME_WIDTH / (HOLE_COLS + 1);
  const spacingY = GAME_HEIGHT / (HOLE_ROWS + 1);

  for (let row = 0; row < HOLE_ROWS; row++) {
    for (let col = 0; col < HOLE_COLS; col++) {
      const x = spacingX * (col + 1);
      const y = spacingY * (row + 1);

      // Create hole container
      const holeContainer = new PIXI.Container();
      holeContainer.x = x;
      holeContainer.y = y;

      // Draw hole shadow (darker brown)
      const holeShadow = new PIXI.Graphics();
      holeShadow.beginFill(0x2d1810);
      holeShadow.drawEllipse(0, 5, holeWidth / 2 + 5, holeHeight / 2 + 3);
      holeShadow.endFill();
      holeContainer.addChild(holeShadow);

      // Draw main hole (brown)
      const hole = new PIXI.Graphics();
      hole.beginFill(0x4a2c17);
      hole.drawEllipse(0, 0, holeWidth / 2, holeHeight / 2);
      hole.endFill();
      holeContainer.addChild(hole);

      // Draw hole rim (lighter brown)
      const holeRim = new PIXI.Graphics();
      holeRim.lineStyle(6, 0x6b4423);
      holeRim.drawEllipse(0, 0, holeWidth / 2, holeHeight / 2);
      holeContainer.addChild(holeRim);

      // Inner dark part
      const innerHole = new PIXI.Graphics();
      innerHole.beginFill(0x1a0f0a);
      innerHole.drawEllipse(0, 0, holeWidth / 2 - 15, holeHeight / 2 - 8);
      innerHole.endFill();
      holeContainer.addChild(innerHole);

      app.stage.addChild(holeContainer);

      // Store hole data
      holes.push({
        container: holeContainer,
        x: x,
        y: y,
        hasFrog: false,
        frogSprite: null,
      });
    }
  }
}

// Spawn a frog in a random empty hole
function spawnFrog() {
  if (!gameRunning) return;

  // Find empty holes
  const emptyHoles = holes.filter((h) => !h.hasFrog);
  if (emptyHoles.length === 0) return;

  // Pick random empty hole
  const hole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
  hole.hasFrog = true;

  // Create frog sprite
  const frog = PIXI.Sprite.from("frog");
  frog.anchor.set(0.5, 0.8);
  frog.x = hole.x;
  frog.y = hole.y - 20;
  frog.width = 80;
  frog.height = 80;
  frog.alpha = 0;
  frog.scale.set(0.5);
  frog.eventMode = "static";
  frog.cursor = "pointer";

  // Store reference
  hole.frogSprite = frog;

  // Click handler
  frog.on("pointerdown", () => {
    if (hole.hasFrog && !frog.isWhacked) {
      whackFrog(hole, frog);
    }
  });

  app.stage.addChild(frog);

  // Pop-up animation
  const popUpDuration = SPAWN_DURATION;
  const startTime = Date.now();

  const popUp = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / popUpDuration, 1);

    // Bounce easing
    const bounce = 1 - Math.pow(1 - progress, 3);
    frog.alpha = bounce;
    frog.scale.set(0.15 * bounce);
    frog.y = hole.y - 20 - 30 * bounce;

    if (progress < 1) {
      requestAnimationFrame(popUp);
    } else {
      // Start hide timer using config values
      const showTime =
        gameConfig.showTimeMin +
        Math.random() * (gameConfig.showTimeMax - gameConfig.showTimeMin);
      setTimeout(() => {
        if (hole.hasFrog && !frog.isWhacked) {
          hideFrog(hole, frog, true);
        }
      }, showTime);
    }
  };

  popUp();
}

// Whack a frog (successful hit)
function whackFrog(hole, frog) {
  frog.isWhacked = true;
  score++;
  updateScoreDisplay();

  // Play whack sound
  playWhackSound();

  // Create ghost sprite
  const ghost = PIXI.Sprite.from("ghost");
  ghost.anchor.set(0.5);
  ghost.x = frog.x;
  ghost.y = frog.y - 20;
  ghost.width = 70;
  ghost.height = 70;
  ghost.alpha = 1;
  app.stage.addChild(ghost);

  // Remove frog immediately
  app.stage.removeChild(frog);
  hole.frogSprite = null;
  hole.hasFrog = false;

  // Ghost float up and fade out animation
  const animDuration = 600;
  const startTime = Date.now();
  const startY = ghost.y;

  const animateGhost = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / animDuration, 1);

    // Float up
    ghost.y = startY - 50 * progress;

    // Fade out with ease
    ghost.alpha = 1 - Math.pow(progress, 2);

    // Slight wobble
    ghost.rotation = Math.sin(progress * Math.PI * 4) * 0.1;

    // Scale up slightly
    ghost.scale.set(0.14 * (1 + progress * 0.3));

    if (progress < 1) {
      requestAnimationFrame(animateGhost);
    } else {
      app.stage.removeChild(ghost);
    }
  };

  animateGhost();

  // Play hit effect (screen shake)
  const originalX = app.stage.x;
  const originalY = app.stage.y;
  let shakeCount = 0;

  const shake = () => {
    if (shakeCount < 6) {
      app.stage.x = originalX + (Math.random() - 0.5) * 8;
      app.stage.y = originalY + (Math.random() - 0.5) * 8;
      shakeCount++;
      setTimeout(shake, 30);
    } else {
      app.stage.x = originalX;
      app.stage.y = originalY;
    }
  };
  shake();
}

// Hide frog (missed or escaped)
function hideFrog(hole, frog, wasMissed = false) {
  if (!hole.hasFrog) return;

  hole.hasFrog = false;
  hole.frogSprite = null;

  if (wasMissed && gameRunning) {
    missed++;
    updateScoreDisplay();
  }

  // Hide animation
  const hideDuration = 150;
  const startTime = Date.now();
  const startY = frog.y;
  const startAlpha = frog.alpha;

  const hideAnim = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / hideDuration, 1);

    frog.alpha = startAlpha * (1 - progress);
    frog.y = startY + 20 * progress;
    frog.scale.set(0.15 * (1 - progress * 0.5));

    if (progress < 1) {
      requestAnimationFrame(hideAnim);
    } else {
      app.stage.removeChild(frog);
    }
  };

  hideAnim();
}

// Update score display
function updateScoreDisplay() {
  document.getElementById("score").textContent = score;
  document.getElementById("missed").textContent = missed;
}

// Start the game
function startGame() {
  gameRunning = true;
  score = 0;
  missed = 0;
  timeLeft = GAME_DURATION;
  updateScoreDisplay();
  document.getElementById("timer").textContent = timeLeft;

  // Timer countdown
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      endGame();
    }
  }, 1000);

  // Spawn frogs at random intervals using config values
  const scheduleNextSpawn = () => {
    if (!gameRunning) return;

    const interval =
      gameConfig.spawnIntervalMin +
      Math.random() *
        (gameConfig.spawnIntervalMax - gameConfig.spawnIntervalMin);
    setTimeout(() => {
      spawnFrog();
      scheduleNextSpawn();
    }, interval);
  };

  // Start spawning
  spawnFrog();
  scheduleNextSpawn();
}

// End the game
function endGame() {
  gameRunning = false;

  // Clear all frogs
  holes.forEach((hole) => {
    if (hole.frogSprite) {
      app.stage.removeChild(hole.frogSprite);
      hole.frogSprite = null;
      hole.hasFrog = false;
    }
  });

  // Show game over overlay
  const overlay = new PIXI.Graphics();
  overlay.beginFill(0x000000, 0.7);
  overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  overlay.endFill();
  overlay.isOverlay = true;
  app.stage.addChild(overlay);

  // Game over text
  const gameOverText = new PIXI.Text("GAME OVER!", {
    fontFamily: "Arial",
    fontSize: 48,
    fill: 0xffffff,
    fontWeight: "bold",
    dropShadow: true,
    dropShadowColor: 0x000000,
    dropShadowDistance: 4,
  });
  gameOverText.anchor.set(0.5);
  gameOverText.x = GAME_WIDTH / 2;
  gameOverText.y = GAME_HEIGHT / 2 - 60;
  gameOverText.isOverlay = true;
  app.stage.addChild(gameOverText);

  // Score text
  const scoreText = new PIXI.Text(`Score: ${score}`, {
    fontFamily: "Arial",
    fontSize: 36,
    fill: 0xffd700,
    fontWeight: "bold",
  });
  scoreText.anchor.set(0.5);
  scoreText.x = GAME_WIDTH / 2;
  scoreText.y = GAME_HEIGHT / 2;
  scoreText.isOverlay = true;
  app.stage.addChild(scoreText);

  // Restart button
  const restartBtn = new PIXI.Graphics();
  restartBtn.beginFill(0x6b8e23);
  restartBtn.drawRoundedRect(-80, -25, 160, 50, 25);
  restartBtn.endFill();
  restartBtn.x = GAME_WIDTH / 2;
  restartBtn.y = GAME_HEIGHT / 2 + 60;
  restartBtn.eventMode = "static";
  restartBtn.cursor = "pointer";
  restartBtn.isOverlay = true;

  const restartText = new PIXI.Text("▶  PLAY AGAIN", {
    fontFamily: "Arial",
    fontSize: 18,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  restartText.anchor.set(0.5);
  restartBtn.addChild(restartText);

  restartBtn.on("pointerdown", () => {
    removeGameOverOverlay();
    startGame();
  });

  restartBtn.on("pointerover", () => {
    restartBtn.tint = 0xaaffaa;
    restartBtn.scale.set(1.05);
  });

  restartBtn.on("pointerout", () => {
    restartBtn.tint = 0xffffff;
    restartBtn.scale.set(1);
  });

  app.stage.addChild(restartBtn);

  // Menu button
  const menuBtn = new PIXI.Graphics();
  menuBtn.beginFill(0x4a5568);
  menuBtn.drawRoundedRect(-80, -25, 160, 50, 25);
  menuBtn.endFill();
  menuBtn.x = GAME_WIDTH / 2;
  menuBtn.y = GAME_HEIGHT / 2 + 125;
  menuBtn.eventMode = "static";
  menuBtn.cursor = "pointer";
  menuBtn.isOverlay = true;

  const menuText = new PIXI.Text("🏠  MENU", {
    fontFamily: "Arial",
    fontSize: 18,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  menuText.anchor.set(0.5);
  menuBtn.addChild(menuText);

  menuBtn.on("pointerdown", () => {
    removeGameOverOverlay();
    showStartMenu();
  });

  menuBtn.on("pointerover", () => {
    menuBtn.tint = 0xcccccc;
    menuBtn.scale.set(1.05);
  });

  menuBtn.on("pointerout", () => {
    menuBtn.tint = 0xffffff;
    menuBtn.scale.set(1);
  });

  app.stage.addChild(menuBtn);

  // Helper to remove game over overlay
  function removeGameOverOverlay() {
    app.stage.removeChild(overlay);
    app.stage.removeChild(gameOverText);
    app.stage.removeChild(scoreText);
    app.stage.removeChild(restartBtn);
    app.stage.removeChild(menuBtn);
  }
}

// Initialize when page loads
window.addEventListener("load", initGame);
