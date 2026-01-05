// Toggle config panel
function toggleConfig() {
  const panel = document.getElementById("configPanel");
  panel.classList.toggle("show");
}

// Update slider display values
function updateSlider(type) {
  const sliders = {
    showMin: { slider: "showTimeMin", display: "showMinValue" },
    showMax: { slider: "showTimeMax", display: "showMaxValue" },
    spawnMin: { slider: "spawnIntervalMin", display: "spawnMinValue" },
    spawnMax: { slider: "spawnIntervalMax", display: "spawnMaxValue" },
  };

  const config = sliders[type];
  const value = document.getElementById(config.slider).value;
  document.getElementById(config.display).textContent = value + "ms";

  // Clear preset selection when manually adjusting
  document
    .querySelectorAll(".preset-btn")
    .forEach((btn) => btn.classList.remove("active"));
  updateDifficultyText();
}

// Calculate and update difficulty text
function updateDifficultyText() {
  const showMin = parseInt(document.getElementById("showTimeMin").value);
  const showMax = parseInt(document.getElementById("showTimeMax").value);
  const spawnMin = parseInt(document.getElementById("spawnIntervalMin").value);
  const spawnMax = parseInt(document.getElementById("spawnIntervalMax").value);

  // Calculate difficulty score (lower values = harder)
  const avgShow = (showMin + showMax) / 2;
  const avgSpawn = (spawnMin + spawnMax) / 2;
  const diffScore = (avgShow + avgSpawn) / 2;

  let difficulty, color;
  if (diffScore <= 700) {
    difficulty = "Insane 🔥";
    color = "#ff4444";
  } else if (diffScore <= 900) {
    difficulty = "Hard 💪";
    color = "#ff8844";
  } else if (diffScore <= 1100) {
    difficulty = "Medium ⚡";
    color = "#ffd700";
  } else if (diffScore <= 1400) {
    difficulty = "Easy 🌱";
    color = "#90ee90";
  } else {
    difficulty = "Relaxed 😌";
    color = "#87ceeb";
  }

  const diffText = document.getElementById("difficultyText");
  diffText.textContent = "Difficulty: " + difficulty;
  diffText.style.color = color;
}

// Preset configurations (Level 1 = easiest, Level 5 = hardest)
const presets = {
  1: {
    showMin: 1800,
    showMax: 2000,
    spawnMin: 1800,
    spawnMax: 2000,
    name: "Relaxed 😌",
  },
  2: {
    showMin: 1400,
    showMax: 1800,
    spawnMin: 1300,
    spawnMax: 1700,
    name: "Easy 🌱",
  },
  3: {
    showMin: 1000,
    showMax: 1000,
    spawnMin: 1000,
    spawnMax: 1000,
    name: "Medium ⚡",
  },
  4: {
    showMin: 700,
    showMax: 1000,
    spawnMin: 600,
    spawnMax: 900,
    name: "Hard 💪",
  },
  5: {
    showMin: 500,
    showMax: 700,
    spawnMin: 500,
    spawnMax: 700,
    name: "Insane 🔥",
  },
};

// Apply preset
function applyPreset(level) {
  const preset = presets[level];

  document.getElementById("showTimeMin").value = preset.showMin;
  document.getElementById("showTimeMax").value = preset.showMax;
  document.getElementById("spawnIntervalMin").value = preset.spawnMin;
  document.getElementById("spawnIntervalMax").value = preset.spawnMax;

  document.getElementById("showMinValue").textContent = preset.showMin + "ms";
  document.getElementById("showMaxValue").textContent = preset.showMax + "ms";
  document.getElementById("spawnMinValue").textContent = preset.spawnMin + "ms";
  document.getElementById("spawnMaxValue").textContent = preset.spawnMax + "ms";

  // Update active button
  document.querySelectorAll(".preset-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i + 1 === level);
  });

  updateDifficultyText();
}

// Apply settings and restart game
function applySettings() {
  const config = {
    showTimeMin: parseInt(document.getElementById("showTimeMin").value),
    showTimeMax: parseInt(document.getElementById("showTimeMax").value),
    spawnIntervalMin: parseInt(
      document.getElementById("spawnIntervalMin").value
    ),
    spawnIntervalMax: parseInt(
      document.getElementById("spawnIntervalMax").value
    ),
  };

  // Call game function to apply settings
  if (typeof applyGameConfig === "function") {
    applyGameConfig(config);
  }

  // Close panel
  document.getElementById("configPanel").classList.remove("show");
}

// Initialize with default preset
document.addEventListener("DOMContentLoaded", () => {
  applyPreset(3);
});
