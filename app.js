/* ==========================================================================
   PC-3104 Retro Pixel Studio - Application Engine (app.js)
   ========================================================================== */

// --- Retro Sound Effects Engine (Web Audio API) ---
const SoundFX = {
  ctx: null,
  enabled: true,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  },

  playClick() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  },

  playTabClick() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(900, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  },

  playRenderChime() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const now = this.ctx.currentTime;
    // Nostalgic PC-3104 FM Chime arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const noteDuration = 0.08;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      gain.gain.setValueAtTime(0, now + idx * noteDuration);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * noteDuration + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * noteDuration + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * noteDuration);
      osc.stop(now + idx * noteDuration + 0.25);
    });
  },

  playBeepAlert() {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },

  playThunder() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    
    const now = this.ctx.currentTime;
    
    // Create oscillator for low-frequency rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 1.8);
    
    // Lowpass filter to make it muddy and deep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(20, now + 1.8);
    
    // Noise buffer for the lightning crack & storm hiss
    const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseGain = this.ctx.createGain();
    
    // Envelope for lightning crack
    noiseGain.gain.setValueAtTime(0.12, now); // loud crack
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // quick crack decay
    
    // Envelope for deep rumble
    oscGain.gain.setValueAtTime(0.15, now);
    oscGain.gain.linearRampToValueAtTime(0.25, now + 0.1); // rumble grows slightly
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // slow rumble fade
    
    // Connect
    noise.connect(noiseGain);
    noiseGain.connect(filter);
    
    osc.connect(oscGain);
    oscGain.connect(filter);
    
    filter.connect(this.ctx.destination);
    
    noise.start(now);
    noise.stop(now + 2.0);
    
    osc.start(now);
    osc.stop(now + 2.0);
  }
};

// --- Preset Palettes Configuration ---
const PalettePresets = {
  // PC-3104 Legend System 16-color Analog Palette (Internal fallback)
  "pc98-system": [
    { r: 0, g: 0, b: 0 },       // Black
    { r: 0, g: 0, b: 128 },     // Dark Blue
    { r: 0, g: 128, b: 0 },     // Dark Green
    { r: 0, g: 128, b: 128 },   // Dark Cyan
    { r: 128, g: 0, b: 0 },     // Dark Red
    { r: 128, g: 0, b: 128 },   // Dark Magenta
    { r: 128, g: 128, b: 0 },   // Dark Yellow
    { r: 192, g: 192, b: 192 }, // Light Gray
    { r: 128, g: 128, b: 128 }, // Dark Gray
    { r: 0, g: 0, b: 255 },     // Blue
    { r: 0, g: 255, b: 0 },     // Green
    { r: 0, g: 255, b: 255 },   // Cyan
    { r: 255, g: 0, b: 0 },     // Red
    { r: 255, g: 0, b: 255 },   // Magenta
    { r: 255, g: 255, b: 0 },   // Yellow
    { r: 255, g: 255, b: 255 }  // White
  ],

  // スー◯ァミ風 Vibrant 16-bit SNES style palette (64 rich colors)
  "snes": [
    { r: 0, g: 0, b: 0 }, { r: 32, g: 32, b: 32 }, { r: 64, g: 64, b: 64 }, { r: 128, g: 128, b: 128 },
    { r: 192, g: 192, b: 192 }, { r: 255, g: 255, b: 255 }, { r: 255, g: 0, b: 0 }, { r: 128, g: 0, b: 0 },
    { r: 255, g: 128, b: 128 }, { r: 255, g: 0, b: 255 }, { r: 128, g: 0, b: 128 }, { r: 255, g: 128, b: 255 },
    { r: 0, g: 0, b: 255 }, { r: 0, g: 0, b: 128 }, { r: 128, g: 128, b: 255 }, { r: 0, g: 255, b: 255 },
    { r: 0, g: 128, b: 128 }, { r: 128, g: 255, b: 255 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 128, b: 0 },
    { r: 128, g: 255, b: 128 }, { r: 255, g: 255, b: 0 }, { r: 128, g: 128, b: 0 }, { r: 255, g: 255, b: 128 },
    { r: 255, g: 128, b: 0 }, { r: 128, g: 64, b: 0 }, { r: 255, g: 192, b: 128 }, { r: 255, g: 0, b: 128 },
    { r: 128, g: 0, b: 64 }, { r: 0, g: 128, b: 255 }, { r: 0, g: 64, b: 128 }, { r: 128, g: 192, b: 255 },
    { r: 128, g: 0, b: 255 }, { r: 64, g: 0, b: 128 }, { r: 192, g: 128, b: 255 }, { r: 0, g: 255, b: 128 },
    { r: 0, g: 128, b: 64 }, { r: 128, g: 255, b: 192 }, { r: 128, g: 255, b: 0 }, { r: 64, g: 128, b: 0 },
    { r: 192, g: 255, b: 128 }, { r: 255, g: 128, b: 255 }, { r: 128, g: 64, b: 128 }, { r: 255, g: 192, b: 255 },
    { r: 128, g: 64, b: 64 }, { r: 64, g: 32, b: 32 }, { r: 192, g: 128, b: 128 }, { r: 64, g: 64, b: 128 },
    { r: 32, g: 32, b: 64 }, { r: 128, g: 128, b: 192 }, { r: 64, g: 128, b: 128 }, { r: 32, g: 64, b: 64 },
    { r: 128, g: 192, b: 192 }, { r: 128, g: 128, b: 64 }, { r: 64, g: 64, b: 32 }, { r: 192, g: 192, b: 128 },
    { r: 128, g: 64, b: 0 }, { r: 96, g: 48, b: 0 }, { r: 192, g: 128, b: 64 }, { r: 96, g: 96, b: 96 },
    { r: 160, g: 160, b: 160 }, { r: 224, g: 224, b: 224 }, { r: 40, g: 80, b: 40 }, { r: 16, g: 48, b: 16 }
  ],

  // ゲーム◯ーイ風 Classic DMG green shades (4 colors)
  "gameboy": [
    { r: 15, g: 56, b: 15 },
    { r: 48, g: 98, b: 48 },
    { r: 139, g: 172, b: 15 },
    { r: 155, g: 188, b: 15 }
  ],

  // アーケードゲーム風 High contrast vibrant arcade tones (32 colors)
  "arcade": [
    { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 0 }, { r: 255, g: 0, b: 255 }, { r: 0, g: 255, b: 255 },
    { r: 255, g: 128, b: 0 }, { r: 255, g: 0, b: 128 }, { r: 128, g: 0, b: 255 }, { r: 0, g: 128, b: 255 },
    { r: 0, g: 255, b: 128 }, { r: 128, g: 255, b: 0 }, { r: 255, g: 200, b: 0 }, { r: 200, g: 0, b: 255 },
    { r: 128, g: 128, b: 128 }, { r: 64, g: 64, b: 64 }, { r: 192, g: 192, b: 192 }, { r: 128, g: 0, b: 0 },
    { r: 0, g: 128, b: 0 }, { r: 0, g: 0, b: 128 }, { r: 128, g: 128, b: 0 }, { r: 128, g: 0, b: 128 },
    { r: 0, g: 128, b: 128 }, { r: 128, g: 64, b: 0 }, { r: 255, g: 128, b: 255 }, { r: 128, g: 255, b: 255 },
    { r: 255, g: 255, b: 128 }, { r: 64, g: 0, b: 64 }, { r: 0, g: 64, b: 64 }, { r: 64, g: 64, b: 0 }
  ],

  // ゆめかわ (16色) Soft dreamy pastel decora palette
  "yumekawa": [
    { r: 255, g: 209, b: 220 }, // Soft pink
    { r: 255, g: 183, b: 197 }, // Sweet pink
    { r: 255, g: 229, b: 236 }, // Light milk pink
    { r: 232, g: 223, b: 245 }, // Lavender
    { r: 216, g: 178, b: 209 }, // Soft lilac
    { r: 221, g: 255, b: 217 }, // Mint green
    { r: 193, g: 235, b: 208 }, // Soft mint
    { r: 240, g: 248, b: 255 }, // Alice blue
    { r: 196, g: 250, b: 248 }, // Baby blue
    { r: 253, g: 253, b: 150 }, // Pastel yellow
    { r: 255, g: 254, b: 200 }, // Cream yellow
    { r: 255, g: 216, b: 177 }, // Pastel orange
    { r: 255, g: 240, b: 245 }, // Lavender blush
    { r: 255, g: 255, b: 255 }, // Pure white
    { r: 234, g: 230, b: 232 }, // Pale grey
    { r: 200, g: 200, b: 230 }  // Soft pastel indigo
  ]
};

