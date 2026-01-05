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

// Play sound function (creates new instance for overlapping sounds)
function playWhackSound() {
  const sound = whackSound.cloneNode();
  sound.volume = 0.5;
  sound.play().catch(() => {}); // Ignore autoplay errors
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

// Initialize PixiJS Application
async function initGame() {
  app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x4a7c23,
    view: document.getElementById("game-canvas"),
    antialias: true,
  });

  // Load assets
  await PIXI.Assets.load([
    { alias: "frog", src: "assets/frog.png" },
    { alias: "ghost", src: "assets/ghost.png" },
  ]);

  // Create the game
  createBackground();
  createHoles();
  startGame();
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
  restartBtn.beginFill(0x4a7c23);
  restartBtn.drawRoundedRect(-80, -25, 160, 50, 25);
  restartBtn.endFill();
  restartBtn.x = GAME_WIDTH / 2;
  restartBtn.y = GAME_HEIGHT / 2 + 70;
  restartBtn.eventMode = "static";
  restartBtn.cursor = "pointer";
  restartBtn.isOverlay = true;

  const restartText = new PIXI.Text("PLAY AGAIN", {
    fontFamily: "Arial",
    fontSize: 20,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  restartText.anchor.set(0.5);
  restartBtn.addChild(restartText);

  restartBtn.on("pointerdown", () => {
    app.stage.removeChild(overlay);
    app.stage.removeChild(gameOverText);
    app.stage.removeChild(scoreText);
    app.stage.removeChild(restartBtn);
    startGame();
  });

  restartBtn.on("pointerover", () => {
    restartBtn.tint = 0xcccccc;
  });

  restartBtn.on("pointerout", () => {
    restartBtn.tint = 0xffffff;
  });

  app.stage.addChild(restartBtn);
}

// Initialize when page loads
window.addEventListener("load", initGame);
