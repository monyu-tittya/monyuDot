/* ==========================================================================
   PC-3104 Retro Pixel Studio - Global State & DOM Reference Registry (state.js)
   ========================================================================== */

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
  adgBgmPreset: "none",
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
  adgBgmPreset: document.getElementById("adg-bgm-preset"),
  btnAdgThunder: document.getElementById("btn-adg-thunder"),
};