// Bayer 8x8 Ordered Dithering Matrix
const Bayer8x8Matrix = [
  [ 0, 48, 12, 60,  3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [ 8, 56,  4, 52, 11, 59,  7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [ 2, 50, 14, 62,  1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58,  6, 54,  9, 57,  5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21]
];

// --- App State ---
const State = {
  sourceImage: null,      // Original uploaded Image object
  rotatedCanvas: null,    // Canvas containing the rotated image
  currentRotation: 0,     // 0, 90, 180, 270

  // Cropping State (relative to rotatedCanvas dimensions)
  crop: {
    zoom: 1.0,
    panX: 0.0,            // Normalized shift from center (-0.5 to 0.5)
    panY: 0.0             // Normalized shift from center (-0.5 to 0.5)
  },

  // Touch/Mouse interaction state
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  dragStartPan: { x: 0, y: 0 },

  // Parameters
  targetWidth: 320,
  colorCount: 256,        // 16, 64, 256, 0 (fullcolor)
  ditherType: "floyd",    // "floyd", "bayer", "none"
  ditherWeight: 0.7,      // Default dither weight (70% - much cleaner than 100%)
  paletteType: "adaptive",// "adaptive", "pc98-system" (PC-3104システム), "gameboy" (GB風), ...
  scanlines: false,
  monochrome: false,

  currentPalette: [],

  // ADG Maker State
  adgSelectedId: null,
  adgBackgroundImgData: null,
  adgBackgroundImg: null,
  adgDisplayedText: "",
  adgTypewriterTimer: null,
  adgTypewriterIndex: 0,
  adgLoopRunning: false,
  adgLayoutStyle: "still-full",
  adgCommandsListText: "ばしょいどう\nはなせ\nしらべろ\nみせろ\nよべ\nスマホつかえ\nもちものみろ",
  adgCommandCursorIndex: 0,
  adgWeatherEffect: "none",
  adgWeatherAudioNodes: [],
  adgThunderFlashTime: 0
};

// --- DOM References ---
const DOM = {
  desktop: document.getElementById("desktop"),
  appWindow: document.getElementById("app-window"),
  iconPc98: document.getElementById("icon-pc98"),
  btnMinimize: document.getElementById("btn-minimize"),
  btnClose: document.getElementById("btn-close"),
  btnStart: document.getElementById("btn-start"),
  startMenuBox: document.getElementById("start-menu-box"),
  startProgramPixel: document.getElementById("start-program-pixel"),
  startProgramAdg: document.getElementById("start-program-adg"),
  startResetApp: document.getElementById("start-reset-app"),
  startSoundToggle: document.getElementById("start-sound-toggle"),
  startAbout: document.getElementById("start-about"),
  aboutDialog: document.getElementById("about-dialog"),
  btnModalCloses: document.querySelectorAll(".btn-modal-close"),
  exportDialog: document.getElementById("export-dialog"),
  exportPreviewImg: document.getElementById("export-preview-img"),
  btnExportCloses: document.querySelectorAll(".btn-export-close"),
  taskAppTab: document.getElementById("task-app-tab"),
  trayTime: document.getElementById("tray-time"),
  traySoundIcon: document.getElementById("tray-sound-icon"),

  imageInput: document.getElementById("image-input"),
  imageInputSub: document.getElementById("image-input-sub"),
  uploadPlaceholder: document.getElementById("upload-placeholder"),
  previewContainer: document.querySelector(".preview-container"),
  outputCanvas: document.getElementById("output-canvas"),
  loadingOverlay: document.getElementById("loading-overlay"),
  
  tabs: document.querySelectorAll(".tab"),
  tabPanes: document.querySelectorAll(".tab-pane"),

  // Crop Controls
  cropZoom: document.getElementById("crop-zoom"),
  zoomValue: document.getElementById("zoom-value"),
  aspectRadios: document.getElementsByName("aspect-ratio"),
  btnRotate: document.getElementById("btn-rotate"),
  btnCropReset: document.getElementById("btn-crop-reset"),

  // Retro Controls
  pixelWidth: document.getElementById("pixel-width"),
  widthValue: document.getElementById("width-value"),
  colorCount: document.getElementById("color-count"),
  ditherType: document.getElementById("dither-type"),
  retroScanlines: document.getElementById("retro-scanlines"),
  monochromeMode: document.getElementById("monochrome-mode"),
  retroSmoothScaling: document.getElementById("retro-smooth-scaling"),
  ditherWeight: document.getElementById("dither-weight"),
  ditherWeightValue: document.getElementById("dither-weight-value"),

  // Palette Controls
  palettePreset: document.getElementById("palette-preset"),
  paletteColors: document.getElementById("palette-colors"),

  // Action / Status
  btnDownload: document.getElementById("btn-download"),
  statusText: document.getElementById("status-text"),
  statusResolution: document.getElementById("status-resolution"),
  statusTime: document.getElementById("status-time"),

  // ADG Maker Elements
  btnSaveDisk: document.getElementById("btn-save-disk"),
  iconAdgMaker: document.getElementById("icon-adgmaker"),
  adgWindow: document.getElementById("adg-window"),
  taskAdgTab: document.getElementById("task-adg-tab"),
  adgPreviewCanvas: document.getElementById("adg-preview-canvas"),
  adgEmptyPlaceholder: document.getElementById("adg-empty-placeholder"),
  libraryListUl: document.getElementById("library-list-ul"),
  btnLibraryRefresh: document.getElementById("btn-library-refresh"),
  btnLibraryDelete: document.getElementById("btn-library-delete"),
  adgCharName: document.getElementById("adg-char-name"),
  adgDialogText: document.getElementById("adg-dialog-text"),
  adgTextColor: document.getElementById("adg-text-color"),
  adgTypewriter: document.getElementById("adg-typewriter"),
  btnAdgPlay: document.getElementById("btn-adg-play"),
  btnAdgDownload: document.getElementById("btn-adg-download"),
  btnAdgGifDownload: document.getElementById("btn-adg-gif-download"),
  menuAdgSaveGif: document.getElementById("menu-adg-save-gif"),
  adgStatusText: document.getElementById("adg-status-text"),
  adgStatusDisk: document.getElementById("adg-status-disk"),
  adgLayoutStyle: document.getElementById("adg-layout-style"),
  adgDetectiveControls: document.getElementById("adg-detective-controls"),
  adgCommandsList: document.getElementById("adg-commands-list"),
  adgCommandCursor: document.getElementById("adg-command-cursor"),
  adgWeatherEffect: document.getElementById("adg-weather-effect"),
  btnAdgThunder: document.getElementById("btn-adg-thunder"),
};

// --- Initialization ---
window.addEventListener("DOMContentLoaded", () => {
  setupStartMenu();
  setupTabs();
  setupWindowControls();
  setupParameters();
  setupImageLoading();
  setupCropDragging();
  setupClock();
  setupDesktopShortcuts();
  
  // Set initial status
  updateStatus("システム起動完了。画像を選択してください。");
  
  // Initialize ADG Maker Extensions
  setupADGMaker();
});

// --- System Window, Start Menu, Clock & Sound Setup ---

function setupClock() {
  const updateClock = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    DOM.trayTime.textContent = `${hours}:${minutes}`;
  };
  updateClock();
  setInterval(updateClock, 10000);
}

// Helper for unified touch and click events on mobile (safeguards iOS WebKit taps)
function bindInteractive(el, handler) {
  if (!el) return;
  let touched = false;
  
  const wrapper = (e) => {
    if (e.type === "touchstart") {
      touched = true;
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    } else if (e.type === "click") {
      if (touched) {
        touched = false;
        return;
      }
      e.stopPropagation();
      handler(e);
    }
  };

  el.addEventListener("touchstart", wrapper, { passive: false });
  el.addEventListener("click", wrapper);
}

function setupDesktopShortcuts() {
  // My Computer & Recycle Bin double beeps when double-clicked, or single clicked
  const shortcuts = ["icon-mycomputer", "icon-recycle"];
  shortcuts.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      bindInteractive(el, () => {
        SoundFX.playBeepAlert();
      });
    }
  });

  // App Shortcut opens app window
  bindInteractive(DOM.iconPc98, () => {
    SoundFX.playClick();
    if (DOM.appWindow.classList.contains("minimized") || DOM.appWindow.classList.contains("hidden")) {
      DOM.appWindow.classList.remove("minimized");
      DOM.appWindow.classList.remove("hidden");
      DOM.appWindow.classList.add("active");
      DOM.taskAppTab.classList.add("active");
    } else {
      // Toggle minimize if already active
      DOM.appWindow.classList.toggle("minimized");
      DOM.taskAppTab.classList.toggle("active");
    }
  });

  bindInteractive(DOM.taskAppTab, () => {
    SoundFX.playClick();
    DOM.appWindow.classList.toggle("minimized");
    DOM.taskAppTab.classList.toggle("active");
    if (!DOM.appWindow.classList.contains("minimized")) {
      DOM.appWindow.classList.add("active");
    }
  });
}

function setupStartMenu() {
  bindInteractive(DOM.btnStart, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    DOM.startMenuBox.classList.add("hidden");
  });

  // Also close start menu on touch outside
  document.addEventListener("touchstart", (e) => {
    if (!DOM.startMenuBox.contains(e.target) && e.target !== DOM.btnStart) {
      DOM.startMenuBox.classList.add("hidden");
    }
  });

  DOM.startMenuBox.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  DOM.startMenuBox.addEventListener("touchstart", (e) => {
    e.stopPropagation();
  });

  bindInteractive(DOM.startResetApp, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    location.reload();
  });

  bindInteractive(DOM.startSoundToggle, () => {
    toggleSound();
    DOM.startMenuBox.classList.add("hidden");
  });

  bindInteractive(DOM.traySoundIcon, () => {
    toggleSound();
  });

  bindInteractive(DOM.startAbout, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    DOM.aboutDialog.classList.remove("hidden");
  });

  document.getElementById("menu-about").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.aboutDialog.classList.remove("hidden");
  });

  DOM.btnModalCloses.forEach(btn => {
    btn.addEventListener("click", () => {
      SoundFX.playClick();
      DOM.aboutDialog.classList.add("hidden");
    });
  });

  DOM.btnExportCloses.forEach(btn => {
    btn.addEventListener("click", () => {
      SoundFX.playClick();
      DOM.exportDialog.classList.add("hidden");
    });
  });
}

function toggleSound() {
  SoundFX.enabled = !SoundFX.enabled;
  if (SoundFX.enabled) {
    SoundFX.init();
    DOM.traySoundIcon.className = "sound-icon-on";
    DOM.startSoundToggle.innerHTML = '<span class="menu-icon icon-audio"></span>サウンド効果: オン';
    SoundFX.playClick();
  } else {
    DOM.traySoundIcon.className = "sound-icon-off";
    DOM.startSoundToggle.innerHTML = '<span class="menu-icon icon-audio"></span>サウンド効果: オフ';
  }
}

function setupWindowControls() {
  DOM.btnMinimize.addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.appWindow.classList.add("minimized");
    DOM.taskAppTab.classList.remove("active");
    e.stopPropagation();
  });

  DOM.btnClose.addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.appWindow.classList.add("hidden");
    DOM.taskAppTab.classList.remove("active");
    e.stopPropagation();
  });

  // Windows Menu Actions
  document.getElementById("menu-upload").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.imageInput.click();
  });

  document.getElementById("menu-save").addEventListener("click", () => {
    if (State.sourceImage) {
      downloadResultImage();
    } else {
      SoundFX.playBeepAlert();
    }
  });

  document.getElementById("menu-reset").addEventListener("click", () => {
    SoundFX.playClick();
    location.reload();
  });

  document.getElementById("menu-crop-toggle").addEventListener("click", () => {
    SoundFX.playClick();
    resetCrop();
  });

  // Allow title bar dragging on desktop
  let isDraggingWindow = false;
  let dragOffset = { x: 0, y: 0 };
  const titleBar = document.querySelector(".title-bar");

  titleBar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDraggingWindow = true;
    dragOffset.x = e.clientX - DOM.appWindow.offsetLeft;
    dragOffset.y = e.clientY - DOM.appWindow.offsetTop;
    DOM.appWindow.classList.add("active");
    titleBar.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingWindow) return;
    DOM.appWindow.style.left = `${e.clientX - dragOffset.x}px`;
    DOM.appWindow.style.top = `${e.clientY - dragOffset.y}px`;
    DOM.appWindow.style.transform = "none"; // disable default centering
  });

  document.addEventListener("mouseup", () => {
    isDraggingWindow = false;
    titleBar.style.cursor = "grab";
  });
}

function setupTabs() {
  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      SoundFX.playTabClick();
      const tabId = tab.dataset.tab;
      
      DOM.tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      DOM.tabPanes.forEach(pane => {
        pane.classList.remove("active");
        if (pane.id === tabId) {
          pane.classList.add("active");
        }
      });
    });
  });
}

// --- Parameter Change Handlers ---

function setupParameters() {
  // Crop Zoom Slider
  DOM.cropZoom.addEventListener("input", (e) => {
    State.crop.zoom = parseFloat(e.target.value);
    DOM.zoomValue.textContent = `${Math.round(State.crop.zoom * 100)}%`;
    renderPipelineDebounced();
  });

  // Aspect ratio radio selectors
  DOM.aspectRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      SoundFX.playClick();
      resetCrop(); // Reset crop when changing aspect ratio to fit bounds
    });
  });

  // Rotate button
  DOM.btnRotate.addEventListener("click", () => {
    SoundFX.playClick();
    rotateSource();
  });

  // Crop reset button
  DOM.btnCropReset.addEventListener("click", () => {
    SoundFX.playClick();
    resetCrop();
  });

  // Pixel resolution slider
  DOM.pixelWidth.addEventListener("input", (e) => {
    State.targetWidth = parseInt(e.target.value);
    DOM.widthValue.textContent = `${State.targetWidth}px`;
    renderPipelineDebounced();
  });

  // Color selection
  DOM.colorCount.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.colorCount = parseInt(e.target.value);
    renderPipeline();
  });

  // Dithering selection
  DOM.ditherType.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.ditherType = e.target.value;
    
    // Show/hide dither weight slider based on dithering type
    const weightRow = document.getElementById("dither-weight-row");
    if (weightRow) {
      if (State.ditherType === "none") {
        weightRow.style.display = "none";
      } else {
        weightRow.style.display = "flex";
      }
    }
    renderPipeline();
  });

  // Dither Weight Slider
  DOM.ditherWeight.addEventListener("input", (e) => {
    State.ditherWeight = parseFloat(e.target.value);
    DOM.ditherWeightValue.textContent = `${Math.round(State.ditherWeight * 100)}%`;
    renderPipelineDebounced();
  });

  // Scanlines switch
  DOM.retroScanlines.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.scanlines = e.target.checked;
    if (State.scanlines) {
      DOM.previewContainer.classList.add("scanlines-active");
    } else {
      DOM.previewContainer.classList.remove("scanlines-active");
    }
  });

  // Monochromatic green mode switch
  DOM.monochromeMode.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.monochrome = e.target.checked;
    renderPipeline();
  });

  // High quality downscaling smooth switch
  DOM.retroSmoothScaling.addEventListener("change", (e) => {
    SoundFX.playClick();
    renderPipeline();
  });

  // Palette Preset selection
  DOM.palettePreset.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.paletteType = e.target.value;
    renderPipeline();
  });

  // Download Image Button
  DOM.btnDownload.addEventListener("click", () => {
    SoundFX.playClick();
    downloadResultImage();
  });

  // Save to Virtual Disk Button
  DOM.btnSaveDisk.addEventListener("click", () => {
    saveResultToDisk();
  });

  // Save to Virtual Disk Menu Action
  document.getElementById("menu-save-disk").addEventListener("click", () => {
    saveResultToDisk();
  });
}

