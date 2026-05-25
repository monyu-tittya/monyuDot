/* ==========================================================================
   PC-9801 Retro Pixel Studio - Application Engine (app.js)
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
    // Nostalgic PC-98 FM Chime arpeggio: C5 -> E5 -> G5 -> C6
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
  }
};

// --- Preset Palettes Configuration ---
const PalettePresets = {
  // PC-9801 Legend System 16-color Analog Palette
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

  // Game Boy DMG Green Palette (4 shades)
  "gameboy": [
    { r: 15, g: 56, b: 15 },
    { r: 48, g: 98, b: 48 },
    { r: 139, g: 172, b: 15 },
    { r: 155, g: 188, b: 15 }
  ],

  // CGA Palette 1 (High Magenta/Cyan)
  "cga": [
    { r: 0, g: 0, b: 0 },
    { r: 85, g: 255, b: 255 },
    { r: 255, g: 85, b: 255 },
    { r: 255, g: 255, b: 255 }
  ],

  // Cyberpunk Electric Neon Palette (16 colors)
  "cyberpunk": [
    { r: 13, g: 2, b: 33 },
    { r: 15, g: 8, b: 68 },
    { r: 38, g: 20, b: 71 },
    { r: 94, g: 37, b: 99 },
    { r: 144, g: 26, b: 94 },
    { r: 241, g: 12, b: 73 },
    { r: 255, g: 0, b: 127 },
    { r: 57, g: 0, b: 153 },
    { r: 158, g: 0, b: 89 },
    { r: 255, g: 84, b: 0 },
    { r: 255, g: 189, b: 0 },
    { r: 0, g: 240, b: 255 },
    { r: 0, g: 255, b: 102 },
    { r: 18, g: 1, b: 54 },
    { r: 3, g: 0, b: 30 },
    { r: 255, g: 255, b: 255 }
  ],

  // NES Classic dominant representative colors (32 colors)
  "nes": [
    { r: 124, g: 124, b: 124 }, { r: 0, g: 0, b: 252 }, { r: 0, g: 0, b: 188 }, { r: 68, g: 40, b: 188 },
    { r: 148, g: 0, b: 132 }, { r: 168, g: 0, b: 32 }, { r: 168, g: 16, b: 0 }, { r: 136, g: 20, b: 0 },
    { r: 80, g: 48, b: 0 }, { r: 0, g: 120, b: 0 }, { r: 0, g: 104, b: 0 }, { r: 0, g: 88, b: 0 },
    { r: 0, g: 64, b: 88 }, { r: 0, g: 0, b: 0 }, { r: 252, g: 252, b: 252 }, { r: 0, g: 136, b: 252 },
    { r: 0, g: 120, b: 248 }, { r: 68, g: 80, b: 248 }, { r: 188, g: 40, b: 248 }, { r: 252, g: 0, b: 188 },
    { r: 252, g: 64, b: 68 }, { r: 248, g: 56, b: 0 }, { r: 228, g: 92, b: 16 }, { r: 172, g: 124, b: 0 },
    { r: 0, g: 184, b: 0 }, { r: 0, g: 168, b: 0 }, { r: 0, g: 168, b: 68 }, { r: 0, g: 136, b: 136 },
    { r: 248, g: 216, b: 120 }, { r: 252, g: 252, b: 0 }, { r: 168, g: 252, b: 0 }, { r: 80, g: 240, b: 0 }
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
  paletteType: "adaptive",// "adaptive", "pc98-system", "gameboy", ...
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
  adgCommandCursorIndex: 0
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
  startResetApp: document.getElementById("start-reset-app"),
  startSoundToggle: document.getElementById("start-sound-toggle"),
  startAbout: document.getElementById("start-about"),
  aboutDialog: document.getElementById("about-dialog"),
  btnModalCloses: document.querySelectorAll(".btn-modal-close"),
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

function setupDesktopShortcuts() {
  // My Computer & Recycle Bin double beeps when double-clicked, or single clicked
  const shortcuts = ["icon-mycomputer", "icon-recycle"];
  shortcuts.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        SoundFX.playBeepAlert();
      });
    }
  });

  // App Shortcut opens app window
  DOM.iconPc98.addEventListener("click", () => {
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

  DOM.taskAppTab.addEventListener("click", () => {
    SoundFX.playClick();
    DOM.appWindow.classList.toggle("minimized");
    DOM.taskAppTab.classList.toggle("active");
    if (!DOM.appWindow.classList.contains("minimized")) {
      DOM.appWindow.classList.add("active");
    }
  });
}

function setupStartMenu() {
  DOM.btnStart.addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.toggle("hidden");
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    DOM.startMenuBox.classList.add("hidden");
  });

  DOM.startMenuBox.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  DOM.startResetApp.addEventListener("click", () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    location.reload();
  });

  DOM.startSoundToggle.addEventListener("click", () => {
    toggleSound();
    DOM.startMenuBox.classList.add("hidden");
  });

  DOM.traySoundIcon.addEventListener("click", (e) => {
    toggleSound();
    e.stopPropagation();
  });

  DOM.startAbout.addEventListener("click", () => {
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
    renderPipeline();
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
      
      // Turn off image smoothing for pixel scaling!
      offCtx.imageSmoothingEnabled = false;
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

      // Step 3: Run Quantization and Dithering
      if (palette && palette.length > 0) {
        if (State.ditherType === "floyd") {
          applyFloydSteinbergDithering(pixels, targetW, targetH, palette);
        } else if (State.ditherType === "bayer") {
          applyBayerOrderedDithering(pixels, targetW, targetH, palette, State.colorCount);
        } else {
          applyNoneQuantization(pixels, palette);
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

// --- DITHERING ENGINES ---

// Floyd-Steinberg Dithering: Error Diffusion
function applyFloydSteinbergDithering(pixels, width, height, palette) {
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
      
      // Match color
      const closest = findClosestColor(oldR, oldG, oldB, palette);
      
      pixels[idx]   = closest.r;
      pixels[idx+1] = closest.g;
      pixels[idx+2] = closest.b;
      pixels[idx+3] = 255; // opaque alpha
      
      // Calculate channel error
      const errR = oldR - closest.r;
      const errG = oldG - closest.g;
      const errB = oldB - closest.b;
      
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

// Bayer Ordered Dithering: Organized Patterns
function applyBayerOrderedDithering(pixels, width, height, palette, colorCount) {
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
      const ditherAdjustment = normalizedBias * spread;
      
      // Apply offset to original color
      const adjustedR = Math.max(0, Math.min(255, pixels[idx]   + ditherAdjustment));
      const adjustedG = Math.max(0, Math.min(255, pixels[idx+1] + ditherAdjustment));
      const adjustedB = Math.max(0, Math.min(255, pixels[idx+2] + ditherAdjustment));
      
      const closest = findClosestColor(adjustedR, adjustedG, adjustedB, palette);
      
      pixels[idx]   = closest.r;
      pixels[idx+1] = closest.g;
      pixels[idx+2] = closest.b;
      pixels[idx+3] = 255;
    }
  }
}

// Simple nearest color mapping (no dithering)
function applyNoneQuantization(pixels, palette) {
  for (let i = 0; i < pixels.length; i += 4) {
    const closest = findClosestColor(pixels[i], pixels[i+1], pixels[i+2], palette);
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
  link.download = `pic2pc98_${Date.now()}.png`;
  link.href = upscaleCanvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  updateStatus("画像の保存に成功しました！");
}

// --- VIRTUAL DISK & ADG SCREEN MAKER SYSTEM ---

function saveResultToDisk() {
  if (!State.sourceImage) return;

  const dataUrl = DOM.outputCanvas.toDataURL("image/png");

  try {
    let library = JSON.parse(localStorage.getItem("pic98_library") || "[]");

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

    localStorage.setItem("pic98_library", JSON.stringify(library));

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
  const library = JSON.parse(localStorage.getItem("pic98_library") || "[]");

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
    if (State.adgSelectedId === item.id || (!State.adgSelectedId && idx === library.length - 1)) {
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
    let library = JSON.parse(localStorage.getItem("pic98_library") || "[]");
    library = library.filter(item => item.id !== State.adgSelectedId);
    localStorage.setItem("pic98_library", JSON.stringify(library));

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
  img.src = State.adgBackgroundImgData;
}

function triggerTypewriter() {
  if (State.adgTypewriterTimer) clearInterval(State.adgTypewriterTimer);
  
  const charName = DOM.adgCharName.value.trim();
  const dialogValue = DOM.adgDialogText.value || "あっ、センパイ おそいですよ。&#13;&#10;かくしょへ れんらくは しておきました。&#13;&#10;げんばけんしょうも はじまっています。";
  
  let fullText = "";
  if (State.adgLayoutStyle === "detective-command") {
    // Detective ADV style: pre-formatted inline name and brackets
    fullText = charName ? `${charName}「${dialogValue}` : dialogValue;
  } else {
    // PC-98 standard style: separate name plate and pure dialog text
    fullText = dialogValue;
  }

  // If we are recording a GIF, we always use the typewriter animation!
  const useTypewriter = State.adgIsRecordingGif ? true : DOM.adgTypewriter.checked;

  if (!useTypewriter) {
    State.adgDisplayedText = fullText;
    State.adgTypingComplete = true;
    drawADGComposition();
    return;
  }

  State.adgDisplayedText = "";
  State.adgTypewriterIndex = 0;
  State.adgTypingComplete = false;

  State.adgTypewriterTimer = setInterval(() => {
    if (State.adgTypewriterIndex < fullText.length) {
      const char = fullText[State.adgTypewriterIndex];
      State.adgDisplayedText += char;
      State.adgTypewriterIndex++;
      
      // Play retro 8-bit typewriter clicking synth sound!
      if (char !== " " && char !== "\n") {
        SoundFX.playClick();
      }
      
      drawADGComposition();
      
      // Capture frame for GIF
      if (State.adgIsRecordingGif) {
        State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
        const progress = Math.min(80, Math.round((State.adgTypewriterIndex / fullText.length) * 80));
        DOM.adgStatusText.textContent = `GIF録画中 (タイピング): ${progress}%`;
      }
    } else {
      // Typing finished
      if (State.adgIsRecordingGif) {
        if (State.adgBlinkFramesCount > 0) {
          State.adgBlinkFramesCount--;
          State.adgTypingComplete = true;
          drawADGComposition();
          
          State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
          const progress = 80 + Math.round(((10 - State.adgBlinkFramesCount) / 10) * 20);
          DOM.adgStatusText.textContent = `GIF録画中 (カーソル点滅): ${progress}%`;
        } else {
          clearInterval(State.adgTypewriterTimer);
          State.adgTypingComplete = true;
          drawADGComposition();
          compileADGGif();
        }
      } else {
        clearInterval(State.adgTypewriterTimer);
        State.adgTypingComplete = true;
        drawADGComposition();
      }
    }
  }, 45); // ~22 chars per second, standard retro speed
}

function drawADGComposition() {
  const canvas = DOM.adgPreviewCanvas;
  const ctx = canvas.getContext("2d");

  // Lock canvas resolution to authentic PC-9801 resolution: 640 x 400
  canvas.width = 640;
  canvas.height = 400;

  const textColor = DOM.adgTextColor.value;

  if (State.adgLayoutStyle === "detective-command") {
    // --- Layout 2: Classic Detective Command ADV Layout (Portopia / Okhotsk Style) ---
    
    // 1. Draw solid black backdrop
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 640, 400);

    // 2. Draw Bounding Frame around top-left Still image box (X=24, Y=24, W=320, H=200)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 320, 200);

    // Draw background pixel art still inside framed window
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 24, 24, 320, 200);
    } else {
      // gray placeholder screen
      ctx.fillStyle = "#333333";
      ctx.fillRect(24, 24, 320, 200);
    }

    // 3. Draw Command Menu list on the top-right
    const commandsText = DOM.adgCommandsList.value || "ばしょいどう\nはなせ\nしらべろ\nみせろ\nよべ\nスマホつかえ\nもちものみろ";
    const commands = commandsText.split("\n").map(c => c.trim()).filter(c => c.length > 0);
    
    ctx.font = "16px 'DotGothic16', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    
    const startMenuX = 370;
    const startMenuY = 28;
    const menuSpacing = 24;
    const activeCursorIndex = parseInt(DOM.adgCommandCursor.value) || 0;

    commands.forEach((cmd, idx) => {
      if (idx < 7) { // limit to 7 lines max
        const lineY = startMenuY + (idx * menuSpacing);
        if (idx === activeCursorIndex) {
          // Draw active selector pointer "▶" next to active item
          ctx.fillStyle = "#ffffff";
          ctx.fillText("▶", startMenuX, lineY);
          ctx.fillText(cmd, startMenuX + 20, lineY);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(cmd, startMenuX + 20, lineY);
        }
      }
    });

    // 4. Draw Bottom Dialogue box (X=24, Y=244, W=592, H=132)
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
    drawRoundedRect(ctx, 24, 244, 592, 132, 8);
    ctx.stroke();

    // 5. Draw Dialogue inside bottom box (X=40, Y=262)
    ctx.font = "15px 'DotGothic16', monospace";
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";

    const lines = State.adgDisplayedText.split("\n");
    const lineSpacing = 24;
    const startX = 40;
    const startY = 262;

    lines.forEach((line, idx) => {
      if (idx < 4) { // Draw up to 4 lines inside rounded rect
        ctx.fillText(line, startX, startY + (idx * lineSpacing));
      }
    });

    // 6. Draw Flashing cursor triangle ▼ at the bottom-right corner of bottom box
    if (State.adgTypingComplete) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(580, 344);
        ctx.lineTo(592, 344);
        ctx.lineTo(586, 352);
        ctx.fill();
      }
    }

  } else {
    // --- Layout 1: Classic Full-Screen Slide Layout (PC-98 Standard) ---
    
    // 1. Draw Background
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 0, 0, 640, 400);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 640, 400);
    }

    // 2. Draw Dialogue Textbox Overlay at the bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.fillRect(16, 260, 608, 124);

    // Outer Gray border
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 260, 608, 124);

    // Inner White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 262, 604, 120);

    // 3. Draw Character Name plate
    const charName = DOM.adgCharName.value.trim();
    if (charName) {
      ctx.font = "bold 15px 'DotGothic16', monospace";
      ctx.fillStyle = "#00ffff"; // Classic PC-98 cyan name plate color
      ctx.fillText(`【${charName}】`, 32, 292);
    }

    // 4. Draw Dialogue lines
    ctx.font = "15px 'DotGothic16', monospace";
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";

    const lines = State.adgDisplayedText.split("\n");
    const lineSpacing = 24;
    const startX = 32;
    const startY = charName ? 306 : 288; // shift up slightly if no name

    lines.forEach((line, idx) => {
      if (idx < 3) { // Draw up to 3 lines max
        ctx.fillText(line, startX, startY + (idx * lineSpacing));
      }
    });

    // 5. Draw Flashing cursor triangle ▼ when typing is completed
    if (State.adgTypingComplete) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(590, 358);
        ctx.lineTo(602, 358);
        ctx.lineTo(596, 366);
        ctx.fill();
      }
    }
  }
}

// Composition loop to keep the cursor blinking smoothly in real-time
function startADGAnimationLoop() {
  if (State.adgLoopRunning) return;
  State.adgLoopRunning = true;

  const loop = () => {
    if (DOM.adgWindow.classList.contains("hidden") || DOM.adgWindow.classList.contains("minimized")) {
      State.adgLoopRunning = false;
      return;
    }
    
    // Only redraw for blinking if typing is complete and window is visible
    if (State.adgTypingComplete) {
      drawADGComposition();
    }
    
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
    refreshLibraryUI();
    loadADGBackground();
    startADGAnimationLoop();
  };

  DOM.appWindow.addEventListener("mousedown", focusApp);
  DOM.adgWindow.addEventListener("mousedown", focusAdg);

  // App Shortcut Icon setup
  DOM.iconAdgMaker.addEventListener("click", () => {
    SoundFX.playClick();
    DOM.adgWindow.classList.remove("hidden");
    DOM.adgWindow.classList.remove("minimized");
    DOM.taskAdgTab.classList.remove("hidden");
    focusAdg();
  });

  // Taskbar Tab setup
  DOM.taskAdgTab.addEventListener("click", () => {
    SoundFX.playClick();
    if (DOM.adgWindow.classList.contains("minimized")) {
      DOM.adgWindow.classList.remove("minimized");
      focusAdg();
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
    drawADGComposition();
  });

  DOM.adgDialogText.addEventListener("input", () => {
    // If not typewriter, render instantly on type
    if (!DOM.adgTypewriter.checked) {
      State.adgDisplayedText = DOM.adgDialogText.value;
      State.adgTypingComplete = true;
      drawADGComposition();
    }
  });

  DOM.adgTextColor.addEventListener("change", () => {
    SoundFX.playClick();
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
    triggerTypewriter();
  });

  DOM.adgCommandsList.addEventListener("input", () => {
    drawADGComposition();
  });

  DOM.adgCommandCursor.addEventListener("change", () => {
    SoundFX.playClick();
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
}

function downloadADGImage() {
  if (!State.adgBackgroundImg) return;

  const canvas = DOM.adgPreviewCanvas;
  
  // Upscale composited ADG window by 2x for sharp full visual novel 1280x800 resolution!
  const upscaleCanvas = document.createElement("canvas");
  upscaleCanvas.width = 1280;
  upscaleCanvas.height = 800;
  
  const ctx = upscaleCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  
  ctx.drawImage(canvas, 0, 0, 1280, 800);
  
  const link = document.createElement("a");
  link.download = `pc98_adg_${Date.now()}.png`;
  link.href = upscaleCanvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
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
  State.adgBlinkFramesCount = 10;
  
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
    gifHeight: 400,
    interval: 0.045, // 45ms per frame matching typewriter delay
    numFrames: State.adgGifFrames.length,
    sampleInterval: 10,
    numWorkers: 2
  }, function(obj) {
    if (!obj.error) {
      const link = document.createElement("a");
      link.download = `pc98_adg_animation_${Date.now()}.gif`;
      link.href = obj.image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
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