// Debounce helper to make sliders extremely smooth
let debounceTimeout = null;
function renderPipelineDebounced() {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    renderPipeline();
  }, 20); // 20ms threshold
}

// --- Image Loading and Rotation ---

function setupImageLoading() {
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    SoundFX.playRenderChime(); // Play retro synth welcome chime when starting image loading!
    
    updateStatus("画像ファイルをロードしています...");
    showLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        State.sourceImage = img;
        State.currentRotation = 0;
        
        // Prepare rotated Canvas container
        State.rotatedCanvas = document.createElement("canvas");
        applyRotationToCanvas();
        
        // Reset cropper parameters
        resetCrop();
        
        DOM.cropZoom.disabled = false;
        DOM.btnRotate.disabled = false;
        DOM.btnCropReset.disabled = false;
        DOM.btnDownload.disabled = false;
        DOM.btnSaveDisk.disabled = false;
        
        // Hide placeholder and show canvases
        DOM.uploadPlaceholder.classList.add("hidden");
        
        // Process pipeline
        renderPipeline();
      };
      img.onerror = () => {
        showLoading(false);
        updateStatus("ERROR: 画像を読み込めませんでした。");
        SoundFX.playBeepAlert();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  DOM.imageInput.addEventListener("change", handleFileSelect);
  DOM.imageInputSub.addEventListener("change", handleFileSelect);

  // Drag and Drop support
  DOM.previewContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  DOM.previewContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const inputVal = { target: { files: e.dataTransfer.files } };
      handleFileSelect(inputVal);
    }
  });
}

function rotateSource() {
  if (!State.sourceImage) return;
  State.currentRotation = (State.currentRotation + 270) % 360; // 90 deg counter-clockwise
  applyRotationToCanvas();
  resetCrop();
}

function applyRotationToCanvas() {
  const canvas = State.rotatedCanvas;
  const ctx = canvas.getContext("2d");
  const img = State.sourceImage;
  
  if (State.currentRotation === 0) {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  } else if (State.currentRotation === 90) {
    canvas.width = img.height;
    canvas.height = img.width;
    ctx.translate(canvas.width, 0);
    ctx.rotate(90 * Math.PI / 180);
    ctx.drawImage(img, 0, 0);
  } else if (State.currentRotation === 180) {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(180 * Math.PI / 180);
    ctx.drawImage(img, 0, 0);
  } else if (State.currentRotation === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
    ctx.translate(0, canvas.height);
    ctx.rotate(270 * Math.PI / 180);
    ctx.drawImage(img, 0, 0);
  }
}

function resetCrop() {
  State.crop.zoom = 1.0;
  State.crop.panX = 0.0;
  State.crop.panY = 0.0;

  DOM.cropZoom.value = 1.0;
  DOM.zoomValue.textContent = "100%";
  
  renderPipeline();
}

// Get the selected aspect ratio ratio value
function getSelectedAspectRatio() {
  let mode = "4-3";
  DOM.aspectRadios.forEach(radio => {
    if (radio.checked) mode = radio.value;
  });

  if (mode === "4-3") return 4 / 3;
  if (mode === "1-1") return 1;
  return -1; // -1 means free aspect ratio
}

// --- Drag & Drop/Pan Functionality directly on output Canvas ---

function setupCropDragging() {
  const getEventCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleStart = (e) => {
    if (!State.sourceImage) return;
    State.isDragging = true;
    const coords = getEventCoords(e);
    State.dragStart = coords;
    State.dragStartPan = { x: State.crop.panX, y: State.crop.panY };
    
    // Disable default behavior so mobile touches do not scroll the screen while dragging crop
    if (e.type === "touchstart") {
      // Check if user is clicking on output-canvas
      if (e.target === DOM.outputCanvas) {
        e.preventDefault();
      }
    }
  };

  const handleMove = (e) => {
    if (!State.isDragging) return;
    const coords = getEventCoords(e);
    
    const dx = coords.x - State.dragStart.x;
    const dy = coords.y - State.dragStart.y;
    
    // We need to translate screen pixels dragging to normalized offset space (-0.5 to 0.5)
    // The pan shift amount depends on zoom level (more zoomed in = slower dragging)
    const bounds = DOM.outputCanvas.getBoundingClientRect();
    const dragSpeed = 1.2 / State.crop.zoom; // scaling speed
    
    const deltaPanX = -(dx / bounds.width) * dragSpeed;
    const deltaPanY = -(dy / bounds.height) * dragSpeed;
    
    State.crop.panX = Math.max(-0.5, Math.min(0.5, State.dragStartPan.x + deltaPanX));
    State.crop.panY = Math.max(-0.5, Math.min(0.5, State.dragStartPan.y + deltaPanY));
    
    renderPipelineDebounced();
  };

  const handleEnd = () => {
    State.isDragging = false;
  };

  DOM.outputCanvas.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);

  DOM.outputCanvas.addEventListener("touchstart", handleStart, { passive: false });
  window.addEventListener("touchmove", handleMove, { passive: false });
  window.addEventListener("touchend", handleEnd);
}

// --- Image Processing Pipeline (Core Algorithms) ---

function renderPipeline() {
  if (!State.sourceImage) return;
  
  showLoading(true);
  updateStatus("減色・ディザリング処理を実行中...");

  // Force brief UI render repaint before heavy canvas CPU crunching
  requestAnimationFrame(() => {
    setTimeout(() => {
      const startTime = performance.now();
      
      const rotated = State.rotatedCanvas;
      const targetW = State.targetWidth;
      const aspect = getSelectedAspectRatio();
      
      // Calculate target resolution
      let targetH;
      if (aspect === -1) {
        // Free Aspect Ratio (keeps original rotated aspect ratio)
        targetH = Math.round(targetW * (rotated.height / rotated.width));
      } else {
        // Fixed Aspect Ratio
        targetH = Math.round(targetW / aspect);
      }
      
      // Make height an even number (optional but cleaner)
      if (targetH % 2 !== 0) targetH++;

      // Math for Crop source sub-rect coordinates (sx, sy, sw, sh)
      let sw, sh;
      if (aspect === -1) {
        sw = rotated.width;
        sh = rotated.height;
      } else {
        if (rotated.width / rotated.height > aspect) {
          sh = rotated.height;
          sw = rotated.height * aspect;
        } else {
          sw = rotated.width;
          sh = rotated.width / aspect;
        }
      }
      
      // Zoom factor shrinks the crop source dimensions (zooming in)
      const zoom = State.crop.zoom;
      sw = sw / zoom;
      sh = sh / zoom;
      
      // Pan moves the crop center within source boundaries
      // Maximum movement bounds:
      const maxPanX = rotated.width - sw;
      const maxPanY = rotated.height - sh;
      
      const cx = (rotated.width / 2) + (State.crop.panX * maxPanX);
      const cy = (rotated.height / 2) + (State.crop.panY * maxPanY);
      
      // Compute final top-left crop source coordinates clamped to actual limits
      const sx = Math.max(0, Math.min(rotated.width - sw, cx - (sw / 2)));
      const sy = Math.max(0, Math.min(rotated.height - sh, cy - (sh / 2)));

      // Offscreen canvas downscaler
      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const offCtx = offscreen.getContext("2d");
      
      // Configure image smoothing based on "retro-smooth-scaling" checkbox
      const smoothScaling = DOM.retroSmoothScaling ? DOM.retroSmoothScaling.checked : true;
      offCtx.imageSmoothingEnabled = smoothScaling;
      if (smoothScaling) {
        offCtx.imageSmoothingQuality = "high";
      }
      offCtx.drawImage(rotated, sx, sy, sw, sh, 0, 0, targetW, targetH);
      
      const imgData = offCtx.getImageData(0, 0, targetW, targetH);
      const pixels = imgData.data; // flat Uint8ClampedArray [R, G, B, A]

      // Step 1: Monochrome Preprocessor (if checked)
      if (State.monochrome) {
        convertToGrayscale(pixels);
      }

      // Step 2: Extract or Apply Palette
      let palette = [];
      if (State.paletteType === "adaptive") {
        if (State.colorCount === 0) {
          // Full color - no color reduction
          palette = null;
        } else {
          // Dynamic Median Cut palette
          palette = getAdaptivePalette(pixels, State.colorCount);
        }
      } else {
        // Preset Palettes
        let basePalette = PalettePresets[State.paletteType] || PalettePresets["pc98-system"];
        
        // If monochrome checkbox is checked, map the preset's colors to green shades!
        if (State.monochrome) {
          palette = makeMonochromePalette(basePalette);
        } else {
          palette = basePalette;
        }
      }
      
      State.currentPalette = palette;
      renderPalettePreview(palette);

      // Convert palette to Lab space for high-fidelity perceptually uniform color mapping
      let paletteLab = null;
      if (palette && palette.length > 0) {
        paletteLab = palette.map(color => ({
          color: color,
          Lab: rgbToLab(color.r, color.g, color.b)
        }));
      }

      // Check if palette is monochrome/single-hue (Gameboy or monochrome green mode active)
      const useLightnessOnly = (State.paletteType === "gameboy" || State.monochrome);

      // Step 3: Run Quantization and Dithering
      if (paletteLab && paletteLab.length > 0) {
        const ditherWeight = State.ditherWeight !== undefined ? State.ditherWeight : 0.7;
        if (State.ditherType === "floyd") {
          applyFloydSteinbergDithering(pixels, targetW, targetH, paletteLab, ditherWeight, useLightnessOnly);
        } else if (State.ditherType === "bayer") {
          applyBayerOrderedDithering(pixels, targetW, targetH, paletteLab, State.colorCount, ditherWeight, useLightnessOnly);
        } else {
          applyNoneQuantization(pixels, paletteLab, useLightnessOnly);
        }
      }

      // Write results back to offscreen canvas
      offCtx.putImageData(imgData, 0, 0);

      // Draw offscreen result to primary output canvas
      DOM.outputCanvas.width = targetW;
      DOM.outputCanvas.height = targetH;
      
      const ctx = DOM.outputCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0);

      // Step 4: Finish up!
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);
      
      // Update UI Status and diagnostics
      DOM.statusResolution.textContent = `解像度: ${targetW} x ${targetH}`;
      DOM.statusTime.textContent = `処理速度: ${processingTime}ms`;
      updateStatus("レンダリング完了。");
      showLoading(false);
    }, 30);
  });
}

function showLoading(show) {
  if (show) {
    DOM.loadingOverlay.classList.remove("hidden");
  } else {
    DOM.loadingOverlay.classList.add("hidden");
  }
}

function updateStatus(text) {
  DOM.statusText.textContent = text;
}

// Convert flat pixels buffer to grayscale
function convertToGrayscale(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i+1];
    const b = pixels[i+2];
    // Perceptual grayscale formula
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    pixels[i] = gray;
    pixels[i+1] = gray;
    pixels[i+2] = gray;
  }
}

// Transform any palette into green scales based on perceived brightness
function makeMonochromePalette(basePalette) {
  return basePalette.map(color => {
    const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
    return {
      r: Math.round(gray * 0.1),  // subtle dark base
      g: gray,                    // scale pure bright green
      b: Math.round(gray * 0.15)  // subtle tint phosphor glow
    };
  });
}

// Draw color slots in "パレット" tab
function renderPalettePreview(palette) {
  DOM.paletteColors.innerHTML = "";
  if (!palette) {
    DOM.paletteColors.innerHTML = "<div style='grid-column: 1/-1; text-align: center; color: #555; padding-top: 15px;'>フルカラーモード（制限なし）</div>";
    return;
  }
  
  palette.forEach(color => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    swatch.title = `RGB: ${color.r}, ${color.g}, ${color.b}`;
    DOM.paletteColors.appendChild(swatch);
  });
}

// --- MEDIAN CUT COLOR QUANTIZATION ---
function getAdaptivePalette(pixels, maxColors) {
  // Extract all RGB pixel colors, ignoring transparent ones
  const rgbColors = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i+3] < 128) continue; // skip transparent
    rgbColors.push({
      r: pixels[i],
      g: pixels[i+1],
      b: pixels[i+2]
    });
  }

  // Handle empty image fallback
  if (rgbColors.length === 0) {
    return [{ r: 0, g: 0, b: 0 }];
  }

  // If pixel volume is smaller than requested color slots, return direct colors
  if (rgbColors.length <= maxColors) {
    return rgbColors;
  }

  // Recursive block split arrays
  let boxes = [rgbColors];

  while (boxes.length < maxColors) {
    let maxSpan = -1;
    let splitBoxIndex = -1;

    // 1. Find the box with the maximum color dimension span (the box containing most color variety)
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue; // cannot split single pixel

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (let j = 0; j < box.length; j++) {
        const p = box[j];
        if (p.r < minR) minR = p.r;
        if (p.r > maxR) maxR = p.r;
        if (p.g < minG) minG = p.g;
        if (p.g > maxG) maxG = p.g;
        if (p.b < minB) minB = p.b;
        if (p.b > maxB) maxB = p.b;
      }

      const spanR = maxR - minR;
      const spanG = maxG - minG;
      const spanB = maxB - minB;
      const boxSpan = Math.max(spanR, spanG, spanB);

      if (boxSpan > maxSpan) {
        maxSpan = boxSpan;
        splitBoxIndex = i;
      }
    }

    if (splitBoxIndex === -1) break; // All blocks unsplittable

    const boxToSplit = boxes[splitBoxIndex];

    // 2. Identify widest channel inside selected box
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (let j = 0; j < boxToSplit.length; j++) {
      const p = boxToSplit[j];
      if (p.r < minR) minR = p.r;
      if (p.r > maxR) maxR = p.r;
      if (p.g < minG) minG = p.g;
      if (p.g > maxG) maxG = p.g;
      if (p.b < minB) minB = p.b;
      if (p.b > maxB) maxB = p.b;
    }

    const spanR = maxR - minR;
    const spanG = maxG - minG;
    const spanB = maxB - minB;

    let sortChannel = 'r';
    if (spanG >= spanR && spanG >= spanB) sortChannel = 'g';
    else if (spanB >= spanR && spanB >= spanG) sortChannel = 'b';

    // 3. Sort pixels along chosen channel
    boxToSplit.sort((a, b) => a[sortChannel] - b[sortChannel]);

    // 4. Split at median index
    const median = Math.floor(boxToSplit.length / 2);
    const part1 = boxToSplit.slice(0, median);
    const part2 = boxToSplit.slice(median);

    // Replace old block with two newly split halves
    boxes.splice(splitBoxIndex, 1, part1, part2);
  }

  // 5. Build average color for each box
  const palette = boxes.map(box => {
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < box.length; i++) {
      sumR += box[i].r;
      sumG += box[i].g;
      sumB += box[i].b;
    }
    return {
      r: Math.round(sumR / box.length),
      g: Math.round(sumG / box.length),
      b: Math.round(sumB / box.length)
    };
  });

  return palette;
}

// Find closest RGB color using Euclidean distance formula
function findClosestColor(r, g, b, palette) {
  let closestColor = palette[0];
  let minDistanceSq = Infinity;

  // Linear scan - highly optimized loop
  for (let i = 0; i < palette.length; i++) {
    const pal = palette[i];
    const dr = r - pal.r;
    const dg = g - pal.g;
    const db = b - pal.b;
    
    // Perceptual weighting provides more natural visual mapping
    const dSq = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
    
    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
      closestColor = pal;
    }
  }

  return closestColor;
}

// --- CIELAB (Lab) Perceptually Uniform Color Space Conversion Utilities ---

// Convert RGB to XYZ (under D65 standard illuminant reference point)
function rgbToXyz(r, g, b) {
  let rNormal = r / 255;
  let gNormal = g / 255;
  let bNormal = b / 255;

  // Inverse sRGB gamma companding to linear RGB
  rNormal = rNormal > 0.04045 ? Math.pow((rNormal + 0.055) / 1.055, 2.4) : rNormal / 12.92;
  gNormal = gNormal > 0.04045 ? Math.pow((gNormal + 0.055) / 1.055, 2.4) : gNormal / 12.92;
  bNormal = bNormal > 0.04045 ? Math.pow((bNormal + 0.055) / 1.055, 2.4) : bNormal / 12.92;

  // Matrix multiplication for D65 white reference
  const x = rNormal * 0.4124 + gNormal * 0.3576 + bNormal * 0.1805;
  const y = rNormal * 0.2126 + gNormal * 0.7152 + bNormal * 0.0722;
  const z = rNormal * 0.0193 + gNormal * 0.1192 + bNormal * 0.9505;

  return { x: x * 100, y: y * 100, z: z * 100 };
}

// Convert XYZ to CIELAB (Lab) color space
function xyzToLab(x, y, z) {
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let xN = x / refX;
  let yN = y / refY;
  let zN = z / refZ;

  const fx = xN > 0.008856 ? Math.pow(xN, 1/3) : (7.787 * xN) + (16 / 116);
  const fy = yN > 0.008856 ? Math.pow(yN, 1/3) : (7.787 * yN) + (16 / 116);
  const fz = zN > 0.008856 ? Math.pow(zN, 1/3) : (7.787 * zN) + (16 / 116);

  const L = yN > 0.008856 ? (116 * Math.pow(yN, 1/3)) - 16 : 903.3 * yN;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { L, a, b };
}

// Direct helper to convert RGB to CIELAB space
function rgbToLab(r, g, b) {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// Find closest color using perceptually uniform Lab distance
function findClosestColorLab(r, g, b, paletteLab, useLightnessOnly) {
  const pixelLab = rgbToLab(r, g, b);
  let closestColor = paletteLab[0].color;
  let minDistanceSq = Infinity;

  for (let i = 0; i < paletteLab.length; i++) {
    const item = paletteLab[i];
    const dL = pixelLab.L - item.Lab.L;
    
    let dSq;
    if (useLightnessOnly) {
      dSq = dL * dL; // Match purely by lightness/brightness!
    } else {
      const da = pixelLab.a - item.Lab.a;
      const db = pixelLab.b - item.Lab.b;
      dSq = dL * dL + da * da + db * db;
    }
    
    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
      closestColor = item.color;
    }
  }

  return closestColor;
}

// --- DITHERING ENGINES ---

// Floyd-Steinberg Dithering: Error Diffusion using CIELAB space
function applyFloydSteinbergDithering(pixels, width, height, paletteLab, ditherWeight, useLightnessOnly) {
  // Use a Float32Array to preserve fractional error precision
  const buffer = new Float32Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    buffer[i] = pixels[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const oldR = buffer[idx];
      const oldG = buffer[idx+1];
      const oldB = buffer[idx+2];
      
      // Match color in high-fidelity CIELAB space
      const closest = findClosestColorLab(oldR, oldG, oldB, paletteLab, useLightnessOnly);
      
      pixels[idx]   = closest.r;
      pixels[idx+1] = closest.g;
      pixels[idx+2] = closest.b;
      pixels[idx+3] = 255; // opaque alpha
      
      // Calculate channel error scaled by dither intensity
      const errR = (oldR - closest.r) * ditherWeight;
      const errG = (oldG - closest.g) * ditherWeight;
      const errB = (oldB - closest.b) * ditherWeight;
      
      // Diffuse error to neighboring pixels (Floyd-Steinberg Weights)
      // Right (+1, 0): weight 7/16
      if (x + 1 < width) {
        const targetIdx = idx + 4;
        buffer[targetIdx]   += errR * 7 / 16;
        buffer[targetIdx+1] += errG * 7 / 16;
        buffer[targetIdx+2] += errB * 7 / 16;
      }
      
      // Down Left (-1, +1): weight 3/16
      if (x - 1 >= 0 && y + 1 < height) {
        const targetIdx = ((y + 1) * width + (x - 1)) * 4;
        buffer[targetIdx]   += errR * 3 / 16;
        buffer[targetIdx+1] += errG * 3 / 16;
        buffer[targetIdx+2] += errB * 3 / 16;
      }
      
      // Down (0, +1): weight 5/16
      if (y + 1 < height) {
        const targetIdx = ((y + 1) * width + x) * 4;
        buffer[targetIdx]   += errR * 5 / 16;
        buffer[targetIdx+1] += errG * 5 / 16;
        buffer[targetIdx+2] += errB * 5 / 16;
      }
      
      // Down Right (+1, +1): weight 1/16
      if (x + 1 < width && y + 1 < height) {
        const targetIdx = ((y + 1) * width + (x + 1)) * 4;
        buffer[targetIdx]   += errR * 1 / 16;
        buffer[targetIdx+1] += errG * 1 / 16;
        buffer[targetIdx+2] += errB * 1 / 16;
      }
    }
  }
}

// Bayer Ordered Dithering: Organized Patterns using CIELAB space
function applyBayerOrderedDithering(pixels, width, height, paletteLab, colorCount, ditherWeight, useLightnessOnly) {
  // Determine pattern spread/contrast bias based on available colors
  // A tighter color space needs more spreading to mesh gradients correctly
  let spread = 24;
  if (colorCount === 16) spread = 52;
  else if (colorCount === 64) spread = 34;
  else if (colorCount === 256) spread = 18;

  for (let y = 0; y < height; y++) {
    const matrixRow = Bayer8x8Matrix[y % 8];
    const rowOffset = y * width;
    
    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4;
      
      // Matrix value is 0-63. Normalize to [-0.5, 0.5] bias
      const matrixVal = matrixRow[x % 8];
      const normalizedBias = (matrixVal + 0.5) / 64 - 0.5;
      const ditherAdjustment = normalizedBias * spread * ditherWeight;
      
      // Apply offset to original color
      const adjustedR = Math.max(0, Math.min(255, pixels[idx]   + ditherAdjustment));
      const adjustedG = Math.max(0, Math.min(255, pixels[idx+1] + ditherAdjustment));
      const adjustedB = Math.max(0, Math.min(255, pixels[idx+2] + ditherAdjustment));
      
      const closest = findClosestColorLab(adjustedR, adjustedG, adjustedB, paletteLab, useLightnessOnly);
      
      pixels[idx]   = closest.r;
      pixels[idx+1] = closest.g;
      pixels[idx+2] = closest.b;
      pixels[idx+3] = 255;
    }
  }
}

// Simple nearest color mapping (no dithering) using CIELAB space
function applyNoneQuantization(pixels, paletteLab, useLightnessOnly) {
  for (let i = 0; i < pixels.length; i += 4) {
    const closest = findClosestColorLab(pixels[i], pixels[i+1], pixels[i+2], paletteLab, useLightnessOnly);
    pixels[i]   = closest.r;
    pixels[i+1] = closest.g;
    pixels[i+2] = closest.b;
    pixels[i+3] = 255;
  }
}

// --- Image Export/Download ---

function downloadResultImage() {
  if (!State.sourceImage) return;

  const canvas = DOM.outputCanvas;
  
  // Since output canvas size is low-res (e.g. 320x240), downloading it directly
  // creates a small file. If users open it, it might get blurred.
  // Standard high-quality retro converter practice is to upscale the export sharply!
  // Let's upscale it using nearest-neighbor by 4x or up to ~1280px wide.
  const scaleFactor = Math.max(1, Math.floor(1280 / canvas.width));
  
  const upscaleCanvas = document.createElement("canvas");
  upscaleCanvas.width = canvas.width * scaleFactor;
  upscaleCanvas.height = canvas.height * scaleFactor;
  
  const ctx = upscaleCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  
  ctx.drawImage(canvas, 0, 0, upscaleCanvas.width, upscaleCanvas.height);
  
  // Trigger file download
  const link = document.createElement("a");
  link.download = `pic2pc3104_${Date.now()}.png`;
  const dataUrl = upscaleCanvas.toDataURL("image/png");
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show preview dialog for iOS long-press saving
  showExportPreview(dataUrl);
  
  updateStatus("画像の保存に成功しました！");
}

// --- VIRTUAL DISK & ADG SCREEN MAKER SYSTEM ---

function saveResultToDisk() {
  if (!State.sourceImage) return;

  const dataUrl = DOM.outputCanvas.toDataURL("image/png");

  try {
    let library = JSON.parse(localStorage.getItem("pic3104_library") || "[]");

    // Limit to max 12 items to stay under 5MB localStorage limits
    if (library.length >= 12) {
      library.shift(); // remove oldest
    }

    const timestamp = new Date();
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;
    const fileId = Date.now();
    const fileName = `STILL_${library.length + 1}.PNG`;

    library.push({
      id: fileId,
      name: fileName,
      data: dataUrl,
      time: timeStr
    });

    localStorage.setItem("pic3104_library", JSON.stringify(library));

    updateStatus(`仮想ディスクに保存完了: ${fileName}`);
    SoundFX.playRenderChime();

    // Refresh ADG list if open
    refreshLibraryUI();
  } catch (e) {
    console.error(e);
    updateStatus("ERROR: 保存に失敗しました。容量不足の可能性があります。");
    SoundFX.playBeepAlert();
  }
}

function refreshLibraryUI() {
  let library = JSON.parse(localStorage.getItem("pic3104_library") || "[]");

  // On-the-fly migration to assign unique IDs to older/legacy items that do not have an id field
  let migrated = false;
  library.forEach((item, idx) => {
    if (item.id === undefined || item.id === null) {
      item.id = Date.now() - idx;
      migrated = true;
    }
  });
  if (migrated) {
    localStorage.setItem("pic3104_library", JSON.stringify(library));
  }

  if (library.length === 0) {
    DOM.adgEmptyPlaceholder.classList.remove("hidden");
    DOM.adgPreviewCanvas.classList.add("hidden");
    DOM.libraryListUl.innerHTML = "<div style='text-align: center; color: #555; padding-top: 15px; font-size: 11px;'>空のディスク</div>";
    DOM.btnLibraryDelete.disabled = true;
    DOM.btnAdgDownload.disabled = true;
    DOM.btnAdgGifDownload.disabled = true;
    DOM.btnAdgPlay.disabled = true;
    DOM.adgStatusDisk.textContent = "ファイル: 未選択";
    return;
  }

  DOM.adgEmptyPlaceholder.classList.add("hidden");
  DOM.adgPreviewCanvas.classList.remove("hidden");
  DOM.btnAdgDownload.disabled = false;
  DOM.btnAdgGifDownload.disabled = false;
  DOM.btnAdgPlay.disabled = false;

  DOM.libraryListUl.innerHTML = "";
  library.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "library-item";
    
    // Select the newly added item or previously selected item
    if (State.adgSelectedId == item.id || (!State.adgSelectedId && idx === library.length - 1)) {
      li.classList.add("selected");
      State.adgSelectedId = item.id;
      State.adgBackgroundImgData = item.data;
      DOM.adgStatusDisk.textContent = `ファイル: ${item.name}`;
      DOM.btnLibraryDelete.disabled = false;
    }

    li.innerHTML = `
      <img class="library-thumb" src="${item.data}">
      <span class="library-name">${item.name}</span>
      <span class="library-date">${item.time}</span>
    `;

    li.addEventListener("click", () => {
      SoundFX.playClick();
      State.adgSelectedId = item.id;
      State.adgBackgroundImgData = item.data;
      DOM.btnLibraryDelete.disabled = false;
      refreshLibraryUI();
      loadADGBackground();
    });

    DOM.libraryListUl.appendChild(li);
  });
}

function deleteSelectedFile() {
  if (!State.adgSelectedId) return;

  try {
    let library = JSON.parse(localStorage.getItem("pic3104_library") || "[]");
    library = library.filter(item => item.id !== State.adgSelectedId);
    localStorage.setItem("pic3104_library", JSON.stringify(library));

    State.adgSelectedId = null;
    State.adgBackgroundImgData = null;
    State.adgBackgroundImg = null;

    SoundFX.playBeepAlert();
    refreshLibraryUI();
    
    if (library.length > 0) {
      loadADGBackground();
    } else {
      // Clear canvas
      const ctx = DOM.adgPreviewCanvas.getContext("2d");
      ctx.clearRect(0, 0, DOM.adgPreviewCanvas.width, DOM.adgPreviewCanvas.height);
    }
  } catch (e) {
    console.error(e);
  }
}

function loadADGBackground() {
  if (!State.adgBackgroundImgData) return;

  const img = new Image();
  img.onload = () => {
    State.adgBackgroundImg = img;
    triggerTypewriter();
  };
  img.onerror = (e) => {
    console.error("Failed to load ADG background image from base64 data:", e);
  };
  img.src = State.adgBackgroundImgData;
}

function parseTypewriterText(text) {
  const steps = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "[") {
      const closingIdx = text.indexOf("]", i);
      if (closingIdx !== -1) {
        const tag = text.slice(i + 1, closingIdx);
        if (tag === "w") {
          steps.push({ type: "wait", value: 500 });
          i = closingIdx + 1;
          continue;
        } else if (tag.startsWith("s=")) {
          const speed = parseInt(tag.slice(2)) || 45;
          steps.push({ type: "speed", value: speed });
          i = closingIdx + 1;
          continue;
        } else if (tag === "flash") {
          steps.push({ type: "flash" });
          i = closingIdx + 1;
          continue;
        }
      }
    }
    // Standard character
    steps.push({ type: "char", value: text[i] });
    i++;
  }
  return steps;
}

function triggerTypewriter() {
  if (State.adgTypewriterTimer) clearTimeout(State.adgTypewriterTimer);
  
  const charName = DOM.adgCharName.value.trim();
  const dialogValue = DOM.adgDialogText.value || "あっ、センパイ おそいですよ。&#13;&#10;かくしょへ れんらくは しておきました。&#13;&#10;げんばけんしょうも はじまっています。";
  
  let fullText = "";
  if (State.adgLayoutStyle === "detective-command" || State.adgLayoutStyle === "sound-novel" || State.adgLayoutStyle === "gameboy") {
    // Detective ADV, Sound Novel, and Gameboy style: pre-formatted inline name and brackets
    // If the dialogue value itself starts with a line containing a tag like [XL] or [L], 
    // prepending name would break line.startsWith("[XL]") on the very first line!
    // To solve this, we parse the lines of dialogValue and prepend the name correctly.
    if (charName) {
      const dialogLines = dialogValue.split("\n");
      if (dialogLines.length > 0) {
        const firstLine = dialogLines[0];
        if (firstLine.startsWith("[XL]")) {
          dialogLines[0] = `[XL]${charName}「${firstLine.slice(4)}`; // keep tag at absolute start!
        } else if (firstLine.startsWith("[L]")) {
          dialogLines[0] = `[L]${charName}「${firstLine.slice(3)}`;
        } else {
          dialogLines[0] = `${charName}「${firstLine}`;
        }
        // Append closing bracket to the very end of dialogue
        dialogLines[dialogLines.length - 1] = dialogLines[dialogLines.length - 1] + "」";
        fullText = dialogLines.join("\n");
      } else {
        fullText = `${charName}「」`;
      }
    } else {
      fullText = dialogValue;
    }
  } else {
    // PC-3104 standard style: separate name plate and pure dialog text
    fullText = dialogValue;
  }

  // If we are recording a GIF, we always use the typewriter animation!
  const useTypewriter = State.adgIsRecordingGif ? true : DOM.adgTypewriter.checked;

  if (!useTypewriter) {
    // Strip tags for instant drawing
    let cleanText = "";
    const parsed = parseTypewriterText(fullText);
    parsed.forEach(step => {
      if (step.type === "char") cleanText += step.value;
    });
    State.adgDisplayedText = cleanText;
    State.adgTypingComplete = true;
    drawADGComposition();
    return;
  }

  State.adgDisplayedText = "";
  State.adgTypewriterIndex = 0;
  State.adgTypingComplete = false;

  const steps = parseTypewriterText(fullText);
  let currentDelay = 45;

  const runStep = () => {
    if (State.adgTypewriterIndex < steps.length) {
      const step = steps[State.adgTypewriterIndex];
      State.adgTypewriterIndex++;
      
      let nextDelay = currentDelay;
      
      if (step.type === "char") {
        State.adgDisplayedText += step.value;
        if (step.value !== " " && step.value !== "\n") {
          SoundFX.playClick();
        }
        drawADGComposition();
      } else if (step.type === "speed") {
        currentDelay = step.value;
        nextDelay = 0; // instantly run next step
      } else if (step.type === "wait") {
        nextDelay = step.value;
      } else if (step.type === "flash") {
        SoundFX.playThunder();
        State.adgThunderFlashTime = Date.now();
        drawADGComposition();
        nextDelay = 0; // instantly run next step
      }
      
      // Capture frame for GIF
      if (State.adgIsRecordingGif && step.type === "char") {
        State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
        const progress = Math.min(80, Math.round((State.adgTypewriterIndex / steps.length) * 80));
        DOM.adgStatusText.textContent = `GIF録画中 (タイピング): ${progress}%`;
      }
      
      State.adgTypewriterTimer = setTimeout(runStep, nextDelay);
    } else {
      // Typing finished
      if (State.adgIsRecordingGif) {
        if (State.adgBlinkFramesCount > 0) {
          State.adgBlinkFramesCount--;
          State.adgTypingComplete = true;
          drawADGComposition();
          
          State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
          const totalBlinkFrames = 60;
          const progress = 80 + Math.round(((totalBlinkFrames - State.adgBlinkFramesCount) / totalBlinkFrames) * 20);
          DOM.adgStatusText.textContent = `GIF録画中 (カーソル点滅): ${progress}%`;
          
          State.adgTypewriterTimer = setTimeout(runStep, 45);
        } else {
          State.adgTypingComplete = true;
          drawADGComposition();
          compileADGGif();
        }
      } else {
        State.adgTypingComplete = true;
        drawADGComposition();
      }
    }
  };
  
  State.adgTypewriterTimer = setTimeout(runStep, currentDelay);
}

// --- Non-Anti-Aliased Pixelated Text Rendering Utility ---
function drawPixelatedText(ctx, text, x, y, font, color, drawShadow = false) {
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width) + 12;
  
  let fontSize = 15;
  const match = font.match(/(\d+)px/);
  if (match) fontSize = parseInt(match[1]);
  const textHeight = Math.ceil(fontSize * 1.5) + 6;

  if (textWidth <= 0 || textHeight <= 0) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = textWidth;
  tempCanvas.height = textHeight;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.font = font;
  tempCtx.textBaseline = "top";

  if (drawShadow) {
    // SFC Kamaitachi no Yoru style: bold black stroke border around text!
    // We draw the text offset in 8 directions around it in a grey/white key color first, 
    // then draw the center in another key color, so we can convert them to perfectly crisp pixel outlines.
    
    // Draw 8-direction shadow block in color #000001 (stands for shadow pixels)
    tempCtx.fillStyle = "#000001";
    for (let dx = 0; dx <= 2; dx++) {
      for (let dy = 0; dy <= 2; dy++) {
        if (dx === 1 && dy === 1) continue;
        tempCtx.fillText(text, dx, dy);
      }
    }
    // Draw center in color #ffffff (stands for body pixels)
    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillText(text, 1, 1);
  } else {
    // Normal text
    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillText(text, 0, 0);
  }

  const imgData = tempCtx.getImageData(0, 0, textWidth, textHeight);
  const pixels = imgData.data;

  let targetR = 255, targetG = 255, targetB = 255;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      targetR = parseInt(hex.slice(0, 2), 16);
      targetG = parseInt(hex.slice(2, 4), 16);
      targetB = parseInt(hex.slice(4, 6), 16);
    }
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3];

    if (drawShadow) {
      if (alpha > 80) {
        // Is it the center/body pixel? (#ffffff)
        if (r > 200 && g > 200 && b > 200) {
          pixels[i] = targetR;
          pixels[i + 1] = targetG;
          pixels[i + 2] = targetB;
          pixels[i + 3] = 255;
        } else {
          // It's the shadow border (#000001)
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
          pixels[i + 3] = 255;
        }
      } else {
        pixels[i + 3] = 0;
      }
    } else {
      if (alpha > 80) { // threshold value to clear anti-aliasing
        pixels[i] = targetR;
        pixels[i + 1] = targetG;
        pixels[i + 2] = targetB;
        pixels[i + 3] = 255;
      } else {
        pixels[i + 3] = 0;
      }
    }
  }

  tempCtx.putImageData(imgData, 0, 0);
  
  // Align position based on offset
  const renderX = drawShadow ? x - 1 : x;
  const renderY = drawShadow ? y - 1 : y;
  ctx.drawImage(tempCanvas, renderX, renderY);
}

// Convert background images to Gameboy green 4-color tones on-the-fly preserving original aspect ratio
function drawGameboyImage(ctx, img, dx, dy, dw, dh) {
  // Original aspect ratio of img
  const imgAspect = img.width / img.height;
  
  // Calculate size to fit inside (dw, dh) while preserving aspect ratio
  let targetW = dw;
  let targetH = dh;
  
  if (imgAspect > (dw / dh)) {
    // Image is wider than container
    targetH = dw / imgAspect;
  } else {
    // Image is taller than container
    targetW = dh * imgAspect;
  }
  
  // Center alignment inside (dx, dy, dw, dh)
  const targetX = dx + (dw - targetW) / 2;
  const targetY = dy + (dh - targetH) / 2;

  // Let's create a temporary canvas with exact pixel scale
  const tempW = Math.round(targetW);
  const tempH = Math.round(targetH);
  if (tempW <= 0 || tempH <= 0) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = tempW;
  tempCanvas.height = tempH;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(img, 0, 0, tempW, tempH);
  
  const imgData = tempCtx.getImageData(0, 0, tempW, tempH);
  const data = imgData.data;
  
  const gbColors = [
    { r: 15, g: 56, b: 15 },
    { r: 48, g: 98, b: 48 },
    { r: 139, g: 172, b: 15 },
    { r: 155, g: 188, b: 15 }
  ];
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    const lightness = 0.299 * r + 0.587 * g + 0.114 * b;
    
    let colorIdx = 3;
    if (lightness < 64) {
      colorIdx = 0;
    } else if (lightness < 128) {
      colorIdx = 1;
    } else if (lightness < 192) {
      colorIdx = 2;
    }
    
    const color = gbColors[colorIdx];
    data[i] = color.r;
    data[i+1] = color.g;
    data[i+2] = color.b;
  }
  
  tempCtx.putImageData(imgData, 0, 0);
  
  // Fill the container background with the darkest green first to act as a matte
  ctx.fillStyle = "#0f380f";
  ctx.fillRect(dx, dy, dw, dh);
  
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, targetX, targetY, targetW, targetH);
}

function drawADGComposition() {
  const canvas = DOM.adgPreviewCanvas;
  const ctx = canvas.getContext("2d");

  // Lock canvas resolution to authentic 4:3 stretched PC-3104 resolution: 640 x 480
  canvas.width = 640;
  canvas.height = 480;

  const textColor = DOM.adgTextColor.value;

  if (State.adgLayoutStyle === "detective-command") {
    // --- Layout 2: Classic Detective Command ADV Layout (Portopia / Okhotsk Style) ---
    
    // 1. Draw solid black backdrop
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 640, 480);

    // 2. Draw Bounding Frame around top-left Still image box (X=24, Y=24, W=320, H=240) - Authentic 4:3 box!
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 320, 240);

    // Draw background pixel art still inside framed window
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 24, 24, 320, 240);
    } else {
      // gray placeholder screen
      ctx.fillStyle = "#333333";
      ctx.fillRect(24, 24, 320, 240);
    }

    // 3. Draw Command Menu list on the top-right
    const commandsText = DOM.adgCommandsList.value || "ばしょいどう\nはなせ\nしらべろ\nみせろ\nよべ\nスマホつかえ\nもちものみろ";
    const commands = commandsText.split("\n").map(c => c.trim()).filter(c => c.length > 0);
    
    const startMenuX = 370;
    const startMenuY = 28;
    const menuSpacing = 24;
    const activeCursorIndex = parseInt(DOM.adgCommandCursor.value) || 0;

    commands.forEach((cmd, idx) => {
      if (idx < 7) { // limit to 7 lines max
        const lineY = startMenuY + (idx * menuSpacing);
        if (idx === activeCursorIndex) {
          // Draw active selector pointer "▷" next to active item - open triangle cursor (historically accurate PC-98 style!)
          // Rendered using direct canvas vector path to guarantee crisp edges and 100% immune to iOS system font-loading tofu blocks!
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.lineJoin = "miter";
          ctx.beginPath();
          ctx.moveTo(startMenuX + 2, lineY + 2);
          ctx.lineTo(startMenuX + 11, lineY + 8);
          ctx.lineTo(startMenuX + 2, lineY + 14);
          ctx.closePath();
          ctx.stroke();

          drawPixelatedText(ctx, cmd, startMenuX + 20, lineY, "16px 'DotGothic16', monospace", "#ffffff");
        } else {
          drawPixelatedText(ctx, cmd, startMenuX + 20, lineY, "16px 'DotGothic16', monospace", "#ffffff");
        }
      }
    });

    // 4. Draw Bottom Dialogue box (X=24, Y=284, W=592, H=172)
    // Custom rounded rect border path
    const drawRoundedRect = (c, x, y, width, height, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + width - r, y);
      c.quadraticCurveTo(x + width, y, x + width, y + r);
      c.lineTo(x + width, y + height - r);
      c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      c.lineTo(x + r, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 24, 284, 592, 172, 8);
    ctx.stroke();

    // 5. Draw Dialogue inside bottom box (X=40, Y=302)
    const lines = State.adgDisplayedText.split("\n");
    const startX = 40;
    const startY = 302; // 284 + 18 offset
    let currentY = startY;

    lines.forEach((line, idx) => {
      if (idx < 5) { // Draw up to 5 lines inside rounded rect
        let currentFont = "15px 'DotGothic16', monospace";
        let drawText = line;
        let lineSpacing = 24; // standard spacing for 15px font
        
        if (line.startsWith("[XL]")) {
          currentFont = "bold 24px 'DotGothic16', monospace";
          drawText = line.slice(4);
          lineSpacing = 32; // larger spacing to prevent overlap
        } else if (line.startsWith("[L]")) {
          currentFont = "bold 19px 'DotGothic16', monospace";
          drawText = line.slice(3);
          lineSpacing = 28;
        }
        
        drawPixelatedText(ctx, drawText, startX, currentY, currentFont, textColor);
        currentY += lineSpacing;
      }
    });

    // 6. Draw Flashing cursor triangle ▼ at the bottom-right corner of bottom box
    if (State.adgTypingComplete) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(580, 424);
        ctx.lineTo(592, 424);
        ctx.lineTo(586, 432);
        ctx.fill();
      }
    }

  } else if (State.adgLayoutStyle === "sound-novel") {
    // --- Layout 3: Sound Novel Style (Kamaitachi no Yoru / Otogirisou style) ---
    
    // 1. Draw Background
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 0, 0, 640, 480);
    } else {
      ctx.fillStyle = "#000080"; // Deep Indigo blue
      ctx.fillRect(0, 0, 640, 480);
    }

    // 2. Full-screen dark semi-transparent tint overlay for perfect text legibility
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.fillRect(0, 0, 640, 480);

    // 3. Draw Dialogue lines spanning the full screen (Authentic large font SFC style)
    const lines = State.adgDisplayedText.split("\n");
    const startX = 48;
    const startY = 54;
    let currentY = startY;

    lines.forEach((line, idx) => {
      if (idx < 10) { // Limit to 10 lines max for classic spacious look
        let currentFont = "22px 'DotGothic16', monospace";
        let drawText = line;
        let lineSpacing = 36; // standard line spacing for 22px
        
        if (line.startsWith("[XL]")) {
          currentFont = "bold 34px 'DotGothic16', monospace";
          drawText = line.slice(4);
          lineSpacing = 52; // larger spacing to prevent overlap
        } else if (line.startsWith("[L]")) {
          currentFont = "bold 27px 'DotGothic16', monospace";
          drawText = line.slice(3);
          lineSpacing = 44;
        }
        
        drawPixelatedText(ctx, drawText, startX, currentY, currentFont, textColor, true); // true sets drawShadow/outline on!
        currentY += lineSpacing;
      }
    });

    // 4. Draw Flashing cursor triangle ▼ when typing is completed (bottom right)
    if (State.adgTypingComplete) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(590, 438);
        ctx.lineTo(602, 438);
        ctx.lineTo(596, 446);
        ctx.fill();
      }
    }

  } else if (State.adgLayoutStyle === "gameboy") {
    // --- Layout 4: Game Boy Retro DMG-01 Console Style ---
    
    // 1. Draw solid grey plastic Gameboy shell background (#c5c6b6 is the classic DMG grey!)
    ctx.fillStyle = "#c5c6b6";
    ctx.fillRect(0, 0, 640, 480);

    // 2. Draw screen dark bezel frame (Bezel dimensions: X=80, Y=15, W=480, H=370, R=15)
    ctx.fillStyle = "#6d7373"; // Screen glass/bezel grey
    
    // Draw rounded bezel
    const drawBezel = (c, x, y, width, height, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + width - r, y);
      c.quadraticCurveTo(x + width, y, x + width, y + r);
      c.lineTo(x + width, y + height - r);
      c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      c.lineTo(x + r, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
      c.fill();
    };
    drawBezel(ctx, 80, 15, 480, 370, 12);

    // 3. Draw Blue/Red accent stripes at the top of the bezel
    ctx.fillStyle = "#8a2434"; // Magenta stripe
    ctx.fillRect(80, 30, 480, 2);
    ctx.fillStyle = "#1e3d59"; // Blue stripe
    ctx.fillRect(80, 36, 480, 2);

    // 4. Draw Bezel text "DOT MATRIX WITH STEREO SOUND"
    ctx.fillStyle = "#95a5a6";
    ctx.font = "bold 9px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DOT MATRIX WITH STEREO SOUND", 320, 26);

    // 5. Draw Battery Indicator LED on the left
    ctx.fillStyle = "#2c3e50"; // Dark outer circle
    ctx.beginPath();
    ctx.arc(106, 170, 7, 0, Math.PI * 2);
    ctx.fill();

    // Battery LED (glowing red when active!)
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(106, 170, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#95a5a6";
    ctx.font = "bold 8px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BATTERY", 106, 192);

    // 6. Draw actual Game Boy Green LCD screen area (Active screen dimensions: X=136, Y=54, W=368, H=294)
    ctx.fillStyle = "#9bbc0f"; // Lightest GB Green
    ctx.fillRect(136, 54, 368, 294);
    
    // Draw LCD screen inner drop shadow border (1px black line)
    ctx.strokeStyle = "#0f380f";
    ctx.lineWidth = 2;
    ctx.strokeRect(136, 54, 368, 294);

    // 7. Draw background image in Gameboy 4 green tones!
    if (State.adgBackgroundImg) {
      drawGameboyImage(ctx, State.adgBackgroundImg, 136, 54, 368, 204); // Leave bottom 90px for dialogue box
    } else {
      // Draw background pattern/fill inside screen
      ctx.fillStyle = "#8bac0f";
      ctx.fillRect(136, 54, 368, 204);
    }

    // 8. Draw classic Game Boy style dialogue box at the bottom of the screen (X=144, Y=264, W=352, H=76)
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(144, 264, 352, 76);
    
    ctx.strokeStyle = "#0f380f";
    ctx.lineWidth = 3;
    ctx.strokeRect(144, 264, 352, 76);

    // 9. Draw Dialogue text in deepest green (#0f380f)
    const lines = State.adgDisplayedText.split("\n");
    const lineSpacing = 20;
    const startX = 154;
    const startY = 282;

    lines.forEach((line, idx) => {
      if (idx < 3) { // Gameboy standard: up to 3 lines in text box
        drawPixelatedText(ctx, line, startX, startY + (idx * lineSpacing), "13px 'DotGothic16', monospace", "#0f380f");
      }
    });

    // 10. Draw Flashing cursor triangle ▼ when typing is completed (bottom-right of dialogue box)
    if (State.adgTypingComplete) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = "#0f380f";
        ctx.beginPath();
        ctx.moveTo(480, 324);
        ctx.lineTo(488, 324);
        ctx.lineTo(484, 330);
        ctx.fill();
      }
    }

    // 11. Draw lower Gameboy console details (Nintendo logo, grey plastic ridges at the bottom of canvas)
    ctx.fillStyle = "#9ba3a3";
    ctx.font = "italic bold 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Nintendo", 320, 420);
    
    // Draw classic A and B buttons partially visible or text
    ctx.fillStyle = "#a8acac";
    ctx.fillText("GAME BOY", 320, 442);

  } else {
    // --- Layout 1: Classic Full-Screen Slide Layout (PC-3104 Standard) ---
    
    // 1. Draw Background
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 0, 0, 640, 480);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 640, 480);
    }

    // 2. Draw Dialogue Textbox Overlay at the bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.fillRect(16, 340, 608, 124);

    // Outer Gray border
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 340, 608, 124);

    // Inner White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 342, 604, 120);

    // 3. Draw Character Name plate
    const charName = DOM.adgCharName.value.trim();
    if (charName) {
      drawPixelatedText(ctx, `【${charName}】`, 32, 350, "bold 15px 'DotGothic16', monospace", "#00ffff"); // Pushed up further to Y=350 to avoid crowding
    }

    // 4. Draw Dialogue lines
    const lines = State.adgDisplayedText.split("\n");
    const startX = 32;
    const startY = charName ? 388 : 370; // Pushed down to Y=388 to leave a comfortable 38px gap from Y=350 (approx 23px of clear space between text blocks)
    let currentY = startY;

    lines.forEach((line, idx) => {
      if (idx < 3) { // Draw up to 3 lines max
        let currentFont = "15px 'DotGothic16', monospace";
        let drawText = line;
        let lineSpacing = 24; // standard spacing for 15px font
        
        if (line.startsWith("[XL]")) {
          currentFont = "bold 24px 'DotGothic16', monospace";
          drawText = line.slice(4);
          lineSpacing = 32;
        } else if (line.startsWith("[L]")) {
          currentFont = "bold 19px 'DotGothic16', monospace";
          drawText = line.slice(3);
          lineSpacing = 28;
        }
        drawPixelatedText(ctx, drawText, startX, currentY, currentFont, textColor);
        currentY += lineSpacing;
      }
    });

    // 5. Draw Flashing cursor triangle ▼ when typing is completed
    if (State.adgTypingComplete) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(590, 438);
        ctx.lineTo(602, 438);
        ctx.lineTo(596, 446);
        ctx.fill();
      }
    }
  }

  // --- Environment / Weather Effect Visual Overlays (Rendered on top of all layouts) ---
  if (State.adgWeatherEffect === "rain") {
    if (State.adgLayoutStyle === "gameboy") {
      // Draw inside Gameboy active screen area only (X=136, Y=54, W=368, H=294)
      ctx.strokeStyle = "rgba(15, 56, 15, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(136, 54, 368, 294);
      ctx.clip();
      for (let i = 0; i < 20; i++) {
        const seed = Math.sin(i * 123.45 + Date.now() / 150);
        const x = 136 + (Math.abs(seed * 368) % 368);
        const y = 54 + ((Math.abs(seed * 48271) + (Date.now() / 2) % 294) % 294);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 1.5, y + 12);
        ctx.stroke();
      }
      ctx.restore();
    } else if (State.adgLayoutStyle === "detective-command") {
      // Draw inside top-left Still image box only (X=24, Y=24, W=320, H=240)
      ctx.strokeStyle = "rgba(180, 210, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(24, 24, 320, 240);
      ctx.clip();
      for (let i = 0; i < 20; i++) {
        const seed = Math.sin(i * 123.45 + Date.now() / 150);
        const x = 24 + (Math.abs(seed * 320) % 320);
        const y = 24 + ((Math.abs(seed * 48271) + (Date.now() / 1.5) % 240) % 240);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 14);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Full screen rain for still-full and sound-novel styles: Make it bold, high-contrast, beautiful retro pixel-art drops!
      ctx.strokeStyle = "rgba(180, 210, 255, 0.7)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 35; i++) {
        const seed = Math.sin(i * 123.45 + Date.now() / 150);
        const x = Math.abs(seed * 640) % 640;
        const y = (Math.abs(seed * 48271) + (Date.now() / 1.5) % 480) % 480;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 18); // Slanted longer rain drops
        ctx.stroke();
      }
    }
  } else if (State.adgWeatherEffect === "blizzard") {
    if (State.adgLayoutStyle === "gameboy") {
      // Draw inside Gameboy active screen area only (X=136, Y=54, W=368, H=294)
      ctx.fillStyle = "rgba(139, 172, 15, 0.9)";
      ctx.save();
      ctx.beginPath();
      ctx.rect(136, 54, 368, 294);
      ctx.clip();
      for (let i = 0; i < 25; i++) {
        const seed = Math.cos(i * 987.65 + Date.now() / 120);
        const x = 136 + ((Math.abs(seed * 468) - (Date.now() / 1.5) % 468 + 468) % 368);
        const y = 54 + ((Math.abs(seed * 294) + (Date.now() / 2.5) % 294) % 294);
        const size = Math.abs(seed * 123) % 2 + 1;
        ctx.fillRect(x, y, size, size);
      }
      ctx.restore();
    } else if (State.adgLayoutStyle === "detective-command") {
      // Draw inside top-left Still image box only (X=24, Y=24, W=320, H=240)
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.save();
      ctx.beginPath();
      ctx.rect(24, 24, 320, 240);
      ctx.clip();
      for (let i = 0; i < 20; i++) {
        const seed = Math.cos(i * 987.65 + Date.now() / 120);
        const x = 24 + ((Math.abs(seed * 420) - (Date.now() / 1.5) % 420 + 420) % 320);
        const y = 24 + ((Math.abs(seed * 240) + (Date.now() / 2.5) % 240) % 240);
        const size = Math.abs(seed * 123) % 2 + 1;
        ctx.fillRect(x, y, size, size);
      }
      ctx.restore();
    } else {
      // Full screen blizzard for still-full and sound-novel styles
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      for (let i = 0; i < 50; i++) {
        const seed = Math.cos(i * 987.65 + Date.now() / 120);
        const x = (Math.abs(seed * 840) - (Date.now() / 1.5) % 840 + 840) % 640;
        const y = (Math.abs(seed * 480) + (Date.now() / 2.5) % 480) % 480;
        const size = Math.abs(seed * 123) % 3 + 1;
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  // --- Thunder Flash Overlay (Rendered globally on top of the layout bounds) ---
  if (State.adgThunderFlashTime > 0) {
    const elapsed = Date.now() - State.adgThunderFlashTime;
    if (elapsed < 150) {
      if (State.adgLayoutStyle === "gameboy") {
        // Game Boy screen thunder flash (lightest shade of green)
        ctx.fillStyle = "rgba(155, 188, 15, 0.95)";
        ctx.fillRect(136, 54, 368, 294);
      } else if (State.adgLayoutStyle === "detective-command") {
        // Flash only inside the still window
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(24, 24, 320, 240);
      } else {
        // Full screen flash
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(0, 0, 640, 480);
      }
    } else if (elapsed < 300) {
      if (State.adgLayoutStyle === "gameboy") {
        ctx.fillStyle = "rgba(155, 188, 15, 0.5)";
        ctx.fillRect(136, 54, 368, 294);
      } else if (State.adgLayoutStyle === "detective-command") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(24, 24, 320, 240);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(0, 0, 640, 480);
      }
    } else {
      State.adgThunderFlashTime = 0; // reset
    }
  }
}

// Composition loop to keep weather effects and blinking cursors animating smoothly in real-time
function startADGAnimationLoop() {
  if (State.adgLoopRunning) return;
  State.adgLoopRunning = true;

  const loop = () => {
    if (DOM.adgWindow.classList.contains("hidden") || DOM.adgWindow.classList.contains("minimized")) {
      State.adgLoopRunning = false;
      return;
    }
    
    // Constant redraw at 60 FPS for fluid environmental/text typing animations
    drawADGComposition();
    
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function setupADGMaker() {
  // Overlapping Focus Window manager
  const focusApp = () => {
    DOM.appWindow.classList.add("active");
    DOM.adgWindow.classList.remove("active");
    DOM.taskAppTab.classList.add("active");
    DOM.taskAdgTab.classList.remove("active");
  };

  const focusAdg = () => {
    DOM.adgWindow.classList.add("active");
    DOM.appWindow.classList.remove("active");
    DOM.taskAdgTab.classList.add("active");
    DOM.taskAppTab.classList.remove("active");
    startADGAnimationLoop();
  };

  // Full initialization when the ADG window is first opened or restored from hidden/minimized
  const openAdg = () => {
    focusAdg();
    refreshLibraryUI();
    loadADGBackground();
  };

  DOM.appWindow.addEventListener("mousedown", focusApp);
  DOM.adgWindow.addEventListener("mousedown", focusAdg);

  // Start Menu Programs launch
  bindInteractive(DOM.startProgramPixel, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    DOM.appWindow.classList.remove("minimized");
    DOM.appWindow.classList.remove("hidden");
    focusApp();
  });

  bindInteractive(DOM.startProgramAdg, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    DOM.adgWindow.classList.remove("hidden");
    DOM.adgWindow.classList.remove("minimized");
    DOM.taskAdgTab.classList.remove("hidden");
    openAdg();
  });

  // App Shortcut Icon setup
  bindInteractive(DOM.iconAdgMaker, () => {
    SoundFX.playClick();
    DOM.adgWindow.classList.remove("hidden");
    DOM.adgWindow.classList.remove("minimized");
    DOM.taskAdgTab.classList.remove("hidden");
    openAdg();
  });

  // Taskbar Tab setup
  bindInteractive(DOM.taskAdgTab, () => {
    SoundFX.playClick();
    if (DOM.adgWindow.classList.contains("minimized")) {
      DOM.adgWindow.classList.remove("minimized");
      openAdg();
    } else {
      if (DOM.adgWindow.classList.contains("active")) {
        DOM.adgWindow.classList.add("minimized");
        DOM.taskAdgTab.classList.remove("active");
      } else {
        focusAdg();
      }
    }
  });

  // Title bar drag for ADG Maker window
  let isDraggingWindow = false;
  let dragOffset = { x: 0, y: 0 };
  const titleBar = DOM.adgWindow.querySelector(".title-bar");

  titleBar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDraggingWindow = true;
    dragOffset.x = e.clientX - DOM.adgWindow.offsetLeft;
    dragOffset.y = e.clientY - DOM.adgWindow.offsetTop;
    focusAdg();
    titleBar.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingWindow) return;
    DOM.adgWindow.style.left = `${e.clientX - dragOffset.x}px`;
    DOM.adgWindow.style.top = `${e.clientY - dragOffset.y}px`;
    DOM.adgWindow.style.transform = "none";
  });

  document.addEventListener("mouseup", () => {
    isDraggingWindow = false;
    titleBar.style.cursor = "grab";
  });

  // ADG Window buttons
  document.getElementById("btn-adg-minimize").addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.adgWindow.classList.add("minimized");
    DOM.taskAdgTab.classList.remove("active");
    e.stopPropagation();
  });

  document.getElementById("btn-adg-close").addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.adgWindow.classList.add("hidden");
    DOM.taskAdgTab.classList.add("hidden");
    e.stopPropagation();
  });

  document.getElementById("menu-adg-close").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.adgWindow.classList.add("hidden");
    DOM.taskAdgTab.classList.add("hidden");
  });

  document.getElementById("menu-adg-clear").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.adgDialogText.value = "";
    triggerTypewriter();
  });

  // Controls bindings
  DOM.btnLibraryRefresh.addEventListener("click", () => {
    SoundFX.playClick();
    refreshLibraryUI();
    loadADGBackground();
  });

  DOM.btnLibraryDelete.addEventListener("click", () => {
    deleteSelectedFile();
  });

  DOM.adgCharName.addEventListener("input", () => {
    saveADGSettings();
    if (!DOM.adgTypewriter.checked) {
      triggerTypewriter();
    } else {
      drawADGComposition();
    }
  });

  DOM.adgDialogText.addEventListener("input", () => {
    saveADGSettings();
    // If not typewriter, render instantly on type
    if (!DOM.adgTypewriter.checked) {
      triggerTypewriter();
    }
  });

  // Bind Retro tags insert toolbar buttons
  const adgTagButtons = DOM.adgWindow.querySelectorAll(".btn-adg-tag");
  adgTagButtons.forEach(btn => {
    bindInteractive(btn, () => {
      SoundFX.playClick();
      const tag = btn.dataset.tag;
      const textarea = DOM.adgDialogText;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      
      textarea.value = val.substring(0, start) + tag + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      textarea.focus();
      
      textarea.dispatchEvent(new Event("input"));
      triggerTypewriter();
    });
  });

  DOM.adgTextColor.addEventListener("change", () => {
    SoundFX.playClick();
    saveADGSettings();
    drawADGComposition();
  });

  DOM.adgLayoutStyle.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.adgLayoutStyle = e.target.value;
    if (State.adgLayoutStyle === "detective-command") {
      DOM.adgDetectiveControls.classList.remove("hidden");
    } else {
      DOM.adgDetectiveControls.classList.add("hidden");
    }
    saveADGSettings();
    triggerTypewriter();
  });

  DOM.adgCommandsList.addEventListener("input", () => {
    saveADGSettings();
    drawADGComposition();
  });

  DOM.adgCommandCursor.addEventListener("change", () => {
    SoundFX.playClick();
    saveADGSettings();
    drawADGComposition();
  });

  DOM.adgWeatherEffect.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.adgWeatherEffect = e.target.value;
    saveADGSettings();
    updateWeatherAudio();
    drawADGComposition();
  });

  DOM.btnAdgThunder.addEventListener("click", () => {
    SoundFX.playThunder();
    State.adgThunderFlashTime = Date.now();
    drawADGComposition();
  });

  DOM.btnAdgPlay.addEventListener("click", () => {
    SoundFX.playClick();
    triggerTypewriter();
  });

  // ADG Synthesizer trigger on tab clicks
  const adgTabs = DOM.adgWindow.querySelectorAll(".tab");
  const adgPanes = DOM.adgWindow.querySelectorAll(".tab-pane");

  adgTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      SoundFX.playTabClick();
      const tabId = tab.dataset.tab;
      
      adgTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      adgPanes.forEach(pane => {
        pane.classList.remove("active");
        if (pane.id === tabId) {
          pane.classList.add("active");
        }
      });
    });
  });

  // ADG Screen Exporter PNG
  DOM.btnAdgDownload.addEventListener("click", () => {
    SoundFX.playClick();
    downloadADGImage();
  });
  
  document.getElementById("menu-adg-save").addEventListener("click", () => {
    SoundFX.playClick();
    downloadADGImage();
  });

  // ADG Screen Exporter GIF
  DOM.btnAdgGifDownload.addEventListener("click", () => {
    startADGGifRecording();
  });

  document.getElementById("menu-adg-save-gif").addEventListener("click", () => {
    startADGGifRecording();
  });

  // Load persisted settings on startup!
  loadADGSettings();
}

function downloadADGImage() {
  if (!State.adgBackgroundImg) return;

  const canvas = DOM.adgPreviewCanvas;
  
  // Upscale composited ADG window by 2x for sharp full visual novel 1280x960 resolution!
  const upscaleCanvas = document.createElement("canvas");
  upscaleCanvas.width = 1280;
  upscaleCanvas.height = 960;
  
  const ctx = upscaleCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  
  ctx.drawImage(canvas, 0, 0, 1280, 960);
  
  const link = document.createElement("a");
  link.download = `pc3104_adg_${Date.now()}.png`;
  const dataUrl = upscaleCanvas.toDataURL("image/png");
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show preview dialog for iOS long-press saving
  showExportPreview(dataUrl);
  
  DOM.adgStatusText.textContent = "アドベンチャー画像の保存に成功しました！";
}

function enableADGButtons(enable) {
  DOM.btnAdgPlay.disabled = !enable;
  DOM.btnAdgDownload.disabled = !enable;
  DOM.btnAdgGifDownload.disabled = !enable;
  DOM.adgCharName.disabled = !enable;
  DOM.adgDialogText.disabled = !enable;
  DOM.adgTextColor.disabled = !enable;
  DOM.btnLibraryRefresh.disabled = !enable;
  DOM.btnLibraryDelete.disabled = !enable;
}

function startADGGifRecording() {
  if (!State.adgBackgroundImg) {
    SoundFX.playBeepAlert();
    return;
  }
  
  SoundFX.playClick();
  State.adgIsRecordingGif = true;
  State.adgGifFrames = [];
  State.adgBlinkFramesCount = 30; // 30 frames = approx 1.35 seconds of finished text pause with blinking cursor (faster, optimized!)
  
  DOM.adgStatusText.textContent = "GIF録画準備中...";
  enableADGButtons(false);
  
  // Trigger typewriter from character 0 for recording!
  triggerTypewriter();
}

function compileADGGif() {
  DOM.adgStatusText.textContent = "GIFエンコード中 (処理しています...)";
  
  if (typeof gifshot === "undefined") {
    console.error("gifshot is not loaded!");
    DOM.adgStatusText.textContent = "ERROR: gifshotライブラリがロードされていません。";
    SoundFX.playBeepAlert();
    State.adgIsRecordingGif = false;
    State.adgGifFrames = [];
    enableADGButtons(true);
    return;
  }
  
  gifshot.createGIF({
    images: State.adgGifFrames,
    gifWidth: 640,
    gifHeight: 480,
    interval: 0.045, // 45ms per frame matching typewriter delay
    numFrames: State.adgGifFrames.length,
    sampleInterval: 20, // Faster color quantization sampling rate for responsive encoding
    numWorkers: 2 // Use Web Workers (via safe blob urls) to process in background, keeping UI responsive!
  }, function(obj) {
    if (!obj.error) {
      const link = document.createElement("a");
      link.download = `pc3104_adg_animation_${Date.now()}.gif`;
      link.href = obj.image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show preview dialog for iOS long-press saving
      showExportPreview(obj.image);
      
      DOM.adgStatusText.textContent = "GIFアニメの保存に成功しました！";
      SoundFX.playRenderChime();
    } else {
      console.error(obj.error);
      DOM.adgStatusText.textContent = "ERROR: GIF生成中にエラーが発生しました。";
      SoundFX.playBeepAlert();
    }
    
    State.adgIsRecordingGif = false;
    State.adgGifFrames = [];
    enableADGButtons(true);
  });
}

// Convert standard base64 dataURL to raw binary Blob
function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Convert dataURL to safe local Blob URL for iOS animated GIF saving compatibility
function dataURLtoBlobURL(dataUrl) {
  try {
    const blob = dataURLtoBlob(dataUrl);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to convert dataURL to BlobURL", e);
    return dataUrl; // fallback
  }
}

function showExportPreview(src) {
  if (DOM.exportPreviewImg && DOM.exportDialog) {
    let finalSrc = src;
    // For iOS Safari animated GIF saving compatibility, we MUST use a Blob URL instead of a raw base64 data URL.
    // Raw base64 data URLs for GIFs often get saved as static PNGs of the first frame on iOS.
    if (src && src.startsWith("data:image/gif")) {
      finalSrc = dataURLtoBlobURL(src);
    }
    DOM.exportPreviewImg.src = finalSrc;

    // Setup "Open in New Tab" helper link for mobile browsers (especially Chrome/Safari on iOS)
    const btnOpenNewTab = document.getElementById("btn-export-open-new-tab");
    if (btnOpenNewTab) {
      if (finalSrc) {
        btnOpenNewTab.href = finalSrc;
        btnOpenNewTab.style.display = "inline-block";
        if (src.startsWith("data:image/gif")) {
          btnOpenNewTab.download = `pc3104_adg_animation_${Date.now()}.gif`;
        } else {
          btnOpenNewTab.download = `pc3104_adg_${Date.now()}.png`;
        }
      } else {
        btnOpenNewTab.style.display = "none";
      }
    }

    DOM.exportDialog.classList.remove("hidden");
  }
}

// --- Persist ADG Maker inputs to localStorage ---
function saveADGSettings() {
  const settings = {
    charName: DOM.adgCharName.value,
    dialogText: DOM.adgDialogText.value,
    layoutStyle: State.adgLayoutStyle,
    textColor: DOM.adgTextColor.value,
    commandsList: DOM.adgCommandsList.value,
    commandCursor: DOM.adgCommandCursor.value,
    weatherEffect: DOM.adgWeatherEffect.value
  };
  localStorage.setItem("pic3104_adg_settings", JSON.stringify(settings));
}

function loadADGSettings() {
  try {
    const raw = localStorage.getItem("pic3104_adg_settings");
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (settings.charName !== undefined) DOM.adgCharName.value = settings.charName;
    if (settings.dialogText !== undefined) DOM.adgDialogText.value = settings.dialogText;
    if (settings.layoutStyle !== undefined) {
      State.adgLayoutStyle = settings.layoutStyle;
      DOM.adgLayoutStyle.value = settings.layoutStyle;
      if (settings.layoutStyle === "detective-command") {
        DOM.adgDetectiveControls.classList.remove("hidden");
      } else {
        DOM.adgDetectiveControls.classList.add("hidden");
      }
    }
    if (settings.textColor !== undefined) DOM.adgTextColor.value = settings.textColor;
    if (settings.commandsList !== undefined) DOM.adgCommandsList.value = settings.commandsList;
    if (settings.commandCursor !== undefined) DOM.adgCommandCursor.value = settings.commandCursor;
    if (settings.weatherEffect !== undefined) {
      DOM.adgWeatherEffect.value = settings.weatherEffect;
      State.adgWeatherEffect = settings.weatherEffect;
      setTimeout(updateWeatherAudio, 100); // Wait for AudioContext initialization
    }
  } catch (e) {
    console.error("Failed to load ADG settings:", e);
  }
}

// --- Synthesized Weather Environmental Sound Effects ---
function updateWeatherAudio() {
  try {
    if (!SoundFX.enabled) {
      stopWeatherAudio();
      return;
    }
    SoundFX.init();
    if (!SoundFX.ctx) return;
    
    stopWeatherAudio();
    
    const effect = State.adgWeatherEffect;
    if (effect === "none") return;
    
    State.adgWeatherAudioNodes = [];
    
    // Safely get sampleRate with a solid fallback (essential for iOS Safari)
    const sampleRate = SoundFX.ctx.sampleRate || 44100;
    const bufferSize = sampleRate * 2.0;
    
    if (effect === "rain") {
      // Rain pitter patter: modulated white noise bandpass filter
      const buffer = SoundFX.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = SoundFX.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = SoundFX.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400; // Rain frequency
      filter.Q.value = 1.0;
      
      const gain = SoundFX.ctx.createGain();
      gain.gain.value = 0.02; // soft hum
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(SoundFX.ctx.destination);
      
      noise.start(0);
      State.adgWeatherAudioNodes.push(noise, gain);
    } else if (effect === "blizzard") {
      // Blizzard wind: Sweeping white noise modulated with a slow LFO
      const buffer = SoundFX.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = SoundFX.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      const filter = SoundFX.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 550;
      filter.Q.value = 2.0;
      
      const gain = SoundFX.ctx.createGain();
      gain.gain.value = 0.035; // wind howling
      
      // Slow sweeping LFO oscillator (modulates wind frequency)
      const osc = SoundFX.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 0.15; // 0.15Hz slow sweep
      
      const oscGain = SoundFX.ctx.createGain();
      oscGain.gain.value = 300; // +/- 300Hz sweep range
      
      osc.connect(oscGain);
      oscGain.connect(filter.frequency);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(SoundFX.ctx.destination);
      
      noise.start(0);
      osc.start(0);
      State.adgWeatherAudioNodes.push(noise, osc, gain);
    }
  } catch (e) {
    console.warn("Weather audio synthesis failed or blocked by browser autoplay policy:", e);
  }
}

function stopWeatherAudio() {
  try {
    if (State.adgWeatherAudioNodes) {
      State.adgWeatherAudioNodes.forEach(node => {
        try {
          node.stop();
        } catch(e) {}
        try {
          node.disconnect();
        } catch(e) {}
      });
      State.adgWeatherAudioNodes = [];
    }
  } catch (e) {
    console.warn("Failed to stop weather audio cleanly:", e);
  }
}
